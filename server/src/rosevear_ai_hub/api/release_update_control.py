"""Owner-only local update control. Delegates to an already-enrolled Windows task.

No remote shell, arbitrary executable, unreviewed startup task installation,
direct service kill, migration, task overwrite or bypass of the release manager.
"""

from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User
from rosevear_ai_hub.release_observability import safe_document, safe_sha, task_evidence

router = APIRouter(prefix="/api/v1/system/update-control", tags=["system"])
Owner = Annotated[User, Depends(require_roles("owner", "administrator"))]
TASK = "Rosevear AI Hub Release Adoption"
# A browser on the actual Windows host must initiate the disruptive update.
# Do not authorize a tailnet/LAN tab or a cross-origin form to start it.
LOCAL_ORIGINS = frozenset(
    {
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:8765",
        "http://localhost:8765",
        "http://tauri.localhost",
        "tauri://localhost",
    }
)
SHA = re.compile(r"^[0-9a-f]{40}$")


def is_windows() -> bool:
    return os.name == "nt"


def inspect_update(root: Path) -> dict:
    """Read only fixed local status files and predefined task classifications."""
    root = root.resolve()
    tasks = task_evidence(root)
    deployment = root / "logs" / "hub-deployment"
    active = safe_document(deployment / "active.json")
    journal = safe_document(deployment / "activation.json")
    status = safe_document(root / "logs" / "hub-release-adoption.json")
    active_sha = safe_sha(active.get("sha"))
    attempted_sha = safe_sha(status.get("release"))
    phase = journal.get("phase")
    adoption = status.get("state")
    adoption = (
        adoption
        if adoption
        in {
            "CURRENT",
            "READY",
            "HOLD",
            "ADOPTED",
            "FAILED",
            "ROLLED_BACK",
            "ROLLBACK_FAILED",
            "STAGED",
        }
        else "UNVERIFIED"
    )
    blockers = []
    if not is_windows():
        blockers.append("windows_host_required")
    if tasks["adoption_task"] != "configured":
        blockers.append("release_task_not_enrolled")
    if tasks["recovery_task"] != "enabled":
        blockers.append("recovery_task_not_verified")
    if not active_sha:
        blockers.append("first_supervised_activation_required")
    if not (root / "logs" / "private-recovery" / "backup-key.dpapi").is_file():
        blockers.append("backup_key_not_provisioned")
    if not (root / "scripts" / "hub-auto-update.ps1").is_file():
        blockers.append("release_controller_missing")
    if phase == "activating":
        blockers.append("incomplete_activation_requires_recovery")
    if adoption in {"ROLLBACK_FAILED", "FAILED"}:
        blockers.append("previous_failure_requires_owner_review")
    return {
        "state": "ready_to_request" if not blockers else "setup_or_review_required",
        "blockers": blockers,
        "adoption_task": tasks["adoption_task"],
        "recovery_task": tasks["recovery_task"],
        "adoption_state": adoption,
        "active_release": active_sha,
        "last_attempted_release": attempted_sha,
        "journal_state": (
            phase if phase in {"activating", "committed", "rolled_back"} else "unverified"
        ),
        "update_running": phase == "activating",
        "install_verified": False,
        "release_request_sent": False,
        "host_action_performed_by_read": False,
    }


class UpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    consent: bool
    confirmation: str


def validate_local_operator(request: Request) -> None:
    if request.headers.get("origin") not in LOCAL_ORIGINS or (
        not request.client or request.client.host not in {"127.0.0.1", "::1"}
    ):
        raise HTTPException(
            status_code=403,
            detail="Run updates only from the signed-in Windows host's local Hub client.",
        )


def launch_enrolled_update() -> bool:
    """Only request the fixed, previously authorized scheduled task; no shell."""
    try:
        result = subprocess.run(
            ["schtasks.exe", "/Run", "/TN", TASK],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        return result.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


@router.get("")
def get_update_control(_owner: Owner, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    return inspect_update(Path.cwd())


@router.post("/request", status_code=202)
def request_managed_update(
    request: Request,
    body: UpdateRequest,
    _owner: Owner,
    response: Response,
) -> dict:
    validate_local_operator(request)
    if not body.consent or body.confirmation != "START VERIFIED UPDATE":
        raise HTTPException(status_code=422, detail="Confirm the supervised update request.")
    status = inspect_update(Path.cwd())
    if status["blockers"]:
        raise HTTPException(
            status_code=409,
            detail="Update held by local enrollment, backup, recovery or incident gates.",
        )
    if not launch_enrolled_update():
        raise HTTPException(
            status_code=503,
            detail="The enrolled Windows update task could not be requested. No install confirmed.",
        )
    response.headers["Cache-Control"] = "no-store"
    return {
        "state": "task_start_requested",
        "requested_task": "existing_enrolled_release_adoption",
        "installation_complete": False,
        "restart_verified": False,
        "rollback_verified": False,
        "next_step": (
            "Read local release status; controller retains all GREEN, "
            "backup and rollback checks."
        ),
    }
