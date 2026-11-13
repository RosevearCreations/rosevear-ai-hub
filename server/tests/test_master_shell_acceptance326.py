"""Build 326 QL-435 simulated signed isolated pilot, lease and fail-closed tests."""

import sqlite3

from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _utc
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_acceptance326 import (
    ENROLLMENT,
    HOST_ON,
    INDEPENDENT_ON,
    MASTER,
    OWNER,
    OWNER_ACTION,
    PRE_OFF,
    PRE_PERMIT,
    PRE_PERMIT_ACTION,
    REQUEST,
    MAX_LEASE_MS,
    REQUEST_ACTION,
    ProtectedIsolatedPilotJournal326,
    reconcile_master_evidence326,
    run_ql435_isolated_pilot_evidence326,
)
from test_master_shell_acceptance322 import MASTERS, NOW, SCOPE, Ree, dual, signed, signer
from test_master_shell_acceptance325 import fixture as ql434_fixture
from test_master_shell_acceptance325 import run as ql434_run

CHALLENGE_ID = "freshOriginalPilotChallenge326"
CHALLENGE_NONCE = "freshOriginalPilotNonce326"
LEASE = _utc(NOW + 10_000)


def fixture(monkeypatch, tmp_path):
    case, ql432, precheck, _, reports434, owner434, old_args, readiness = ql434_fixture(
        monkeypatch, tmp_path
    )
    ql434 = ql434_run(case, ql432, precheck, reports434, owner434, old_args)
    assert ql434["accepted"] and ql434["activationAuthorized"] is False
    custody = {
        "ql431": old_args["incident_journal"].read(Ree(), SCOPE),
        "ql432": old_args["review_journal"].read(Ree(), ql434["incidentId"]),
        "ql433": old_args["precheck_journal"].read(Ree(), ql434["incidentId"]),
        "ql434": readiness.read(Ree(), ql434["incidentId"]),
    }
    keys = {
        role: signer()
        for role in ("host", "pre_off", "on_witness", "owner", "reviewer", *MASTERS)
    }
    request = {
        "schema": REQUEST,
        "scope": SCOPE,
        "incidentId": ql434["incidentId"],
        "nextCeremonyId": ql434["nextCeremonyId"],
        "nextEpisodeId": ql434["nextEpisodeId"],
        "sourceRevision": SCOPE["sourceRevision"],
        "controllerRevision": SCOPE["controllerRevision"],
        "originalHostId": "DESKTOP-AE894KC",
        "authorityId": ql434["authorityId"],
        "ql431CheckpointDigest": custody["ql431"]["recordDigest"],
        "ql432OwnerReceiptDigest": custody["ql432"]["receiptDigest"],
        "ql433PrecheckReceiptDigest": custody["ql433"]["receiptDigest"],
        "ql434ReadinessReceiptDigest": custody["ql434"]["receiptDigest"],
        "ql434HandoffWitnessDigest": ql434["handoffWitnessDigest"],
        "source325Main": "453b00a404d2392dac22ded18ee3f9f77a2466c4",
        "challengeId": CHALLENGE_ID,
        "challengeNonce": CHALLENGE_NONCE,
        "leaseExpiresAt": LEASE,
        "requestedAction": REQUEST_ACTION,
    }
    enrollment = {
        "schema": ENROLLMENT,
        "requestDigest": _digest(request),
        "scope": SCOPE,
        "incidentId": ql434["incidentId"],
        "challengeId": CHALLENGE_ID,
        "challengeNonce": CHALLENGE_NONCE,
        "nextCeremonyId": ql434["nextCeremonyId"],
        "nextEpisodeId": ql434["nextEpisodeId"],
        "hostMachineId": "DESKTOP-AE894KC",
        "receiverState": "OFF",
        "failClosedShutdownArmed": True,
        "leaseExpiresAt": LEASE,
        "enrollmentStatus": "FRESH_ISOLATED_ONE_TEST_ENROLLMENT_NOT_ENABLED",
        "enrolledAt": _utc(NOW),
    }
    pre_off = {
        "schema": PRE_OFF,
        "challengeId": CHALLENGE_ID,
        "challengeNonce": CHALLENGE_NONCE,
        "hostEnrollmentDigest": _digest(enrollment),
        "leaseExpiresAt": LEASE,
        "receiverState": "OFF",
        "observedAt": _utc(NOW),
    }
    permit = {
        "schema": PRE_PERMIT,
        "requestDigest": _digest(request),
        "hostEnrollmentDigest": _digest(enrollment),
        "preOffDigest": _digest(pre_off),
        "challengeId": CHALLENGE_ID,
        "challengeNonce": CHALLENGE_NONCE,
        "nextCeremonyId": ql434["nextCeremonyId"],
        "nextEpisodeId": ql434["nextEpisodeId"],
        "leaseExpiresAt": LEASE,
        "action": PRE_PERMIT_ACTION,
        "ownerId": "pilotOwnerOriginal326",
        "reviewerId": "pilotIndependentReviewer326",
        "approvedAt": _utc(NOW),
    }
    host_on = {
        "schema": HOST_ON,
        "requestDigest": _digest(request),
        "challengeId": CHALLENGE_ID,
        "challengeNonce": CHALLENGE_NONCE,
        "prePermitDigest": _digest(permit),
        "hostMachineId": "DESKTOP-AE894KC",
        "nextCeremonyId": ql434["nextCeremonyId"],
        "nextEpisodeId": ql434["nextEpisodeId"],
        "leaseExpiresAt": LEASE,
        "receiverState": "ISOLATED_ONE_TEST_ON",
        "isolatedMode": True,
        "failClosedShutdownArmed": True,
        "observedAt": _utc(NOW),
    }
    independent_on = {
        "schema": INDEPENDENT_ON,
        "challengeId": CHALLENGE_ID,
        "challengeNonce": CHALLENGE_NONCE,
        "hostOnDigest": _digest(host_on),
        "nextCeremonyId": ql434["nextCeremonyId"],
        "nextEpisodeId": ql434["nextEpisodeId"],
        "leaseExpiresAt": LEASE,
        "receiverState": "ISOLATED_ONE_TEST_ON",
        "observation": "INDEPENDENT_SINGLE_NONCE_BOUND_PILOT_ON_SEEN",
        "observedAt": _utc(NOW),
    }
    reports = {}
    for master in MASTERS:
        reports[master] = signed(
            keys[master],
            {
                "schema": MASTER,
                "masterId": master,
                "requestDigest": _digest(request),
                "challengeId": CHALLENGE_ID,
                "challengeNonce": CHALLENGE_NONCE,
                "independentOnWitnessDigest": _digest(independent_on),
                "nextCeremonyId": ql434["nextCeremonyId"],
                "nextEpisodeId": ql434["nextEpisodeId"],
                "leaseExpiresAt": LEASE,
                "status": "SIGNED_ISOLATED_ON_EVIDENCE_REVIEW_ONLY_NO_GENERAL_CONNECTED",
                "observedAt": _utc(NOW),
            },
        )
    owner = {
        "schema": OWNER,
        "requestDigest": _digest(request),
        "challengeId": CHALLENGE_ID,
        "challengeNonce": CHALLENGE_NONCE,
        "independentOnWitnessDigest": _digest(independent_on),
        "mastersDigest": _digest([reports[master]["payload"] for master in MASTERS]),
        "nextCeremonyId": ql434["nextCeremonyId"],
        "nextEpisodeId": ql434["nextEpisodeId"],
        "leaseExpiresAt": LEASE,
        "action": OWNER_ACTION,
        "ownerId": "pilotOwnerOriginal326",
        "reviewerId": "pilotIndependentReviewer326",
        "decidedAt": _utc(NOW),
    }
    journal = ProtectedIsolatedPilotJournal326(tmp_path / "isolated326.db")
    args = {
        "pilot_journal": old_args["pilot_journal"],
        "incident_journal": old_args["incident_journal"],
        "review_journal": old_args["review_journal"],
        "precheck_journal": old_args["precheck_journal"],
        "readiness_journal": readiness,
        "isolated_journal": journal,
        "keys": {name: key[1:] for name, key in keys.items()},
        "read_host_enrollment": lambda **_: signed(keys["host"], enrollment),
        "read_independent_pre_off": lambda **_: signed(keys["pre_off"], pre_off),
        "read_host_on_evidence": lambda **_: signed(keys["host"], host_on),
        "read_independent_on_evidence": lambda **_: signed(keys["on_witness"], independent_on),
        "attest_operator": lambda **_: True,
        "attest_signed_ql434": lambda **_: True,
        "attest_hard_shutdown_armed": lambda **_: True,
        "attest_challenge_fresh": lambda **_: True,
        "attest_owner_custody": lambda **_: True,
        "now_ms": NOW,
    }
    return (
        case, ql432, precheck, ql434, keys,
        dual(keys["owner"], keys["reviewer"], permit),
        reports, dual(keys["owner"], keys["reviewer"], owner), args, journal,
    )


def run(case, ql432, precheck, ql434, permit, reports, owner, args, lease=LEASE):
    return run_ql435_isolated_pilot_evidence326(
        Ree(),
        case["acceptance"],
        ql432,
        precheck,
        ql434,
        CHALLENGE_ID,
        CHALLENGE_NONCE,
        lease,
        permit,
        reports,
        owner,
        **args,
    )


def test_signed_one_use_pilot_evidence_is_not_connected(monkeypatch, tmp_path):
    case, ql432, precheck, ql434, _, permit, reports, owner, args, journal = fixture(
        monkeypatch, tmp_path
    )
    accepted = run(case, ql432, precheck, ql434, permit, reports, owner, args)
    assert accepted["accepted"]
    assert accepted["state"] == "DURABLE_QL435_ISOLATED_PILOT_ON_EVIDENCE_DECISION"
    assert accepted["receiver"] == "ISOLATED_ONE_TEST_ON_SIGNED_WITNESS_ONLY"
    assert accepted["connection"] == "HOLD"
    assert accepted["activationAuthorized"] is False
    assert accepted["manualReceiverIsolationRequired"] is True
    assert accepted["permittedNextAction"].startswith("SUPERVISED_FAIL_CLOSED_OFF")
    assert journal.read(Ree(), ql434["nextCeremonyId"], "PENDING")
    assert journal.read(Ree(), ql434["nextCeremonyId"], "ACCEPTED")
    assert not run(case, ql432, precheck, ql434, permit, reports, owner, args).get("accepted")
    assert case["calls"]["disable"] == 1


def test_pre_challenge_failures_cannot_create_on_evidence(monkeypatch, tmp_path):
    case, ql432, precheck, ql434, keys, permit, reports, owner, args, journal = fixture(
        monkeypatch, tmp_path
    )
    failures = [
        {"attest_operator": None},
        {"attest_signed_ql434": None},
        {"attest_hard_shutdown_armed": None},
        {"attest_challenge_fresh": None},
        {"read_host_enrollment": lambda **_: signed(
            keys["host"], {"schema": ENROLLMENT, "receiverState": "ON"}
        )},
        {"read_independent_pre_off": lambda **_: signed(
            keys["pre_off"], {"schema": PRE_OFF, "receiverState": "ON"}
        )},
        {"keys": {**args["keys"], "pre_off": args["keys"]["host"]}},
    ]
    for change in failures:
        denied = run(case, ql432, precheck, ql434, permit, reports, owner, {
            **args, **change
        })
        assert not denied.get("accepted")
        assert denied["connection"] == "HOLD"
        assert denied["activationAuthorized"] is False
        assert denied["manualReceiverIsolationRequired"] is False
    assert journal.read(Ree(), ql434["nextCeremonyId"], "PENDING") is None
    invalid_lease = run(
        case, ql432, precheck, ql434, permit, reports, owner, args,
        lease=_utc(NOW + MAX_LEASE_MS + 1),
    )
    assert not invalid_lease.get("accepted")
    wrong_permit = dual(
        keys["owner"], keys["reviewer"],
        {**permit["payload"], "action": "ENABLE_RECEIVER"},
    )
    assert not run(
        case, ql432, precheck, ql434, wrong_permit, reports, owner, args
    ).get("accepted")


def test_post_pending_failure_requires_isolation_and_consumes_ceremony(monkeypatch, tmp_path):
    case, ql432, precheck, ql434, _, permit, reports, owner, args, journal = fixture(
        monkeypatch, tmp_path
    )
    def unavailable(**_):
        raise OSError("no real host observation")
    failed = run(
        case, ql432, precheck, ql434, permit, reports, owner,
        {**args, "read_host_on_evidence": unavailable},
    )
    assert failed["connection"] == "HOLD"
    assert failed["activationAuthorized"] is False
    assert failed["manualReceiverIsolationRequired"] is True
    assert failed["receiver"] == "UNKNOWN_OR_ON_SUPERVISED_FAIL_CLOSED_SHUTDOWN_REQUIRED"
    assert journal.read(Ree(), ql434["nextCeremonyId"], "PENDING") is not None
    assert journal.read(Ree(), ql434["nextCeremonyId"], "ACCEPTED") is None
    assert not run(case, ql432, precheck, ql434, permit, reports, owner, args).get("accepted")


def test_forged_on_or_master_evidence_preserves_pending(monkeypatch, tmp_path):
    case, ql432, precheck, ql434, keys, permit, reports, owner, args, journal = fixture(
        monkeypatch, tmp_path
    )
    forged = run(
        case, ql432, precheck, ql434, permit, reports, owner,
        {**args, "read_independent_on_evidence": lambda **_: signed(
            keys["on_witness"], {"schema": INDEPENDENT_ON, "receiverState": "OFF"}
        )},
    )
    assert not forged.get("accepted")
    assert forged["manualReceiverIsolationRequired"] is True
    assert journal.read(Ree(), ql434["nextCeremonyId"], "PENDING") is not None
    assert journal.read(Ree(), ql434["nextCeremonyId"], "ACCEPTED") is None


def test_receipt_tampering_and_source_only_authority(monkeypatch, tmp_path):
    case, ql432, precheck, ql434, _, permit, reports, owner, args, journal = fixture(
        monkeypatch, tmp_path
    )
    assert run(case, ql432, precheck, ql434, permit, reports, owner, args)["accepted"]
    with sqlite3.connect(journal.path) as db:
        db.execute("UPDATE pilot326 SET receipt_digest=? WHERE stage='PENDING'", ("f" * 64,))
    assert not run(case, ql432, precheck, ql434, permit, reports, owner, args).get("accepted")
    assert TestClient(app).get("/api/v1/system/master-shell-326-acceptance").status_code in (
        401, 403,
    )
    projection = reconcile_master_evidence326(Ree())
    assert projection["sourceBuild"] == 326
    assert projection["connection"] == "HOLD"
    assert projection["activationAuthorized"] is False
