"""Build 374: owner-only SmartThings scoped reads and HA identity comparison."""
from __future__ import annotations

import hashlib
import re
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.home_assistant import HomeAssistantRuntimeDependency
from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantError
from rosevear_ai_hub.integrations.smartthings374 import (
    IDENTITY,
    SmartThingsReadClient,
    SmartThingsReadError,
)
from rosevear_ai_hub.models import SmartThingsCapture374, SmartThingsReview374, User
from rosevear_ai_hub.secrets import delete_stored_secret, resolve_secret

router = APIRouter(prefix="/api/v1/smartthings-374", tags=["smartthings"])
Owner = Annotated[User, Depends(require_roles("owner"))]
DB = Annotated[Session, Depends(get_session)]
Decision = Literal["reviewed", "excluded"]
BAD_LABEL = re.compile(r"(?i)(token|password|credential|secret|https?://|bearer\s)")


class ReviewIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    device_id: str = Field(min_length=1, max_length=128)
    decision: Decision
    expected_revision: int = Field(ge=0)
    owner_confirmed: bool = False


class DisconnectIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    owner_confirmed: bool = False


def get_smartthings_client(db: DB) -> SmartThingsReadClient | None:
    token = resolve_secret(db, "smartthings.read_token")
    return SmartThingsReadClient(token) if token else None


Client = Annotated[SmartThingsReadClient | None, Depends(get_smartthings_client)]


def safe_label(value: object, fallback: str = "") -> str:
    if not isinstance(value, str) or not value or len(value) > 120:
        return fallback
    if BAD_LABEL.search(value) or any(ord(c) < 32 for c in value):
        return fallback
    return value


def reviews(db: Session) -> list[SmartThingsReview374]:
    return list(db.scalars(
        select(SmartThingsReview374).order_by(SmartThingsReview374.device_id).limit(500)
    ).all())


def summarize(data: dict, registry: dict | None, decisions: dict) -> dict:
    if not isinstance(data, dict) or any(
        not isinstance(data.get(key), list) or len(data[key]) > 500
        for key in ("locations", "rooms", "devices")
    ):
        raise ValueError("Incomplete source.")
    locations: dict[str, str] = {}
    for entry in data["locations"]:
        lid = entry.get("locationId")
        if not isinstance(lid, str) or not IDENTITY.fullmatch(lid) or lid in locations:
            raise ValueError("Invalid location.")
        locations[lid] = safe_label(entry.get("name"), "Unnamed location")
    rooms: dict[tuple[str, str], str] = {}
    for entry in data["rooms"]:
        lid = entry.get("sourceLocationId")
        rid = entry.get("roomId")
        if (
            not isinstance(lid, str) or lid not in locations
            or not isinstance(rid, str) or not IDENTITY.fullmatch(rid)
            or (lid, rid) in rooms
        ):
            raise ValueError("Invalid room.")
        rooms[(lid, rid)] = safe_label(entry.get("name"), "Unnamed room")
    ha_ids: dict[str, str] = {}
    ha_names: dict[str, int] = {}
    if registry is not None:
        entities = registry.get("devices")
        if not isinstance(entities, list) or len(entities) > 2500:
            raise ValueError("Incomplete HA inventory.")
        for entry in entities:
            hid = entry.get("id")
            if not isinstance(hid, str) or not IDENTITY.fullmatch(hid):
                raise ValueError("Invalid HA device.")
            name = safe_label(entry.get("name_by_user") or entry.get("name"))
            if name:
                ha_names[name.casefold()] = ha_names.get(name.casefold(), 0) + 1
            identifiers = entry.get("identifiers") or []
            if not isinstance(identifiers, list) or len(identifiers) > 100:
                raise ValueError("Invalid HA identifiers.")
            for pair in identifiers:
                if (
                    isinstance(pair, (list, tuple)) and len(pair) == 2
                    and pair[0] == "smartthings" and isinstance(pair[1], str)
                    and IDENTITY.fullmatch(pair[1])
                ):
                    if pair[1] in ha_ids and ha_ids[pair[1]] != hid:
                        raise ValueError("Conflicting HA identity.")
                    ha_ids[pair[1]] = hid
    out = []
    seen: set[str] = set()
    name_counts: dict[tuple[str, str], int] = {}
    for entry in data["devices"]:
        did = entry.get("deviceId")
        lid = entry.get("locationId")
        rid = entry.get("roomId")
        if (
            not isinstance(did, str) or not IDENTITY.fullmatch(did) or did in seen
            or not isinstance(lid, str) or lid not in locations
            or (rid is not None and (not isinstance(rid, str) or (lid, rid) not in rooms))
        ):
            raise ValueError("Invalid device.")
        seen.add(did)
        name = safe_label(entry.get("label") or entry.get("name"), "Unnamed device")
        key = (lid, name.casefold())
        name_counts[key] = name_counts.get(key, 0) + 1
        review = decisions.get(did)
        out.append({
            "deviceId": did,
            "name": name,
            "locationName": locations[lid],
            "roomName": rooms.get((lid, rid), "Unassigned"),
            "vendorType": safe_label(entry.get("type"), "unknown"),
            "exactHaId": ha_ids.get(did),
            "haNameCandidates": ha_names.get(name.casefold(), 0),
            "localReview": review.decision if review else "unreviewed",
            "revision": review.revision if review else 0,
            "physicalVerified": False,
            "androidTizenVerified": False,
            "_nameKey": key,
        })
    for item in out:
        item["repeatedName"] = name_counts[item.pop("_nameKey")] > 1
    return {
        "devices": sorted(out, key=lambda x: (x["locationName"], x["roomName"], x["name"])),
        "locationCount": len(locations),
        "roomCount": len(rooms),
        "exactHaCount": sum(x["exactHaId"] is not None for x in out),
        "nameOnlyCount": sum(
            x["exactHaId"] is None and x["haNameCandidates"] > 0 for x in out
        ),
        "duplicateNameCount": sum(x["repeatedName"] for x in out),
    }


@router.get("/report")
def report(_owner: Owner, db: DB, client: Client, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    recent = db.scalar(select(SmartThingsCapture374).order_by(
        SmartThingsCapture374.id.desc()
    ).limit(1))
    age = None
    if recent is not None:
        stamp = recent.checked_at
        if stamp.tzinfo is None:
            stamp = stamp.replace(tzinfo=UTC)
        age = max(0, int((datetime.now(UTC) - stamp).total_seconds()))
    return {
        "schema": "rosevear.hub.smartthings.v374",
        "configured": client is not None,
        "status": (
            "HOLD_NO_TOKEN" if client is None else
            "HOLD_NOT_INSPECTED" if age is None else
            "STALE" if age > 900 else "RECENT_MANUAL_READ"
        ),
        "lastCheckedAt": recent.checked_at.isoformat() if recent else None,
        "ageSeconds": age,
        "lastDeviceCount": recent.device_count if recent else None,
        "commandsSent": 0,
        "androidTizenVerified": False,
        "oauthAppVerified": False,
        "reviews": [
            {"deviceId": row.device_id, "decision": row.decision,
             "revision": row.revision, "reviewedAt": row.reviewed_at.isoformat()}
            for row in reviews(db)
        ],
    }


@router.post("/inspect")
async def inspect(
    _owner: Owner, db: DB, client: Client,
    runtime: HomeAssistantRuntimeDependency, response: Response,
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    if client is None:
        raise HTTPException(status_code=503, detail="HOLD_NO_TOKEN")
    try:
        data = await client.snapshot()
    except SmartThingsReadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    ha = None
    state = "HOLD_HA_NOT_CONFIGURED"
    if runtime.client is not None:
        try:
            ha = await runtime.client.registry_snapshot()
            state = "HA_REGISTRY_READ_ONLY"
        except HomeAssistantError:
            state = "HOLD_HA_UNAVAILABLE"
    try:
        result = summarize(data, ha, {r.device_id: r for r in reviews(db)})
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="HOLD_INVALID_INVENTORY") from exc
    stamp = datetime.now(UTC)
    ids = sorted(item["deviceId"] for item in result["devices"])
    db.add(SmartThingsCapture374(
        checked_at=stamp, device_count=len(ids),
        location_count=result["locationCount"], room_count=result["roomCount"],
        digest_sha256=hashlib.sha256("\n".join(ids).encode("ascii")).hexdigest(),
    ))
    db.commit()
    return {
        "schema": "rosevear.hub.smartthings.v374",
        "status": "PROVIDER_READ_ONLY_NOT_FIELD_CERTIFIED",
        "checkedAt": stamp.isoformat(),
        "haState": state,
        "deviceCount": len(ids),
        "commandsSent": 0,
        "androidTizenVerified": False,
        "oauthAppVerified": False,
        **result,
    }


@router.put("/review")
async def review(payload: ReviewIn, actor: Owner, db: DB, client: Client) -> dict:
    if not payload.owner_confirmed or not IDENTITY.fullmatch(payload.device_id):
        raise HTTPException(status_code=422, detail="Exact owner confirmation required.")
    existing = db.scalar(select(SmartThingsReview374).where(
        SmartThingsReview374.device_id == payload.device_id
    ))
    if (existing.revision if existing else 0) != payload.expected_revision:
        raise HTTPException(status_code=409, detail="Revision changed; refresh.")
    if payload.decision == "reviewed":
        if client is None:
            raise HTTPException(status_code=503, detail="HOLD_NO_TOKEN")
        try:
            data = await client.snapshot()
            ids = {x["deviceId"] for x in summarize(data, None, {})["devices"]}
        except (SmartThingsReadError, ValueError) as exc:
            raise HTTPException(status_code=503, detail="HOLD_SOURCE_RECHECK_FAILED") from exc
        if payload.device_id not in ids:
            raise HTTPException(status_code=409, detail="Device absent from live source.")
        if len(reviews(db)) >= 500 and existing is None:
            raise HTTPException(status_code=409, detail="Review capacity reached.")
    elif existing is None:
        raise HTTPException(status_code=404, detail="No local review to exclude.")
    if existing is None:
        existing = SmartThingsReview374(device_id=payload.device_id, revision=0)
        db.add(existing)
    existing.decision = payload.decision
    existing.revision += 1
    existing.reviewed_by_user_id = actor.id
    existing.reviewed_at = datetime.now(UTC)
    db.flush()
    record_audit_event(
        db, actor_user_id=actor.id,
        event_type="smartthings374.local.review", object_type="smartthings_device",
        object_id=existing.device_id, action=payload.decision,
        arguments={"device_id": existing.device_id, "revision": existing.revision},
        result={"provider_mutated": False, "commands_sent": 0},
    )
    db.commit()
    return {"deviceId": existing.device_id, "decision": existing.decision,
            "revision": existing.revision, "localOnly": True, "commandsSent": 0}


@router.post("/disconnect")
def disconnect(payload: DisconnectIn, actor: Owner, db: DB) -> dict:
    if not payload.owner_confirmed:
        raise HTTPException(status_code=422, detail="Owner confirmation required.")
    deleted = delete_stored_secret(db, actor=actor, secret_key="smartthings.read_token")
    return {"localCredentialDeleted": deleted, "providerTokenRevoked": False,
            "commandsSent": 0, "manualProviderRevocationRequired": True}
