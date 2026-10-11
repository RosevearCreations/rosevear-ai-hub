"""Build 044 voice preview never performs a home action without a second click."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.home_assistant import (
    HomeAssistantRuntime,
    get_home_assistant_runtime,
)
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base


class FakeHome:
    base_url = "http://homeassistant.test"

    def __init__(self):
        self.actions = []

    async def states(self):
        return [
            {
                "entity_id": "light.living_room",
                "state": "off",
                "attributes": {"friendly_name": "Living room lamp"},
            },
            {
                "entity_id": "light.hall",
                "state": "off",
                "attributes": {"friendly_name": "Hall lamp"},
            },
            {
                "entity_id": "switch.kiln_power",
                "state": "off",
                "attributes": {"friendly_name": "Kiln power"},
            },
            {
                "entity_id": "scene.movie_night",
                "state": "scening",
                "attributes": {"friendly_name": "Movie night"},
            },
        ]

    async def set_light(self, entity_id, *, enabled):
        self.actions.append((entity_id, "on" if enabled else "off"))
        return [{"entity_id": entity_id, "state": "on" if enabled else "off"}]

    async def set_switch(self, entity_id, *, enabled):
        self.actions.append((entity_id, "on" if enabled else "off"))
        return []

    async def activate_scene(self, entity_id):
        self.actions.append((entity_id, "activate"))
        return []


def make_client(tmp_path, *, login=True):
    engine = build_engine(f"sqlite:///{tmp_path / 'voice.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    fake = FakeHome()

    def override_db():
        with sessions() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_session] = override_db
    app.dependency_overrides[get_home_assistant_runtime] = lambda: HomeAssistantRuntime(
        client=fake,
        base_url=fake.base_url,
        url_configured=True,
        token_configured=True,
    )
    client = TestClient(app)
    if login:
        response = client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "localowner", "password": "long-test-password"},
        )
        assert response.status_code == 201
    return client, fake


def policy(client, ids):
    result = client.put(
        "/api/v1/home-assistant/control-policy",
        json={"allowed_entity_ids": ids, "acknowledge_low_risk_only": True},
    )
    assert result.status_code == 200


def preview(client, transcript):
    return client.post("/api/v1/voice/preview", json={"transcript": transcript})


def test_voice_api_requires_auth_even_before_bootstrap(tmp_path):
    client, _ = make_client(tmp_path, login=False)
    assert preview(client, "turn on living room lamp").status_code == 401


def test_exact_allowlisted_preview_requires_explicit_second_click(tmp_path):
    client, fake = make_client(tmp_path)
    policy(client, ["light.living_room", "scene.movie_night"])
    result = preview(client, "Please turn on the living room lamp.")
    assert result.status_code == 200
    body = result.json()
    assert body["executable"] is True
    assert body["confirmation_required"] is True
    assert body["entity_id"] == "light.living_room"
    assert body["action"] == "on"
    assert fake.actions == []  # Preview never alters the household.
    action = client.post(
        "/api/v1/home-assistant/control",
        json={"entity_id": body["entity_id"], "action": body["action"]},
    )
    assert action.status_code == 200
    assert fake.actions == [("light.living_room", "on")]


def test_unapproved_ambiguous_hazard_and_bulk_commands_are_blocked(tmp_path):
    client, fake = make_client(tmp_path)
    policy(client, ["light.living_room", "light.hall", "scene.movie_night"])
    cases = {
        "turn on hall lamp": "resolved",
        "turn on all lights": "blocked",
        "turn on lamp": "ambiguous",
        "turn on kiln power": "blocked",
        "unlock garage door": "unsupported_action",
        "what is the weather": "not_home_command",
    }
    for spoken, expected in cases.items():
        response = preview(client, spoken)
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == expected
        if expected != "resolved":
            assert body["executable"] is False
            assert body["entity_id"] is None
    assert fake.actions == []


def test_unapproved_command_and_malformed_text_fail_closed(tmp_path):
    client, fake = make_client(tmp_path)
    assert preview(client, "turn on living room lamp").json()["status"] == "blocked"
    for invalid in ["", "x" * 301, "turn on lamp\nactivate scene"]:
        assert preview(client, invalid).status_code == 422
    assert fake.actions == []


def test_read_only_account_cannot_preview_actions(tmp_path):
    client, fake = make_client(tmp_path)
    response = client.post(
        "/api/v1/auth/users",
        json={
            "username": "viewer",
            "password": "long-viewer-password",
            "role": "read_only",
        },
    )
    assert response.status_code == 201
    client.post("/api/v1/auth/logout")
    assert client.post(
        "/api/v1/auth/login",
        json={"username": "viewer", "password": "long-viewer-password"},
    ).status_code == 200
    assert preview(client, "turn on living room lamp").status_code == 403
    assert fake.actions == []
