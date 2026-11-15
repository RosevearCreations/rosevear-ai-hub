"""Owner-only QL-454 policy registry readout; never a remote permission mint."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.cross_app_policy345 import (
    ACTIONS,
    POLICY_DIGEST,
    RESOURCE_MATRIX,
    ROLE_BY_TIER,
)
from rosevear_ai_hub.cross_app_security344 import ORDER, TIERS
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-345-policy",
    tags=["master-shell-policy345"],
)


@router.get("")
def read_ql454_policy(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return {
        "schema": "rosevear.ai-hub.ql454-policy-registry.v1",
        "sourceBuild": 345,
        "policyDigest": POLICY_DIGEST,
        "state": "QL454_SOURCE_POLICY_AVAILABLE_RUNTIME_FEDERATION_UNVERIFIED",
        "securityTiers": list(TIERS),
        "applicationHandoffOrder": list(ORDER),
        "resourceMatrix": RESOURCE_MATRIX,
        "roleByTier": ROLE_BY_TIER,
        "actionsByTier": ACTIONS,
        "allApplicationsEnforcing": False,
        "principalIssuerEnrollmentVerified": False,
        "crossTenantRlsVerified": False,
        "crossAppMessageDelivered": False,
        "crossAppConnectivityVerified": False,
        "originalHost": "DESKTOP-AE894KC",
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "incidentStatus": "OPEN",
        "connection": "HOLD",
        "activationAuthorized": False,
        "closureAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "nextBuild": "346 / QL-455",
        "message": (
            "Source-only policy evaluator and negative tests. Independent issuer "
            "enrollment, resource-to-DB binding, per-app enforcement, database RLS, "
            "message delivery and original physical receiver OFF remain unverified."
        ),
    }
