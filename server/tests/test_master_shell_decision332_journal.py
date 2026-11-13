"""QL-441 private journal is single-use and cannot establish live receiver state."""

import json
import os

import pytest

from rosevear_ai_hub import master_shell_decision332 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from test_master_shell_acceptance322 import Ree

INCIDENT = "originalIncidentPrivateWitness332"
REQUEST = _digest({"challenge": "single-use-witness"})
EVIDENCE = _digest({"evidence": "signed-witness-only"})


def journal(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda monitor: True)
    return q.ProtectedWitnessJournal332(tmp_path / "original-host-private")


def test_fsynced_pending_then_decision_are_one_use(monkeypatch, tmp_path):
    ledger = journal(monkeypatch, tmp_path)
    pending = ledger.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST)
    assert pending and pending["stage"] == "PENDING"
    assert ledger.read(Ree(), INCIDENT, "PENDING") == pending
    assert ledger.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST) is None
    final = ledger.claim(Ree(), INCIDENT, "DECISION", REQUEST, EVIDENCE)
    assert final and final["stage"] == "DECISION"
    assert ledger.read(Ree(), INCIDENT, "DECISION") == final
    assert ledger.claim(Ree(), INCIDENT, "DECISION", REQUEST, EVIDENCE) is None
    status = q.read_private_decision332(Ree(), ledger, INCIDENT)
    assert status["privateDecisionPresent"] is True
    assert status["connection"] == "HOLD"
    assert status["activationAuthorized"] is False
    assert status["receiver"] == q.UNKNOWN
    assert status["independentFreshOffRequired"] is True


def test_missing_pending_cannot_claim_decision(monkeypatch, tmp_path):
    ledger = journal(monkeypatch, tmp_path)
    assert ledger.claim(Ree(), INCIDENT, "DECISION", REQUEST, EVIDENCE) is None
    assert not ledger.read(Ree(), INCIDENT, "DECISION")


def test_interrupted_pending_consumes_incident(monkeypatch, tmp_path):
    ledger = journal(monkeypatch, tmp_path)
    assert ledger.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST)
    changed = _digest({"challenge": "replayed-or-updated"})
    assert ledger.claim(Ree(), INCIDENT, "PENDING", changed, changed) is None
    assert ledger.claim(Ree(), INCIDENT, "DECISION", changed, EVIDENCE) is None
    assert ledger.read(Ree(), INCIDENT, "DECISION") is None


def test_tampered_digest_and_extra_field_fail_closed(monkeypatch, tmp_path):
    ledger = journal(monkeypatch, tmp_path)
    assert ledger.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST)
    path = ledger._path(INCIDENT, "PENDING")
    data = json.loads(path.read_text())
    data["receiptDigest"] = "a" * 64
    path.write_text(json.dumps(data))
    with pytest.raises(ValueError, match="tampered"):
        ledger.read(Ree(), INCIDENT, "PENDING")
    assert ledger.claim(Ree(), INCIDENT, "DECISION", REQUEST, EVIDENCE) is None


def test_symlinked_receipt_refused(monkeypatch, tmp_path):
    ledger = journal(monkeypatch, tmp_path)
    ledger.directory.mkdir()
    source = ledger.directory / "source.json"
    source.write_text("{}")
    link = ledger._path(INCIDENT, "PENDING")
    try:
        link.symlink_to(source)
    except (OSError, NotImplementedError):
        pytest.skip("symlinks unavailable on this host")
    assert ledger.read(Ree(), INCIDENT, "PENDING") is None
    assert ledger.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST) is None


def test_private_permissions_required(monkeypatch, tmp_path):
    if os.name == "nt":
        pytest.skip("POSIX mode check is not applied on Windows")
    ledger = journal(monkeypatch, tmp_path)
    assert ledger.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST)
    os.chmod(ledger._path(INCIDENT, "PENDING"), 0o644)
    with pytest.raises(ValueError, match="unprotected"):
        ledger.read(Ree(), INCIDENT, "PENDING")
    assert ledger.claim(Ree(), INCIDENT, "DECISION", REQUEST, EVIDENCE) is None


def test_unauthorized_monitor_cannot_access(monkeypatch, tmp_path):
    ledger = journal(monkeypatch, tmp_path)
    assert ledger.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST)
    monkeypatch.setattr(q, "_on_ree", lambda monitor: False)
    assert ledger.read(Ree(), INCIDENT, "PENDING") is None
    assert ledger.claim(Ree(), INCIDENT, "DECISION", REQUEST, EVIDENCE) is None
    status = q.read_private_decision332(Ree(), ledger, INCIDENT)
    assert status["connection"] == "HOLD"
    assert status["privateDecisionPresent"] is False
