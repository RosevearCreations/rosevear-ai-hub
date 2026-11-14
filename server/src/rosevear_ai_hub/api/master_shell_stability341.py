"""QL-450 owner-only no-store stability history, never a hardware control path."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-341-stability",
    tags=["master-shell-stability341"],
)


@router.get("")
def read_ql450_owner_stability(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    # No original external signers, original Windows host or physical OFF enrolled.
    return {
        "schema": "rosevear.ai-hub.ql450-owner-stability.v1",
        "sourceBuild": 341,
        "state": "QL450_ORIGINAL_SIGNED_OFF_STABILITY_NOT_ENROLLED_HOLD",
        "connection": "HOLD",
        "activationAuthorized": False,
        "closureAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "manualIsolationAndIndependentOffRequired": True,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "incidentStatus": "OPEN_UNVERIFIED",
        "incidentClosed": False,
        "originalHost": "DESKTOP-AE894KC",
        "ql449ProtectedReview": "NOT_VERIFIED",
        "originalCommsOpenIncident": "NOT_VERIFIED",
        "originalIndependentAnchor": "NOT_VERIFIED",
        "threeOriginalHostStabilityHorizons": "NOT_VERIFIED",
        "independentReceiverHorizons": "NOT_VERIFIED",
        "closureAuthorityBoundary": "NOT_VERIFIED",
        "threeMasterRecurrence": "NOT_VERIFIED",
        "twoOwnerContinuity": "NOT_VERIFIED",
        "independentStabilityReviewAdmitted": False,
        "lastIndependentObservationAt": None,
        "message": "Original signed history and independent physical OFF are not verified.",
    }
