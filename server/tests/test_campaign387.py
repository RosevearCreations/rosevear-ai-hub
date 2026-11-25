"""Build387 campaign contract: role, real source honesty and no fabricated certification."""

from fastapi.testclient import TestClient

from rosevear_ai_hub.campaign387 import (
    GATES387,
    MODULE_IDS387,
    SCHEMA387,
    campaign_snapshot387,
)
from rosevear_ai_hub.main import app


def test_campaign_all_fourteen_original_household_master_proofs_hold():
    sample = campaign_snapshot387(now_ms=1800000000000, original_host=False)
    assert sample["schema"] == SCHEMA387
    assert sample["gateCount"] == len(GATES387) == 14
    assert sample["trackedModuleCount"] == len(MODULE_IDS387) == 24
    assert sample["fieldCertifiedModuleCount"] == 0
    assert all(m["fieldStatus"].startswith("HOLD") for m in sample["modules"])
    assert sample["status"] == "HOLD_NO_ORIGINAL_WINDOWS_CONTEXT"
    assert sample["runtimeSampleAvailable"] is False
    assert sample["fieldCertifiedCount"] == 0
    assert sample["osBootLocallyReportedMs"] is None
    assert sample["apiProcessUptimeObservedSeconds"] is None
    assert sample["localLanInterfacesReportedUp"] is None
    assert sample["independentOriginalHostWitnessVerified"] is False
    assert sample["realHouseholdDeviceEndToEndVerified"] is False
    assert sample["realPrinterJobMonitored"] is False
    assert sample["realCameraStreamVerified"] is False
    assert sample["safeAutomationPhysicalExecutionVerified"] is False
    assert sample["sevenSourceReceiptClosureVerified"] is False
    assert sample["independentThreeMasterAckVerified"] is False
    assert sample["offMachineRestoreIndependentlyVerified"] is False
    assert sample["preLoginRemoteAccessIndependentlyVerified"] is False
    assert sample["otherMasterApplicationsModified"] is False
    assert sample["privateCommsReceiverActivationAuthorized"] is False
    assert sample["productionGreenMayBeConcludedFromOwnerReports"] is False
    assert sample["sourceReleaseAndFieldAcceptanceIndependent"] is True
    assert sample["backgroundNetworkOrDeviceProbesPerformed"] == 0
    assert sample["windowsServicesRestarted"] == 0
    assert sample["externalRequestsPerformed"] == 0
    assert [x["id"] for x in sample["gates"]] == [x[0] for x in GATES387]
    assert len(set(x["id"] for x in sample["gates"])) == 14
    assert all(
        x["fieldStatus"] == "HOLD_INDEPENDENT_EVIDENCE_MISSING"
        and x["sourceVerified"] is False
        and x["ownerReportIsSignedEvidence"] is False
        and x["unsafeActuationAuthorized"] is False
        and x["requiredIndependentEvidence"]
        and x["operatorProcedure"]
        for x in sample["gates"]
    )


def test_campaign_local_process_observation_not_physical_field_proof():
    sample = campaign_snapshot387(now_ms=1800000000000, original_host=True)
    assert sample["status"] in (
        "ORIGINAL_HOST_LOCAL_CONTEXT_ONLY_FIELD_HOLD",
        "HOLD_NO_ORIGINAL_WINDOWS_CONTEXT",
    )
    assert sample["fieldCertifiedCount"] == 0
    assert sample["independentOriginalHostWitnessVerified"] is False
    assert sample["privateCommsReceiverActivationAuthorized"] is False
    assert sample["offMachineRestoreIndependentlyVerified"] is False
    assert sample["otherMasterApplicationsModified"] is False
    assert len(sample["gates"]) == 14
    assert all(x["fieldStatus"].startswith("HOLD") for x in sample["gates"])


def test_campaign_is_owner_only_and_cannot_write_or_start_services():
    # Route authorization tests must not start household background workers.
    client = TestClient(app)
    endpoint = "/api/v1/system/household-master-campaign-387"
    assert client.get(endpoint).status_code in (401, 403)
    assert client.post(endpoint, json={"certified": True}).status_code in (
        401,
        403,
        405,
    )
    assert client.put(endpoint, json={"receiver": "start"}).status_code in (
        401,
        403,
        405,
    )
