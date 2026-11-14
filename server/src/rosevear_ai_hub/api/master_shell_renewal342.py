"""QL-451 owner-only GET: unverified original-host renewal remains OPEN/HOLD."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-342-renewal",
    tags=["master-shell-renewal342"],
)


@router.get("")
def read_ql451_owner_renewal(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return {
        "schema": "rosevear.ai-hub.ql451-owner-renewal.v1",
        "sourceBuild": 342,
        "state": "QL451_ORIGINAL_SIGNED_RESPONSE_AND_OFF_RENEWAL_NOT_ENROLLED_HOLD",
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
        "ql450ProtectedReview": "NOT_VERIFIED",
        "originalCommsOpenCase": "NOT_VERIFIED",
        "independentResponseOfficer": "NOT_VERIFIED",
        "independentExternalAnchor": "NOT_VERIFIED",
        "originalHostRenewalHorizons": "NOT_VERIFIED",
        "independentReceiverHorizons": "NOT_VERIFIED",
        "independentClosureBoundary": "NOT_VERIFIED",
        "threeMasterReassessment": "NOT_VERIFIED",
        "twoOwnerReassessment": "NOT_VERIFIED",
        "responsePreconditionsEvidenced": False,
        "lastIndependentObservationAt": None,
        "message": "Real external signers and current physical OFF are not verified.",
    }
