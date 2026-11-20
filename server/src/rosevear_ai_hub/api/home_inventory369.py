"""Build 369: owner-only, opt-in reconciliation of actual Home Assistant registry reads.

No network scan, MQTT subscription, provider write, pairing or device adoption.
Home Assistant remains authoritative. An absent entry means missing from a
successful registry snapshot, never that a physical device was removed.
"""

from __future__ import annotations

import asyncio
import re
import unicodedata
from datetime import UTC, datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.home_assistant import HomeAssistantRuntimeDependency
from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantError
from rosevear_ai_hub.models import (
    DeviceRegistryAnnotation,
    HomeInventoryChange369,
    HomeInventoryIdentity369,
    HomeInventorySnapshot369,
    User,
)

router = APIRouter(prefix="/api/v1/home-inventory-369", tags=["home-inventory"])
Owner = Annotated[User, Depends(require_roles("owner"))]
DB = Annotated[Session, Depends(get_session)]
Claim = Literal["unclaimed", "claimed", "investigate", "unsupported"]
KINDS = ("ha_device", "ha_entity", "mqtt")
LIMIT = 2500
UNSAFE = re.compile(
    r"https?://|rtsps?://|(?:password|token|secret|credential|api.key)\s*[:=]|[\x00-\x1f\x7f]",
    re.I,
)


class ClaimInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    identity_id: int = Field(gt=0)
    expected_revision: int = Field(ge=1)
    decision: Claim


def _clean(value: Any, *, size: int, required: bool = False) -> str:
    if not isinstance(value, str):
        if required:
            raise ValueError("Invalid registry identity.")
        return ""
    result = value.strip()
    if not result or UNSAFE.search(result) or len(result) > size:
        if required:
            raise ValueError("Unsafe or oversized source identity.")
        return ""
    return result


def _snapshot_entries(
    registry: dict[str, Any],
    states: list[dict[str, Any]],
    mqtt: list[DeviceRegistryAnnotation],
) -> tuple[dict[tuple[str, str], dict[str, str]], dict[str, int]]:
    if not isinstance(registry, dict):
        raise ValueError("Home Assistant registry response was incomplete.")
    raw_areas = registry.get("areas")
    raw_devices = registry.get("devices")
    raw_entities = registry.get("entities")
    if not all(isinstance(rows, list) for rows in (raw_areas, raw_devices, raw_entities)):
        raise ValueError("Home Assistant registry response was incomplete.")
    if not isinstance(states, list):
        raise ValueError("Home Assistant states response was incomplete.")
    if any(len(rows) > LIMIT for rows in (raw_areas, raw_devices, raw_entities, states)):
        raise ValueError("Home Assistant registry exceeded the bounded inventory limit.")
    if len(mqtt) > 250:
        raise ValueError("Too many reviewed MQTT references for one capture.")

    areas: dict[str, str] = {}
    for item in raw_areas:
        if not isinstance(item, dict):
            raise ValueError("Malformed area in registry.")
        key = _clean(item.get("area_id") or item.get("id"), size=120, required=True)
        if key in areas:
            raise ValueError("Duplicate exact Home Assistant area ID.")
        areas[key] = _clean(item.get("name"), size=120) or key

    entities: dict[tuple[str, str], dict[str, str]] = {}
    devices: dict[str, dict[str, str]] = {}
    seen_states: dict[str, str] = {}
    for item in states:
        if not isinstance(item, dict):
            raise ValueError("Malformed Home Assistant state.")
        key = _clean(item.get("entity_id"), size=255, required=True)
        if key in seen_states:
            raise ValueError("Duplicate exact state ID.")
        seen_states[key] = str(item.get("state", "unknown"))[:50]

    for item in raw_devices:
        if not isinstance(item, dict):
            raise ValueError("Malformed device in registry.")
        key = _clean(item.get("id"), size=255, required=True)
        if key in devices:
            raise ValueError("Duplicate exact Home Assistant device ID.")
        area = _clean(item.get("area_id"), size=120)
        name = (
            _clean(item.get("name_by_user"), size=120)
            or _clean(item.get("name"), size=120)
            or key[:120]
        )
        devices[key] = {"name": name, "area": area, "status": "registry_only"}

    for item in raw_entities:
        if not isinstance(item, dict):
            raise ValueError("Malformed entity in registry.")
        key = _clean(item.get("entity_id"), size=255, required=True)
        identity = ("ha_entity", key)
        if identity in entities:
            raise ValueError("Duplicate exact Home Assistant entity ID.")
        device_id = _clean(item.get("device_id"), size=255)
        area = _clean(item.get("area_id"), size=120)
        if not area and device_id in devices:
            area = devices[device_id]["area"]
        state = seen_states.get(key)
        status = (
            "registry_only"
            if state is None
            else "unavailable"
            if state in {"unavailable", "unknown"}
            else "reported"
        )
        entities[identity] = {
            "name": (
                _clean(item.get("name"), size=120)
                or _clean(item.get("original_name"), size=120)
                or key[:120]
            ),
            "area": area,
            "device": device_id,
            "presence": status,
        }

    for entity_id, state in seen_states.items():
        identity = ("ha_entity", entity_id)
        if identity not in entities:
            entities[identity] = {
                "name": entity_id[:120],
                "area": "",
                "device": "",
                "presence": "state_only",
            }
        linked = entities[identity]["device"]
        if linked in devices and state not in {"unknown", "unavailable"}:
            devices[linked]["status"] = "reported"
        elif linked in devices and devices[linked]["status"] == "registry_only":
            devices[linked]["status"] = "unavailable"

    for key, item in devices.items():
        entities[("ha_device", key)] = {
            "name": item["name"],
            "area": item["area"],
            "device": "",
            "presence": item["status"],
        }

    # MQTT references are only existing explicitly reviewed notes. Never
    # subscribe, fetch broker messages or call the topic an active device.
    for item in mqtt:
        if item.source != "mqtt":
            continue
        key = _clean(item.source_id, size=255, required=True)
        if any(ch in key for ch in "#+"):
            raise ValueError("MQTT reference must be one exact topic.")
        identity = ("mqtt", key)
        if identity in entities:
            raise ValueError("Duplicate exact MQTT reference.")
        entities[identity] = {
            "name": _clean(item.alias, size=120) or key[:120],
            "area": _clean(item.room_label, size=120),
            "device": "",
            "presence": "unverified_reference",
        }

    if len(entities) > LIMIT:
        raise ValueError("Bounded inventory item limit exceeded.")
    return entities, {
        "areas": len(areas),
        "devices": len(devices),
        "entities": len([key for key in entities if key[0] == "ha_entity"]),
        "mqttReferences": len([key for key in entities if key[0] == "mqtt"]),
    }


def _flagged_duplicate_names(rows: list[HomeInventoryIdentity369]) -> set[int]:
    names: dict[tuple[str, str, str], list[int]] = {}
    for row in rows:
        if row.presence == "missing_from_registry" or row.source == "mqtt":
            continue
        clean_name = unicodedata.normalize("NFKC", row.name).casefold()
        clean_name = " ".join(re.findall(r"[a-z0-9]+", clean_name))
        if len(clean_name) < 5:
            continue
        # Same-kind duplicate names are ambiguous; different HA device/entity
        # kinds can be linked and should not be counted as separate devices.
        names.setdefault((row.source, row.area_id, clean_name), []).append(row.id)
    return {
        identity for same_name in names.values() if len(same_name) > 1 for identity in same_name
    }


def _report(db: Session) -> dict[str, Any]:
    latest = db.scalar(
        select(HomeInventorySnapshot369).order_by(HomeInventorySnapshot369.id.desc()).limit(1)
    )
    rows = db.scalars(
        select(HomeInventoryIdentity369)
        .order_by(HomeInventoryIdentity369.source, HomeInventoryIdentity369.source_id)
        .limit(LIMIT)
    ).all()
    duplicates = _flagged_duplicate_names(rows)
    changes = db.scalars(
        select(HomeInventoryChange369).order_by(HomeInventoryChange369.id.desc()).limit(80)
    ).all()
    return {
        "schema": "rosevear.hub.home-inventory.v369",
        "mode": "OWNER_INITIATED_READ_ONLY_CAPTURE",
        "physicalDevicesVerified": False,
        "providerWritesPerformed": 0,
        "lastCapture": None
        if latest is None
        else {
            "id": latest.id,
            "capturedAt": latest.captured_at.isoformat(),
            "areaCount": latest.area_count,
            "deviceCount": latest.device_count,
            "entityCount": latest.entity_count,
            "mqttReferenceCount": latest.mqtt_reference_count,
        },
        "counts": {
            "identities": len(rows),
            "unclaimed": sum(row.claim == "unclaimed" for row in rows),
            "missing": sum(row.presence == "missing_from_registry" for row in rows),
            "unavailable": sum(row.presence == "unavailable" for row in rows),
            "duplicateCandidates": len(duplicates),
        },
        "identities": [
            {
                "id": row.id,
                "source": row.source,
                "sourceId": row.source_id,
                "name": row.name,
                "areaId": row.area_id,
                "relatedDeviceId": row.related_device_id,
                "presence": row.presence,
                "claim": row.claim,
                "revision": row.revision,
                "lastSourceSeenAt": row.last_source_seen_at.isoformat()
                if row.last_source_seen_at
                else None,
                "lastCheckedAt": row.last_checked_at.isoformat(),
                "possibleNameDuplicate": row.id in duplicates,
            }
            for row in rows
        ],
        "changes": [
            {
                "kind": row.kind,
                "source": row.source,
                "sourceId": row.source_id,
                "before": row.before_value,
                "after": row.after_value,
                "capturedAt": row.captured_at.isoformat(),
            }
            for row in changes
        ],
    }


@router.get("/report")
def get_report(_owner: Owner, db: DB, response: Response) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    return _report(db)


@router.post("/capture")
async def capture(
    _owner: Owner,
    db: DB,
    runtime: HomeAssistantRuntimeDependency,
) -> dict[str, Any]:
    if runtime.client is None:
        raise HTTPException(status_code=503, detail="Home Assistant not configured.")
    try:
        states, registry = await asyncio.gather(
            runtime.client.states(), runtime.client.registry_snapshot()
        )
    except HomeAssistantError as exc:
        raise HTTPException(status_code=503, detail="Home Assistant snapshot unavailable.") from exc
    mqtt = db.scalars(
        select(DeviceRegistryAnnotation)
        .where(DeviceRegistryAnnotation.source == "mqtt")
        .order_by(DeviceRegistryAnnotation.id)
        .limit(251)
    ).all()
    try:
        entries, counts = _snapshot_entries(registry, states, mqtt)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    old = db.scalars(
        select(HomeInventoryIdentity369).order_by(HomeInventoryIdentity369.id).limit(LIMIT)
    ).all()
    by_id = {(row.source, row.source_id): row for row in old}
    old_ha = sum(row.source != "mqtt" and row.presence != "missing_from_registry" for row in old)
    fresh_ha = sum(key[0] != "mqtt" for key in entries)
    # A faulty/partial registry read must never mark a household absent.
    if old_ha >= 5 and fresh_ha < old_ha / 2:
        raise HTTPException(
            status_code=409,
            detail="Unexpectedly incomplete HA inventory; previous snapshot retained.",
        )
    now = datetime.now(UTC)
    snapshot = HomeInventorySnapshot369(
        captured_at=now,
        captured_by_user_id=_owner.id,
        area_count=counts["areas"],
        device_count=counts["devices"],
        entity_count=counts["entities"],
        mqtt_reference_count=counts["mqttReferences"],
    )
    db.add(snapshot)
    db.flush()

    def event(row: HomeInventoryIdentity369, kind: str, before: str, after: str) -> None:
        db.add(
            HomeInventoryChange369(
                snapshot_id=snapshot.id,
                source=row.source,
                source_id=row.source_id,
                kind=kind,
                before_value=before[:120],
                after_value=after[:120],
                captured_at=now,
            )
        )

    for key, details in sorted(entries.items()):
        row = by_id.get(key)
        if row is None:
            row = HomeInventoryIdentity369(
                source=key[0],
                source_id=key[1],
                name=details["name"],
                area_id=details["area"],
                related_device_id=details["device"],
                presence=details["presence"],
                claim="unclaimed",
                revision=1,
                first_seen_at=now,
                last_source_seen_at=now if key[0] != "mqtt" else None,
                last_checked_at=now,
                last_snapshot_id=snapshot.id,
            )
            db.add(row)
            db.flush()
            event(row, "new_reference", "", row.name)
            continue
        if row.name != details["name"]:
            event(row, "name_changed", row.name, details["name"])
            row.name = details["name"]
        if row.area_id != details["area"]:
            event(row, "area_changed", row.area_id, details["area"])
            row.area_id = details["area"]
        if row.presence == "missing_from_registry":
            event(row, "source_returned", "missing_from_registry", details["presence"])
        row.presence = details["presence"]
        row.related_device_id = details["device"]
        row.last_checked_at = now
        row.last_snapshot_id = snapshot.id
        if key[0] != "mqtt":
            row.last_source_seen_at = now
        row.revision += 1

    for row in old:
        if (row.source, row.source_id) in entries:
            continue
        if row.source == "mqtt":
            # A removed manual reference is not proof of absent hardware.
            row.presence = "unverified_reference"
        elif row.presence != "missing_from_registry":
            event(row, "not_in_registry", row.presence, "missing_from_registry")
            row.presence = "missing_from_registry"
        row.last_checked_at = now
        row.revision += 1

    record_audit_event(
        db,
        actor_user_id=_owner.id,
        event_type="ha369.snapshot.reconciled",
        object_type="home_inventory",
        object_id=str(snapshot.id),
        action="read_only_capture",
        arguments={
            "areaCount": counts["areas"],
            "deviceCount": counts["devices"],
            "entityCount": counts["entities"],
        },
        result={"providerWritesPerformed": 0, "physicalDevicesVerified": False},
    )
    db.commit()
    return _report(db)


@router.put("/claim")
def claim(payload: ClaimInput, _owner: Owner, db: DB) -> dict[str, Any]:
    row = db.get(HomeInventoryIdentity369, payload.identity_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Unknown exact source identity.")
    if row.revision != payload.expected_revision:
        raise HTTPException(status_code=409, detail="Inventory changed; refresh before review.")
    if payload.decision == "claimed" and row.presence == "missing_from_registry":
        raise HTTPException(status_code=409, detail="Cannot claim an absent source reference.")
    row.claim = payload.decision
    row.revision += 1
    record_audit_event(
        db,
        actor_user_id=_owner.id,
        event_type="ha369.identity.reviewed",
        object_type="home_inventory",
        object_id=str(row.id),
        action="review",
        arguments={"source": row.source, "decision": row.claim, "revision": row.revision},
        result={"providerWritesPerformed": 0, "physicalDevicesVerified": False},
    )
    db.commit()
    return _report(db)
