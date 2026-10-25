"""Build 139: reviewed device metadata does not mutate any upstream registry."""

from datetime import UTC, datetime

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
    DeviceRegistryAnnotation,
    DeviceRegistryMatchReview,
)


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'device-registry.db'}")
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
    return client, sessions


def annotation(source="ha_device", source_id="device-thermostat", **changes):
    return {
        "source": source,
        "source_id": source_id,
        "alias": "Family thermostat",
        "room_label": "Living room",
        "disposition": "reviewed",
        "expected_revision": 0,
        **changes,
    }


def match(left=None, right=None, **changes):
    return {
        "left": left or {"source": "ha_device", "source_id": "device-thermostat"},
        "right": right or {"source": "camera", "source_id": "7"},
        "decision": "possible_match",
        "expected_revision": 0,
        **changes,
    }


def test_reviewed_metadata_is_durable_versioned_and_cannot_change_provider_records(tmp_path):
    client, sessions = build_client(tmp_path)
    with sessions() as db:
        db.add(
            Camera(
                endpoint_uuid="camera-real-identity",
                display_name="Family camera",
                host="192.0.2.40",
                port=80,
                service_url="http://192.0.2.40:80/onvif",
                discovery_source="manual",
                onvif_types=[],
                scopes=[],
                enabled=False,
                last_seen_at=datetime.now(UTC),
            )
        )
        db.commit()
    assert client.get("/api/v1/device-registry/reviews").json() == {
        "annotations": [],
        "matches": [],
    }
    created = client.put("/api/v1/device-registry/annotation", json=annotation())
    assert created.status_code == 200
    assert created.json()["revision"] == 1
    assert created.json()["room_label"] == "Living room"
    assert client.put("/api/v1/device-registry/annotation", json=annotation()).status_code == 409
    updated = client.put(
        "/api/v1/device-registry/annotation",
        json=annotation(
            expected_revision=1,
            alias="Thermostat (owner-reviewed)",
            disposition="needs_investigation",
        ),
    )
    assert updated.status_code == 200
    assert updated.json()["revision"] == 2
    assert client.get("/api/v1/device-registry/reviews").json()["annotations"][0]["revision"] == 2
    with sessions() as db:
        assert db.scalar(select(Camera)).display_name == "Family camera"
        assert db.scalar(select(DeviceRegistryAnnotation)).alias == "Thermostat (owner-reviewed)"
        assert db.scalars(
            select(AuditEvent).where(AuditEvent.event_type == "device_registry.annotation.reviewed")
        ).all()


def test_match_reviews_are_order_independent_and_never_merge_records(tmp_path):
    client, sessions = build_client(tmp_path)
    created = client.put("/api/v1/device-registry/match-review", json=match())
    assert created.status_code == 200
    assert created.json()["revision"] == 1
    flipped = client.put(
        "/api/v1/device-registry/match-review",
        json=match(
            left={"source": "camera", "source_id": "7"},
            right={"source": "ha_device", "source_id": "device-thermostat"},
            decision="distinct",
            expected_revision=1,
        ),
    )
    assert flipped.status_code == 200
    assert flipped.json()["revision"] == 2
    assert flipped.json()["decision"] == "distinct"
    assert client.put("/api/v1/device-registry/match-review", json=match()).status_code == 409
    assert (
        client.put(
            "/api/v1/device-registry/match-review",
            json=match(
                right={"source": "ha_device", "source_id": "device-thermostat"},
            ),
        ).status_code
        == 422
    )
    with sessions() as db:
        assert len(db.scalars(select(DeviceRegistryMatchReview)).all()) == 1
        assert len(db.scalars(select(DeviceRegistryAnnotation)).all()) == 0


def test_protected_roles_validation_and_explicit_mqtt_annotation(tmp_path):
    client, _ = build_client(tmp_path)
    assert (
        client.put(
            "/api/v1/device-registry/annotation",
            json=annotation(source="mqtt", source_id="house/temperature/#"),
        ).status_code
        == 422
    )
    assert (
        client.put(
            "/api/v1/device-registry/annotation",
            json=annotation(source="mqtt", source_id="rtsp://private"),
        ).status_code
        == 422
    )
    assert (
        client.put(
            "/api/v1/device-registry/annotation", json=annotation(alias="password=bad")
        ).status_code
        == 422
    )
    approved = client.put(
        "/api/v1/device-registry/annotation",
        json=annotation(source="mqtt", source_id="house/temperature", alias="Temperature topic"),
    )
    assert approved.status_code == 200
    assert approved.json()["source"] == "mqtt"
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
    assert client.get("/api/v1/device-registry/reviews").status_code == 200
    assert client.put("/api/v1/device-registry/annotation", json=annotation()).status_code == 403
    assert client.put("/api/v1/device-registry/match-review", json=match()).status_code == 403


def test_migration_adds_only_independent_review_tables(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    path = tmp_path / "device-registry-migration.db"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", f"sqlite:///{path}")
    command.upgrade(config, "0022")
    engine = create_engine(f"sqlite:///{path}")
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO cameras (endpoint_uuid,display_name,host,port,service_url,"
                "discovery_source,onvif_types,scopes,enabled,last_seen_at) VALUES "
                "('preserved','Camera','192.0.2.4',80,'http://192.0.2.4','manual','[]','[]',0,CURRENT_TIMESTAMP)"
            )
        )
    command.upgrade(config, "0023")
    tables = inspect(engine).get_table_names()
    assert "device_registry_annotations" in tables
    assert "device_registry_match_reviews" in tables
    with engine.connect() as connection:
        assert (
            connection.execute(
                text("SELECT display_name FROM cameras WHERE endpoint_uuid='preserved'")
            ).scalar_one()
            == "Camera"
        )
    command.downgrade(config, "0022")
    assert "device_registry_annotations" not in inspect(engine).get_table_names()
    engine.dispose()
