"""Build 286 candidate matching, bounded process mapping and owner access."""

import json
import subprocess
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub import windows_launcher_evidence286 as launcher
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base


def _snapshot() -> dict:
    observation = {
        "listener": "observed",
        "ancestor_kinds": ["node", "powershell"],
        "chain_hops_inspected": 2,
        "chain_status": "partial_or_complete",
        "recovery_script_mentioned": False,
        "process_predates_checkout_commit": False,
        "launch_source": "unknown",
        "private_password": "SECRET",
    }
    return {
        "schema": "rosevear-windows-launcher-custody-259/v1",
        "source": "on_device_read_only",
        "observed_at": "2026-11-08T23:00:00Z",
        "checkout_sha_candidate": "a" * 40,
        "startup_task_state": "enabled",
        "web_launcher": observation,
        "backend_launcher": observation,
        **{flag: False for flag in launcher.FALSE_FLAGS},
        "remote_requests": 0,
        "raw_command": "password=PRIVATE",
    }


def test_non_windows_never_invokes_powershell(tmp_path, monkeypatch):
    monkeypatch.setattr(launcher, "is_windows_host", lambda: False)
    monkeypatch.setattr(
        launcher.subprocess,
        "run",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("unexpected launch")),
    )
    result = launcher.collect_windows_launcher_evidence(tmp_path)
    assert result["candidate_comparison"] == "NOT_WINDOWS"
    assert result["web_launcher"] is None
    assert result["installed_release_verified"] is False
    assert result["external_requests"] == 0


def test_candidate_matching_is_never_binary_proof(tmp_path, monkeypatch):
    script = tmp_path / "scripts" / "inspect-hub-launcher-259.ps1"
    script.parent.mkdir()
    script.write_text("read-only inspector stub", encoding="utf-8")
    pointer = tmp_path / "logs" / "hub-deployment" / "active.json"
    pointer.parent.mkdir(parents=True)
    pointer.write_text(json.dumps({"sha": "a" * 40}), encoding="utf-8")
    monkeypatch.setattr(launcher, "is_windows_host", lambda: True)
    calls = []

    def capture(argv, **kwargs):
        calls.append((argv, kwargs))
        return SimpleNamespace(returncode=0, stdout=json.dumps(_snapshot()))

    monkeypatch.setattr(launcher.subprocess, "run", capture)
    result = launcher.collect_windows_launcher_evidence(tmp_path)
    assert result["candidate_comparison"] == "CANDIDATES_MATCH"
    assert result["checkout_sha_candidate"] == "a" * 40
    assert result["web_launcher"]["ancestor_kinds"] == ["node", "powershell"]
    assert result["installed_release_verified"] is False
    assert result["independent_witness_verified"] is False
    assert result["master_shell_reporting_authorized"] is False
    assert result["made_changes"] is False
    assert "SECRET" not in json.dumps(result)
    assert "PRIVATE" not in json.dumps(result)
    assert calls[0][0][:4] == ["powershell.exe", "-NoProfile", "-NonInteractive", "-File"]
    assert calls[0][1]["timeout"] == 20
    assert calls[0][1]["check"] is False
    changed = _snapshot()
    changed["checkout_sha_candidate"] = "b" * 40
    monkeypatch.setattr(
        launcher.subprocess,
        "run",
        lambda *_args, **_kwargs: SimpleNamespace(
            returncode=0, stdout=json.dumps(changed)
        ),
    )
    assert (
        launcher.collect_windows_launcher_evidence(tmp_path)["candidate_comparison"]
        == "CANDIDATES_DIFFER"
    )


def test_untrusted_inspector_rejected_without_raw_output(tmp_path, monkeypatch):
    script = tmp_path / "scripts" / "inspect-hub-launcher-259.ps1"
    script.parent.mkdir()
    script.write_text("stub", encoding="utf-8")
    monkeypatch.setattr(launcher, "is_windows_host", lambda: True)
    for modification in (
        {"process_attested": True},
        {"remote_requests": 1},
        {"checkout_sha_candidate": "password=SECRET"},
        {"web_launcher": {"ancestor_kinds": ["PRIVATE_PATH"]}},
    ):
        raw = {**_snapshot(), **modification}
        response_text = json.dumps(raw)
        monkeypatch.setattr(
            launcher.subprocess,
            "run",
            lambda *_args, **_kwargs: SimpleNamespace(
                returncode=0, stdout=response_text
            ),
        )
        result = launcher.collect_windows_launcher_evidence(tmp_path)
        assert result["candidate_comparison"] == "INSPECTOR_UNAVAILABLE"
        assert "PRIVATE" not in json.dumps(result)
        assert "SECRET" not in json.dumps(result)

    def timeout(_argv, **_kwargs):
        raise subprocess.TimeoutExpired("powershell.exe", 20, output="SECRET")

    monkeypatch.setattr(launcher.subprocess, "run", timeout)
    assert (
        launcher.collect_windows_launcher_evidence(tmp_path)["candidate_comparison"]
        == "INSPECTOR_UNAVAILABLE"
    )


def test_owner_only_endpoint_and_no_cache(tmp_path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'launcher286.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(bind=engine, expire_on_commit=False)

    def local_session():
        with maker() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = local_session
    client = TestClient(app)
    url = "/api/v1/system/windows-launcher-evidence"
    assert client.get(url).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "owner-windows-286-secret"},
        ).status_code
        == 201
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.api.resources.collect_windows_launcher_evidence",
        lambda _root: {"installed_release_verified": False},
    )
    response = client.get(url)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["installed_release_verified"] is False
    assert (
        client.post(
            "/api/v1/auth/users",
            json={
                "username": "family",
                "password": "family-windows-286-secret",
                "role": "household_user",
            },
        ).status_code
        == 201
    )
    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "family", "password": "family-windows-286-secret"},
        ).status_code
        == 200
    )
    assert client.get(url).status_code == 403
