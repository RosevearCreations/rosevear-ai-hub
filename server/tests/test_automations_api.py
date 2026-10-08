from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'automations.db'}")
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
    return client


def rule_definition(tool_key: str = "home_assistant.light.set") -> dict:
    return {
        "schema_version": 1,
        "trigger": {
            "type": "state_change",
            "entity_id": "binary_sensor.workshop_motion",
            "to_state": "on",
        },
        "conditions": [
            {
                "type": "state_equals",
                "entity_id": "input_boolean.workshop_occupied",
                "state": "on",
            }
        ],
        "actions": [
            {
                "type": "tool",
                "tool_key": tool_key,
                "arguments": {"entity_id": "light.workshop", "state": "on"},
            }
        ],
        "cooldown_seconds": 30,
        "deduplication_key": "workshop.motion.light",
    }


def create_payload(name: str = "Workshop motion light") -> dict:
    return {
        "operation": "create",
        "name": name,
        "enabled": True,
        "definition": rule_definition(),
    }


def approve_change(client: TestClient, payload: dict) -> str:
    pending = client.post("/api/v1/automations/confirm", json=payload)
    assert pending.status_code == 201, pending.text
    confirmation_id = pending.json()["confirmation_id"]
    approved = client.post(f"/api/v1/confirmations/{confirmation_id}/approve")
    assert approved.status_code == 200, approved.text
    return confirmation_id


def test_schema_is_versioned_strict_and_execution_is_available(tmp_path) -> None:
    client = build_client(tmp_path)

    schema = client.get("/api/v1/automations/schema")
    assert schema.status_code == 200
    body = schema.json()
    assert body["schema_version"] == 1
    assert body["execution_available"] is True
    assert body["supported_triggers"] == ["state_change", "state_threshold", "mqtt_message"]
    assert body["supported_actions"] == ["tool"]

    invalid = client.post(
        "/api/v1/automations/validate",
        json={"enabled": False, "definition": {**rule_definition(), "surprise": True}},
    )
    assert invalid.status_code == 422


def test_owner_can_validate_confirm_and_persist_exact_rule(tmp_path) -> None:
    client = build_client(tmp_path)
    payload = create_payload()

    validated = client.post(
        "/api/v1/automations/validate",
        json={"enabled": True, "definition": payload["definition"]},
    )
    assert validated.status_code == 200
    assert validated.json()["referenced_tools"] == ["home_assistant.light.set"]

    confirmation_id = approve_change(client, payload)
    applied = client.post(
        f"/api/v1/automations/apply?confirmation_id={confirmation_id}",
        json=payload,
    )
    assert applied.status_code == 200, applied.text
    saved = applied.json()["automation"]
    assert saved["name"] == "Workshop motion light"
    assert saved["enabled"] is True
    assert saved["definition"]["schema_version"] == 1

    listed = client.get("/api/v1/automations")
    assert listed.status_code == 200
    assert [item["name"] for item in listed.json()] == ["Workshop motion light"]


def test_confirmation_is_bound_to_exact_rule_change(tmp_path) -> None:
    client = build_client(tmp_path)
    payload = create_payload()
    confirmation_id = approve_change(client, payload)

    changed = {**payload, "name": "Different rule"}
    mismatch = client.post(
        f"/api/v1/automations/apply?confirmation_id={confirmation_id}",
        json=changed,
    )
    assert mismatch.status_code == 409
    assert "exact action" in mismatch.json()["detail"]

    original = client.post(
        f"/api/v1/automations/apply?confirmation_id={confirmation_id}",
        json=payload,
    )
    assert original.status_code == 200


def test_level_two_or_three_tools_cannot_be_automation_actions(tmp_path) -> None:
    client = build_client(tmp_path)
    unsafe_rule = rule_definition("knowledge.document.delete")
    unsafe_rule["actions"][0]["arguments"] = {"document_id": 1}

    blocked = client.post(
        "/api/v1/automations/validate",
        json={"enabled": False, "definition": unsafe_rule},
    )
    assert blocked.status_code == 422
    assert "cannot run autonomously" in blocked.json()["detail"]


def test_invalid_mqtt_filter_is_rejected(tmp_path) -> None:
    client = build_client(tmp_path)
    rule = rule_definition()
    rule["trigger"] = {
        "type": "mqtt_message",
        "topic_filter": "home/#/invalid",
        "qos": 0,
    }

    response = client.post(
        "/api/v1/automations/validate",
        json={"enabled": False, "definition": rule},
    )
    assert response.status_code == 422


def test_household_user_can_view_but_cannot_change_rules(tmp_path) -> None:
    client = build_client(tmp_path)
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
    login = client.post(
        "/api/v1/auth/login",
        json={"username": "family", "password": "family-password-123"},
    )
    assert login.status_code == 200

    assert client.get("/api/v1/automations").status_code == 200
    blocked = client.post("/api/v1/automations/confirm", json=create_payload())
    assert blocked.status_code == 403
