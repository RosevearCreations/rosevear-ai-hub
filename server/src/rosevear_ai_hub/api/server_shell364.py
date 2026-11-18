"""QL-473 owner-only local evidence review. Never probes or actuates live devices.

Independent off-host readback is supplied as a private separate file, not
retrieved from a network by the Hub. Signing keys and endpoints remain private.
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
from rosevear_ai_hub.master_review364 import SERVICES, review364
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.models import User
from rosevear_ai_hub.signed_intake362 import HEX40

router = APIRouter(prefix="/api/v1/system/server-shell-364", tags=["server-shell364"])


def protected_key364(value: str | None) -> bytes | None:
    if not value:
        return None
    try:
        path = Path(value)
        if path.is_symlink() or not path.is_file() or not 1 <= path.stat().st_size <= 4096:
            return None
        return path.read_bytes()
    except OSError:
        return None


def local_review364(
    *,
    machine_name: str,
    windows_host: bool,
    now_ms: int,
) -> dict[str, Any]:
    original = windows_host and machine_name.upper() == ORIGINAL_HOST
    expected = os.environ.get("ROSEVEAR_QL473_EXPECTED_COMMIT", "") if original else ""
    if type(expected) is not str or HEX40.fullmatch(expected) is None:
        expected = ""

    def load_json(name: str, limit: int = 16384) -> Any:
        return (
            _read_protected353(os.environ.get(name), max_bytes=limit)
            if original and expected
            else None
        )

    def load_key(name: str) -> bytes | None:
        return protected_key364(os.environ.get(name)) if original and expected else None

    copied_path = os.environ.get("ROSEVEAR_QL473_COPIED_LEDGER_PATH")
    original_path = os.environ.get("ROSEVEAR_QL471_LEDGER_PATH")
    distinct_copy = bool(
        copied_path
        and original_path
        and Path(copied_path).resolve(strict=False) != Path(original_path).resolve(strict=False)
        and not Path(copied_path).is_symlink()
    )
    tags = {
        "Rosevear-AIHub": "HUB",
        "Rosevear-AIDataPlatform": "AIDP",
        "Rosevear-CommsHub": "COMMS",
    }
    return review364(
        ledger=load_json("ROSEVEAR_QL471_LEDGER_PATH", 262144),
        copy=load_json("ROSEVEAR_QL473_COPIED_LEDGER_PATH", 262144) if distinct_copy else None,
        anchor=load_json("ROSEVEAR_QL472_ANCHOR_PACKAGE_PATH", 8192),
        anchor_key=load_key("ROSEVEAR_QL472_CUSTODIAN_PUBLIC_KEY_PATH"),
        anchor_pin=os.environ.get("ROSEVEAR_QL472_CUSTODIAN_PUBLIC_PIN", "")
        if original and expected
        else "",
        readback=load_json("ROSEVEAR_QL473_READBACK_RECEIPT_PATH", 8192),
        readback_key=load_key("ROSEVEAR_QL473_READBACK_PUBLIC_KEY_PATH"),
        readback_pin=os.environ.get("ROSEVEAR_QL473_READBACK_PUBLIC_PIN", "")
        if original and expected
        else "",
        pilot=load_json("ROSEVEAR_QL473_PILOT_ENVELOPE_PATH", 8192),
        peer_keys={
            service: load_key("ROSEVEAR_QL473_PEER_" + tags[service] + "_PUBLIC_KEY_PATH")
            for service in SERVICES
        },
        peer_pins={
            service: os.environ.get(
                "ROSEVEAR_QL473_PEER_" + tags[service] + "_PUBLIC_PIN", ""
            )
            if original and expected
            else ""
            for service in SERVICES
        },
        expected_commit=expected,
        now_ms=now_ms,
        original_host=original and bool(expected),
    )


@router.get("")
def get_review364(
    response: Response,
    _owner: Annotated[User, Depends(require_roles("owner"))],
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return local_review364(
        machine_name=platform.node(),
        windows_host=os.name == "nt",
        now_ms=int(time.time() * 1000),
    )
