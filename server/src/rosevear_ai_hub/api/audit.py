"""Owner/Administrator audit log API for Build 019."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import AuditEvent, User

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


class AuditActorResponse(BaseModel):
    id: int
    username: str
    role: str


class AuditEventResponse(BaseModel):
    id: int
    actor: AuditActorResponse | None
    event_type: str
    object_type: str
    object_id: str | None
    action: str
    tool_key: str | None
    risk_level: int | None
    confirmation_id: str | None
    sanitized_arguments: object | None
    result: object | None
    result_status: str
    created_at: datetime


class AuditEventListResponse(BaseModel):
    events: list[AuditEventResponse]
    total: int
    limit: int
    offset: int


class AuditSummaryResponse(BaseModel):
    total_events: int
    success_count: int
    failure_count: int
    unknown_count: int
    actor_count: int
    tool_event_count: int
    newest_event_at: datetime | None
    oldest_event_at: datetime | None


def _response(event: AuditEvent, actor: User | None) -> AuditEventResponse:
    return AuditEventResponse(
        id=event.id,
        actor=(
            AuditActorResponse(id=actor.id, username=actor.username, role=actor.role)
            if actor is not None
            else None
        ),
        event_type=event.event_type,
        object_type=event.object_type,
        object_id=event.object_id,
        action=event.action,
        tool_key=event.tool_key,
        risk_level=event.risk_level,
        confirmation_id=event.confirmation_id,
        sanitized_arguments=event.sanitized_arguments,
        result=event.result,
        result_status=event.result_status or "unknown",
        created_at=event.created_at,
    )


@router.get("/events", response_model=AuditEventListResponse)
def list_audit_events(
    _: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: Annotated[Session, Depends(get_session)],
    actor_user_id: int | None = None,
    event_type: str | None = None,
    object_type: str | None = None,
    action: str | None = None,
    tool_key: str | None = None,
    result_status: str | None = None,
    confirmation_id: str | None = None,
    search: str | None = None,
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AuditEventListResponse:
    filters = []
    if actor_user_id is not None:
        filters.append(AuditEvent.actor_user_id == actor_user_id)
    if event_type:
        filters.append(AuditEvent.event_type == event_type)
    if object_type:
        filters.append(AuditEvent.object_type == object_type)
    if action:
        filters.append(AuditEvent.action == action)
    if tool_key:
        filters.append(AuditEvent.tool_key == tool_key)
    if result_status:
        filters.append(AuditEvent.result_status == result_status)
    if confirmation_id:
        filters.append(AuditEvent.confirmation_id == confirmation_id)
    if created_from is not None:
        filters.append(AuditEvent.created_at >= created_from)
    if created_to is not None:
        filters.append(AuditEvent.created_at <= created_to)
    if search:
        pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                AuditEvent.event_type.ilike(pattern),
                AuditEvent.object_type.ilike(pattern),
                AuditEvent.object_id.ilike(pattern),
                AuditEvent.action.ilike(pattern),
                AuditEvent.tool_key.ilike(pattern),
            )
        )

    base = select(AuditEvent).where(*filters)
    total = int(
        db.scalar(select(func.count()).select_from(base.subquery())) or 0
    )
    events = db.scalars(
        base.order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    actor_ids = {event.actor_user_id for event in events if event.actor_user_id is not None}
    actors = {
        user.id: user
        for user in db.scalars(select(User).where(User.id.in_(actor_ids))).all()
    } if actor_ids else {}

    return AuditEventListResponse(
        events=[_response(event, actors.get(event.actor_user_id)) for event in events],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/summary", response_model=AuditSummaryResponse)
def audit_summary(
    _: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: Annotated[Session, Depends(get_session)],
) -> AuditSummaryResponse:
    total = int(db.scalar(select(func.count(AuditEvent.id))) or 0)
    success = int(
        db.scalar(
            select(func.count(AuditEvent.id)).where(AuditEvent.result_status == "success")
        )
        or 0
    )
    failure = int(
        db.scalar(
            select(func.count(AuditEvent.id)).where(AuditEvent.result_status == "failure")
        )
        or 0
    )
    unknown = total - success - failure
    actor_count = int(
        db.scalar(
            select(func.count(func.distinct(AuditEvent.actor_user_id))).where(
                AuditEvent.actor_user_id.is_not(None)
            )
        )
        or 0
    )
    tool_events = int(
        db.scalar(
            select(func.count(AuditEvent.id)).where(AuditEvent.tool_key.is_not(None))
        )
        or 0
    )
    newest = db.scalar(select(func.max(AuditEvent.created_at)))
    oldest = db.scalar(select(func.min(AuditEvent.created_at)))
    return AuditSummaryResponse(
        total_events=total,
        success_count=success,
        failure_count=failure,
        unknown_count=unknown,
        actor_count=actor_count,
        tool_event_count=tool_events,
        newest_event_at=newest,
        oldest_event_at=oldest,
    )
