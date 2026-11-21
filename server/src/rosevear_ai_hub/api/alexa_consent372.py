"""Build 372: owner-reviewed Alexa exposure reconciliation, without provider writes.

Reads Home Assistant's official Alexa exposure registry; stores only local owner
intent and audit evidence. Nothing links Amazon, records speech or turns on devices.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
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
from rosevear_ai_hub.models import AlexaConsent372, AuditEvent, User

router = APIRouter(prefix="/api/v1/alexa-consent-372", tags=["alexa-consent"])
Owner = Annotated[User, Depends(require_roles("owner"))]
DB = Annotated[Session, Depends(get_session)]
Decision = Literal["approved", "revoked"]
IDENTITY = re.compile(r"^light\.[a-z0-9_]{1,120}$")
DANGEROUS = re.compile(
    r"(?:^|[^a-z0-9])(?:lock|alarm|door|garage|gate|camera|security|"
    r"laser|kiln|forge|furnace|heater|heating|printer|cnc|spindle|"
    r"motor|smoke|fire|emergency|medical|oxygen|compressor|pump|"
    r"workshop|power|relay|socket|outlet|saw|oven|stove|"
    r"dryer|vent|fan|hazard)(?:$|[^a-z0-9])",
    re.I,
)
MAX_ENTITIES = 1800


class ReviewIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    entity_id: str = Field(min_length=7, max_length=127)
    decision: Decision
    expected_revision: int = Field(ge=0)
    owner_confirmed: bool = False


def _eligible(item: dict, device_names: dict[str, str]) -> tuple[bool, str]:
    entity_id = item.get("entity_id")
    if not isinstance(entity_id, str) or not IDENTITY.fullmatch(entity_id):
        return False, "Only explicitly reviewed light entities are eligible."
    if item.get("disabled_by") is not None or item.get("hidden_by") is not None:
        return False, "Hidden or disabled entity."
    device_id = item.get("device_id")
    device_name = device_names.get(device_id, "")
    label = item.get("name") or item.get("original_name") or ""
    if not isinstance(label, str):
        label = ""
    if DANGEROUS.search(" ".join((entity_id.replace("_", " "), label, device_name))):
        return False, "Sensitive or workshop-related identity requires a separate safety review."
    if len(label) > 120 or len(device_name) > 120:
        return False, "Unbounded source label."
    return True, "Owner review permitted; not yet exposed."


def _candidate_registry(registry: dict) -> tuple[list[dict], dict[str, str]]:
    entities = registry.get("entities")
    devices = registry.get("devices")
    if not isinstance(entities, list) or not isinstance(devices, list):
        raise ValueError("Home Assistant registry incomplete.")
    if len(entities) > MAX_ENTITIES or len(devices) > MAX_ENTITIES:
        raise ValueError("Home Assistant registry exceeds bounded Alexa review.")
    names: dict[str, str] = {}
    for device in devices:
        if not isinstance(device, dict):
            raise ValueError("Home Assistant device registry malformed.")
        did = device.get("id")
        if isinstance(did, str) and did:
            name = device.get("name_by_user") or device.get("name") or ""
            names[did] = name if isinstance(name, str) else ""
    checked: set[str] = set()
    for item in entities:
        if not isinstance(item, dict) or not isinstance(item.get("entity_id"), str):
            raise ValueError("Home Assistant entity registry malformed.")
        key = item["entity_id"]
        if key in checked:
            raise ValueError("Duplicate Home Assistant entity ID.")
        checked.add(key)
    return entities, names


def _local_rows(db: Session) -> list[AlexaConsent372]:
    return list(
        db.scalars(select(AlexaConsent372).order_by(AlexaConsent372.entity_id).limit(2000)).all()
    )


def _valid_consent(row: AlexaConsent372, now: datetime) -> bool:
    expiry = row.expires_at
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=UTC)
    return row.decision == "approved" and expiry > now


def _row(row: AlexaConsent372, now: datetime) -> dict:
    valid = _valid_consent(row, now)
    return {
        "entityId": row.entity_id,
        "decision": row.decision,
        "revision": row.revision,
        "reviewedAt": row.reviewed_at.isoformat(),
        "expiresAt": row.expires_at.isoformat(),
        "effectiveApproval": valid,
    }


@router.get("/report")
def local_report(_owner: Owner, db: DB, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    now = datetime.now(UTC)
    return {
        "schema": "rosevear.hub.alexa-consent.v372",
        "status": "HOLD_PROVIDER_NOT_INSPECTED",
        "providerExposureVerified": False,
        "alexaAccountLinked": None,
        "voiceInvocationVerified": False,
        "providerWritesPerformed": 0,
        "consents": [_row(row, now) for row in _local_rows(db)],
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
        registry = await runtime.client.registry_snapshot()
        exposure = await runtime.client.alexa_exposure_report()
        entries, names = _candidate_registry(registry)
    except HomeAssistantError as exc:
        raise HTTPException(status_code=503, detail="HOLD_ALEXA_HA_READBACK_UNAVAILABLE") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="HOLD_UNSAFE_HA_REGISTRY") from exc

    raw = exposure.get("exposed_entities")
    auto = exposure.get("expose_new")
    if not isinstance(raw, dict) or not isinstance(auto, bool) or len(raw) > MAX_ENTITIES:
        raise HTTPException(status_code=503, detail="HOLD_INCOMPLETE_ALEXA_EXPOSURE_READBACK")
    now = datetime.now(UTC)
    consents = {row.entity_id: row for row in _local_rows(db)}
    items = []
    seen = set()
    for item in entries:
        eid = item["entity_id"]
        seen.add(eid)
        allowed, reason = _eligible(item, names)
        local = consents.get(eid)
        permitted = bool(local and _valid_consent(local, now))
        exposed = bool(isinstance(raw.get(eid), dict) and raw[eid].get("cloud.alexa") is True)
        if exposed and (not permitted or not allowed):
            drift = "EXPOSED_WITHOUT_CURRENT_APPROVAL"
        elif permitted and not exposed:
            drift = "REVIEWED_NOT_EXPOSED"
        else:
            drift = "ALIGNED_OR_UNREVIEWED"
        items.append(
            {
                "entityId": eid,
                "name": str(item.get("name") or item.get("original_name") or eid)[:120],
                "areaId": str(item.get("area_id") or "")[:120],
                "eligible": allowed,
                "reason": reason,
                "desiredApproved": permitted,
                "haAlexaExposed": exposed,
                "drift": drift,
                "revision": local.revision if local else 0,
                "expiresAt": local.expires_at.isoformat() if local else None,
            }
        )
    missing = sorted(
        eid
        for eid, details in raw.items()
        if eid not in seen and isinstance(details, dict) and details.get("cloud.alexa") is True
    )
    # Exact HA exposure registry is not evidence of a linked Amazon account or
    # successful Alexa discovery. Only HA's own records were inspected.
    return {
        "schema": "rosevear.hub.alexa-consent.v372",
        "status": "HA_SETTINGS_READBACK_ONLY",
        "providerExposureVerified": True,
        "alexaAccountLinked": None,
        "voiceInvocationVerified": False,
        "providerWritesPerformed": 0,
        "checkedAt": now.isoformat(),
        "automaticExposureEnabled": auto,
        "items": items,
        "exposedWithoutInventory": missing[:100],
        "driftCount": sum(x["drift"] == "EXPOSED_WITHOUT_CURRENT_APPROVAL" for x in items)
        + len(missing),
        "readbackCount": len(items),
    }


@router.put("/review")
async def review(
    payload: ReviewIn,
    actor: Owner,
    db: DB,
    runtime: HomeAssistantRuntimeDependency,
) -> dict:
    if not payload.owner_confirmed:
        raise HTTPException(status_code=422, detail="Exact owner consent required.")
    existing = db.scalar(
        select(AlexaConsent372).where(AlexaConsent372.entity_id == payload.entity_id)
    )
    if (existing.revision if existing else 0) != payload.expected_revision:
        raise HTTPException(status_code=409, detail="Review changed; refresh before saving.")
    if payload.decision == "approved":
        if runtime.client is None:
            raise HTTPException(status_code=503, detail="Home Assistant not configured.")
        try:
            registry = await runtime.client.registry_snapshot()
            entries, names = _candidate_registry(registry)
        except HomeAssistantError as exc:
            raise HTTPException(
                status_code=503, detail="Home Assistant source unavailable."
            ) from exc
        except ValueError as exc:
            raise HTTPException(
                status_code=422, detail="Home Assistant source incomplete."
            ) from exc
        item = next((x for x in entries if x.get("entity_id") == payload.entity_id), None)
        if item is None:
            raise HTTPException(status_code=409, detail="Entity absent from live HA registry.")
        allowed, reason = _eligible(item, names)
        if not allowed:
            raise HTTPException(status_code=422, detail=reason)
        if len(_local_rows(db)) >= 500 and existing is None:
            raise HTTPException(status_code=409, detail="Owner consent registry limit reached.")
    elif existing is None:
        raise HTTPException(status_code=404, detail="No local approval to revoke.")
    now = datetime.now(UTC)
    if existing is None:
        existing = AlexaConsent372(entity_id=payload.entity_id, revision=0)
        db.add(existing)
    existing.decision = payload.decision
    existing.revision += 1
    existing.reviewed_by_user_id = actor.id
    existing.reviewed_at = now
    existing.expires_at = now + timedelta(days=30) if payload.decision == "approved" else now
    db.flush()
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="alexa372.consent.reviewed",
        object_type="alexa_consent",
        object_id=existing.entity_id,
        action=payload.decision,
        arguments={"entity_id": existing.entity_id, "revision": existing.revision},
        result={"ok": True, "provider_mutated": False, "speech_captured": False},
    )
    db.commit()
    return {
        "entityId": existing.entity_id,
        "decision": existing.decision,
        "revision": existing.revision,
        "expiresAt": existing.expires_at.isoformat(),
        "providerWritesPerformed": 0,
        "manualHomeAssistantStepRequired": True,
    }


@router.get("/audit")
def audit(_owner: Owner, db: DB, response: Response) -> dict:
    response.headers["Cache-Control"] = "no-store"
    events = db.scalars(
        select(AuditEvent)
        .where(AuditEvent.event_type == "alexa372.consent.reviewed")
        .order_by(AuditEvent.id.desc())
        .limit(50)
    ).all()
    return {
        "type": "OWNER_CONSENT_AUDIT_NOT_VOICE_TRANSCRIPTS",
        "events": [
            {
                "entityId": event.object_id,
                "decision": event.action,
                "at": event.created_at.isoformat(),
                "actorId": event.actor_user_id,
            }
            for event in events
        ],
    }
