"""Owner-approved, preview-before-import of legacy browser camera worksheets."""

from __future__ import annotations

import hashlib
import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.camera_compatibility import (
    CameraPlanInput,
    CameraPlanOutput,
    entry,
    output,
    safe,
)
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.camera_plan_identity import (
    ensure_no_duplicate,
    find_duplicate,
    identity_fingerprint,
)
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import CameraCompatibilityRecord, User

router = APIRouter(prefix="/api/v1/camera-compatibility/import", tags=["camera-import"])
Admin = Annotated[User, Depends(require_roles("owner", "administrator"))]
DB = Annotated[Session, Depends(get_session)]


class ImportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    entries: list[CameraPlanInput] = Field(min_length=1, max_length=50)


class ImportDecision(ImportRequest):
    expected_snapshot: str = Field(pattern=r"^[a-f0-9]{64}$")
    owner_acknowledged: bool


class ImportRow(BaseModel):
    index: int
    status: str
    existing_id: int | None


class ImportPreview(BaseModel):
    server_snapshot: str
    rows: list[ImportRow]
    ready: int
    conflicts: int


class ImportResult(BaseModel):
    created: list[CameraPlanOutput]
    imported: int
    approvals_carried_over: bool = False


def server_snapshot(db: Session) -> str:
    # Conservative snapshot: any record addition, edit or approval invalidates preview.
    records = db.scalars(select(CameraCompatibilityRecord).order_by(CameraCompatibilityRecord.id))
    stamp = [
        (
            item.id,
            item.revision,
            item.approved_by_user_id,
            str(item.approved_at) if item.approved_at else None,
            identity_fingerprint(item.brand, item.model, item.location),
        )
        for item in records
    ]
    return hashlib.sha256(json.dumps(stamp).encode("utf-8")).hexdigest()


def checked_entries(entries: list[CameraPlanInput]) -> list[tuple[str, str, str, CameraPlanInput]]:
    seen: set[str] = set()
    checked = []
    for item in entries:
        brand, model = safe(item.brand), safe(item.model)
        location = item.location.strip()
        if location:
            location = safe(location)
        if item.evidence.strip():
            safe(item.evidence)
        signature = identity_fingerprint(brand, model, location)
        if signature in seen:
            raise HTTPException(status_code=422, detail="Duplicate models in import selection.")
        seen.add(signature)
        checked.append((brand, model, location, item))
    return checked


@router.post("/preview", response_model=ImportPreview)
def preview_import(payload: ImportRequest, _actor: Admin, db: DB) -> ImportPreview:
    checked = checked_entries(payload.entries)
    rows = []
    for i, (brand, model, location, _) in enumerate(checked):
        match = find_duplicate(db, brand, model, location)
        rows.append(
            ImportRow(
                index=i,
                status="conflict" if match else "ready",
                existing_id=match.id if match else None,
            )
        )
    return ImportPreview(
        server_snapshot=server_snapshot(db),
        rows=rows,
        ready=sum(row.status == "ready" for row in rows),
        conflicts=sum(row.status == "conflict" for row in rows),
    )


@router.post("/commit", response_model=ImportResult, status_code=201)
def commit_import(payload: ImportDecision, actor: Admin, db: DB) -> ImportResult:
    if not payload.owner_acknowledged:
        raise HTTPException(status_code=422, detail="Explicit owner review is required.")
    checked = checked_entries(payload.entries)
    if server_snapshot(db) != payload.expected_snapshot:
        raise HTTPException(status_code=409, detail="Server inventory changed; preview again.")
    # All-or-nothing: never overwrite existing records or implicitly copy approvals.
    created = []
    try:
        for brand, model, location, item in checked:
            signature = ensure_no_duplicate(db, brand, model, location)
            record = CameraCompatibilityRecord(
                brand=brand,
                model=model,
                location=location,
                method=item.method,
                evidence=item.evidence.strip(),
                identity_fingerprint=signature,
                revision=1,
                approved_at=None,
                approved_by_user_id=None,
            )
            db.add(record)
            db.flush()
            entry(db, record, actor, "imported")
            created.append(record)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Import conflict; preview again.") from exc
    return ImportResult(created=[output(record) for record in created], imported=len(created))
