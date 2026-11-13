"""Owner-only, read-only QL-438 original-host corrective custody status.

This intentionally does not read browser-provided receipts or infer live receiver
state from historical protected journal data. Real evidence remains original-host
only until a supervised signed source adapter is enrolled.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.master_shell_acceptance329 import reconcile_master_evidence329
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-329-acceptance",
    tags=["master-shell-corrective329"],
)


@router.get("")
def read_ql438_corrective_owner_status(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    """Return only an authenticated source projection; never a write command."""
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return reconcile_master_evidence329(None)
