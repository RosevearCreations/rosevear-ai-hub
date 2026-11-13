"""Build 331 private status authorization and protected issuance custody."""

import os

import pytest
from fastapi.testclient import TestClient

from rosevear_ai_hub import master_shell_issuance331 as q
from rosevear_ai_hub.main import app
from test_master_shell_acceptance322 import Ree


def test_ql440_private_owner_api_not_public():
    assert TestClient(app).get("/api/v1/system/master-shell-331-issuance").status_code in (
        401, 403
    )


def test_ql440_issuance_journal_exclusive_and_restart_unknown(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    journal = q.ProtectedIssuanceJournal331(tmp_path / "private")
    incident = "originalIncident331"
    request = "a" * 64
    assert journal.claim(Ree(), incident, "ISSUED", request, "b" * 64) is None
    assert journal.claim(Ree(), incident, "PENDING", request, "b" * 64)
    assert journal.claim(Ree(), incident, "PENDING", request, "b" * 64) is None
    assert journal.claim(Ree(), incident, "ISSUED", request, "c" * 64)
    assert journal.claim(Ree(), incident, "ISSUED", request, "c" * 64) is None
    restart = q.private_readback331(Ree(), journal, incident)
    assert restart["ceremonyAuthorizationIssued"] is False
    assert restart["connection"] == "HOLD"
    assert restart["receiver"] == q.UNKNOWN
    if os.name != "nt":
        assert journal.directory.stat().st_mode & 0o077 == 0
        assert journal._path(incident, "PENDING").stat().st_mode & 0o077 == 0


def test_partial_pending_tamper_blocks_issue(monkeypatch, tmp_path):
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    journal = q.ProtectedIssuanceJournal331(tmp_path / "private")
    assert journal.claim(Ree(), "incident", "PENDING", "a" * 64, "b" * 64)
    journal._path("incident", "PENDING").write_text("garbled", encoding="utf-8")
    with pytest.raises(ValueError):
        journal.read(Ree(), "incident", "PENDING")
    assert journal.claim(Ree(), "incident", "PENDING", "a" * 64, "b" * 64) is None
    assert journal.claim(Ree(), "incident", "ISSUED", "a" * 64, "c" * 64) is None
