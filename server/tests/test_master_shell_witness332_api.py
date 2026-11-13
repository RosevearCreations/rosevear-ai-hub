"""Build 332 owner status is private read-only, never receiver ON authority."""

from fastapi import Response
from fastapi.testclient import TestClient

from rosevear_ai_hub.api.master_shell_witness332 import read_ql441_owner_status
from rosevear_ai_hub.main import app


def test_ql441_read_only_status_rejects_anonymous_requests():
    client = TestClient(app)
    path = "/api/v1/system/master-shell-332-witness"
    assert client.get(path).status_code in (401, 403)
    assert client.post(path).status_code in (401, 403, 405)
    assert client.put(path).status_code in (401, 403, 405)


def test_ql441_owner_projection_cannot_claim_live_on_off_or_connected():
    response = Response()
    status = read_ql441_owner_status(response, None)
    assert status["sourceBuild"] == 332
    assert status["connection"] == "HOLD"
    assert status["activationAuthorized"] is False
    assert status["decision"] == "UNVERIFIED_HOLD"
    assert status["receiver"] == "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION"
    assert status["privateDecisionPresent"] is False
    assert status["manualReceiverIsolationRequired"] is True
    assert status["leaseExpiresAt"] is None
    assert response.headers["Cache-Control"] == "no-store, max-age=0"
    assert response.headers["Pragma"] == "no-cache"
