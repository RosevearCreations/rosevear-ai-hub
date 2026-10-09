import base64

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.integrations.onvif import DiscoveredONVIFDevice
from rosevear_ai_hub.main import create_app


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'cameras.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    client = TestClient(application)
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "owner-password-123"},
        ).status_code
        == 201
    )
    return client


def discovered_camera(host: str = "192.168.68.55") -> DiscoveredONVIFDevice:
    return DiscoveredONVIFDevice(
        endpoint_uuid="camera-uuid-1",
        service_url=f"http://{host}/onvif/device_service",
        host=host,
        port=80,
        name="Front Door",
        types=("dn:NetworkVideoTransmitter",),
        scopes=("onvif://www.onvif.org/name/Front%20Door",),
    )


def test_owner_discovers_and_updates_camera_registry(tmp_path, monkeypatch) -> None:
    client = build_client(tmp_path)
    monkeypatch.setattr(
        "rosevear_ai_hub.api.cameras.discover_onvif_devices",
        lambda: [discovered_camera()],
    )

    first = client.post("/api/v1/cameras/discover")
    assert first.status_code == 200
    assert first.json()["created"] == 1
    assert first.json()["updated"] == 0
    camera = first.json()["cameras"][0]
    assert camera["display_name"] == "Front Door"
    assert camera["host"] == "192.168.68.55"

    second = client.post("/api/v1/cameras/discover")
    assert second.status_code == 200
    assert second.json()["created"] == 0
    assert second.json()["updated"] == 1

    listed = client.get("/api/v1/cameras")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    changed = client.patch(
        f"/api/v1/cameras/{camera['id']}",
        json={"display_name": "Porch Camera", "enabled": False},
    )
    assert changed.status_code == 200
    assert changed.json()["display_name"] == "Porch Camera"
    assert changed.json()["enabled"] is False


def test_household_user_can_view_but_cannot_scan(tmp_path, monkeypatch) -> None:
    client = build_client(tmp_path)
    monkeypatch.setattr(
        "rosevear_ai_hub.api.cameras.discover_onvif_devices",
        lambda: [discovered_camera()],
    )
    assert client.post("/api/v1/cameras/discover").status_code == 200

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

    assert client.get("/api/v1/cameras").status_code == 200
    assert client.post("/api/v1/cameras/discover").status_code == 403


@pytest.fixture
def stream_secret_key(monkeypatch):
    monkeypatch.setenv(
        "SECRET_ENCRYPTION_KEY",
        base64.urlsafe_b64encode(b"x" * 32).decode("ascii").rstrip("="),
    )
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def build_stream_client(tmp_path):
    return build_client(tmp_path)


class FakeGo2RTC:
    base_url = "http://127.0.0.1:1984"

    def status(self):
        from types import SimpleNamespace

        return SimpleNamespace(
            online=True,
            version="1.9.14",
            api_base_url="http://127.0.0.1:1984",
            rtsp_listen="127.0.0.1:8554",
            local_api_only=True,
            local_rtsp_only=True,
        )

    def patch_runtime_source(self, stream_name, source_url):
        self.source_url = source_url

    def probe_stream(self, stream_name):
        from types import SimpleNamespace

        return SimpleNamespace(
            stream_name=stream_name,
            producer_count=1,
            consumer_count=0,
        )

    def delete_stream(self, stream_name):
        self.deleted = stream_name


def test_owner_configures_encrypted_rtsp_and_probes(
    tmp_path, monkeypatch, stream_secret_key
) -> None:
    from sqlalchemy import create_engine, text

    client = build_stream_client(tmp_path)
    fake = FakeGo2RTC()
    monkeypatch.setattr(
        "rosevear_ai_hub.api.cameras.get_go2rtc_client",
        lambda: fake,
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.api.cameras.discover_onvif_devices",
        lambda: [discovered_camera()],
    )
    discovered = client.post("/api/v1/cameras/discover")
    assert discovered.status_code == 200
    camera_id = discovered.json()["cameras"][0]["id"]

    source = "rtsp://camera-user:camera-password@192.168.68.55/live/main"
    configured = client.put(
        f"/api/v1/cameras/{camera_id}/stream",
        json={"source_url": source},
    )
    assert configured.status_code == 200
    payload = configured.json()
    assert payload["synced"] is True
    assert payload["stream"]["source_host"] == "192.168.68.55"
    assert payload["stream"]["credentials_present"] is True
    assert payload["stream"]["relay_url"].endswith(f"/camera-{camera_id}")
    assert source not in configured.text
    assert "camera-password" not in configured.text

    engine = create_engine(f"sqlite:///{tmp_path / 'cameras.db'}")
    with engine.connect() as connection:
        stored = connection.execute(
            text("SELECT source_ciphertext FROM camera_streams WHERE camera_id = :camera_id"),
            {"camera_id": camera_id},
        ).scalar_one()
    assert source not in stored
    assert "camera-password" not in stored

    probe = client.post(f"/api/v1/cameras/{camera_id}/stream/probe")
    assert probe.status_code == 200
    assert probe.json()["status"] == "online"
    assert probe.json()["producer_count"] == 1


def test_rtsp_source_must_be_private_literal_ip(tmp_path, monkeypatch, stream_secret_key) -> None:
    client = build_stream_client(tmp_path)
    monkeypatch.setattr(
        "rosevear_ai_hub.api.cameras.get_go2rtc_client",
        lambda: FakeGo2RTC(),
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.api.cameras.discover_onvif_devices",
        lambda: [discovered_camera()],
    )
    camera_id = client.post("/api/v1/cameras/discover").json()["cameras"][0]["id"]

    public = client.put(
        f"/api/v1/cameras/{camera_id}/stream",
        json={"source_url": "rtsp://user:pass@8.8.8.8/live"},
    )
    assert public.status_code == 422

    hostname = client.put(
        f"/api/v1/cameras/{camera_id}/stream",
        json={"source_url": "rtsp://user:pass@camera.local/live"},
    )
    assert hostname.status_code == 422


def test_household_user_cannot_configure_camera_stream(
    tmp_path, monkeypatch, stream_secret_key
) -> None:
    client = build_stream_client(tmp_path)
    monkeypatch.setattr(
        "rosevear_ai_hub.api.cameras.get_go2rtc_client",
        lambda: FakeGo2RTC(),
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.api.cameras.discover_onvif_devices",
        lambda: [discovered_camera()],
    )
    camera_id = client.post("/api/v1/cameras/discover").json()["cameras"][0]["id"]

    assert (
        client.post(
            "/api/v1/auth/users",
            json={
                "username": "family-stream",
                "password": "family-password-123",
                "role": "household_user",
            },
        ).status_code
        == 201
    )
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login",
            json={
                "username": "family-stream",
                "password": "family-password-123",
            },
        ).status_code
        == 200
    )

    denied = client.put(
        f"/api/v1/cameras/{camera_id}/stream",
        json={"source_url": "rtsp://user:pass@192.168.68.55/live"},
    )
    assert denied.status_code == 403


def test_camera_dashboard_and_fleet_health_refresh(
    tmp_path, monkeypatch, stream_secret_key
) -> None:
    client = build_stream_client(tmp_path)
    fake = FakeGo2RTC()
    monkeypatch.setattr(
        "rosevear_ai_hub.api.cameras.get_go2rtc_client",
        lambda: fake,
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.api.cameras.discover_onvif_devices",
        lambda: [discovered_camera()],
    )

    camera_id = client.post("/api/v1/cameras/discover").json()["cameras"][0]["id"]
    configured = client.put(
        f"/api/v1/cameras/{camera_id}/stream",
        json={"source_url": "rtsp://user:pass@192.168.68.55/live"},
    )
    assert configured.status_code == 200

    before = client.get("/api/v1/cameras/dashboard")
    assert before.status_code == 200
    before_payload = before.json()
    assert before_payload["total"] == 1
    assert before_payload["configured"] == 1
    assert before_payload["healthy"] == 0
    assert before_payload["attention"] == 1
    assert before_payload["cameras"][0]["health"] == "untested"
    assert "camera-password" not in before.text

    refreshed = client.post("/api/v1/cameras/health/refresh")
    assert refreshed.status_code == 200
    assert refreshed.json()["checked"] == 1
    assert refreshed.json()["healthy"] == 1
    assert refreshed.json()["failed"] == 0

    after = client.get("/api/v1/cameras/dashboard")
    assert after.status_code == 200
    payload = after.json()
    assert payload["healthy"] == 1
    assert payload["attention"] == 0
    item = payload["cameras"][0]
    assert item["health"] == "healthy"
    assert item["source_host"] == "192.168.68.55"
    assert item["viewer_url"].startswith("http://127.0.0.1:1984/stream.html?src=camera-")
    assert "user:pass" not in after.text


def test_household_user_can_view_dashboard_but_cannot_run_health_refresh(
    tmp_path, monkeypatch, stream_secret_key
) -> None:
    client = build_stream_client(tmp_path)
    monkeypatch.setattr(
        "rosevear_ai_hub.api.cameras.get_go2rtc_client",
        lambda: FakeGo2RTC(),
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.api.cameras.discover_onvif_devices",
        lambda: [discovered_camera()],
    )
    assert client.post("/api/v1/cameras/discover").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/users",
            json={
                "username": "camera-viewer",
                "password": "family-password-123",
                "role": "household_user",
            },
        ).status_code
        == 201
    )
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login",
            json={
                "username": "camera-viewer",
                "password": "family-password-123",
            },
        ).status_code
        == 200
    )

    assert client.get("/api/v1/cameras/dashboard").status_code == 200
    assert client.post("/api/v1/cameras/health/refresh").status_code == 403
