"""Synthetic QL-441 read-only safety boundary regressions.

These are unsigned data only; success never represents live ON/GO.
"""

from copy import deepcopy

from rosevear_ai_hub.master_shell_witness332 import (
    GO,
    MASTERS,
    NO_GO,
    OWNER_GO,
    OWNER_NO_GO,
    OWNER_ON_ACTION,
    QL440_STATUS,
    inspect_ql441_unsigned,
    read_private_ql441_decision,
)


def fixture():
    nonce = "fresh_ql441_observation_challenge"
    challenge_id = "challenge332"
    prior = {
        "status": QL440_STATUS,
        "connection": "HOLD",
        "activationAuthorized": False,
        "ceremonyId": "ceremony332",
        "episodeId": "episode332",
        "ceremonyNonce": "old_ql440_nonce",
    }
    challenge = {
        "challengeId": challenge_id,
        "nonce": nonce,
        "leaseId": "lease332",
        "ceremonyId": "ceremony332",
        "episodeId": "episode332",
        "issuedAtMs": 1_000_000,
        "leaseExpiresAtMs": 1_060_000,
    }
    source_owner = {
        "ownerId": "owner_a",
        "action": OWNER_ON_ACTION,
        "challengeId": challenge_id,
        "nonce": nonce,
    }
    master_owner = {
        "ownerId": "owner_b",
        "action": OWNER_ON_ACTION,
        "challengeId": challenge_id,
        "nonce": nonce,
    }
    consumption = {
        "hostMachineId": "DESKTOP-AE894KC",
        "watchdogArmed": True,
        "challengeId": challenge_id,
        "nonce": nonce,
    }
    host = {
        "receiverState": "ON",
        "watchdogArmed": True,
        "sequence": 5,
        "signedDigest": "a" * 64,
    }
    receiver = {
        "receiverState": "ON",
        "sequence": 6,
        "hostOnDigest": "a" * 64,
        "signedDigest": "b" * 64,
    }
    masters = {
        name: {
            "masterId": name,
            "decision": GO,
            "challengeId": challenge_id,
            "independentOnDigest": "b" * 64,
        }
        for name in MASTERS
    }
    final = {"action": OWNER_GO, "challengeId": challenge_id}
    return [prior, challenge, source_owner, master_owner,
            consumption, host, receiver, masters, final]


def check(case, now=1_030_000):
    response = inspect_ql441_unsigned(*case, now_ms=now)
    assert response["connection"] == "HOLD"
    assert response["activationAuthorized"] is False
    assert response["manualReceiverIsolationRequired"] is True
    assert response["accepted"] is False
    assert response["receiver"] == "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION"
    return response


def test_valid_shape_never_grants_go_or_activation():
    assert "NOT_VERIFIED" in check(fixture())["reason"]


def test_master_veto_requires_no_go_owner_action_but_still_hold():
    case = fixture()
    case[7]["ai-data-platform"]["decision"] = NO_GO
    assert check(case)["reason"] == "HOLD_QL441_FINAL_OWNER_REVIEW_INVALID"
    case[8]["action"] = OWNER_NO_GO
    assert "NOT_VERIFIED" in check(case)["reason"]


def test_predecessor_required():
    case = fixture()
    case[0]["status"] = "DURABLE_QL439_NEW_CEREMONY_REENTRY_READINESS_ONLY"
    assert check(case)["reason"] == "HOLD_QL440_PROTECTED_ISSUANCE_NOT_VERIFIED"


def test_bounded_lease_rejects_expiry_and_overlong():
    case = fixture()
    assert check(case, now=1_060_000)["reason"] == "HOLD_QL441_LEASE_NOT_CURRENT_OR_TOO_LONG"
    case[1]["leaseExpiresAtMs"] = 1_120_001
    assert check(case)["reason"] == "HOLD_QL441_LEASE_NOT_CURRENT_OR_TOO_LONG"


def test_replay_and_wrong_host_rejected():
    case = fixture()
    case[1]["nonce"] = case[0]["ceremonyNonce"]
    assert check(case)["reason"] == "HOLD_QL441_REPLAYED_NONCE"
    case = fixture()
    case[4]["hostMachineId"] = "TEMPLAR"
    assert check(case)["reason"] == "HOLD_QL441_ORIGINAL_HOST_CONSUMPTION_INVALID"


def test_colluding_owners_rejected():
    case = fixture()
    case[3]["ownerId"] = case[2]["ownerId"]
    assert check(case)["reason"] == "HOLD_QL441_OWNER_IDENTITIES_NOT_DISTINCT"


def test_independent_on_witness_invalid_or_missing():
    case = fixture()
    case[6]["sequence"] = 4
    assert check(case)["reason"] == "HOLD_QL441_INDEPENDENT_ON_BINDING_INVALID"
    case = fixture()
    case[6]["receiverState"] = "OFF"
    assert check(case)["reason"] == "HOLD_QL441_INDEPENDENT_ON_BINDING_INVALID"


def test_missing_or_broadened_master_rejected():
    case = fixture()
    del case[7]["rosevear-comms-hub"]
    assert check(case)["reason"] == "HOLD_QL441_THREE_MASTER_DECISIONS_REQUIRED"
    case = fixture()
    case[7]["ai-data-platform"]["decision"] = "PERMANENT_CONNECT"
    assert check(case)["reason"] == "HOLD_QL441_MASTER_REPORT_INVALID"


def test_private_receipt_not_live_receiver_status():
    result = read_private_ql441_decision()
    assert result["connection"] == "HOLD"
    assert result["accepted"] is False
    assert "FRESH_OFF_AND_LEASE_CLOSEOUT_REQUIRED" in result["reason"]


def test_does_not_mutate_supplied_evidence():
    case = fixture()
    saved = deepcopy(case)
    check(case)
    assert saved == case
