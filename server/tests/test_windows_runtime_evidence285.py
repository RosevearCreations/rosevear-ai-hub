"""Build 285: read-only local Windows observation, privacy and role checks."""

import json
import subprocess
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub import windows_runtime_evidence285 as runtime
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base


def test_non_windows_never_probes_services_or_invents_machine_proof(tmp_path, monkeypatch):
    monkeypatch.setattr(runtime, "is_windows_host", lambda: False)

    def unexpected_probe(_name):
        raise AssertionError("unexpected probe")

    monkeypatch.setattr(runtime, "windows_service_status", unexpected_probe)
    result = runtime.collect_windows_runtime_evidence(tmp_path)
    assert result["host_platform"] == "NOT_WINDOWS"
    assert result["api_process"]["state"] == "RESPONDED"
    assert all(row["status"] == "NOT_SAMPLED" for row in result["services"])
    assert result["recorded_active_release_sha"] is None
    assert result["installed_binary_verified"] is False
    assert result["windows_device_identity_verified"] is False
    assert result["independent_witness_verified"] is False
    assert result["master_shell_reporting_authorized"] is False
    assert result["external_requests"] == 0


def test_windows_service_reads_are_allowlisted_and_never_expose_raw_output(tmp_path, monkeypatch):
    monkeypatch.setattr(runtime, "is_windows_host", lambda: True)
    calls = []

    def fake_run(argv, **kwargs):
        calls.append((argv, kwargs))
        if argv[-1] == "Tailscale":
            return SimpleNamespace(returncode=0, stdout="STATE : 4 RUNNING\npassword=PRIVATE_TOKEN")
        if argv[-1] == "mosquitto":
            return SimpleNamespace(returncode=0, stdout="STATE : 1 STOPPED")
        if argv[-1] == "caddy":
            return SimpleNamespace(returncode=1060, stdout="access_key=SECRET")
        return SimpleNamespace(returncode=9, stdout="PRIVATE_PATH")

    monkeypatch.setattr(runtime.subprocess, "run", fake_run)
    active = tmp_path / "logs" / "hub-deployment" / "active.json"
    active.parent.mkdir(parents=True)
    active.write_text(json.dumps({"sha": "a" * 40, "private_path": "C:\\secret"}), encoding="utf-8")
    result = runtime.collect_windows_runtime_evidence(tmp_path)
    assert result["host_platform"] == "WINDOWS"
    assert result["recorded_active_release_sha"] == "a" * 40
    assert result["recorded_release_basis"] == "UNVERIFIED_LOCAL_POINTER"
    assert [row["status"] for row in result["services"]] == [
        "RUNNING",
        "STOPPED",
        "NOT_REGISTERED",
        "UNAVAILABLE",
    ]
    assert len(calls) == 4
    assert all(cmd[:2] == ["sc.exe", "query"] for cmd, _ in calls)
    assert all(args["timeout"] == 3 and args["check"] is False for _, args in calls)
    assert all(args["capture_output"] is True for _, args in calls)
    assert not any(
        key in json.dumps(result)
        for key in ["PRIVATE_TOKEN", "PRIVATE_PATH", "SECRET", "C:\\secret"]
    )
    assert runtime.windows_service_status("cmd.exe /c anything") == "UNAVAILABLE"
    assert len(calls) == 4


def test_service_errors_and_malformed_results_fail_closed(monkeypatch):
    def fail(_argv, **_kwargs):
        raise subprocess.TimeoutExpired("sc.exe", 3, output="SECRET")

    monkeypatch.setattr(runtime.subprocess, "run", fail)
    assert runtime.windows_service_status("Tailscale") == "UNAVAILABLE"
    monkeypatch.setattr(
        runtime.subprocess,
        "run",
        lambda *_args, **_kwargs: SimpleNamespace(returncode=0, stdout="unrecognized SECRET"),
    )
    assert runtime.windows_service_status("Tailscale") == "UNAVAILABLE"


def test_windows_runtime_endpoint_requires_owner_or_administrator(tmp_path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'runtime285.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(bind=engine, expire_on_commit=False)

    def session_override():
        with maker() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = session_override
    client = TestClient(app)
    address = "/api/v1/system/windows-runtime-evidence"
    assert client.get(address).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={
                "username": "owner",
                "password": "windows-owner-secret-123",
            },
        ).status_code
        == 201
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.api.resources.collect_windows_runtime_evidence",
        lambda _root: {
            "schema": "rosevear.ai-hub.windows-runtime-evidence.v1",
            "installed_binary_verified": False,
        },
    )
    response = client.get(address)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["installed_binary_verified"] is False
    assert (
        client.post(
            "/api/v1/auth/users",
            json={
                "username": "family",
                "password": "family-windows-secret-123",
                "role": "household_user",
            },
        ).status_code
        == 201
    )
    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login",
            json={
                "username": "family",
                "password": "family-windows-secret-123",
            },
        ).status_code
        == 200
    )
    assert client.get(address).status_code == 403
