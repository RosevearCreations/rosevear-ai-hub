"""Build 139: source-aware device identity annotations, no hardware mutation.

Owner reviews are local metadata only. A proposed match is never a destructive
merge, pairing, device adoption, MQTT subscription, or provider rename.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import DeviceRegistryAnnotation, DeviceRegistryMatchReview, User

router = APIRouter(prefix="/api/v1/device-registry", tags=["device-registry"])
DB = Annotated[Session, Depends(get_session)]
Viewer = Annotated[
    User, Depends(require_roles("owner", "administrator", "household_user", "read_only"))
]
Reviewer = Annotated[User, Depends(require_roles("owner", "administrator"))]
Source = Literal["ha_device", "ha_entity", "camera", "mqtt"]
Disposition = Literal["reviewed", "needs_investigation", "unsupported"]
MatchDecision = Literal["possible_match", "distinct", "investigate"]

_UNSAFE = re.compile(
    r"https?://|rtsps?://|password\s*[:=]|token\s*[:=]|api.key\s*[:=]|secret\s*[:=]|[\x00-\x1f\x7f]",
    re.I,
)


class Identity(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: Source
    source_id: str = Field(min_length=1, max_length=255)

    @field_validator("source_id")
    @classmethod
    def validate_id(cls, value: str) -> str:
        if value != value.strip() or _UNSAFE.search(value) or len(value.strip()) == 0:
            raise ValueError("Only an exact, non-secret source identity is allowed.")
        return value


class AnnotationInput(Identity):
    alias: str = Field(default="", max_length=100)
    room_label: str = Field(default="", max_length=100)
    disposition: Disposition = "needs_investigation"
    expected_revision: int = Field(default=0, ge=0)

    @field_validator("alias", "room_label")
    @classmethod
    def validate_metadata(cls, value: str) -> str:
        if _UNSAFE.search(value) or len(value.strip()) > 100:
            raise ValueError("Do not enter connection URLs, credentials or control characters.")
        return value.strip()


class AnnotationOut(Identity):
    alias: str
    room_label: str
    disposition: Disposition
    revision: int
    reviewed_at: datetime


class MatchInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    left: Identity
    right: Identity
    decision: MatchDecision
    expected_revision: int = Field(default=0, ge=0)


class MatchOut(BaseModel):
    left: Identity
    right: Identity
    decision: MatchDecision
    revision: int
    reviewed_at: datetime


class ReviewsOut(BaseModel):
    annotations: list[AnnotationOut]
    matches: list[MatchOut]


def _annotation(item: DeviceRegistryAnnotation) -> AnnotationOut:
    return AnnotationOut(
        source=item.source,
        source_id=item.source_id,
        alias=item.alias,
        room_label=item.room_label,
        disposition=item.disposition,
        revision=item.revision,
        reviewed_at=item.reviewed_at,
    )


def _match(item: DeviceRegistryMatchReview) -> MatchOut:
    return MatchOut(
        left=Identity(source=item.left_source, source_id=item.left_id),
        right=Identity(source=item.right_source, source_id=item.right_id),
        decision=item.decision,
        revision=item.revision,
        reviewed_at=item.reviewed_at,
    )


@router.get("/reviews", response_model=ReviewsOut)
def get_reviews(_viewer: Viewer, db: DB) -> ReviewsOut:
    annotations = db.scalars(
        select(DeviceRegistryAnnotation).order_by(DeviceRegistryAnnotation.id).limit(500)
    ).all()
    matches = db.scalars(
        select(DeviceRegistryMatchReview).order_by(DeviceRegistryMatchReview.id).limit(500)
    ).all()
    return ReviewsOut(
        annotations=[_annotation(item) for item in annotations],
        matches=[_match(item) for item in matches],
    )


@router.put("/annotation", response_model=AnnotationOut)
def review_annotation(payload: AnnotationInput, actor: Reviewer, db: DB) -> AnnotationOut:
    if payload.source == "mqtt" and any(character in payload.source_id for character in "#+"):
        raise HTTPException(
            status_code=422,
            detail="MQTT device identity must be one concrete topic, not a wildcard.",
        )
    existing = db.scalar(
        select(DeviceRegistryAnnotation).where(
            DeviceRegistryAnnotation.source == payload.source,
            DeviceRegistryAnnotation.source_id == payload.source_id,
        )
    )
    if (existing.revision if existing else 0) != payload.expected_revision:
        raise HTTPException(
            status_code=409, detail="Review version changed; refresh before saving."
        )
    now = datetime.now(UTC)
    if existing is None:
        existing = DeviceRegistryAnnotation(
            source=payload.source, source_id=payload.source_id, revision=1
        )
        db.add(existing)
    else:
        existing.revision += 1
    existing.alias = payload.alias
    existing.room_label = payload.room_label
    existing.disposition = payload.disposition
    existing.reviewed_at = now
    existing.reviewed_by_user_id = actor.id
    db.flush()
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="device_registry.annotation.reviewed",
        object_type="device_registry_annotation",
        object_id=str(existing.id),
        action="review",
        arguments={"source": payload.source, "revision": existing.revision},
        result={"ok": True, "provider_mutated": False},
    )
    db.commit()
    db.refresh(existing)
    return _annotation(existing)


@router.put("/match-review", response_model=MatchOut)
def review_match(payload: MatchInput, actor: Reviewer, db: DB) -> MatchOut:
    left, right = payload.left, payload.right
    if (left.source, left.source_id) == (right.source, right.source_id):
        raise HTTPException(status_code=422, detail="A source identity cannot match itself.")
    if (right.source, right.source_id) < (left.source, left.source_id):
        left, right = right, left
    existing = db.scalar(
        select(DeviceRegistryMatchReview).where(
            DeviceRegistryMatchReview.left_source == left.source,
            DeviceRegistryMatchReview.left_id == left.source_id,
            DeviceRegistryMatchReview.right_source == right.source,
            DeviceRegistryMatchReview.right_id == right.source_id,
        )
    )
    if (existing.revision if existing else 0) != payload.expected_revision:
        raise HTTPException(status_code=409, detail="Match review changed; refresh before saving.")
    if existing is None:
        existing = DeviceRegistryMatchReview(
            left_source=left.source,
            left_id=left.source_id,
            right_source=right.source,
            right_id=right.source_id,
            revision=1,
        )
        db.add(existing)
    else:
        existing.revision += 1
    existing.decision = payload.decision
    existing.reviewed_at = datetime.now(UTC)
    existing.reviewed_by_user_id = actor.id
    db.flush()
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="device_registry.match.reviewed",
        object_type="device_registry_match",
        object_id=str(existing.id),
        action="review",
        arguments={"decision": payload.decision, "revision": existing.revision},
        result={"ok": True, "identities_merged": False},
    )
    db.commit()
    db.refresh(existing)
    return _match(existing)
