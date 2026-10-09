"""Authenticated camera registry, ONVIF discovery, and RTSP/go2rtc transport."""

from __future__ import annotations

import ipaddress
from datetime import UTC, datetime
from typing import Annotated
from urllib.parse import quote, urlparse

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.integrations.go2rtc import (
    Go2RTCError,
    Go2RTCUnavailable,
    get_go2rtc_client,
)
from rosevear_ai_hub.integrations.onvif import DiscoveredONVIFDevice, discover_onvif_devices
from rosevear_ai_hub.models import Camera, CameraStream, User
from rosevear_ai_hub.secrets import decrypt_scoped_value, encrypt_scoped_value

router = APIRouter(prefix="/api/v1/cameras", tags=["cameras"])

CameraViewer = Annotated[
    User,
    Depends(require_roles("owner", "administrator", "household_user", "read_only")),
]
CameraAdmin = Annotated[User, Depends(require_roles("owner", "administrator"))]
SessionDependency = Annotated[Session, Depends(get_session)]


class CameraStreamResponse(BaseModel):
    id: int
    stream_name: str
    source_scheme: str
    source_host: str
    source_port: int
    credentials_present: bool
    enabled: bool
    encrypted: bool = True
    relay_url: str
    last_sync_at: datetime | None
    last_probe_at: datetime | None
    last_probe_status: str | None
    last_error: str | None
    created_at: datetime
    updated_at: datetime


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
    stream: CameraStreamResponse | None = None


class CameraDiscoveryResponse(BaseModel):
    discovered: int
    created: int
    updated: int
    cameras: list[CameraResponse]


class CameraUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=160)
    enabled: bool | None = None


class CameraStreamConfigureRequest(BaseModel):
    source_url: str = Field(min_length=10, max_length=4096)


class CameraStreamMutationResponse(BaseModel):
    stream: CameraStreamResponse
    synced: bool
    message: str


class CameraStreamProbeResponse(BaseModel):
    camera_id: int
    stream_name: str
    status: str
    producer_count: int
    consumer_count: int
    probed_at: datetime


class CameraStreamDeleteResponse(BaseModel):
    deleted: bool
    go2rtc_removed: bool


class Go2RTCStatusResponse(BaseModel):
    configured: bool
    online: bool
    version: str | None
    api_base_url: str
    rtsp_listen: str | None
    local_api_only: bool
    local_rtsp_only: bool
    error: str | None


class Go2RTCReconcileResponse(BaseModel):
    configured: int
    synchronized: int
    failed: int
    skipped: int


class CameraHealthItem(BaseModel):
    camera_id: int
    display_name: str
    enabled: bool
    configured: bool
    health: str
    last_seen_at: datetime
    last_probe_at: datetime | None
    last_probe_status: str | None
    last_error: str | None
    source_host: str | None
    stream_name: str | None
    viewer_url: str | None


class CameraDashboardResponse(BaseModel):
    generated_at: datetime
    stale_after_seconds: int
    transport_online: bool
    transport_version: str | None
    total: int
    enabled: int
    configured: int
    healthy: int
    attention: int
    cameras: list[CameraHealthItem]


class CameraHealthRefreshResponse(BaseModel):
    checked: int
    healthy: int
    failed: int
    skipped: int
    cameras: list[CameraHealthItem]


def _scope(camera_id: int) -> str:
    return f"camera.stream.{camera_id}"


def _relay_url(stream_name: str) -> str:
    base = get_settings().go2rtc_rtsp_base_url.rstrip("/")
    return f"{base}/{stream_name}"


def _viewer_url(stream_name: str) -> str | None:
    try:
        base = get_go2rtc_client().base_url
    except Go2RTCError:
        return None
    source = quote(stream_name, safe="")
    return f"{base}/stream.html?src={source}&mode=webrtc,mse,hls,mjpeg"


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def _health_status(camera: Camera, stream: CameraStream | None, now: datetime) -> str:
    if not camera.enabled:
        return "disabled"
    if stream is None:
        return "unconfigured"
    if not stream.enabled:
        return "disabled"
    if stream.last_probe_status != "online":
        return stream.last_probe_status or "untested"
    probe_at = _aware(stream.last_probe_at)
    if probe_at is None:
        return "untested"
    stale_after = get_settings().camera_health_stale_seconds
    if (now - probe_at).total_seconds() > stale_after:
        return "stale"
    return "healthy"


def _health_item(
    camera: Camera,
    stream: CameraStream | None,
    now: datetime,
) -> CameraHealthItem:
    health = _health_status(camera, stream, now)
    return CameraHealthItem(
        camera_id=camera.id,
        display_name=camera.display_name,
        enabled=camera.enabled,
        configured=stream is not None,
        health=health,
        last_seen_at=camera.last_seen_at,
        last_probe_at=stream.last_probe_at if stream is not None else None,
        last_probe_status=stream.last_probe_status if stream is not None else None,
        last_error=stream.last_error if stream is not None else None,
        source_host=stream.source_host if stream is not None else None,
        stream_name=stream.stream_name if stream is not None else None,
        viewer_url=(
            _viewer_url(stream.stream_name)
            if stream is not None and camera.enabled and stream.enabled
            else None
        ),
    )


def _stream_response(stream: CameraStream) -> CameraStreamResponse:
    return CameraStreamResponse(
        id=stream.id,
        stream_name=stream.stream_name,
        source_scheme=stream.source_scheme,
        source_host=stream.source_host,
        source_port=stream.source_port,
        credentials_present=stream.credentials_present,
        enabled=stream.enabled,
        relay_url=_relay_url(stream.stream_name),
        last_sync_at=stream.last_sync_at,
        last_probe_at=stream.last_probe_at,
        last_probe_status=stream.last_probe_status,
        last_error=stream.last_error,
        created_at=stream.created_at,
        updated_at=stream.updated_at,
    )


def _camera_stream_map(db: Session) -> dict[int, CameraStream]:
    return {
        item.camera_id: item
        for item in db.scalars(select(CameraStream).order_by(CameraStream.id.asc())).all()
    }


def _to_response(camera: Camera, stream: CameraStream | None = None) -> CameraResponse:
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
        stream=_stream_response(stream) if stream is not None else None,
    )


def _validate_rtsp_source(value: str) -> tuple[str, str, int, bool]:
    if "\r" in value or "\n" in value:
        raise HTTPException(status_code=422, detail="RTSP source URL contains invalid characters.")
    parsed = urlparse(value)
    if parsed.scheme not in {"rtsp", "rtsps"} or not parsed.hostname:
        raise HTTPException(
            status_code=422,
            detail="Camera stream source must be an rtsp:// or rtsps:// URL.",
        )
    try:
        address = ipaddress.ip_address(parsed.hostname.strip("[]"))
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="Camera stream source host must be a literal local/private IP address.",
        ) from exc
    if not (address.is_private or address.is_link_local or address.is_loopback):
        raise HTTPException(
            status_code=422,
            detail="Camera stream source must remain on private/local networking.",
        )
    try:
        port = parsed.port or (322 if parsed.scheme == "rtsps" else 554)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="Camera stream source port is invalid.",
        ) from exc
    if not 1 <= port <= 65535:
        raise HTTPException(status_code=422, detail="Camera stream source port is invalid.")
    return parsed.scheme, parsed.hostname, port, bool(parsed.username or parsed.password)


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
        old_host = camera.host
        camera.host = device.host
        camera.port = device.port
        camera.service_url = device.service_url
        camera.onvif_types = list(device.types)
        camera.scopes = list(device.scopes)
        camera.last_seen_at = now
        if camera.display_name == old_host and device.name:
            camera.display_name = device.name
    return camera, created


def _decrypt_source(stream: CameraStream) -> str:
    try:
        return decrypt_scoped_value(
            stream.source_ciphertext,
            scope=_scope(stream.camera_id),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail="Camera stream encryption key is unavailable or cannot decrypt this source.",
        ) from exc


def _sync_stream(stream: CameraStream, source_url: str | None = None) -> bool:
    source_url = source_url or _decrypt_source(stream)
    client = get_go2rtc_client()
    client.patch_runtime_source(stream.stream_name, source_url)
    stream.last_sync_at = datetime.now(UTC)
    stream.last_error = None
    return True


@router.get("", response_model=list[CameraResponse])
def list_cameras(
    _actor: CameraViewer,
    db: SessionDependency,
) -> list[CameraResponse]:
    cameras = db.scalars(select(Camera).order_by(Camera.display_name.asc(), Camera.id.asc())).all()
    streams = _camera_stream_map(db)
    return [_to_response(item, streams.get(item.id)) for item in cameras]


@router.get("/go2rtc/status", response_model=Go2RTCStatusResponse)
def go2rtc_status(_actor: CameraViewer) -> Go2RTCStatusResponse:
    settings = get_settings()
    try:
        status = get_go2rtc_client().status()
        return Go2RTCStatusResponse(
            configured=True,
            online=status.online,
            version=status.version,
            api_base_url=status.api_base_url,
            rtsp_listen=status.rtsp_listen,
            local_api_only=status.local_api_only,
            local_rtsp_only=status.local_rtsp_only,
            error=None,
        )
    except Go2RTCError as exc:
        return Go2RTCStatusResponse(
            configured=bool(settings.go2rtc_base_url),
            online=False,
            version=None,
            api_base_url=settings.go2rtc_base_url,
            rtsp_listen=None,
            local_api_only=settings.go2rtc_base_url.startswith(
                ("http://127.0.0.1", "http://localhost", "http://[::1]")
            ),
            local_rtsp_only=False,
            error=str(exc),
        )


@router.get("/dashboard", response_model=CameraDashboardResponse)
def camera_dashboard(
    _actor: CameraViewer,
    db: SessionDependency,
) -> CameraDashboardResponse:
    now = datetime.now(UTC)
    cameras = db.scalars(select(Camera).order_by(Camera.display_name.asc(), Camera.id.asc())).all()
    streams = _camera_stream_map(db)
    items = [_health_item(camera, streams.get(camera.id), now) for camera in cameras]

    transport_online = False
    transport_version: str | None = None
    try:
        status = get_go2rtc_client().status()
        transport_online = status.online
        transport_version = status.version
    except Go2RTCError:
        pass

    healthy = sum(item.health == "healthy" for item in items)
    attention = sum(item.enabled and item.health not in {"healthy", "disabled"} for item in items)
    return CameraDashboardResponse(
        generated_at=now,
        stale_after_seconds=get_settings().camera_health_stale_seconds,
        transport_online=transport_online,
        transport_version=transport_version,
        total=len(items),
        enabled=sum(item.enabled for item in items),
        configured=sum(item.configured for item in items),
        healthy=healthy,
        attention=attention,
        cameras=items,
    )


@router.post("/health/refresh", response_model=CameraHealthRefreshResponse)
def refresh_camera_health(
    actor: CameraAdmin,
    db: SessionDependency,
) -> CameraHealthRefreshResponse:
    now = datetime.now(UTC)
    cameras = db.scalars(select(Camera).order_by(Camera.display_name.asc(), Camera.id.asc())).all()
    streams = _camera_stream_map(db)
    checked = 0
    healthy = 0
    failed = 0
    skipped = 0

    try:
        client = get_go2rtc_client()
        client.status()
    except Go2RTCError:
        client = None

    for camera in cameras:
        stream = streams.get(camera.id)
        if stream is None or not camera.enabled or not stream.enabled:
            skipped += 1
            continue

        checked += 1
        if client is None:
            stream.last_probe_at = now
            stream.last_probe_status = "unavailable"
            stream.last_error = "go2rtc_unavailable"
            failed += 1
            continue

        try:
            source_url = _decrypt_source(stream)
            client.patch_runtime_source(stream.stream_name, source_url)
            stream.last_sync_at = now
            probe = client.probe_stream(stream.stream_name)
            stream.last_probe_at = now
            if probe.producer_count > 0:
                stream.last_probe_status = "online"
                stream.last_error = None
                healthy += 1
            else:
                stream.last_probe_status = "no_producer"
                stream.last_error = "no_active_producer"
                failed += 1
        except HTTPException:
            stream.last_probe_at = now
            stream.last_probe_status = "failed"
            stream.last_error = "encrypted_source_unavailable"
            failed += 1
        except Go2RTCError:
            stream.last_probe_at = now
            stream.last_probe_status = "failed"
            stream.last_error = "stream_probe_failed"
            failed += 1

    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="camera.health.refreshed",
        object_type="camera_dashboard",
        object_id=None,
        action="health_refresh",
        arguments={"camera_count": len(cameras)},
        result={
            "ok": failed == 0,
            "checked": checked,
            "healthy": healthy,
            "failed": failed,
            "skipped": skipped,
        },
    )
    db.commit()
    items = [_health_item(camera, streams.get(camera.id), now) for camera in cameras]
    return CameraHealthRefreshResponse(
        checked=checked,
        healthy=healthy,
        failed=failed,
        skipped=skipped,
        cameras=items,
    )


@router.post("/go2rtc/reconcile", response_model=Go2RTCReconcileResponse)
def reconcile_go2rtc(
    actor: CameraAdmin,
    db: SessionDependency,
) -> Go2RTCReconcileResponse:
    try:
        client = get_go2rtc_client()
        client.status()
    except Go2RTCError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    streams = db.scalars(select(CameraStream).order_by(CameraStream.id.asc())).all()
    synchronized = 0
    failed = 0
    skipped = 0
    for stream in streams:
        camera = db.get(Camera, stream.camera_id)
        if camera is None or not camera.enabled or not stream.enabled:
            skipped += 1
            continue
        try:
            source_url = _decrypt_source(stream)
            client.patch_runtime_source(stream.stream_name, source_url)
            stream.last_sync_at = datetime.now(UTC)
            stream.last_error = None
            synchronized += 1
        except HTTPException:
            stream.last_error = "encrypted_source_unavailable"
            failed += 1
        except Go2RTCError:
            stream.last_error = "go2rtc_sync_failed"
            failed += 1

    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="camera.streams.reconciled",
        object_type="camera_stream_registry",
        object_id=None,
        action="reconcile",
        arguments={"configured": len(streams)},
        result={
            "ok": failed == 0,
            "synchronized": synchronized,
            "failed": failed,
            "skipped": skipped,
        },
    )
    db.commit()
    return Go2RTCReconcileResponse(
        configured=len(streams),
        synchronized=synchronized,
        failed=failed,
        skipped=skipped,
    )


@router.post("/discover", response_model=CameraDiscoveryResponse)
def discover_cameras(
    actor: CameraAdmin,
    db: SessionDependency,
) -> CameraDiscoveryResponse:
    try:
        devices = discover_onvif_devices()
    except OSError as exc:
        raise HTTPException(
            status_code=503,
            detail="ONVIF discovery is unavailable on this host.",
        ) from exc

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
    streams = _camera_stream_map(db)
    for camera in cameras:
        db.refresh(camera)

    return CameraDiscoveryResponse(
        discovered=len(devices),
        created=created_count,
        updated=updated_count,
        cameras=[_to_response(item, streams.get(item.id)) for item in cameras],
    )


@router.put("/{camera_id}/stream", response_model=CameraStreamMutationResponse)
def configure_camera_stream(
    camera_id: int,
    payload: CameraStreamConfigureRequest,
    actor: CameraAdmin,
    db: SessionDependency,
) -> CameraStreamMutationResponse:
    camera = db.get(Camera, camera_id)
    if camera is None:
        raise HTTPException(status_code=404, detail="Camera not found.")
    if not camera.enabled:
        raise HTTPException(status_code=409, detail="Enable the camera registry entry first.")

    scheme, host, port, credentials_present = _validate_rtsp_source(payload.source_url)
    try:
        ciphertext, fingerprint = encrypt_scoped_value(
            payload.source_url,
            scope=_scope(camera.id),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail="Encrypted secret storage is locked. Configure SECRET_ENCRYPTION_KEY first.",
        ) from exc

    stream = db.scalar(select(CameraStream).where(CameraStream.camera_id == camera.id))
    if stream is None:
        stream = CameraStream(
            camera_id=camera.id,
            stream_name=f"camera-{camera.id}",
            source_scheme=scheme,
            source_host=host,
            source_port=port,
            credentials_present=credentials_present,
            source_ciphertext=ciphertext,
            key_fingerprint=fingerprint,
            enabled=True,
        )
        db.add(stream)
        db.flush()
        action = "create"
    else:
        stream.source_scheme = scheme
        stream.source_host = host
        stream.source_port = port
        stream.credentials_present = credentials_present
        stream.source_ciphertext = ciphertext
        stream.key_fingerprint = fingerprint
        stream.enabled = True
        action = "rotate"

    synced = False
    message = "Encrypted stream source saved; go2rtc is not currently synchronized."
    try:
        synced = _sync_stream(stream, payload.source_url)
        message = "Encrypted stream source saved and synchronized to go2rtc runtime."
    except Go2RTCError:
        stream.last_error = "go2rtc_unavailable"
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="camera.stream.configured",
        object_type="camera_stream",
        object_id=str(camera.id),
        action=action,
        arguments={
            "camera_id": camera.id,
            "stream_name": stream.stream_name,
            "source_scheme": scheme,
            "source_host": host,
            "source_port": port,
            "credentials_present": credentials_present,
        },
        result={"ok": True, "synced": synced},
    )
    db.commit()
    db.refresh(stream)
    return CameraStreamMutationResponse(
        stream=_stream_response(stream),
        synced=synced,
        message=message,
    )


@router.post("/{camera_id}/stream/probe", response_model=CameraStreamProbeResponse)
def probe_camera_stream(
    camera_id: int,
    actor: CameraAdmin,
    db: SessionDependency,
) -> CameraStreamProbeResponse:
    stream = db.scalar(select(CameraStream).where(CameraStream.camera_id == camera_id))
    if stream is None:
        raise HTTPException(status_code=404, detail="Camera stream is not configured.")
    camera = db.get(Camera, camera_id)
    if camera is None or not camera.enabled or not stream.enabled:
        raise HTTPException(status_code=409, detail="Camera stream is disabled.")

    source_url = _decrypt_source(stream)
    now = datetime.now(UTC)
    try:
        client = get_go2rtc_client()
        client.patch_runtime_source(stream.stream_name, source_url)
        stream.last_sync_at = now
        probe = client.probe_stream(stream.stream_name)
        status = "online" if probe.producer_count > 0 else "no_producer"
        stream.last_probe_status = status
        stream.last_probe_at = now
        stream.last_error = None if status == "online" else "no_active_producer"
    except Go2RTCUnavailable as exc:
        stream.last_probe_status = "unavailable"
        stream.last_probe_at = now
        stream.last_error = "go2rtc_unavailable"
        db.commit()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Go2RTCError as exc:
        stream.last_probe_status = "failed"
        stream.last_probe_at = now
        stream.last_error = "stream_probe_failed"
        db.commit()
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="camera.stream.probed",
        object_type="camera_stream",
        object_id=str(camera_id),
        action="probe",
        arguments={"camera_id": camera_id, "stream_name": stream.stream_name},
        result={
            "ok": status == "online",
            "status": status,
            "producer_count": probe.producer_count,
            "consumer_count": probe.consumer_count,
        },
    )
    db.commit()
    return CameraStreamProbeResponse(
        camera_id=camera_id,
        stream_name=stream.stream_name,
        status=status,
        producer_count=probe.producer_count,
        consumer_count=probe.consumer_count,
        probed_at=now,
    )


@router.delete("/{camera_id}/stream", response_model=CameraStreamDeleteResponse)
def delete_camera_stream(
    camera_id: int,
    actor: CameraAdmin,
    db: SessionDependency,
) -> CameraStreamDeleteResponse:
    stream = db.scalar(select(CameraStream).where(CameraStream.camera_id == camera_id))
    if stream is None:
        return CameraStreamDeleteResponse(deleted=False, go2rtc_removed=False)

    removed = False
    try:
        get_go2rtc_client().delete_stream(stream.stream_name)
        removed = True
    except Go2RTCError:
        removed = False

    stream_name = stream.stream_name
    db.delete(stream)
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="camera.stream.deleted",
        object_type="camera_stream",
        object_id=str(camera_id),
        action="delete",
        arguments={"camera_id": camera_id, "stream_name": stream_name},
        result={"ok": True, "go2rtc_removed": removed},
    )
    db.commit()
    return CameraStreamDeleteResponse(deleted=True, go2rtc_removed=removed)


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
    stream = db.scalar(select(CameraStream).where(CameraStream.camera_id == camera.id))
    return _to_response(camera, stream)
