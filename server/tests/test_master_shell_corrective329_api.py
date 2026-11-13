"""Build 329 API: anonymous clients cannot inspect corrective custody."""

from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance329 import reconcile_master_evidence329


def test_ql438_owner_endpoint_requires_authentication():
    response = TestClient(app).get("/api/v1/system/master-shell-329-acceptance")
    assert response.status_code in (401, 403)


def test_ql438_owner_projection_cannot_claim_live_state():
    status = reconcile_master_evidence329(None)
    assert status["connection"] == "HOLD"
    assert status["activationAuthorized"] is False
    assert status["receiver"] == "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION"
    assert status["ql438PrivateClosure"] == "HOLD_NO_DURABLE_ORIGINAL_HOST_CLOSED_READBACK"
    assert status["incidentClosureAuthorized"] is False
