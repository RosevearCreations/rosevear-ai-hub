"""Build 286: bounded owner-only launcher evidence, never installed-process proof.

Runs the existing fixed read-only Windows inspector on demand. No raw command
lines, process identifiers, host paths or account details leave this module.
"""

from __future__ import annotations

import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from rosevear_ai_hub.release_observability import safe_document, safe_sha
from rosevear_ai_hub.windows_runtime_evidence285 import is_windows_host

PROCESS_KINDS = {"node", "python", "powershell", "cmd", "explorer", "other"}
LISTENERS = {
    "observed",
    "missing",
    "ambiguous",
    "process_unavailable",
    "changed_during_observation",
    "probe_failed",
}
CHAINS = {
    "unavailable",
    "listener_changed_or_ambiguous",
    "partial_or_complete",
    "process_unavailable",
    "probe_failed",
}
LAUNCH_SOURCES = {"unknown", "recovery_script_mention_unverified"}
TASK_STATES = {"enabled", "disabled", "missing_or_unavailable", "unknown"}
FALSE_FLAGS = (
    "installed_release_attested",
    "process_attested",
    "original_issuer_signature_verified",
    "independent_challenge_signature_verified",
    "restart_authorized",
    "challenge_executed",
    "test_authorized",
    "receiver_activated",
    "comms_connected",
    "changed_anything",
)


def _process(raw: object) -> dict[str, object] | None:
    if not isinstance(raw, dict):
        return None
    ancestors = raw.get("ancestor_kinds")
    hops = raw.get("chain_hops_inspected")
    listener = raw.get("listener")
    chain = raw.get("chain_status")
    source = raw.get("launch_source")
    predates = raw.get("process_predates_checkout_commit")
    mentioned = raw.get("recovery_script_mentioned")
    if (
        not isinstance(listener, str)
        or listener not in LISTENERS
        or not isinstance(chain, str)
        or chain not in CHAINS
        or not isinstance(source, str)
        or source not in LAUNCH_SOURCES
        or not isinstance(ancestors, list)
        or len(ancestors) > 6
        or any(not isinstance(item, str) or item not in PROCESS_KINDS for item in ancestors)
        or type(hops) is not int
        or not 0 <= hops <= 6
        or len(ancestors) != hops
        or type(mentioned) is not bool
        or (predates is not None and type(predates) is not bool)
    ):
        return None
    return {
        "listener": listener,
        "ancestor_kinds": ancestors,
        "chain_hops_inspected": hops,
        "chain_status": chain,
        "recovery_script_mentioned": mentioned,
        "process_predates_checkout_commit": predates,
        "launch_source": source,
    }


def _read_inspector(root: Path) -> dict[str, object] | None:
    inspector = root / "scripts" / "inspect-hub-launcher-259.ps1"
    if not inspector.is_file() or inspector.is_symlink():
        return None
    try:
        completed = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-File", str(inspector)],
            capture_output=True,
            text=True,
            check=False,
            timeout=20,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        if completed.returncode != 0 or len(completed.stdout) > 32768:
            return None
        raw = json.loads(completed.stdout)
    except (OSError, ValueError, subprocess.TimeoutExpired, UnicodeError):
        return None
    if not isinstance(raw, dict):
        return None
    if (
        raw.get("schema") != "rosevear-windows-launcher-custody-259/v1"
        or raw.get("source") != "on_device_read_only"
        or any(raw.get(flag) is not False for flag in FALSE_FLAGS)
        or type(raw.get("remote_requests")) is not int
        or raw.get("remote_requests") != 0
        or not isinstance(raw.get("startup_task_state"), str)
        or raw.get("startup_task_state") not in TASK_STATES
    ):
        return None
    checkout = safe_sha(raw.get("checkout_sha_candidate"))
    if raw.get("checkout_sha_candidate") is not None and checkout is None:
        return None
    observed = raw.get("observed_at")
    try:
        if not isinstance(observed, str) or not observed.endswith("Z"):
            return None
        datetime.fromisoformat(observed.replace("Z", "+00:00"))
    except ValueError:
        return None
    web = _process(raw.get("web_launcher"))
    backend = _process(raw.get("backend_launcher"))
    if web is None or backend is None:
        return None
    return {
        "observed_at_utc": observed,
        "checkout_sha_candidate": checkout,
        "startup_task_state": raw["startup_task_state"],
        "web": web,
        "backend": backend,
    }


def collect_windows_launcher_evidence(root: Path) -> dict[str, object]:
    """Report candidate agreement and observed launcher kinds, never attestation."""
    active = safe_document(root / "logs" / "hub-deployment" / "active.json")
    recorded = safe_sha(active.get("sha"))
    windows = is_windows_host()
    inspected = _read_inspector(root) if windows else None
    checkout = inspected["checkout_sha_candidate"] if inspected else None
    comparison = "NOT_WINDOWS" if not windows else "INSPECTOR_UNAVAILABLE"
    if inspected:
        comparison = (
            "MISSING_CANDIDATE"
            if recorded is None or checkout is None
            else "CANDIDATES_MATCH"
            if recorded == checkout
            else "CANDIDATES_DIFFER"
        )
    return {
        "schema": "rosevear.ai-hub.windows-launcher-evidence.v1",
        "source": "LOCAL_READ_ONLY_INSPECTOR_259",
        "observed_at_utc": datetime.now(UTC).isoformat(),
        "host_platform": "WINDOWS" if windows else "NOT_WINDOWS",
        "inspector_observed_at_utc": inspected["observed_at_utc"] if inspected else None,
        "recorded_release_sha_candidate": recorded,
        "checkout_sha_candidate": checkout,
        "candidate_comparison": comparison,
        "startup_task_state": inspected["startup_task_state"] if inspected else "NOT_SAMPLED",
        "web_launcher": inspected["web"] if inspected else None,
        "backend_launcher": inspected["backend"] if inspected else None,
        "installed_release_verified": False,
        "original_device_verified": False,
        "independent_witness_verified": False,
        "master_shell_reporting_authorized": False,
        "made_changes": False,
        "external_requests": 0,
    }
