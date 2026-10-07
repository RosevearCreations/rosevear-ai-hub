from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.home_assistant import get_home_assistant_runtime
from rosevear_ai_hub.api.home_assistant_controls import HomeAssistantRuntime
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AuditEvent, Base, ToolRecord


class FakeHomeAssistantClient:
    base_url = "http://homeassistant.test"

    def __init__(self) -> None:
        self.actions: list[tuple[str, str, bool | None]] = []

    async def states(self):
        return [
            {
                "entity_id": "light.living_room",
                "state": "off",
                "attributes": {"friendly_name": "Living room lamp"},
            },
            {
                "entity_id": "switch.fan",
                "state": "off",
                "attributes": {"friendly_name": "Desk fan"},
            },
            {
                "entity_id": "scene.movie_night",
                "state": "scening",
                "attributes": {"friendly_name": "Movie night"},
            },
            {
                "entity_id": "switch.kiln_power",
                "state": "off",
                "attributes": {"friendly_name": "Kiln power"},
            },
            {
                "entity_id": "sensor.temperature",
                "state": "21",
                "attributes": {"friendly_name": "Temperature"},
            },
        ]

    async def set_light(self, entity_id: str, *, enabled: bool):
        self.actions.append(("light", entity_id, enabled))
        return [{"entity_id": entity_id, "state": "on" if enabled else "off"}]

    async def set_switch(self, entity_id: str, *, enabled: bool):
        self.actions.append(("switch", entity_id, enabled))
        return [{"entity_id": entity_id, "state": "on" if enabled else "off"}]

    async def activate_scene(self, entity_id: str):
        self.actions.append(("scene", entity_id, None))
        return []


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'home-controls.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)
    fake = FakeHomeAssistantClient()

    def override_session():
        with session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_home_assistant_runtime] = lambda: HomeAssistantRuntime(
        client=fake,
        base_url=fake.base_url,
        url_configured=True,
        token_configured=True,
    )
    client = TestClient(application)
    response = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "owner-password-123"},
    )
    assert response.status_code == 201
    return client, session_maker, fake


def save_policy(client: TestClient, entity_ids: list[str]) -> dict:
    response = client.put(
        "/api/v1/home-assistant/control-policy",
        json={
            "allowed_entity_ids": entity_ids,
            "acknowledge_low_risk_only": True,
        },
    )
    assert response.status_code == 200
    return response.json()


def test_policy_requires_explicit_low_risk_allowlist_and_blocks_hazardous_targets(
    tmp_path,
) -> None:
    client, session_maker, _ = build_client(tmp_path)

    policy = client.get("/api/v1/home-assistant/control-policy")
    assert policy.status_code == 200
    candidates = {item["entity_id"]: item for item in policy.json()["candidates"]}
    assert "sensor.temperature" not in candidates
    assert candidates["light.living_room"]["blocked_reason"] is None
    assert candidates["switch.kiln_power"]["blocked_reason"] is not None

    missing_ack = client.put(
        "/api/v1/home-assistant/control-policy",
        json={
            "allowed_entity_ids": ["light.living_room"],
            "acknowledge_low_risk_only": False,
        },
    )
    assert missing_ack.status_code == 422

    hazardous = client.put(
        "/api/v1/home-assistant/control-policy",
        json={
            "allowed_entity_ids": ["switch.kiln_power"],
            "acknowledge_low_risk_only": True,
        },
    )
    assert hazardous.status_code == 422

    saved = save_policy(client, ["light.living_room", "scene.movie_night"])
    assert saved["allowed_entity_ids"] == ["light.living_room", "scene.movie_night"]

    with session_maker() as session:
        event = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.event_type == "home_assistant.control_policy.updated")
            .order_by(AuditEvent.id.desc())
        )
        assert event is not None
        assert event.risk_level == 3
        assert event.result_status == "success"


def test_allowlisted_level_one_controls_execute_and_are_audited(tmp_path) -> None:
    client, session_maker, fake = build_client(tmp_path)
    save_policy(client, ["light.living_room", "switch.fan", "scene.movie_night"])

    light = client.post(
        "/api/v1/home-assistant/control",
        json={"entity_id": "light.living_room", "action": "on"},
    )
    assert light.status_code == 200
    assert light.json()["tool_key"] == "home_assistant.light.set"
    assert light.json()["state"] == "on"

    switch = client.post(
        "/api/v1/home-assistant/control",
        json={"entity_id": "switch.fan", "action": "off"},
    )
    assert switch.status_code == 200
    assert switch.json()["tool_key"] == "home_assistant.switch.set"

    scene = client.post(
        "/api/v1/home-assistant/control",
        json={"entity_id": "scene.movie_night", "action": "activate"},
    )
    assert scene.status_code == 200
    assert scene.json()["tool_key"] == "home_assistant.scene.activate"

    assert fake.actions == [
        ("light", "light.living_room", True),
        ("switch", "switch.fan", False),
        ("scene", "scene.movie_night", None),
    ]

    blocked = client.post(
        "/api/v1/home-assistant/control",
        json={"entity_id": "switch.kiln_power", "action": "on"},
    )
    assert blocked.status_code == 403

    with session_maker() as session:
        tools = {
            item.tool_key: item
            for item in session.scalars(
                select(ToolRecord).where(ToolRecord.tool_key.like("home_assistant.%"))
            ).all()
        }
        assert set(tools) == {
            "home_assistant.light.set",
            "home_assistant.switch.set",
            "home_assistant.scene.activate",
        }
        assert all(tool.risk_level == 1 for tool in tools.values())

        events = session.scalars(
            select(AuditEvent)
            .where(AuditEvent.event_type == "tool.execution.completed")
            .order_by(AuditEvent.id.asc())
        ).all()
        assert [event.tool_key for event in events] == [
            "home_assistant.light.set",
            "home_assistant.switch.set",
            "home_assistant.scene.activate",
        ]
        assert all(event.risk_level == 1 for event in events)
        assert all(event.result_status == "success" for event in events)


def test_household_user_can_use_allowlist_but_read_only_user_cannot(tmp_path) -> None:
    client, _, fake = build_client(tmp_path)
    save_policy(client, ["light.living_room"])

    family = client.post(
        "/api/v1/auth/users",
        json={
            "username": "family",
            "password": "family-password-123",
            "role": "household_user",
        },
    )
    assert family.status_code == 201
    viewer = client.post(
        "/api/v1/auth/users",
        json={
            "username": "viewer",
            "password": "viewer-password-123",
            "role": "read_only",
        },
    )
    assert viewer.status_code == 201

    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "family", "password": "family-password-123"},
        ).status_code
        == 200
    )
    household = client.post(
        "/api/v1/home-assistant/control",
        json={"entity_id": "light.living_room", "action": "off"},
    )
    assert household.status_code == 200
    assert fake.actions[-1] == ("light", "light.living_room", False)

    household_policy_change = client.put(
        "/api/v1/home-assistant/control-policy",
        json={
            "allowed_entity_ids": [],
            "acknowledge_low_risk_only": True,
        },
    )
    assert household_policy_change.status_code == 403

    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "viewer", "password": "viewer-password-123"},
        ).status_code
        == 200
    )
    read_only = client.post(
        "/api/v1/home-assistant/control",
        json={"entity_id": "light.living_room", "action": "on"},
    )
    assert read_only.status_code == 403


def test_action_domain_mismatch_is_rejected_before_write(tmp_path) -> None:
    client, _, fake = build_client(tmp_path)
    save_policy(client, ["light.living_room", "scene.movie_night"])

    invalid_light = client.post(
        "/api/v1/home-assistant/control",
        json={"entity_id": "light.living_room", "action": "activate"},
    )
    assert invalid_light.status_code == 422

    invalid_scene = client.post(
        "/api/v1/home-assistant/control",
        json={"entity_id": "scene.movie_night", "action": "on"},
    )
    assert invalid_scene.status_code == 422
    assert fake.actions == []
