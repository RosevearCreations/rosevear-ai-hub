"""QL-442 owner-authenticated no-store status: no physical receiver assertion."""
from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-333-shutdown",
    tags=["master-shell-shutdown333"],
)


@router.get("")
def read_ql442_owner_shutdown_status(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    # The cloud API does not hold private original-host journals or live keys.
    # An unenrolled source must remain UNKNOWN, not forge an OFF observation.
    return {
        "schema": "rosevear.ai-hub.ql442-owner-shutdown.v1",
        "sourceBuild": 333,
        "state": "QL442_FRESH_SIGNED_SHUTDOWN_AND_INDEPENDENT_OFF_REQUIRED",
        "connection": "HOLD",
        "activationAuthorized": False,
        "receiver": "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION",
        "manualReceiverIsolationRequired": True,
        "physicalReceiverCurrentlyOff": False,
        "leaseDisposition": "UNVERIFIED",
        "sourceHost": "DESKTOP-AE894KC",
        "lastIndependentOffAt": None,
        "lastSignedMasterReviewAt": None,
        "historicalCustodyReadback": "NOT_ENROLLED_IN_THIS_READ_ONLY_SOURCE",
        "message": "No original-host signed OFF or independent receiver evidence is enrolled.",
    }
