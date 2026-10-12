"""Build 055: bounded source review metadata for private knowledge projects."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import KnowledgeDocument, User

router = APIRouter(prefix="/api/v1/knowledge", tags=["knowledge-review"])
Reviewer = Annotated[User, Depends(require_roles("owner", "administrator"))]
Database = Annotated[Session, Depends(get_session)]
ReviewStatus = Literal["needs_review", "approved", "flagged"]


class ReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: ReviewStatus
    note: str = Field(default="", max_length=500)


class ReviewResponse(BaseModel):
    document_id: int
    status: ReviewStatus
    note: str
    updated_at: str
    reviewed_by_user_id: int | None


def _read_review(document: KnowledgeDocument) -> ReviewResponse | None:
    metadata = document.metadata_json
    if not isinstance(metadata, dict):
        return None
    review = metadata.get("hub_source_review")
    if not isinstance(review, dict) or review.get("status") not in (
        "needs_review", "approved", "flagged"
    ):
        return None
    return ReviewResponse(
        document_id=document.id,
        status=review["status"],
        note=str(review.get("note", ""))[:500],
        updated_at=str(review.get("updated_at", "")),
        reviewed_by_user_id=review.get("reviewed_by_user_id"),
    )


@router.get("/reviews", response_model=list[ReviewResponse])
def list_reviews(
    _actor: Reviewer,
    db: Database,
    limit: int = Query(default=100, ge=1, le=100),
) -> list[ReviewResponse]:
    """Private review notes; readers without review privileges see source metadata only."""
    items = db.scalars(
        select(KnowledgeDocument).order_by(KnowledgeDocument.id.desc()).limit(limit)
    ).all()
    return [review for item in items if (review := _read_review(item)) is not None]


@router.patch("/documents/{document_id}/review", response_model=ReviewResponse)
def review_document(
    document_id: int,
    body: ReviewRequest,
    actor: Reviewer,
    db: Database,
) -> ReviewResponse:
    document = db.get(KnowledgeDocument, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Knowledge source not found.")
    if "\x00" in body.note:
        raise HTTPException(status_code=422, detail="Review note contains invalid characters.")

    metadata = dict(document.metadata_json) if isinstance(document.metadata_json, dict) else {}
    metadata["hub_source_review"] = {
        "status": body.status,
        "note": body.note.strip(),
        "updated_at": datetime.now(UTC).isoformat(),
        "reviewed_by_user_id": actor.id,
    }
    document.metadata_json = metadata
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="knowledge.source.reviewed",
        object_type="knowledge_document",
        object_id=str(document.id),
        action="review",
        arguments={"status": body.status},
        result={"ok": True},
    )
    db.commit()
    db.refresh(document)
    return _read_review(document)
