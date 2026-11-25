"""Original-host owner-only signed observation intake and readback."""

import os
import platform
import sqlite3
import time
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.it_operations385 import original_host385
from rosevear_ai_hub.models import User
from rosevear_ai_hub.release_identity389 import LOADED_SHA389
from rosevear_ai_hub.runtime_drift390 import MASTERS390, Observation390, intake390, snapshot390

router = APIRouter(prefix="/api/v1/system/runtime-drift-390", tags=["runtime390"])
Owner390 = Annotated[User, Depends(require_roles("owner"))]


def context390():
    if not original_host385(machine_name=platform.node(), windows_host=os.name == "nt"):
        raise HTTPException(409, "HOLD_NOT_ORIGINAL_HOST")
    ledger = os.environ.get("HUB_RUNTIME390_PRIVATE_LEDGER", "")
    if not ledger:
        raise HTTPException(409, "HOLD_PRIVATE_LEDGER_NOT_CONFIGURED")
    pins = {}
    targets = {}
    for source in MASTERS390:
        suffix = source.upper().replace("-", "_")
        pins[source] = os.environ.get("HUB_RUNTIME390_PIN_" + suffix, "")
        targets[source] = os.environ.get("HUB_RUNTIME390_TARGET_" + suffix, "")
    return Path(ledger), pins, targets


@router.get("")
def read_runtime390(response: Response, _owner: Owner390):
    response.headers["Cache-Control"] = "no-store"
    path, pins, targets = context390()
    try:
        return snapshot390(
            path,
            pins=pins,
            targets=targets,
            now_ms=int(time.time() * 1000),
            loaded_hub_sha=LOADED_SHA389,
        )
    except (OSError, sqlite3.Error, ValueError):
        raise HTTPException(409, "HOLD_RUNTIME_READBACK_FAILED") from None


@router.post("/observation")
def receive_runtime390(packet: Observation390, response: Response, _owner: Owner390):
    response.headers["Cache-Control"] = "no-store"
    path, pins, targets = context390()
    try:
        intake390(path, packet, pins=pins, targets=targets, now_ms=int(time.time() * 1000))
    except (OSError, sqlite3.Error, ValueError):
        raise HTTPException(409, "HOLD_RUNTIME_OBSERVATION_REJECTED") from None
    return {"accepted": True, "independentThreeMasterAcceptance": False}
