"""Build 375: camera/doorbell event reliability without video or vendor writes."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api import camera_reliability375
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.integrations.frigate import (
    FrigateCamera,
    FrigateEvent,
    FrigateStatus,
    FrigateUnavailable,
)
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Camera


def event(name="front_door", key="e-1", delay=3, *, end=None):
    now = datetime.now(UTC).timestamp()
    return FrigateEvent(
        event_id=key, camera=name, label="person", sub_label=None,
        start_time=now - delay, end_time=end, zones=("porch",),
        has_clip=True, has_snapshot=True, false_positive=False, score=0.91,
    )


class FakeFrigate:
    def __init__(self):
        self.online = True
        self.events = [event()]
        self.sources = [
            FrigateCamera(
                name="front_door", enabled=True, detect_enabled=True,
                record_enabled=False, snapshots_enabled=True,
            ),
            FrigateCamera(
                name="garage", enabled=True, detect_enabled=False,
                record_enabled=False, snapshots_enabled=False,
            ),
        ]
        self.calls = []

    def status(self):
        self.calls.append("GET version")
        if not self.online:
            raise FrigateUnavailable("offline")
        return FrigateStatus(
            online=True, version="test", base_url="http://127.0.0.1:5000",
            local_only=True,
        )

    def cameras(self):
        self.calls.append("GET config")
        if not self.online:
            raise FrigateUnavailable("offline")
        return self.sources

    def recent_events(self, *, limit):
        self.calls.append("GET events")
        if not self.online:
            raise FrigateUnavailable("offline")
        return self.events[:limit]


def setup(tmp_path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'cam375.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    app = create_app()
    fake = FakeFrigate()
    monkeypatch.setattr(camera_reliability375, "get_frigate_client", lambda: fake)

    def db_override():
        with sessions() as session:
            yield session

    app.dependency_overrides[get_session] = db_override
    client = TestClient(app)
    response = client.post("/api/v1/auth/bootstrap", json={
        "username": "owner", "password": "owner-password-123",
    })
    assert response.status_code == 201
    with sessions() as session:
        row = Camera(
            endpoint_uuid="urn:test:front-door",
            display_name="Front Door Camera",
            host="127.0.0.1",
            port=80,
            service_url="http://127.0.0.1/onvif",
            discovery_source="test",
            onvif_types=[],
            scopes=[],
            enabled=True,
            last_seen_at=datetime.now(UTC) - timedelta(hours=2),
        )
        session.add(row)
        session.commit()
        camera_id = row.id

    def dashboard(_actor, _db):
        return SimpleNamespace(
            total=1, enabled=1, transport_online=False,
            cameras=[SimpleNamespace(
                camera_id=camera_id, display_name="Front Door Camera",
                enabled=True, configured=True, health="healthy",
                last_probe_at=datetime.now(UTC) - timedelta(hours=1),
            )],
        )

    monkeypatch.setattr(camera_reliability375, "camera_dashboard", dashboard)
    return client, fake, camera_id


def test_manual_inspection_provenance_and_staleness(tmp_path, monkeypatch):
    client, fake, camera_id = setup(tmp_path, monkeypatch)
    path = "/api/v1/camera-reliability-375"
    assert client.get(path + "/report").json()["state"] == "NO_PRIOR_OBSERVATION"
    result = client.post(path + "/inspect")
    assert result.status_code == 200, result.text
    body = result.json()
    assert body["state"] == "LOCAL_API_RESPONDED"
    assert body["events"]["accepted"] == 1
    assert body["events"]["invalid"] == 0
    assert body["sourceCameras"][0]["eventState"] == (
        "RECENT_EVENT_METADATA_NOT_VIDEO_PROOF"
    )
    assert body["sourceCameras"][1]["eventState"] == "DETECTION_DISABLED"
    assert body["localCameras"][0]["cameraId"] == camera_id
    assert body["localCameras"][0]["probeState"] == "transport_unavailable"
    assert body["fieldVideoVerified"] is False
    assert body["doorbellChimeVerified"] is False
    assert body["providerWritesPerformed"] == 0
    report = client.get(path + "/report").json()
    assert report["state"] == "RECENT_LOCAL_OBSERVATION"
    assert len(report["history"]) == 1
    assert "e-1" not in str(report)
    assert "127.0.0.1" not in str(report)
    assert fake.calls == ["GET version", "GET config", "GET events"]


def test_event_anomaly_and_quiet_room_not_claimed_offline(tmp_path, monkeypatch):
    client, fake, _ = setup(tmp_path, monkeypatch)
    fake.events = [
        event(key="good", delay=61),
        event(key="good", delay=5),
        event(key="future", delay=-600),
        event(name="unknown_camera", key="unknown"),
        event(key="bad-end", end=1),
    ]
    body = client.post("/api/v1/camera-reliability-375/inspect").json()
    assert body["events"]["accepted"] == 1
    assert body["events"]["invalid"] == 4
    assert body["events"]["duplicateIds"] == 1
    assert body["events"]["futureTimestamps"] == 1
    assert body["events"]["unknownCameraEvents"] == 1
    assert body["events"]["invalidDurations"] == 1
    fake.events = []
    quiet = client.post("/api/v1/camera-reliability-375/inspect").json()
    assert quiet["sourceCameras"][0]["eventState"] == (
        "NO_RECENT_EVENTS_NOT_FAILURE"
    )
    assert quiet["events"]["accepted"] == 0


def test_owner_mapping_requires_source_and_offline_deactivation(tmp_path, monkeypatch):
    client, fake, cam_id = setup(tmp_path, monkeypatch)
    path = "/api/v1/camera-reliability-375"
    payload = {
        "camera_id": cam_id, "frigate_name": "front_door",
        "role": "doorbell", "active": True, "expected_revision": 0,
        "owner_confirmed": True,
    }
    assert client.put(path + "/binding", json={
        **payload, "owner_confirmed": False,
    }).status_code == 422
    created = client.put(path + "/binding", json=payload)
    assert created.status_code == 200, created.text
    assert created.json()["mapping"]["role"] == "doorbell"
    assert created.json()["providerWritesPerformed"] == 0
    assert client.put(path + "/binding", json=payload).status_code == 409
    view = client.post(path + "/inspect").json()
    assert view["sourceCameras"][0]["ownerBoundCameraId"] == cam_id
    assert view["sourceCameras"][0]["ownerRole"] == "doorbell"
    fake.online = False
    offline = client.post(path + "/inspect")
    assert offline.status_code == 200
    assert offline.json()["events"]["readAvailable"] is False
    assert offline.json()["state"] == "HOLD_FRIGATE_UNAVAILABLE"
    assert offline.json()["events"]["accepted"] is None
    disabled = client.put(path + "/binding", json={
        **payload, "active": False, "expected_revision": 1,
    })
    assert disabled.status_code == 200
    assert disabled.json()["mapping"]["active"] is False
    assert not any("POST" in call for call in fake.calls)


def test_non_owner_may_not_inspect_or_read_private_history(tmp_path, monkeypatch):
    client, fake, cam_id = setup(tmp_path, monkeypatch)
    assert client.post("/api/v1/auth/users", json={
        "username": "viewer", "password": "viewer-password-123",
        "role": "read_only",
    }).status_code == 201
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.post("/api/v1/auth/login", json={
        "username": "viewer", "password": "viewer-password-123",
    }).status_code == 200
    base = "/api/v1/camera-reliability-375"
    assert client.get(base + "/report").status_code == 403
    assert client.post(base + "/inspect").status_code == 403
    assert client.put(base + "/binding", json={
        "camera_id": cam_id, "frigate_name": "front_door",
        "role": "doorbell", "active": True,
        "expected_revision": 0, "owner_confirmed": True,
    }).status_code == 403
    assert fake.calls == []
