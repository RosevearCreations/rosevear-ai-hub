"""Read-only owner resilience forecast using authenticated local receipt custody."""

import sqlite3
import time

from fastapi import APIRouter, HTTPException, Response

from rosevear_ai_hub.api.runtime_drift390 import Owner390, context390
from rosevear_ai_hub.release_identity389 import LOADED_SHA389
from rosevear_ai_hub.runtime_drift390 import snapshot390
from rosevear_ai_hub.runtime_resilience391 import forecast391

router = APIRouter(prefix="/api/v1/system/runtime-resilience-391", tags=["resilience391"])


@router.get("")
def read_resilience391(response: Response, _owner: Owner390):
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["X-Content-Type-Options"] = "nosniff"
    path, pins, targets = context390()
    now = int(time.time() * 1000)
    try:
        report = snapshot390(
            path, pins=pins, targets=targets, now_ms=now, loaded_hub_sha=LOADED_SHA389
        )
        return forecast391(report, now_ms=now)
    except (OSError, sqlite3.Error, ValueError, TypeError, KeyError):
        raise HTTPException(409, "HOLD_RESILIENCE_READBACK_FAILED") from None
