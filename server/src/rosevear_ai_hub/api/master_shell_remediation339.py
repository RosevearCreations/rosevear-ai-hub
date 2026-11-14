"""QL-448 owner-only, no-store historical remediation status; no receiver control."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-339-remediation",
    tags=["master-shell-remediation339"],
)


@router.get("")
def read_ql448_owner_remediation(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    # No genuine external original-host signer or independent OFF readback enrolled.
    return {
        "schema": "rosevear.ai-hub.ql448-owner-remediation.v1",
        "sourceBuild": 339,
        "state": "QL448_ORIGINAL_SIGNED_REMEDIATION_NOT_ENROLLED_HOLD",
        "connection": "HOLD",
        "activationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "manualIsolationAndIndependentOffRequired": True,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "incidentStatus": "OPEN_UNVERIFIED",
        "originalHost": "DESKTOP-AE894KC",
        "ql447ProtectedIncident": "NOT_VERIFIED",
        "originalCommsIncident": "NOT_VERIFIED",
        "independentCorrectiveOfficer": "NOT_VERIFIED",
        "shortMediumLongOriginalHost": "NOT_VERIFIED",
        "independentReceiverHorizons": "NOT_VERIFIED",
        "threeMasterContinuity": "NOT_VERIFIED",
        "twoOwnerDisposition": "NOT_VERIFIED",
        "exceptionClosurePreconditionsEvidenced": False,
        "lastIndependentObservationAt": None,
        "message": "External signer enrollment and live independent OFF are not verified.",
    }
