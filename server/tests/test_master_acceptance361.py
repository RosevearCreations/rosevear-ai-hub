"""Build 361 / QL-470: original-host telemetry, source and authority gates."""

import json
from datetime import UTC, datetime

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.server_shell361 import local_acceptance361, router
from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_acceptance361 import (
    EXPECTED_SERVICES,
    EXPECTED_TASKS,
    SCHEMA,
    acceptance361,
    trusted_local_telemetry361,
)

NOW = 1_800_000_000_000
COMMIT = "a" * 40


def sample():
    boot = datetime.fromtimestamp((NOW - 3600000) / 1000, tz=UTC).isoformat().replace(
        "+00:00", "Z"
    )
    return {
        "schema": SCHEMA,
        "source": "UNSIGNED_LOCAL_INVENTORY_ONLY",
        "originalHost": "DESKTOP-AE894KC",
        "sourceCommit": COMMIT,
        "observedAtMs": NOW - 1000,
        "lastWindowsBootUtc": boot,
        "tasks": [
            {
                "name": name,
                "state": "DISABLED",
                "lastRunUtc": None,
                "lastResult": None,
                "exactTaskIdentityIndependentlyVerified": False,
            }
            for name in EXPECTED_TASKS
        ],
        "masterServices": [
            {
                "name": name,
                "state": "NOT_INSTALLED",
                "startMode": "NOT_INSTALLED",
                "signedServiceEnrollmentVerified": False,
            }
            for name in EXPECTED_SERVICES
        ],
        "recentTaskSchedulerEventIds": [],
        "guestAuthenticatedContinuityVerified": False,
        "independentPreloginWitnessVerified": False,
        "physicalAutomaticStartupVerified": False,
        "masterWorkersSignedAckVerified": False,
        "commsPrivateReceiverAuthorized": False,
        "changesMade": False,
    }


def review(sampled=None, report=None, *, host=True):
    return acceptance361(
        telemetry=sample() if sampled is None else sampled,
        field_report=report,
        now_ms=NOW,
        machine_name="DESKTOP-AE894KC" if host else "OTHER-PC",
        original_host_process=host,
        expected_commit=COMMIT,
    )


def test_local_inventory_observed_but_not_independently_verified():
    assert trusted_local_telemetry361(sample(), now_ms=NOW, expected_commit=COMMIT)
    result = review()
    assert result["localTelemetryFreshButUnsigned"]
    assert all(t["observedState"] == "DISABLED" for t in result["tasks"])
    assert not result["physicalUnattendedProductionGreen"]
    assert not result["threeMasterWorkerProductionGreen"]
    assert not result["independentSignedMasterWorkerAckVerified"]
    assert not result["commsPrivateReceiverAuthorized"]
    assert not result["webMutationAvailable"]


def test_stale_off_host_and_forged_result_never_green():
    initial = sample()
    bad = [
        {**initial, "sourceCommit": "b" * 40},
        {**initial, "observedAtMs": NOW - 120001},
        {**initial, "originalHost": "ATTACKER-PC"},
        {**initial, "physicalAutomaticStartupVerified": True},
        {**initial, "masterServices": []},
        {**initial, "tasks": [initial["tasks"][0], initial["tasks"][0]]},
        {**initial, "recentTaskSchedulerEventIds": [{"id": 9999, "utc": "2026-11-17T19:00:00Z"}]},
    ]
    for record in bad:
        assert not trusted_local_telemetry361(record, now_ms=NOW, expected_commit=COMMIT)
        report = review(record)
        assert not report["localTelemetryFreshButUnsigned"]
        assert all(s["observedState"] == "UNKNOWN" for s in report["tasks"])
    assert not review(host=False)["localTelemetryFreshButUnsigned"]


def test_signed_field_report_shape_is_not_runtime_approval():
    claims = {
        "schema": "rosevear.hub.ql469.supervised-acceptance360.v1",
        "originalHost": "DESKTOP-AE894KC",
        "sourceCommit": COMMIT,
        "changesMade": False,
        "physicalUnattendedProductionGreen": False,
        "threeMasterWorkerProductionGreen": False,
        "commsPrivateTestReceiverAuthorized": False,
        "automaticEnrollmentAuthorized": False,
        "scopeStatuses": {
            "reboot": {"status": "SIGNED_CLAIMS_CORRELATED_NOT_PHYSICAL_APPROVAL"},
            "guest": {"status": "SIGNED_CLAIM_NOT_INDEPENDENT_PHYSICAL_PROOF"},
            "ai-data-worker": {"status": "SIGNED_CLAIM_NOT_INDEPENDENT_PHYSICAL_PROOF"},
            "comms-worker": {"status": "SIGNED_CLAIM_NOT_INDEPENDENT_PHYSICAL_PROOF"},
        },
    }
    result = review(report=claims)
    assert result["fieldReportShapeOnly"]
    assert not result["authenticatedDeviceRuntimeVerified"]
    assert not result["physicalUnattendedProductionGreen"]
    claims["commsPrivateTestReceiverAuthorized"] = True
    assert not review(report=claims)["fieldReportShapeOnly"]


def test_plan_requires_separate_owner_approval_and_disabled_first():
    from pathlib import Path

    plan = json.loads(
        (Path(__file__).resolve().parents[2] / "docs/contracts/ql470-worker-enrollment361.json")
        .read_text(encoding="utf-8")
    )
    assert plan["automaticStartupAuthorized"] is False
    assert plan["automaticServiceInstall"] is False
    assert plan["ownerAndCustodianApprovalReceived"] is False
    assert plan["installerIncluded"] is False
    assert "KEEP_OFF" in plan["ql340cPrivateReceiverState"]
    assert all(module["installAuthorized"] is False for module in plan["modules"])


def test_owner_only_endpoint_no_mutations_and_off_host_hold():
    client = TestClient(app)
    url = "/api/v1/system/server-shell-361"
    assert all(route.methods == {"GET"} for route in router.routes)
    assert client.get(url).status_code in (401, 403)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(url).status_code in (401, 403, 405)
    response = local_acceptance361(now_ms=NOW, machine_name="NOT_HOST", windows_host=False)
    assert response["sourceBuild"] == 361
    assert not response["localTelemetryFreshButUnsigned"]
    assert not response["threeMasterWorkerProductionGreen"]
    assert "HOLD_NOT_ORIGINAL_WINDOWS_HOST" in response["holdCodes"]
