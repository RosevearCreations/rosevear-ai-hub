"""Build 370: signed, read-only Windows workshop gateway receipts.

No COM ports, printers, lasers, cameras, cutters or physical devices are controlled.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Literal

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_roles
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import User, WorkshopGatewayReceipt370

router = APIRouter(prefix="/api/v1/workshop-gateway-370", tags=["workshop-gateway"])
Owner = Annotated[User, Depends(require_roles("owner"))]
DB = Annotated[Session, Depends(get_session)]
Kind = Literal[
    "serial", "printer_queue", "octoprint", "manual_note", "usb_interface", "camera_interface"
]
Presence = Literal["enumerated", "reported_idle", "reported_printing", "unverified"]
Proof = Literal["windows_registry", "octoprint_loopback", "owner_note", "windows_pnp_registry"]
TEXT = re.compile(r"^[A-Za-z0-9 _.,():/-]{1,96}$")


class Device370(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Kind
    device_id: str = Field(min_length=1, max_length=96)
    label: str = Field(min_length=1, max_length=96)
    presence: Presence
    proof: Proof
    port_name: str | None = Field(default=None, pattern=r"^COM[1-9][0-9]{0,3}$")
    progress_percent: float | None = Field(default=None, ge=0, le=100)
    nozzle_c: float | None = Field(default=None, ge=0, le=350)
    bed_c: float | None = Field(default=None, ge=0, le=180)

    @field_validator("device_id", "label")
    @classmethod
    def check_metadata(cls, value: str) -> str:
        if not TEXT.fullmatch(value):
            raise ValueError("Unsafe device identity or metadata.")
        return value


class Payload370(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema: Literal["rosevear.hub.workshop-gateway.v370"]
    collector_id: str = Field(pattern=r"^[A-Za-z0-9_-]{3,40}$")
    observed_at_ms: int = Field(gt=0)
    expires_at_ms: int = Field(gt=0)
    nonce: str = Field(pattern=r"^[a-f0-9]{32}$")
    mode: Literal["READ_ONLY_LOCAL_WINDOWS_OBSERVATION"]
    commands_sent: Literal[0] = 0
    physical_devices_verified: Literal[False] = False
    devices: list[Device370] = Field(max_length=48)


class Envelope370(BaseModel):
    model_config = ConfigDict(extra="forbid")
    payload: Payload370
    signature: str = Field(pattern=r"^[a-f0-9]{128}$")


def canonical370(payload: Payload370) -> bytes:
    return json.dumps(
        payload.model_dump(mode="json", exclude_unset=True),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def trusted_key370() -> Ed25519PublicKey:
    path = Path(os.environ.get("ROSEVEAR_WORKSHOP370_PUBLIC_KEY_PATH") or ".")
    pin = os.environ.get("ROSEVEAR_WORKSHOP370_PUBLIC_KEY_PIN", "").lower()
    if not path.is_absolute() or path.is_symlink() or not re.fullmatch(r"[0-9a-f]{64}", pin):
        raise ValueError("HOLD_WORKSHOP370_INDEPENDENT_PUBLIC_KEY_PIN_REQUIRED")
    try:
        raw = path.read_bytes()
        if len(raw) > 4096:
            raise ValueError("Public key exceeds maximum.")
        key = serialization.load_pem_public_key(raw)
        if not isinstance(key, Ed25519PublicKey):
            raise ValueError("Ed25519 required.")
        public = key.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
        if not hmac.compare_digest(hashlib.sha256(public).hexdigest(), pin):
            raise ValueError("Public key pin mismatch.")
    except (ValueError, OSError) as exc:
        raise ValueError("HOLD_WORKSHOP370_KEY_NOT_TRUSTED") from exc
    return key


def validate370(envelope: Envelope370, now_ms: int) -> Payload370:
    payload = envelope.payload
    if os.environ.get("ROSEVEAR_WORKSHOP370_COLLECTOR_ID") != payload.collector_id:
        raise ValueError("HOLD_WORKSHOP370_COLLECTOR_NOT_ENROLLED")
    if not (
        now_ms - 90000 <= payload.observed_at_ms <= now_ms + 15000
        and payload.observed_at_ms < payload.expires_at_ms <= now_ms + 90000
    ):
        raise ValueError("HOLD_WORKSHOP370_STALE_OR_FUTURE")
    if len(canonical370(payload)) > 13000:
        raise ValueError("HOLD_WORKSHOP370_OVERSIZED_RECEIPT")
    if len({(x.kind, x.device_id) for x in payload.devices}) != len(payload.devices):
        raise ValueError("HOLD_WORKSHOP370_DUPLICATE_DEVICE_ID")
    for device in payload.devices:
        if device.kind == "serial" and not (
            device.proof == "windows_registry"
            and device.presence == "enumerated"
            and re.fullmatch(r"COM[1-9][0-9]{0,3}", device.device_id)
        ):
            raise ValueError("HOLD_WORKSHOP370_BAD_SERIAL_PROVENANCE")
        if device.kind == "printer_queue" and not (
            device.proof == "windows_registry" and device.presence == "enumerated"
        ):
            raise ValueError("HOLD_WORKSHOP370_BAD_QUEUE_PROVENANCE")
        if device.kind == "manual_note" and not (
            device.proof == "owner_note" and device.presence == "unverified"
        ):
            raise ValueError("HOLD_WORKSHOP370_NOT_A_PHYSICAL_DEVICE")
        if device.kind in ("usb_interface", "camera_interface") and not (
            device.proof == "windows_pnp_registry"
            and device.presence == "enumerated"
            and re.fullmatch(r"(usb|camera)-[0-9a-f]{20}", device.device_id)
            and device.device_id.startswith(
                "camera-" if device.kind == "camera_interface" else "usb-"
            )
        ):
            raise ValueError("HOLD_WORKSHOP371_BAD_PNP_PROVENANCE")
        if device.port_name is not None and device.kind not in (
            "usb_interface",
            "camera_interface",
        ):
            raise ValueError("HOLD_WORKSHOP371_PORT_WITHOUT_PNP_PROVENANCE")
        if device.kind == "octoprint" and device.proof != "octoprint_loopback":
            raise ValueError("HOLD_WORKSHOP370_BAD_OCTOPRINT_SOURCE")
        if device.kind != "octoprint" and any(
            v is not None for v in (device.progress_percent, device.nozzle_c, device.bed_c)
        ):
            raise ValueError("HOLD_WORKSHOP370_METRICS_NOT_VERIFIED")
    try:
        trusted_key370().verify(bytes.fromhex(envelope.signature), canonical370(payload))
    except (ValueError, InvalidSignature) as exc:
        raise ValueError("HOLD_WORKSHOP370_SIGNATURE_INVALID") from exc
    return payload


def report370(db: Session, now_ms: int) -> dict[str, object]:
    latest = db.scalar(
        select(WorkshopGatewayReceipt370).order_by(WorkshopGatewayReceipt370.id.desc()).limit(1)
    )
    base: dict[str, object] = {
        "schema": "rosevear.hub.workshop-report.v370",
        "physicalDevicesVerified": False,
        "commandsSent": 0,
    }
    if latest is None:
        return {
            **base,
            "state": "HOLD_NOT_ENROLLED",
            "sourceIsLive": False,
            "receipt": None,
            "devices": [],
        }
    age = max(0, (now_ms - latest.observed_at_ms) // 1000)
    fresh = age <= 300 and now_ms <= latest.expires_at_ms
    return {
        **base,
        "state": "SOURCE_RECEIVED" if fresh else "HOLD_STALE_REPORT",
        "sourceIsLive": fresh,
        "receipt": {
            "collectorId": latest.collector_id,
            "observedAtMs": latest.observed_at_ms,
            "receivedAt": latest.received_at.isoformat(),
            "ageSeconds": age,
        },
        "devices": json.loads(latest.payload_json)["devices"],
    }


@router.post("/receipt", status_code=202)
def receive370(envelope: Envelope370, db: DB, response: Response) -> dict[str, object]:
    response.headers["Cache-Control"] = "no-store"
    try:
        payload = validate370(envelope, int(time.time() * 1000))
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    if (
        db.scalar(
            select(WorkshopGatewayReceipt370.id).where(
                WorkshopGatewayReceipt370.collector_id == payload.collector_id,
                WorkshopGatewayReceipt370.nonce == payload.nonce,
            )
        )
        is not None
    ):
        raise HTTPException(status_code=409, detail="HOLD_WORKSHOP370_REPLAY")
    db.add(
        WorkshopGatewayReceipt370(
            collector_id=payload.collector_id,
            nonce=payload.nonce,
            observed_at_ms=payload.observed_at_ms,
            expires_at_ms=payload.expires_at_ms,
            received_at=datetime.now(UTC),
            payload_json=canonical370(payload).decode("ascii"),
        )
    )
    record_audit_event(
        db,
        actor_user_id=None,
        event_type="workshop370.signed_source_received",
        object_type="workshop_gateway",
        object_id=payload.collector_id,
        action="store_read_only_observation",
        arguments={"count": len(payload.devices)},
        result={"status": "accepted", "actuations": 0},
    )
    db.commit()
    return {"status": "accepted", "physicalDevicesVerified": False, "commandsSent": 0}


@router.get("/status")
def get_status370(_owner: Owner, db: DB, response: Response) -> dict[str, object]:
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    return report370(db, int(time.time() * 1000))
