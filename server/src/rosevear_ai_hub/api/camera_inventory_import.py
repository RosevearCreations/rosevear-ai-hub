"""Identity-bound camera worksheet import with reviewed one-use acceptance receipts."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, inspect, select, text
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
from rosevear_ai_hub.models import (
    CameraCompatibilityLedger,
    CameraCompatibilityRecord,
    CameraImportReview,
    User,
)

router = APIRouter(prefix="/api/v1/camera-compatibility/import", tags=["camera-import"])
Admin = Annotated[User, Depends(require_roles("owner", "administrator"))]
DB = Annotated[Session, Depends(get_session)]
REVIEW_MINUTES = 10


class ImportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    entries: list[CameraPlanInput] = Field(min_length=1, max_length=50)


class ImportDecision(ImportRequest):
    expected_snapshot: str = Field(pattern=r"^[a-f0-9]{64}$")
    preview_token: str = Field(min_length=32, max_length=128)
    owner_acknowledged: bool


class ImportRow(BaseModel):
    index: int
    status: str
    existing_id: int | None


class ImportPreview(BaseModel):
    server_snapshot: str
    preview_token: str | None
    expires_at: datetime | None
    rows: list[ImportRow]
    ready: int
    conflicts: int


class ImportResult(BaseModel):
    created: list[CameraPlanOutput]
    imported: int
    approvals_carried_over: bool = False


class FieldReadiness(BaseModel):
    migration_revision: str | None
    schema_ready: bool
    camera_records: int
    unapproved_records: int
    import_ledger_events: int
    review_receipts: int
    local_windows_acceptance_required: bool = True


def server_snapshot(db: Session) -> str:
    """Conservatively invalidate previews after any inventory mutation or approval."""
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


def payload_digest(rows: list[tuple[str, str, str, CameraPlanInput]]) -> str:
    """Canonical digest binds exact reviewed models, methods and evidence to a receipt."""
    canonical = [
        {
            "brand": brand,
            "model": model,
            "location": location,
            "method": item.method,
            "evidence": item.evidence.strip(),
        }
        for brand, model, location, item in rows
    ]
    value = json.dumps(canonical, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def as_utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


@router.post("/preview", response_model=ImportPreview)
def preview_import(payload: ImportRequest, actor: Admin, db: DB) -> ImportPreview:
    checked = checked_entries(payload.entries)
    rows: list[ImportRow] = []
    ready_rows = []
    for index, (brand, model, location, item) in enumerate(checked):
        match = find_duplicate(db, brand, model, location)
        rows.append(
            ImportRow(
                index=index,
                status="conflict" if match else "ready",
                existing_id=match.id if match else None,
            )
        )
        if match is None:
            ready_rows.append((brand, model, location, item))
    snapshot = server_snapshot(db)
    token = None
    expires = None
    if ready_rows:
        token = token_urlsafe(40)
        expires = datetime.now(UTC) + timedelta(minutes=REVIEW_MINUTES)
        db.add(
            CameraImportReview(
                token_hash=hashlib.sha256(token.encode("utf-8")).hexdigest(),
                actor_user_id=actor.id,
                payload_hash=payload_digest(ready_rows),
                inventory_snapshot=snapshot,
                expires_at=expires,
                imported_count=0,
            )
        )
        db.commit()
    return ImportPreview(
        server_snapshot=snapshot,
        preview_token=token,
        expires_at=expires,
        rows=rows,
        ready=len(ready_rows),
        conflicts=len(rows) - len(ready_rows),
    )


@router.post("/commit", response_model=ImportResult, status_code=201)
def commit_import(payload: ImportDecision, actor: Admin, db: DB) -> ImportResult:
    if not payload.owner_acknowledged:
        raise HTTPException(status_code=422, detail="Explicit owner review is required.")
    checked = checked_entries(payload.entries)
    receipt = db.get(
        CameraImportReview,
        hashlib.sha256(payload.preview_token.encode("utf-8")).hexdigest(),
    )
    if receipt is None:
        raise HTTPException(status_code=409, detail="Import preview unavailable; preview again.")
    if receipt.actor_user_id != actor.id:
        raise HTTPException(status_code=403, detail="Import preview belongs to another account.")
    if receipt.consumed_at is not None or as_utc(receipt.expires_at) <= datetime.now(UTC):
        raise HTTPException(status_code=409, detail="Import preview expired or consumed.")
    if (
        receipt.payload_hash != payload_digest(checked)
        or receipt.inventory_snapshot != payload.expected_snapshot
        or server_snapshot(db) != receipt.inventory_snapshot
    ):
        raise HTTPException(status_code=409, detail="Import selection or inventory changed; preview again.")
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
        receipt.consumed_at = datetime.now(UTC)
        receipt.imported_count = len(created)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Import conflict; preview again.") from exc
    return ImportResult(created=[output(record) for record in created], imported=len(created))


@router.get("/field-readiness", response_model=FieldReadiness)
def field_readiness(_actor: Admin, db: DB) -> FieldReadiness:
    """Read-only local installation evidence; never attests a remote Windows host."""
    database = inspect(db.get_bind())
    tables = set(database.get_table_names())
    schema_ready = {"camera_import_reviews", "camera_compatibility_records"}.issubset(tables)
    revision = None
    if "alembic_version" in tables:
        revision = db.scalar(text("SELECT version_num FROM alembic_version"))
    records = int(db.scalar(select(func.count(CameraCompatibilityRecord.id))) or 0)
    unapproved = int(
        db.scalar(
            select(func.count(CameraCompatibilityRecord.id))
            .where(CameraCompatibilityRecord.approved_at.is_(None))
        )
        or 0
    )
    imported = int(
        db.scalar(
            select(func.count(CameraCompatibilityLedger.id))
            .where(CameraCompatibilityLedger.action == "imported")
        )
        or 0
    )
    reviews = int(db.scalar(select(func.count(CameraImportReview.token_hash))) or 0)
    return FieldReadiness(
        migration_revision=revision,
        schema_ready=schema_ready and revision == "0021",
        camera_records=records,
        unapproved_records=unapproved,
        import_ledger_events=imported,
        review_receipts=reviews,
    )
