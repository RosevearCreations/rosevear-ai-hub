"""Build 377: source provenance, process freshness, owner auth and zero actuation."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import (
    WorkshopEquipment,
    WorkshopGatewayReceipt370,
    WorkshopJob,
    WorkshopMaintenancePlan,
    WorkshopProcessReading377,
)


def setup(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'workshop377.db'}")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    app = create_app()

    def override():
        with factory() as session:
            yield session

    app.dependency_overrides[get_session] = override
    client = TestClient(app)
    assert client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "owner-password-123"},
    ).status_code == 201
    with factory() as db:
        item = WorkshopEquipment(
            project_key="workshop", name="Laser engraving station",
            equipment_type="laser", activity_type="laser",
            readiness_status="unverified",
        )
        db.add(item)
        db.flush()
        machine_id = item.id
        db.add(WorkshopJob(
            title="Owner sample engraving", category="laser", equipment_id=machine_id,
            status="planned", progress_percent=25,
        ))
        db.add(WorkshopMaintenancePlan(
            equipment_id=machine_id, interval_days=30, reminder_days=3,
            next_due_at=datetime.now(UTC) - timedelta(days=1),
        ))
        db.commit()
    return client, factory, machine_id


def report(machine_id, **overrides):
    fields = {
        "equipment_id": machine_id,
        "operating_state": "active_reported",
        "ventilation": "off_reported",
        "progress_percent": 35.0,
        "temperature_c": 25.3,
        "note": "Owner-reported only",
        "observed_at": datetime.now(UTC).isoformat(),
    }
    return {**fields, **overrides}


def test_source_separation_freshness_and_no_actuation(tmp_path):
    client, factory, machine_id = setup(tmp_path)
    path = "/api/v1/workshop-process-377"
    baseline = client.get(path + "/board")
    assert baseline.status_code == 200, baseline.text
    assert baseline.headers["Cache-Control"] == "no-store"
    before = baseline.json()
    assert before["machineCommandsEnabled"] is False
    assert before["fieldSafetyAccepted"] is False
    assert before["equipment"][0]["reading"] is None
    assert "NO_PROCESS_READING" in before["equipment"][0]["attention"]

    saved = client.post(path + "/observations", json=report(machine_id))
    assert saved.status_code == 201, saved.text
    assert saved.json()["source"] == "OWNER_MANUAL_UNVERIFIED"
    assert saved.json()["safetyCertified"] is False
    board = client.get(path + "/board").json()
    item = board["equipment"][0]
    assert item["readingFresh"] is True
    assert item["activeJobCount"] == 1
    assert item["jobs"][0]["source"] == "OWNER_JOB_RECORD_NOT_MACHINE_TELEMETRY"
    assert "MAINTENANCE_DUE" in item["attention"]
    assert "VENTILATION_REPORTED_OFF_REVIEW" in item["attention"]
    assert item["machineControlEnabled"] is False
    assert client.get(path + f"/observations/{machine_id}").json()["readings"][0]["id"]

    with factory() as db:
        rows = db.query(WorkshopProcessReading377).all()
        assert len(rows) == 1
        rows[0].observed_at = datetime.now(UTC) - timedelta(hours=2)
        db.commit()
    stale = client.get(path + "/board").json()["equipment"][0]
    assert stale["readingFresh"] is False
    assert "STALE_OR_FUTURE_MANUAL_READING" in stale["attention"]


def test_signed_receipt_stays_unbound_to_machine(tmp_path):
    client, factory, machine_id = setup(tmp_path)
    now = datetime.now(UTC)
    ms = int(now.timestamp() * 1000)
    with factory() as db:
        db.add(WorkshopGatewayReceipt370(
            collector_id="printerpc", nonce="a" * 32,
            observed_at_ms=ms - 1000, expires_at_ms=ms + 50000,
            received_at=now, payload_json=json.dumps({
                "devices": [{
                    "kind": "octoprint", "proof": "octoprint_loopback",
                    "label": "Printer local controller", "presence": "reported_printing",
                    "progress_percent": 42.0,
                }]
            }),
        ))
        db.commit()
    board = client.get("/api/v1/workshop-process-377/board").json()
    assert board["equipment"][0]["reading"] is None
    signed = board["signedCollectors"][0]
    assert signed["fresh"] is True
    assert signed["boundToWorkshopEquipment"] is False
    assert signed["physicalIdentityVerified"] is False
    assert signed["devices"][0]["progressPercent"] == 42.0


def test_invalid_or_missing_source_cannot_be_laundered(tmp_path):
    client, _, machine_id = setup(tmp_path)
    path = "/api/v1/workshop-process-377/observations"
    cases = [
        report(machine_id, equipment_id=99999),
        report(machine_id, progress_percent=101),
        report(machine_id, temperature_c=2000),
        report(machine_id, observed_at=datetime.now(UTC).replace(tzinfo=None).isoformat()),
        report(machine_id, observed_at=(datetime.now(UTC) + timedelta(days=1)).isoformat()),
        report(machine_id, note="bad\\nheader"),
        report(machine_id, operating_state="unknown", ventilation="unknown",
               progress_percent=None, temperature_c=None, note=""),
    ]
    expected = [404, 422, 422, 422, 422, 422, 422]
    for payload, status in zip(cases, expected, strict=True):
        response = client.post(path, json=payload)
        assert response.status_code == status, response.text


def test_owner_login_required_and_body_is_strict(tmp_path):
    client, _, machine_id = setup(tmp_path)
    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/workshop-process-377/board").status_code in (401, 403)
    assert client.post(
        "/api/v1/workshop-process-377/observations", json=report(machine_id)
    ).status_code in (401, 403)
