"""Build 219: bounded source-aware actions and explicit owner decisions."""

from datetime import UTC, datetime, timedelta

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import (
    CameraEventReview,
    DeviceRegistryAnnotation,
    MaintenanceAction,
    WorkshopEquipment,
)


def client_db(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'actions219.db'}")
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


def decision(revision=0, status="open", reason=""):
    return {
        "expected_revision": revision,
        "assigned_user_id": None,
        "due_at": None,
        "status": status,
        "acknowledged": True,
        "decision_reason": reason,
    }


def seed_sources(sessions):
    now = datetime.now(UTC)
    with sessions() as db:
        db.add(
            WorkshopEquipment(
                project_key="workshop",
                name="Ortur laser",
                equipment_type="laser",
                activity_type="laser",
                readiness_status="blocked",
                disabled=False,
                maintenance_due_at=now - timedelta(days=2),
                notes="manual",
            )
        )
        db.add(
            DeviceRegistryAnnotation(
                source="ha_device",
                source_id="switch1",
                alias="Garage switch",
                room_label="garage",
                disposition="needs_investigation",
                revision=1,
                reviewed_by_user_id=1,
                reviewed_at=now - timedelta(days=10),
            )
        )
        db.add(
            CameraEventReview(
                event_id="event-1",
                camera_name="Garage camera",
                object_label="person",
                event_start_time=123.0,
                review_status="follow_up",
                note="review",
                updated_at=now - timedelta(days=2),
            )
        )
        db.commit()


def test_source_dedup_and_hazard_closure_guard(tmp_path):
    client, sessions = client_db(tmp_path)
    seed_sources(sessions)
    data = client.get("/api/v1/maintenance-actions").json()
    assert data["automatic_closure"] is False
    assert data["equipment_control"] is False
    assert len(data["items"]) == 3
    assert len({(row["source_kind"], row["source_id"]) for row in data["items"]}) == 3
    device = next(row for row in data["items"] if row["source_kind"] == "device")
    assert device["source_stale"] is True
    assert device["hazard_unresolved"] is True
    laser = next(row for row in data["items"] if row["source_kind"] == "workshop_equipment")
    route = f"/api/v1/maintenance-actions/workshop_equipment/{laser['source_id']}"
    assert client.put(route, json=decision(status="closed", reason="looks good")).status_code == 409
    assert (
        client.put(
            route, json=decision(status="deferred", reason="Awaiting trained review")
        ).status_code
        == 200
    )
    assert client.put(route, json=decision()).status_code == 409
    reread = client.get("/api/v1/maintenance-actions").json()
    assert len(reread["items"]) == 3
    assert (
        next(row for row in reread["items"] if row["source_id"] == laser["source_id"])["status"]
        == "deferred"
    )
    with sessions() as db:
        assert db.query(MaintenanceAction).count() == 1
        assert db.query(WorkshopEquipment).first().readiness_status == "blocked"

    # A source falling outside the current candidate sample must not erase its owner overlay.
    with sessions() as db:
        item = db.query(WorkshopEquipment).first()
        item.readiness_status = "review_required"
        item.maintenance_due_at = datetime.now(UTC) + timedelta(days=90)
        db.commit()
    missing_source = next(
        row
        for row in client.get("/api/v1/maintenance-actions").json()["items"]
        if row["source_kind"] == "workshop_equipment"
    )
    assert missing_source["source_state"] == "source_not_in_current_scope"
    assert missing_source["hazard_unresolved"] is True
    assert missing_source["source_stale"] is True


def test_manual_task_assignment_validation_reversible_closure_and_csv(tmp_path):
    client, _ = client_db(tmp_path)
    created = client.post(
        "/api/v1/maintenance-actions/manual",
        json={
            **decision(),
            "source_kind": "household",
            "title": "Replace faucet washer",
        },
    )
    assert created.status_code == 201, created.text
    sid = created.json()["source_id"]
    route = f"/api/v1/maintenance-actions/household/{sid}"
    assert (
        client.put(route, json=decision(revision=1, status="closed", reason="done")).status_code
        == 422
    )
    assert (
        client.put(route, json={**decision(revision=1), "assigned_user_id": 99999}).status_code
        == 422
    )
    assert (
        client.put(
            route, json={**decision(revision=1), "due_at": "2026-11-02T08:00:00"}
        ).status_code
        == 422
    )
    assert (
        client.put(
            route, json=decision(revision=1, status="closed", reason="Washer replaced")
        ).status_code
        == 200
    )
    assert client.put(route, json=decision(revision=2)).status_code == 200
    assert client.get("/api/v1/maintenance-actions").json()["items"][0]["status"] == "open"
    export = client.get("/api/v1/maintenance-actions/export.csv")
    assert export.status_code == 200
    assert "Replace faucet washer" in export.text
    assert "source_kind,source_id" in export.text


def test_action_board_requires_session_and_owner_mutations(tmp_path):
    client, _ = client_db(tmp_path)
    anonymous = TestClient(client.app)
    assert anonymous.get("/api/v1/maintenance-actions").status_code == 401
    assert (
        anonymous.post(
            "/api/v1/maintenance-actions/manual",
            json={
                **decision(),
                "source_kind": "household",
                "title": "House task",
            },
        ).status_code
        == 401
    )


def test_action_migration_from_build_218(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    database = tmp_path / "upgrade219.db"
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{database}")
    command.upgrade(cfg, "0028")
    command.upgrade(cfg, "head")
    engine = create_engine(f"sqlite:///{database}")
    assert "maintenance_actions" in inspect(engine).get_table_names()
