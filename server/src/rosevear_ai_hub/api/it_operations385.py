"""Build385 owner-only original-Windows runtime and private structured service desk."""

from __future__ import annotations

import os
import platform
import time
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.it_operations385 import (
    create_ticket385,
    original_host385,
    runtime_snapshot385,
    service_desk_snapshot385,
    transition_ticket385,
)
from rosevear_ai_hub.models import User

router = APIRouter(prefix="/api/v1/system/it-ops-385", tags=["it-ops385"])
Owner385 = Annotated[User, Depends(require_roles("owner"))]
Application385 = Literal[
    "ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub",
    "yw", "icamp", "rosiedazzlers", "devilndove",
]
Category385 = Literal["incident", "complaint", "support", "maintenance"]
Summary385 = Literal[
    "SERVICE_UNAVAILABLE", "LATENCY_SLOW", "PROCESS_RESTART_REPORTED",
    "LAN_ISSUE_REPORTED", "SUPPORT_REQUEST", "COMPLAINT",
    "RECOVERY_EVIDENCE_REVIEW", "OTHER",
]
Evidence385 = Literal[
    "OWNER_REPORT_UNVERIFIED", "LOCAL_RUNTIME_SAMPLE_UNSIGNED",
    "SOURCE_RECEIPT_REFERENCE_UNATTESTED",
]
Status385 = Literal["open", "investigating", "waiting", "resolved"]


class TicketCreate385(BaseModel):
    model_config = ConfigDict(extra="forbid")
    app_id: Application385
    category: Category385
    summary_code: Summary385
    target_hours: Literal[4, 24, 72, 168]
    evidence_kind: Evidence385 = "OWNER_REPORT_UNVERIFIED"
    evidence_sha256: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")


class TicketTransition385(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int = Field(ge=1)
    status: Status385
    evidence_kind: Evidence385 = "OWNER_REPORT_UNVERIFIED"
    evidence_sha256: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")


def _no_store385(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"


def _original385() -> bool:
    return original_host385(machine_name=platform.node(), windows_host=os.name == "nt")


def _journal385() -> Path:
    value = os.environ.get("ROSEVEAR_IT385_PRIVATE_DB")
    if not value:
        raise HTTPException(status_code=409, detail="HOLD_PRIVATE_IT385_DB_NOT_CONFIGURED")
    return Path(value)


def _reject_invalid385(error: ValueError) -> None:
    raise HTTPException(status_code=409, detail=str(error)) from None


@router.get("/diagnostics")
def read_diagnostics385(response: Response, _owner: Owner385) -> dict[str, Any]:
    _no_store385(response)
    return runtime_snapshot385(
        now_ms=int(time.time() * 1000),
        original_host=_original385(),
    )


@router.get("/tickets")
def read_tickets385(response: Response, _owner: Owner385) -> dict[str, Any]:
    _no_store385(response)
    value = os.environ.get("ROSEVEAR_IT385_PRIVATE_DB")
    return service_desk_snapshot385(
        Path(value) if value else None,
        now_ms=int(time.time() * 1000),
        original_host=_original385(),
    )


@router.post("/tickets", status_code=201)
def create_ticket_endpoint385(
    payload: TicketCreate385, response: Response, owner: Owner385,
) -> dict[str, Any]:
    _no_store385(response)
    if not _original385():
        raise HTTPException(status_code=409, detail="HOLD_NOT_ORIGINAL_WINDOWS_HOST")
    try:
        return create_ticket385(
            _journal385(),
            app_id=payload.app_id,
            category=payload.category,
            summary_code=payload.summary_code,
            target_hours=payload.target_hours,
            evidence_kind=payload.evidence_kind,
            evidence_sha256=payload.evidence_sha256,
            owner_user_id=owner.id,
            now_ms=int(time.time() * 1000),
            original_host=True,
        )
    except (ValueError, OSError) as error:
        _reject_invalid385(error)


@router.post("/tickets/{ticket_id}/transition")
def transition_ticket_endpoint385(
    ticket_id: str, payload: TicketTransition385,
    response: Response, owner: Owner385,
) -> dict[str, Any]:
    _no_store385(response)
    if not _original385():
        raise HTTPException(status_code=409, detail="HOLD_NOT_ORIGINAL_WINDOWS_HOST")
    try:
        return transition_ticket385(
            _journal385(), ticket_id=ticket_id,
            expected_revision=payload.expected_revision,
            status=payload.status,
            evidence_kind=payload.evidence_kind,
            evidence_sha256=payload.evidence_sha256,
            owner_user_id=owner.id,
            now_ms=int(time.time() * 1000),
            original_host=True,
        )
    except (ValueError, OSError) as error:
        _reject_invalid385(error)
