"""Build 078: owner-only reconciliation of existing manual camera acceptance."""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.camera_import_assurance import assurance
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import CameraImportAcceptanceEvidence, User

router = APIRouter(
    prefix="/api/v1/camera-import-reconciliation", tags=["camera-import-reconciliation"]
)
Owner = Annotated[User, Depends(require_roles("owner"))]
DB = Annotated[Session, Depends(get_session)]


class Reconciliation(BaseModel):
    status: Literal["HOLD", "MANUAL_REVIEW_CURRENT"]
    reasons: list[str]
    latest_evidence_id: int | None
    latest_decision: str | None
    evidence_count: int
    current_inventory_count: int
    current_import_events: int
    snapshot_current: bool
    schema_ready: bool
    runtime_verified_automatically: bool = False
    isolated_recovery_verified_automatically: bool = False


def reconcile(db: Session) -> Reconciliation:
    """Review stored owner testimony only; no cameras, services, or backups accessed."""
    current = assurance(db)
    latest = current.latest
    total = int(db.scalar(select(func.count(CameraImportAcceptanceEvidence.id))) or 0)
    reasons: list[str] = []
    if not current.schema_ready:
        reasons.append("MIGRATION_REVIEW_REQUIRED")
    if latest is None:
        reasons.append("NO_OWNER_EVIDENCE")
    else:
        if latest.decision != "accepted":
            reasons.append("LATEST_DECISION_HOLD")
        if not current.latest_snapshot_current:
            reasons.append("INVENTORY_CHANGED")
        if latest.migration_revision != current.migration_revision:
            reasons.append("SCHEMA_CHANGED")
        if latest.camera_count != current.camera_count:
            reasons.append("CAMERA_COUNT_CHANGED")
        if latest.imported_count != current.imported_count:
            reasons.append("IMPORT_LEDGER_CHANGED")
        checks = (
            latest.backup_drill_confirmed,
            latest.ha_connected_confirmed,
            latest.mqtt_connected_confirmed,
            latest.camera_status_confirmed,
        )
        if not all(checks):
            reasons.append("INCOMPLETE_OWNER_CHECKS")
    return Reconciliation(
        status="HOLD" if reasons else "MANUAL_REVIEW_CURRENT",
        reasons=reasons,
        latest_evidence_id=latest.id if latest else None,
        latest_decision=latest.decision if latest else None,
        evidence_count=total,
        current_inventory_count=current.camera_count,
        current_import_events=current.imported_count,
        snapshot_current=current.latest_snapshot_current,
        schema_ready=current.schema_ready,
    )


@router.get("", response_model=Reconciliation)
def get_reconciliation(_actor: Owner, db: DB) -> Reconciliation:
    return reconcile(db)
