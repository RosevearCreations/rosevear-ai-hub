"""Owner-only source inventory for Build 346 / QL-455.

No ledger is initialized through HTTP. A status GET is not a transport probe.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.cross_app_security344 import CONTRACT_DIGEST, ORDER, TIERS
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-346-mailbox",
    tags=["master-shell-mailbox346"],
)


@router.get("")
def read_signed_mailbox346(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return {
        "schema": "rosevear.ai-hub.ql455-owner-mailbox.v1",
        "sourceBuild": 346,
        "state": "QL455_PROTECTED_LEDGER_RUNTIME_NOT_ENROLLED_HOLD",
        "outboxEnrolled": False,
        "inboxEnrolled": False,
        "trustedTransportConfigured": False,
        "durableReplayRuntimeVerified": False,
        "signedRecipientAckRuntimeVerified": False,
        "messageDelivered": False,
        "crossAppConnectivityVerified": False,
        "connection": "HOLD",
        "incidentStatus": "OPEN_UNVERIFIED",
        "physicalReceiverCurrentlyOff": False,
        "activationAuthorized": False,
        "closureAuthorized": False,
        "originalHost": "DESKTOP-AE894KC",
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "masterTheme": "rosevear-master-instrument.v1",
        "handoffContractDigest": CONTRACT_DIGEST,
        "securityTiers": list(TIERS),
        "applicationOrder": list(ORDER),
        "nextMasterHandoff": "rosevear-comms-hub",
        "message": (
            "Signed storage/retry/ACK source code is present. Real recipient keys, "
            "protected DB enrollment and sender-to-recipient transport are NOT verified."
        ),
    }
