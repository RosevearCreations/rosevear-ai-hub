"""Build 054 role isolation, local review durability and guarded metadata export."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from test_frigate_api import FakeFrigate


def make_client(tmp_path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'camera-review-test.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)

    def dependency():
        with sessions() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_session] = dependency
    client = TestClient(app)
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "owner-password-123"},
        ).status_code
        == 201
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.api.camera_reviews.get_frigate_client", lambda: FakeFrigate()
    )
    return client


def test_admin_reviews_and_export_is_explicit_and_safe(tmp_path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch)
    saved = client.put(
        "/api/v1/frigate/events/event-1/review",
        json={"review_status": "flagged", "note": "=SUM(1,2)"},
    )
    assert saved.status_code == 200
    assert saved.json()["camera_name"] == "front_door"
    assert saved.json()["reviewed_by_user_id"] == 1
    assert saved.json()["note"] == "=SUM(1,2)"
    assert client.get("/api/v1/frigate/reviews").json()[0]["review_status"] == "flagged"
    assert client.get("/api/v1/frigate/reviews/export.csv").status_code == 400
    exported = client.get(
        "/api/v1/frigate/reviews/export.csv?acknowledgement=PRIVATE_METADATA_ONLY"
    )
    assert exported.status_code == 200
    assert exported.headers["cache-control"] == "no-store"
    assert exported.headers["content-disposition"].startswith("attachment;")
    assert "'=SUM(1,2)" in exported.text
    assert "rtsp://" not in exported.text
    assert "source_host" not in exported.text


def test_unknown_event_and_overlong_note_do_not_persist(tmp_path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch)
    assert (
        client.put(
            "/api/v1/frigate/events/unknown/review",
            json={"review_status": "reviewed", "note": "No such event"},
        ).status_code
        == 404
    )
    assert (
        client.put(
            "/api/v1/frigate/events/event-1/review",
            json={"review_status": "reviewed", "note": "x" * 501},
        ).status_code
        == 422
    )
    assert (
        client.put(
            "/api/v1/frigate/events/event-1/review",
            json={"review_status": "unapproved", "note": ""},
        ).status_code
        == 422
    )
    assert client.get("/api/v1/frigate/reviews").json() == []


def test_viewer_can_read_provider_events_but_not_private_reviews(tmp_path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch)
    client.put(
        "/api/v1/frigate/events/event-1/review",
        json={"review_status": "reviewed", "note": "Private home note"},
    )
    created = client.post(
        "/api/v1/auth/users",
        json={
            "username": "viewer",
            "password": "viewer-password-123",
            "role": "read_only",
        },
    )
    assert created.status_code == 201
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "viewer", "password": "viewer-password-123"},
        ).status_code
        == 200
    )
    assert client.get("/api/v1/frigate/events").status_code == 200
    assert client.get("/api/v1/frigate/reviews").status_code == 403
    assert (
        client.put(
            "/api/v1/frigate/events/event-1/review",
            json={"review_status": "flagged", "note": "Not allowed"},
        ).status_code
        == 403
    )
    assert (
        client.get(
            "/api/v1/frigate/reviews/export.csv?acknowledgement=PRIVATE_METADATA_ONLY"
        ).status_code
        == 403
    )


def test_offline_frigate_keeps_local_review_index(tmp_path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch)
    assert (
        client.put(
            "/api/v1/frigate/events/event-1/review",
            json={"review_status": "needs_review", "note": "Call back"},
        ).status_code
        == 200
    )

    class Offline:
        def recent_events(self, *, limit):
            from rosevear_ai_hub.integrations.frigate import FrigateUnavailable

            raise FrigateUnavailable("Provider offline")

    # Local reviewed data is available even if the provider is not.
    monkeypatch.setattr("rosevear_ai_hub.api.camera_reviews.get_frigate_client", Offline)
    assert client.get("/api/v1/frigate/reviews").json()[0]["note"] == "Call back"


def test_follow_up_acknowledgement_is_local_only_and_role_guarded(tmp_path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch)
    saved = client.put(
        "/api/v1/frigate/events/event-1/review",
        json={"review_status": "follow_up", "note": "Manually inspect in Frigate"},
    )
    assert saved.status_code == 200
    assert saved.json()["review_status"] == "follow_up"
    assert client.get("/api/v1/frigate/reviews").json()[0]["note"] == "Manually inspect in Frigate"
    assert (
        client.post(
            "/api/v1/auth/users",
            json={
                "username": "readonly",
                "password": "readonly-password-123",
                "role": "read_only",
            },
        ).status_code
        == 201
    )
    client.post("/api/v1/auth/logout")
    client.post(
        "/api/v1/auth/login",
        json={
            "username": "readonly",
            "password": "readonly-password-123",
        },
    )
    assert (
        client.put(
            "/api/v1/frigate/events/event-1/review",
            json={
                "review_status": "follow_up",
                "note": "Cannot acknowledge",
            },
        ).status_code
        == 403
    )
