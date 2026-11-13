"""Synthetic QL-440 challenge-only shape regression.

No test in this file authenticates live host, external signer, or receiver.
"""

from copy import deepcopy

from rosevear_ai_hub.master_shell_authorization331 import (
    CHALLENGE_ONLY,
    ISSUER_DECISION,
    MASTER_DECISION,
    MASTERS_440,
    OWNER_DECISION,
    READINESS_439,
    check_ql440_prerequisite_shape,
    receipt_only_ql440,
)


def fixture():
    digest = "a" * 64
    nonce = "freshUniqueCeremonyNonce440"
    r = {
        "status": READINESS_439,
        "connection": "HOLD",
        "activationAuthorized": False,
        "incidentId": "incident440",
        "ceremonyId": "newCeremony440",
        "episodeId": "newEpisode440",
        "renewalNonce": "oldRenewalNonce439",
        "pendingReceiptDigest": digest,
        "readinessReceiptDigest": digest,
        "renewedAnchorDigest": digest,
        "independentReaderDigest": digest,
    }
    q = {
        "action": CHALLENGE_ONLY,
        "nonce": nonce,
        "incidentId": r["incidentId"],
        "ceremonyId": r["ceremonyId"],
        "episodeId": r["episodeId"],
        "pendingReceiptDigest": digest,
        "readinessReceiptDigest": digest,
        "renewedAnchorDigest": digest,
        "independentReaderDigest": digest,
    }
    host = {
        "hostMachineId": "DESKTOP-AE894KC",
        "receiverState": "OFF",
        "failClosedShutdownArmed": True,
        "offContinuitySequence": 17,
        "nonce": nonce,
        "signedDigest": "b" * 64,
    }
    independent = {
        "receiverState": "OFF",
        "offContinuitySequence": 18,
        "nonce": nonce,
        "hostOffDigest": host["signedDigest"],
        "signedDigest": "c" * 64,
    }
    masters = {
        master: {
            "masterId": master,
            "decision": MASTER_DECISION,
            "nonce": nonce,
            "receiverOffDigest": independent["signedDigest"],
        }
        for master in MASTERS_440
    }
    owners = {
        "decision": OWNER_DECISION,
        "ownerId": "owner440",
        "reviewerId": "reviewer440",
        "nonce": nonce,
    }
    issuer = {
        "action": ISSUER_DECISION,
        "hostMachineId": "DESKTOP-AE894KC",
        "nonce": nonce,
    }
    return [r, q, host, independent, masters, owners, issuer]


def evaluate(case):
    result = check_ql440_prerequisite_shape(*case)
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert result["ceremonyAuthorizationIssued"] is False
    assert result["slaveGate"] == "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
    return result


def test_even_valid_shape_is_not_cryptographic_authority():
    assert evaluate(fixture())["reason"] == "HOLD_QL440_SIGNATURES_AND_ONE_USE_CUSTODY_NOT_YET_VERIFIED"


def test_restart_issuance_receipt_never_proves_current_off():
    result = receipt_only_ql440()
    assert result["connection"] == "HOLD"
    assert result["ceremonyAuthorizationIssued"] is False
    assert "NEW_OFF_AND_OWNER_CHALLENGE_REQUIRED" in result["reason"]


def test_missing_prior_readiness_is_held():
    case = fixture()
    case[0]["status"] = "DURABLE_QL438_OWNER_GATED_LEASE_EXCEPTION_CLOSURE_READBACK"
    assert evaluate(case)["reason"] == "HOLD_QL439_READINESS_NOT_EXTERNALLY_VERIFIED"


def test_replayed_nonce_is_held():
    case = fixture()
    case[1]["nonce"] = case[0]["renewalNonce"]
    assert evaluate(case)["reason"] == "HOLD_QL440_REPLAYED_RENEWAL_NONCE"


def test_prior_receipt_drift_is_held():
    case = fixture()
    case[1]["readinessReceiptDigest"] = "f" * 64
    assert evaluate(case)["reason"] == "HOLD_QL440_PRIOR_CUSTODY_DRIFT"


def test_templar_and_receiver_on_are_held():
    for field, value in (("hostMachineId", "TEMPLAR"), ("receiverState", "ON"), ("failClosedShutdownArmed", False)):
        case = fixture()
        case[2][field] = value
        assert not evaluate(case)["accepted"]


def test_independent_off_missing_or_sequence_rollback_is_held():
    for field, value in (("receiverState", "ON"), ("offContinuitySequence", 16), ("hostOffDigest", "f" * 64)):
        case = fixture()
        case[3][field] = value
        assert not evaluate(case)["accepted"]


def test_duplicate_or_broadened_master_is_held():
    case = fixture()
    del case[4]["ai-data-platform"]
    assert evaluate(case)["reason"] == "HOLD_QL440_THREE_MASTER_REPORTS_MISSING"
    case = fixture()
    case[4]["rosevear-comms-hub"]["decision"] = "RECEIVER_ON_APPROVED"
    assert evaluate(case)["reason"] == "HOLD_QL440_MASTER_PREREQUISITE_INVALID"


def test_broadened_owner_or_original_host_issuer_is_held():
    case = fixture()
    case[5]["decision"] = "ACTIVATE_RECEIVER"
    assert evaluate(case)["reason"] == "HOLD_QL440_DUAL_OWNER_DECISION_INVALID"
    case = fixture()
    case[6]["action"] = "ENABLE_RECEIVER"
    assert evaluate(case)["reason"] == "HOLD_QL440_NARROW_ISSUER_ACTION_REQUIRED"


def test_no_mutation_of_supplied_evidence():
    case = fixture()
    prior = deepcopy(case)
    evaluate(case)
    assert case == prior
