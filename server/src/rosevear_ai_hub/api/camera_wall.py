"""Build 141: authenticated, user-isolated camera wall preferences.

No RTSP addresses, stills, playback URLs, passwords or stream authorization are
stored or returned here. Camera control/transport APIs remain unchanged.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, StrictInt
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import Camera, CameraWallPreference, User

router = APIRouter(prefix="/api/v1/camera-wall", tags=["camera-wall"])
Viewer = Annotated[
    User, Depends(require_roles("owner", "administrator", "household_user", "read_only"))
]
DB = Annotated[Session, Depends(get_session)]


class PreferenceOut(BaseModel):
    favorite_camera_ids: list[int]
    compact: bool
    revision: int


class PreferenceUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    favorite_camera_ids: list[StrictInt] = Field(max_length=24)
    compact: bool
    expected_revision: int = Field(ge=0)


@router.get("/preferences", response_model=PreferenceOut)
def get_preferences(actor: Viewer, db: DB) -> PreferenceOut:
    current = db.get(CameraWallPreference, actor.id)
    if current is None:
        return PreferenceOut(favorite_camera_ids=[], compact=False, revision=0)
    return PreferenceOut(
        favorite_camera_ids=current.favorite_camera_ids,
        compact=current.compact,
        revision=current.revision,
    )


@router.put("/preferences", response_model=PreferenceOut)
def save_preferences(payload: PreferenceUpdate, actor: Viewer, db: DB) -> PreferenceOut:
    ids = payload.favorite_camera_ids
    if any(type(item) is not int or item <= 0 for item in ids) or len(set(ids)) != len(ids):
        raise HTTPException(status_code=422, detail="Use unique registered camera IDs.")
    registered = set(db.scalars(select(Camera.id).where(Camera.id.in_(ids))).all())
    if len(registered) != len(ids):
        raise HTTPException(status_code=422, detail="A selected camera is no longer registered.")
    current = db.get(CameraWallPreference, actor.id)
    if (current.revision if current else 0) != payload.expected_revision:
        raise HTTPException(status_code=409, detail="Preferences changed. Reload before saving.")
    if current is None:
        current = CameraWallPreference(
            user_id=actor.id, favorite_camera_ids=ids, compact=payload.compact, revision=1
        )
        db.add(current)
    else:
        current.favorite_camera_ids = ids
        current.compact = payload.compact
        current.revision += 1
    db.commit()
    return PreferenceOut(
        favorite_camera_ids=current.favorite_camera_ids,
        compact=current.compact,
        revision=current.revision,
    )
