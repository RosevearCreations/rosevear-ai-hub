"""Build 392 isolated authenticated sample-link regression, no hardware."""

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
