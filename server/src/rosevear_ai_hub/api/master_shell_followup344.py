"""Owner-only QL-453 status, default HOLD until genuine original signers enroll."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.cross_app_security344 import CONTRACT_DIGEST, ORDER, TIERS
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-344-followup",
    tags=["master-shell-followup344"],
)


@router.get("")
def read_ql453_owner_status(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return {
        "schema": "rosevear.ai-hub.ql453-owner-followup.v1",
        "sourceBuild": 344,
        "state": "QL453_ORIGINAL_SIGNED_FOLLOWUP_AND_EXPIRY_UNVERIFIED_HOLD",
        "connection": "HOLD",
        "incidentStatus": "OPEN_UNVERIFIED",
        "incidentClosed": False,
        "activationAuthorized": False,
        "closureAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "manualIsolationAndIndependentOffRequired": True,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "originalHost": "DESKTOP-AE894KC",
        "ql452ProtectedHistory": "NOT_VERIFIED",
        "independentFreshOffReadback": "NOT_VERIFIED",
        "offReadbackExpiresAt": None,
        "signedOwnerReview": "NOT_VERIFIED",
        "threeMasterHandoff": "NOT_VERIFIED",
        "driftEscalation": "REQUIRED_IF_UNVERIFIED",
        "crossAppConnectivityVerified": False,
        "handoffContractDigest": CONTRACT_DIGEST,
        "applicationHandoffOrder": list(ORDER),
        "securityTiers": list(TIERS),
        "nextMasterHandoff": "rosevear-comms-hub",
        "messageDelivered": False,
        "message": (
            "Signed source contract only. Original host, physical OFF, "
            "independent signer enrollment and live cross-app transport remain unverified."
        ),
    }
