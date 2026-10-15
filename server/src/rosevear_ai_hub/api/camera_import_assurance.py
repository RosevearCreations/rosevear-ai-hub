"""Build 077: owner-recorded Windows field acceptance, never remote runtime certification."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, inspect, select, text
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.camera_inventory_import import server_snapshot
from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import (
    CameraCompatibilityLedger,
    CameraCompatibilityRecord,
    CameraImportAcceptanceEvidence,
    User,
)

router = APIRouter(prefix="/api/v1/camera-import-assurance", tags=["camera-import-assurance"])
Owner = Annotated[User, Depends(require_roles("owner"))]
DB = Annotated[Session, Depends(get_session)]


class AcceptanceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_snapshot: str = Field(pattern=r"^[a-f0-9]{64}$")
    decision: Literal["accepted", "hold"]
    backup_drill_confirmed: bool = False
    ha_connected_confirmed: bool = False
    mqtt_connected_confirmed: bool = False
    camera_status_confirmed: bool = False


class AcceptanceEvidence(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_user_id: int
    inventory_snapshot: str
    migration_revision: str
    camera_count: int
    imported_count: int
    backup_drill_confirmed: bool
    ha_connected_confirmed: bool
    mqtt_connected_confirmed: bool
    camera_status_confirmed: bool
    decision: str
    created_at: datetime


class RuntimeAssurance(BaseModel):
    schema_ready: bool
    migration_revision: str | None
    inventory_snapshot: str
    camera_count: int
    imported_count: int
    latest: AcceptanceEvidence | None
    latest_snapshot_current: bool
    evidence_is_manual_only: bool = True
    windows_runtime_verified_automatically: bool = False


def installed_revision(db: Session) -> str | None:
    if "alembic_version" not in inspect(db.get_bind()).get_table_names():
        return None
    return db.scalar(text("SELECT version_num FROM alembic_version"))


def assurance(db: Session) -> RuntimeAssurance:
    required = {
        "camera_import_acceptance_evidence",
        "camera_compatibility_records",
        "camera_compatibility_ledger",
    }
    tables = set(inspect(db.get_bind()).get_table_names())
    if not required.issubset(tables):
        raise HTTPException(status_code=503, detail="Installed Hub database needs migration 0022.")
    revision = installed_revision(db)
    count = int(db.scalar(select(func.count(CameraCompatibilityRecord.id))) or 0)
    imported = int(
        db.scalar(
            select(func.count(CameraCompatibilityLedger.id)).where(
                CameraCompatibilityLedger.action == "imported"
            )
        )
        or 0
    )
    latest = db.scalar(
        select(CameraImportAcceptanceEvidence)
        .order_by(CameraImportAcceptanceEvidence.id.desc())
        .limit(1)
    )
    snapshot = server_snapshot(db)
    return RuntimeAssurance(
        schema_ready=revision == "0022",
        migration_revision=revision,
        inventory_snapshot=snapshot,
        camera_count=count,
        imported_count=imported,
        latest=AcceptanceEvidence.model_validate(latest) if latest else None,
        latest_snapshot_current=bool(latest and latest.inventory_snapshot == snapshot),
    )


@router.get("/status", response_model=RuntimeAssurance)
def runtime_status(_actor: Owner, db: DB) -> RuntimeAssurance:
    """Read local database evidence, without contacting any camera or home integration."""
    return assurance(db)


@router.post("/owner-acceptance", response_model=AcceptanceEvidence, status_code=201)
def record_owner_acceptance(
    payload: AcceptanceInput, actor: Owner, db: DB
) -> AcceptanceEvidence:
    current = assurance(db)
    if not current.schema_ready:
        raise HTTPException(status_code=409, detail="Migration 0022 is not installed.")
    if current.inventory_snapshot != payload.expected_snapshot:
        raise HTTPException(status_code=409, detail="Inventory changed; inspect again.")
    checks = (
        payload.backup_drill_confirmed,
        payload.ha_connected_confirmed,
        payload.mqtt_connected_confirmed,
        payload.camera_status_confirmed,
    )
    if payload.decision == "accepted" and not all(checks):
        raise HTTPException(
            status_code=422, detail="All four manual field checks are required to accept."
        )
    row = CameraImportAcceptanceEvidence(
        actor_user_id=actor.id,
        inventory_snapshot=current.inventory_snapshot,
        migration_revision=current.migration_revision or "",
        camera_count=current.camera_count,
        imported_count=current.imported_count,
        backup_drill_confirmed=payload.backup_drill_confirmed,
        ha_connected_confirmed=payload.ha_connected_confirmed,
        mqtt_connected_confirmed=payload.mqtt_connected_confirmed,
        camera_status_confirmed=payload.camera_status_confirmed,
        decision=payload.decision,
    )
    db.add(row)
    db.flush()
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="camera.import.owner_acceptance",
        object_type="camera_import_acceptance",
        object_id=str(row.id),
        action="record_manual_field_evidence",
        arguments={"decision": payload.decision, "migration": current.migration_revision},
        result={"ok": True, "manual_only": True},
    )
    db.commit()
    db.refresh(row)
    return AcceptanceEvidence.model_validate(row)
