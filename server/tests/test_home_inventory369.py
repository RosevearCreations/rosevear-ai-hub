"""Build 369 uses synthetic Home Assistant data, never a real household host."""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.home_assistant import (
    HomeAssistantRuntime,
    get_home_assistant_runtime,
)
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantUnavailableError
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import (
    AuditEvent,
    DeviceRegistryAnnotation,
    HomeInventoryIdentity369,
    HomeInventorySnapshot369,
    User,
)


class FakeHA:
    def __init__(self):
        self.offline = False
        self.states_data = [
            {"entity_id": "sensor.workshop", "state": "22.0"},
            {"entity_id": "light.kitchen", "state": "off"},
        ]
        self.registry = {
            "areas": [
                {"area_id": "workshop", "name": "Workshop"},
                {"area_id": "kitchen", "name": "Kitchen"},
            ],
            "devices": [
                {"id": "device-1", "name": "Temperature Sensor", "area_id": "workshop"},
                {"id": "device-2", "name": "Kitchen Lamp", "area_id": "kitchen"},
            ],
            "entities": [
                {"entity_id": "sensor.workshop", "name": "Workshop Temp", "device_id": "device-1"},
                {"entity_id": "light.kitchen", "name": "Kitchen Light", "device_id": "device-2"},
                {
                    "entity_id": "sensor.no_state",
                    "name": "No State Sensor",
                    "device_id": "device-1",
                },
            ],
        }

    async def states(self):
        if self.offline:
            raise HomeAssistantUnavailableError("synthetic outage")
        return deepcopy(self.states_data)

    async def registry_snapshot(self):
        if self.offline:
            raise HomeAssistantUnavailableError("synthetic outage")
        return deepcopy(self.registry)


def setup(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'home-inventory369.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    ha = FakeHA()
    app = create_app()

    def db_override():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_session] = db_override
    app.dependency_overrides[get_home_assistant_runtime] = lambda: HomeAssistantRuntime(
        client=ha,
        base_url="http://homeassistant.test",
        url_configured=True,
        token_configured=True,
    )
    client = TestClient(app)
    assert client.get("/api/v1/home-inventory-369/report").status_code == 401
    assert (
        client.post(
            "/api/v1/auth/bootstrap", json={"username": "owner", "password": "owner-password-123"}
        ).status_code
        == 201
    )
    with sessions() as db:
        owner = db.scalar(select(User).where(User.username == "owner"))
        assert owner is not None
        db.add(
            DeviceRegistryAnnotation(
                source="mqtt",
                source_id="house/power",
                alias="Manual MQTT Power",
                room_label="Workshop",
                disposition="reviewed",
                revision=1,
                reviewed_by_user_id=owner.id,
                reviewed_at=datetime.now(UTC),
            )
        )
        db.commit()
    return client, sessions, ha


def test_registry_only_mqtt_claims_and_no_provider_mutation(tmp_path):
    client, sessions, ha = setup(tmp_path)
    endpoint = "/api/v1/home-inventory-369"
    assert client.get(endpoint + "/report").json()["lastCapture"] is None
    first = client.post(endpoint + "/capture")
    assert first.status_code == 200, first.text
    data = first.json()
    assert data["mode"] == "OWNER_INITIATED_READ_ONLY_CAPTURE"
    assert data["providerWritesPerformed"] == 0
    assert data["physicalDevicesVerified"] is False
    assert data["lastCapture"]["areaCount"] == 2
    assert data["lastCapture"]["deviceCount"] == 2
    assert data["lastCapture"]["mqttReferenceCount"] == 1
    expected = {
        "ha_device:device-1",
        "ha_device:device-2",
        "ha_entity:sensor.workshop",
        "ha_entity:light.kitchen",
        "ha_entity:sensor.no_state",
        "mqtt:house/power",
    }
    assert {item["source"] + ":" + item["sourceId"] for item in data["identities"]} == expected
    no_state = next(x for x in data["identities"] if x["sourceId"] == "sensor.no_state")
    assert no_state["presence"] == "registry_only"
    mqtt = next(x for x in data["identities"] if x["source"] == "mqtt")
    assert mqtt["presence"] == "unverified_reference"
    assert mqtt["lastSourceSeenAt"] is None
    assert data["counts"]["unclaimed"] == 6
    assert ha.registry["devices"][0]["name"] == "Temperature Sensor"
    claim = client.put(
        endpoint + "/claim",
        json={
            "identity_id": no_state["id"],
            "expected_revision": no_state["revision"],
            "decision": "claimed",
        },
    )
    assert claim.status_code == 200
    assert (
        client.put(
            endpoint + "/claim",
            json={
                "identity_id": no_state["id"],
                "expected_revision": no_state["revision"],
                "decision": "unsupported",
            },
        ).status_code
        == 409
    )
    with sessions() as db:
        assert len(db.scalars(select(HomeInventorySnapshot369)).all()) == 1
        assert db.scalar(select(HomeInventoryIdentity369)).source in {
            "ha_device",
            "ha_entity",
            "mqtt",
        }
        assert db.scalars(
            select(AuditEvent).where(AuditEvent.event_type == "ha369.snapshot.reconciled")
        ).all()


def test_real_snapshot_changes_are_review_only_and_offline_preserves_history(tmp_path):
    client, sessions, ha = setup(tmp_path)
    path = "/api/v1/home-inventory-369"
    assert client.post(path + "/capture").status_code == 200
    ha.registry["devices"][0]["name"] = "Workshop Thermometer"
    ha.registry["devices"][0]["area_id"] = "kitchen"
    ha.states_data[0]["state"] = "unavailable"
    ha.registry["entities"] = [
        item for item in ha.registry["entities"] if item["entity_id"] != "light.kitchen"
    ]
    ha.states_data = [item for item in ha.states_data if item["entity_id"] != "light.kitchen"]
    report = client.post(path + "/capture")
    assert report.status_code == 200, report.text
    data = report.json()
    assert data["counts"]["missing"] == 1
    lamp = next(item for item in data["identities"] if item["sourceId"] == "light.kitchen")
    assert lamp["presence"] == "missing_from_registry"
    assert lamp["lastSourceSeenAt"] is not None
    assert (
        client.put(
            path + "/claim",
            json={
                "identity_id": lamp["id"],
                "decision": "claimed",
                "expected_revision": lamp["revision"],
            },
        ).status_code
        == 409
    )
    kinds = [event["kind"] for event in data["changes"]]
    assert "name_changed" in kinds
    assert "area_changed" in kinds
    assert "not_in_registry" in kinds
    ha.offline = True
    assert client.post(path + "/capture").status_code == 503
    offline_report = client.get(path + "/report").json()
    assert offline_report["lastCapture"]["id"] == data["lastCapture"]["id"]
    assert offline_report["counts"]["missing"] == 1
    with sessions() as db:
        assert len(db.scalars(select(HomeInventorySnapshot369)).all()) == 2


def test_duplicate_exact_ids_and_suspicious_registry_collapse_hold(tmp_path):
    client, sessions, ha = setup(tmp_path)
    path = "/api/v1/home-inventory-369"
    assert client.post(path + "/capture").status_code == 200
    ha.registry["devices"].append(deepcopy(ha.registry["devices"][0]))
    assert client.post(path + "/capture").status_code == 422
    ha.registry["devices"].pop()
    ha.registry["devices"] = []
    ha.registry["entities"] = []
    ha.states_data = []
    # Previously 5 HA identities -> an empty report cannot remove them all.
    assert client.post(path + "/capture").status_code == 409
    with sessions() as db:
        assert len(db.scalars(select(HomeInventorySnapshot369)).all()) == 1


def test_owner_only_read_capture_and_claim(tmp_path):
    client, _, _ = setup(tmp_path)
    prefix = "/api/v1/home-inventory-369"
    assert (
        client.post(
            "/api/v1/auth/users",
            json={
                "username": "viewer",
                "password": "viewer-password-123",
                "role": "read_only",
            },
        ).status_code
        == 201
    )
    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login",
            json={
                "username": "viewer",
                "password": "viewer-password-123",
            },
        ).status_code
        == 200
    )
    assert client.get(prefix + "/report").status_code == 403
    assert client.post(prefix + "/capture").status_code == 403
    assert (
        client.put(
            prefix + "/claim",
            json={
                "identity_id": 1,
                "expected_revision": 1,
                "decision": "claimed",
            },
        ).status_code
        == 403
    )
