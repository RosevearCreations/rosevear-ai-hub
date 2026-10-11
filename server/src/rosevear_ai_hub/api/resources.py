"""Build 048: restricted, read-only resource snapshot."""

from fastapi import APIRouter, Response, status
from fastapi.exceptions import HTTPException

from rosevear_ai_hub.resource_budget import collect_resource_snapshot

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
