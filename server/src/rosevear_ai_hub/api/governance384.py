"""Build384 owner-only readbacks for seven-source governance and cached home PWS."""

from __future__ import annotations

import os
import platform
import time
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.governed_intake384 import governed_snapshot384
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.models import User
from rosevear_ai_hub.weather_pws384 import cached_weather384

router = APIRouter(prefix="/api/v1/system", tags=["governance384"])
Owner384 = Annotated[User, Depends(require_roles("owner"))]


def _original384() -> bool:
    return os.name == "nt" and platform.node().upper() == ORIGINAL_HOST


def _no_store384(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"


@router.get("/governance-384")
def get_governance384(response: Response, _owner: Owner384) -> dict[str, Any]:
    _no_store384(response)
    path = os.environ.get("ROSEVEAR_SYSOP366_PRIVATE_JOURNAL_PATH")
    return governed_snapshot384(
        Path(path) if path else None,
        now_ms=int(time.time() * 1000),
        original_host=_original384(),
    )


@router.get("/weather-station-384")
def get_weather384(response: Response, _owner: Owner384) -> dict[str, Any]:
    _no_store384(response)
    path = os.environ.get("ROSEVEAR_WU384_CACHE_DB")
    return cached_weather384(
        Path(path) if path else None,
        now_ms=int(time.time() * 1000),
        original_host=_original384(),
    )
