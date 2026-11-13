"""QL-439 fsynced, exclusive and tamper-evident single-use custody regressions."""

import os

import pytest

from rosevear_ai_hub import master_shell_readiness330 as q
from test_master_shell_acceptance322 import Ree


def test_pending_exclusive_and_final_one_use(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    journal = q.ProtectedReadinessJournal330(tmp_path / "private")
    request = "a" * 64
    prior = "b" * 64
    assert journal.claim(Ree(), "incidentOne", "READINESS", request, prior) is None
    pending = journal.claim(Ree(), "incidentOne", "PENDING", request, prior)
    assert pending and pending["receiptDigest"]
    assert journal.claim(Ree(), "incidentOne", "PENDING", request, prior) is None
    assert journal.claim(Ree(), "incidentOne", "READINESS", request, prior + "bad") is None
    ready = journal.claim(Ree(), "incidentOne", "READINESS", request, prior)
    assert ready and ready["receiptDigest"] != pending["receiptDigest"]
    assert journal.claim(Ree(), "incidentOne", "READINESS", request, prior) is None
    assert journal.read(Ree(), "incidentOne", "PENDING") == pending
    assert journal.read(Ree(), "incidentOne", "READINESS") == ready
    assert q.private_readback330(Ree(), journal, "incidentOne")["receiver"] == q.UNKNOWN
    if os.name != "nt":
        assert journal.directory.stat().st_mode & 0o077 == 0
        assert journal._path("incidentOne", "PENDING").stat().st_mode & 0o077 == 0


def test_interrupted_partial_pending_can_never_be_reused(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    journal = q.ProtectedReadinessJournal330(tmp_path / "private")
    assert journal.claim(Ree(), "incidentOne", "PENDING", "a" * 64, "b" * 64)
    file = journal._path("incidentOne", "PENDING")
    file.write_text('{"interrupted":true}', encoding="utf-8")
    with pytest.raises(ValueError):
        journal.read(Ree(), "incidentOne", "PENDING")
    assert journal.claim(Ree(), "incidentOne", "PENDING", "a" * 64, "b" * 64) is None
    with pytest.raises(ValueError):
        journal.claim(Ree(), "incidentOne", "READINESS", "a" * 64, "b" * 64)


@pytest.mark.skipif(os.name == "nt", reason="POSIX-only symlink exercise")
def test_symlinked_custody_directory_denied(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    actual = tmp_path / "real"
    actual.mkdir()
    alias = tmp_path / "alias"
    alias.symlink_to(actual, target_is_directory=True)
    journal = q.ProtectedReadinessJournal330(alias)
    assert journal.claim(Ree(), "incidentOne", "PENDING", "a" * 64, "b" * 64) is None
    assert journal.read(Ree(), "incidentOne", "PENDING") is None
