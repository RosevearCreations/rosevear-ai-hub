"""Build 366 original-host owner GET for durable signed source-claim history.

Only a deliberate local CLI can append to the SQLite journal. The browser cannot.
"""

from __future__ import annotations

import os
import platform
import time
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.models import User
from rosevear_ai_hub.sysop_history366 import summary366

router = APIRouter(prefix="/api/v1/system/sysop-history-366", tags=["sysop366"])


def local_history366(*, machine_name: str, windows_host: bool, now_ms: int) -> dict[str, Any]:
    original = windows_host and machine_name.upper() == ORIGINAL_HOST
    path = os.environ.get("ROSEVEAR_SYSOP366_PRIVATE_JOURNAL_PATH") if original else None
    return summary366(Path(path) if path else None, now_ms=now_ms, original_host=original)


@router.get("")
def get_sysop_history366(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return local_history366(
        machine_name=platform.node(),
        windows_host=os.name == "nt",
        now_ms=int(time.time() * 1000),
    )
