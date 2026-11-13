"""Owner-authenticated, read-only QL439 release-health projection.

A published code build is never proof of an original-host protected receipt,
the external signer, a real Windows watchdog or currently OFF receiver.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-330-readiness",
    tags=["master-shell-readiness330"],
)


@router.get("")
def read_ql439_owner_status(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return {
        "sourceBuild": 330,
        "schema": "rosevear.ai-hub.ql439-owner-source.v1",
        "state": "QL439_DURABLE_PRIVATE_READINESS_FRESH_OFF_RECHECK_REQUIRED",
        "connection": "HOLD",
        "activationAuthorized": False,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "receiver": "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION",
        "snapshot": None,
        "message": "No independently verified original-host signed readiness source enrolled.",
    }
