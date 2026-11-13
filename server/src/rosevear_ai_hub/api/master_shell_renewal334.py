"""Build 334 source-only QL-443 owner status: no physical receiver assertions."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-334-renewal",
    tags=["master-shell-renewal334"],
)


@router.get("")
def read_ql443_owner_renewal(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    # No original-host protected journals or independently enrolled signers here.
    return {
        "schema": "rosevear.ai-hub.ql443-owner-renewal.v1",
        "sourceBuild": 334,
        "state": "QL443_PROTECTED_CUSTODY_AND_FRESH_EXTERNAL_OFF_UNVERIFIED",
        "connection": "HOLD",
        "activationAuthorized": False,
        "receiver": "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION",
        "manualReceiverIsolationRequired": True,
        "physicalReceiverCurrentlyOff": False,
        "freshPhysicalOffProven": False,
        "incidentClosed": False,
        "leaseDisposition": "UNVERIFIED",
        "sourceHost": "DESKTOP-AE894KC",
        "historicalAdmission": "NOT_ENROLLED_IN_THIS_READ_ONLY_SOURCE",
        "expiredLeaseException": "UNVERIFIED_REVIEW_REQUIRED",
        "threeMasterFreshOff": "NOT_VERIFIED",
        "lastFreshIndependentOffAt": None,
        "message": "QL-443 signed custody and physical receiver OFF remain unverified.",
    }
