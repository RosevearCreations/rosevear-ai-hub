"""QL-445 read-only original-host status; never infer live receiver state."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-336-stability",
    tags=["master-shell-stability336"],
)


@router.get("")
def read_ql445_owner_stability(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    # No original Windows host or external signed observer feeds are attached.
    return {
        "schema": "rosevear.ai-hub.ql445-owner-stability.v1",
        "sourceBuild": 336,
        "state": "QL445_PROTECTED_POSTCLOSURE_SOURCE_UNVERIFIED",
        "connection": "HOLD",
        "activationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "receiver": "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION",
        "manualReceiverIsolationRequired": True,
        "freshPhysicalOffProven": False,
        "incidentClosed": False,
        "sourceHost": "DESKTOP-AE894KC",
        "ql444ProtectedClosure": "NOT_ENROLLED_IN_THIS_SOURCE",
        "originalCommsSource": "NOT_VERIFIED",
        "twoSignedHostProbes": "NOT_VERIFIED",
        "twoIndependentObservations": "NOT_VERIFIED",
        "recurrenceClassification": "UNVERIFIED",
        "recurrenceSuspected": False,
        "threeMasterReview": "NOT_VERIFIED",
        "dualOwnerReview": "NOT_VERIFIED",
        "lastIndependentObservationAt": None,
        "message": "Signed QL-445 original-device recurrence and stability evidence is not enrolled.",
    }
