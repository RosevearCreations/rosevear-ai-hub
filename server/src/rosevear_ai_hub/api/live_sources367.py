"""Build 367 owner-only local readback of TLS+Ed25519 source receipts.

No browser polling of peers, no saved credentials, no network side effects.
"""

from __future__ import annotations

import os
import platform
import time
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.live_sources367 import summary367
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.models import User

router = APIRouter(prefix="/api/v1/system/sysop-live-367", tags=["sysop367"])


def local_live367(*, machine_name: str, windows_host: bool, now_ms: int) -> dict[str, Any]:
    original = windows_host and machine_name.upper() == ORIGINAL_HOST
    private = os.environ.get("ROSEVEAR_SYSOP366_PRIVATE_JOURNAL_PATH") if original else None
    return summary367(Path(private) if private else None, now_ms=now_ms, original_host=original)


@router.get("")
def get_sysop_live367(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return local_live367(
        machine_name=platform.node(),
        windows_host=os.name == "nt",
        now_ms=int(time.time() * 1000),
    )
