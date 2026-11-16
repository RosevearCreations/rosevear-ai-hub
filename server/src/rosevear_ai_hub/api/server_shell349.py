"""Build 349: owner-only monitoring data; no credential upload or remote actions."""

import os
import time
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.master_shell349 import capability_snapshot349, load_local_manifest349
from rosevear_ai_hub.models import User

router = APIRouter(
    prefix="/api/v1/system/server-shell-349",
    tags=["server-shell349"],
)


@router.get("")
def get_server_shell349(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    path = os.environ.get("ROSEVEAR_QL458_MANIFEST_PATH")
    key = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PATH")
    pin = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PIN")
    result = load_local_manifest349(
        Path(path) if path else None,
        Path(key) if key else None,
        pin,
        int(time.time() * 1000),
    )
    return capability_snapshot349(result)
