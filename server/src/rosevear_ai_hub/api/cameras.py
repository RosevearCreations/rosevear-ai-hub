"""Authenticated camera registry and ONVIF discovery for Build 031."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.integrations.onvif import DiscoveredONVIFDevice, discover_onvif_devices
from rosevear_ai_hub.models import Camera, User

router = APIRouter(prefix="/api/v1/cameras", tags=["cameras"])

CameraViewer = Annotated[
    User,
    Depends(require_roles("owner", "administrator", "household_user", "read_only")),
]
CameraAdmin = Annotated[User, Depends(require_roles("owner", "administrator"))]
SessionDependency = Annotated[Session, Depends(get_session)]


class CameraResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    endpoint_uuid: str
    display_name: str
    host: str
    port: int
    service_url: str
    discovery_source: str
    onvif_types: list[str]
    scopes: list[str]
    enabled: bool
    last_seen_at: datetime
    created_at: datetime
    updated_at: datetime


class CameraDiscoveryResponse(BaseModel):
    discovered: int
    created: int
    updated: int
    cameras: list[CameraResponse]


class CameraUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=160)
    enabled: bool | None = None


def _to_response(camera: Camera) -> CameraResponse:
    return CameraResponse(
        id=camera.id,
        endpoint_uuid=camera.endpoint_uuid,
        display_name=camera.display_name,
        host=camera.host,
        port=camera.port,
        service_url=camera.service_url,
        discovery_source=camera.discovery_source,
        onvif_types=list(camera.onvif_types or []),
        scopes=list(camera.scopes or []),
        enabled=camera.enabled,
        last_seen_at=camera.last_seen_at,
        created_at=camera.created_at,
        updated_at=camera.updated_at,
    )


def _upsert_discovered(
    db: Session,
    device: DiscoveredONVIFDevice,
    now: datetime,
) -> tuple[Camera, bool]:
    camera = db.scalar(select(Camera).where(Camera.endpoint_uuid == device.endpoint_uuid))
    created = camera is None
    if camera is None:
        camera = Camera(
            endpoint_uuid=device.endpoint_uuid,
            display_name=device.name or device.host,
            host=device.host,
            port=device.port,
            service_url=device.service_url,
            discovery_source="onvif_ws_discovery",
            onvif_types=list(device.types),
            scopes=list(device.scopes),
            enabled=True,
            last_seen_at=now,
        )
        db.add(camera)
    else:
        camera.host = device.host
        camera.port = device.port
        camera.service_url = device.service_url
        camera.onvif_types = list(device.types)
        camera.scopes = list(device.scopes)
        camera.last_seen_at = now
        if camera.display_name == camera.host and device.name:
            camera.display_name = device.name
    return camera, created


@router.get("", response_model=list[CameraResponse])
def list_cameras(
    _actor: CameraViewer,
    db: SessionDependency,
) -> list[CameraResponse]:
    cameras = db.scalars(select(Camera).order_by(Camera.display_name.asc(), Camera.id.asc())).all()
    return [_to_response(item) for item in cameras]


@router.post("/discover", response_model=CameraDiscoveryResponse)
def discover_cameras(
    actor: CameraAdmin,
    db: SessionDependency,
) -> CameraDiscoveryResponse:
    try:
        devices = discover_onvif_devices()
    except OSError as exc:
        raise HTTPException(status_code=503, detail="ONVIF discovery is unavailable on this host.") from exc

    now = datetime.now(UTC)
    created_count = 0
    updated_count = 0
    cameras: list[Camera] = []
    for device in devices:
        camera, created = _upsert_discovered(db, device, now)
        cameras.append(camera)
        if created:
            created_count += 1
        else:
            updated_count += 1

    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="camera.discovery.completed",
        object_type="camera_registry",
        object_id=None,
        action="discover",
        arguments={"protocol": "onvif_ws_discovery"},
        result={
            "ok": True,
            "discovered": len(devices),
            "created": created_count,
            "updated": updated_count,
        },
    )
    db.commit()
    for camera in cameras:
        db.refresh(camera)

    return CameraDiscoveryResponse(
        discovered=len(devices),
        created=created_count,
        updated=updated_count,
        cameras=[_to_response(item) for item in cameras],
    )


@router.patch("/{camera_id}", response_model=CameraResponse)
def update_camera(
    camera_id: int,
    payload: CameraUpdateRequest,
    actor: CameraAdmin,
    db: SessionDependency,
) -> CameraResponse:
    camera = db.get(Camera, camera_id)
    if camera is None:
        raise HTTPException(status_code=404, detail="Camera not found.")

    changes: dict[str, object] = {}
    if payload.display_name is not None:
        normalized = payload.display_name.strip()
        if not normalized:
            raise HTTPException(status_code=422, detail="Display name cannot be blank.")
        camera.display_name = normalized
        changes["display_name"] = normalized
    if payload.enabled is not None:
        camera.enabled = payload.enabled
        changes["enabled"] = payload.enabled

    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="camera.registry.updated",
        object_type="camera",
        object_id=str(camera.id),
        action="update",
        arguments=changes,
        result={"ok": True},
    )
    db.commit()
    db.refresh(camera)
    return _to_response(camera)
