"""Build387: restricted, on-demand source/field campaign readback only."""

from __future__ import annotations

import os
import platform
import sqlite3
import time
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Response

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.campaign387 import campaign_snapshot387
from rosevear_ai_hub.field_custody388 import (
    Intake388,
    Issue388,
    Review388,
    intake388,
    issue388,
    review388,
    snapshot388,
)
from rosevear_ai_hub.field_witness388 import WitnessPair388, reconcile388
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
        original_host=original_host385(machine_name=platform.node(), windows_host=os.name == "nt"),
    )


@router.post("/field-witness-reconcile-388")
def reconcile_field_witness388(
    pair: WitnessPair388, response: Response, _owner: Owner387
) -> dict[str, object]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return reconcile388(
        pair,
        now_ms=int(time.time() * 1000),
        original_key=os.environ.get("HUB_FIELD388_ORIGINAL_PUBLIC_KEY", ""),
        reviewer_key=os.environ.get("HUB_FIELD388_REVIEWER_PUBLIC_KEY", ""),
        release_sha=os.environ.get("HUB_FIELD388_RELEASE_SHA", ""),
        original_host=original_host385(machine_name=platform.node(), windows_host=os.name == "nt"),
    )


def _custody388() -> Path:
    if not original_host385(machine_name=platform.node(), windows_host=os.name == "nt"):
        raise HTTPException(409, "HOLD_NOT_ORIGINAL_HOST")
    path = os.environ.get("HUB_FIELD388_PRIVATE_LEDGER", "")
    if not path:
        raise HTTPException(409, "HOLD_PRIVATE_LEDGER_NOT_CONFIGURED")
    return Path(path)


def _pins388() -> dict[str, str]:
    return {
        "original_key": os.environ.get("HUB_FIELD388_ORIGINAL_PUBLIC_KEY", ""),
        "reviewer_key": os.environ.get("HUB_FIELD388_REVIEWER_PUBLIC_KEY", ""),
        "release_sha": os.environ.get("HUB_FIELD388_RELEASE_SHA", ""),
    }


def _local_call388(response: Response, action, *args, **kwargs):
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    try:
        return action(_custody388(), *args, **kwargs)
    except (OSError, sqlite3.Error, ValueError):
        raise HTTPException(409, "HOLD_PRIVATE_CUSTODY_VALIDATION_FAILED") from None


@router.post("/field-witness-388/challenge")
def issue_field388(payload: Issue388, response: Response, owner: Owner387):
    return _local_call388(
        response,
        issue388,
        gate=payload.gate_id,
        owner=owner.id,
        now_ms=int(time.time() * 1000),
        **_pins388(),
    )


@router.post("/field-witness-388/intake")
def intake_field388(payload: Intake388, response: Response, owner: Owner387):
    return _local_call388(
        response,
        intake388,
        payload,
        owner=owner.id,
        now_ms=int(time.time() * 1000),
        **_pins388(),
    )


@router.post("/field-witness-388/review")
def review_field388(payload: Review388, response: Response, owner: Owner387):
    return _local_call388(
        response,
        review388,
        payload,
        owner=owner.id,
        now_ms=int(time.time() * 1000),
        **_pins388(),
    )


@router.get("/field-witness-388")
def read_field388(response: Response, owner: Owner387):
    return _local_call388(
        response,
        snapshot388,
        owner=owner.id,
        release_sha=_pins388()["release_sha"],
    )
