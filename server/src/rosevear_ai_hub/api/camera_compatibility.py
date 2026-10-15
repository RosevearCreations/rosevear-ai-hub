"""Build 074 camera compatibility plans: authenticated, audited, no media access."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import CameraCompatibilityLedger, CameraCompatibilityRecord, User

router = APIRouter(prefix="/api/v1/camera-compatibility", tags=["camera-compatibility"])
Viewer = Annotated[
    User, Depends(require_roles("owner", "administrator", "household_user", "read_only"))
]
Admin = Annotated[User, Depends(require_roles("owner", "administrator"))]
DB = Annotated[Session, Depends(get_session)]
Method = Literal["unverified", "rtsp", "onvif", "manufacturer", "alexa_only", "unsupported"]


class CameraPlanInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    brand: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=120)
    location: str = Field(default="", max_length=120)
    method: Method = "unverified"
    evidence: str = Field(default="", max_length=400)


class CameraPlanOutput(CameraPlanInput):
    id: int
    revision: int
    approved_by_user_id: int | None
    approved_at: datetime | None


class LedgerOutput(BaseModel):
    id: int
    record_id: int
    actor_user_id: int | None
    action: str
    revision: int
    method: str
    created_at: datetime


def safe(value: str) -> str:
    value = value.strip()
    blocked = ("rtsp://", "rtsps://", "password=", "token=", "apikey=", "api_key=")
    if not value or any(pattern in value.lower() for pattern in blocked):
        raise HTTPException(
            status_code=422, detail="Do not provide empty fields or camera credentials/URLs."
        )
    return value


def output(item: CameraCompatibilityRecord) -> CameraPlanOutput:
    return CameraPlanOutput(
        id=item.id,
        brand=item.brand,
        model=item.model,
        location=item.location,
        method=item.method,
        evidence=item.evidence,
        revision=item.revision,
        approved_by_user_id=item.approved_by_user_id,
        approved_at=item.approved_at,
    )


def entry(db: Session, item: CameraCompatibilityRecord, actor: User, action: str) -> None:
    db.add(
        CameraCompatibilityLedger(
            record_id=item.id,
            actor_user_id=actor.id,
            action=action,
            revision=item.revision,
            method=item.method,
        )
    )
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type=f"camera.compatibility.{action}",
        object_type="camera_compatibility",
        object_id=str(item.id),
        action=action,
        arguments={"revision": item.revision, "method": item.method},
        result={"ok": True},
    )


@router.get("", response_model=list[CameraPlanOutput])
def list_plans(_actor: Viewer, db: DB) -> list[CameraPlanOutput]:
    statement = select(CameraCompatibilityRecord).order_by(CameraCompatibilityRecord.id).limit(100)
    return [output(item) for item in db.scalars(statement).all()]


@router.post("", response_model=CameraPlanOutput, status_code=201)
def create_plan(payload: CameraPlanInput, actor: Admin, db: DB) -> CameraPlanOutput:
    item = CameraCompatibilityRecord(
        brand=safe(payload.brand),
        model=safe(payload.model),
        location=payload.location.strip(),
        method=payload.method,
        evidence=safe(payload.evidence) if payload.evidence.strip() else "",
        revision=1,
    )
    db.add(item)
    db.flush()
    entry(db, item, actor, "created")
    db.commit()
    db.refresh(item)
    return output(item)


@router.put("/{record_id}", response_model=CameraPlanOutput)
def update_plan(
    payload: CameraPlanInput, actor: Admin, db: DB, record_id: int = Path(ge=1)
) -> CameraPlanOutput:
    item = db.get(CameraCompatibilityRecord, record_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Camera compatibility record not found.")
    item.brand = safe(payload.brand)
    item.model = safe(payload.model)
    item.location = payload.location.strip()
    item.method = payload.method
    item.evidence = safe(payload.evidence) if payload.evidence.strip() else ""
    item.revision += 1
    item.approved_by_user_id = None
    item.approved_at = None
    entry(db, item, actor, "updated")
    db.commit()
    db.refresh(item)
    return output(item)


@router.post("/{record_id}/approve", response_model=CameraPlanOutput)
def approve_plan(actor: Admin, db: DB, record_id: int = Path(ge=1)) -> CameraPlanOutput:
    item = db.get(CameraCompatibilityRecord, record_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Camera compatibility record not found.")
    if item.approved_at is not None:
        raise HTTPException(status_code=409, detail="This revision was already approved.")
    if item.method in ("unverified", "unsupported") or len(item.evidence.strip()) < 8:
        raise HTTPException(
            status_code=422, detail="A proposed method and documented evidence are required."
        )
    item.approved_by_user_id = actor.id
    item.approved_at = datetime.now(UTC)
    entry(db, item, actor, "approved")
    db.commit()
    db.refresh(item)
    return output(item)


@router.get("/{record_id}/ledger", response_model=list[LedgerOutput])
def plan_ledger(_actor: Viewer, db: DB, record_id: int = Path(ge=1)) -> list[LedgerOutput]:
    if db.get(CameraCompatibilityRecord, record_id) is None:
        raise HTTPException(status_code=404, detail="Camera compatibility record not found.")
    statement = (
        select(CameraCompatibilityLedger)
        .where(CameraCompatibilityLedger.record_id == record_id)
        .order_by(CameraCompatibilityLedger.id.desc())
        .limit(100)
    )
    return [
        LedgerOutput.model_validate(item, from_attributes=True)
        for item in db.scalars(statement).all()
    ]
