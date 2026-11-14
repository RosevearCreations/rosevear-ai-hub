"""QL-447 owner-only historical incident follow-up status: no hardware control."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-338-incident",
    tags=["master-shell-incident338"],
)


@router.get("")
def read_ql447_owner_incident(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Original Windows host/external receiver signing authority is not enrolled.
    return {
        "schema": "rosevear.ai-hub.ql447-owner-incident.v1",
        "sourceBuild": 338,
        "state": "QL447_ORIGINAL_HOST_SIGNED_ISOLATION_NOT_ENROLLED_HOLD",
        "connection": "HOLD",
        "activationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "manualIsolationAndIndependentOffRequired": True,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "incidentStatus": "OPEN_UNVERIFIED",
        "originalHost": "DESKTOP-AE894KC",
        "ql446ProtectedRecurrence": "NOT_VERIFIED",
        "commsOriginalIncidentIntake": "NOT_VERIFIED",
        "signedHostIsolation": "NOT_VERIFIED",
        "independentIsolation": "NOT_VERIFIED",
        "threeMasterCorrectiveFollowUp": "NOT_VERIFIED",
        "twoOwnerFollowUp": "NOT_VERIFIED",
        "lastIndependentObservationAt": None,
        "message": "No live signer enrollment. Incident is held; physical receiver state UNKNOWN.",
    }
