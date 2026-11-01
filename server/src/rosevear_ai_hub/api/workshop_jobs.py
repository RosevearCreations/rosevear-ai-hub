"""Build 218: owner-managed offline workshop jobs; no equipment, inventory or cloud actions."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import User, WorkshopEquipment, WorkshopJob, WorkshopJobPhoto

router = APIRouter(prefix="/api/v1/workshop/jobs", tags=["workshop-jobs"])
DB = Annotated[Session, Depends(get_session)]
Owner = Annotated[User, Depends(require_roles("owner", "administrator"))]
Category = Literal["jewelry", "3d_print", "cnc", "laser", "casting", "sublimation", "other"]
Status = Literal["planned", "active", "paused", "completed"]
Unit = Literal["piece", "g", "kg", "ml", "l", "mm", "cm", "m"]
MAX_PHOTO = 2 * 1024 * 1024


class Material(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    unit: Unit
    estimated: Decimal = Field(ge=0, max_digits=12, decimal_places=3)
    actual: Decimal = Field(ge=0, max_digits=12, decimal_places=3)

    @model_validator(mode="after")
    def normalize(self) -> Material:
        if not self.name.strip():
            raise ValueError("Material name cannot be blank")
        self.name = self.name.strip()
        return self


class JobFields(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=160)
    category: Category
    equipment_id: int | None = None
    status: Status = "planned"
    progress_percent: int = Field(default=0, ge=0, le=100)
    estimated_minutes: int = Field(default=0, ge=0, le=1000000)
    actual_minutes: int = Field(default=0, ge=0, le=1000000)
    materials: list[Material] = Field(default_factory=list, max_length=30)
    notes: str = Field(default="", max_length=2000)
    archived: bool = False

    @model_validator(mode="after")
    def validate_fields(self) -> JobFields:
        if not self.title.strip():
            raise ValueError("Job title cannot be blank")
        if len({material.name.casefold() for material in self.materials}) != len(self.materials):
            raise ValueError("Material names must be distinct per job")
        if self.status == "completed" and self.progress_percent != 100:
            raise ValueError("Completed jobs must show 100% progress")
        return self


class JobUpdate(JobFields):
    expected_revision: int = Field(ge=1)


def _get_job(db: Session, job_id: int) -> WorkshopJob:
    job = db.get(WorkshopJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Workshop job not found")
    return job


def _fields(body: JobFields, db: Session) -> dict:
    if body.equipment_id is not None and db.get(WorkshopEquipment, body.equipment_id) is None:
        raise HTTPException(status_code=422, detail="Select an existing equipment record")
    return {
        "title": body.title.strip(),
        "category": body.category,
        "equipment_id": body.equipment_id,
        "status": body.status,
        "progress_percent": body.progress_percent,
        "estimated_minutes": body.estimated_minutes,
        "actual_minutes": body.actual_minutes,
        "materials_json": [material.model_dump(mode="json") for material in body.materials],
        "notes": body.notes.strip(),
        "archived": body.archived,
    }


def _out(db: Session, job: WorkshopJob) -> dict:
    photos = db.scalars(
        select(WorkshopJobPhoto)
        .where(WorkshopJobPhoto.job_id == job.id)
        .order_by(WorkshopJobPhoto.id)
    ).all()
    return {
        "id": job.id,
        "revision": job.revision,
        "title": job.title,
        "category": job.category,
        "equipment_id": job.equipment_id,
        "status": job.status,
        "progress_percent": job.progress_percent,
        "estimated_minutes": job.estimated_minutes,
        "actual_minutes": job.actual_minutes,
        "materials": job.materials_json,
        "notes": job.notes,
        "archived": job.archived,
        "photos": [{"id": photo.id, "mime_type": photo.mime_type} for photo in photos],
        "scope": "private_local_manual",
        "inventory_deducted": False,
        "equipment_control": False,
    }


@router.get("")
def list_jobs(db: DB, include_archived: bool = False) -> list[dict]:
    query = select(WorkshopJob).order_by(WorkshopJob.id.desc()).limit(200)
    if not include_archived:
        query = query.where(WorkshopJob.archived.is_(False))
    return [_out(db, job) for job in db.scalars(query).all()]


@router.post("", status_code=201)
def create_job(body: JobFields, actor: Owner, db: DB) -> dict:
    job = WorkshopJob(**_fields(body, db))
    db.add(job)
    db.flush()
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="workshop.job.created",
        object_type="workshop_job",
        object_id=str(job.id),
        action="create",
        arguments={"category": job.category},
        result={"ok": True, "equipment_control": False},
    )
    db.commit()
    return _out(db, job)


@router.put("/{job_id}")
def update_job(job_id: int, body: JobUpdate, actor: Owner, db: DB) -> dict:
    job = _get_job(db, job_id)
    changes = _fields(body, db)
    changed = db.execute(
        update(WorkshopJob)
        .where(WorkshopJob.id == job_id, WorkshopJob.revision == body.expected_revision)
        .values(**changes, revision=body.expected_revision + 1, updated_at=datetime.now(UTC))
    )
    if changed.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail="Job changed; refresh before saving")
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="workshop.job.updated",
        object_type="workshop_job",
        object_id=str(job_id),
        action="update",
        arguments={"revision": body.expected_revision, "archived": body.archived},
        result={"ok": True, "revision": body.expected_revision + 1},
    )
    db.commit()
    db.refresh(job)
    return _out(db, job)


def _photo_type(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff") and data.endswith(b"\xff\xd9"):
        return "image/jpeg"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


@router.post("/{job_id}/photos", status_code=201)
async def add_photo(
    job_id: int, actor: Owner, db: DB, photo: Annotated[UploadFile, File()]
) -> dict:
    _get_job(db, job_id)
    count = db.scalar(
        select(func.count()).select_from(WorkshopJobPhoto).where(WorkshopJobPhoto.job_id == job_id)
    )
    if count is not None and count >= 5:
        raise HTTPException(status_code=422, detail="Maximum five private photos per job")
    data = await photo.read(MAX_PHOTO + 1)
    mime = _photo_type(data)
    if not data or len(data) > MAX_PHOTO or mime is None:
        raise HTTPException(status_code=422, detail="Upload PNG, JPEG or WebP up to 2 MB")
    record = WorkshopJobPhoto(job_id=job_id, photo_bytes=data, mime_type=mime)
    db.add(record)
    db.flush()
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="workshop.job.photo.added",
        object_type="workshop_job",
        object_id=str(job_id),
        action="upload",
        arguments={"photo_id": record.id, "bytes": len(data)},
        result={"ok": True, "private": True},
    )
    db.commit()
    return {"id": record.id, "mime_type": mime, "private_local": True}


@router.get("/{job_id}/photos/{photo_id}")
def get_photo(job_id: int, photo_id: int, db: DB) -> Response:
    _get_job(db, job_id)
    photo = db.get(WorkshopJobPhoto, photo_id)
    if photo is None or photo.job_id != job_id:
        raise HTTPException(status_code=404, detail="Photo not found")
    return Response(
        content=photo.photo_bytes,
        media_type=photo.mime_type,
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )


@router.delete("/{job_id}/photos/{photo_id}", status_code=204)
def remove_photo(job_id: int, photo_id: int, actor: Owner, db: DB) -> Response:
    _get_job(db, job_id)
    photo = db.get(WorkshopJobPhoto, photo_id)
    if photo is None or photo.job_id != job_id:
        raise HTTPException(status_code=404, detail="Photo not found")
    db.delete(photo)
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="workshop.job.photo.removed",
        object_type="workshop_job",
        object_id=str(job_id),
        action="delete",
        arguments={"photo_id": photo_id},
        result={"ok": True},
    )
    db.commit()
    return Response(status_code=204)
