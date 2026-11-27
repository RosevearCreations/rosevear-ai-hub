"""Build 392 isolated authenticated sample-link regression, no hardware."""

import time

from rosevear_ai_hub.models import WorkshopEquipment, WorkshopJob
from test_workshop_gateway370 import prepared, signed


def test_sample_association_uses_admitted_receipt_and_revision(tmp_path, monkeypatch):
    client, sessions, key = prepared(tmp_path, monkeypatch)
    path = "/api/v1/workshop-sample-392"
    assert client.get(path).status_code in (401, 403)
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "owner-password-123"},
        ).status_code
        == 201
    )
    with sessions() as db:
        equipment = WorkshopEquipment(
            project_key="workshop",
            name="Test printer",
            equipment_type="printer",
            activity_type="3d_print",
            readiness_status="unverified",
        )
        db.add(equipment)
        db.flush()
        job = WorkshopJob(
            title="Test relief",
            category="3d_print",
            equipment_id=equipment.id,
            status="active",
            progress_percent=30,
        )
        db.add(job)
        db.commit()
        jid = job.id
    assert client.get(path).json()["receipt"] is None
    device = {
        "kind": "octoprint",
        "device_id": "controller-test",
        "label": "Test controller",
        "presence": "reported_printing",
        "proof": "octoprint_loopback",
        "progress_percent": 40.0,
    }
    assert (
        client.post(
            "/api/v1/workshop-gateway-370/receipt", json=signed(key, devices=[device])
        ).status_code
        == 202
    )
    board = client.get(path).json()
    request = {
        "job_id": jid,
        "expected_revision": 1,
        "receipt_id": board["receipt"]["receiptId"],
        "device_id": "controller-test",
        "sample_reference": "DND-TEST-001",
        "maker_association_confirmed": False,
    }
    assert client.post(path + "/link", json=request).status_code == 409
    request["maker_association_confirmed"] = True
    assert client.post(path + "/link", json={**request, "device_id": "unknown"}).status_code == 409
    response = client.post(path + "/link", json=request)
    assert response.status_code == 201, response.text
    assert response.json()["physicalFitVerified"] is False
    assert client.post(path + "/link", json=request).status_code == 409
    assert client.post(path + "/link", json={**request, "expected_revision": 2}).status_code == 409
    assert len(client.get(path).json()["links"]) == 1
    with sessions() as db:
        job = db.get(WorkshopJob, jid)
        assert job.status == "active" and job.progress_percent == 30
        assert job.revision == 2

    report = client.get(path).json()
    link_id = report["links"][0]["linkId"]
    review = {
        "job_id": jid,
        "expected_revision": 2,
        "link_id": link_id,
        "identity_checked": True,
        "condition_checked": True,
        "fit_checked": False,
        "duplicate_run_checked": True,
        "disposition": "continue_locally",
    }
    assert client.post(path + "/recovery", json=review).status_code == 409
    review["fit_checked"] = True
    result = client.post(path + "/recovery", json=review)
    assert result.status_code == 201, result.text
    assert result.json()["machineControlEnabled"] is False
    assert client.post(path + "/recovery", json=review).status_code == 409
    assert len(client.get(path).json()["recoveryReviews"]) == 1
    with sessions() as db:
        job = db.get(WorkshopJob, jid)
        assert job.status == "active" and job.progress_percent == 30
        assert job.revision == 3
    client.post("/api/v1/auth/logout")
    assert client.post(path + "/recovery", json=review).status_code in (401, 403)


def test_windows_inventory_has_no_print_progress(tmp_path, monkeypatch):
    client, _, key = prepared(tmp_path, monkeypatch)
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "owner-password-123"},
        ).status_code
        == 201
    )
    assert client.post("/api/v1/workshop-gateway-370/receipt", json=signed(key)).status_code == 202
    devices = client.get("/api/v1/workshop-sample-392").json()["receipt"]["devices"]
    assert len(devices) == 1
    assert devices[0]["deviceId"] == "COM7"
    assert devices[0]["kind"] == "serial"
    assert devices[0]["status"] == "enumerated"
    assert devices[0]["progressPercent"] is None


def test_observation_gap_is_not_physical_downtime(tmp_path, monkeypatch):
    client, _, key = prepared(tmp_path, monkeypatch)
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "owner-password-123"},
        ).status_code
        == 201
    )
    gateway = "/api/v1/workshop-gateway-370/receipt"
    path = "/api/v1/workshop-sample-392"
    now = int(time.time() * 1000)
    assert client.post(gateway, json=signed(key, observed=now - 70000)).status_code == 202
    stale = client.get(path).json()
    assert stale["receipt"]["fresh"] is False
    assert stale["observationHistory"][0]["observedGapMs"] is None
    assert client.post(gateway, json=signed(key, nonce="b" * 32, observed=now)).status_code == 202
    current = client.get(path).json()
    assert current["receipt"]["fresh"] is True
    assert current["observationHistory"][0]["observedGapMs"] == 70000
    assert len(current["observationHistory"]) == 2
    assert current["physicalFitVerified"] is False
    assert current["machineControlEnabled"] is False


def test_read_only_account_cannot_access_sample_custody(tmp_path, monkeypatch):
    client, _, key = prepared(tmp_path, monkeypatch)
    path = "/api/v1/workshop-sample-392"
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "owner-password-123"},
        ).status_code
        == 201
    )
    credentials = {"username": "sample-reader", "password": "reader-password-123"}
    assert (
        client.post(
            "/api/v1/auth/users", json={**credentials, "role": "read_only"}
        ).status_code
        == 201
    )
    assert client.post("/api/v1/workshop-gateway-370/receipt", json=signed(key)).status_code == 202
    assert client.get(path).status_code == 200
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.post("/api/v1/auth/login", json=credentials).status_code == 200
    assert client.get("/api/v1/auth/me").json()["role"] == "read_only"
    assert client.get(path).status_code == 403
    assert client.post(path + "/link", json={}).status_code == 403
    assert client.post(path + "/recovery", json={}).status_code == 403
