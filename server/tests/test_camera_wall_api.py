"""Build 141: personal camera layout is isolated, bounded and never playback authority."""

from datetime import UTC, datetime

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Camera, CameraWallPreference


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'camera-wall.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)

    def override():
        with sessions() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_session] = override
    client = TestClient(app)
    assert (
        client.post(
            "/api/v1/auth/bootstrap", json={"username": "owner", "password": "owner-password-123"}
        ).status_code
        == 201
    )
    with sessions() as db:
        db.add(
            Camera(
                endpoint_uuid="secure-camera-uuid",
                display_name="Workshop",
                host="192.0.2.10",
                port=80,
                service_url="http://192.0.2.10/onvif",
                discovery_source="manual",
                onvif_types=[],
                scopes=[],
                enabled=False,
                last_seen_at=datetime.now(UTC),
            )
        )
        db.commit()
    return client, sessions


def test_personal_preferences_require_login_and_reject_bad_id_or_revision(tmp_path):
    client, sessions = build_client(tmp_path)
    assert client.get("/api/v1/camera-wall/preferences").json() == {
        "favorite_camera_ids": [],
        "compact": False,
        "revision": 0,
    }
    body = {"favorite_camera_ids": [1], "compact": True, "expected_revision": 0}
    saved = client.put("/api/v1/camera-wall/preferences", json=body)
    assert saved.status_code == 200
    assert saved.json() == {"favorite_camera_ids": [1], "compact": True, "revision": 1}
    assert client.put("/api/v1/camera-wall/preferences", json=body).status_code == 409
    for invalid in ([1, 1], [2], [-1], [True], ["rtsp://user:secret@private"]):
        assert (
            client.put(
                "/api/v1/camera-wall/preferences",
                json={
                    "favorite_camera_ids": invalid,
                    "compact": False,
                    "expected_revision": 1,
                },
            ).status_code
            == 422
        )
    assert (
        client.put(
            "/api/v1/camera-wall/preferences",
            json={
                "favorite_camera_ids": list(range(1, 27)),
                "compact": False,
                "expected_revision": 1,
            },
        ).status_code
        == 422
    )
    with sessions() as db:
        pref = db.scalar(select(CameraWallPreference))
        assert pref is not None
        assert pref.favorite_camera_ids == [1]
        assert pref.compact is True
    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/camera-wall/preferences").status_code == 401
    assert client.put("/api/v1/camera-wall/preferences", json=body).status_code == 401


def test_each_account_sees_only_own_layout_even_for_read_only_role(tmp_path):
    client, _ = build_client(tmp_path)
    assert (
        client.post(
            "/api/v1/auth/users",
            json={
                "username": "family",
                "password": "family-password-123",
                "role": "read_only",
            },
        ).status_code
        == 201
    )
    assert (
        client.put(
            "/api/v1/camera-wall/preferences",
            json={
                "favorite_camera_ids": [1],
                "compact": True,
                "expected_revision": 0,
            },
        ).status_code
        == 200
    )
    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login",
            json={
                "username": "family",
                "password": "family-password-123",
            },
        ).status_code
        == 200
    )
    assert client.get("/api/v1/camera-wall/preferences").json()["favorite_camera_ids"] == []
    assert (
        client.put(
            "/api/v1/camera-wall/preferences",
            json={
                "favorite_camera_ids": [],
                "compact": True,
                "expected_revision": 0,
            },
        ).status_code
        == 200
    )
    client.post("/api/v1/auth/logout")
    client.post(
        "/api/v1/auth/login",
        json={
            "username": "owner",
            "password": "owner-password-123",
        },
    )
    assert client.get("/api/v1/camera-wall/preferences").json()["favorite_camera_ids"] == [1]


def test_additive_migration_round_trip(tmp_path):
    db_path = tmp_path / "migration.db"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")
    command.upgrade(config, "0024")
    command.upgrade(config, "0025")
    engine = create_engine(f"sqlite:///{db_path}")
    assert "camera_wall_preferences" in inspect(engine).get_table_names()
    command.downgrade(config, "0024")
    assert "camera_wall_preferences" not in inspect(engine).get_table_names()
    assert "cameras" in inspect(engine).get_table_names()
    with engine.connect() as connection:
        assert connection.execute(text("SELECT COUNT(*) FROM cameras")).scalar() == 0
