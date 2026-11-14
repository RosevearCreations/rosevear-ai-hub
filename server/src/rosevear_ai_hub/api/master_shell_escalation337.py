"""QL-446 owner-only, no-store historical incident evidence status."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-337-escalation",
    tags=["master-shell-escalation337"],
)


@router.get("")
def read_ql446_owner_escalation(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    # No trusted original Windows host or independent receiver keys enrolled.
    return {
        "schema": "rosevear.ai-hub.ql446-owner-escalation.v1",
        "sourceBuild": 337,
        "state": "QL446_MULTI_HORIZON_SOURCE_NOT_ENROLLED_HOLD",
        "connection": "HOLD",
        "activationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "manualIsolationAndIndependentOffRequired": True,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "originalHost": "DESKTOP-AE894KC",
        "ql445ProtectedSource": "NOT_VERIFIED",
        "signedCommsReadback": "NOT_VERIFIED",
        "shortMediumLongProbes": "NOT_VERIFIED",
        "independentReceiverObservations": "NOT_VERIFIED",
        "recurrenceClassification": "UNVERIFIED",
        "escalationOfficer": "NOT_VERIFIED",
        "threeMasterReopening": "NOT_VERIFIED",
        "twoOwnerDecision": "NOT_VERIFIED",
        "lastIndependentObservationAt": None,
        "message": "Signed QL-446 evidence is not enrolled; live receiver state is unknown.",
    }
