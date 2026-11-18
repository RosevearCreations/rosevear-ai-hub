"""Build 362: owner-only read-only historical signed-claim intake dashboard.

Private ledger is selected only by original-host server configuration. The
browser cannot upload raw evidence or authorize any task/worker or receiver.
"""

from __future__ import annotations

import os
import platform
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.api.server_shell353 import _read_protected353
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.models import User
from rosevear_ai_hub.signed_intake362 import HEX40, dashboard

router = APIRouter(prefix="/api/v1/system/server-shell-362", tags=["server-shell362"])


def local_history362(*, machine_name: str, windows_host: bool) -> dict[str, Any]:
    original = windows_host and machine_name.upper() == ORIGINAL_HOST
    expected = os.environ.get("ROSEVEAR_QL471_EXPECTED_COMMIT", "") if original else ""
    if not isinstance(expected, str) or not HEX40.fullmatch(expected):
        expected = ""
    ledger = (
        _read_protected353(os.environ.get("ROSEVEAR_QL471_LEDGER_PATH"), max_bytes=262144)
        if original and expected
        else None
    )
    return dashboard(ledger, expected)


@router.get("")
def get_server_shell362(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return local_history362(
        machine_name=platform.node(),
        windows_host=os.name == "nt",
    )
