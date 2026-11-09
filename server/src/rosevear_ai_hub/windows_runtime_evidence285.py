"""Build 285: bounded, read-only evidence from the responding backend host.

Windows Service Control Manager observations are not application health checks,
release signatures, machine identity attestations or permission to publish.
Never expose command output, machine names, paths, accounts, arguments or PIDs.
"""

from __future__ import annotations

import os
import re
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from rosevear_ai_hub import __version__
from rosevear_ai_hub.release_observability import safe_document, safe_sha

SC_STATE = re.compile(r"^\s*STATE\s*:\s*([1-7])\b", re.MULTILINE)
SERVICE_NAMES = (
    ("tailscale", "Tailscale", "Tailscale"),
    ("mosquitto", "Mosquitto", "mosquitto"),
    ("caddy", "Caddy", "caddy"),
    ("ollama", "Ollama", "Ollama"),
)


def is_windows_host() -> bool:
    return os.name == "nt"


def windows_service_status(service_name: str) -> str:
    """Fixed service names only. A missing service may be a normal user process."""
    if service_name not in {entry[2] for entry in SERVICE_NAMES}:
        return "UNAVAILABLE"
    try:
        result = subprocess.run(
            ["sc.exe", "query", service_name],
            capture_output=True,
            text=True,
            check=False,
            timeout=3,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return "UNAVAILABLE"
    if result.returncode == 1060:
        return "NOT_REGISTERED"
    if result.returncode != 0 or len(result.stdout) > 8192:
        return "UNAVAILABLE"
    match = SC_STATE.search(result.stdout)
    if not match:
        return "UNAVAILABLE"
    return "RUNNING" if match.group(1) == "4" else "STOPPED"


def collect_windows_runtime_evidence(root: Path) -> dict[str, object]:
    """Sample local responding process and narrowly allowlisted service states."""
    windows_host = is_windows_host()
    active = safe_document(root / "logs" / "hub-deployment" / "active.json")
    candidate_sha = safe_sha(active.get("sha"))
    services = [
        {
            "id": identity,
            "label": label,
            "status": windows_service_status(service) if windows_host else "NOT_SAMPLED",
            "evidence": "SCM_READ_ONLY" if windows_host else "UNSUPPORTED_HOST",
        }
        for identity, label, service in SERVICE_NAMES
    ]
    return {
        "schema": "rosevear.ai-hub.windows-runtime-evidence.v1",
        "observed_at_utc": datetime.now(UTC).isoformat(),
        "source": "RESPONDING_BACKEND_ONLY",
        "host_platform": "WINDOWS" if windows_host else "NOT_WINDOWS",
        "api_process": {"state": "RESPONDED", "package_version": __version__},
        "recorded_active_release_sha": candidate_sha,
        "recorded_release_basis": "UNVERIFIED_LOCAL_POINTER" if candidate_sha else "NOT_RECORDED",
        "services": services,
        "installed_binary_verified": False,
        "windows_device_identity_verified": False,
        "independent_witness_verified": False,
        "master_shell_reporting_authorized": False,
        "made_changes": False,
        "external_requests": 0,
    }
