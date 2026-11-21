"""Build 373: synthetic Apple/Matter source, authorization and safety contracts."""

from __future__ import annotations

from copy import deepcopy

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.home_assistant import HomeAssistantRuntime, get_home_assistant_runtime
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantUnavailableError
from rosevear_ai_hub.main import create_app


class FakeHA:
    def __init__(self):
        self.offline = False
        self.registry = {
            "areas": [{"area_id": "kitchen", "name": "Kitchen"}],
            "devices": [
                {
                    "id": "matterA", "name": "Kitchen Sensor",
                    "identifiers": [["matter", "secret-001"]],
                },
                {
                    "id": "hkA", "name": "Kitchen Sensor",
                    "identifiers": [["homekit_controller", "pin-999"]],
                },
                {"id": "other", "name": "Ordinary Lamp", "identifiers": [["mqtt", "one"]]},
            ],
            "entities": [
                {"entity_id": "sensor.temperature", "device_id": "matterA", "platform": "matter"},
                {"entity_id": "light.bridge", "device_id": "hkA", "platform": "homekit_controller"},
            ],
        }

    async def registry_snapshot(self):
        if self.offline:
            raise HomeAssistantUnavailableError("synthetic offline")
        return deepcopy(self.registry)


def setup(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'apple373.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    app = create_app()
    ha = FakeHA()

    def db_override():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_session] = db_override
    app.dependency_overrides[get_home_assistant_runtime] = lambda: HomeAssistantRuntime(
        client=ha, base_url="http://ha.test", url_configured=True, token_configured=True
    )
    client = TestClient(app)
    result = client.post(
        "/api/v1/auth/bootstrap", json={"username": "owner", "password": "owner-password-123"}
    )
    assert result.status_code == 201
    return client, ha


def test_owner_inspection_review_conflict_and_offline_revocation(tmp_path):
    client, ha = setup(tmp_path)
    base = "/api/v1/apple-matter-373"
    report = client.get(base + "/report").json()
    assert report["state"] == "HOLD_NOT_INSPECTED"
    assert report["appleHomeAccountVerified"] is False
    inspection = client.get(base + "/inspect")
    assert inspection.status_code == 200, inspection.text
    data = inspection.json()
    assert data["state"] == "HA_REGISTRY_ONLY"
    assert data["count"] == 2
    assert data["possibleDuplicateNames"] == 2
    assert "secret-001" not in inspection.text
    assert "pin-999" not in inspection.text
    assert "other" not in [x["deviceId"] for x in data["items"]]
    assert data["providerWritesPerformed"] == 0
    review = {"device_id": "matterA", "decision": "reviewed", "expected_revision": 0}
    assert (
        client.put(base + "/review", json={**review, "owner_confirmed": False}).status_code
        == 422
    )
    ok = client.put(base + "/review", json={**review, "owner_confirmed": True})
    assert ok.status_code == 200, ok.text
    assert ok.json()["manualProviderStepRequired"] is True
    assert client.put(base + "/review", json={**review, "owner_confirmed": True}).status_code == 409
    assert client.get(base + "/report").json()["reviews"][0]["decision"] == "reviewed"
    ha.offline = True
    assert client.get(base + "/inspect").status_code == 503
    revoked = client.put(base + "/review", json={
        "device_id": "matterA", "decision": "revoked", "expected_revision": 1,
        "owner_confirmed": True,
    })
    assert revoked.status_code == 200
    assert client.get(base + "/report").json()["reviews"][0]["decision"] == "revoked"


def test_incomplete_or_unsupported_ha_fails_closed(tmp_path):
    client, ha = setup(tmp_path)
    base = "/api/v1/apple-matter-373"
    assert client.put(base + "/review", json={
        "device_id": "other", "decision": "reviewed", "expected_revision": 0,
        "owner_confirmed": True,
    }).status_code == 409
    ha.registry["devices"].append(deepcopy(ha.registry["devices"][0]))
    assert client.get(base + "/inspect").status_code == 422
    assert client.get(base + "/report").status_code == 200


def test_non_owner_forbidden(tmp_path):
    client, _ = setup(tmp_path)
    assert client.post("/api/v1/auth/users", json={
        "username": "viewer", "password": "viewer-password-123", "role": "read_only",
    }).status_code == 201
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.post("/api/v1/auth/login", json={
        "username": "viewer", "password": "viewer-password-123",
    }).status_code == 200
    base = "/api/v1/apple-matter-373"
    assert client.get(base + "/report").status_code == 403
    assert client.get(base + "/inspect").status_code == 403
    assert client.put(base + "/review", json={
        "device_id": "matterA", "decision": "reviewed", "expected_revision": 0,
        "owner_confirmed": True,
    }).status_code == 403
