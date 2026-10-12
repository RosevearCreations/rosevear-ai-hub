"""Local camera event review notes. Never proxies recordings or RTSP data."""

from __future__ import annotations

import csv
import io
import re
from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.integrations.frigate import FrigateError, get_frigate_client
from rosevear_ai_hub.models import CameraEventReview, User

router = APIRouter(prefix="/api/v1/frigate", tags=["frigate-reviews"])
Editor = Annotated[User, Depends(require_roles("owner", "administrator"))]
Database = Annotated[Session, Depends(get_session)]
ReviewStatus = Literal["needs_review", "reviewed", "flagged"]
EVENT_ID_PATTERN = r"^[A-Za-z0-9_.:-]{1,160}$"


class ReviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    review_status: ReviewStatus
    note: str = Field(default="", max_length=500)


class ReviewOutput(BaseModel):
    event_id: str
    camera_name: str
    object_label: str
    event_start_time: float
    review_status: ReviewStatus
    note: str
    reviewed_by_user_id: int | None
    updated_at: datetime


def _output(item: CameraEventReview) -> ReviewOutput:
    return ReviewOutput(
        event_id=item.event_id,
        camera_name=item.camera_name,
        object_label=item.object_label,
        event_start_time=item.event_start_time,
        review_status=item.review_status,
        note=item.note,
        reviewed_by_user_id=item.reviewed_by_user_id,
        updated_at=item.updated_at,
    )


def _recent(db: Session, limit: int) -> list[CameraEventReview]:
    return list(
        db.scalars(
            select(CameraEventReview)
            .order_by(CameraEventReview.event_start_time.desc(), CameraEventReview.id.desc())
            .limit(limit)
        ).all()
    )


@router.get("/reviews", response_model=list[ReviewOutput])
def list_event_reviews(
    _actor: Editor,
    db: Database,
    limit: int = Query(default=100, ge=1, le=100),
) -> list[ReviewOutput]:
    """Local saved review index works even when Frigate is offline."""
    return [_output(item) for item in _recent(db, limit)]


@router.put("/events/{event_id}/review", response_model=ReviewOutput)
def upsert_event_review(
    payload: ReviewInput,
    actor: Editor,
    db: Database,
    event_id: str = Path(pattern=EVENT_ID_PATTERN),
) -> ReviewOutput:
    """Verify event exists in Frigate's bounded recent set before local annotation."""
    if "\x00" in payload.note:
        raise HTTPException(status_code=422, detail="Note contains invalid characters.")
    try:
        matched = next(
            (item for item in get_frigate_client().recent_events(limit=100)
             if item.event_id == event_id),
            None,
        )
    except FrigateError as exc:
        raise HTTPException(status_code=503, detail="Frigate unavailable for review.") from exc
    if matched is None:
        raise HTTPException(
            status_code=404, detail="Event not in recent Frigate results; no review saved."
        )
    entry = db.scalar(select(CameraEventReview).where(CameraEventReview.event_id == event_id))
    if entry is None:
        entry = CameraEventReview(
            event_id=event_id,
            camera_name=matched.camera[:160],
            object_label=matched.label[:100],
            event_start_time=matched.start_time,
            review_status=payload.review_status,
            note=payload.note,
            reviewed_by_user_id=actor.id,
        )
        db.add(entry)
    else:
        entry.camera_name = matched.camera[:160]
        entry.object_label = matched.label[:100]
        entry.event_start_time = matched.start_time
        entry.review_status = payload.review_status
        entry.note = payload.note
        entry.reviewed_by_user_id = actor.id
    # Keep notes and RTSP data OUT of audit events; audit actor and status only.
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="camera.event.review_saved",
        object_type="frigate_event",
        object_id=event_id,
        action="review",
        arguments={"review_status": payload.review_status},
        result={"ok": True},
    )
    db.commit()
    db.refresh(entry)
    return _output(entry)


def _csv_cell(value: object) -> str:
    """Prevent spreadsheet formula injection from user notes or provider labels."""
    text = str(value).replace("\x00", "")
    if re.match(r"^\s*[=+@\-\t\r\n]", text):
        return "'" + text
    return text


@router.get("/reviews/export.csv")
def export_review_metadata(
    _actor: Editor,
    db: Database,
    acknowledgement: str = Query(default="", max_length=64),
) -> Response:
    """Opt-in, role-gated, metadata-only local CSV. No camera media or source addresses."""
    if acknowledgement != "PRIVATE_METADATA_ONLY":
        raise HTTPException(
            status_code=400,
            detail="Acknowledge private metadata export before downloading.",
        )
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(["event_id", "camera", "label", "start_epoch", "review_status", "note"])
    for item in _recent(db, 100):
        writer.writerow(
            [_csv_cell(value) for value in (
                item.event_id, item.camera_name, item.object_label,
                item.event_start_time, item.review_status, item.note,
            )]
        )
    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="hub-camera-event-reviews.csv"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
