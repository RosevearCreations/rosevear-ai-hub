"""Build 222: record search stays owner-only, bounded, and redacted."""

from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base, Camera, MaintenanceAction


def _client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'search.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with maker() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = override_session
    return TestClient(app), maker


def test_search_is_owner_only_and_does_not_leak_camera_connection_details(tmp_path):
    client, maker = _client(tmp_path)
    address = "/api/v1/global-search?q=front"
    assert client.get(address).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "local-search-owner-123"},
        ).status_code
        == 201
    )
    with maker() as session:
        session.add(
            Camera(
                endpoint_uuid="secret-camera-uuid",
                display_name="Front camera",
                host="private-camera.local",
                port=554,
                service_url="rtsp://secret-user:password@private-camera.local/feed",
                last_seen_at=datetime.now(UTC),
            )
        )
        session.add(
            MaintenanceAction(
                source_kind="household",
                source_id="private-source",
                title="Front door check",
                status="open",
                acknowledged=False,
                decision_reason="",
            )
        )
        session.commit()
    response = client.get(address)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert body["scope"] == "owner_local_saved_records"
    assert {row["kind"] for row in body["results"]} == {"camera", "maintenance"}
    for private in [
        "private-camera.local",
        "secret-camera-uuid",
        "rtsp://",
        "password",
        "private-source",
    ]:
        assert private not in response.text
    assert client.get("/api/v1/global-search?q=a").status_code == 422
    assert (
        client.post(
            "/api/v1/auth/users",
            json={
                "username": "family",
                "password": "local-search-family-123",
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
                "username": "family",
                "password": "local-search-family-123",
            },
        ).status_code
        == 200
    )
    assert client.get(address).status_code == 403
