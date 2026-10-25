"""Build 140: source reviews are versioned operator notes, never auto-enrollment."""

from datetime import UTC, datetime, timedelta, timezone

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import (
    AuditEvent,
    Camera,
    DeviceDiscoveryReview,
    DeviceRegistryAnnotation,
)


def client_for(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'guided-discovery.db'}")
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
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "owner-password-123"},
        ).status_code
        == 201
    )
    return client, sessions


def payload(**changes):
    return {
        "source": "ha_device",
        "source_id": "exact-ha-3",
        "decision": "approved_for_followup",
        "expected_revision": 0,
        "observed_at": datetime.now(UTC).isoformat(),
        **changes,
    }


def test_review_is_versioned_audited_and_never_enrolls_or_mutates_devices(tmp_path):
    client, sessions = client_for(tmp_path)
    assert client.get("/api/v1/device-discovery/reviews").json() == []
    created = client.put("/api/v1/device-discovery/review", json=payload())
    assert created.status_code == 200
    assert created.json()["revision"] == 1
    assert created.json()["decision"] == "approved_for_followup"
    assert client.put("/api/v1/device-discovery/review", json=payload()).status_code == 409
    updated = client.put(
        "/api/v1/device-discovery/review",
        json=payload(decision="investigate", expected_revision=1),
    )
    assert updated.status_code == 200
    assert updated.json()["revision"] == 2
    assert client.get("/api/v1/device-discovery/reviews").json()[0]["decision"] == "investigate"
    with sessions() as db:
        assert len(db.scalars(select(DeviceDiscoveryReview)).all()) == 1
        assert len(db.scalars(select(Camera)).all()) == 0
        assert len(db.scalars(select(DeviceRegistryAnnotation)).all()) == 0
        audits = db.scalars(
            select(AuditEvent).where(AuditEvent.event_type == "device_discovery.review.recorded")
        ).all()
        assert len(audits) == 2
        assert "exact-ha-3" not in str(audits[0].sanitized_arguments)


def test_expired_future_wildcard_and_secret_reviews_fail_closed(tmp_path):
    client, _ = client_for(tmp_path)
    old = (datetime.now(UTC) - timedelta(minutes=6)).isoformat()
    future = (datetime.now(UTC) + timedelta(minutes=2)).isoformat()
    assert (
        client.put("/api/v1/device-discovery/review", json=payload(observed_at=old)).status_code
        == 409
    )
    assert (
        client.put("/api/v1/device-discovery/review", json=payload(observed_at=future)).status_code
        == 409
    )
    assert (
        client.put(
            "/api/v1/device-discovery/review", json=payload(source="mqtt", source_id="home/#")
        ).status_code
        == 422
    )
    assert (
        client.put(
            "/api/v1/device-discovery/review", json=payload(source_id="rtsp://private")
        ).status_code
        == 422
    )
    assert (
        client.put("/api/v1/device-discovery/review", json=payload(source="camera")).status_code
        == 422
    )
    assert client.get("/api/v1/device-discovery/reviews").json() == []


def test_same_observation_replay_rejected_and_read_only_role_cannot_review(tmp_path):
    client, sessions = client_for(tmp_path)
    exact = payload(source="camera_candidate", source_id="onvif-cam-a")
    assert client.put("/api/v1/device-discovery/review", json=exact).status_code == 200
    assert (
        client.put(
            "/api/v1/device-discovery/review", json={**exact, "expected_revision": 1}
        ).status_code
        == 409
    )
    with sessions() as db:
        assert db.scalar(select(DeviceDiscoveryReview)).revision == 1
    assert (
        client.post(
            "/api/v1/auth/users",
            json={"username": "viewer", "password": "viewer-password-123", "role": "read_only"},
        ).status_code
        == 201
    )
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login", json={"username": "viewer", "password": "viewer-password-123"}
        ).status_code
        == 200
    )
    assert client.get("/api/v1/device-discovery/reviews").status_code == 200
    assert client.put("/api/v1/device-discovery/review", json=payload()).status_code == 403


def test_timezone_equivalent_observation_does_not_bypass_review_replay(tmp_path):
    client, _ = client_for(tmp_path)
    instant = datetime.now(UTC).replace(microsecond=0)
    exact = payload(observed_at=instant.isoformat())
    assert client.put("/api/v1/device-discovery/review", json=exact).status_code == 200
    alternate = instant.astimezone(timezone(timedelta(hours=-4))).isoformat()
    assert (
        client.put(
            "/api/v1/device-discovery/review",
            json={**exact, "observed_at": alternate, "expected_revision": 1},
        ).status_code
        == 409
    )


def test_migration_additive_and_reversible_without_modifying_camera_registry(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    path = tmp_path / "discovery-schema.db"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", f"sqlite:///{path}")
    command.upgrade(config, "0023")
    engine = create_engine(f"sqlite:///{path}")
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO cameras (endpoint_uuid,display_name,host,port,service_url,"
                "discovery_source,onvif_types,scopes,enabled,last_seen_at) VALUES "
                "('prior','Safe camera','192.0.2.12',80,'http://192.0.2.12','manual',"
                "'[]','[]',0,CURRENT_TIMESTAMP)"
            )
        )
    command.upgrade(config, "0024")
    assert "device_discovery_reviews" in inspect(engine).get_table_names()
    with engine.connect() as connection:
        assert (
            connection.execute(
                text("SELECT display_name FROM cameras WHERE endpoint_uuid='prior'")
            ).scalar_one()
            == "Safe camera"
        )
    command.downgrade(config, "0023")
    assert "device_discovery_reviews" not in inspect(engine).get_table_names()
    assert "device_registry_annotations" in inspect(engine).get_table_names()
    engine.dispose()
