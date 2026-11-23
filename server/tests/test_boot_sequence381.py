"""Build381: before/after original-host report, safe dependency HOLD and access tests."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.boot_sequence381 import (
    Compare381,
    Probe381,
    classify381,
)
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app

PASSWORD = "boot-read-only-test-password-123"
ROUTE = "/api/v1/system/boot-sequence-381"
NOW = datetime(2026, 11, 23, 13, 0, tzinfo=UTC)
IDS = (
    "vm",
    "mqtt",
    "tailscale",
    "ollama",
    "api",
    "web",
    "go2rtc",
    "gateway",
    "ip_reservation",
    "private_https",
    "off_device",
)


def report(
    phase="after",
    *,
    boot_at=None,
    captured_at=None,
    statuses=None,
    tasks=None,
    **extra,
):
    checks = dict.fromkeys(IDS, "healthy")
    if statuses:
        checks.update(statuses)
    return {
        "schema": "rosevear.hub.boot-sequence381.report.v1",
        "phase": phase,
        "captured_at_utc": (captured_at or NOW).isoformat(),
        "os_boot_at_utc": (boot_at or NOW - timedelta(hours=1)).isoformat(),
        "original_host_name_matched": True,
        "source": "UNSIGNED_LOCAL_WINDOWS_READ_ONLY",
        "checks": checks,
        "tasks": {
            "boot": "enabled",
            "recovery": "enabled",
            "boot_last_run_after_os_boot": True,
            "recovery_last_run_after_os_boot": True,
            "task_identity_independently_verified": False,
            **(tasks or {}),
        },
        "reboot_independently_verified": False,
        "external_witness_verified": False,
        "operations_performed": False,
        **extra,
    }


def client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'boot381.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    app = create_app()

    def database():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_session] = database
    c = TestClient(app)
    response = c.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": PASSWORD},
    )
    assert response.status_code == 201, response.text
    for user, role in (("family", "household_user"), ("viewer", "read_only")):
        created = c.post(
            "/api/v1/auth/users",
            json={"username": user, "password": PASSWORD, "role": role},
        )
        assert created.status_code == 201, created.text
    return c


def login(c, username):
    response = c.post("/api/v1/auth/login", json={"username": username, "password": PASSWORD})
    assert response.status_code == 200, response.text


def test_owner_only_contract_and_no_credentials_or_actions(tmp_path):
    c = client(tmp_path)
    response = c.get(ROUTE + "/contract")
    assert response.status_code == 200, response.text
    result = response.json()
    assert response.headers["Cache-Control"] == "no-store"
    assert result["fieldAcceptance"] == "HOLD"
    assert result["liveObservationPerformed"] is False
    assert result["autoRecoveryInstalledByBuild"] is False
    assert len(result["stages"]) == len(IDS)
    assert [stage["id"] for stage in result["stages"]] == list(IDS)
    assert "independent" in result["stages"][-1]["safeManualAction"].lower()
    data = c.post(ROUTE + "/classify", json={"after": report()})
    assert data.status_code == 200, data.text
    assert data.headers["Cache-Control"] == "no-store"
    assert data.json()["fieldAcceptance"] == "HOLD"
    assert data.json()["productionOriginalHostGreen"] is False
    assert data.json()["automaticRestarts"] == 0
    assert data.json()["firewallChanges"] == 0
    assert data.json()["secretValuesRead"] == 0
    login(c, "family")
    assert c.get(ROUTE + "/contract").status_code == 403
    assert c.post(ROUTE + "/classify", json={"after": report()}).status_code == 403
    login(c, "viewer")
    assert c.get(ROUTE + "/contract").status_code == 403
    assert c.post(ROUTE + "/classify", json={"after": report()}).status_code == 403


def test_bounded_dependency_cascade_does_not_claim_boot(tmp_path):
    c = client(tmp_path)
    result = c.post(
        ROUTE + "/classify",
        json={
            "after": report(
                statuses={
                    "vm": "unavailable",
                    "mqtt": "healthy",
                    "api": "unavailable",
                    "web": "healthy",
                    "gateway": "healthy",
                    "private_https": "unverified",
                    "off_device": "unverified",
                }
            )
        },
    ).json()
    stages = {stage["id"]: stage for stage in result["stages"]}
    assert stages["vm"]["state"] == "UNAVAILABLE"
    assert stages["mqtt"]["state"] == "DEPENDENCY_HOLD"
    assert stages["mqtt"]["blockedBy"] == ["vm"]
    assert stages["api"]["state"] == "UNAVAILABLE"
    assert stages["web"]["blockedBy"] == ["api"]
    assert stages["gateway"]["state"] == "DEPENDENCY_HOLD"
    assert stages["off_device"]["state"] == "UNVERIFIED"
    assert result["newBootTimeObserved"] is False
    assert "NO_BASELINE_REPORT" in result["holdReasons"]
    assert result["independentRemoteWitness"] is False


def test_new_os_boot_time_is_only_unsigned_observation(tmp_path):
    c = client(tmp_path)
    before = report("before", boot_at=NOW - timedelta(days=1), captured_at=NOW - timedelta(hours=3))
    after = report("after")
    result = c.post(ROUTE + "/classify", json={"before": before, "after": after})
    assert result.status_code == 200, result.text
    assert result.json()["newBootTimeObserved"] is True
    assert result.json()["productionOriginalHostGreen"] is False
    assert result.json()["taskIdentityVerified"] is False
    assert result.json()["unattendedRecoveryCertified"] is False
    assert "TASK_IDENTITY_REQUIRES_INDEPENDENT_PINNED_VERIFICATION" in result.json()["holdReasons"]
    same = c.post(ROUTE + "/classify", json={"before": report("before"), "after": after})
    assert "NO_NEW_WINDOWS_BOOT_TIME_OBSERVED" in same.json()["holdReasons"]


@pytest.mark.parametrize(
    "changes",
    [
        {"schema": "different"},
        {"source": "SIGNED_INDEPENDENT_REMOTE"},
        {"operations_performed": True},
        {"external_witness_verified": True},
        {"reboot_independently_verified": True},
        {"hostname": "private-host-secret"},
        {"checks": {"mqtt": "compromised"}},
    ],
)
def test_extra_or_trust_escalating_reports_rejected(changes):
    original = report()
    if "checks" in changes:
        original["checks"].update(changes["checks"])
    else:
        original.update(changes)
    with pytest.raises(ValidationError):
        Probe381.model_validate(original)


def test_invalid_phase_time_and_stale_recovery_rejected():
    with pytest.raises(ValidationError):
        Compare381.model_validate({"before": report("after"), "after": report("after")})
    with pytest.raises(ValidationError):
        Compare381.model_validate({"after": report("before")})
    with pytest.raises(ValidationError):
        Probe381.model_validate(report(boot_at=NOW + timedelta(minutes=1)))
    old = Compare381.model_validate(
        {
            "after": report(
                captured_at=NOW - timedelta(days=2),
                boot_at=NOW - timedelta(days=3),
                tasks={"boot": "disabled", "recovery": "missing"},
            ),
        }
    )
    result = classify381(old, now=NOW)
    assert "LOCAL_REPORT_STALE_OVER_24_HOURS" in result["holdReasons"]
    assert "UNATTENDED_BOOT_TASK_NOT_ENABLED_OR_UNKNOWN" in result["holdReasons"]
    assert "UNATTENDED_RECOVERY_TASK_NOT_ENABLED_OR_UNKNOWN" in result["holdReasons"]


def test_false_host_and_future_capture_never_pass():
    future = Compare381.model_validate(
        {
            "after": report(
                captured_at=NOW + timedelta(minutes=15),
                boot_at=NOW - timedelta(minutes=10),
                original_host_name_matched=False,
            ),
        }
    )
    summary = classify381(future, now=NOW)
    assert "ORIGINAL_WINDOWS_HOST_NOT_MATCHED" in summary["holdReasons"]
    assert "LOCAL_REPORT_CLOCK_IN_FUTURE" in summary["holdReasons"]
    assert summary["fieldAcceptance"] == "HOLD"
