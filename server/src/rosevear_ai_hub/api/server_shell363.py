"""Build 363 / QL-472: owner-only local signed anchor and worker review (GET).

No public key, secret or path comes from browser query. No auto-install,
reboot, worker activation, receiver activation or other state change.
"""
from __future__ import annotations

import os
import platform
import time
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.api.server_shell353 import _read_protected353
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.master_custody363 import review363
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.models import User
from rosevear_ai_hub.signed_intake362 import HEX40

router = APIRouter(prefix="/api/v1/system/server-shell-363", tags=["server-shell363"])


def _public_key363(value: str | None) -> bytes | None:
    if not value:
        return None
    try:
        path = Path(value)
        if path.is_symlink() or not path.is_file() or not 1 <= path.stat().st_size <= 4096:
            return None
        return path.read_bytes()
    except OSError:
        return None


def local_custody363(
    *,
    machine_name: str,
    windows_host: bool,
    now_ms: int,
) -> dict[str, Any]:
    original = windows_host and machine_name.upper() == ORIGINAL_HOST
    expected = os.environ.get("ROSEVEAR_QL472_EXPECTED_COMMIT", "") if original else ""
    if not isinstance(expected, str) or not HEX40.fullmatch(expected):
        expected = ""
    def protected(env: str, limit: int) -> Any:
        return (
            _read_protected353(os.environ.get(env), max_bytes=limit)
            if original and expected
            else None
        )
    return review363(
        ledger=protected("ROSEVEAR_QL471_LEDGER_PATH", 262144),
        anchor=protected("ROSEVEAR_QL472_ANCHOR_PACKAGE_PATH", 8192),
        public_pem=(
            _public_key363(os.environ.get("ROSEVEAR_QL472_CUSTODIAN_PUBLIC_KEY_PATH"))
            if original and expected
            else None
        ),
        pin=os.environ.get("ROSEVEAR_QL472_CUSTODIAN_PUBLIC_PIN", "")
        if original and expected else "",
        expected_commit=expected,
        telemetry=protected("ROSEVEAR_QL470_TELEMETRY_PATH", 16384),
        now_ms=now_ms,
        original_host=original and bool(expected),
    )


@router.get("")
def get_custody363(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return local_custody363(
        machine_name=platform.node(),
        windows_host=os.name == "nt",
        now_ms=int(time.time() * 1000),
    )
