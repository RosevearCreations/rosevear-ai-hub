"""Build 219: bounded, local source-aware household/workshop action board."""

from __future__ import annotations

import csv
import io
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import (
    CameraEventReview,
    DeviceRegistryAnnotation,
    MaintenanceAction,
    User,
    WorkshopEquipment,
    WorkshopMaintenancePlan,
)

router = APIRouter(prefix="/api/v1/maintenance-actions", tags=["maintenance-actions"])
DB = Annotated[Session, Depends(get_session)]
Owner = Annotated[User, Depends(require_roles("owner", "administrator"))]
SourceKind = Literal["household", "workshop_manual", "workshop_equipment", "device", "camera"]
ActionStatus = Literal["open", "deferred", "closed"]


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


class ActionDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_revision: int = Field(ge=0)
    assigned_user_id: int | None = None
    due_at: datetime | None = None
    status: ActionStatus = "open"
    acknowledged: bool = False
    decision_reason: str = Field(default="", max_length=500)

    @field_validator("due_at")
    @classmethod
    def aware_date(cls, value: datetime | None) -> datetime | None:
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("Use a timezone-aware due date")
        return _utc(value) if value is not None else None


class ManualAction(ActionDecision):
    source_kind: Literal["household", "workshop_manual"]
    title: str = Field(min_length=3, max_length=160)


def _candidates(db: Session) -> dict[tuple[str, str], dict]:
    now = datetime.now(UTC)
    rows: dict[tuple[str, str], dict] = {}

    equipment = db.scalars(
        select(WorkshopEquipment).order_by(WorkshopEquipment.id).limit(200)
    ).all()
    plans = (
        db.scalars(
            select(WorkshopMaintenancePlan).where(
                WorkshopMaintenancePlan.equipment_id.in_([item.id for item in equipment])
            )
        ).all()
        if equipment
        else []
    )
    plan_by_id = {plan.equipment_id: plan for plan in plans}
    for item in equipment:
        plan = plan_by_id.get(item.id)
        due = plan.next_due_at if plan else item.maintenance_due_at
        overdue = due is not None and _utc(due) <= now
        attention = item.disabled or item.readiness_status in {"blocked", "attention"}
        if not overdue and not attention and due is None:
            continue
        if (
            not overdue
            and not attention
            and due is not None
            and _utc(due) > now + timedelta(days=plan.reminder_days if plan else 7)
        ):
            continue
        sid = str(item.id)
        rows[("workshop_equipment", sid)] = {
            "source_kind": "workshop_equipment",
            "source_id": sid,
            "title": f"Workshop: {item.name}",
            "source_state": "blocked" if attention else "overdue" if overdue else "due_soon",
            "source_stale": item.last_inspected_at is None
            or _utc(item.last_inspected_at) < now - timedelta(days=30),
            "hazard_unresolved": bool(attention or overdue),
            "source_due_at": _utc(due).isoformat() if due else None,
        }

    devices = db.scalars(
        select(DeviceRegistryAnnotation).order_by(DeviceRegistryAnnotation.id).limit(200)
    ).all()
    for item in devices:
        if item.disposition not in {"needs_investigation", "unsupported"}:
            continue
        sid = f"{item.source}:{item.source_id}"
        rows[("device", sid)] = {
            "source_kind": "device",
            "source_id": sid,
            "title": f"Device: {item.alias or item.source_id}"[:160],
            "source_state": item.disposition,
            "source_stale": _utc(item.reviewed_at) < now - timedelta(days=7),
            "hazard_unresolved": True,
            "source_due_at": None,
        }

    camera_reviews = db.scalars(
        select(CameraEventReview).order_by(CameraEventReview.id.desc()).limit(200)
    ).all()
    for item in camera_reviews:
        if item.review_status not in {"flagged", "follow_up", "needs_review"}:
            continue
        rows[("camera", item.event_id)] = {
            "source_kind": "camera",
            "source_id": item.event_id,
            "title": f"Camera: {item.camera_name}"[:160],
            "source_state": item.review_status,
            "source_stale": _utc(item.updated_at) < now - timedelta(days=7),
            "hazard_unresolved": True,
            "source_due_at": None,
        }
    return rows


def _row(record: MaintenanceAction | None, source: dict) -> dict:
    return {
        **source,
        "revision": record.revision if record else 0,
        "assigned_user_id": record.assigned_user_id if record else None,
        "due_at": _utc(record.due_at).isoformat() if record and record.due_at else None,
        "status": record.status if record else "open",
        "acknowledged": record.acknowledged if record else False,
        "decision_reason": record.decision_reason if record else "",
        "manually_reviewed": record is not None,
    }


def _board(db: Session) -> dict:
    candidates = _candidates(db)
    records = db.scalars(select(MaintenanceAction).order_by(MaintenanceAction.id).limit(500)).all()
    overlays = {(record.source_kind, record.source_id): record for record in records}
    rows = [_row(overlays.get(key), source) for key, source in candidates.items()]
    for key, record in overlays.items():
        if key not in candidates:
            is_manual = record.source_kind in {"household", "workshop_manual"}
            rows.append(
                _row(
                    record,
                    {
                        "source_kind": record.source_kind,
                        "source_id": record.source_id,
                        "title": record.title,
                        "source_state": "manual" if is_manual else "source_not_in_current_scope",
                        "source_stale": not is_manual,
                        "hazard_unresolved": not is_manual,
                        "source_due_at": None,
                    },
                )
            )
    rows.sort(
        key=lambda row: (
            row["status"] == "closed",
            row["status"] == "deferred",
            not row["hazard_unresolved"],
            row["title"].casefold(),
            row["source_id"],
        )
    )
    return {
        "as_of": datetime.now(UTC).isoformat(),
        "items": rows,
        "source_scope": "bounded_local_records_only",
        "source_limit_each": 200,
        "automatic_closure": False,
        "equipment_control": False,
    }


@router.get("")
def get_board(db: DB) -> dict:
    return _board(db)


def _check_assignee(db: Session, user_id: int | None) -> None:
    if user_id is None:
        return
    user = db.get(User, user_id)
    if user is None or not user.enabled or user.role == "read_only":
        raise HTTPException(status_code=422, detail="Select an active household operator")


def _check_decision(body: ActionDecision, source: dict) -> None:
    if body.status in {"closed", "deferred"} and len(body.decision_reason.strip()) < 5:
        raise HTTPException(status_code=422, detail="Provide a reason when closing or deferring")
    if body.status == "closed" and (source["hazard_unresolved"] or source["source_stale"]):
        raise HTTPException(
            status_code=409,
            detail="Unresolved or stale source cannot be closed here; review its source first",
        )


@router.post("/manual", status_code=201)
def create_manual(body: ManualAction, actor: Owner, db: DB) -> dict:
    _check_assignee(db, body.assigned_user_id)
    source = {"hazard_unresolved": False}
    _check_decision(body, source)
    if not body.title.strip():
        raise HTTPException(status_code=422, detail="Title required")
    record = MaintenanceAction(
        source_kind=body.source_kind,
        source_id=uuid.uuid4().hex,
        title=body.title.strip(),
        assigned_user_id=body.assigned_user_id,
        due_at=body.due_at,
        status=body.status,
        acknowledged=body.acknowledged,
        decision_reason=body.decision_reason.strip(),
    )
    db.add(record)
    db.flush()
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="maintenance.action.created",
        object_type="maintenance_action",
        object_id=str(record.id),
        action="create",
        arguments={"source_kind": record.source_kind},
        result={"ok": True},
    )
    db.commit()
    return _row(
        record,
        {
            "source_kind": record.source_kind,
            "source_id": record.source_id,
            "title": record.title,
            "source_state": "manual",
            "source_stale": False,
            "hazard_unresolved": False,
            "source_due_at": None,
        },
    )


@router.put("/{source_kind}/{source_id:path}")
def decide_action(
    source_kind: SourceKind, source_id: str, body: ActionDecision, actor: Owner, db: DB
) -> dict:
    if not source_id or len(source_id) > 300:
        raise HTTPException(status_code=422, detail="Invalid source identity")
    _check_assignee(db, body.assigned_user_id)
    candidates = _candidates(db)
    key = (source_kind, source_id)
    existing = db.scalar(
        select(MaintenanceAction).where(
            MaintenanceAction.source_kind == source_kind, MaintenanceAction.source_id == source_id
        )
    )
    source = candidates.get(key)
    if source is None and existing is not None and source_kind in {"household", "workshop_manual"}:
        source = {
            "source_kind": source_kind,
            "source_id": source_id,
            "title": existing.title,
            "source_state": "manual",
            "source_stale": False,
            "hazard_unresolved": False,
            "source_due_at": None,
        }
    if source is None:
        raise HTTPException(status_code=404, detail="Source action unavailable; refresh first")
    _check_decision(body, source)
    if body.expected_revision != (existing.revision if existing else 0):
        raise HTTPException(status_code=409, detail="Action changed; refresh first")
    values = {
        "assigned_user_id": body.assigned_user_id,
        "due_at": body.due_at,
        "status": body.status,
        "acknowledged": body.acknowledged,
        "decision_reason": body.decision_reason.strip(),
    }
    if existing is None:
        existing = MaintenanceAction(
            source_kind=source_kind,
            source_id=source_id,
            title=source["title"],
            revision=1,
            **values,
        )
        db.add(existing)
        try:
            db.flush()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(status_code=409, detail="Action created concurrently") from exc
    else:
        result = db.execute(
            update(MaintenanceAction)
            .where(
                MaintenanceAction.id == existing.id,
                MaintenanceAction.revision == body.expected_revision,
            )
            .values(**values, revision=body.expected_revision + 1, updated_at=datetime.now(UTC))
        )
        if result.rowcount != 1:
            db.rollback()
            raise HTTPException(status_code=409, detail="Action changed concurrently")
        db.refresh(existing)
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="maintenance.action.reviewed",
        object_type="maintenance_action",
        object_id=str(existing.id),
        action=body.status,
        arguments={"source_kind": source_kind, "acknowledged": body.acknowledged},
        result={"ok": True, "source_unchanged": True},
    )
    db.commit()
    return _row(existing, source)


def _safe_csv(value: object) -> str:
    text = "" if value is None else str(value)
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@", "\t", "\r")) else text


@router.get("/export.csv")
def export_board(db: DB) -> Response:
    output = io.StringIO()
    fields = [
        "source_kind",
        "source_id",
        "title",
        "source_state",
        "source_stale",
        "hazard_unresolved",
        "status",
        "acknowledged",
        "assigned_user_id",
        "due_at",
        "decision_reason",
        "revision",
    ]
    writer = csv.writer(output)
    writer.writerow(fields)
    for row in _board(db)["items"]:
        writer.writerow([_safe_csv(row.get(field)) for field in fields])
    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=maintenance-actions.csv",
            "Cache-Control": "no-store",
        },
    )
