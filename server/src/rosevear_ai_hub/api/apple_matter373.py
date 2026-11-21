"""Build 373: owner-only Apple/HomeKit/Matter inventory sourced from Home Assistant.

Never reads Apple credentials, HomeKit pairing codes or controller keys. The HA
device/entity registry is not proof that a device is paired to Apple Home.
"""

from __future__ import annotations

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
from rosevear_ai_hub.models import AppleMatterReview373, User

router = APIRouter(prefix="/api/v1/apple-matter-373", tags=["apple-matter"])
Owner = Annotated[User, Depends(require_roles("owner"))]
DB = Annotated[Session, Depends(get_session)]
Decision = Literal["reviewed", "revoked"]
DEVICE_ID = re.compile(r"^[a-zA-Z0-9_-]{1,128}$")
DOMAINS = frozenset({"matter", "homekit_controller", "homekit"})
MAX_ITEMS = 2500


class ReviewIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    device_id: str = Field(min_length=1, max_length=128)
    decision: Decision
    expected_revision: int = Field(ge=0)
    owner_confirmed: bool = False


def _safe_label(value: object, fallback: str) -> str:
    """Never reflect unbounded or credential-looking source labels."""
    if not isinstance(value, str) or len(value) > 120:
        return fallback
    if re.search(r"(?i)(?:token|password|credential|private.key|pairing.code|pin\s*[:=])", value):
        return fallback
    if any(ord(char) < 32 for char in value):
        return fallback
    return value or fallback


def _classified(registry: dict) -> list[dict]:
    """Use HA's provider markers, never infer Apple account state from names."""
    if not isinstance(registry, dict):
        raise ValueError("HA registry not returned.")
    devices = registry.get("devices")
    entities = registry.get("entities")
    areas = registry.get("areas")
    if not all(isinstance(x, list) and len(x) <= MAX_ITEMS for x in (devices, entities, areas)):
        raise ValueError("HA registry incomplete or exceeds safety bound.")
    seen: set[str] = set()
    platforms: dict[str, set[str]] = {}
    for row in entities:
        if not isinstance(row, dict) or not isinstance(row.get("entity_id"), str):
            raise ValueError("Malformed HA entity.")
        did = row.get("device_id")
        platform = row.get("platform")
        if isinstance(did, str) and platform in DOMAINS:
            platforms.setdefault(did, set()).add(platform)
    result: list[dict] = []
    for device in devices:
        if not isinstance(device, dict):
            raise ValueError("Malformed HA device.")
        did = device.get("id")
        if not isinstance(did, str) or not DEVICE_ID.fullmatch(did) or did in seen:
            raise ValueError("Duplicate or invalid HA device identity.")
        seen.add(did)
        markers = set(platforms.get(did, set()))
        identifiers = device.get("identifiers") or []
        if not isinstance(identifiers, list) or len(identifiers) > 100:
            raise ValueError("Malformed HA device provider identifiers.")
        for identity in identifiers:
            if isinstance(identity, (list, tuple)) and len(identity) == 2:
                if isinstance(identity[0], str) and identity[0] in DOMAINS:
                    markers.add(identity[0])
        if not markers:
            continue
        kind = (
            "matter" if "matter" in markers else
            "homekit_device" if "homekit_controller" in markers else
            "homekit_bridge_reference"
        )
        result.append({
            "deviceId": did,
            "name": _safe_label(
                device.get("name_by_user") or device.get("name"),
                "Unnamed HA device",
            ),
            "areaId": _safe_label(device.get("area_id"), ""),
            "kind": kind,
            "sourceDomains": sorted(markers),
            "physicalPairingVerified": False,
            "appleHomeVisibilityVerified": False,
            "ownerReviewIsProviderPairing": False,
        })
    names: dict[str, int] = {}
    for item in result:
        key = item["name"].casefold()
        names[key] = names.get(key, 0) + 1
    for item in result:
        item["possibleDuplicateName"] = names[item["name"].casefold()] > 1
    return sorted(result, key=lambda x: (x["kind"], x["name"], x["deviceId"]))


def _rows(db: Session) -> list[AppleMatterReview373]:
    return list(db.scalars(
        select(AppleMatterReview373).order_by(AppleMatterReview373.device_id).limit(500)
    ).all())


def _local_row(row: AppleMatterReview373) -> dict:
    return {
        "deviceId": row.device_id,
        "decision": row.decision,
        "revision": row.revision,
        "reviewedAt": row.reviewed_at.isoformat(),
    }


@router.get("/report")
def report(_owner: Owner, db: DB, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    return {
        "schema": "rosevear.hub.apple-matter.v373",
        "state": "HOLD_NOT_INSPECTED",
        "haInventoryVerified": False,
        "appleHomeAccountVerified": False,
        "bridgePairingVerified": False,
        "matterCommissioningVerified": False,
        "providerWritesPerformed": 0,
        "reviews": [_local_row(row) for row in _rows(db)],
    }


@router.get("/inspect")
async def inspect(
    _owner: Owner,
    db: DB,
    response: Response,
    runtime: HomeAssistantRuntimeDependency,
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    if runtime.client is None:
        raise HTTPException(status_code=503, detail="HOLD_HOME_ASSISTANT_NOT_CONFIGURED")
    try:
        items = _classified(await runtime.client.registry_snapshot())
    except HomeAssistantError as exc:
        raise HTTPException(status_code=503, detail="HOLD_HA_REGISTRY_UNAVAILABLE") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="HOLD_INCOMPLETE_HA_REGISTRY") from exc
    decisions = {row.device_id: row for row in _rows(db)}
    for item in items:
        review = decisions.get(item["deviceId"])
        item["localReview"] = review.decision if review else "unreviewed"
        item["revision"] = review.revision if review else 0
    return {
        "schema": "rosevear.hub.apple-matter.v373",
        "state": "HA_REGISTRY_ONLY",
        "checkedAt": datetime.now(UTC).isoformat(),
        "haInventoryVerified": True,
        "appleHomeAccountVerified": False,
        "bridgePairingVerified": False,
        "matterCommissioningVerified": False,
        "providerWritesPerformed": 0,
        "count": len(items),
        "possibleDuplicateNames": sum(x["possibleDuplicateName"] for x in items),
        "items": items,
        "limitations": [
            "HA device registry is not Apple Home visibility or pairing proof.",
            "HomeKit Bridge may not register a device; absent does not mean disabled.",
            "Matter controller/Thread border router and iOS permissions require field checks.",
        ],
    }


@router.put("/review")
async def review(
    payload: ReviewIn,
    actor: Owner,
    db: DB,
    runtime: HomeAssistantRuntimeDependency,
) -> dict:
    if not payload.owner_confirmed:
        raise HTTPException(status_code=422, detail="Exact owner confirmation required.")
    if not DEVICE_ID.fullmatch(payload.device_id):
        raise HTTPException(status_code=422, detail="Invalid HA device identity.")
    existing = db.scalar(
        select(AppleMatterReview373).where(AppleMatterReview373.device_id == payload.device_id)
    )
    if (existing.revision if existing else 0) != payload.expected_revision:
        raise HTTPException(status_code=409, detail="Owner review changed; refresh.")
    if payload.decision == "reviewed":
        if runtime.client is None:
            raise HTTPException(status_code=503, detail="HOLD_HOME_ASSISTANT_NOT_CONFIGURED")
        try:
            current = _classified(await runtime.client.registry_snapshot())
        except HomeAssistantError as exc:
            raise HTTPException(status_code=503, detail="HOLD_HA_REGISTRY_UNAVAILABLE") from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="HOLD_INCOMPLETE_HA_REGISTRY") from exc
        if not any(item["deviceId"] == payload.device_id for item in current):
            raise HTTPException(status_code=409, detail="Device not in current supported HA registry.")
        if len(_rows(db)) >= 500 and existing is None:
            raise HTTPException(status_code=409, detail="Review registry full.")
    elif existing is None:
        raise HTTPException(status_code=404, detail="No local review to revoke.")
    if existing is None:
        existing = AppleMatterReview373(device_id=payload.device_id, revision=0)
        db.add(existing)
    existing.decision = payload.decision
    existing.revision += 1
    existing.reviewed_by_user_id = actor.id
    existing.reviewed_at = datetime.now(UTC)
    db.flush()
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="apple373.device.reviewed",
        object_type="apple_matter_review",
        object_id=existing.device_id,
        action=payload.decision,
        arguments={"device_id": existing.device_id, "revision": existing.revision},
        result={"provider_mutated": False, "pairing_attempted": False},
    )
    db.commit()
    return {
        "deviceId": existing.device_id,
        "decision": existing.decision,
        "revision": existing.revision,
        "providerWritesPerformed": 0,
        "manualProviderStepRequired": True,
    }
