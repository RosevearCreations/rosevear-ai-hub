"""Build 324 — synthetic QL-433 signed precheck, replay and fail-closed tests."""

import sqlite3

from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _utc
from rosevear_ai_hub.master_shell_acceptance316 import CONTROLLER380_MAIN
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_acceptance324 import (
    ANCHOR,
    EXPORT,
    HOST,
    MASTER,
    OWNER,
    OWNER_ACTION,
    PRECHECK_ACTION,
    READER,
    RECEIVER,
    SOURCE323_MAIN,
    ProtectedNewCeremonyJournal324,
    reconcile_master_evidence324,
    run_ql433_new_ceremony_precheck324,
)
from test_master_shell_acceptance322 import MASTERS, NOW, SCOPE, Ree, dual, signed, signer
from test_master_shell_acceptance323 import fixture as ql432_fixture
from test_master_shell_acceptance323 import run as ql432_run

NEW_CEREMONY = "freshOriginalCeremony324"
NEW_EPISODE = "freshOriginalEpisode324"
EXPORT_ID = "isolatedRecoveryExport324"
CHALLENGE = "freshIndependentChallenge324"


def fixture(monkeypatch, tmp_path):
    old = ql432_fixture(monkeypatch, tmp_path)
    case, prior_journal, _, anchor_id, nonce, prior_masters, prior_owner, old_args = old
    decision = ql432_run(case, anchor_id, nonce, prior_masters, prior_owner, old_args)
    assert decision["accepted"] and decision["connection"] == "HOLD"
    checkpoint = case["journal"].read(Ree(), SCOPE)
    fresh = {role: signer() for role in (
        "anchor", "reader", "host", "receiver", "owner", "reviewer", *MASTERS
    )}
    export = {
        "schema": EXPORT,
        "scope": SCOPE,
        "incidentId": decision["incidentId"],
        "ql431CheckpointIndex": checkpoint["index"],
        "ql431CheckpointDigest": checkpoint["recordDigest"],
        "ql432OwnerReviewReceiptDigest": decision["reviewReceiptDigest"],
        "ql432ExternalAnchorDigest": decision["externalAnchorDigest"],
        "ql432IndependentReadbackDigest": decision["externalReadbackDigest"],
        "exportId": EXPORT_ID,
        "challengeNonce": CHALLENGE,
        "nextCeremonyId": NEW_CEREMONY,
        "nextEpisodeId": NEW_EPISODE,
        "nextSourceRevision": SOURCE323_MAIN,
        "nextControllerRevision": CONTROLLER380_MAIN,
        "nextHostId": "DESKTOP-AE894KC",
        "action": PRECHECK_ACTION,
        "preparedAt": _utc(NOW),
    }
    anchor = {
        "schema": ANCHOR,
        "exportId": EXPORT_ID,
        "challengeNonce": CHALLENGE,
        "exportDigest": _digest(export),
        "ql431CheckpointDigest": checkpoint["recordDigest"],
        "ql432OwnerReviewReceiptDigest": decision["reviewReceiptDigest"],
        "nextCeremonyId": NEW_CEREMONY,
        "nextEpisodeId": NEW_EPISODE,
        "status": "EXTERNAL_IMMUTABLE_DECISION_EXPORT_ANCHORED",
        "anchoredAt": _utc(NOW),
    }
    reader = {
        "schema": READER,
        "exportId": EXPORT_ID,
        "challengeNonce": CHALLENGE,
        "exportDigest": _digest(export),
        "anchorDigest": _digest(anchor),
        "status": "INDEPENDENT_EXACT_DECISION_EXPORT_READBACK",
        "readAt": _utc(NOW),
    }
    host = {
        "schema": HOST,
        "scope": SCOPE,
        "incidentId": decision["incidentId"],
        "exportId": EXPORT_ID,
        "challengeNonce": CHALLENGE,
        "nextCeremonyId": NEW_CEREMONY,
        "nextEpisodeId": NEW_EPISODE,
        "externalDecisionAnchorDigest": _digest(anchor),
        "independentReadbackDigest": _digest(reader),
        "hostMachineId": "DESKTOP-AE894KC",
        "receiverState": "OFF",
        "observedAt": _utc(NOW),
    }
    receiver = {
        "schema": RECEIVER,
        "scope": SCOPE,
        "incidentId": decision["incidentId"],
        "exportId": EXPORT_ID,
        "challengeNonce": CHALLENGE,
        "hostEvidenceDigest": _digest(host),
        "decisionReadbackDigest": _digest(reader),
        "receiverState": "OFF",
        "observedAt": _utc(NOW),
    }
    reports = {}
    for master in MASTERS:
        reports[master] = signed(fresh[master], {
            "schema": MASTER,
            "masterId": master,
            "scope": SCOPE,
            "incidentId": decision["incidentId"],
            "ql432OwnerReviewReceiptDigest": decision["reviewReceiptDigest"],
            "externalDecisionReadbackDigest": _digest(reader),
            "receiverOffDigest": _digest(receiver),
            "nextCeremonyId": NEW_CEREMONY,
            "nextEpisodeId": NEW_EPISODE,
            "status": "NEW_CEREMONY_PRECHECK_ONLY_RECEIVER_OFF",
            "observedAt": _utc(NOW),
        })
    owner = {
        "schema": OWNER,
        "scope": SCOPE,
        "incidentId": decision["incidentId"],
        "exportId": EXPORT_ID,
        "challengeNonce": CHALLENGE,
        "ql432OwnerReviewReceiptDigest": decision["reviewReceiptDigest"],
        "externalDecisionReadbackDigest": _digest(reader),
        "receiverOffDigest": _digest(receiver),
        "mastersDigest": _digest([reports[m]["payload"] for m in MASTERS]),
        "nextCeremonyId": NEW_CEREMONY,
        "nextEpisodeId": NEW_EPISODE,
        "action": OWNER_ACTION,
        "ownerId": "originalOwner324",
        "reviewerId": "independentReviewer324",
        "authorizedAt": _utc(NOW),
    }
    precheck = ProtectedNewCeremonyJournal324(tmp_path / "new_ceremony324.db")
    args = {
        "pilot_journal": case["params"]["pilot_journal"],
        "incident_journal": case["journal"],
        "review_journal": prior_journal,
        "precheck_journal": precheck,
        "keys": {name: key[1:] for name, key in fresh.items()},
        "read_external_decision_anchor": lambda **_: {
            "anchor": signed(fresh["anchor"], anchor),
            "reader": signed(fresh["reader"], reader),
        },
        "read_original_host_off": lambda **_: signed(fresh["host"], host),
        "read_independent_receiver_off": lambda **_: signed(fresh["receiver"], receiver),
        "attest_operator": lambda **_: True,
        "attest_signed_ql432_decision": lambda **_: True,
        "attest_next_scope": lambda **_: True,
        "attest_fresh_nonce": lambda **_: True,
        "attest_external_custody": lambda **_: True,
        "attest_owner_custody": lambda **_: True,
        "now_ms": NOW,
    }
    return case, decision, fresh, reports, dual(
        fresh["owner"], fresh["reviewer"], owner
    ), args, precheck


def run(case, decision, reports, owner, args, **params):
    return run_ql433_new_ceremony_precheck324(
        Ree(),
        case["acceptance"],
        decision,
        params.get("export_id", EXPORT_ID),
        params.get("challenge_nonce", CHALLENGE),
        params.get("next_ceremony_id", NEW_CEREMONY),
        params.get("next_episode_id", NEW_EPISODE),
        reports,
        owner,
        **args,
    )


def test_owner_precheck_succeeds_but_never_activates(monkeypatch, tmp_path):
    case, decision, _, reports, owner, args, journal = fixture(monkeypatch, tmp_path)
    accepted = run(case, decision, reports, owner, args)
    assert accepted["accepted"]
    assert accepted["state"] == "DURABLE_QL433_NEW_CEREMONY_PRECHECK_ONLY"
    assert accepted["receiver"] == "OFF_VERIFIED_SIGNED_READBACK"
    assert accepted["connection"] == "HOLD"
    assert accepted["slaveGate"] == "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
    assert accepted["nextCeremonyId"] != SCOPE["ceremonyId"]
    assert accepted["nextEpisodeId"] != SCOPE["episodeId"]
    assert journal.read(Ree(), decision["incidentId"])["receiptDigest"]
    assert not run(case, decision, reports, owner, args).get("accepted")
    assert case["calls"]["disable"] == 1


def test_fail_closed_missing_custody_and_incorrect_signers(monkeypatch, tmp_path):
    case, decision, fresh, reports, owner, args, _ = fixture(monkeypatch, tmp_path)
    failures = [
        {"attest_operator": None},
        {"attest_signed_ql432_decision": None},
        {"attest_fresh_nonce": None},
        {"attest_external_custody": None},
        {"read_external_decision_anchor": lambda **_: None},
        {"read_external_decision_anchor": lambda **_: {
            "anchor": signed(signer(), {"schema": ANCHOR}),
            "reader": signed(fresh["reader"], {"schema": READER}),
        }},
        {"read_original_host_off": lambda **_: signed(
            fresh["host"], {"schema": HOST, "hostMachineId": "TEMPLAR"}
        )},
        {"read_independent_receiver_off": lambda **_: signed(
            fresh["receiver"], {"schema": RECEIVER, "receiverState": "ISOLATED_ONE_TEST_ON"}
        )},
        {"keys": {**args["keys"], "reader": args["keys"]["anchor"]}},
    ]
    for changed in failures:
        failed = run(case, decision, reports, owner, {**args, **changed})
        assert failed["connection"] == "HOLD"
        assert not failed.get("accepted")
    wrong_reports = {
        **reports, "ai-data-platform": reports["rosevear-comms-hub"]
    }
    assert not run(case, decision, wrong_reports, owner, args).get("accepted")
    wrong_owner = dual(
        fresh["owner"], fresh["reviewer"],
        {**owner["payload"], "action": "ENABLE_RECEIVER"}
    )
    assert not run(case, decision, reports, wrong_owner, args).get("accepted")
    assert not run(
        case, {**decision, "reviewReceiptDigest": "f" * 64}, reports, owner, args
    ).get("accepted")
    assert not run(
        case, decision, reports, owner, args,
        next_ceremony_id=SCOPE["ceremonyId"]
    ).get("accepted")


def test_local_receipts_and_terminal_chain_fail_closed_when_tampered(monkeypatch, tmp_path):
    case, decision, _, reports, owner, args, precheck = fixture(monkeypatch, tmp_path)
    assert run(case, decision, reports, owner, args)["accepted"]
    with sqlite3.connect(precheck.path) as db:
        db.execute("UPDATE new_ceremony324 SET receipt_digest=?", ("f" * 64,))
    assert not run(case, decision, reports, owner, args).get("accepted")
    with sqlite3.connect(case["journal"].path) as db:
        db.execute("UPDATE continuity322 SET record_digest=? WHERE idx=1", ("f" * 64,))
    assert not run(case, decision, reports, owner, args).get("accepted")


def test_source_only_owner_status_is_not_a_live_receiver():
    assert TestClient(app).get("/api/v1/system/master-shell-324-acceptance").status_code in (
        401,
        403,
    )
    source = reconcile_master_evidence324(Ree())
    assert source["sourceBuild"] == 324
    assert source["receiver"] == "OFF"
    assert source["connection"] == "HOLD"
    assert source["ownerAcceptance"] == "HOLD"
