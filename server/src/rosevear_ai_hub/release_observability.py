"""Build 062: bounded owner-only release telemetry assembled from local evidence.

No background polling, service restarts, scheduled-task edits, database writes,
backup restore, secrets, or external network requests. A snapshot is not a
live activation or rollback acceptance certificate.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from rosevear_ai_hub.incident_follow_up import follow_up_routes, integration_diagnostics
from rosevear_ai_hub.integration_recovery import integration_acceptance
from rosevear_ai_hub.release_health_cohorts import classify_log, operator_evidence
from rosevear_ai_hub.release_incident_triage import classify_incidents, incident_reviews

SHA = re.compile(r"^[0-9a-f]{40}$")
STATES = {
    "CURRENT",
    "READY",
    "HOLD",
    "ADOPTED",
    "FAILED",
    "ROLLED_BACK",
    "ROLLBACK_FAILED",
}
TASK_STATES = {"not_installed", "configured", "disabled", "mismatch", "unavailable"}
RECOVERY_STATES = {"enabled", "disabled", "mismatch", "unavailable"}
EVENT_STATES = {"present", "none", "unavailable"}


def safe_document(path: Path) -> dict:
    """Only small, nonlinked JSON files at fixed paths are eligible."""
    if path.parent.is_symlink() or path.is_symlink():
        return {}
    try:
        if not path.is_file() or path.stat().st_size > 16384:
            return {}
        value = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError, UnicodeError):
        return {}
    return value if isinstance(value, dict) else {}


def safe_sha(value: object) -> str | None:
    return value if isinstance(value, str) and SHA.fullmatch(value) else None


def safe_time(value: object) -> str | None:
    if not isinstance(value, str) or len(value) > 40:
        return None
    try:
        stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            return None
        return stamp.astimezone(UTC).isoformat()
    except ValueError:
        return None


def is_windows() -> bool:
    return os.name == "nt"


def task_evidence(root: Path) -> dict:
    """Invoke our static, read-only local Windows task and event inspector."""
    unknown = {
        "adoption_task": "unavailable",
        "recovery_task": "unavailable",
        "event_610": "unavailable",
    }
    script = root / "scripts" / "inspect-hub-release-tasks.ps1"
    if not is_windows() or script.is_symlink() or not script.is_file():
        return unknown
    try:
        result = subprocess.run(
            [
                "powershell.exe",
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(script),
                "-RepoRoot",
                str(root),
            ],
            capture_output=True,
            text=True,
            timeout=12,
            check=False,
        )
        if result.returncode or len(result.stdout) > 4096:
            return unknown
        data = json.loads(result.stdout)
        if not isinstance(data, dict):
            return unknown
        return {
            "adoption_task": data.get("adoption_task")
            if data.get("adoption_task") in TASK_STATES
            else "unavailable",
            "recovery_task": data.get("recovery_task")
            if data.get("recovery_task") in RECOVERY_STATES
            else "unavailable",
            "event_610": data.get("event_610")
            if data.get("event_610") in EVENT_STATES
            else "unavailable",
        }
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return unknown


def collect_release_observability(root: Path) -> dict:
    """All return fields have fixed schemas. Never forward local file text."""
    root = root.resolve()
    logs = root / "logs"
    status = safe_document(logs / "hub-release-adoption.json")
    active = safe_document(logs / "hub-deployment" / "active.json")
    journal = safe_document(logs / "hub-deployment" / "activation.json")
    prior_alert = safe_document(logs / "hub-deployment" / "last-alert.json")
    tasks = task_evidence(root)
    cohorts = classify_log(root)
    recovery = operator_evidence(root)
    incidents = classify_incidents(cohorts, recovery)
    reviews = incident_reviews(root)

    adoption = status.get("state")
    adoption = adoption if adoption in STATES else "UNVERIFIED"
    active_sha = safe_sha(active.get("sha"))
    last_sha = safe_sha(status.get("release"))
    phase = journal.get("phase")
    journal_state = phase if phase in {"activating", "committed", "rolled_back"} else "unverified"
    alert_at = safe_time(prior_alert.get("notified_utc"))

    # A committed pointer or a passed CI job cannot prove actual process
    # identity, restoration, backup key access or first supervised acceptance.
    return {
        "scope": "local_read_only",
        "health_cohorts": cohorts,
        "supervised_recovery": recovery,
        "incident_triage": incidents,
        "incident_reviews": reviews,
        "incident_follow_up": follow_up_routes(incidents, reviews),
        "integration_diagnostics": integration_diagnostics(),
        "integration_recovery": integration_acceptance(root),
        "adoption_state": adoption,
        "last_attempt_utc": safe_time(status.get("checked_utc")),
        "last_release": last_sha,
        "active_release": active_sha,
        "journal_state": journal_state,
        "adoption_task": tasks["adoption_task"],
        "recovery_task": tasks["recovery_task"],
        "failure_event_610": tasks["event_610"],
        "last_alert_recorded_utc": alert_at,
        "installed_runtime_verified": False,
        "rollback_rehearsal_verified": False,
        "off_machine_recovery_verified": False,
        "enrollment_ready": False,
        "reason": (
            "Read-only local files and scheduler metadata only. "
            "Live process, browser, backup decryption and failover "
            "require separate supervised acceptance."
        ),
    }
