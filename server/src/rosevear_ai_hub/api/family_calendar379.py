"""Build 379 — local family calendar, chores and *in-app* reminder receipts.

There are no automatic emails, external calendar invitations, notification
pushes, provider tasks, physical device commands, orders or payments.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Path, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import FamilyPlan379, FamilyPlanEvent379, User

router = APIRouter(prefix="/api/v1/family-calendar-379", tags=["family-calendar"])
Viewer = Annotated[
    User, Depends(require_roles("owner", "administrator", "household_user", "read_only"))
]
Editor = Annotated[User, Depends(require_roles("owner", "administrator", "household_user"))]
DB = Annotated[Session, Depends(get_session)]
Kind = Literal["appointment", "chore", "task", "supply", "event"]
Visibility = Literal["household", "private"]
TIMEZONES = frozenset({
    "America/Toronto", "America/Vancouver", "America/Edmonton",
    "America/Winnipeg", "America/Halifax", "America/St_Johns", "UTC"
})
MAX_ACTIVE = 250


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _text(value: str, maximum: int, required: bool = False) -> str:
    if any(ord(char) < 32 for char in value):
        raise ValueError("Only printable characters are allowed.")
    clean = " ".join(value.split())
    if len(clean) > maximum or (required and not clean):
        raise ValueError("Text is blank or exceeds allowed length.")
    return clean


def _instant(local_due: str, timezone: str) -> datetime:
    """Interpret exact local wall-time; reject DST gaps/folds instead of guessing."""
    if timezone not in TIMEZONES:
        raise ValueError("Unsupported time zone.")
    try:
        naive = datetime.strptime(local_due, "%Y-%m-%dT%H:%M")
        if naive.strftime("%Y-%m-%dT%H:%M") != local_due:
            raise ValueError("Choose a complete date and time.")
        zone = ZoneInfo(timezone)
    except (ValueError, ZoneInfoNotFoundError) as exc:
        raise ValueError("Invalid local date, time or time zone.") from exc
    first = naive.replace(tzinfo=zone, fold=0)
    second = naive.replace(tzinfo=zone, fold=1)
    if first.astimezone(UTC).astimezone(zone).replace(tzinfo=None) != naive:
        raise ValueError("Local time does not exist (daylight saving change).")
    if first.utcoffset() != second.utcoffset():
        raise ValueError("Ambiguous daylight saving time; select a different time.")
    return first.astimezone(UTC)


class PlanInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=140)
    kind: Kind = "chore"
    detail: str = Field(default="", max_length=300)
    supplies: str = Field(default="", max_length=200)
    visibility: Visibility = "household"
    local_due: str = Field(min_length=16, max_length=16)
    timezone: str = "America/Toronto"
    recurrence_days: int | None = Field(default=None, ge=1, le=365)
    reminder_minutes: int | None = Field(default=60, ge=0, le=10080)
    assignee_user_id: int | None = Field(default=None, gt=0)

    @field_validator("title")
    @classmethod
    def title_clean(cls, value: str) -> str:
        return _text(value, 140, required=True)

    @field_validator("detail", "supplies")
    @classmethod
    def note_clean(cls, value: str) -> str:
        return _text(value, 300)

    @model_validator(mode="after")
    def validate_local(self) -> PlanInput:
        _instant(self.local_due, self.timezone)
        return self


class PlanEdit(PlanInput):
    expected_revision: int = Field(ge=1)


class Decision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int = Field(ge=1)


def _assignable(db: Session, actor: User, target_id: int | None) -> int | None:
    if target_id is None:
        return None
    if actor.role == "household_user" and target_id != actor.id:
        raise HTTPException(
            status_code=403, detail="Family members may only assign themselves."
        )
    target = db.get(User, target_id)
    if target is None or not target.enabled or target.role == "read_only":
        raise HTTPException(status_code=422, detail="Assignee must be an active household editor.")
    return target.id


def _visible(plan: FamilyPlan379, actor: User) -> bool:
    return (
        plan.visibility == "household"
        or plan.creator_user_id == actor.id
        or plan.assignee_user_id == actor.id
    )


def _view(db: Session, id_: int, actor: User) -> FamilyPlan379:
    plan = db.get(FamilyPlan379, id_)
    if plan is None or plan.status == "archived" or not _visible(plan, actor):
        raise HTTPException(status_code=404, detail="Visible active family plan not found.")
    return plan


def _manage(plan: FamilyPlan379, actor: User) -> None:
    if actor.id == plan.creator_user_id:
        return
    if plan.visibility == "household" and actor.role in {"owner", "administrator"}:
        return
    raise HTTPException(status_code=403, detail="Only the organizer may edit this plan.")


def _participate(plan: FamilyPlan379, actor: User) -> None:
    if plan.assignee_user_id == actor.id or plan.creator_user_id == actor.id:
        return
    if plan.visibility == "household" and actor.role in {"owner", "administrator"}:
        return
    raise HTTPException(status_code=403, detail="Only participants may acknowledge or complete.")


def _revision(plan: FamilyPlan379, expected: int) -> None:
    if plan.revision != expected:
        raise HTTPException(status_code=409, detail="Schedule changed. Refresh before retrying.")


def _event(db: Session, plan: FamilyPlan379, actor: User, action: str) -> None:
    db.add(FamilyPlanEvent379(
        plan_id=plan.id, actor_user_id=actor.id, action=action,
        revision=plan.revision, occurred_at=datetime.now(UTC),
    ))
    record_audit_event(
        db, actor_user_id=actor.id, event_type="family379." + action,
        object_type="family_plan", object_id=str(plan.id), action=action,
        arguments={"revision": plan.revision, "visibility": plan.visibility},
        result={"ok": True, "messages_sent": 0, "external_calendar_writes": 0},
    )


def _public(plan: FamilyPlan379, now: datetime) -> dict:
    due = _utc(plan.due_at_utc)
    reminder = (
        due - timedelta(minutes=plan.reminder_minutes)
        if plan.reminder_minutes is not None else None
    )
    is_open = plan.status == "open"
    reminder_due = bool(is_open and reminder and now >= reminder)
    missed = bool(is_open and now > due)
    return {
        "id": plan.id, "title": plan.title, "kind": plan.kind, "detail": plan.detail,
        "supplies": plan.supplies, "visibility": plan.visibility,
        "localDue": plan.local_due, "timezone": plan.timezone,
        "dueAtUtc": due.isoformat(),
        "recurrenceDays": plan.recurrence_days,
        "reminderMinutes": plan.reminder_minutes,
        "reminderAtUtc": reminder.isoformat() if reminder else None,
        "reminderDue": reminder_due,
        "reminderAcknowledged": plan.reminder_ack_at is not None,
        "reminderAcknowledgedAt": (
            _utc(plan.reminder_ack_at).isoformat() if plan.reminder_ack_at else None
        ),
        "missed": missed,
        "status": plan.status, "revision": plan.revision,
        "completionCount": plan.completion_count,
        "lastCompletedAt": (
            _utc(plan.last_completed_at).isoformat() if plan.last_completed_at else None
        ),
        "creatorUserId": plan.creator_user_id,
        "assigneeUserId": plan.assignee_user_id,
        "automaticMessagesSent": 0,
    }


@router.get("/members")
def members(actor: Viewer, db: DB) -> dict:
    """Limit disclosed account roster; no credentials or cross-app identities."""
    if actor.role in {"owner", "administrator"}:
        people = db.scalars(select(User).where(
            User.enabled.is_(True), User.role.in_(["owner", "administrator", "household_user"])
        ).order_by(User.username).limit(100)).all()
    elif actor.role == "household_user":
        people = [actor]
    else:
        people = []
    return {"members": [{"id":user.id, "username":user.username} for user in people]}


@router.get("/board")
def board(actor: Viewer, db: DB, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    active = db.scalars(select(FamilyPlan379).where(
        FamilyPlan379.status != "archived"
    ).order_by(FamilyPlan379.due_at_utc, FamilyPlan379.id).limit(2000)).all()
    visible = [p for p in active if _visible(p, actor)]
    now = datetime.now(UTC)
    displayed = [_public(p, now) for p in visible[:MAX_ACTIVE]]
    ids = {p.id for p in visible}
    events = db.scalars(select(FamilyPlanEvent379).order_by(
        FamilyPlanEvent379.id.desc()
    ).limit(250)).all()
    return {
        "schema": "rosevear.hub.family-calendar.v379",
        "timezonePolicy": "IANA_ZONE_EXPLICIT_DST_GAPS_AND_FOLDS_REJECTED",
        "role": actor.role,
        "items": displayed,
        "history": [
            {
                "id": e.id, "planId": e.plan_id, "action": e.action,
                "revision": e.revision, "actorUserId": e.actor_user_id,
                "at": _utc(e.occurred_at).isoformat(),
            }
            for e in events if e.plan_id in ids
        ][:40],
        "summary": {
            "active": len(displayed),
            "dueSoon": sum(x["reminderDue"] and not x["reminderAcknowledged"] for x in displayed),
            "missed": sum(x["missed"] for x in displayed),
            "recurring": sum(bool(x["recurrenceDays"]) for x in displayed),
        },
        "truncated": len(visible) > MAX_ACTIVE,
        "remindersAreInAppReadbackOnly": True,
        "backgroundSchedulerEnabled": False,
        "outboundNotificationsEnabled": False,
        "externalCalendarSyncEnabled": False,
        "automaticDeviceActionsEnabled": False,
    }


@router.post("/plans", status_code=201)
def create_plan(payload: PlanInput, actor: Editor, db: DB) -> dict:
    count = db.scalar(select(func.count(FamilyPlan379.id)).where(
        FamilyPlan379.status != "archived"
    ))
    if count is not None and count >= MAX_ACTIVE:
        raise HTTPException(status_code=409, detail="Active family plan capacity reached.")
    assignee = _assignable(db, actor, payload.assignee_user_id)
    now = datetime.now(UTC)
    plan = FamilyPlan379(
        title=payload.title, kind=payload.kind,
        detail=payload.detail, supplies=payload.supplies,
        visibility=payload.visibility,
        local_due=payload.local_due, timezone=payload.timezone,
        due_at_utc=_instant(payload.local_due, payload.timezone),
        recurrence_days=payload.recurrence_days,
        reminder_minutes=payload.reminder_minutes,
        reminder_ack_at=None, reminder_ack_by_user_id=None,
        completion_count=0, last_completed_at=None,
        status="open", revision=1,
        creator_user_id=actor.id, assignee_user_id=assignee,
        updated_by_user_id=actor.id, created_at=now, updated_at=now,
    )
    db.add(plan)
    db.flush()
    _event(db, plan, actor, "created")
    db.commit()
    return _public(plan, datetime.now(UTC))


@router.put("/plans/{plan_id}")
def update_plan(
    payload: PlanEdit, actor: Editor, db: DB, plan_id: int = Path(gt=0),
) -> dict:
    plan = _view(db, plan_id, actor)
    _manage(plan, actor)
    _revision(plan, payload.expected_revision)
    if plan.status != "open":
        raise HTTPException(status_code=409, detail="Completed plans cannot be revised.")
    assignee = _assignable(db, actor, payload.assignee_user_id)
    now = datetime.now(UTC)
    for field in ("title", "kind", "detail", "supplies", "visibility"):
        setattr(plan, field, getattr(payload, field))
    plan.local_due = payload.local_due
    plan.timezone = payload.timezone
    plan.due_at_utc = _instant(payload.local_due, payload.timezone)
    plan.recurrence_days = payload.recurrence_days
    plan.reminder_minutes = payload.reminder_minutes
    plan.assignee_user_id = assignee
    plan.reminder_ack_at = None
    plan.reminder_ack_by_user_id = None
    plan.updated_by_user_id = actor.id
    plan.updated_at = now
    plan.revision += 1
    _event(db, plan, actor, "rescheduled_and_ack_reset")
    db.commit()
    return _public(plan, now)


@router.post("/plans/{plan_id}/ack")
def acknowledge(
    payload: Decision, actor: Editor, db: DB, plan_id: int = Path(gt=0),
) -> dict:
    plan = _view(db, plan_id, actor)
    _participate(plan, actor)
    _revision(plan, payload.expected_revision)
    if plan.status != "open" or plan.reminder_minutes is None:
        raise HTTPException(status_code=409, detail="No active reminder to acknowledge.")
    if plan.reminder_ack_at is not None:
        raise HTTPException(status_code=409, detail="Reminder already acknowledged.")
    now = datetime.now(UTC)
    if now < _utc(plan.due_at_utc) - timedelta(minutes=plan.reminder_minutes):
        raise HTTPException(status_code=409, detail="Reminder is not due yet.")
    plan.reminder_ack_at = now
    plan.reminder_ack_by_user_id = actor.id
    plan.updated_by_user_id = actor.id
    plan.updated_at = now
    plan.revision += 1
    _event(db, plan, actor, "in_app_reminder_acknowledged")
    db.commit()
    return _public(plan, now)


@router.post("/plans/{plan_id}/complete")
def complete_plan(
    payload: Decision, actor: Editor, db: DB, plan_id: int = Path(gt=0),
) -> dict:
    plan = _view(db, plan_id, actor)
    _participate(plan, actor)
    _revision(plan, payload.expected_revision)
    if plan.status != "open":
        raise HTTPException(status_code=409, detail="Plan already completed.")
    now = datetime.now(UTC)
    if plan.recurrence_days is not None:
        current_local = datetime.strptime(plan.local_due, "%Y-%m-%dT%H:%M")
        future_local = current_local + timedelta(days=plan.recurrence_days)
        next_local = future_local.strftime("%Y-%m-%dT%H:%M")
        try:
            next_utc = _instant(next_local, plan.timezone)
        except ValueError as exc:
            raise HTTPException(
                status_code=409,
                detail="Next local recurrence enters an ambiguous/DST-invalid time. Edit schedule.",
            ) from exc
        plan.local_due = next_local
        plan.due_at_utc = next_utc
        plan.reminder_ack_at = None
        plan.reminder_ack_by_user_id = None
        plan.status = "open"
        action = "recurring_occurrence_completed"
    else:
        plan.status = "done"
        action = "completed"
    plan.completion_count += 1
    plan.last_completed_at = now
    plan.updated_by_user_id = actor.id
    plan.updated_at = now
    plan.revision += 1
    _event(db, plan, actor, action)
    db.commit()
    return _public(plan, now)


@router.post("/plans/{plan_id}/archive")
def archive_plan(
    payload: Decision, actor: Editor, db: DB, plan_id: int = Path(gt=0),
) -> dict:
    plan = _view(db, plan_id, actor)
    _manage(plan, actor)
    _revision(plan, payload.expected_revision)
    plan.status = "archived"
    plan.revision += 1
    plan.updated_by_user_id = actor.id
    plan.updated_at = datetime.now(UTC)
    _event(db, plan, actor, "archived")
    db.commit()
    return {"state": "ARCHIVED", "planId": plan.id, "historyPreserved": True}
