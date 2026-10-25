"""Build 140: durable, versioned operator discovery decisions only.

No network scan, pairing, HA adoption, camera registration or MQTT subscription
is possible through these endpoints. Actual camera acceptance retains its
independent one-use ticket and disabled-first policy.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import DeviceDiscoveryReview, User

router = APIRouter(prefix="/api/v1/device-discovery", tags=["device-discovery"])
DB = Annotated[Session, Depends(get_session)]
Viewer = Annotated[
    User, Depends(require_roles("owner", "administrator", "household_user", "read_only"))
]
Reviewer = Annotated[User, Depends(require_roles("owner", "administrator"))]
Source = Literal["ha_device", "ha_entity", "camera_candidate", "mqtt"]
Decision = Literal["approved_for_followup", "rejected", "unsupported", "investigate"]
UNSAFE = re.compile(
    r"https?://|rtsps?://|(?:password|token|secret|api.key)\s*[:=]|[\x00-\x1f\x7f]", re.I
)


class ReviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: Source
    source_id: str = Field(min_length=1, max_length=255)
    decision: Decision
    observed_at: datetime
    expected_revision: int = Field(ge=0)

    @field_validator("source_id")
    @classmethod
    def non_secret_exact_id(cls, value: str) -> str:
        if value != value.strip() or UNSAFE.search(value) or not value.strip():
            raise ValueError("Provide only an exact non-secret provider identity.")
        return value


class ReviewOut(BaseModel):
    source: Source
    source_id: str
    decision: Decision
    revision: int
    observed_at: datetime
    reviewed_at: datetime


def output(item: DeviceDiscoveryReview) -> ReviewOut:
    return ReviewOut(
        source=item.source,
        source_id=item.source_id,
        decision=item.decision,
        revision=item.revision,
        observed_at=item.observed_at,
        reviewed_at=item.reviewed_at,
    )


@router.get("/reviews", response_model=list[ReviewOut])
def get_discovery_reviews(_viewer: Viewer, db: DB) -> list[ReviewOut]:
    rows = db.scalars(
        select(DeviceDiscoveryReview).order_by(DeviceDiscoveryReview.id).limit(500)
    ).all()
    return [output(item) for item in rows]


@router.put("/review", response_model=ReviewOut)
def save_discovery_review(payload: ReviewInput, actor: Reviewer, db: DB) -> ReviewOut:
    if payload.source == "mqtt" and any(char in payload.source_id for char in "+#"):
        raise HTTPException(status_code=422, detail="A reviewed MQTT topic must be exact.")
    now = datetime.now(UTC)
    observed = payload.observed_at
    if observed.tzinfo is None:
        raise HTTPException(status_code=409, detail="Observation requires a timezone.")
    observed = observed.astimezone(UTC)
    if not (now - timedelta(minutes=5) <= observed <= now + timedelta(seconds=30)):
        raise HTTPException(status_code=409, detail="Observation expired; start a fresh review.")
    existing = db.scalar(
        select(DeviceDiscoveryReview).where(
            DeviceDiscoveryReview.source == payload.source,
            DeviceDiscoveryReview.source_id == payload.source_id,
        )
    )
    if (existing.revision if existing else 0) != payload.expected_revision:
        raise HTTPException(status_code=409, detail="Discovery review changed; refresh first.")
    if existing is None:
        existing = DeviceDiscoveryReview(
            source=payload.source, source_id=payload.source_id, revision=1
        )
        db.add(existing)
    else:
        # Even a repeated approval needs a new exact reading, not a replayed consent.
        if (
            existing.decision == payload.decision
            and existing.observed_at.replace(tzinfo=UTC) == observed
        ):
            raise HTTPException(status_code=409, detail="This observation was already reviewed.")
        existing.revision += 1
    existing.decision = payload.decision
    existing.observed_at = observed
    existing.reviewed_at = now
    existing.reviewed_by_user_id = actor.id
    db.flush()
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="device_discovery.review.recorded",
        object_type="device_discovery_review",
        object_id=str(existing.id),
        action="review",
        arguments={
            "source": payload.source,
            "decision": payload.decision,
            "revision": existing.revision,
        },
        result={"ok": True, "provider_mutated": False},
    )
    db.commit()
    db.refresh(existing)
    return output(existing)
