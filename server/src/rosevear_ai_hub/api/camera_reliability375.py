"""Build 375: private, owner-triggered camera and event reliability evidence.

Uses existing ONVIF/go2rtc and localhost Frigate readers only. An event or
a producer probe is not evidence of live moving video or doorbell operation.
"""

from __future__ import annotations

import hashlib
import math
import re
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.cameras import camera_dashboard
from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.integrations.frigate import FrigateError, get_frigate_client
from rosevear_ai_hub.models import (
    Camera,
    CameraEventBinding375,
    CameraReliabilityCapture375,
    User,
)

router = APIRouter(prefix="/api/v1/camera-reliability-375", tags=["camera-reliability"])
Owner = Annotated[User, Depends(require_roles("owner"))]
DB = Annotated[Session, Depends(get_session)]
Role = Literal["camera", "doorbell"]
NAME = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$")
BOUND = 100


class BindingIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    camera_id: int = Field(gt=0)
    frigate_name: str = Field(min_length=1, max_length=96)
    role: Role = "camera"
    active: bool
    expected_revision: int = Field(ge=0)
    owner_confirmed: bool = False


def _bindings(db: Session) -> list[CameraEventBinding375]:
    return list(
        db.scalars(
            select(CameraEventBinding375)
            .order_by(CameraEventBinding375.camera_id)
            .limit(BOUND)
        ).all()
    )


def _public_binding(item: CameraEventBinding375) -> dict:
    return {
        "cameraId": item.camera_id,
        "frigateName": item.frigate_name,
        "role": item.role,
        "active": item.active,
        "revision": item.revision,
        "reviewedAt": item.reviewed_at.isoformat(),
    }


def _captures(db: Session) -> list[CameraReliabilityCapture375]:
    return list(
        db.scalars(
            select(CameraReliabilityCapture375)
            .order_by(CameraReliabilityCapture375.id.desc())
            .limit(20)
        ).all()
    )


def _public_capture(item: CameraReliabilityCapture375) -> dict:
    return {
        "capturedAt": item.checked_at.isoformat(),
        "frigateState": item.frigate_state,
        "transportOnline": item.transport_online,
        "eventReadAvailable": item.event_read_available,
        "registeredCount": item.registered_count,
        "eventCount": item.event_count,
        "invalidEvents": item.invalid_events,
        "metadataDigest": item.metadata_digest,
    }


def _age_seconds(stamp: datetime, now: datetime) -> int:
    aware = stamp if stamp.tzinfo else stamp.replace(tzinfo=UTC)
    return max(0, int((now - aware).total_seconds()))


def _event_health(events: list, known: set[str], now: float) -> dict:
    """Quarantine anomalous metadata; absence of events is not camera failure."""
    accepted = []
    duplicate_ids = set()
    seen = set()
    rejected = 0
    future = 0
    unknown = 0
    invalid_duration = 0
    for item in events[:BOUND]:
        key = item.event_id
        if not isinstance(key, str) or not key or len(key) > 128:
            rejected += 1
            continue
        if key in seen:
            duplicate_ids.add(key)
            rejected += 1
            continue
        seen.add(key)
        start = item.start_time
        end = item.end_time
        if (
            not isinstance(start, (int, float))
            or not math.isfinite(start)
            or start <= 0
            or (end is not None and (
                not isinstance(end, (int, float))
                or not math.isfinite(end)
                or end < start
            ))
        ):
            rejected += 1
            invalid_duration += 1
            continue
        if start > now + 120:
            future += 1
            rejected += 1
            continue
        if item.camera not in known:
            unknown += 1
            rejected += 1
            continue
        accepted.append(item)
    by_camera: dict[str, dict] = {
        name: {"count": 0, "latestEpoch": None, "clipFlags": 0, "snapshotFlags": 0}
        for name in known
    }
    for item in accepted:
        info = by_camera[item.camera]
        info["count"] += 1
        info["latestEpoch"] = max(info["latestEpoch"] or 0, item.start_time)
        info["clipFlags"] += int(item.has_clip)
        info["snapshotFlags"] += int(item.has_snapshot)
    return {
        "accepted": len(accepted),
        "invalid": rejected,
        "duplicateIds": len(duplicate_ids),
        "futureTimestamps": future,
        "invalidDurations": invalid_duration,
        "unknownCameraEvents": unknown,
        "latestEpoch": max((e.start_time for e in accepted), default=None),
        "perCamera": by_camera,
    }


@router.get("/report")
def report(_owner: Owner, db: DB, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    now = datetime.now(UTC)
    observations = _captures(db)
    return {
        "schema": "rosevear.hub.camera-reliability.v375",
        "state": "NO_PRIOR_OBSERVATION" if not observations else (
            "STALE_PREVIOUS_OBSERVATION"
            if _age_seconds(observations[0].checked_at, now) > 600
            else "RECENT_LOCAL_OBSERVATION"
        ),
        "observationAgeSeconds": (
            _age_seconds(observations[0].checked_at, now) if observations else None
        ),
        "fieldVideoVerified": False,
        "doorbellChimeVerified": False,
        "providerWritesPerformed": 0,
        "bindings": [_public_binding(item) for item in _bindings(db)],
        "history": [_public_capture(item) for item in observations],
    }


@router.post("/inspect")
def inspect(actor: Owner, db: DB, response: Response) -> dict:
    """A deliberate bounded read. Does NOT test playback or actuate hardware."""
    response.headers["Cache-Control"] = "no-store"
    now = datetime.now(UTC)
    local = camera_dashboard(actor, db)
    local_status = []
    for item in local.cameras[:BOUND]:
        effective = (
            "transport_unavailable"
            if not local.transport_online and item.health == "healthy"
            else item.health
        )
        local_status.append({
            "cameraId": item.camera_id,
            "name": item.display_name[:160],
            "enabled": item.enabled,
            "streamConfigured": item.configured,
            "probeState": effective,
            "probeAgeSeconds": (
                _age_seconds(item.last_probe_at, now)
                if item.last_probe_at else None
            ),
            "movingVideoVerified": False,
            "audioVerified": False,
        })
    frigate_state = "HOLD_FRIGATE_UNAVAILABLE"
    event_read = False
    configured: dict[str, object] = {}
    events = []
    client = None
    try:
        client = get_frigate_client()
        status = client.status()
        if status.online and status.local_only:
            frigate_state = "LOCAL_API_RESPONDED"
        else:
            frigate_state = "HOLD_UNTRUSTED_FRIGATE"
    except FrigateError:
        pass
    if frigate_state == "LOCAL_API_RESPONDED":
        try:
            cameras = client.cameras()
            if len(cameras) > BOUND:
                frigate_state = "HOLD_FRIGATE_CAMERA_LIMIT"
            elif len({x.name for x in cameras}) != len(cameras) or any(
                NAME.fullmatch(x.name) is None for x in cameras
            ):
                frigate_state = "HOLD_AMBIGUOUS_FRIGATE_IDENTITIES"
            else:
                configured = {item.name: item for item in cameras}
                events = client.recent_events(limit=BOUND)
                event_read = True
        except FrigateError:
            frigate_state = "HOLD_FRIGATE_INVENTORY_OR_EVENTS"
    stats = _event_health(events, set(configured), now.timestamp()) if event_read else None
    source_status = []
    bound = {b.frigate_name: b for b in _bindings(db) if b.active}
    for name, item in sorted(configured.items())[:BOUND]:
        observation = stats["perCamera"][name] if stats is not None else None
        last = observation["latestEpoch"] if observation else None
        if not item.enabled:
            label = "DISABLED_BY_CONFIGURATION"
        elif not item.detect_enabled:
            label = "DETECTION_DISABLED"
        elif not event_read:
            label = "HOLD_EVENT_READ_UNAVAILABLE"
        elif last is None:
            label = "NO_RECENT_EVENTS_NOT_FAILURE"
        elif now.timestamp() - last > 3600:
            label = "QUIET_OR_STALE_EVENTS_NOT_FAILURE"
        else:
            label = "RECENT_EVENT_METADATA_NOT_VIDEO_PROOF"
        link = bound.get(name)
        source_status.append({
            "name": name[:96],
            "enabled": item.enabled,
            "detectEnabled": item.detect_enabled,
            "recordEnabled": item.record_enabled,
            "snapshotsEnabled": item.snapshots_enabled,
            "eventState": label,
            "recentEventCount": observation["count"] if observation else 0,
            "latestEventEpoch": last,
            "clipFlagCount": observation["clipFlags"] if observation else 0,
            "snapshotFlagCount": observation["snapshotFlags"] if observation else 0,
            "ownerBoundCameraId": link.camera_id if link else None,
            "ownerRole": link.role if link else None,
            "movingVideoVerified": False,
            "doorbellChimeVerified": False,
        })
    # The capture contains no household names, stream URLs, tokens or raw events.
    digest_input = (
        f"{local.total}:{len(source_status)}:"
        f"{stats['accepted'] if stats else -1}:"
        f"{stats['invalid'] if stats else -1}"
    )
    digest = hashlib.sha256(digest_input.encode("ascii")).hexdigest()
    record = CameraReliabilityCapture375(
        checked_at=now,
        frigate_state=frigate_state,
        transport_online=local.transport_online,
        event_read_available=event_read,
        registered_count=local.total,
        event_count=stats["accepted"] if stats else 0,
        invalid_events=stats["invalid"] if stats else 0,
        metadata_digest=digest,
    )
    db.add(record)
    db.flush()
    old_ids = list(
        db.scalars(
            select(CameraReliabilityCapture375.id)
            .order_by(CameraReliabilityCapture375.id.desc())
            .offset(20)
        ).all()
    )
    for old_id in old_ids:
        db.delete(db.get(CameraReliabilityCapture375, old_id))
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="camera375.manual_inspection",
        object_type="camera_reliability_receipt",
        object_id=str(record.id),
        action="read_only_inspect",
        arguments={"registered_count": local.total},
        result={"provider_writes": 0, "event_read": event_read},
    )
    db.commit()
    return {
        "schema": "rosevear.hub.camera-reliability.v375",
        "checkedAt": now.isoformat(),
        "state": frigate_state,
        "transportOnline": local.transport_online,
        "registeredCameras": local.total,
        "enabledCameras": local.enabled,
        "sourceCameras": source_status,
        "localCameras": local_status,
        "events": {
            "readAvailable": event_read,
            "accepted": stats["accepted"] if stats else None,
            "invalid": stats["invalid"] if stats else None,
            "duplicateIds": stats["duplicateIds"] if stats else None,
            "futureTimestamps": stats["futureTimestamps"] if stats else None,
            "invalidDurations": stats["invalidDurations"] if stats else None,
            "unknownCameraEvents": stats["unknownCameraEvents"] if stats else None,
        },
        "fieldVideoVerified": False,
        "doorbellChimeVerified": False,
        "providerWritesPerformed": 0,
        "limitations": [
            "go2rtc producer health does not prove moving video or audio.",
            "Frigate event metadata flags do not prove recorded clips can play.",
            "No recent events may simply mean a quiet scene or disabled detection.",
            "Vendor-only doorbells require separate supported provider acceptance.",
        ],
    }


@router.put("/binding")
def bind(payload: BindingIn, actor: Owner, db: DB) -> dict:
    if not payload.owner_confirmed or not NAME.fullmatch(payload.frigate_name):
        raise HTTPException(status_code=422, detail="Exact owner identity confirmation required.")
    cam = db.get(Camera, payload.camera_id)
    if cam is None:
        raise HTTPException(status_code=404, detail="Registered camera not found.")
    existing = db.scalar(
        select(CameraEventBinding375).where(
            CameraEventBinding375.camera_id == payload.camera_id
        )
    )
    if (existing.revision if existing else 0) != payload.expected_revision:
        raise HTTPException(status_code=409, detail="Camera mapping changed.")
    other = db.scalar(
        select(CameraEventBinding375).where(
            CameraEventBinding375.frigate_name == payload.frigate_name,
            CameraEventBinding375.camera_id != payload.camera_id,
        )
    )
    if other is not None:
        raise HTTPException(status_code=409, detail="Frigate source mapped elsewhere.")
    if payload.active:
        if not cam.enabled:
            raise HTTPException(status_code=409, detail="Registered camera is disabled.")
        try:
            sources = get_frigate_client().cameras()
        except FrigateError as exc:
            raise HTTPException(
                status_code=503, detail="HOLD_FRIGATE_MAPPING_RECHECK"
            ) from exc
        if not any(item.name == payload.frigate_name and item.enabled for item in sources):
            raise HTTPException(status_code=409, detail="Frigate source not enabled.")
        if len(_bindings(db)) >= BOUND and existing is None:
            raise HTTPException(status_code=409, detail="Mapping capacity exceeded.")
    elif existing is None:
        raise HTTPException(status_code=404, detail="No mapping to deactivate.")
    if existing is None:
        existing = CameraEventBinding375(
            camera_id=payload.camera_id, revision=0
        )
        db.add(existing)
    elif existing.frigate_name != payload.frigate_name:
        raise HTTPException(status_code=409, detail="Deactivate before renaming mapping.")
    existing.frigate_name = payload.frigate_name
    existing.role = payload.role
    existing.active = payload.active
    existing.revision += 1
    existing.reviewed_by_user_id = actor.id
    existing.reviewed_at = datetime.now(UTC)
    db.flush()
    record_audit_event(
        db, actor_user_id=actor.id,
        event_type="camera375.mapping.local",
        object_type="camera_event_binding",
        object_id=str(existing.camera_id),
        action="activate" if existing.active else "deactivate",
        arguments={"revision": existing.revision, "role": existing.role},
        result={"provider_writes": 0, "device_control": False},
    )
    db.commit()
    return {"mapping": _public_binding(existing), "providerWritesPerformed": 0}
