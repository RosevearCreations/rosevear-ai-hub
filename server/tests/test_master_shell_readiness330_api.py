"""Build 330 owner status is private, cache-disabled and never live OFF."""

from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_readiness330 import hold439


def test_ql439_owner_readback_is_not_public():
    response = TestClient(app).get("/api/v1/system/master-shell-330-readiness")
    assert response.status_code in (401, 403)


def test_no_source_readback_cannot_claim_activation():
    state = hold439("QL439_DURABLE_PRIVATE_READINESS_FRESH_OFF_RECHECK_REQUIRED")
    assert state["accepted"] is False
    assert state["connection"] == "HOLD"
    assert state["activationAuthorized"] is False
    assert state["receiver"] == "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION"
    assert state["manualReceiverIsolationRequired"] is True
