"""Synthetic advisory regressions; no network calls or physical incident claims."""

import pytest
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.runtime_resilience391 import forecast391

NOW = 1800000000000


def test_correlates_without_claiming_cause_or_execution():
    report = {
        "independentThreeMasterAcceptance": False,
        "remoteRecoveryExecuted": False,
        "receiverActivationAuthorized": False,
        "sources": [
            {
                "source": "rosevear-ai-hub",
                "status": "OPEN_DEPLOYMENT_DRIFT",
                "observedAtMs": NOW - 1000,
            },
            {
                "source": "ai-data-platform",
                "status": "OPEN_REPORTED_UNHEALTHY",
                "observedAtMs": NOW - 2000,
            },
            {
                "source": "rosevear-comms-hub",
                "status": "ALIGNED_SOURCE_REPORTED",
                "observedAtMs": NOW - 500000,
            },
        ],
    }
    result = forecast391(report, now_ms=NOW)
    assert len(result["temporalIncidentPairs"]) == 1
    assert result["sources"][2]["priority"] == "FRESHNESS_EXPIRING"
    assert not result["sharedRootCauseVerified"]
    assert not result["recoveryExecutionAuthorized"]
    assert not result["independentOperationalResilienceVerified"]
    report["sources"][0]["observedAtMs"] = NOW + 1
    with pytest.raises(ValueError, match="INVALID_OBSERVATION"):
        forecast391(report, now_ms=NOW)


def test_resilience_requires_owner():
    client = TestClient(app)
    assert client.get("/api/v1/system/runtime-resilience-391").status_code in (401, 403)
