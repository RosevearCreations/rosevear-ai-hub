"""Build 145: operator-owned workshop service planning, never equipment controls."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import (
    User,
    WorkshopEquipment,
    WorkshopMaintenanceEvent,
    WorkshopMaintenancePlan,
    WorkshopStation,
)

router = APIRouter(prefix="/api/v1/workshop", tags=["workshop-maintenance"])
DB = Annotated[Session, Depends(get_session)]
Maintainer = Annotated[User, Depends(require_roles("owner", "administrator"))]
MaintenanceOutcome = Literal["checked", "needs_service", "unsafe"]
DueState = Literal["unplanned", "scheduled", "due_soon", "overdue", "blocked", "disabled"]


def _utc(value: datetime) -> datetime:
    # SQLite drops tzinfo despite DateTime(timezone=True); on-disk times are UTC.
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def _as_iso(value: datetime | None) -> str | None:
    return _utc(value).isoformat() if value is not None else None


def _valid_list(values: list[str], field_name: str) -> list[str]:
    stripped = [value.strip() for value in values]
    if any(not value or len(value) > 120 for value in stripped) or len(set(stripped)) != len(
        stripped
    ):
        raise ValueError(f"{field_name} must contain distinct nonempty values up to 120 characters")
    return stripped


class PlanInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int = Field(ge=0)
    interval_days: int = Field(ge=1, le=3650)
    reminder_days: int = Field(default=7, ge=0, le=365)
    next_due_at: datetime
    assigned_user_id: int | None = None
    checklist: list[str] = Field(min_length=1, max_length=12)
    parts_refs: list[str] = Field(default_factory=list, max_length=20)
    notes: str = Field(default="", max_length=500)

    @field_validator("next_due_at")
    @classmethod
    def aware_due(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Use an explicit timezone offset for the due date")
        return _utc(value)

    @field_validator("checklist", "parts_refs")
    @classmethod
    def valid_references(cls, value: list[str]) -> list[str]:
        return _valid_list(value, "Checklist/parts references")


class EventInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int = Field(ge=1)
    outcome: MaintenanceOutcome
    note: str = Field(min_length=3, max_length=500)
    completed_checklist: list[str] = Field(default_factory=list, max_length=12)
    parts_used: list[str] = Field(default_factory=list, max_length=20)
    acknowledge_not_certification: bool = False

    @field_validator("completed_checklist", "parts_used")
    @classmethod
    def valid_references(cls, value: list[str]) -> list[str]:
        return _valid_list(value, "Completed checklist/parts used")


def _get_equipment(db: Session, equipment_id: int) -> WorkshopEquipment:
    item = db.get(WorkshopEquipment, equipment_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Equipment does not exist.")
    return item


def _get_plan(db: Session, equipment_id: int) -> WorkshopMaintenancePlan | None:
    return db.scalar(
        select(WorkshopMaintenancePlan).where(WorkshopMaintenancePlan.equipment_id == equipment_id)
    )


def _plan_out(plan: WorkshopMaintenancePlan) -> dict:
    return {
        "equipment_id": plan.equipment_id,
        "revision": plan.revision,
        "interval_days": plan.interval_days,
        "reminder_days": plan.reminder_days,
        "next_due_at": _as_iso(plan.next_due_at),
        "assigned_user_id": plan.assigned_user_id,
        "checklist": plan.checklist_json,
        "parts_refs": plan.parts_refs_json,
        "notes": plan.notes,
        "last_completed_at": _as_iso(plan.last_completed_at),
    }


def _due_state(
    item: WorkshopEquipment, plan: WorkshopMaintenancePlan | None, now: datetime
) -> tuple[DueState, bool]:
    date = plan.next_due_at if plan else item.maintenance_due_at
    overdue = bool(date and _utc(date) <= now)
    if item.disabled:
        return "disabled", overdue
    if item.readiness_status == "blocked":
        return "blocked", overdue
    if date is None:
        return "unplanned", False
    if overdue:
        return "overdue", True
    if _utc(date) <= now + timedelta(days=plan.reminder_days if plan else 7):
        return "due_soon", False
    return "scheduled", False


def _next_check(item: WorkshopEquipment, due_state: DueState) -> str:
    if item.disabled or item.readiness_status == "blocked":
        return "Keep equipment out of use; separately review unsafe/disabled condition."
    if item.last_inspected_at is None:
        return "No manual inspection on record; arrange independent safeguards review."
    if due_state in {"overdue", "unplanned", "due_soon"}:
        return "Review checklist, service history and hazards before separate safety sign-off."
    return "Check current guards, training and independent safety approvals before any operation."


@router.get("/maintenance/overview")
def maintenance_overview(
    db: DB,
    search: str = Query(default="", max_length=120),
    project: str = Query(default="", max_length=80),
    state: DueState | None = None,
) -> dict:
    # Same 200-row source scope as the legacy workshop register.
    items = db.scalars(select(WorkshopEquipment).order_by(WorkshopEquipment.id).limit(200)).all()
    plans = db.scalars(
        select(WorkshopMaintenancePlan).where(
            WorkshopMaintenancePlan.equipment_id.in_([item.id for item in items])
        )
    ).all()
    stations = db.scalars(
        select(WorkshopStation).where(
            WorkshopStation.id.in_(
                [item.station_id for item in items if item.station_id is not None]
            )
        )
    ).all()
    plan_by_equipment = {plan.equipment_id: plan for plan in plans}
    station_by_id = {station.id: station.name for station in stations}
    now = datetime.now(UTC)
    output = []
    for item in items:
        plan = plan_by_equipment.get(item.id)
        due, overdue = _due_state(item, plan, now)
        station = station_by_id.get(item.station_id, "Unassigned")
        haystack = f"{item.project_key} {item.name} {item.equipment_type} {station}".lower()
        if project and item.project_key != project:
            continue
        if search and search.casefold() not in haystack.casefold():
            continue
        if state and state != due:
            continue
        output.append(
            {
                "equipment_id": item.id,
                "name": item.name,
                "project_key": item.project_key,
                "equipment_type": item.equipment_type,
                "model_reference": item.model_reference,
                "accessories": item.accessories_json,
                "activity_type": item.activity_type,
                "station_name": station,
                "readiness_status": item.readiness_status,
                "disabled": item.disabled,
                "last_inspected_at": _as_iso(item.last_inspected_at),
                "due_state": due,
                "is_overdue": overdue,
                "next_safe_check": _next_check(item, due),
                "plan": _plan_out(plan) if plan else None,
                "legacy_due_at": _as_iso(item.maintenance_due_at) if not plan else None,
            }
        )
    priority = {
        "blocked": 0,
        "overdue": 1,
        "due_soon": 2,
        "unplanned": 3,
        "disabled": 4,
        "scheduled": 5,
    }
    output.sort(key=lambda item: (priority[item["due_state"]], item["equipment_id"]))
    return {
        "as_of": now.isoformat(),
        "items": output,
        "overdue_count": sum(item["is_overdue"] for item in output),
        "scope": "manual_records_only",
        "automatic_equipment_control": False,
        "safety_certification": False,
        "counts_limited_to_first": 200,
    }


@router.get("/equipment/{equipment_id}/maintenance")
def get_maintenance_plan(equipment_id: int, db: DB) -> dict | None:
    _get_equipment(db, equipment_id)
    plan = _get_plan(db, equipment_id)
    return _plan_out(plan) if plan else None


@router.put("/equipment/{equipment_id}/maintenance")
def save_maintenance_plan(equipment_id: int, body: PlanInput, actor: Maintainer, db: DB) -> dict:
    equipment = _get_equipment(db, equipment_id)
    if body.assigned_user_id is not None:
        assignee = db.get(User, body.assigned_user_id)
        if (
            assignee is None
            or not assignee.enabled
            or assignee.role not in {"owner", "administrator", "household_user"}
        ):
            raise HTTPException(status_code=422, detail="Choose an active workshop operator.")
    plan = _get_plan(db, equipment_id)
    previous = plan.revision if plan else 0
    if body.expected_revision != previous:
        raise HTTPException(status_code=409, detail="Maintenance plan changed. Refresh first.")
    if plan is None:
        plan = WorkshopMaintenancePlan(
            equipment_id=equipment.id,
            interval_days=body.interval_days,
            reminder_days=body.reminder_days,
            next_due_at=body.next_due_at,
            assigned_user_id=body.assigned_user_id,
            checklist_json=body.checklist,
            parts_refs_json=body.parts_refs,
            notes=body.notes.strip(),
            revision=1,
        )
        db.add(plan)
        try:
            db.flush()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=409, detail="Concurrent plan creation. Refresh first."
            ) from exc
    else:
        result = db.execute(
            update(WorkshopMaintenancePlan)
            .where(
                WorkshopMaintenancePlan.id == plan.id, WorkshopMaintenancePlan.revision == previous
            )
            .values(
                interval_days=body.interval_days,
                reminder_days=body.reminder_days,
                next_due_at=body.next_due_at,
                assigned_user_id=body.assigned_user_id,
                checklist_json=body.checklist,
                parts_refs_json=body.parts_refs,
                notes=body.notes.strip(),
                revision=previous + 1,
            )
        )
        if result.rowcount != 1:
            db.rollback()
            raise HTTPException(status_code=409, detail="Concurrent plan edit. Refresh first.")
        db.refresh(plan)
    # Keep the legacy due-date screen consistent without implying safety readiness.
    equipment.maintenance_due_at = body.next_due_at
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="workshop.maintenance.plan.saved",
        object_type="workshop_equipment",
        object_id=str(equipment.id),
        action="save_plan",
        arguments={
            "previous_revision": previous,
            "interval_days": plan.interval_days,
            "assigned_user_id": plan.assigned_user_id,
        },
        result={"ok": True, "revision": plan.revision, "readiness_unchanged": True},
    )
    db.commit()
    db.refresh(plan)
    return _plan_out(plan)


@router.get("/equipment/{equipment_id}/maintenance-events")
def list_maintenance_events(equipment_id: int, db: DB) -> list[dict]:
    _get_equipment(db, equipment_id)
    plan = _get_plan(db, equipment_id)
    if plan is None:
        return []
    records = db.scalars(
        select(WorkshopMaintenanceEvent)
        .where(WorkshopMaintenanceEvent.plan_id == plan.id)
        .order_by(WorkshopMaintenanceEvent.id.desc())
        .limit(100)
    ).all()
    return [_event_out(record) for record in records]


def _event_out(event: WorkshopMaintenanceEvent) -> dict:
    return {
        "id": event.id,
        "outcome": event.outcome,
        "note": event.note,
        "completed_checklist": event.completed_checklist_json,
        "parts_used": event.parts_used_json,
        "previous_due_at": _as_iso(event.previous_due_at),
        "next_due_at": _as_iso(event.next_due_at),
        "recorded_by_user_id": event.recorded_by_user_id,
        "recorded_at": _as_iso(event.recorded_at),
        "schedule_updated": event.schedule_updated,
    }


@router.post("/equipment/{equipment_id}/maintenance-events", status_code=201)
def record_maintenance_event(
    equipment_id: int, body: EventInput, actor: Maintainer, db: DB
) -> dict:
    equipment = _get_equipment(db, equipment_id)
    plan = _get_plan(db, equipment_id)
    if plan is None:
        raise HTTPException(
            status_code=409, detail="Save a maintenance plan before recording service."
        )
    if body.expected_revision != plan.revision:
        raise HTTPException(status_code=409, detail="Maintenance plan changed. Refresh first.")
    if not body.acknowledge_not_certification:
        raise HTTPException(
            status_code=422, detail="Acknowledge that this is not a safety certification."
        )
    if len(body.note.strip()) < 3:
        raise HTTPException(status_code=422, detail="Give a meaningful manual service note.")
    if body.outcome == "checked" and set(body.completed_checklist) != set(plan.checklist_json):
        raise HTTPException(
            status_code=422,
            detail="Every planned checklist item must be recorded before advancing the due date.",
        )
    if (
        body.outcome != "checked"
        and body.completed_checklist
        and not set(body.completed_checklist).issubset(set(plan.checklist_json))
    ):
        raise HTTPException(status_code=422, detail="Unknown checklist reference.")
    now = datetime.now(UTC)
    original_due = _utc(plan.next_due_at)
    new_due = (
        now + timedelta(days=plan.interval_days) if body.outcome == "checked" else original_due
    )
    values: dict = {"revision": plan.revision + 1}
    if body.outcome == "checked":
        values.update({"last_completed_at": now, "next_due_at": new_due})
        equipment.maintenance_due_at = new_due
    elif body.outcome == "unsafe":
        equipment.readiness_status = "blocked"
    elif equipment.readiness_status != "blocked":
        equipment.readiness_status = "attention"
    result = db.execute(
        update(WorkshopMaintenancePlan)
        .where(
            WorkshopMaintenancePlan.id == plan.id,
            WorkshopMaintenancePlan.revision == body.expected_revision,
        )
        .values(**values)
    )
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail="Concurrent service update. Refresh first.")
    db.refresh(plan)
    event = WorkshopMaintenanceEvent(
        plan_id=plan.id,
        outcome=body.outcome,
        note=body.note.strip(),
        completed_checklist_json=body.completed_checklist,
        parts_used_json=body.parts_used,
        previous_due_at=original_due,
        next_due_at=new_due,
        schedule_updated=body.outcome == "checked",
        recorded_by_user_id=actor.id,
        recorded_at=now,
    )
    db.add(event)
    db.flush()
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="workshop.maintenance.event.recorded",
        object_type="workshop_equipment",
        object_id=str(equipment.id),
        action=body.outcome,
        arguments={
            "plan_revision": plan.revision - 1,
            "checklist_count": len(body.completed_checklist),
            "parts_count": len(body.parts_used),
        },
        result={
            "ok": True,
            "schedule_advanced": body.outcome == "checked",
            "readiness_status": equipment.readiness_status,
        },
    )
    db.commit()
    db.refresh(event)
    return _event_out(event)
