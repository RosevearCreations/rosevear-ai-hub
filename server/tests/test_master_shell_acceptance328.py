"""Build 328 / QL-437 synthetic signed external anchor and incident custody."""

import sqlite3

from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _utc
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_acceptance327 import LATE_HOST, LATE_OFF, TIMELY
from rosevear_ai_hub.master_shell_acceptance328 import (
    ANCHOR_SCHEMA,
    EXCEPTION_SCHEMA,
    HOST_SCHEMA,
    LATE_ACTION,
    MASTER_SCHEMA,
    OFF_SCHEMA,
    ON_TIME_ACTION,
    OWNER_SCHEMA,
    READBACK_SCHEMA,
    ProtectedClosureJournal328,
    _prior,
    prepare_ql437_export328,
    reconcile_master_evidence328,
    run_ql437_anchored_off_closure328,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304
from test_master_shell_acceptance322 import MASTERS, SCOPE, Ree, dual, signed, signer
from test_master_shell_acceptance327 import fixture as ql436_fixture
from test_master_shell_acceptance327 import run as ql436_run

EXPORT_ID = "anchoredShutdownEvidenceExport328"
ANCHOR_NONCE = "independentAnchorChallengeNonce328"


def fixture(monkeypatch, tmp_path, mode="timely"):
    (
        case,
        ql432,
        ql433,
        ql434,
        ql435,
        _,
        _,
        _,
        reports436,
        owner436,
        args436,
    ) = ql436_fixture(monkeypatch, tmp_path, mode=mode)
    shutdown = ql436_run(
        case,
        ql432,
        ql433,
        ql434,
        ql435,
        reports436,
        owner436,
        args436,
    )
    assert shutdown["accepted"] and shutdown["activationAuthorized"] is False
    prior = _prior(
        Ree(),
        SCOPE,
        ql432,
        ql433,
        ql434,
        ql435,
        shutdown,
        args436["incident_journal"],
        args436["review_journal"],
        args436["precheck_journal"],
        args436["readiness_journal"],
        args436["pilot_evidence_journal"],
        args436["shutdown_journal"],
    )
    assert prior
    now = args436["now_ms"] + 10_000
    export = prepare_ql437_export328(
        SCOPE,
        ql435,
        shutdown,
        prior,
        EXPORT_ID,
        ANCHOR_NONCE,
        now,
    )
    keys = {
        name: signer()
        for name in (
            "anchor",
            "reader",
            "host",
            "receiver",
            "exception",
            "owner",
            "reviewer",
            *MASTERS,
        )
    }
    anchor = {
        "schema": ANCHOR_SCHEMA,
        "exportId": EXPORT_ID,
        "anchorChallengeNonce": ANCHOR_NONCE,
        "exportDigest": _digest(export),
        "originalIncidentId": shutdown["originalIncidentId"],
        "incidentReviewId": shutdown["incidentReviewId"],
        "nextCeremonyId": shutdown["nextCeremonyId"],
        "ql436ReconciledReceiptDigest": shutdown["reconciledReceiptDigest"],
        "leaseDisposition": shutdown["leaseDisposition"],
        "status": "EXTERNAL_IMMUTABLE_SIGNED_OFF_EVIDENCE_ANCHORED",
        "anchoredAt": _utc(now),
    }
    reader = {
        "schema": READBACK_SCHEMA,
        "exportId": EXPORT_ID,
        "anchorChallengeNonce": ANCHOR_NONCE,
        "exportDigest": _digest(export),
        "externalAnchorDigest": _digest(anchor),
        "originalIncidentId": shutdown["originalIncidentId"],
        "status": "INDEPENDENT_EXACT_ANCHORED_OFF_EVIDENCE_READBACK",
        "readAt": _utc(now),
    }
    host = {
        "schema": HOST_SCHEMA,
        "hostMachineId": "DESKTOP-AE894KC",
        "scope": SCOPE,
        "originalIncidentId": shutdown["originalIncidentId"],
        "nextCeremonyId": shutdown["nextCeremonyId"],
        "exportId": EXPORT_ID,
        "anchorChallengeNonce": ANCHOR_NONCE,
        "anchorDigest": _digest(anchor),
        "independentReadbackDigest": _digest(reader),
        "receiverState": "OFF",
        "shutdownContinuitySequence": 77,
        "observedAt": _utc(now),
    }
    off = {
        "schema": OFF_SCHEMA,
        "originalIncidentId": shutdown["originalIncidentId"],
        "nextCeremonyId": shutdown["nextCeremonyId"],
        "exportId": EXPORT_ID,
        "anchorChallengeNonce": ANCHOR_NONCE,
        "hostOffDigest": _digest(host),
        "independentAnchorReadbackDigest": _digest(reader),
        "receiverState": "OFF",
        "offContinuitySequence": 78,
        "observedAt": _utc(now),
    }
    masters = {}
    for master in MASTERS:
        masters[master] = signed(
            keys[master],
            {
                "schema": MASTER_SCHEMA,
                "masterId": master,
                "originalIncidentId": shutdown["originalIncidentId"],
                "nextCeremonyId": shutdown["nextCeremonyId"],
                "exportDigest": _digest(export),
                "independentAnchorReadbackDigest": _digest(reader),
                "independentOffDigest": _digest(off),
                "leaseDisposition": shutdown["leaseDisposition"],
                "status": "SIGNED_POST_SHUTDOWN_OFF_HOLD_NO_REENTRY",
                "observedAt": _utc(now),
            },
        )
    masters_digest = _digest([masters[m]["payload"] for m in MASTERS])
    exception = {
        "schema": EXCEPTION_SCHEMA,
        "originalIncidentId": shutdown["originalIncidentId"],
        "incidentReviewId": shutdown["incidentReviewId"],
        "nextCeremonyId": shutdown["nextCeremonyId"],
        "exportDigest": _digest(export),
        "independentAnchorReadbackDigest": _digest(reader),
        "independentOffDigest": _digest(off),
        "mastersDigest": masters_digest,
        "leaseDisposition": shutdown["leaseDisposition"],
        "status": "LEASE_EXCEPTION_INDEPENDENT_CUSTODY_OPEN_NOT_CLOSED",
        "recordedAt": _utc(now),
    }
    late = shutdown["leaseExceptionEscalationRequired"]
    owner = dual(
        keys["owner"],
        keys["reviewer"],
        {
            "schema": OWNER_SCHEMA,
            "originalIncidentId": shutdown["originalIncidentId"],
            "incidentReviewId": shutdown["incidentReviewId"],
            "exportDigest": _digest(export),
            "independentAnchorReadbackDigest": _digest(reader),
            "independentOffDigest": _digest(off),
            "mastersDigest": masters_digest,
            "exceptionCustodyDigest": _digest(exception) if late else None,
            "leaseDisposition": shutdown["leaseDisposition"],
            "action": LATE_ACTION if late else ON_TIME_ACTION,
            "ownerId": "originalClosureOwner328",
            "reviewerId": "independentClosureReviewer328",
            "reviewedAt": _utc(now),
        },
    )
    closure = ProtectedClosureJournal328(tmp_path / "closure328.db")
    args = {
        "pilot_journal": args436["pilot_journal"],
        "incident_journal": args436["incident_journal"],
        "review_journal": args436["review_journal"],
        "precheck_journal": args436["precheck_journal"],
        "readiness_journal": args436["readiness_journal"],
        "pilot_evidence_journal": args436["pilot_evidence_journal"],
        "shutdown_journal": args436["shutdown_journal"],
        "closure_journal": closure,
        "keys": {name: key[1:] for name, key in keys.items()},
        "read_external_anchor": lambda **_: {
            "anchor": signed(keys["anchor"], anchor),
            "reader": signed(keys["reader"], reader),
        },
        "read_host_off": lambda **_: signed(keys["host"], host),
        "read_independent_off": lambda **_: signed(keys["receiver"], off),
        "read_exception_custody": lambda **_: signed(keys["exception"], exception),
        "attest_operator": lambda **_: True,
        "attest_signed_ql436": lambda **_: True,
        "attest_independent_anchor": lambda **_: True,
        "attest_independent_receiver": lambda **_: True,
        "attest_owner_custody": lambda **_: True,
        "now_ms": now,
    }
    return (
        case,
        ql432,
        ql433,
        ql434,
        ql435,
        shutdown,
        keys,
        anchor,
        reader,
        host,
        off,
        masters,
        exception,
        owner,
        args,
    )


def run(values, args=None, reports=None, owners=None):
    (
        case,
        ql432,
        ql433,
        ql434,
        ql435,
        shutdown,
        _,
        _,
        _,
        _,
        _,
        masters,
        _,
        owner,
        default,
    ) = values
    return run_ql437_anchored_off_closure328(
        Ree(),
        case["acceptance"],
        ql432,
        ql433,
        ql434,
        ql435,
        shutdown,
        EXPORT_ID,
        ANCHOR_NONCE,
        reports if reports is not None else masters,
        owners if owners is not None else owner,
        **(args if args is not None else default),
    )


def test_anchored_on_time_receipt_is_closure_review_not_connection(monkeypatch, tmp_path):
    v = fixture(monkeypatch, tmp_path)
    result = run(v)
    assert result["accepted"]
    assert result["state"] == "DURABLE_QL437_OWNER_SUPERVISED_INCIDENT_CLOSURE_READBACK"
    assert result["leaseDisposition"] == TIMELY
    assert result["incidentClosureAuthorized"] is True
    assert result["leaseExceptionOpen"] is False
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert result["manualReceiverIsolationRequired"] is True
    journal = v[-1]["closure_journal"]
    assert journal.read(Ree(), v[5]["originalIncidentId"], "PENDING")
    assert journal.read(Ree(), v[5]["originalIncidentId"], "FINAL")
    assert journal.status(Ree(), v[5]["originalIncidentId"]) == (
        "QL437_PRIVATE_FINAL_RECORD_PRESENT_NOT_LIVE_OFF_PROOF"
    )
    assert not run(v).get("accepted")


def test_expired_lease_both_types_remain_open(monkeypatch, tmp_path):
    for mode, expected in (
        ("late_host", LATE_HOST),
        ("late_off", LATE_OFF),
    ):
        path = tmp_path / mode
        path.mkdir()
        v = fixture(monkeypatch, path, mode)
        result = run(v)
        assert result["accepted"]
        assert result["state"] == ("DURABLE_QL437_EXPIRED_LEASE_EXCEPTION_OPEN_INDEPENDENT_CUSTODY")
        assert result["leaseDisposition"] == expected
        assert result["incidentClosureAuthorized"] is False
        assert result["leaseExceptionOpen"] is True
        assert result["connection"] == "HOLD"


def test_missing_anchor_reader_consumes_pending_and_never_claims_off(monkeypatch, tmp_path):
    v = fixture(monkeypatch, tmp_path)
    kw = v[-1]
    bad = {**kw, "read_external_anchor": lambda **_: {"anchor": None, "reader": None}}
    result = run(v, args=bad)
    assert not result.get("accepted")
    assert result["receiver"] == "UNKNOWN_PENDING_INDEPENDENT_OFF_REVALIDATION"
    assert result["incidentClosureAuthorized"] is False
    journal = kw["closure_journal"]
    assert journal.read(Ree(), v[5]["originalIncidentId"], "PENDING")
    assert journal.read(Ree(), v[5]["originalIncidentId"], "FINAL") is None
    assert not run(v).get("accepted")


def test_independent_off_on_or_wrong_sequence_fails_closed(monkeypatch, tmp_path):
    v = fixture(monkeypatch, tmp_path)
    kw = v[-1]
    keys, off = v[6], v[10]
    bad = {
        **kw,
        "read_independent_off": lambda **_: signed(
            keys["receiver"], {**off, "receiverState": "ON"}
        ),
    }
    result = run(v, args=bad)
    assert not result.get("accepted")
    assert result["receiver"] == "UNKNOWN_PENDING_INDEPENDENT_OFF_REVALIDATION"


def test_late_exception_requires_signed_open_custody_and_matching_owner(monkeypatch, tmp_path):
    path = tmp_path / "missing"
    path.mkdir()
    v = fixture(monkeypatch, path, "late_off")
    bad = {**v[-1], "read_exception_custody": None}
    result = run(v, args=bad)
    assert not result.get("accepted")
    assert result["incidentClosureAuthorized"] is False

    another = tmp_path / "false_closure"
    another.mkdir()
    w = fixture(monkeypatch, another, "late_host")
    keys, owner = w[6], w[13]
    false_closure = dual(
        keys["owner"],
        keys["reviewer"],
        {**owner["payload"], "action": ON_TIME_ACTION},
    )
    result = run(w, owners=false_closure)
    assert not result.get("accepted")
    assert result["connection"] == "HOLD"


def test_preflight_authority_invalid_original_host_or_tampered_replay(monkeypatch, tmp_path):
    v = fixture(monkeypatch, tmp_path)
    denied = run(v, args={**v[-1], "attest_operator": None})
    assert not denied.get("accepted")
    assert v[-1]["closure_journal"].read(Ree(), v[5]["originalIncidentId"], "PENDING") is None

    assert run(v)["accepted"]
    journal = v[-1]["closure_journal"]
    with sqlite3.connect(journal.path) as db:
        db.execute(
            "UPDATE closure328 SET receipt_digest=? WHERE stage='PENDING'",
            ("f" * 64,),
        )
    assert not run(v).get("accepted")
    assert journal.status(Ree(), v[5]["originalIncidentId"]) == (
        "HOLD_QL437_PRIVATE_LEDGER_UNREADABLE"
    )


def test_source_projection_cannot_prove_live_off_and_api_is_private():
    projection = reconcile_master_evidence328(PersistentReeMonitor304(enabled=False))
    assert projection["sourceBuild"] == 328
    assert projection["connection"] == "HOLD"
    assert projection["activationAuthorized"] is False
    assert projection["receiver"] == "UNKNOWN_PENDING_INDEPENDENT_OFF_REVALIDATION"
    assert TestClient(app).get("/api/v1/system/master-shell-328-acceptance").status_code in (
        401,
        403,
    )
