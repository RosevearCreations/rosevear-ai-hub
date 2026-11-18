"""Build 365 owner-only read endpoint for optional private signed source snapshots.

No network polling, browser uploads, service/process restart or QL-340C authority.
A manually supplied signed file is not proof of an authenticated live connection.
"""

from __future__ import annotations

import os
import platform
import time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.api.server_shell353 import _read_protected353
from rosevear_ai_hub.api.server_shell364 import protected_key364
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.models import User
from rosevear_ai_hub.seven_app_stats365 import APPS, seven_app_summary365

router = APIRouter(prefix="/api/v1/system/sysop-statistics-365", tags=["sysop365"])

TAG = {
    "ai-data-platform": "AIDP",
    "rosevear-ai-hub": "HUB",
    "rosevear-comms-hub": "COMMS",
    "yw": "YW",
    "icamp": "ICAMP",
    "rosiedazzlers": "ROSIE",
    "devilndove": "DEVIL",
}


def local_statistics365(*, machine_name: str, windows_host: bool, now_ms: int) -> dict[str, Any]:
    original = windows_host and machine_name.upper() == ORIGINAL_HOST
    inputs: dict[str, Any] = {}
    keys: dict[str, bytes | None] = {}
    pins: dict[str, str] = {}
    commits: dict[str, str] = {}
    if original:
        for app in APPS:
            prefix = "ROSEVEAR_SYSOP365_" + TAG[app] + "_"
            inputs[app] = _read_protected353(
                os.environ.get(prefix + "SIGNED_JSON_PATH"), max_bytes=8192
            )
            keys[app] = protected_key364(os.environ.get(prefix + "PUBLIC_KEY_PATH"))
            pins[app] = os.environ.get(prefix + "PUBLIC_KEY_PIN", "")
            commits[app] = os.environ.get(prefix + "SOURCE_COMMIT", "")
    return seven_app_summary365(
        inputs, keys, pins, commits, now_ms=now_ms, original_host=original
    )


@router.get("")
def get_sysop_statistics365(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return local_statistics365(
        machine_name=platform.node(),
        windows_host=os.name == "nt",
        now_ms=int(time.time() * 1000),
    )
