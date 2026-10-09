"""Authenticated local notification inbox for Build 030."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import Notification, NotificationReceipt, User
from rosevear_ai_hub.notifications import NOTIFICATION_SEVERITIES, create_household_notification

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])
SessionDependency = Annotated[Session, Depends(get_session)]
ActorDependency = Annotated[
    User,
    Depends(require_roles("owner", "administrator", "household_user", "read_only")),
]
NotificationStatus = Literal["all", "unread", "read"]


class NotificationResponse(BaseModel):
    id: int
    audience: str
    title: str
    message: str
    severity: Literal["info", "warning", "urgent"]
    source_type: str
    source_id: str | None
    created_by_user_id: int | None
    created_at: datetime
    read_at: datetime | None
    dismissed_at: datetime | None
    unread: bool


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    total: int
    limit: int
    offset: int


class NotificationSummaryResponse(BaseModel):
    total: int
    unread: int
    info: int
    warning: int
    urgent: int
    newest_at: datetime | None


class NotificationTestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(default="Rosevear AI Hub test notification", min_length=1, max_length=160)
    message: str = Field(
        default="The local notification layer is working.",
        min_length=1,
        max_length=2000,
    )
    severity: Literal["info", "warning", "urgent"] = "info"


class NotificationMutationResponse(BaseModel):
    updated: int


def _visible_condition(actor: User):
    return Notification.audience == "household"


def _response(
    notification: Notification,
    receipt: NotificationReceipt | None,
) -> NotificationResponse:
    return NotificationResponse(
        id=notification.id,
        audience=notification.audience,
        title=notification.title,
        message=notification.message,
        severity=notification.severity,
        source_type=notification.source_type,
        source_id=notification.source_id,
        created_by_user_id=notification.created_by_user_id,
        created_at=notification.created_at,
        read_at=receipt.read_at if receipt is not None else None,
        dismissed_at=receipt.dismissed_at if receipt is not None else None,
        unread=receipt is None or receipt.read_at is None,
    )


def _get_or_create_receipt(
    db: Session,
    notification_id: int,
    user_id: int,
) -> NotificationReceipt:
    receipt = db.scalar(
        select(NotificationReceipt).where(
            NotificationReceipt.notification_id == notification_id,
            NotificationReceipt.user_id == user_id,
        )
    )
    if receipt is None:
        receipt = NotificationReceipt(notification_id=notification_id, user_id=user_id)
        db.add(receipt)
        db.flush()
    return receipt


@router.get("/summary", response_model=NotificationSummaryResponse)
def notification_summary(
    actor: ActorDependency,
    db: SessionDependency,
) -> NotificationSummaryResponse:
    visible = _visible_condition(actor)
    receipt_join = and_(
        NotificationReceipt.notification_id == Notification.id,
        NotificationReceipt.user_id == actor.id,
    )
    base = (
        select(Notification, NotificationReceipt)
        .outerjoin(NotificationReceipt, receipt_join)
        .where(
            visible,
            or_(
                NotificationReceipt.id.is_(None),
                NotificationReceipt.dismissed_at.is_(None),
            ),
        )
    )
    rows = db.execute(base).all()
    total = len(rows)
    unread = sum(1 for _, receipt in rows if receipt is None or receipt.read_at is None)
    counts = {severity: 0 for severity in NOTIFICATION_SEVERITIES}
    newest_at = None
    for notification, _ in rows:
        counts[notification.severity] = counts.get(notification.severity, 0) + 1
        if newest_at is None or notification.created_at > newest_at:
            newest_at = notification.created_at
    return NotificationSummaryResponse(
        total=total,
        unread=unread,
        info=counts["info"],
        warning=counts["warning"],
        urgent=counts["urgent"],
        newest_at=newest_at,
    )


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    actor: ActorDependency,
    db: SessionDependency,
    notification_status: Annotated[NotificationStatus, Query(alias="status")] = "all",
    severity: Annotated[
        Literal["info", "warning", "urgent"] | None,
        Query(),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> NotificationListResponse:
    receipt_join = and_(
        NotificationReceipt.notification_id == Notification.id,
        NotificationReceipt.user_id == actor.id,
    )
    conditions = [
        _visible_condition(actor),
        or_(NotificationReceipt.id.is_(None), NotificationReceipt.dismissed_at.is_(None)),
    ]
    if severity is not None:
        conditions.append(Notification.severity == severity)
    if notification_status == "unread":
        conditions.append(
            or_(
                NotificationReceipt.id.is_(None),
                NotificationReceipt.read_at.is_(None),
            )
        )
    elif notification_status == "read":
        conditions.append(NotificationReceipt.read_at.is_not(None))

    count_query = (
        select(func.count(Notification.id))
        .select_from(Notification)
        .outerjoin(NotificationReceipt, receipt_join)
        .where(*conditions)
    )
    rows_query = (
        select(Notification, NotificationReceipt)
        .outerjoin(NotificationReceipt, receipt_join)
        .where(*conditions)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset(offset)
        .limit(limit)
    )
    total = int(db.scalar(count_query) or 0)
    rows = db.execute(rows_query).all()
    return NotificationListResponse(
        notifications=[_response(notification, receipt) for notification, receipt in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/test", response_model=NotificationResponse, status_code=201)
def create_test_notification(
    payload: NotificationTestRequest,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: SessionDependency,
) -> NotificationResponse:
    record = create_household_notification(
        db,
        title=payload.title,
        message=payload.message,
        severity=payload.severity,
        source_type="manual_test",
        source_id=str(actor.id),
        created_by_user_id=actor.id,
    )
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="notification.created",
        object_type="notification",
        object_id=str(record.id),
        action="create_test",
        arguments={"severity": payload.severity, "title": record.title},
        result={"ok": True, "audience": "household"},
        tool_key="notification.household.send",
        risk_level=1,
    )
    db.commit()
    db.refresh(record)
    return _response(record, None)


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    actor: ActorDependency,
    db: SessionDependency,
) -> NotificationResponse:
    notification = db.get(Notification, notification_id)
    if notification is None or notification.audience != "household":
        raise HTTPException(status_code=404, detail="Notification not found.")
    receipt = _get_or_create_receipt(db, notification.id, actor.id)
    if receipt.read_at is None:
        receipt.read_at = datetime.now(UTC)
    receipt.dismissed_at = None
    db.commit()
    db.refresh(receipt)
    return _response(notification, receipt)


@router.post("/read-all", response_model=NotificationMutationResponse)
def mark_all_notifications_read(
    actor: ActorDependency,
    db: SessionDependency,
) -> NotificationMutationResponse:
    notifications = db.scalars(
        select(Notification)
        .where(Notification.audience == "household")
        .order_by(Notification.id.asc())
    ).all()
    now = datetime.now(UTC)
    updated = 0
    for notification in notifications:
        receipt = _get_or_create_receipt(db, notification.id, actor.id)
        if receipt.dismissed_at is not None:
            continue
        if receipt.read_at is None:
            receipt.read_at = now
            updated += 1
    db.commit()
    return NotificationMutationResponse(updated=updated)


@router.post("/{notification_id}/dismiss", response_model=NotificationMutationResponse)
def dismiss_notification(
    notification_id: int,
    actor: ActorDependency,
    db: SessionDependency,
) -> NotificationMutationResponse:
    notification = db.get(Notification, notification_id)
    if notification is None or notification.audience != "household":
        raise HTTPException(status_code=404, detail="Notification not found.")
    receipt = _get_or_create_receipt(db, notification.id, actor.id)
    now = datetime.now(UTC)
    receipt.read_at = receipt.read_at or now
    receipt.dismissed_at = now
    db.commit()
    return NotificationMutationResponse(updated=1)
