"""Build 243: local, owner-authorized release task request with fail-closed gates."""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api import release_update_control as control
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base

A = "a" * 40


def state(tmp_path, monkeypatch, *, task="configured", recovery="enabled", windows=True):
    home = tmp_path / "logs" / "hub-deployment"
    home.mkdir(parents=True, exist_ok=True)
    (home / "active.json").write_text(json.dumps({"sha": A, "secret": "DO_NOT_SHARE"}))
    (home / "activation.json").write_text(json.dumps({"phase": "committed"}))
    (tmp_path / "logs" / "hub-release-adoption.json").write_text(
        json.dumps({"state": "ADOPTED", "release": A, "detail": "DO_NOT_SHARE"})
    )
    key = tmp_path / "logs" / "private-recovery" / "backup-key.dpapi"
    key.parent.mkdir(parents=True)
    key.write_text("not a real key - fixture")
    (tmp_path / "scripts").mkdir(exist_ok=True)
    (tmp_path / "scripts" / "hub-auto-update.ps1").write_text("fixture")
    monkeypatch.setattr(control, "is_windows", lambda: windows)
    monkeypatch.setattr(
        control,
        "task_evidence",
        lambda root: {
            "adoption_task": task,
            "recovery_task": recovery,
            "event_610": "none",
        },
    )
    return control.inspect_update(tmp_path)


def test_read_only_missing_enrollment_fails_closed(tmp_path, monkeypatch):
    before = list(tmp_path.iterdir())
    monkeypatch.setattr(control, "is_windows", lambda: False)
    monkeypatch.setattr(
        control,
        "task_evidence",
        lambda root: {
            "adoption_task": "not_installed",
            "recovery_task": "unavailable",
            "event_610": "unavailable",
        },
    )
    report = control.inspect_update(tmp_path)
    assert report["state"] == "setup_or_review_required"
    assert "release_task_not_enrolled" in report["blockers"]
    assert "first_supervised_activation_required" in report["blockers"]
    assert "windows_host_required" in report["blockers"]
    assert report["install_verified"] is False
    assert list(tmp_path.iterdir()) == before


def test_enrollment_backup_journal_failure_and_secret_sanitization(tmp_path, monkeypatch):
    report = state(tmp_path, monkeypatch)
    assert report["state"] == "ready_to_request"
    assert report["active_release"] == A
    assert report["install_verified"] is False
    assert "DO_NOT_SHARE" not in json.dumps(report)
    broken = state(tmp_path, monkeypatch, recovery="mismatch")
    assert "recovery_task_not_verified" in broken["blockers"]
    (tmp_path / "logs" / "hub-deployment" / "activation.json").write_text(
        json.dumps({"phase": "activating"})
    )
    report = control.inspect_update(tmp_path)
    assert "incomplete_activation_requires_recovery" in report["blockers"]
    (tmp_path / "logs" / "hub-release-adoption.json").write_text(
        json.dumps({"state": "ROLLBACK_FAILED"})
    )
    assert "previous_failure_requires_owner_review" in control.inspect_update(tmp_path)["blockers"]


def test_only_local_browser_can_initiate_task():
    allowed = SimpleNamespace(
        headers={"origin": "http://127.0.0.1:5173"},
        client=SimpleNamespace(host="127.0.0.1"),
    )
    control.validate_local_operator(allowed)
    for origin, host in [
        ("https://other.example", "127.0.0.1"),
        ("http://127.0.0.1:5173", "192.0.2.1"),
        (None, "127.0.0.1"),
    ]:
        request = SimpleNamespace(
            headers={"origin": origin} if origin else {},
            client=SimpleNamespace(host=host),
        )
        with pytest.raises(HTTPException) as exc:
            control.validate_local_operator(request)
        assert exc.value.status_code == 403


def test_fixed_task_invocation_only(monkeypatch):
    seen = []

    def fake_run(args, **kwargs):
        seen.append((args, kwargs))
        return SimpleNamespace(returncode=0)

    monkeypatch.setattr(control.subprocess, "run", fake_run)
    assert control.launch_enrolled_update() is True
    assert seen[0][0] == [
        "schtasks.exe",
        "/Run",
        "/TN",
        "Rosevear AI Hub Release Adoption",
    ]
    assert seen[0][1].get("shell", False) is False
    assert seen[0][1]["timeout"] == 15
    monkeypatch.setattr(
        control.subprocess,
        "run",
        lambda *args, **kw: SimpleNamespace(returncode=1),
    )
    assert control.launch_enrolled_update() is False


def test_endpoint_auth_role_origin_consent_and_hold(tmp_path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'roles.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(bind=engine, expire_on_commit=False)

    def session_override():
        with maker() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_session] = session_override
    client = TestClient(app)
    url = "/api/v1/system/update-control"
    assert client.get(url).status_code == 401
    assert client.post(url + "/request", json={}).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "owner-very-secret-123"},
        ).status_code
        == 201
    )

    monkeypatch.setattr(control, "inspect_update", lambda root: {"blockers": []})
    called = []
    monkeypatch.setattr(control, "launch_enrolled_update", lambda: called.append(True) or True)
    assert (
        client.post(
            url + "/request", json={"consent": True, "confirmation": "START VERIFIED UPDATE"}
        ).status_code
        == 403
    )
    monkeypatch.setattr(control, "validate_local_operator", lambda req: None)
    assert (
        client.post(
            url + "/request", json={"consent": False, "confirmation": "START VERIFIED UPDATE"}
        ).status_code
        == 422
    )
    assert (
        client.post(
            url + "/request", json={"consent": True, "confirmation": "NOT VERIFIED"}
        ).status_code
        == 422
    )
    assert called == []

    monkeypatch.setattr(
        control, "inspect_update", lambda root: {"blockers": ["release_task_not_enrolled"]}
    )
    assert (
        client.post(
            url + "/request", json={"consent": True, "confirmation": "START VERIFIED UPDATE"}
        ).status_code
        == 409
    )
    assert called == []
    monkeypatch.setattr(control, "inspect_update", lambda root: {"blockers": []})
    response = client.post(
        url + "/request", json={"consent": True, "confirmation": "START VERIFIED UPDATE"}
    )
    assert response.status_code == 202
    assert response.json()["installation_complete"] is False
    assert response.json()["restart_verified"] is False
    assert called == [True]

    added = client.post(
        "/api/v1/auth/users",
        json={
            "username": "family",
            "password": "family-very-secret-123",
            "role": "household_user",
        },
    )
    assert added.status_code == 201
    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "family", "password": "family-very-secret-123"},
        ).status_code
        == 200
    )
    assert client.get(url).status_code == 403
    assert (
        client.post(
            url + "/request", json={"consent": True, "confirmation": "START VERIFIED UPDATE"}
        ).status_code
        == 403
    )
    assert called == [True]
