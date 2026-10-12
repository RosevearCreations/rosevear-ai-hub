"""Build 057: local workshop asset register and manual safety observations.

No device start/stop API, certification claims, automation, or cloud integrations.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import User, WorkshopEquipment, WorkshopInspection, WorkshopStation

router = APIRouter(prefix="/api/v1/workshop", tags=["workshop"])
Database = Annotated[Session, Depends(get_session)]
Maintainer = Annotated[User, Depends(require_roles("owner", "administrator"))]
ProjectKey = Annotated[str, Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9][A-Za-z0-9_.-]*$")]
Activity = Literal["general", "laser", "cnc", "forge", "electrical", "chemical", "other"]
Observation = Literal["observed_ok", "needs_service", "unsafe"]
Readiness = Literal["unverified", "review_required", "attention", "blocked"]


class StationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_key: ProjectKey
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    hazards_json: list[str] = Field(default_factory=list, max_length=8)


class StationOut(StationCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    disabled: bool
    created_at: datetime


class EquipmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_key: ProjectKey
    station_id: int | None = None
    name: str = Field(min_length=1, max_length=160)
    equipment_type: str = Field(min_length=1, max_length=80)
    activity_type: Activity = "general"
    maintenance_due_at: datetime | None = None
    notes: str = Field(default="", max_length=500)


class EquipmentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    station_id: int | None = None
    maintenance_due_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=500)
    disabled: bool | None = None


class EquipmentOut(EquipmentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    readiness_status: Readiness
    last_inspected_at: datetime | None
    disabled: bool
    created_at: datetime


class InspectionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    review_status: Observation
    note: str = Field(default="", max_length=500)


class InspectionOut(InspectionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    equipment_id: int
    checked_by_user_id: int | None
    checked_at: datetime


def _station_for_project(db: Session, station_id: int | None, project_key: str) -> None:
    if station_id is None:
        return
    station = db.get(WorkshopStation, station_id)
    if station is None or station.disabled or station.project_key != project_key:
        raise HTTPException(status_code=422, detail="Select an active workstation in this project.")


@router.get("/stations", response_model=list[StationOut])
def list_stations(db: Database, limit: int = Query(default=100, ge=1, le=200)):
    return db.scalars(select(WorkshopStation).order_by(WorkshopStation.id).limit(limit)).all()


@router.post("/stations", response_model=StationOut, status_code=201)
def create_station(body: StationCreate, actor: Maintainer, db: Database):
    if any(len(hazard) > 80 or not hazard.strip() for hazard in body.hazards_json):
        raise HTTPException(status_code=422, detail="Hazard labels must be nonempty and under 81 characters.")
    item = WorkshopStation(**body.model_dump())
    db.add(item)
    try:
        db.flush()
        record_audit_event(
            db, actor_user_id=actor.id, event_type="workshop.station.created",
            object_type="workshop_station", object_id=str(item.id), action="create",
            arguments={"project_key":item.project_key, "name":item.name},
            result={"ok":True},
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Workstation name already exists in this project.") from exc
    db.refresh(item)
    return item


@router.get("/equipment", response_model=list[EquipmentOut])
def list_equipment(db: Database, limit: int = Query(default=200, ge=1, le=200)):
    return db.scalars(select(WorkshopEquipment).order_by(WorkshopEquipment.id).limit(limit)).all()


@router.post("/equipment", response_model=EquipmentOut, status_code=201)
def create_equipment(body: EquipmentCreate, actor: Maintainer, db: Database):
    _station_for_project(db, body.station_id, body.project_key)
    item = WorkshopEquipment(**body.model_dump(), readiness_status="unverified")
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor_user_id=actor.id, event_type="workshop.equipment.created",
        object_type="workshop_equipment", object_id=str(item.id), action="create",
        arguments={"project_key":item.project_key, "activity_type":item.activity_type},
        result={"ok":True},
    )
    db.commit()
    db.refresh(item)
    return item


@router.patch("/equipment/{equipment_id}", response_model=EquipmentOut)
def update_equipment(
    equipment_id: int, body: EquipmentUpdate, actor: Maintainer, db: Database,
):
    item = db.get(WorkshopEquipment, equipment_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Equipment not found.")
    data = body.model_dump(exclude_unset=True)
    _station_for_project(db, data.get("station_id"), item.project_key)
    for key, value in data.items():
        setattr(item, key, value)
    record_audit_event(
        db, actor_user_id=actor.id, event_type="workshop.equipment.updated",
        object_type="workshop_equipment", object_id=str(item.id), action="update",
        arguments={"fields":list(data)}, result={"ok":True},
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/equipment/{equipment_id}/inspections", response_model=list[InspectionOut])
def list_inspections(equipment_id: int, db: Database):
    if db.get(WorkshopEquipment, equipment_id) is None:
        raise HTTPException(status_code=404, detail="Equipment not found.")
    return db.scalars(
        select(WorkshopInspection)
        .where(WorkshopInspection.equipment_id == equipment_id)
        .order_by(WorkshopInspection.id.desc()).limit(100)
    ).all()


@router.post("/equipment/{equipment_id}/inspections", response_model=InspectionOut, status_code=201)
def record_inspection(
    equipment_id: int, body: InspectionCreate, actor: Maintainer, db: Database,
):
    item = db.get(WorkshopEquipment, equipment_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Equipment not found.")
    observed_at = datetime.now(UTC)
    inspection = WorkshopInspection(
        equipment_id=item.id, review_status=body.review_status,
        note=body.note.strip(), checked_by_user_id=actor.id, checked_at=observed_at,
    )
    item.last_inspected_at = observed_at
    # "observed_ok" NEVER yields a certification or an operational go-ahead.
    item.readiness_status = {
        "observed_ok": "review_required",
        "needs_service": "attention",
        "unsafe": "blocked",
    }[body.review_status]
    db.add(inspection)
    db.flush()
    record_audit_event(
        db, actor_user_id=actor.id, event_type="workshop.inspection.recorded",
        object_type="workshop_equipment", object_id=str(item.id), action="record",
        arguments={"review_status":body.review_status},
        result={"ok":True, "readiness_status":item.readiness_status},
    )
    db.commit()
    db.refresh(inspection)
    return inspection


@router.get("/readiness")
def readiness_summary(db: Database) -> dict[str, object]:
    items = db.scalars(select(WorkshopEquipment).limit(200)).all()
    due = sum(
        1 for item in items
        if item.maintenance_due_at is not None
        and item.maintenance_due_at.replace(tzinfo=UTC) <= datetime.now(UTC)
    )
    return {
        "equipment_count":len(items),
        "unverified":sum(item.readiness_status == "unverified" for item in items),
        "review_required":sum(item.readiness_status == "review_required" for item in items),
        "attention":sum(item.readiness_status == "attention" for item in items),
        "blocked":sum(item.readiness_status == "blocked" for item in items),
        "maintenance_overdue":due,
        "scope":"manual_records_only",
        "automatic_equipment_control":False,
        "counts_limited_to_first":200,
    }
