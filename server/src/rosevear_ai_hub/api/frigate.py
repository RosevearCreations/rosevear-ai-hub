"""Authenticated read-only Frigate adapter API for Build 034."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.integrations.frigate import (
    FrigateError,
    FrigateEvent,
    get_frigate_client,
)
from rosevear_ai_hub.models import User

router = APIRouter(prefix="/api/v1/frigate", tags=["frigate"])

FrigateViewer = Annotated[
    User,
    Depends(require_roles("owner", "administrator", "household_user", "read_only")),
]


class FrigateStatusResponse(BaseModel):
    configured: bool
    online: bool
    version: str | None
    base_url: str
    local_only: bool
    error: str | None


class FrigateCameraResponse(BaseModel):
    name: str
    enabled: bool
    detect_enabled: bool
    record_enabled: bool
    snapshots_enabled: bool


class FrigateCamerasResponse(BaseModel):
    online: bool
    cameras: list[FrigateCameraResponse]
    error: str | None


class FrigateEventResponse(BaseModel):
    event_id: str
    camera: str
    label: str
    sub_label: str | None
    start_time: float
    end_time: float | None
    zones: list[str]
    has_clip: bool
    has_snapshot: bool
    false_positive: bool
    score: float | None


class FrigateEventsResponse(BaseModel):
    online: bool
    events: list[FrigateEventResponse]
    error: str | None


def _event_response(event: FrigateEvent) -> FrigateEventResponse:
    return FrigateEventResponse(
        event_id=event.event_id,
        camera=event.camera,
        label=event.label,
        sub_label=event.sub_label,
        start_time=event.start_time,
        end_time=event.end_time,
        zones=list(event.zones),
        has_clip=event.has_clip,
        has_snapshot=event.has_snapshot,
        false_positive=event.false_positive,
        score=event.score,
    )


@router.get("/status", response_model=FrigateStatusResponse)
def frigate_status(_actor: FrigateViewer) -> FrigateStatusResponse:
    settings = get_settings()
    try:
        status = get_frigate_client().status()
        return FrigateStatusResponse(
            configured=bool(settings.frigate_base_url),
            online=status.online,
            version=status.version,
            base_url=status.base_url,
            local_only=status.local_only,
            error=None,
        )
    except FrigateError as exc:
        return FrigateStatusResponse(
            configured=bool(settings.frigate_base_url),
            online=False,
            version=None,
            base_url=settings.frigate_base_url,
            local_only=settings.frigate_base_url.startswith(
                ("http://127.0.0.1", "http://localhost", "http://[::1]")
            ),
            error=str(exc),
        )


@router.get("/cameras", response_model=FrigateCamerasResponse)
def frigate_cameras(_actor: FrigateViewer) -> FrigateCamerasResponse:
    try:
        cameras = get_frigate_client().cameras()
        return FrigateCamerasResponse(
            online=True,
            cameras=[
                FrigateCameraResponse(
                    name=item.name,
                    enabled=item.enabled,
                    detect_enabled=item.detect_enabled,
                    record_enabled=item.record_enabled,
                    snapshots_enabled=item.snapshots_enabled,
                )
                for item in cameras
            ],
            error=None,
        )
    except FrigateError as exc:
        return FrigateCamerasResponse(online=False, cameras=[], error=str(exc))


@router.get("/events", response_model=FrigateEventsResponse)
def frigate_events(
    _actor: FrigateViewer,
    limit: int = Query(default=20, ge=1, le=100),
) -> FrigateEventsResponse:
    try:
        events = get_frigate_client().recent_events(limit=limit)
        return FrigateEventsResponse(
            online=True,
            events=[_event_response(item) for item in events],
            error=None,
        )
    except FrigateError as exc:
        return FrigateEventsResponse(online=False, events=[], error=str(exc))
