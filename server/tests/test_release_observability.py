"""Build 062 fixed-field, no-write enrollment status contract."""

from __future__ import annotations

import json
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub import release_observability
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base

A = "a" * 40
B = "b" * 40


def test_missing_evidence_is_not_healthy_or_enrolled(tmp_path, monkeypatch):
    monkeypatch.setattr(
        release_observability,
        "task_evidence",
        lambda root: {
            "adoption_task": "not_installed",
            "recovery_task": "unavailable",
            "event_610": "none",
        },
    )
    previous = list(tmp_path.rglob("*"))
    data = release_observability.collect_release_observability(tmp_path)
    assert data["adoption_state"] == "UNVERIFIED"
    assert data["adoption_task"] == "not_installed"
    assert data["enrollment_ready"] is False
    assert data["installed_runtime_verified"] is False
    assert list(tmp_path.rglob("*")) == previous


def test_sanitizes_secret_fields_invalid_timestamps_and_unknown_states(tmp_path, monkeypatch):
    home = tmp_path / "logs" / "hub-deployment"
    home.mkdir(parents=True)
    (tmp_path / "logs" / "hub-release-adoption.json").write_text(
        json.dumps(
            {
                "state": "FAILED",
                "detail": "password=private localhost:1234",
                "release": B,
                "checked_utc": "2026-10-13T18:00:00Z",
            }
        )
    )
    (home / "active.json").write_text(json.dumps({"sha": A, "token": "private"}))
    (home / "activation.json").write_text(json.dumps({"phase": "activating"}))
    (home / "last-alert.json").write_text(
        json.dumps({"signature": "SECRET|FAILED", "notified_utc": "2026-10-13T18:03:00Z"})
    )
    monkeypatch.setattr(
        release_observability,
        "task_evidence",
        lambda root: {
            "adoption_task": "configured",
            "recovery_task": "enabled",
            "event_610": "present",
        },
    )
    data = release_observability.collect_release_observability(tmp_path)
    assert data["active_release"] == A
    assert data["last_release"] == B
    assert data["adoption_state"] == "FAILED"
    assert data["journal_state"] == "activating"
    assert data["failure_event_610"] == "present"
    assert data["enrollment_ready"] is False
    assert "private" not in json.dumps(data).lower()
    assert "SECRET" not in json.dumps(data)


def test_malformed_and_oversized_documents_never_escape(tmp_path, monkeypatch):
    home = tmp_path / "logs" / "hub-deployment"
    home.mkdir(parents=True)
    (home / "active.json").write_text("{bad")
    (home / "activation.json").write_text("Z" * 20000)
    monkeypatch.setattr(
        release_observability,
        "task_evidence",
        lambda root: {
            "adoption_task": "unavailable",
            "recovery_task": "unavailable",
            "event_610": "unavailable",
        },
    )
    data = release_observability.collect_release_observability(tmp_path)
    assert data["active_release"] is None
    assert data["journal_state"] == "unverified"


def test_windows_task_result_is_strictly_enumerated(tmp_path, monkeypatch):
    monkeypatch.setattr(release_observability, "is_windows", lambda: True)
    (tmp_path / "scripts").mkdir()
    (tmp_path / "scripts" / "inspect-hub-release-tasks.ps1").write_text("read only fixture")
    monkeypatch.setattr(
        release_observability.subprocess,
        "run",
        lambda *a, **kw: SimpleNamespace(
            returncode=0,
            stdout=json.dumps(
                {
                    "adoption_task": "configured",
                    "recovery_task": "leak private value",
                    "event_610": "present",
                    "command_line": "secret",
                }
            ),
        ),
    )
    assert release_observability.task_evidence(tmp_path) == {
        "adoption_task": "configured",
        "recovery_task": "unavailable",
        "event_610": "present",
    }


def test_endpoint_owner_only_and_no_store(tmp_path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'roles.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(bind=engine, expire_on_commit=False)

    def session_override():
        with maker() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = session_override
    client = TestClient(app)
    path = "/api/v1/system/release-observability"
    assert client.get(path).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "observability-owner-secret-123"},
        ).status_code
        == 201
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.api.resources.collect_release_observability",
        lambda root: {
            "scope": "local_read_only",
            "adoption_state": "HOLD",
            "enrollment_ready": False,
        },
    )
    r = client.get(path)
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-store"
    assert r.json()["enrollment_ready"] is False
    added = client.post(
        "/api/v1/auth/users",
        json={"username": "family", "password": "observer-password-123", "role": "household_user"},
    )
    assert added.status_code == 201
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login", json={"username": "family", "password": "observer-password-123"}
        ).status_code
        == 200
    )
    assert client.get(path).status_code == 403
