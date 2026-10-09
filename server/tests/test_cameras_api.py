from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

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
