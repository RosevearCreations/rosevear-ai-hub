"""Build387: restricted, on-demand source/field campaign readback only."""

from __future__ import annotations

import os
import platform
import time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.campaign387 import campaign_snapshot387
from rosevear_ai_hub.it_operations385 import original_host385
from rosevear_ai_hub.models import User

router = APIRouter(prefix="/api/v1/system", tags=["acceptance387"])
Owner387 = Annotated[User, Depends(require_roles("owner"))]


@router.get("/household-master-campaign-387")
def get_household_master_campaign387(response: Response, _owner: Owner387) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return campaign_snapshot387(
        now_ms=int(time.time() * 1000),
        original_host=original_host385(
            machine_name=platform.node(), windows_host=os.name == "nt"
        ),
    )
