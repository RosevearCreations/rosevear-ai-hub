"""Build 323: synthetic Ed25519 external incident recovery and one-use review."""

import sqlite3

from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _utc
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_acceptance322 import reconcile_ql431_incident322
from rosevear_ai_hub.master_shell_acceptance323 import (
    ACTION,
    ANCHOR,
    HOST,
    MASTER,
    OWNER,
    READER,
    RECEIVER,
    ProtectedRecoveryReviewJournal323,
    reconcile_master_evidence323,
    review_ql432_recovery323,
)
from test_master_shell_acceptance322 import (
    ACCEPTED,
    MASTERS,
    NOW,
    SCOPE,
    Ree,
    bootstrap,
    dual,
    heartbeats,
    incident_acceptance,
    observe,
    signed,
    signer,
)


def fixture(monkeypatch, tmp_path):
    case = bootstrap(monkeypatch, tmp_path)
    incident = "recoveryIncident322Original"
    assert observe(
        case, "healthObservation322A", incident,
        heartbeats(case, forged=True)
    )["state"] == "DURABLE_SIGNED_FAIL_CLOSED_SHUTDOWN"
    reports, approval, args = incident_acceptance(case, incident)
    assert reconcile_ql431_incident322(
        Ree(), SCOPE, incident, reports, approval, **args
    )["accepted"]
    checkpoint = case["journal"].read(Ree(), SCOPE)
    keys = {
        k: signer() for k in (
            "anchor", "reader", "host", "receiver", "owner", "reviewer", *MASTERS
        )
    }
    anchor_id = "externalAnchorOriginal323"
    nonce = "freshOneUseChallenge323"
    export = {
        "schema": "rosevear.ai-hub.ql432.incident-export.v1",
        "scope": SCOPE, "ql430AcceptedDigest": ACCEPTED,
        "incidentId": incident,
        "checkpointIndex": checkpoint["index"],
        "checkpointDigest": checkpoint["recordDigest"],
        "receiverOffDigest": checkpoint["entry"]["receiverOffDigest"],
        "anchorId": anchor_id, "challengeNonce": nonce, "preparedAt": _utc(NOW)
    }
    a = {
        "schema": ANCHOR, "anchorId": anchor_id, "challengeNonce": nonce,
        "exportDigest": _digest(export), "scope": SCOPE,
        "incidentId": incident, "checkpointIndex": checkpoint["index"],
        "checkpointDigest": checkpoint["recordDigest"],
        "receiverOffDigest": checkpoint["entry"]["receiverOffDigest"],
        "status": "EXTERNALLY_ANCHORED_IMMUTABLE_CHECKPOINT",
        "anchoredAt": _utc(NOW),
    }
    r = {
        "schema": READER, "anchorId": anchor_id, "challengeNonce": nonce,
        "exportDigest": _digest(export), "anchorDigest": _digest(a),
        "checkpointDigest": checkpoint["recordDigest"],
        "status": "INDEPENDENT_EXTERNAL_CHECKPOINT_READBACK_MATCHED",
        "readAt": _utc(NOW),
    }
    h = {
        "schema": HOST, "scope": SCOPE, "incidentId": incident,
        "challengeNonce": nonce, "readbackDigest": _digest(r),
        "hostMachineId": "DESKTOP-AE894KC", "receiverState": "OFF",
        "observedAt": _utc(NOW),
    }
    off = {
        "schema": RECEIVER, "scope": SCOPE, "incidentId": incident,
        "challengeNonce": nonce, "hostEvidenceDigest": _digest(h),
        "readbackDigest": _digest(r), "receiverState": "OFF",
        "observedAt": _utc(NOW),
    }
    masters = {}
    for m in MASTERS:
        masters[m] = signed(keys[m], {
            "schema": MASTER, "masterId": m, "scope": SCOPE,
            "incidentId": incident,
            "checkpointDigest": checkpoint["recordDigest"],
            "readbackDigest": _digest(r),
            "receiverOffDigest": _digest(off),
            "status": "RECONCILED_OFF_NEW_CEREMONY_REQUIRED",
            "observedAt": _utc(NOW),
        })
    owner = {
        "schema": OWNER, "scope": SCOPE, "incidentId": incident,
        "checkpointDigest": checkpoint["recordDigest"],
        "readbackDigest": _digest(r),
        "receiverOffDigest": _digest(off),
        "reportsDigest": _digest([masters[m]["payload"] for m in MASTERS]),
        "action": ACTION, "ownerId": "ownerOriginal323",
        "reviewerId": "reviewerIndependent323", "reviewedAt": _utc(NOW),
    }
    review_journal = ProtectedRecoveryReviewJournal323(tmp_path / "review323.db")
    args = {
        "pilot_journal": case["params"]["pilot_journal"],
        "incident_journal": case["journal"],
        "review_journal": review_journal,
        "keys": {name: key[1:] for name, key in keys.items()},
        "read_external_anchor": lambda **_: {
            "anchor": signed(keys["anchor"], a),
            "reader": signed(keys["reader"], r),
        },
        "read_original_host_off": lambda **_: signed(keys["host"], h),
        "read_independent_receiver_off": lambda **_: signed(keys["receiver"], off),
        "attest_operator": lambda **_: True,
        "attest_fresh_nonce": lambda **_: True,
        "attest_external_custody": lambda **_: True,
        "attest_owner_custody": lambda **_: True,
        "now_ms": NOW,
    }
    return case, review_journal, keys, anchor_id, nonce, masters, dual(
        keys["owner"], keys["reviewer"], owner
    ), args


def run(case, anchor_id, nonce, masters, owner, args):
    return review_ql432_recovery323(
        Ree(), case["acceptance"], anchor_id, nonce, masters, owner, **args
    )


def test_success_stays_off_and_one_use(monkeypatch, tmp_path):
    case, journal, _, anchor_id, nonce, masters, owner, args = fixture(
        monkeypatch, tmp_path
    )
    good = run(case, anchor_id, nonce, masters, owner, args)
    assert good["accepted"]
    assert good["state"] == "DURABLE_QL432_EXTERNAL_ANCHOR_RECOVERY_OWNER_REVIEW"
    assert good["receiver"] == "OFF_VERIFIED_SIGNED_READBACK"
    assert good["connection"] == "HOLD"
    assert good["slaveGate"] == "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
    assert journal.read(Ree(), "recoveryIncident322Original")["receiptDigest"]
    assert not run(case, anchor_id, nonce, masters, owner, args).get("accepted")
    assert case["calls"]["disable"] == 1


def test_external_custody_and_signature_fail_closed(monkeypatch, tmp_path):
    case, _, keys, anchor_id, nonce, masters, owner, args = fixture(
        monkeypatch, tmp_path
    )
    denied = [
        {"attest_external_custody": None},
        {"attest_fresh_nonce": None},
        {"read_external_anchor": lambda **_: None},
        {"read_external_anchor": lambda **_: {
            "anchor": signed(signer(), {"schema": ANCHOR}),
            "reader": signed(keys["reader"], {"schema": READER}),
        }},
        {"read_original_host_off": lambda **_: {
            "payload": {"schema": HOST}, "signature": "forged"
        }},
        {"read_independent_receiver_off": lambda **_: {
            "payload": {"schema": RECEIVER}, "signature": "forged"
        }},
        {"keys": {**args["keys"], "reader": args["keys"]["anchor"]}},
    ]
    for changed in denied:
        result = run(case, anchor_id, nonce, masters, owner, {**args, **changed})
        assert result["connection"] == "HOLD"
        assert not result.get("accepted")
    assert run(case, anchor_id, nonce, {
        **masters, "ai-data-platform": masters["rosevear-comms-hub"]
    }, owner, args)["connection"] == "HOLD"
    assert run(case, anchor_id, nonce, masters, dual(
        keys["owner"], keys["reviewer"],
        {**owner["payload"], "action": "RESTART_EXISTING_RECEIVER"}
    ), args)["connection"] == "HOLD"


def test_ledger_and_terminal_chain_tamper_rejected(monkeypatch, tmp_path):
    case, journal, _, anchor_id, nonce, masters, owner, args = fixture(
        monkeypatch, tmp_path
    )
    assert run(case, anchor_id, nonce, masters, owner, args)["accepted"]
    with sqlite3.connect(journal.path) as db:
        db.execute(
            "UPDATE recovery_review323 SET receipt_digest=?",
            ("f" * 64,)
        )
    assert run(case, anchor_id, nonce, masters, owner, args)["connection"] == "HOLD"
    with sqlite3.connect(case["journal"].path) as db:
        db.execute("UPDATE continuity322 SET record_digest=? WHERE idx=1", ("f" * 64,))
    assert run(case, anchor_id, nonce, masters, owner, args)["connection"] == "HOLD"


def test_read_only_source_is_no_store_and_hold():
    assert TestClient(app).get("/api/v1/system/master-shell-323-acceptance").status_code in (
        401, 403
    )
    status = reconcile_master_evidence323(Ree())
    assert status["sourceBuild"] == 323
    assert status["receiver"] == "OFF"
    assert status["connection"] == "HOLD"
    assert status["ownerAcceptance"] == "HOLD"
