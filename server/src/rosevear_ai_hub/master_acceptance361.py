"""QL-470: bounded original-host recovery and peer-enrollment telemetry.

UNSIGNED Task Scheduler observations and reviewer claims cannot prove a reboot,
independent device authentication, signed ACKs, owner authority, or live 24/7.
All outputs are read-only and fail closed; no lifecycle controls.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST

SCHEMA = "rosevear.hub.ql470.local-recovery-telemetry361.v1"
OUTPUT_SCHEMA = "rosevear.hub.ql470.acceptance-dashboard361.v1"
EXPECTED_TASKS = (
    "Rosevear AI Hub Unattended Boot",
    "Rosevear AI Hub Unattended Recovery",
)
EXPECTED_SERVICES = (
    "Rosevear-AIHub",
    "Rosevear-AIDataPlatform",
    "Rosevear-CommsHub",
)
SCOPES = ("reboot", "guest", "ai-data-worker", "comms-worker")
TASK_STATES = frozenset(("NOT_INSTALLED", "DISABLED", "READY", "RUNNING", "UNKNOWN"))
SERVICE_STATES = frozenset(("NOT_INSTALLED", "RUNNING", "STOPPED", "UNKNOWN"))
START_MODES = frozenset(("NOT_INSTALLED", "AUTOMATIC", "MANUAL", "DISABLED", "UNKNOWN"))
EVENT_IDS = frozenset((100, 101, 102, 103, 106, 107, 108, 110, 111, 200, 201))
HEX40 = re.compile(r"[0-9a-f]{40}\Z")
MAX_AGE_MS = 120_000
ALLOWED_UTC = re.compile(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$")


def _date(value: Any) -> datetime | None:
    if type(value) is not str or not ALLOWED_UTC.fullmatch(value):
        return None
    try:
        return datetime.fromisoformat(value[:-1] + "+00:00").astimezone(timezone.utc)
    except ValueError:
        return None


def trusted_local_telemetry361(value: Any, *, now_ms: int, expected_commit: str) -> bool:
    """Check an UNSIGNED inventory shape and freshness, not its physical provenance."""
    if (
        type(value) is not dict
        or type(now_ms) is not int
        or type(expected_commit) is not str
        or not HEX40.fullmatch(expected_commit)
        or value.get("schema") != SCHEMA
        or value.get("source") != "UNSIGNED_LOCAL_INVENTORY_ONLY"
        or value.get("originalHost") != ORIGINAL_HOST
        or value.get("sourceCommit") != expected_commit
    ):
        return False
    observed = value.get("observedAtMs")
    if type(observed) is not int or not 0 <= now_ms - observed <= MAX_AGE_MS:
        return False
    boot = _date(value.get("lastWindowsBootUtc"))
    if boot is None or not 0 <= observed - int(boot.timestamp() * 1000) <= 365 * 86_400_000:
        return False
    flags = (
        "guestAuthenticatedContinuityVerified",
        "independentPreloginWitnessVerified",
        "physicalAutomaticStartupVerified",
        "masterWorkersSignedAckVerified",
        "commsPrivateReceiverAuthorized",
        "changesMade",
    )
    if any(value.get(flag) is not False for flag in flags):
        return False
    tasks, services, events = (
        value.get("tasks"),
        value.get("masterServices"),
        value.get("recentTaskSchedulerEventIds"),
    )
    if type(tasks) is not list or type(services) is not list or type(events) is not list:
        return False
    if len(tasks) != 2 or len(services) != 3 or len(events) > 12:
        return False
    if [t.get("name") for t in tasks if type(t) is dict] != list(EXPECTED_TASKS):
        return False
    if [s.get("name") for s in services if type(s) is dict] != list(EXPECTED_SERVICES):
        return False
    for task in tasks:
        if (
            task.get("state") not in TASK_STATES
            or task.get("exactTaskIdentityIndependentlyVerified") is not False
            or (task.get("lastResult") is not None and type(task.get("lastResult")) is not int)
            or (
                task.get("lastRunUtc") is not None
                and _date(task.get("lastRunUtc")) is None
            )
        ):
            return False
    for service in services:
        if (
            service.get("state") not in SERVICE_STATES
            or service.get("startMode") not in START_MODES
            or service.get("signedServiceEnrollmentVerified") is not False
        ):
            return False
    for event in events:
        if (
            type(event) is not dict
            or type(event.get("id")) is not int
            or event["id"] not in EVENT_IDS
            or _date(event.get("utc")) is None
        ):
            return False
    return True


def acceptance361(
    *,
    telemetry: Any,
    field_report: Any,
    now_ms: int,
    machine_name: str,
    original_host_process: bool,
    expected_commit: str,
) -> dict[str, Any]:
    original = (
        original_host_process
        and type(machine_name) is str
        and machine_name.upper() == ORIGINAL_HOST
    )
    valid = original and trusted_local_telemetry361(
        telemetry, now_ms=now_ms, expected_commit=expected_commit
    )
    source = telemetry if valid else {}
    task_states = [
        {
            "name": name,
            "observedState": item.get("state", "UNKNOWN"),
            "lastRunUtc": item.get("lastRunUtc"),
            "lastResult": item.get("lastResult"),
            "identityVerified": False,
            "unattendedBootProven": False,
        }
        for name, item in zip(
            EXPECTED_TASKS,
            source.get("tasks", [{} for _ in EXPECTED_TASKS]),
            strict=True,
        )
    ]
    worker_states = [
        {
            "name": name,
            "observedState": item.get("state", "UNKNOWN"),
            "startMode": item.get("startMode", "UNKNOWN"),
            "enrollmentApproved": False,
            "peerSignedAckVerified": False,
            "rollbackReady": False,
        }
        for name, item in zip(
            EXPECTED_SERVICES,
            source.get("masterServices", [{} for _ in EXPECTED_SERVICES]),
            strict=True,
        )
    ]
    field_valid = (
        original
        and type(field_report) is dict
        and field_report.get("schema") == "rosevear.hub.ql469.supervised-acceptance360.v1"
        and field_report.get("originalHost") == ORIGINAL_HOST
        and field_report.get("sourceCommit") == expected_commit
        and field_report.get("changesMade") is False
        and field_report.get("physicalUnattendedProductionGreen") is False
        and field_report.get("threeMasterWorkerProductionGreen") is False
        and field_report.get("commsPrivateTestReceiverAuthorized") is False
        and field_report.get("automaticEnrollmentAuthorized") is False
        and type(field_report.get("scopeStatuses")) is dict
        and set(field_report["scopeStatuses"]) == set(SCOPES)
        and all(
            type(s) is dict and type(s.get("status")) is str
            and s["status"] in (
                "SIGNED_CLAIMS_CORRELATED_NOT_PHYSICAL_APPROVAL",
                "SIGNED_CLAIM_NOT_INDEPENDENT_PHYSICAL_PROOF",
            )
            or (type(s) is dict and type(s.get("status")) is str
                and s["status"].startswith("HOLD_"))
            for s in field_report["scopeStatuses"].values()
        )
    )
    states = {
        scope: (
            field_report["scopeStatuses"][scope]["status"]
            if field_valid
            else "HOLD_NO_VERIFIED_FIELD_REPORT"
        )
        for scope in SCOPES
    }
    reasons = []
    if not original:
        reasons.append("HOLD_NOT_ORIGINAL_WINDOWS_HOST")
    if not valid:
        reasons.append("HOLD_NO_FRESH_MATCHED_ORIGINAL_HOST_TELEMETRY")
    if not field_valid:
        reasons.append("HOLD_FIELD_REPORT_NOT_PRESENT_OR_NOT_MATCHED")
    reasons.extend(
        (
            "HOLD_INDEPENDENT_PHYSICAL_BOOT_AND_AUTHENTICATED_DEVICES",
            "HOLD_SEPARATE_OWNER_APPROVAL_AND_WORKER_ROLLBACK",
            "HOLD_COMMS_QL340C_RECEIVER_UNAUTHORIZED",
        )
    )
    return {
        "schema": OUTPUT_SCHEMA,
        "sourceBuild": 361,
        "serverShell": "ai-data-platform",
        "originalHost": ORIGINAL_HOST,
        "sourceCommit": expected_commit if type(expected_commit) is str and HEX40.fullmatch(expected_commit) else None,
        "localTelemetryFreshButUnsigned": bool(valid),
        "lastWindowsBootUtc": source.get("lastWindowsBootUtc"),
        "taskHistoryEventsSampled": len(source.get("recentTaskSchedulerEventIds", [])),
        "taskSchedulerHistoryIsNamedTaskProof": False,
        "tasks": task_states,
        "masterServices": worker_states,
        "fieldEvidence": states,
        "fieldReportShapeOnly": bool(field_valid),
        "authenticatedDeviceRuntimeVerified": False,
        "independentSignedMasterWorkerAckVerified": False,
        "liveMasterConnectivityVerified": False,
        "physicalUnattendedProductionGreen": False,
        "threeMasterWorkerProductionGreen": False,
        "commsPrivateReceiverAuthorized": False,
        "webMutationAvailable": False,
        "nextStep": "OWNER_SUPERVISED_GUEST_BACKUP_AND_ORIGINAL_HOST_REBOOT_REVIEW",
        "holdCodes": reasons,
    }
