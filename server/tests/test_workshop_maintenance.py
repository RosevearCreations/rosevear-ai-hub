"""Build 145: owner-only maintenance, provenance, UTC dates, and no machine authority."""

from datetime import UTC, datetime, timedelta

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import (
    AuditEvent,
    WorkshopEquipment,
    WorkshopMaintenanceEvent,
    WorkshopMaintenancePlan,
)


def setup_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'workshop-145.db'}")
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


def equipment(client, *, project="dnd", name="Lathe"):
    response = client.post(
        "/api/v1/workshop/equipment",
        json={
            "project_key": project,
            "name": name,
            "equipment_type": "Bench machine",
            "activity_type": "cnc",
            "notes": "Manual only",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def plan_body(*, due="2025-03-09T02:30:00-05:00", revision=0, user_id=None):
    return {
        "expected_revision": revision,
        "interval_days": 30,
        "next_due_at": due,
        "assigned_user_id": user_id,
        "checklist": ["Review guards", "Check ventilation"],
        "parts_refs": ["Filter SKU 01"],
        "notes": "Owner maintenance schedule",
    }


def service_body(*, revision=1, outcome="checked", complete=True):
    return {
        "expected_revision": revision,
        "outcome": outcome,
        "note": "Visual review and documented service",
        "completed_checklist": ["Review guards", "Check ventilation"]
        if complete
        else ["Review guards"],
        "parts_used": ["Filter SKU 01"],
        "acknowledge_not_certification": True,
    }


def test_maintenance_360_search_due_calendar_and_aware_timezone(tmp_path):
    client, sessions = setup_client(tmp_path)
    first = equipment(client, name="Laser Engraver")
    second = equipment(client, project="detailing", name="Vacuum")
    base = f"/api/v1/workshop/equipment/{first}/maintenance"
    assert client.get(base).json() is None
    created = client.put(base, json=plan_body())
    assert created.status_code == 200, created.text
    assert created.json()["next_due_at"] == "2025-03-09T07:30:00+00:00"
    assert created.json()["revision"] == 1
    assert created.json()["reminder_days"] == 7
    assert client.get(base).json()["checklist"] == ["Review guards", "Check ventilation"]

    overview = client.get("/api/v1/workshop/maintenance/overview").json()
    row = next(r for r in overview["items"] if r["equipment_id"] == first)
    assert row["due_state"] == "overdue"
    assert row["is_overdue"] is True
    assert row["readiness_status"] == "unverified"
    assert "independent" in row["next_safe_check"]
    assert overview["automatic_equipment_control"] is False
    assert overview["safety_certification"] is False
    assert (
        len(client.get("/api/v1/workshop/maintenance/overview?search=Vacuum").json()["items"]) == 1
    )
    assert (
        len(
            client.get("/api/v1/workshop/maintenance/overview?project=dnd&state=overdue").json()[
                "items"
            ]
        )
        == 1
    )
    assert client.get("/api/v1/workshop/maintenance/overview?state=scheduled").json()["items"] == []

    with sessions() as db:
        assert db.get(WorkshopEquipment, first).maintenance_due_at is not None
        assert db.get(WorkshopEquipment, second).readiness_status == "unverified"
        assert db.scalar(select(WorkshopMaintenancePlan)).revision == 1

    custom = client.put(
        base, json={**plan_body(revision=1, due="2030-11-10T12:00:00Z"), "reminder_days": 30}
    )
    assert custom.status_code == 200
    assert custom.json()["reminder_days"] == 30


def test_plan_revision_validation_and_legacy_due_conflict(tmp_path):
    client, _sessions = setup_client(tmp_path)
    eid = equipment(client)
    route = f"/api/v1/workshop/equipment/{eid}/maintenance"
    invalids = [
        plan_body(due="2026-11-04T08:00:00"),  # zone unspecified
        {**plan_body(), "interval_days": 0},
        {**plan_body(), "reminder_days": 366},
        {**plan_body(), "checklist": ["Review guards", "Review guards"]},
        {**plan_body(), "parts_refs": ["", "SKU"]},
        {**plan_body(), "checklist": []},
        {**plan_body(), "assigned_user_id": 99999},
    ]
    for payload in invalids:
        assert client.put(route, json=payload).status_code == 422
    assert client.put(route, json=plan_body()).status_code == 200
    assert client.put(route, json=plan_body()).status_code == 409
    assert (
        client.patch(
            f"/api/v1/workshop/equipment/{eid}", json={"maintenance_due_at": "2026-11-04T08:00:00Z"}
        ).status_code
        == 409
    )
    updated = client.put(route, json=plan_body(revision=1, due="2026-11-04T08:00:00+00:00"))
    assert updated.status_code == 200
    assert updated.json()["revision"] == 2


def test_service_receipts_need_full_checklist_and_never_certify_machine(tmp_path):
    client, sessions = setup_client(tmp_path)
    eid = equipment(client)
    route = f"/api/v1/workshop/equipment/{eid}"
    assert client.put(route + "/maintenance", json=plan_body()).status_code == 200
    incomplete = client.post(route + "/maintenance-events", json=service_body(complete=False))
    assert incomplete.status_code == 422
    missing_ack = client.post(
        route + "/maintenance-events",
        json={
            **service_body(),
            "acknowledge_not_certification": False,
        },
    )
    assert missing_ack.status_code == 422
    assert client.get(route + "/maintenance-events").json() == []

    receipt = client.post(route + "/maintenance-events", json=service_body())
    assert receipt.status_code == 201, receipt.text
    assert receipt.json()["schedule_updated"] is True
    new_due = datetime.fromisoformat(receipt.json()["next_due_at"])
    assert timedelta(days=29, hours=23) < new_due - datetime.now(UTC) <= timedelta(days=30)
    assert client.get(route + "/maintenance").json()["revision"] == 2
    assert client.get(route + "/maintenance").json()["last_completed_at"] is not None
    assert client.get(route + "/maintenance-events").json()[0]["recorded_by_user_id"] == 1
    assert client.get("/api/v1/workshop/equipment").json()[0]["readiness_status"] == "unverified"
    assert client.post(route + "/maintenance-events", json=service_body()).status_code == 409

    with sessions() as db:
        assert db.query(WorkshopMaintenanceEvent).count() == 1
        assert (
            db.query(AuditEvent)
            .filter(AuditEvent.event_type == "workshop.maintenance.event.recorded")
            .count()
            == 1
        )


def test_unsafe_and_service_needed_hold_due_date_and_block(tmp_path):
    client, _sessions = setup_client(tmp_path)
    eid = equipment(client)
    route = f"/api/v1/workshop/equipment/{eid}"
    assert client.put(route + "/maintenance", json=plan_body()).status_code == 200
    service = client.post(
        route + "/maintenance-events", json=service_body(outcome="needs_service", complete=False)
    )
    assert service.status_code == 201
    assert service.json()["schedule_updated"] is False
    assert service.json()["previous_due_at"] == service.json()["next_due_at"]
    assert client.get("/api/v1/workshop/equipment").json()[0]["readiness_status"] == "attention"
    unsafe = client.post(
        route + "/maintenance-events",
        json=service_body(revision=2, outcome="unsafe", complete=False),
    )
    assert unsafe.status_code == 201
    assert unsafe.json()["schedule_updated"] is False
    assert (
        client.get("/api/v1/workshop/maintenance/overview").json()["items"][0]["due_state"]
        == "blocked"
    )
    checked = client.post(route + "/maintenance-events", json=service_body(revision=3))
    assert checked.status_code == 201
    assert client.get("/api/v1/workshop/equipment").json()[0]["readiness_status"] == "blocked"
    assert len(client.get(route + "/maintenance-events").json()) == 3


def test_assignments_and_read_only_role_denied(tmp_path):
    client, _sessions = setup_client(tmp_path)
    eid = equipment(client)
    u = client.post(
        "/api/v1/auth/users",
        json={"username": "assistant", "password": "family-password-123", "role": "household_user"},
    )
    assert u.status_code == 201
    assistant_id = u.json()["id"]
    route = f"/api/v1/workshop/equipment/{eid}/maintenance"
    assert client.put(route, json=plan_body(user_id=assistant_id)).status_code == 200
    assert client.get(route).json()["assigned_user_id"] == assistant_id
    viewer = client.post(
        "/api/v1/auth/users",
        json={"username": "viewer", "password": "reader-password-123", "role": "read_only"},
    )
    assert viewer.status_code == 201
    assert (
        client.put(route, json=plan_body(revision=1, user_id=viewer.json()["id"])).status_code
        == 422
    )
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "viewer", "password": "reader-password-123"},
        ).status_code
        == 200
    )
    assert client.get("/api/v1/workshop/maintenance/overview").status_code == 200
    assert client.put(route, json=plan_body(revision=1)).status_code == 403
    assert client.post(route + "-events", json=service_body()).status_code == 403


def test_migration_0026_preserves_workshop_records(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    database = tmp_path / "upgrade-145.db"
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database}")
    command.upgrade(config, "0025")
    command.upgrade(config, "head")
    engine = create_engine(f"sqlite:///{database}")
    tables = set(inspect(engine).get_table_names())
    assert {
        "workshop_equipment",
        "workshop_inspections",
        "workshop_maintenance_plans",
        "workshop_maintenance_events",
    }.issubset(tables)
    assert {"model_reference", "accessories_json"}.issubset(
        {column["name"] for column in inspect(engine).get_columns("workshop_equipment")}
    )
    assert "reminder_days" in {
        column["name"] for column in inspect(engine).get_columns("workshop_maintenance_plans")
    }


def test_build_217_manual_identity_validation_and_export_source(tmp_path):
    client, _sessions = setup_client(tmp_path)
    eid = equipment(client, name="CNC 3018")
    endpoint = f"/api/v1/workshop/equipment/{eid}"
    result = client.patch(
        endpoint,
        json={
            "model_reference": "3018 Pro",
            "accessories_json": ["Clamp kit", "Dust shoe"],
        },
    )
    assert result.status_code == 200, result.text
    assert result.json()["model_reference"] == "3018 Pro"
    assert result.json()["accessories_json"] == ["Clamp kit", "Dust shoe"]
    assert (
        client.patch(endpoint, json={"accessories_json": ["Duplicate", "Duplicate"]}).status_code
        == 422
    )
    assert client.patch(endpoint, json={"accessories_json": [""]}).status_code == 422
    overview = client.get("/api/v1/workshop/maintenance/overview").json()
    assert overview["items"][0]["model_reference"] == "3018 Pro"
    assert overview["items"][0]["accessories"] == ["Clamp kit", "Dust shoe"]
    assert overview["automatic_equipment_control"] is False
