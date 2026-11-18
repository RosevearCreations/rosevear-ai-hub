"""QL-470 read-only authenticated owner view of original-PC acceptance evidence.

No HTTP device/task/service lifecycle or receiver endpoints. Private source paths
are server configured only, never accepted from a browser request.
"""

from __future__ import annotations

import os
import platform
import time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.api.server_shell353 import _read_protected353
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.master_acceptance361 import acceptance361
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.models import User

router = APIRouter(prefix="/api/v1/system/server-shell-361", tags=["server-shell361"])


def local_acceptance361(*, now_ms: int, machine_name: str, windows_host: bool) -> dict[str, Any]:
    original = windows_host and machine_name.upper() == ORIGINAL_HOST
    expected = os.environ.get("ROSEVEAR_QL470_EXPECTED_COMMIT", "") if original else ""
    telemetry = (
        _read_protected353(os.environ.get("ROSEVEAR_QL470_TELEMETRY_PATH"), max_bytes=16384)
        if original
        else None
    )
    review = (
        _read_protected353(os.environ.get("ROSEVEAR_QL470_FIELD_REPORT_PATH"), max_bytes=16384)
        if original
        else None
    )
    return acceptance361(
        telemetry=telemetry,
        field_report=review,
        now_ms=now_ms,
        machine_name=machine_name,
        original_host_process=windows_host,
        expected_commit=expected,
    )


@router.get("")
def get_server_shell361(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return local_acceptance361(
        now_ms=int(time.time() * 1000),
        machine_name=platform.node(),
        windows_host=os.name == "nt",
    )
