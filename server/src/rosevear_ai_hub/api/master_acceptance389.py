"""Owner-only local release readiness and signed Master receipt exchange."""

import os
import platform
import sqlite3
import time
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.it_operations385 import original_host385, runtime_snapshot385
from rosevear_ai_hub.master_acceptance389 import MASTERS, Packet389, intake389, issue389, read389
from rosevear_ai_hub.models import User
from rosevear_ai_hub.release_identity389 import loaded_identity389

router = APIRouter(prefix="/api/v1/system/master-acceptance-389", tags=["master389"])
Owner389 = Annotated[User, Depends(require_roles("owner"))]


def original389():
    return original_host385(machine_name=platform.node(), windows_host=os.name == "nt")


def context389(owner):
    if not original389():
        raise ValueError("HOLD_NOT_ORIGINAL_HOST")
    raw = os.environ.get("HUB_MASTER389_PRIVATE_LEDGER", "")
    if not raw:
        raise ValueError("HOLD_PRIVATE_LEDGER_NOT_CONFIGURED")
    pins = {}
    targets = {}
    for source in MASTERS:
        suffix = source.upper().replace("-", "_")
        pins[source] = os.environ.get("HUB_MASTER389_PIN_" + suffix, "")
        targets[source] = os.environ.get("HUB_MASTER389_TARGET_" + suffix, "")
    return Path(raw), {
        "pins": pins,
        "targets": targets,
        "loaded": loaded_identity389()["sha"],
        "owner": owner.id,
        "now": int(time.time() * 1000),
    }


def no_store389(response):
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["X-Content-Type-Options"] = "nosniff"


@router.get("")
def readiness389(response: Response, owner: Owner389):
    no_store389(response)
    original = original389()
    identity = loaded_identity389() if original else None
    runtime = runtime_snapshot385(now_ms=int(time.time() * 1000), original_host=original)
    signed = False
    try:
        path, kwargs = context389(owner)
        signed = read389(path, **kwargs)
    except (OSError, sqlite3.Error, ValueError):
        pass
    return {
        "originalHostMatched": original,
        "loadedIdentity": identity,
        "localRuntimeStatus": runtime["status"],
        "signedThreeMasterChallengeVerified": signed,
        "independentTransportAndPhysicalAcceptance": False,
        "releaseManagerGatesStillRequired": True,
        "remoteRecoveryAuthorized": False,
        "receiverActivationAuthorized": False,
    }


@router.post("/challenge")
def challenge389(response: Response, owner: Owner389):
    no_store389(response)
    try:
        path, kwargs = context389(owner)
        return issue389(path, **kwargs)
    except (OSError, sqlite3.Error, ValueError):
        raise HTTPException(409, "HOLD_CHALLENGE_UNAVAILABLE") from None


@router.post("/receipt")
def receipt389(packet: Packet389, response: Response, owner: Owner389):
    no_store389(response)
    try:
        path, kwargs = context389(owner)
        intake389(path, packet, **kwargs)
    except (OSError, sqlite3.Error, ValueError):
        raise HTTPException(409, "HOLD_RECEIPT_REJECTED") from None
    return {"stored": True, "independentTransportAndPhysicalAcceptance": False}
