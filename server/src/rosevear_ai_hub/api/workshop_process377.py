"""Build 377 — owner-only workshop process observations and source-separated board.

Manual process reports never authorize physical equipment operation. Signed
printer-PC receipts are displayed separately from equipment because names and
Windows enumeration are not verified physical identity. No polling or actuator.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import (
    User,
    WorkshopEquipment,
    WorkshopGatewayReceipt370,
    WorkshopJob,
    WorkshopMaintenancePlan,
    WorkshopProcessReading377,
)

router = APIRouter(prefix="/api/v1/workshop-process-377", tags=["workshop-process"])
Owner = Annotated[User, Depends(require_roles("owner", "administrator"))]
DB = Annotated[Session, Depends(get_session)]
Operating = Literal[
    "unknown", "idle_reported", "active_reported", "paused_reported", "fault_reported"
]
Ventilation = Literal["unknown", "on_reported", "off_reported", "not_applicable"]
MAX_EQUIPMENT = 200
MAX_READINGS_PER_EQUIPMENT = 500
FRESH_SECONDS = 3600


class ManualReadingIn(BaseModel):
    """An unverified owner report, not trusted machine/safety telemetry."""

    model_config = ConfigDict(extra="forbid")
    equipment_id: int = Field(gt=0)
    operating_state: Operating
    progress_percent: float | None = Field(default=None, ge=0, le=100, allow_inf_nan=False)
    temperature_c: float | None = Field(default=None, ge=-40, le=1500, allow_inf_nan=False)
    ventilation: Ventilation = "unknown"
    note: str = Field(default="", max_length=300)
    observed_at: datetime

    @model_validator(mode="after")
    def validate_observation(self) -> ManualReadingIn:
        now = datetime.now(UTC)
        when = self.observed_at
        if when.tzinfo is None or when.utcoffset() is None:
            raise ValueError("Observation timestamp must include a timezone.")
        if when > now + timedelta(minutes=2) or when < now - timedelta(days=7):
            raise ValueError("Observation timestamp must be within the last seven days.")
        if self.note != self.note.strip() or any(ord(x) < 32 for x in self.note):
            raise ValueError("Note must be printable and trimmed.")
        if (
            self.operating_state == "unknown"
            and self.progress_percent is None
            and self.temperature_c is None
            and self.ventilation == "unknown"
            and not self.note
        ):
            raise ValueError("Provide a process state, reading or meaningful note.")
        return self


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def _reading(row: WorkshopProcessReading377) -> dict:
    return {
        "id": row.id,
        "equipmentId": row.equipment_id,
        "operatingState": row.operating_state,
        "progressPercent": row.progress_percent,
        "temperatureC": row.temperature_c,
        "ventilation": row.ventilation,
        "note": row.note,
        "observedAt": _aware(row.observed_at).isoformat(),
        "recordedAt": _aware(row.recorded_at).isoformat(),
        "source": "OWNER_MANUAL_UNVERIFIED",
        "safetyCertified": False,
    }


@router.post("/observations", status_code=201)
def record_manual(payload: ManualReadingIn, actor: Owner, db: DB) -> dict:
    equipment = db.get(WorkshopEquipment, payload.equipment_id)
    if equipment is None or equipment.disabled:
        raise HTTPException(status_code=404, detail="Active registered equipment not found.")
    count = len(
        db.scalars(
            select(WorkshopProcessReading377.id)
            .where(WorkshopProcessReading377.equipment_id == equipment.id)
            .limit(MAX_READINGS_PER_EQUIPMENT)
        ).all()
    )
    if count >= MAX_READINGS_PER_EQUIPMENT:
        raise HTTPException(status_code=409, detail="Observation capacity reached; archive safely.")
    row = WorkshopProcessReading377(
        equipment_id=equipment.id,
        recorded_by_user_id=actor.id,
        operating_state=payload.operating_state,
        progress_percent=payload.progress_percent,
        temperature_c=payload.temperature_c,
        ventilation=payload.ventilation,
        note=payload.note,
        observed_at=payload.observed_at.astimezone(UTC),
        recorded_at=datetime.now(UTC),
    )
    db.add(row)
    db.flush()
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="workshop377.owner_process_observation",
        object_type="workshop_equipment",
        object_id=str(equipment.id),
        action="append_unverified_manual_reading",
        arguments={
            "fields": ["operating_state", "progress_percent", "temperature_c", "ventilation"]
        },
        result={"machine_commands": 0, "safety_certified": False},
    )
    db.commit()
    return _reading(row)


@router.get("/observations/{equipment_id}")
def history(equipment_id: int, actor: Owner, db: DB, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    if db.get(WorkshopEquipment, equipment_id) is None:
        raise HTTPException(status_code=404, detail="Equipment not found.")
    rows = db.scalars(
        select(WorkshopProcessReading377)
        .where(WorkshopProcessReading377.equipment_id == equipment_id)
        .order_by(WorkshopProcessReading377.id.desc())
        .limit(25)
    ).all()
    return {"readings": [_reading(x) for x in rows], "source": "OWNER_MANUAL_UNVERIFIED"}


def _gateway_sources(db: Session, now: datetime) -> list[dict]:
    """Only previously admitted signed receipts; no live network fetch."""
    rows = db.scalars(
        select(WorkshopGatewayReceipt370).order_by(WorkshopGatewayReceipt370.id.desc()).limit(20)
    ).all()
    seen: set[str] = set()
    result: list[dict] = []
    now_ms = int(now.timestamp() * 1000)
    for row in rows:
        if row.collector_id in seen:
            continue
        seen.add(row.collector_id)
        fresh = (
            row.observed_at_ms <= now_ms <= row.expires_at_ms
            and now_ms - row.observed_at_ms <= 300_000
        )
        devices: list[dict] = []
        try:
            payload = json.loads(row.payload_json)
            for device in payload.get("devices", [])[:48]:
                if device.get("kind") != "octoprint" or device.get("proof") != "octoprint_loopback":
                    continue
                devices.append(
                    {
                        "label": device["label"],
                        "presence": device["presence"],
                        "progressPercent": device.get("progress_percent"),
                        "nozzleC": device.get("nozzle_c"),
                        "bedC": device.get("bed_c"),
                        "source": "SIGNED_WINDOWS_COLLECTOR_OCTOPRINT_READ",
                        "physicalIdentityVerified": False,
                    }
                )
        except (ValueError, TypeError, KeyError, AttributeError):
            fresh = False
            devices = []
        result.append(
            {
                "collectorId": row.collector_id,
                "observedAt": datetime.fromtimestamp(row.observed_at_ms / 1000, UTC).isoformat(),
                "expiresAt": datetime.fromtimestamp(row.expires_at_ms / 1000, UTC).isoformat(),
                "fresh": fresh,
                "status": "SIGNED_SOURCE_CURRENT" if fresh else "HOLD_STALE_SIGNED_SOURCE",
                "devices": devices,
                "boundToWorkshopEquipment": False,
                "physicalIdentityVerified": False,
            }
        )
    return result


@router.get("/board")
def board(actor: Owner, db: DB, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    now = datetime.now(UTC)
    equipment = db.scalars(
        select(WorkshopEquipment).order_by(WorkshopEquipment.id.asc()).limit(MAX_EQUIPMENT)
    ).all()
    equipment_ids = [e.id for e in equipment]
    latest: dict[int, WorkshopProcessReading377] = {}
    jobs: dict[int, list[WorkshopJob]] = {}
    plans: dict[int, WorkshopMaintenancePlan] = {}
    if equipment_ids:
        observations = db.scalars(
            select(WorkshopProcessReading377)
            .where(WorkshopProcessReading377.equipment_id.in_(equipment_ids))
            .order_by(WorkshopProcessReading377.id.desc())
        ).all()
        for observation in observations:
            latest.setdefault(observation.equipment_id, observation)
        for job in db.scalars(
            select(WorkshopJob)
            .where(WorkshopJob.equipment_id.in_(equipment_ids), WorkshopJob.archived.is_(False))
            .order_by(WorkshopJob.id.desc())
            .limit(500)
        ):
            assert job.equipment_id is not None
            jobs.setdefault(job.equipment_id, []).append(job)
        for plan in db.scalars(
            select(WorkshopMaintenancePlan).where(
                WorkshopMaintenancePlan.equipment_id.in_(equipment_ids)
            )
        ):
            plans[plan.equipment_id] = plan
    items: list[dict] = []
    for eq in equipment:
        recent = latest.get(eq.id)
        age = (now - _aware(recent.observed_at)).total_seconds() if recent else None
        fresh = age is not None and 0 <= age <= FRESH_SECONDS
        plan = plans.get(eq.id)
        due_at = plan.next_due_at if plan else eq.maintenance_due_at
        overdue = bool(due_at and _aware(due_at) <= now)
        risks = []
        if eq.disabled:
            risks.append("DISABLED_IN_REGISTRY")
        if eq.readiness_status == "blocked":
            risks.append("SAFETY_INSPECTION_BLOCKED")
        if eq.readiness_status == "attention":
            risks.append("INSPECTION_NEEDS_SERVICE")
        if overdue:
            risks.append("MAINTENANCE_DUE")
        if not recent:
            risks.append("NO_PROCESS_READING")
        elif not fresh:
            risks.append("STALE_OR_FUTURE_MANUAL_READING")
        if (
            recent
            and recent.ventilation == "off_reported"
            and eq.activity_type in {"laser", "forge", "chemical"}
        ):
            risks.append("VENTILATION_REPORTED_OFF_REVIEW")
        if recent and recent.operating_state == "fault_reported":
            risks.append("FAULT_REPORTED_REVIEW")
        active_jobs = jobs.get(eq.id, [])
        items.append(
            {
                "equipmentId": eq.id,
                "name": eq.name,
                "equipmentType": eq.equipment_type,
                "project": eq.project_key,
                "activity": eq.activity_type,
                "disabled": eq.disabled,
                "readiness": eq.readiness_status,
                "reading": _reading(recent) if recent else None,
                "readingFresh": bool(fresh),
                "ageSeconds": round(age) if age is not None else None,
                "attention": risks,
                "maintenanceDueAt": _aware(due_at).isoformat() if due_at else None,
                "jobs": [
                    {
                        "id": j.id,
                        "title": j.title,
                        "status": j.status,
                        "progressPercent": j.progress_percent,
                        "source": "OWNER_JOB_RECORD_NOT_MACHINE_TELEMETRY",
                    }
                    for j in active_jobs[:12]
                ],
                "activeJobCount": len(active_jobs),
                "machineControlEnabled": False,
                "safetyCertified": False,
            }
        )
    return {
        "schema": "rosevear.hub.workshop-process.v377",
        "sampledAt": now.isoformat(),
        "source": "LOCAL_DATABASE_AND_PRIOR_SIGNED_RECEIPTS_ONLY",
        "equipment": items,
        "signedCollectors": _gateway_sources(db, now),
        "summary": {
            "registered": len(items),
            "withFreshManualReading": sum(x["readingFresh"] for x in items),
            "withAttention": sum(bool(x["attention"]) for x in items),
            "unboundJobWarning": "Jobs without an equipment ID are excluded from machine totals.",
        },
        "sourceLimit": MAX_EQUIPMENT,
        "automaticPolling": False,
        "machineCommandsEnabled": False,
        "fieldSafetyAccepted": False,
        "externalAppUpdatesAreNotGitDivergence": True,
    }
