"""Action preview, approval, rejection, expiry, and replay prevention API."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.confirmations import (
    APPROVED,
    PENDING,
    REJECTED,
    decide_confirmation,
    expire_if_needed,
    expire_stale_confirmations,
    prepare_confirmation,
)
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import ConfirmationRequest, User

router = APIRouter(prefix="/api/v1/confirmations", tags=["confirmations"])


class ConfirmationCreateRequest(BaseModel):
    tool_key: str = Field(min_length=1, max_length=160)
    arguments: dict[str, Any]


class ConfirmationResponse(BaseModel):
    id: str
    requested_by_user_id: int
    decided_by_user_id: int | None
    tool_key: str
    risk_level: int
    arguments: dict[str, Any]
    arguments_hash: str
    preview: dict[str, Any]
    status: str
    expires_at: datetime
    decided_at: datetime | None
    consumed_at: datetime | None
    created_at: datetime
    updated_at: datetime


def response_for(request: ConfirmationRequest) -> ConfirmationResponse:
    return ConfirmationResponse(
        id=request.id,
        requested_by_user_id=request.requested_by_user_id,
        decided_by_user_id=request.decided_by_user_id,
        tool_key=request.tool_key,
        risk_level=request.risk_level,
        arguments=dict(request.arguments_json or {}),
        arguments_hash=request.arguments_hash,
        preview=dict(request.preview_json or {}),
        status=request.status,
        expires_at=request.expires_at,
        decided_at=request.decided_at,
        consumed_at=request.consumed_at,
        created_at=request.created_at,
        updated_at=request.updated_at,
    )


def _load_visible_request(
    db: Session,
    request_id: str,
    actor: User,
) -> ConfirmationRequest:
    request = db.get(ConfirmationRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Confirmation request not found.")
    if actor.role not in {"owner", "administrator"} and request.requested_by_user_id != actor.id:
        raise HTTPException(status_code=403, detail="Confirmation request belongs to another user.")
    if expire_if_needed(db, request):
        db.commit()
        db.refresh(request)
    return request


@router.post("", response_model=ConfirmationResponse, status_code=201)
def create_confirmation(
    payload: ConfirmationCreateRequest,
    actor: Annotated[
        User,
        Depends(require_roles("owner", "administrator", "household_user")),
    ],
    db: Annotated[Session, Depends(get_session)],
) -> ConfirmationResponse:
    request = prepare_confirmation(
        db,
        actor=actor,
        tool_key=payload.tool_key,
        arguments=payload.arguments,
    )
    return response_for(request)


@router.get("", response_model=list[ConfirmationResponse])
def list_confirmations(
    actor: Annotated[
        User,
        Depends(require_roles("owner", "administrator", "household_user", "read_only")),
    ],
    db: Annotated[Session, Depends(get_session)],
    request_status: Literal["pending", "approved", "rejected", "expired", "consumed", "all"] = Query(
        default="pending",
        alias="status",
    ),
) -> list[ConfirmationResponse]:
    expire_stale_confirmations(db)
    query = select(ConfirmationRequest).order_by(ConfirmationRequest.created_at.desc())
    if actor.role not in {"owner", "administrator"}:
        query = query.where(ConfirmationRequest.requested_by_user_id == actor.id)
    if request_status != "all":
        query = query.where(ConfirmationRequest.status == request_status)
    return [response_for(item) for item in db.scalars(query).all()]


@router.get("/{request_id}", response_model=ConfirmationResponse)
def get_confirmation(
    request_id: str,
    actor: Annotated[
        User,
        Depends(require_roles("owner", "administrator", "household_user", "read_only")),
    ],
    db: Annotated[Session, Depends(get_session)],
) -> ConfirmationResponse:
    return response_for(_load_visible_request(db, request_id, actor))


@router.post("/{request_id}/approve", response_model=ConfirmationResponse)
def approve_confirmation(
    request_id: str,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: Annotated[Session, Depends(get_session)],
) -> ConfirmationResponse:
    request = _load_visible_request(db, request_id, actor)
    return response_for(
        decide_confirmation(db, request=request, actor=actor, decision=APPROVED)
    )


@router.post("/{request_id}/reject", response_model=ConfirmationResponse)
def reject_confirmation(
    request_id: str,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: Annotated[Session, Depends(get_session)],
) -> ConfirmationResponse:
    request = _load_visible_request(db, request_id, actor)
    return response_for(
        decide_confirmation(db, request=request, actor=actor, decision=REJECTED)
    )
