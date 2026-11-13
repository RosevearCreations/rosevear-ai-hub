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
