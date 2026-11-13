"""QL-438 fail-closed synthetic tests; no physical Windows or external custody."""

import sqlite3

from rosevear_ai_hub import master_shell_acceptance329 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_acceptance327 import LATE_HOST, LATE_OFF, TIMELY


class Ree:
    pass


def test_journal_one_use_and_restart_never_live(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda monitor: True)
    j = q.ProtectedCorrectiveJournal329(tmp_path / "corrective329.db")
    incident = "originalIncident329"
    req = _digest({"request": 329})
    evidence = _digest({"evidence": 329})
    assert j.read(Ree(), incident, "PENDING") is None
    p = j.claim(Ree(), incident, "PENDING", req, req)
    assert p and j.read(Ree(), incident, "PENDING") == p
    assert j.claim(Ree(), incident, "PENDING", req, req) is None
    assert j.claim(Ree(), incident, "CLOSED", evidence, evidence) is None
    c = j.claim(Ree(), incident, "CLOSED", req, evidence)
    assert c and j.read(Ree(), incident, "CLOSED") == c
    assert j.claim(Ree(), incident, "CLOSED", req, evidence) is None
    assert q.reconcile_master_evidence329(Ree())["receiver"] == q.UNKNOWN_OFF


def test_tampered_receipt_detected(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda monitor: True)
    j = q.ProtectedCorrectiveJournal329(tmp_path / "tamper.db")
    req = _digest({"request": 1})
    assert j.claim(Ree(), "incident", "PENDING", req, req)
    with sqlite3.connect(j.path) as db:
        db.execute("UPDATE corrective329 SET receipt_digest=?", ("f" * 64,))
    try:
        j.read(Ree(), "incident", "PENDING")
    except ValueError as exc:
        assert "TAMPERED" in str(exc)
    else:
        raise AssertionError("tamper was not detected")


def test_missing_original_host_or_open_exception_never_claims_closure(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda monitor: True)
    journal = q.ProtectedCorrectiveJournal329(tmp_path / "blocked.db")
    for prior in (
        {},
        {
            "accepted": True,
            "state": "DURABLE_QL437_OWNER_SUPERVISED_INCIDENT_CLOSURE_READBACK",
            "leaseDisposition": TIMELY,
            "leaseExceptionOpen": False,
        },
    ):
        result = q.review_corrective_closure329(
            Ree(),
            prior,
            {},
            journal,
            {},
            read_host=None,
            read_off=None,
            read_reviewer=None,
            read_anchor=None,
            read_reader=None,
            master_reports={},
            owner_signatures={},
        )
        assert result["accepted"] is False
        assert result["connection"] == "HOLD"
        assert result["activationAuthorized"] is False
        assert result["receiver"] == q.UNKNOWN_OFF
    assert not journal.path.exists()


def test_late_paths_are_distinct_and_owner_status_is_source_only():
    assert LATE_HOST in q.REMEDIES and LATE_OFF in q.REMEDIES
    assert q.REMEDIES[LATE_HOST] != q.REMEDIES[LATE_OFF]
    status = q.reconcile_master_evidence329(Ree())
    assert status["sourceBuild"] == 329
    assert status["leaseExceptionOpen"] is True
    assert status["incidentClosureAuthorized"] is False
    assert status["connection"] == "HOLD"
    assert status["activationAuthorized"] is False
    assert status["runtimeUptime"] == "UNKNOWN"


def test_closed_receipt_tampering_never_proves_closure(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda monitor: True)
    journal = q.ProtectedCorrectiveJournal329(tmp_path / "closed-tamper.db")
    request = _digest({"request": "ql438-closed"})
    evidence = _digest({"evidence": "ql438-closed"})
    assert journal.claim(Ree(), "incident-closed", "PENDING", request, request)
    assert journal.claim(Ree(), "incident-closed", "CLOSED", request, evidence)
    with sqlite3.connect(journal.path) as db:
        db.execute(
            "UPDATE corrective329 SET evidence_digest=? WHERE incident=? AND stage=?",
            ("0" * 64, "incident-closed", "CLOSED"),
        )
    import pytest

    with pytest.raises(ValueError, match="TAMPERED"):
        journal.read(Ree(), "incident-closed", "CLOSED")
    assert journal.claim(Ree(), "incident-closed", "CLOSED", request, evidence) is None
    projection = q.reconcile_master_evidence329(Ree())
    assert projection["connection"] == "HOLD"
    assert projection["activationAuthorized"] is False
    assert projection["receiver"] == q.UNKNOWN_OFF


def test_symlinked_journal_is_not_writable(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda monitor: True)
    target = tmp_path / "untrusted.db"
    target.write_bytes(b"do not touch")
    linked = tmp_path / "linked.db"
    linked.symlink_to(target)
    journal = q.ProtectedCorrectiveJournal329(linked)
    digest = _digest({"attempt": "ql438-symlink"})
    assert journal.claim(Ree(), "incident", "PENDING", digest, digest) is None
    assert target.read_bytes() == b"do not touch"


def test_symlinked_journal_cannot_be_read_as_protected_custody(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda monitor: True)
    target = tmp_path / "original.db"
    journal = q.ProtectedCorrectiveJournal329(target)
    digest = _digest({"request": "symlink-readback"})
    assert journal.claim(Ree(), "incident", "PENDING", digest, digest)
    linked = tmp_path / "untrusted-alias.db"
    linked.symlink_to(target)
    alias = q.ProtectedCorrectiveJournal329(linked)
    assert alias.read(Ree(), "incident", "PENDING") is None
    assert alias.claim(Ree(), "incident", "CLOSED", digest, digest) is None
    assert journal.read(Ree(), "incident", "PENDING") is not None


def test_missing_or_malformed_predecessor_custody_digests_fail_before_pending(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda monitor: True)
    for field in ("finalReceiptDigest", "externalAnchorDigest", "independentAnchorReadbackDigest"):
        for invalid in (None, "", "0" * 63, "Z" * 64):
            prior = {
                "accepted": True,
                "state": "DURABLE_QL437_EXPIRED_LEASE_EXCEPTION_OPEN_INDEPENDENT_CUSTODY",
                "leaseExceptionOpen": True,
                "incidentClosureAuthorized": False,
                "connection": "HOLD",
                "activationAuthorized": False,
                "leaseDisposition": LATE_HOST,
                "originalIncidentId": "incident329",
                "nextCeremonyId": "ceremony329",
                "finalReceiptDigest": "a" * 64,
                "externalAnchorDigest": "b" * 64,
                "independentAnchorReadbackDigest": "c" * 64,
            }
            prior[field] = invalid
            request = {
                "remediationNonce": "unique-nonce-329-a",
                "remediationId": "unique-remediation-329",
                "originalIncidentId": "incident329",
                "ql437FinalReceiptDigest": prior["finalReceiptDigest"],
                "ql437AnchorDigest": prior["externalAnchorDigest"],
                "ql437ReaderDigest": prior["independentAnchorReadbackDigest"],
                "leaseDisposition": LATE_HOST,
                "rootCause": q.REMEDIES[LATE_HOST][0],
                "remedy": q.REMEDIES[LATE_HOST][1],
                "sourceRevision": "a" * 40,
                "controllerRevision": "b" * 40,
            }
            journal = q.ProtectedCorrectiveJournal329(tmp_path / f"{field}-{str(invalid)[:5]}.db")
            result = q.review_corrective_closure329(
                Ree(), prior, request, journal, {},
                read_host=lambda **kwargs: None,
                read_off=lambda **kwargs: None,
                read_reviewer=lambda **kwargs: None,
                read_anchor=lambda **kwargs: None,
                read_reader=lambda **kwargs: None,
                master_reports={}, owner_signatures={},
            )
            assert result["accepted"] is False
            assert result["connection"] == "HOLD"
            assert result["activationAuthorized"] is False
            assert not journal.path.exists()
