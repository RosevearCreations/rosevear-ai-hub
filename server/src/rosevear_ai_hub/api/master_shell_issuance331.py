"""Authenticated read-only QL-440 custody status, never an issuer endpoint."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/master-shell-331-issuance",
    tags=["master-shell-issuance331"],
)


@router.get("")
def read_ql440_owner_status(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return {
        "sourceBuild": 331,
        "schema": "rosevear.ai-hub.ql440-owner-source.v1",
        "state": "QL440_DURABLE_PRIVATE_ISSUANCE_NEW_OFF_AND_OWNER_CHALLENGE_REQUIRED",
        "connection": "HOLD",
        "activationAuthorized": False,
        "ceremonyAuthorizationIssued": False,
        "receiver": "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION",
        "message": "Original-host challenge issuance not independently verified.",
    }
