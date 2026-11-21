"""Build 372 synthetic-only Alexa policy, consent and readback security regression."""

from __future__ import annotations

import asyncio
import json
from copy import deepcopy

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.home_assistant import HomeAssistantRuntime, get_home_assistant_runtime
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantClient, HomeAssistantUnavailableError
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AlexaConsent372, AuditEvent


class FakeHA:
    def __init__(self):
        self.offline = False
        self.calls: list[str] = []
        self.registry = {
            "areas": [{"area_id": "home", "name": "Home"}],
            "devices": [
                {"id": "lamp", "name": "Kitchen Lamp"},
                {"id": "laser", "name": "Laser Master Workshop"},
            ],
            "entities": [
                {"entity_id": "light.kitchen", "name": "Kitchen", "device_id": "lamp"},
                {"entity_id": "light.laser_light", "name": "Laser Work", "device_id": "laser"},
                {"entity_id": "switch.kiln", "name": "Kiln"},
                {"entity_id": "light.hidden", "hidden_by": "user"},
            ],
        }
        self.exposed = {
            "light.kitchen": {"cloud.alexa": True},
            "light.laser_light": {"cloud.alexa": True},
            "light.stale_unlisted": {"cloud.alexa": True},
        }
        self.auto = False

    async def registry_snapshot(self):
        self.calls.append("registry")
        if self.offline:
            raise HomeAssistantUnavailableError("synthetic HA outage")
        return deepcopy(self.registry)

    async def alexa_exposure_report(self):
        self.calls.append("alexa-read")
        if self.offline:
            raise HomeAssistantUnavailableError("synthetic HA outage")
        return {"exposed_entities": deepcopy(self.exposed), "expose_new": self.auto}


def setup(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'alexa372.db'}")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)
    app = create_app()
    ha = FakeHA()

    def override_db():
        with session() as db:
            yield db

    app.dependency_overrides[get_session] = override_db
    app.dependency_overrides[get_home_assistant_runtime] = lambda: HomeAssistantRuntime(
        client=ha, base_url="http://homeassistant.test",
        url_configured=True, token_configured=True,
    )
    client = TestClient(app)
    assert client.post(
        "/api/v1/auth/bootstrap", json={"username": "owner", "password": "owner-password-123"}
    ).status_code == 201
    return client, session, ha


def test_reconcile_owner_exposure_and_review_never_changes_ha(tmp_path):
    client, sessions, ha = setup(tmp_path)
    prefix = "/api/v1/alexa-consent-372"
    report = client.get(prefix + "/report").json()
    assert report["providerExposureVerified"] is False
    assert report["alexaAccountLinked"] is None
    assert report["voiceInvocationVerified"] is False
    assert report["providerWritesPerformed"] == 0
    inspect = client.get(prefix + "/inspect")
    assert inspect.status_code == 200, inspect.text
    data = inspect.json()
    assert data["driftCount"] == 3
    assert data["exposedWithoutInventory"] == ["light.stale_unlisted"]
    assert data["automaticExposureEnabled"] is False
    assert next(x for x in data["items"] if x["entityId"] == "light.laser_light")["eligible"] is False
    assert next(x for x in data["items"] if x["entityId"] == "switch.kiln")["eligible"] is False
    assert client.put(prefix + "/review", json={
        "entity_id": "light.kitchen", "decision": "approved",
        "expected_revision": 0, "owner_confirmed": False,
    }).status_code == 422
    accepted = client.put(prefix + "/review", json={
        "entity_id": "light.kitchen", "decision": "approved",
        "expected_revision": 0, "owner_confirmed": True,
    })
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["manualHomeAssistantStepRequired"] is True
    assert accepted.json()["providerWritesPerformed"] == 0
    assert client.put(prefix + "/review", json={
        "entity_id": "light.kitchen", "decision": "approved",
        "expected_revision": 0, "owner_confirmed": True,
    }).status_code == 409
    data = client.get(prefix + "/inspect").json()
    assert data["driftCount"] == 2
    assert not any("write" in method for method in ha.calls)
    assert client.get(prefix + "/audit").json()["events"][0]["decision"] == "approved"
    with sessions() as db:
        assert db.scalar(select(AlexaConsent372)).entity_id == "light.kitchen"
        events = db.scalars(
            select(AuditEvent).where(AuditEvent.event_type == "alexa372.consent.reviewed")
        ).all()
        assert len(events) == 1


def test_unsafe_names_disabled_entities_and_default_exposure_warning(tmp_path):
    client, _, ha = setup(tmp_path)
    prefix = "/api/v1/alexa-consent-372"
    for entity in ("switch.kiln", "light.laser_light", "light.hidden", "light.nonexistent"):
        status = client.put(prefix + "/review", json={
            "entity_id": entity, "decision": "approved",
            "expected_revision": 0, "owner_confirmed": True,
        }).status_code
        assert status in {409, 422}, (entity, status)
    ha.auto = True
    report = client.get(prefix + "/inspect").json()
    assert report["automaticExposureEnabled"] is True
    ha.registry["entities"].append(deepcopy(ha.registry["entities"][0]))
    assert client.get(prefix + "/inspect").status_code == 422
    assert client.get(prefix + "/report").status_code == 200


def test_revoke_local_even_when_ha_offline_without_claiming_provider_revocation(tmp_path):
    client, _, ha = setup(tmp_path)
    prefix = "/api/v1/alexa-consent-372"
    assert client.put(prefix + "/review", json={
        "entity_id": "light.kitchen", "decision": "approved",
        "expected_revision": 0, "owner_confirmed": True,
    }).status_code == 200
    ha.offline = True
    assert client.get(prefix + "/inspect").status_code == 503
    assert client.put(prefix + "/review", json={
        "entity_id": "light.kitchen", "decision": "revoked",
        "expected_revision": 1, "owner_confirmed": True,
    }).status_code == 200
    row = client.get(prefix + "/report").json()["consents"][0]
    assert row["decision"] == "revoked"
    assert row["effectiveApproval"] is False
    assert ha.exposed["light.kitchen"]["cloud.alexa"] is True
    assert client.get(prefix + "/audit").json()["type"] == "OWNER_CONSENT_AUDIT_NOT_VOICE_TRANSCRIPTS"


def test_read_only_role_forbidden_all_alexa_operations(tmp_path):
    client, _, _ = setup(tmp_path)
    assert client.post("/api/v1/auth/users", json={
        "username": "viewer", "password": "viewer-password-123", "role": "read_only",
    }).status_code == 201
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.post("/api/v1/auth/login", json={
        "username": "viewer", "password": "viewer-password-123",
    }).status_code == 200
    prefix = "/api/v1/alexa-consent-372"
    for endpoint in ("/report", "/inspect", "/audit"):
        assert client.get(prefix + endpoint).status_code == 403
    assert client.put(prefix + "/review", json={
        "entity_id": "light.kitchen", "decision": "approved",
        "expected_revision": 0, "owner_confirmed": True,
    }).status_code == 403


class FakeSocket:
    def __init__(self):
        self.sent: list[dict] = []
        self.messages = [
            {"type": "auth_required"}, {"type": "auth_ok"},
            {"type": "result", "id": 1, "success": True, "result": {
                "exposed_entities": {"light.kitchen": {"cloud.alexa": True}}
            }},
            {"type": "result", "id": 2, "success": True, "result": {"expose_new": False}},
        ]

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return None

    async def recv(self):
        return json.dumps(self.messages.pop(0))

    async def send(self, raw):
        self.sent.append(json.loads(raw))


def test_official_ha_websocket_readback_is_read_only():
    socket = FakeSocket()
    client = HomeAssistantClient(
        "http://homeassistant.test", "private-test-token",
        websocket_connect=lambda *args, **kwargs: socket,
    )
    data = asyncio.run(client.alexa_exposure_report())
    assert data["exposed_entities"]["light.kitchen"]["cloud.alexa"] is True
    assert data["expose_new"] is False
    assert [item["type"] for item in socket.sent[1:]] == [
        "homeassistant/expose_entity/list",
        "homeassistant/expose_new_entities/get",
    ]
    assert all("should_expose" not in item for item in socket.sent)
