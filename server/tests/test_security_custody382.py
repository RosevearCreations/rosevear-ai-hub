"""Build382 tests for owner session containment, zero-trust denial, and custody."""

from __future__ import annotations

import json
import shutil
import sqlite3
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.backup import create_backup
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AuditEvent, HubSession
from rosevear_ai_hub.restore_custody382 import (
    CustodyError,
    dependency_manifest382,
    verify_copied_archive382,
)

PASSWORD = "supervised-owner-credential-test-382"
API = "/api/v1/system/security-custody-382"


def setup_api(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'security382.sqlite'}")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    app = create_app()

    def session():
        with factory() as db:
            yield db

    app.dependency_overrides[get_session] = session
    owner = TestClient(app)
    created = owner.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": PASSWORD},
    )
    assert created.status_code == 201, created.text
    added = owner.post(
        "/api/v1/auth/users",
        json={"username": "family", "password": PASSWORD, "role": "household_user"},
    )
    assert added.status_code == 201, added.text
    return app, factory, owner


def login(app, name):
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/login", json={"username": name, "password": PASSWORD}
    )
    assert response.status_code == 200, response.text
    return client


def payload(password=PASSWORD, **rest):
    return {"password": password, "confirmation": "REVOKE_MY_OTHER_SESSIONS", **rest}


def test_owner_only_and_explicit_reauthentication(tmp_path):
    app, factory, owner = setup_api(tmp_path)
    second = login(app, "owner")
    third = login(app, "owner")
    family = login(app, "family")
    posture = owner.get(API + "/posture")
    assert posture.status_code == 200, posture.text
    data = posture.json()
    assert posture.headers["Cache-Control"] == "no-store"
    assert data["activeOtherOwnerSessions"] == 2
    assert data["fieldAcceptance"] == "HOLD"
    assert data["mfaEnforced"] is False
    assert data["tlsCertificateActuallyVerified"] is False
    assert data["offMachineIndependentRestoreVerified"] is False
    assert data["secretValuesRead"] is False
    assert "token" not in str(data).lower()

    assert family.get(API + "/posture").status_code == 403
    assert family.post(API + "/revoke-other-sessions", json=payload()).status_code == 403
    unauth = TestClient(app)
    assert unauth.get(API + "/posture").status_code == 401
    assert unauth.post(API + "/revoke-other-sessions", json=payload()).status_code == 401
    bad = owner.post(API + "/revoke-other-sessions", json=payload("wrong-credential"))
    assert bad.status_code == 403
    assert owner.post(API + "/revoke-other-sessions", json={
        "password": PASSWORD, "confirmation": "yes",
    }).status_code == 422
    assert owner.post(API + "/revoke-other-sessions", json=payload(admin=True)).status_code == 422
    assert second.get("/api/v1/auth/me").status_code == 200
    assert third.get("/api/v1/auth/me").status_code == 200

    completed = owner.post(API + "/revoke-other-sessions", json=payload())
    assert completed.status_code == 200, completed.text
    assert completed.json()["revokedCount"] == 2
    assert completed.json()["currentSessionPreserved"] is True
    assert completed.json()["otherAccountsUnaffected"] is True
    assert second.get("/api/v1/auth/me").status_code == 401
    assert third.get("/api/v1/auth/me").status_code == 401
    assert family.get("/api/v1/auth/me").status_code == 200
    assert owner.get("/api/v1/auth/me").status_code == 200

    retry = owner.post(API + "/revoke-other-sessions", json=payload())
    assert retry.status_code == 200
    assert retry.json()["revokedCount"] == 0
    with factory() as db:
        events = db.scalars(
            select(AuditEvent).where(AuditEvent.event_type == "auth.session.contained382")
        ).all()
        assert len(events) == 2
        count = db.scalar(select(func.count(HubSession.id)).where(HubSession.revoked_at.is_(None)))
        assert count == 2
        combined = str([(event.action, event.result) for event in events])
        assert PASSWORD not in combined


def create_synthetic_archive(tmp_path):
    original = tmp_path / "original_hub"
    database = original / "data" / "rosevear_ai_hub.db"
    database.parent.mkdir(parents=True)
    with sqlite3.connect(database) as db:
        db.execute("CREATE TABLE rehearsal (id INTEGER PRIMARY KEY, status TEXT)")
        db.execute("INSERT INTO rehearsal (status) VALUES ('verified')")
    (original / "data" / "knowledge").mkdir()
    (original / "data" / "knowledge" / "sample.txt").write_text(
        "Safe synthetic record", encoding="utf-8"
    )
    disk_a = tmp_path / "disk_a"
    disk_b = tmp_path / "disk_b"
    disk_a.mkdir()
    disk_b.mkdir()
    archive = disk_a / "sealed.hubbackup"
    copy = disk_b / "sealed.hubbackup"
    secret = tmp_path / "passphrase.txt"
    secret.write_text("synthetic-strong-passphrase-382!", encoding="utf-8")
    create_backup(original, archive, secret)
    shutil.copyfile(archive, copy)
    scratch = tmp_path / "scratch"
    scratch.mkdir()
    return archive, copy, secret, scratch


def test_copy_restore_real_crypto_database_and_no_original_mutation(tmp_path):
    origin, copy, secret, scratch = create_synthetic_archive(tmp_path)
    evidence = tmp_path / "custody.json"
    before = origin.read_bytes()
    result = verify_copied_archive382(origin, copy, secret, scratch, evidence)
    assert result["copyIdenticalToSource"] is True
    assert result["restoreOfExistingCopyTested"] is True
    assert result["sqliteIntegrity"] == "ok"
    assert result["fieldAcceptance"] == "HOLD"
    assert result["differentPhysicalMachineVerified"] is False
    assert result["offMachineCopyIndependentlyWitnessed"] is False
    assert result["retentionDeletionPerformed"] is False
    assert origin.read_bytes() == before
    assert copy.read_bytes() == before
    assert list(scratch.iterdir()) == []
    assert json.loads(evidence.read_text())["encryptedSha256"] == result["encryptedSha256"]
    with pytest.raises(CustodyError):
        verify_copied_archive382(origin, copy, secret, scratch, evidence)


def test_copy_tampering_samefile_symlink_and_stale_are_not_accepted(tmp_path):
    origin, copy, secret, scratch = create_synthetic_archive(tmp_path)
    with pytest.raises(CustodyError):
        verify_copied_archive382(origin, origin, secret, scratch)
    copy.write_bytes(copy.read_bytes() + b"tamper")
    with pytest.raises(CustodyError):
        verify_copied_archive382(origin, copy, secret, scratch)
    assert list(scratch.iterdir()) == []
    shutil.copyfile(origin, copy)
    now = datetime.fromtimestamp(copy.stat().st_mtime, UTC) + timedelta(days=9)
    report = verify_copied_archive382(origin, copy, secret, scratch, now=now)
    assert report["backupFreshness"] == "OLD_BACKUP_REVIEW"
    assert report["fieldAcceptance"] == "HOLD"
    linked = tmp_path / "linked.hubbackup"
    try:
        linked.symlink_to(origin)
    except (OSError, NotImplementedError):
        pytest.skip("Symlink creation unavailable")
    with pytest.raises(CustodyError):
        verify_copied_archive382(origin, linked, secret, scratch)


def test_manifest_declared_only_and_reject_linked_source(tmp_path):
    root = Path(__file__).resolve().parents[2]
    declaration = dependency_manifest382(root)
    assert declaration["scope"] == "SOURCE_DECLARATIONS_NOT_RESOLVED_SBOM"
    assert declaration["vulnerabilityScanPerformed"] is False
    assert declaration["transitiveDependenciesAudited"] is False
    assert any("fastapi" in x for x in declaration["declaredDependencies"]["python.runtime"])
    assert "react" in declaration["declaredDependencies"]["web.runtime"]
    assert len(declaration["sourceFilesSha256"]) == 3
    with pytest.raises(CustodyError):
        dependency_manifest382(tmp_path)
