"""QL-464 original-host startup readiness (owner-only, no lifecycle operations)."""
from __future__ import annotations

import os
import platform
import time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.api.server_shell353 import _read_protected353
from rosevear_ai_hub.api.server_shell354 import local_acceptance_snapshot354
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.master_readiness355 import readiness_snapshot355
from rosevear_ai_hub.master_runtime350 import installed_shell_snapshot350
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.models import User

router = APIRouter(prefix="/api/v1/system/server-shell-355", tags=["server-shell355"])


def local_readiness_snapshot355(*, now_ms: int, machine_name: str) -> dict[str, Any]:
    real_host = os.name == "nt" and machine_name.upper() == ORIGINAL_HOST
    inventory = (
        _read_protected353(
            os.environ.get("ROSEVEAR_QL464_STARTUP_INVENTORY_PATH"),
            max_bytes=16_384,
        )
        if real_host else None
    )
    return readiness_snapshot355(
        source350=installed_shell_snapshot350(),
        source354=local_acceptance_snapshot354(now_ms=now_ms, machine_name=machine_name),
        inventory=inventory,
        now_ms=now_ms,
        original_host=real_host,
    )


@router.get("")
def get_server_shell355(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return local_readiness_snapshot355(
        now_ms=int(time.time() * 1000),
        machine_name=platform.node(),
    )
