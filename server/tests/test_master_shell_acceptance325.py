"""Build 325 QL-434 synthetic issuer, witness, OFF readiness and replay tests."""

import sqlite3

from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _utc
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_acceptance325 import (
    EXPORT,
    HOST,
    ISSUER,
    MASTER,
    OWNER,
    OWNER_ACTION,
    PREPARE_ACTION,
    RECEIVER,
    WITNESS,
    ProtectedReadinessJournal325,
    reconcile_master_evidence325,
    run_ql434_signed_readiness325,
)
from test_master_shell_acceptance322 import MASTERS, NOW, SCOPE, Ree, dual, signed, signer
from test_master_shell_acceptance324 import fixture as ql433_fixture
from test_master_shell_acceptance324 import run as ql433_run

AUTHORITY = "independentAuthority325"
CHALLENGE = "newAuthorityChallenge325"


def fixture(monkeypatch, tmp_path):
    case, ql432, _, reports433, owner433, args433, prior = ql433_fixture(
        monkeypatch, tmp_path
    )
    precheck = ql433_run(case, ql432, reports433, owner433, args433)
    assert precheck["accepted"] and precheck["connection"] == "HOLD"
    incident = precheck["incidentId"]
    keys = {
        role: signer()
        for role in ("issuer", "witness", "host", "receiver", "owner", "reviewer", *MASTERS)
    }
    receipt432 = args433["review_journal"].read(Ree(), incident)
    checkpoint = args433["incident_journal"].read(Ree(), SCOPE)
    receipt433 = prior.read(Ree(), incident)
    export = {
        "schema": EXPORT,
        "scope": SCOPE,
        "incidentId": incident,
        "ql431CheckpointIndex": checkpoint["index"],
        "ql431CheckpointDigest": checkpoint["recordDigest"],
        "ql432OwnerReceiptDigest": receipt432["receiptDigest"],
        "ql433PrecheckReceiptDigest": receipt433["receiptDigest"],
        "ql433DecisionAnchorDigest": precheck["externalAnchorDigest"],
        "ql433IndependentReadbackDigest": precheck["independentReadbackDigest"],
        "nextCeremonyId": precheck["nextCeremonyId"],
        "nextEpisodeId": precheck["nextEpisodeId"],
        "hostMachineId": "DESKTOP-AE894KC",
        "sourceRevision": SCOPE["sourceRevision"],
        "controllerRevision": SCOPE["controllerRevision"],
        "source324Main": "1fd1f527f8c181f4077b353e34b0bcdf9c801e31",
        "authorityId": AUTHORITY,
        "challengeNonce": CHALLENGE,
        "action": PREPARE_ACTION,
        "preparedAt": _utc(NOW),
    }
    issued = {
        "schema": ISSUER,
        "authorityId": AUTHORITY,
        "challengeNonce": CHALLENGE,
        "exportDigest": _digest(export),
        "scope": SCOPE,
        "incidentId": incident,
        "ql433PrecheckReceiptDigest": receipt433["receiptDigest"],
        "nextCeremonyId": precheck["nextCeremonyId"],
        "nextEpisodeId": precheck["nextEpisodeId"],
        "status": "NEW_CEREMONY_READINESS_HANDOFF_NOT_ACTIVATION",
        "issuedAt": _utc(NOW),
    }
    witnessed = {
        "schema": WITNESS,
        "authorityId": AUTHORITY,
        "challengeNonce": CHALLENGE,
        "exportDigest": _digest(export),
        "issuerDigest": _digest(issued),
        "nextCeremonyId": precheck["nextCeremonyId"],
        "nextEpisodeId": precheck["nextEpisodeId"],
        "status": "INDEPENDENT_HANDOFF_READBACK_NO_ACTIVATION",
        "witnessedAt": _utc(NOW),
    }
    host = {
        "schema": HOST,
        "hostMachineId": "DESKTOP-AE894KC",
        "scope": SCOPE,
        "incidentId": incident,
        "authorityId": AUTHORITY,
        "challengeNonce": CHALLENGE,
        "nextCeremonyId": precheck["nextCeremonyId"],
        "nextEpisodeId": precheck["nextEpisodeId"],
        "sourceRevision": SCOPE["sourceRevision"],
        "controllerRevision": SCOPE["controllerRevision"],
        "handoffWitnessDigest": _digest(witnessed),
        "receiverState": "OFF",
        "readiness": "HOST_READY_FOR_SEPARATE_NEW_SUPERVISED_CEREMONY_ONLY",
        "observedAt": _utc(NOW),
    }
    receiver = {
        "schema": RECEIVER,
        "scope": SCOPE,
        "incidentId": incident,
        "authorityId": AUTHORITY,
        "challengeNonce": CHALLENGE,
        "hostReadinessDigest": _digest(host),
        "handoffWitnessDigest": _digest(witnessed),
        "receiverState": "OFF",
        "observedAt": _utc(NOW),
    }
    reports = {}
    for master in MASTERS:
        reports[master] = signed(keys[master], {
            "schema": MASTER,
            "masterId": master,
            "scope": SCOPE,
            "incidentId": incident,
            "authorityId": AUTHORITY,
            "ql433PrecheckReceiptDigest": receipt433["receiptDigest"],
            "handoffWitnessDigest": _digest(witnessed),
            "receiverOffDigest": _digest(receiver),
            "nextCeremonyId": precheck["nextCeremonyId"],
            "nextEpisodeId": precheck["nextEpisodeId"],
            "status": "NEW_CEREMONY_PREPARATION_ONLY_NOT_ACTIVATED",
            "observedAt": _utc(NOW),
        })
    owner = {
        "schema": OWNER,
        "scope": SCOPE,
        "incidentId": incident,
        "authorityId": AUTHORITY,
        "challengeNonce": CHALLENGE,
        "ql433PrecheckReceiptDigest": receipt433["receiptDigest"],
        "handoffWitnessDigest": _digest(witnessed),
        "receiverOffDigest": _digest(receiver),
        "mastersDigest": _digest([reports[m]["payload"] for m in MASTERS]),
        "nextCeremonyId": precheck["nextCeremonyId"],
        "nextEpisodeId": precheck["nextEpisodeId"],
        "ownerId": "hostOwnerOriginal325",
        "reviewerId": "independentOwnerReviewer325",
        "action": OWNER_ACTION,
        "authorizedAt": _utc(NOW),
    }
    readiness = ProtectedReadinessJournal325(tmp_path / "readiness325.db")
    args = {
        "pilot_journal": args433["pilot_journal"],
        "incident_journal": args433["incident_journal"],
        "review_journal": args433["review_journal"],
        "precheck_journal": prior,
        "readiness_journal": readiness,
        "keys": {name: key[1:] for name, key in keys.items()},
        "read_authority_handoff": lambda **_: {
            "issuer": signed(keys["issuer"], issued),
            "witness": signed(keys["witness"], witnessed),
        },
        "read_original_host_readiness": lambda **_: signed(keys["host"], host),
        "read_independent_receiver_off": lambda **_: signed(keys["receiver"], receiver),
        "attest_operator": lambda **_: True,
        "attest_signed_ql433_precheck": lambda **_: True,
        "attest_new_authority": lambda **_: True,
        "attest_fresh_nonce": lambda **_: True,
        "attest_external_custody": lambda **_: True,
        "attest_owner_custody": lambda **_: True,
        "now_ms": NOW,
    }
    return (
        case, ql432, precheck, keys, reports,
        dual(keys["owner"], keys["reviewer"], owner), args, readiness,
    )


def run(case, ql432, precheck, reports, owner, args):
    return run_ql434_signed_readiness325(
        Ree(), case["acceptance"], ql432, precheck,
        AUTHORITY, CHALLENGE, reports, owner, **args
    )


def test_signed_readiness_stays_off_hold_and_is_one_use(monkeypatch, tmp_path):
    case, ql432, precheck, _, reports, owner, args, journal = fixture(
        monkeypatch, tmp_path
    )
    result = run(case, ql432, precheck, reports, owner, args)
    assert result["accepted"]
    assert result["state"] == "DURABLE_QL434_SIGNED_NEW_CEREMONY_READINESS_HANDOFF"
    assert result["activationAuthorized"] is False
    assert result["connection"] == "HOLD"
    assert result["receiver"] == "OFF_VERIFIED_SIGNED_READBACK"
    assert result["slaveGate"] == "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
    assert journal.read(Ree(), precheck["incidentId"])["receiptDigest"]
    assert not run(case, ql432, precheck, reports, owner, args).get("accepted")
    assert case["calls"]["disable"] == 1


def test_missing_forged_or_on_evidence_fails_closed(monkeypatch, tmp_path):
    case, ql432, precheck, keys, reports, owner, args, _ = fixture(
        monkeypatch, tmp_path
    )
    failures = [
        {"attest_operator": None},
        {"attest_signed_ql433_precheck": None},
        {"attest_new_authority": None},
        {"attest_fresh_nonce": None},
        {"attest_external_custody": None},
        {"read_authority_handoff": lambda **_: None},
        {"read_authority_handoff": lambda **_: {
            "issuer": signed(signer(), {"schema": ISSUER}),
            "witness": signed(keys["witness"], {"schema": WITNESS}),
        }},
        {"read_original_host_readiness": lambda **_: signed(
            keys["host"], {"schema": HOST, "hostMachineId": "TEMPLAR"}
        )},
        {"read_independent_receiver_off": lambda **_: signed(
            keys["receiver"], {"schema": RECEIVER, "receiverState": "ON"}
        )},
        {"keys": {**args["keys"], "witness": args["keys"]["issuer"]}},
    ]
    for bad in failures:
        result = run(case, ql432, precheck, reports, owner, {**args, **bad})
        assert not result.get("accepted")
        assert result["connection"] == "HOLD"
        assert result["activationAuthorized"] is False
    wrong_reports = {**reports, "ai-data-platform": reports["rosevear-comms-hub"]}
    assert not run(case, ql432, precheck, wrong_reports, owner, args).get("accepted")
    bad_owner = dual(
        keys["owner"], keys["reviewer"],
        {**owner["payload"], "action": "ENABLE_RECEIVER"}
    )
    assert not run(case, ql432, precheck, reports, bad_owner, args).get("accepted")
    assert not run(
        case, ql432, {**precheck, "precheckReceiptDigest": "f" * 64}, reports, owner, args
    ).get("accepted")


def test_tampered_receipt_and_original_incident_fail_closed(monkeypatch, tmp_path):
    case, ql432, precheck, _, reports, owner, args, journal = fixture(
        monkeypatch, tmp_path
    )
    assert run(case, ql432, precheck, reports, owner, args)["accepted"]
    with sqlite3.connect(journal.path) as db:
        db.execute("UPDATE readiness325 SET receipt_digest=?", ("f" * 64,))
    assert not run(case, ql432, precheck, reports, owner, args).get("accepted")
    with sqlite3.connect(args["incident_journal"].path) as db:
        db.execute("UPDATE continuity322 SET record_digest=? WHERE idx=1", ("f" * 64,))
    assert not run(case, ql432, precheck, reports, owner, args).get("accepted")


def test_no_live_pilot_or_browser_control_exposed():
    assert TestClient(app).get("/api/v1/system/master-shell-325-acceptance").status_code in (
        401, 403
    )
    source = reconcile_master_evidence325(Ree())
    assert source["sourceBuild"] == 325
    assert source["receiver"] == "OFF"
    assert source["connection"] == "HOLD"
    assert source["activationAuthorized"] is False
