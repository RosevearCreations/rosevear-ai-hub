"""QL-442 protected private custody is one-use and cannot prove current OFF."""

import json
import os

import pytest

from rosevear_ai_hub import master_shell_decision333 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from test_master_shell_acceptance322 import Ree

INCIDENT = "incidentShutdownOriginal333"
REQUEST = _digest({"request": "QL442-original"})
EVIDENCE = _digest({"evidence": "signed-independent-off"})


def make(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    return q.ProtectedWitnessJournal333(tmp_path / "original-private-ql442")


@pytest.mark.parametrize("last", ["CLOSED", "EXCEPTION"])
def test_exclusive_pending_and_terminal_receipt(monkeypatch, tmp_path, last):
    journal = make(monkeypatch, tmp_path)
    pending = journal.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST)
    assert pending
    assert journal.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST) is None
    terminal = journal.claim(Ree(), INCIDENT, last, REQUEST, EVIDENCE)
    assert terminal and terminal["stage"] == last
    assert journal.read(Ree(), INCIDENT, last) == terminal
    other = "EXCEPTION" if last == "CLOSED" else "CLOSED"
    assert journal.claim(Ree(), INCIDENT, other, REQUEST, EVIDENCE) is None
    assert journal.claim(Ree(), INCIDENT, last, REQUEST, EVIDENCE) is None
    status = q.read_private_decision333(Ree(), journal, INCIDENT)
    assert status["connection"] == "HOLD"
    assert status["activationAuthorized"] is False
    assert status["receiver"] == q.UNKNOWN
    assert "historicalReceiptDigest" in status


def test_missing_pending_or_replay_cannot_finalize(monkeypatch, tmp_path):
    journal = make(monkeypatch, tmp_path)
    assert journal.claim(Ree(), INCIDENT, "CLOSED", REQUEST, EVIDENCE) is None
    assert journal.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST)
    changed = _digest({"different": "replay"})
    assert journal.claim(Ree(), INCIDENT, "PENDING", changed, changed) is None
    assert journal.claim(Ree(), INCIDENT, "CLOSED", changed, EVIDENCE) is None


def test_tampered_pending_blocks_closed_and_exception(monkeypatch, tmp_path):
    journal = make(monkeypatch, tmp_path)
    assert journal.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST)
    path = journal._path(INCIDENT, "PENDING")
    data = json.loads(path.read_text())
    data["receiptDigest"] = "f" * 64
    path.write_text(json.dumps(data))
    with pytest.raises(ValueError, match="tampered"):
        journal.read(Ree(), INCIDENT, "PENDING")
    assert journal.claim(Ree(), INCIDENT, "CLOSED", REQUEST, EVIDENCE) is None
    assert journal.claim(Ree(), INCIDENT, "EXCEPTION", REQUEST, EVIDENCE) is None
    assert q.read_private_decision333(Ree(), journal, INCIDENT)["connection"] == "HOLD"


def test_symlinked_pending_alias_refused(monkeypatch, tmp_path):
    journal = make(monkeypatch, tmp_path)
    journal.directory.mkdir(mode=0o700)
    original = journal.directory / "other.json"
    original.write_text("{}")
    link = journal._path(INCIDENT, "PENDING")
    try:
        link.symlink_to(original)
    except (OSError, NotImplementedError):
        pytest.skip("symlink not available")
    assert journal.read(Ree(), INCIDENT, "PENDING") is None
    assert journal.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST) is None


def test_restrictive_private_permissions(monkeypatch, tmp_path):
    if os.name == "nt":
        pytest.skip("POSIX permission enforcement only")
    journal = make(monkeypatch, tmp_path)
    assert journal.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST)
    os.chmod(journal._path(INCIDENT, "PENDING"), 0o644)
    with pytest.raises(ValueError, match="unprotected"):
        journal.read(Ree(), INCIDENT, "PENDING")
    assert journal.claim(Ree(), INCIDENT, "CLOSED", REQUEST, EVIDENCE) is None


def test_unauthorized_monitor_cannot_read_or_write(monkeypatch, tmp_path):
    journal = make(monkeypatch, tmp_path)
    assert journal.claim(Ree(), INCIDENT, "PENDING", REQUEST, REQUEST)
    monkeypatch.setattr(q, "_on_ree", lambda _: False)
    assert journal.read(Ree(), INCIDENT, "PENDING") is None
    assert journal.claim(Ree(), INCIDENT, "CLOSED", REQUEST, EVIDENCE) is None
    assert q.read_private_decision333(Ree(), journal, INCIDENT)["connection"] == "HOLD"
