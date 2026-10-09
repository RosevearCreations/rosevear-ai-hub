from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.integrations.frigate import FrigateEvent
from rosevear_ai_hub.main import create_app


class FakeFrigate:
    base_url = "http://127.0.0.1:5000"

    def status(self):
        return SimpleNamespace(
            online=True,
            version="0.16.2",
            base_url=self.base_url,
            local_only=True,
        )

    def cameras(self):
        return [
            SimpleNamespace(
                name="front_door",
                enabled=True,
                detect_enabled=True,
                record_enabled=True,
                snapshots_enabled=True,
            )
        ]

    def recent_events(self, *, limit):
        return [
            FrigateEvent(
                event_id="event-1",
                camera="front_door",
                label="person",
                sub_label=None,
                start_time=1728480000.0,
                end_time=1728480010.0,
                zones=("porch",),
                has_clip=True,
                has_snapshot=True,
                false_positive=False,
                score=0.92,
            )
        ][:limit]


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'frigate.db'}")
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


def test_authenticated_user_can_read_frigate_adapter(tmp_path, monkeypatch) -> None:
    client = build_client(tmp_path)
    monkeypatch.setattr(
        "rosevear_ai_hub.api.frigate.get_frigate_client",
        lambda: FakeFrigate(),
    )

    status = client.get("/api/v1/frigate/status")
    assert status.status_code == 200
    assert status.json()["online"] is True
    assert status.json()["local_only"] is True

    cameras = client.get("/api/v1/frigate/cameras")
    assert cameras.status_code == 200
    assert cameras.json()["cameras"][0]["name"] == "front_door"

    events = client.get("/api/v1/frigate/events?limit=10")
    assert events.status_code == 200
    payload = events.json()["events"][0]
    assert payload["event_id"] == "event-1"
    assert payload["label"] == "person"
    assert payload["zones"] == ["porch"]


def test_read_only_user_can_view_frigate_but_no_write_api_exists(tmp_path, monkeypatch) -> None:
    client = build_client(tmp_path)
    monkeypatch.setattr(
        "rosevear_ai_hub.api.frigate.get_frigate_client",
        lambda: FakeFrigate(),
    )

    assert (
        client.post(
            "/api/v1/auth/users",
            json={
                "username": "frigate-viewer",
                "password": "viewer-password-123",
                "role": "read_only",
            },
        ).status_code
        == 201
    )
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login",
            json={
                "username": "frigate-viewer",
                "password": "viewer-password-123",
            },
        ).status_code
        == 200
    )

    assert client.get("/api/v1/frigate/status").status_code == 200
    assert client.get("/api/v1/frigate/cameras").status_code == 200
    assert client.get("/api/v1/frigate/events").status_code == 200
    assert client.post("/api/v1/frigate/events").status_code == 405
