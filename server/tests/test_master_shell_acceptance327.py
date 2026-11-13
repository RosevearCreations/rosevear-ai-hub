"""Build 327 QL-436 signed original-host shutdown and independent OFF regressions."""

import sqlite3

from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _utc
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_acceptance327 import (
    ACK,
    HOST,
    LATE_HOST,
    LATE_OFF,
    MASTER,
    OFF,
    OWNER,
    OWNER_LATE,
    OWNER_TIMELY,
    TIMELY,
    ProtectedShutdownJournal327,
    _disposition,
    _prior,
    prepare_ql436_shutdown327,
    reconcile_master_evidence327,
    run_ql436_shutdown_reconciliation327,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304
from test_master_shell_acceptance322 import MASTERS, NOW, SCOPE, Ree, dual, signed, signer
from test_master_shell_acceptance326 import fixture as ql435_fixture
from test_master_shell_acceptance326 import run as ql435_run

SHUTDOWN_NONCE = "postPilotShutdownNonce327"
REVIEW_ID = "postPilotIncidentReview327"


def fixture(monkeypatch, tmp_path, mode="timely"):
    case, ql432, ql433, ql434, _, permit, reports435, owner435, args435, pilot_journal = (
        ql435_fixture(monkeypatch, tmp_path)
    )
    pilot = ql435_run(case, ql432, ql433, ql434, permit, reports435, owner435, args435)
    assert pilot["accepted"] and pilot["activationAuthorized"] is False

    if mode == "late_host":
        now = NOW + 15_000
        shutdown_at, host_seen, off_seen = NOW + 11_000, NOW + 12_000, NOW + 13_000
        master_seen = owner_seen = NOW + 14_000
    elif mode == "late_off":
        now = NOW + 14_000
        shutdown_at, host_seen, off_seen = NOW + 1_000, NOW + 2_000, NOW + 11_000
        master_seen, owner_seen = NOW + 12_000, NOW + 13_000
    else:
        now = NOW + 5_000
        shutdown_at, host_seen, off_seen = NOW + 1_000, NOW + 2_000, NOW + 3_000
        master_seen = owner_seen = NOW + 4_000

    prior = _prior(
        Ree(),
        SCOPE,
        ql432,
        ql433,
        ql434,
        pilot,
        args435["incident_journal"],
        args435["review_journal"],
        args435["precheck_journal"],
        args435["readiness_journal"],
        pilot_journal,
    )
    assert prior
    request = prepare_ql436_shutdown327(
        SCOPE,
        pilot,
        prior,
        SHUTDOWN_NONCE,
        REVIEW_ID,
        now,
    )
    keys = {role: signer() for role in ("host", "receiver", "owner", "reviewer", *MASTERS)}
    shutdown = {
        "schema": HOST,
        "requestDigest": _digest(request),
        "hostMachineId": "DESKTOP-AE894KC",
        "scope": SCOPE,
        "originalIncidentId": pilot["incidentId"],
        "incidentReviewId": REVIEW_ID,
        "nextCeremonyId": pilot["nextCeremonyId"],
        "nextEpisodeId": pilot["nextEpisodeId"],
        "challengeId": pilot["challengeId"],
        "originalChallengeNonce": pilot["challengeNonce"],
        "shutdownNonce": SHUTDOWN_NONCE,
        "leaseExpiresAt": pilot["leaseExpiresAt"],
        "ql435AcceptedReceiptDigest": pilot["acceptedReceiptDigest"],
        "shutdownMechanism": "ORIGINAL_HOST_FAIL_CLOSED_PILOT_DISABLE",
        "receiverState": "OFF",
        "shutdownAt": _utc(shutdown_at),
        "observedAt": _utc(host_seen),
        "shutdownSequence": 18,
    }
    off = {
        "schema": OFF,
        "requestDigest": _digest(request),
        "originalIncidentId": pilot["incidentId"],
        "incidentReviewId": REVIEW_ID,
        "nextCeremonyId": pilot["nextCeremonyId"],
        "challengeId": pilot["challengeId"],
        "shutdownNonce": SHUTDOWN_NONCE,
        "hostShutdownDigest": _digest(shutdown),
        "leaseExpiresAt": pilot["leaseExpiresAt"],
        "receiverState": "OFF",
        "offContinuitySequence": 19,
        "observedAt": _utc(off_seen),
    }
    disposition = _disposition(
        NOW + 10_000,
        shutdown_at,
        off_seen,
    )
    masters = {}
    for master in MASTERS:
        masters[master] = signed(
            keys[master],
            {
                "schema": MASTER,
                "masterId": master,
                "requestDigest": _digest(request),
                "incidentReviewId": REVIEW_ID,
                "originalIncidentId": pilot["incidentId"],
                "nextCeremonyId": pilot["nextCeremonyId"],
                "shutdownNonce": SHUTDOWN_NONCE,
                "hostShutdownDigest": _digest(shutdown),
                "independentOffDigest": _digest(off),
                "leaseExpiresAt": pilot["leaseExpiresAt"],
                "leaseDisposition": disposition,
                "decision": ACK,
                "observedAt": _utc(master_seen),
            },
        )
    owner = dual(
        keys["owner"],
        keys["reviewer"],
        {
            "schema": OWNER,
            "requestDigest": _digest(request),
            "incidentReviewId": REVIEW_ID,
            "originalIncidentId": pilot["incidentId"],
            "nextCeremonyId": pilot["nextCeremonyId"],
            "shutdownNonce": SHUTDOWN_NONCE,
            "hostShutdownDigest": _digest(shutdown),
            "independentOffDigest": _digest(off),
            "mastersDigest": _digest([masters[m]["payload"] for m in MASTERS]),
            "leaseDisposition": disposition,
            "action": OWNER_TIMELY if disposition == TIMELY else OWNER_LATE,
            "ownerId": "originalHostSupervisor327",
            "reviewerId": "independentCustodian327",
            "reviewedAt": _utc(owner_seen),
        },
    )
    shutdown_journal = ProtectedShutdownJournal327(tmp_path / "shutdown327.db")
    args = {
        "pilot_journal": args435["pilot_journal"],
        "incident_journal": args435["incident_journal"],
        "review_journal": args435["review_journal"],
        "precheck_journal": args435["precheck_journal"],
        "readiness_journal": args435["readiness_journal"],
        "pilot_evidence_journal": pilot_journal,
        "shutdown_journal": shutdown_journal,
        "keys": {name: pair[1:] for name, pair in keys.items()},
        "read_signed_host_shutdown": lambda **_: signed(keys["host"], shutdown),
        "read_signed_independent_off": lambda **_: signed(keys["receiver"], off),
        "attest_operator": lambda **_: True,
        "attest_signed_ql435": lambda **_: True,
        "attest_fail_closed_shutdown": lambda **_: True,
        "attest_independent_receiver": lambda **_: True,
        "attest_owner_custody": lambda **_: True,
        "now_ms": now,
    }
    return case, ql432, ql433, ql434, pilot, keys, shutdown, off, masters, owner, args


def run(case, ql432, ql433, ql434, pilot, masters, owner, args):
    return run_ql436_shutdown_reconciliation327(
        Ree(),
        case["acceptance"],
        ql432,
        ql433,
        ql434,
        pilot,
        SHUTDOWN_NONCE,
        REVIEW_ID,
        masters,
        owner,
        **args,
    )


def test_timely_independently_signed_off_reconciles_no_reentry(monkeypatch, tmp_path):
    case, ql432, ql433, ql434, pilot, _, _, _, masters, owner, args = fixture(monkeypatch, tmp_path)
    result = run(case, ql432, ql433, ql434, pilot, masters, owner, args)
    assert result["accepted"]
    assert result["state"] == "DURABLE_QL436_POST_PILOT_SIGNED_OFF_RECONCILED"
    assert result["receiver"] == "OFF_VERIFIED_HOST_AND_INDEPENDENT_READBACK"
    assert result["leaseDisposition"] == TIMELY
    assert result["leaseExceptionEscalationRequired"] is False
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert result["manualReceiverIsolationRequired"] is True
    journal = args["shutdown_journal"]
    assert journal.read(Ree(), pilot["nextCeremonyId"], "PENDING")
    assert journal.read(Ree(), pilot["nextCeremonyId"], "RECONCILED")
    assert not run(case, ql432, ql433, ql434, pilot, masters, owner, args).get("accepted")


def test_signed_lease_exception_dispositions_require_escalation(monkeypatch, tmp_path):
    for mode, expected in (("late_host", LATE_HOST), ("late_off", LATE_OFF)):
        subdir = tmp_path / mode
        subdir.mkdir()
        case, ql432, ql433, ql434, pilot, _, _, _, masters, owner, args = fixture(
            monkeypatch, subdir, mode=mode
        )
        result = run(case, ql432, ql433, ql434, pilot, masters, owner, args)
        assert result["accepted"]
        assert result["leaseDisposition"] == expected
        assert result["leaseExceptionEscalationRequired"] is True
        assert result["connection"] == "HOLD"
        assert result["activationAuthorized"] is False


def test_invalid_host_or_independent_off_remains_unknown_pending(monkeypatch, tmp_path):
    case, ql432, ql433, ql434, pilot, keys, shutdown, off, masters, owner, args = fixture(
        monkeypatch, tmp_path
    )
    invalid = {
        **args,
        "read_signed_independent_off": lambda **_: signed(
            keys["receiver"], {**off, "receiverState": "ON"}
        ),
    }
    result = run(case, ql432, ql433, ql434, pilot, masters, owner, invalid)
    assert not result.get("accepted")
    assert result["receiver"] == "UNKNOWN_UNTIL_INDEPENDENT_SIGNED_OFF"
    assert result["manualReceiverIsolationRequired"] is True
    assert result["activationAuthorized"] is False
    journal = args["shutdown_journal"]
    assert journal.read(Ree(), pilot["nextCeremonyId"], "PENDING")
    assert journal.read(Ree(), pilot["nextCeremonyId"], "RECONCILED") is None
    assert not run(case, ql432, ql433, ql434, pilot, masters, owner, args).get("accepted")


def test_pre_pending_authority_and_late_owner_mismatch_fail_closed(monkeypatch, tmp_path):
    case, ql432, ql433, ql434, pilot, _, _, _, masters, owner, args = fixture(monkeypatch, tmp_path)
    result = run(
        case,
        ql432,
        ql433,
        ql434,
        pilot,
        masters,
        owner,
        {**args, "attest_operator": None},
    )
    assert not result.get("accepted")
    assert args["shutdown_journal"].read(Ree(), pilot["nextCeremonyId"], "PENDING") is None

    late_dir = tmp_path / "late"
    late_dir.mkdir()
    values = fixture(monkeypatch, late_dir, mode="late_off")
    ca, d, p, r, q, keys, host, off, reports, signed_owner, kw = values
    wrong = dual(
        keys["owner"],
        keys["reviewer"],
        {**signed_owner["payload"], "action": OWNER_TIMELY},
    )
    rejected = run(ca, d, p, r, q, reports, wrong, kw)
    assert not rejected.get("accepted")
    assert rejected["receiver"] == "UNKNOWN_UNTIL_INDEPENDENT_SIGNED_OFF"
    assert kw["shutdown_journal"].read(Ree(), q["nextCeremonyId"], "PENDING") is not None


def test_tampered_shutdown_or_previous_custody_fail_closed(monkeypatch, tmp_path):
    case, ql432, ql433, ql434, pilot, _, _, _, masters, owner, args = fixture(monkeypatch, tmp_path)
    assert run(case, ql432, ql433, ql434, pilot, masters, owner, args)["accepted"]
    journal = args["shutdown_journal"]
    with sqlite3.connect(journal.path) as db:
        db.execute(
            "UPDATE shutdown327 SET receipt_digest=? WHERE stage='PENDING'",
            ("f" * 64,),
        )
    assert not run(case, ql432, ql433, ql434, pilot, masters, owner, args).get("accepted")
    assert TestClient(app).get("/api/v1/system/master-shell-327-acceptance").status_code in (
        401,
        403,
    )
    source = reconcile_master_evidence327(PersistentReeMonitor304(enabled=False))
    assert source["sourceBuild"] == 327
    assert source["connection"] == "HOLD"
    assert source["receiver"] == "UNKNOWN_UNTIL_INDEPENDENT_SIGNED_OFF"
    assert source["activationAuthorized"] is False
