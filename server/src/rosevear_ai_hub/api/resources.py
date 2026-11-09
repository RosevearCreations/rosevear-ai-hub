"""Build 048: restricted, read-only resource snapshot."""

from pathlib import Path

from fastapi import APIRouter, Response, status
from fastapi.exceptions import HTTPException

from rosevear_ai_hub.release_observability import collect_release_observability
from rosevear_ai_hub.resource_budget import collect_resource_snapshot
from rosevear_ai_hub.windows_runtime_evidence285 import collect_windows_runtime_evidence

router = APIRouter(prefix="/api/v1/system", tags=["system"])


@router.get("/resource-budget")
def resource_budget(response: Response) -> dict[str, object]:
    response.headers["Cache-Control"] = "no-store"
    try:
        return collect_resource_snapshot()
    except (OSError, RuntimeError) as exc:
        # No machine paths, access tokens, or OS-level exception details returned.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Resource metrics are temporarily unavailable.",
        ) from exc


@router.get("/release-observability")
def release_observability(response: Response) -> dict[str, object]:
    """Owner-only, explicit-read local updater metadata; no secret values."""
    response.headers["Cache-Control"] = "no-store"
    try:
        return collect_release_observability(Path.cwd())
    except (OSError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Release evidence is temporarily unavailable.",
        ) from exc


@router.get("/windows-runtime-evidence")
def windows_runtime_evidence(response: Response) -> dict[str, object]:
    """Owner-only, on-demand host observation; never a machine attestation."""
    response.headers["Cache-Control"] = "no-store"
    try:
        return collect_windows_runtime_evidence(Path.cwd())
    except (OSError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Windows runtime evidence is temporarily unavailable.",
        ) from exc
