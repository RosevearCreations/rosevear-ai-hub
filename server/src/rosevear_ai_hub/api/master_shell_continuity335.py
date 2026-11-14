"""QL-444 authenticated owner-only evidence status; no physical OFF claims."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-335-continuity",
    tags=["master-shell-continuity335"],
)


@router.get("")
def read_ql444_owner_continuity(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    # No remote original-host journals or physical receiver state are enrolled here.
    return {
        "schema": "rosevear.ai-hub.ql444-owner-continuity.v1",
        "sourceBuild": 335,
        "state": "QL444_TWO_SAMPLE_SIGNED_OFF_AND_OWNER_CLOSURE_NOT_ENROLLED",
        "connection": "HOLD",
        "activationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "receiver": "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION",
        "manualReceiverIsolationRequired": True,
        "freshPhysicalOffProven": False,
        "incidentClosed": False,
        "leaseDisposition": "UNVERIFIED",
        "sourceHost": "DESKTOP-AE894KC",
        "signedHostContinuity": "NOT_VERIFIED",
        "twoSampleIndependentOffWatch": "NOT_VERIFIED",
        "leaseExceptionRemediation": "UNVERIFIED_REVIEW_REQUIRED",
        "threeMasterClosure": "NOT_VERIFIED",
        "dualOwnerClosure": "NOT_VERIFIED",
        "protectedHistoricalClosure": "NOT_ENROLLED_IN_THIS_READ_ONLY_SOURCE",
        "lastIndependentOffAt": None,
        "message": "No independently signed QL-444 source custody is enrolled.",
    }
