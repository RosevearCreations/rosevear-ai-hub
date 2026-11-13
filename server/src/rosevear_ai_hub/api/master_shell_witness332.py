"""QL-441 owner-only read-only source status: never a physical ON/OFF claim."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-332-witness",
    tags=["master-shell-witness332"],
)


@router.get("")
def read_ql441_owner_status(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return {
        "schema": "rosevear.ai-hub.ql441-owner-source.v1",
        "sourceBuild": 332,
        "state": "QL441_PRIVATE_DECISION_FRESH_OFF_AND_LEASE_CLOSEOUT_REQUIRED",
        "connection": "HOLD",
        "activationAuthorized": False,
        "decision": "UNVERIFIED_HOLD",
        "receiver": "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION",
        "manualReceiverIsolationRequired": True,
        "privateDecisionPresent": False,
        "lastIndependentObservationAt": None,
        "leaseExpiresAt": None,
        "message": "Live original-host signed ON/OFF and shutdown custody not independently verified.",
    }
