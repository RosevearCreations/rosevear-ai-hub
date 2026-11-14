"""QL-449 owner-only, no-store historical disposition; never controls a device."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-340-disposition",
    tags=["master-shell-disposition340"],
)


@router.get("")
def read_ql449_owner_disposition(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    # No actual original host, external anchor or independent observer enrolled.
    return {
        "schema": "rosevear.ai-hub.ql449-owner-disposition.v1",
        "sourceBuild": 340,
        "state": "QL449_ORIGINAL_SIGNED_ANCHOR_AND_OFF_READBACK_NOT_ENROLLED_HOLD",
        "connection": "HOLD",
        "activationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "manualIsolationAndIndependentOffRequired": True,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "incidentStatus": "OPEN_UNVERIFIED",
        "incidentClosed": False,
        "originalHost": "DESKTOP-AE894KC",
        "ql448ProtectedCorrection": "NOT_VERIFIED",
        "originalCommsIncident": "NOT_VERIFIED",
        "independentExternalAnchor": "NOT_VERIFIED",
        "originalHostOffReadback": "NOT_VERIFIED",
        "independentReceiverReadback": "NOT_VERIFIED",
        "threeMasterDisposition": "NOT_VERIFIED",
        "twoOwnerDisposition": "NOT_VERIFIED",
        "independentAnchoredReviewAdmitted": False,
        "lastIndependentObservationAt": None,
        "message": "External signers and a fresh independent OFF readback are not verified.",
    }
