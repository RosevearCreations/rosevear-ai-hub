"""Build 381: owner-only Windows startup dependency evidence classifier.

It NEVER starts/stops processes, changes scheduled tasks, reads credentials,
modifies network settings, scans devices, or certifies a machine reboot.
All reports are manually imported and are UNSIGNED source observations.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(prefix="/api/v1/system/boot-sequence-381", tags=["boot381"])
Owner = Annotated[User, Depends(require_roles("owner"))]
State = Literal["healthy", "unavailable", "unverified"]
TaskState = Literal["enabled", "disabled", "missing", "unverified"]
SCHEMA = "rosevear.hub.boot-sequence381.report.v1"

STAGES = (
    ("vm", "Pinned Home Assistant VM", (), "Inspect the existing pinned VM and EFI. Never create or reset a guest."),
    ("mqtt", "Home Assistant MQTT add-on", ("vm",), "Inspect authenticated broker/add-on from Home Assistant; do not install another broker."),
    ("tailscale", "Tailscale Windows service", (), "Review the existing service; do not change tailnet or network policy blindly."),
    ("ollama", "Local Ollama", (), "Review the approved pinned local binary and loopback model health."),
    ("api", "Hub Python API", (), "Check the existing guarded recovery task, release maintenance lock and schema compatibility."),
    ("web", "Hub web / desktop", ("api",), "Inspect the existing port-5173 process or installed web bundle; refuse duplicate listeners."),
    ("go2rtc", "Existing go2rtc", (), "Inspect the pinned camera launcher and verify a real authorized stream separately."),
    ("gateway", "Private Caddy listener", ("api", "web"), "Review the existing Caddy gateway launcher and TLS configuration."),
    ("ip_reservation", "Private IP reservation", (), "Confirm actual DHCP reservation and address continuity in the authorized router UI; no router changes here."),
    ("private_https", "Private HTTPS / certificate", ("gateway",), "Test full TLS, certificate hostname and authenticated Hub access on an authorized independent client."),
    ("off_device", "Off-device pre-login witness", ("private_https", "ip_reservation"), "Witness before Windows sign-in from an independent trusted LAN/Tailscale client."),
)
IDS = tuple(x[0] for x in STAGES)


class Checks(BaseModel):
    model_config = ConfigDict(extra="forbid")
    vm: State
    mqtt: State
    tailscale: State
    ollama: State
    api: State
    web: State
    go2rtc: State
    gateway: State
    ip_reservation: State
    private_https: State
    off_device: State


class TaskEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")
    boot: TaskState
    recovery: TaskState
    boot_last_run_after_os_boot: bool
    recovery_last_run_after_os_boot: bool
    task_identity_independently_verified: Literal[False] = False


class Probe381(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema: Literal["rosevear.hub.boot-sequence381.report.v1"]
    phase: Literal["before", "after"]
    captured_at_utc: datetime
    os_boot_at_utc: datetime
    original_host_name_matched: bool
    source: Literal["UNSIGNED_LOCAL_WINDOWS_READ_ONLY"]
    checks: Checks
    tasks: TaskEvidence
    reboot_independently_verified: Literal[False]
    external_witness_verified: Literal[False]
    operations_performed: Literal[False]

    @model_validator(mode="after")
    def plausible_times(self) -> Probe381:
        if (
            self.captured_at_utc.tzinfo is None
            or self.os_boot_at_utc.tzinfo is None
            or self.os_boot_at_utc > self.captured_at_utc
        ):
            raise ValueError("UTC offset-aware timestamps with boot preceding sample required.")
        return self


class Compare381(BaseModel):
    model_config = ConfigDict(extra="forbid")
    before: Probe381 | None = None
    after: Probe381

    @model_validator(mode="after")
    def phase_order(self) -> Compare381:
        if self.after.phase != "after":
            raise ValueError("Latest report must be marked after.")
        if self.before and self.before.phase != "before":
            raise ValueError("Baseline report must be marked before.")
        return self


def _check_report(report: Probe381, now: datetime) -> list[str]:
    reasons: list[str] = []
    age = now - report.captured_at_utc
    if age > timedelta(hours=24):
        reasons.append("LOCAL_REPORT_STALE_OVER_24_HOURS")
    if age < -timedelta(minutes=5):
        reasons.append("LOCAL_REPORT_CLOCK_IN_FUTURE")
    if not report.original_host_name_matched:
        reasons.append("ORIGINAL_WINDOWS_HOST_NOT_MATCHED")
    if report.tasks.boot != "enabled":
        reasons.append("UNATTENDED_BOOT_TASK_NOT_ENABLED_OR_UNKNOWN")
    if report.tasks.recovery != "enabled":
        reasons.append("UNATTENDED_RECOVERY_TASK_NOT_ENABLED_OR_UNKNOWN")
    if not report.tasks.boot_last_run_after_os_boot:
        reasons.append("BOOT_TASK_LAST_RUN_NOT_CORRELATED_TO_OS_BOOT")
    if not report.tasks.recovery_last_run_after_os_boot:
        reasons.append("RECOVERY_TASK_LAST_RUN_NOT_CORRELATED_TO_OS_BOOT")
    reasons.append("TASK_IDENTITY_REQUIRES_INDEPENDENT_PINNED_VERIFICATION")
    reasons.append("REMOTE_PRELOGIN_TLS_AND_ROUTER_WITNESS_NOT_IN_LOCAL_REPORT")
    return reasons


def classify381(payload: Compare381, *, now: datetime | None = None) -> dict:
    """Deterministic dependency diagnostic, NEVER a production certificate."""
    now = now or datetime.now(UTC)
    after = payload.after
    reasons = _check_report(after, now)
    reboot_observed = False
    if payload.before:
        before = payload.before
        if before.captured_at_utc > after.captured_at_utc:
            reasons.append("REPORT_PHASE_CHRONOLOGY_INVERTED")
        if before.os_boot_at_utc < after.os_boot_at_utc:
            reboot_observed = True
        else:
            reasons.append("NO_NEW_WINDOWS_BOOT_TIME_OBSERVED")
        if not before.original_host_name_matched:
            reasons.append("BASELINE_ORIGINAL_HOST_NOT_MATCHED")
    else:
        reasons.append("NO_BASELINE_REPORT")

    checked = after.checks.model_dump()
    stages: list[dict] = []
    states: dict[str, str] = {}
    for key, label, dependencies, remediation in STAGES:
        observed = checked[key]
        blocked = [name for name in dependencies if states.get(name) != "OBSERVED"]
        if observed == "unavailable":
            state = "UNAVAILABLE"
        elif observed == "unverified":
            state = "UNVERIFIED"
        elif blocked:
            state = "DEPENDENCY_HOLD"
        else:
            state = "OBSERVED"
        states[key] = state
        stages.append({
            "id": key,
            "label": label,
            "dependsOn": list(dependencies),
            "blockedBy": blocked,
            "reportedObservation": observed,
            "state": state,
            "safeManualAction": remediation,
            "source": "OWNER_IMPORTED_UNSIGNED_LOCAL_OBSERVATION",
        })

    missing = [x["id"] for x in stages if x["state"] != "OBSERVED"]
    if missing:
        reasons.append("UNVERIFIED_OR_UNAVAILABLE_DEPENDENCY_STAGES")
    # Even all reported observations healthy cannot prove independent HTTPS,
    # password-backed task identity, signed pre-login client or actual restore.
    return {
        "schema": "rosevear.hub.boot-sequence381.classification.v1",
        "source": "OWNER_IMPORTED_UNSIGNED_LOCAL_READ_ONLY",
        "phase": "after",
        "capturedAtUtc": after.captured_at_utc.isoformat(),
        "osBootAtUtc": after.os_boot_at_utc.isoformat(),
        "newBootTimeObserved": reboot_observed,
        "taskStates": after.tasks.model_dump(),
        "stages": stages,
        "blockedStages": missing,
        "holdReasons": sorted(set(reasons)),
        "fieldAcceptance": "HOLD",
        "independentRemoteWitness": False,
        "taskIdentityVerified": False,
        "unattendedRecoveryCertified": False,
        "productionOriginalHostGreen": False,
        "automaticRestarts": 0,
        "networkChanges": 0,
        "routerChanges": 0,
        "firewallChanges": 0,
        "secretValuesRead": 0,
    }


@router.get("/contract")
def boot_contract381(_owner: Owner, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    return {
        "schema": "rosevear.hub.boot-sequence381.contract.v1",
        "reportSchema": SCHEMA,
        "stages": [
            {"id": key, "label": label, "dependsOn": list(deps), "safeManualAction": action}
            for key, label, deps, action in STAGES
        ],
        "probeScript": "scripts/inspect-boot-sequence381.ps1",
        "fieldAcceptance": "HOLD",
        "liveObservationPerformed": False,
        "offDeviceWitnessRequired": True,
        "ownerSignedIndependentAcceptanceRequired": True,
        "autoRecoveryInstalledByBuild": False,
    }


@router.post("/classify")
def classify_imported381(payload: Compare381, _owner: Owner, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return classify381(payload)
