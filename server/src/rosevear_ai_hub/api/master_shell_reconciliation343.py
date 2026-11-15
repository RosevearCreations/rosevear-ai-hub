"""Owner-only QL-452 read-only original-host reconciliation state.

No synthetic receipt is promoted into operational authority.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-343-reconciliation",
    tags=["master-shell-reconciliation343"],
)


@router.get("")
def read_ql452_owner_reconciliation(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return {
        "schema": "rosevear.ai-hub.ql452-owner-reconciliation.v1",
        "sourceBuild": 343,
        "state": "QL452_ORIGINAL_SIGNED_OUTCOME_AND_FOLLOWUP_NOT_ENROLLED_HOLD",
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
        "ql451ProtectedOutcome": "NOT_VERIFIED",
        "independentExceptionFollowUp": "NOT_VERIFIED",
        "originalHostFreshOffReadback": "NOT_VERIFIED",
        "threeMasterGovernance": "NOT_VERIFIED",
        "dualOwnerClosureBoundary": "NOT_VERIFIED",
        "lastIndependentObservationAt": None,
        "nextMasterHandoff": "rosevear-comms-hub",
        "applicationHandoffOrder": [
            "ai-data-platform",
            "rosevear-ai-hub",
            "rosevear-comms-hub",
            "iCamp",
            "YW",
            "devilndove",
            "rosiedazzlers",
        ],
        "connectivityVerified": False,
        "message": (
            "Source-only QL-452 verification. No real signed follow-up, "
            "current physical OFF, cross-app connectivity or closure is certified."
        ),
    }
