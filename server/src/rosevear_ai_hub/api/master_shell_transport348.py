"""QL-457 owner-only installed source truth. No live peer probe or enrollment."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-348-transport",
    tags=["master-shell-transport348"],
)


@router.get("")
def read_transport_readiness348(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return {
        "schema": "rosevear.ai-hub.ql457-transport-readiness.v1",
        "sourceBuild": 348,
        "protocolPreferred": "1.1",
        "protocolLegacyCompatible": "1.0",
        "independentAppReleases": True,
        "failOnlyDependentCapability": True,
        "codeSupportsPinnedMutualTLS": True,
        "codeSupportsSignedPilotAck": True,
        "localPeerEnrollmentVerified": False,
        "liveMutualTLSRoundTripVerified": False,
        "liveSignedRecipientAckVerified": False,
        "livePilotReceiptPersisted": False,
        "crossAppConnectivityVerified": False,
        "messageDelivered": False,
        "connection": "HOLD",
        "incidentStatus": "OPEN_UNVERIFIED",
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "activationAuthorized": False,
        "closureAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "mode": "OWNER_REVIEW_REQUIRED_DISABLED",
        "allowedCapabilityTypes": [
            "governance.readonly",
            "business.health.readonly",
            "master.health.readonly",
        ],
        "unaffectedVercelApps": ["ai-data-platform", "iCamp", "YW"],
        "message": (
            "Source supports opt-in pinned mTLS and signed ACK tests. "
            "No real peer keys, TLS certificates or original-host receiver "
            "are enrolled by this endpoint. CI loopback is not production connectivity."
        ),
    }
