from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AuditEvent, Base, ToolRecord


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'tools.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    client = TestClient(application)
    response = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "owner-password-123"},
    )
    assert response.status_code == 201
    return client, session_maker


def test_registry_exposes_normalized_builtin_contracts(tmp_path) -> None:
    client, _ = build_client(tmp_path)

    response = client.get("/api/v1/tools")
    assert response.status_code == 200
    tools = response.json()
    assert [item["tool_key"] for item in tools] == [
        "knowledge.answer",
        "knowledge.search",
        "home_assistant.light.set",
        "home_assistant.scene.activate",
        "home_assistant.switch.set",
        "notification.household.send",
        "automation.rule.change",
        "business.devilndove.story_draft.create",
        "business.yardworkers.job_comment.create",
        "knowledge.document.delete",
    ]

    search = next(item for item in tools if item["tool_key"] == "knowledge.search")
    assert search["risk_level"] == 0
    assert search["risk_label"] == "read"
    assert search["confirmation_policy"] == "none"
    assert search["enabled"] is True
    assert search["capabilities"] == ["knowledge.read", "knowledge.search"]
    assert search["input_schema"]["type"] == "object"
    assert search["input_schema"]["additionalProperties"] is False
    assert search["input_schema"]["required"] == ["query"]
    assert search["output_schema"]["type"] == "object"
    assert search["output_schema"]["additionalProperties"] is False

    light = next(item for item in tools if item["tool_key"] == "home_assistant.light.set")
    assert light["risk_level"] == 1
    assert light["risk_label"] == "low_risk_action"
    assert light["confirmation_policy"] == "configurable"
    assert light["enabled"] is True
    assert light["input_schema"]["required"] == ["entity_id", "state"]

    devilndove_write = next(
        item
        for item in tools
        if item["tool_key"] == "business.devilndove.story_draft.create"
    )
    assert devilndove_write["risk_level"] == 2
    assert devilndove_write["confirmation_policy"] == "required"
    assert devilndove_write["enabled"] is True
    assert devilndove_write["input_schema"]["required"] == [
        "product_id",
        "heading",
        "summary",
        "body",
    ]

    yardworkers_write = next(
        item
        for item in tools
        if item["tool_key"] == "business.yardworkers.job_comment.create"
    )
    assert yardworkers_write["risk_level"] == 2
    assert yardworkers_write["confirmation_policy"] == "required"
    assert yardworkers_write["enabled"] is True
    assert yardworkers_write["input_schema"]["required"] == [
        "job_id",
        "comment_text",
    ]

    delete = next(item for item in tools if item["tool_key"] == "knowledge.document.delete")
    assert delete["risk_level"] == 2
    assert delete["risk_label"] == "confirmation_required"
    assert delete["confirmation_policy"] == "required"
    assert delete["enabled"] is False


def test_registry_summary_reports_capabilities_and_risk_counts(tmp_path) -> None:
    client, _ = build_client(tmp_path)

    response = client.get("/api/v1/tools/summary")
    assert response.status_code == 200
    payload = response.json()
    assert payload["tool_count"] == 10
    assert payload["enabled_count"] == 9
    assert payload["disabled_count"] == 1
    assert payload["counts_by_risk"]["read"] == 2
    assert payload["counts_by_risk"]["low_risk_action"] == 4
    assert payload["counts_by_risk"]["confirmation_required"] == 4
    assert payload["capabilities"] == [
        "ai.generate",
        "automation.write",
        "business.devilndove.story_draft.write",
        "business.write",
        "business.yardworkers.job_comment.write",
        "home.light.control",
        "home.read",
        "home.scene.activate",
        "home.switch.control",
        "knowledge.answer",
        "knowledge.delete",
        "knowledge.read",
        "knowledge.search",
        "knowledge.write",
        "notification.household",
        "notification.write",
    ]


def test_owner_toggle_persists_and_writes_audit_event(tmp_path) -> None:
    client, session_maker = build_client(tmp_path)

    disabled = client.patch(
        "/api/v1/tools/knowledge.search",
        json={"enabled": False},
    )
    assert disabled.status_code == 200
    assert disabled.json()["enabled"] is False

    refreshed = client.get("/api/v1/tools/knowledge.search")
    assert refreshed.status_code == 200
    assert refreshed.json()["enabled"] is False

    with session_maker() as session:
        record = session.scalar(select(ToolRecord).where(ToolRecord.tool_key == "knowledge.search"))
        event = session.scalar(
            select(AuditEvent).where(AuditEvent.event_type == "tool.registry.updated")
        )
        assert record is not None
        assert record.enabled is False
        assert event is not None
        assert event.object_id == "knowledge.search"
        assert event.action == "disable"
        assert event.sanitized_arguments == {"enabled": False}


def test_household_user_can_inspect_but_not_administer_registry(tmp_path) -> None:
    client, _ = build_client(tmp_path)
    created = client.post(
        "/api/v1/auth/users",
        json={
            "username": "family",
            "password": "family-password-123",
            "role": "household_user",
        },
    )
    assert created.status_code == 201

    assert client.post("/api/v1/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "family", "password": "family-password-123"},
        ).status_code
        == 200
    )

    assert client.get("/api/v1/tools").status_code == 200
    blocked = client.patch(
        "/api/v1/tools/knowledge.search",
        json={"enabled": False},
    )
    assert blocked.status_code == 403


def test_level_three_tool_cannot_be_enabled(tmp_path) -> None:
    client, session_maker = build_client(tmp_path)
    client.get("/api/v1/tools")

    with session_maker() as session:
        session.add(
            ToolRecord(
                integration_id=None,
                tool_key="safety.prohibited-test",
                display_name="Prohibited test tool",
                description="Test-only level three descriptor.",
                capabilities_json=["safety.test"],
                risk_level=3,
                input_schema_json={
                    "type": "object",
                    "properties": {},
                    "required": [],
                    "additionalProperties": False,
                },
                output_schema_json={
                    "type": "object",
                    "properties": {},
                    "required": [],
                    "additionalProperties": False,
                },
                enabled=False,
                built_in=False,
            )
        )
        session.commit()

    blocked = client.patch(
        "/api/v1/tools/safety.prohibited-test",
        json={"enabled": True},
    )
    assert blocked.status_code == 409
    assert "Level 3" in blocked.json()["detail"]
