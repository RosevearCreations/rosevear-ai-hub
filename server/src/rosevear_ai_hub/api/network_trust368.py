"""Build 368: owner-signed private network scopes and manual device identity history.

No socket, DNS, ping, ARP, mDNS, MQTT, router or Home Assistant probe is made.
All observations are owner-entered claims and must never certify a device as present.
"""

from __future__ import annotations

import hashlib
import hmac
import ipaddress
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
from rosevear_ai_hub.models import NetworkDevice368, NetworkObservation368, NetworkScope368, User

router = APIRouter(prefix="/api/v1/network-trust-368", tags=["network-trust"])
Owner = Annotated[User, Depends(require_roles("owner"))]
DB = Annotated[Session, Depends(get_session)]
PrivateSource = Literal["ha_device", "ha_entity", "camera", "mqtt", "manual"]
Decision = Literal["needs_review", "trusted", "monitor", "blocked"]
IDENTITY_PATTERN = re.compile(r"^[A-Za-z0-9_.:/-]{1,120}$")
LABEL_PATTERN = re.compile(r"^[A-Za-z0-9 _.-]{1,80}$")
RFC1918 = tuple(ipaddress.ip_network(x) for x in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"))


def bounded_private_network(cidr: str) -> ipaddress.IPv4Network:
    try:
        network = ipaddress.ip_network(cidr, strict=True)
    except ValueError as exc:
        raise ValueError("Exact canonical IPv4 CIDR is required.") from exc
    if (
        not isinstance(network, ipaddress.IPv4Network)
        or network.prefixlen < 24
        or not any(network.subnet_of(block) for block in RFC1918)
        or str(network) != cidr
    ):
        raise ValueError("Use an RFC1918 IPv4 network of /24 to /32; no public or broad scans.")
    return network


def scope_message(cidr: str, label: str, expiry_ms: int, nonce: str, revision: int) -> bytes:
    return json.dumps(
        {
            "schema": "rosevear.network-trust.scope.v1",
            "cidr": cidr,
            "label": label,
            "expiryMs": expiry_ms,
            "nonce": nonce,
            "expectedRevision": revision,
            "mode": "manual-review-only",
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def verify_owner_scope(payload: ScopeInput, now_ms: int) -> str:
    bounded_private_network(payload.cidr)
    if not (now_ms + 60_000 < payload.expiry_ms <= now_ms + 7 * 86400_000):
        raise ValueError("Approval must expire in more than one minute and no later than 7 days.")
    path = os.environ.get("ROSEVEAR_NETWORK368_OWNER_PUBLIC_KEY_PATH", "")
    pin = os.environ.get("ROSEVEAR_NETWORK368_OWNER_PUBLIC_KEY_PIN", "").lower()
    if not Path(path).is_absolute() or not re.fullmatch(r"[0-9a-f]{64}", pin):
        raise ValueError("HOLD_OWNER_KEY_NOT_INDEPENDENTLY_PINNED")
    try:
        raw = Path(path).read_bytes()
        if len(raw) > 4096:
            raise ValueError("Public key file exceeds limit.")
        key = serialization.load_pem_public_key(raw)
        if not isinstance(key, Ed25519PublicKey):
            raise ValueError("Owner key must be Ed25519.")
        public_raw = key.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
        if not hmac.compare_digest(hashlib.sha256(public_raw).hexdigest(), pin):
            raise ValueError("Owner key pin mismatch.")
        key.verify(
            bytes.fromhex(payload.signature),
            scope_message(
                payload.cidr,
                payload.label,
                payload.expiry_ms,
                payload.nonce,
                payload.expected_revision,
            ),
        )
    except (OSError, ValueError, InvalidSignature) as exc:
        raise ValueError("HOLD_INVALID_OWNER_SCOPE_SIGNATURE_OR_PIN") from exc
    return hashlib.sha256(bytes.fromhex(payload.signature)).hexdigest()


class ScopeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    cidr: str = Field(min_length=9, max_length=18)
    label: str = Field(min_length=1, max_length=80)
    expiry_ms: int = Field(gt=0)
    nonce: str = Field(pattern=r"^[0-9a-f]{32}$")
    signature: str = Field(pattern=r"^[0-9a-f]{128}$")
    expected_revision: int = Field(ge=0)

    @field_validator("cidr")
    @classmethod
    def private_cidr(cls, value: str) -> str:
        bounded_private_network(value)
        return value

    @field_validator("label")
    @classmethod
    def safe_label(cls, value: str) -> str:
        if not LABEL_PATTERN.fullmatch(value):
            raise ValueError("Use a short non-secret label.")
        return value


class ObservationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: PrivateSource
    source_id: str = Field(min_length=1, max_length=120)
    ip: str = Field(min_length=7, max_length=15)
    lease_ref: str = Field(default="", max_length=40, pattern=r"^[A-Za-z0-9_.-]*$")

    @field_validator("source_id")
    @classmethod
    def safe_identity(cls, value: str) -> str:
        if not IDENTITY_PATTERN.fullmatch(value) or "://" in value or "token" in value.lower():
            raise ValueError("Exact non-secret identity only, not URLs or credentials.")
        if any(c in value for c in ("#", "+", "@")):
            raise ValueError("No MQTT wildcards or account names.")
        return value

    @field_validator("ip")
    @classmethod
    def canonical_ip(cls, value: str) -> str:
        try:
            ip = ipaddress.IPv4Address(value)
        except ipaddress.AddressValueError as exc:
            raise ValueError("Canonical IPv4 address required.") from exc
        if str(ip) != value or not any(ip in b for b in RFC1918):
            raise ValueError("Private RFC1918 IPv4 only.")
        return value


class DecisionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    device_id: int = Field(gt=0)
    decision: Decision
    expected_revision: int = Field(ge=1)


def _active_scope(db: Session, ip: str, now: datetime) -> NetworkScope368 | None:
    for scope in db.scalars(select(NetworkScope368).order_by(NetworkScope368.id)).all():
        expiry = (
            scope.expires_at.replace(tzinfo=UTC)
            if scope.expires_at.tzinfo is None
            else scope.expires_at
        )
        if expiry > now and ipaddress.IPv4Address(ip) in bounded_private_network(scope.cidr):
            return scope
    return None


def _risks(db: Session, device: NetworkDevice368) -> list[str]:
    observations = db.scalars(
        select(NetworkObservation368)
        .where(NetworkObservation368.device_id == device.id)
        .order_by(NetworkObservation368.id.desc())
        .limit(50)
    ).all()
    if not observations:
        return ["NO_OBSERVATION"]
    latest = observations[0]
    flags = []
    if any(row.ip != latest.ip for row in observations[1:]):
        flags.append("IDENTITY_IP_CHANGED_REVIEW")
    other = db.scalars(
        select(NetworkObservation368)
        .where(
            NetworkObservation368.ip == latest.ip,
            NetworkObservation368.device_id != device.id,
        )
        .order_by(NetworkObservation368.id.desc())
        .limit(50)
    ).all()
    # Historical DHCP lease reuse is a warning, not proof of spoofing.
    if other:
        flags.append("SHARED_IP_HISTORY_REVIEW")
    if _active_scope(db, latest.ip, datetime.now(UTC)) is None:
        flags.append("SCOPE_EXPIRED_HOLD")
    return flags


def _state(db: Session) -> dict[str, object]:
    now = datetime.now(UTC)
    scopes = db.scalars(select(NetworkScope368).order_by(NetworkScope368.id).limit(100)).all()
    devices = db.scalars(select(NetworkDevice368).order_by(NetworkDevice368.id).limit(500)).all()
    observations = db.scalars(
        select(NetworkObservation368).order_by(NetworkObservation368.id.desc()).limit(1000)
    ).all()
    grouped: dict[int, list[dict[str, object]]] = {}
    for item in observations:
        grouped.setdefault(item.device_id, []).append(
            {
                "ip": item.ip,
                "leaseRef": item.lease_ref,
                "observedAt": item.observed_at.isoformat(),
                "provenance": "OWNER_ENTERED_UNVERIFIED",
            }
        )
    return {
        "schema": "rosevear.network-trust.v368",
        "mode": "MANUAL_REVIEW_ONLY",
        "backgroundScanEnabled": False,
        "networkProbesPerformed": 0,
        "liveDevicePresenceVerified": False,
        "scopeSigningReady": bool(
            os.environ.get("ROSEVEAR_NETWORK368_OWNER_PUBLIC_KEY_PATH")
            and os.environ.get("ROSEVEAR_NETWORK368_OWNER_PUBLIC_KEY_PIN")
        ),
        "scopes": [
            {
                "id": row.id,
                "cidr": row.cidr,
                "label": row.label,
                "expiryMs": int(row.expires_at.replace(tzinfo=UTC).timestamp() * 1000),
                "active": row.expires_at.replace(tzinfo=UTC) > now,
                "revision": row.revision,
            }
            for row in scopes
        ],
        "devices": [
            {
                "id": row.id,
                "source": row.source,
                "sourceId": row.source_id,
                "decision": row.decision,
                "revision": row.revision,
                "history": grouped.get(row.id, []),
                "riskFlags": _risks(db, row),
            }
            for row in devices
        ],
    }


@router.get("/state")
def get_state(owner: Owner, db: DB, response: Response) -> dict[str, object]:
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return _state(db)


@router.put("/scope")
def approve_scope(payload: ScopeInput, owner: Owner, db: DB) -> dict[str, object]:
    now_ms = int(time.time() * 1000)
    try:
        digest = verify_owner_scope(payload, now_ms)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    nonce_digest = hashlib.sha256(payload.nonce.encode()).hexdigest()
    if db.scalar(select(NetworkScope368).where(NetworkScope368.nonce_digest == nonce_digest)):
        raise HTTPException(status_code=409, detail="Signed approval nonce already used.")
    row = db.scalar(select(NetworkScope368).where(NetworkScope368.cidr == payload.cidr))
    if (row.revision if row else 0) != payload.expected_revision:
        raise HTTPException(status_code=409, detail="Scope changed; re-sign the current revision.")
    now = datetime.now(UTC)
    if row is None:
        row = NetworkScope368(cidr=payload.cidr, revision=1)
        db.add(row)
    else:
        row.revision += 1
    row.label = payload.label
    row.expires_at = datetime.fromtimestamp(payload.expiry_ms / 1000, UTC)
    row.nonce_digest = nonce_digest
    row.signature_digest = digest
    row.approved_by_user_id = owner.id
    row.approved_at = now
    db.flush()
    record_audit_event(
        db,
        actor_user_id=owner.id,
        event_type="network368.scope.approved",
        object_type="network_scope",
        object_id=str(row.id),
        action="approve",
        arguments={"cidr": row.cidr, "revision": row.revision},
        result={"signed": True, "network_scanned": False},
    )
    db.commit()
    return {"scopeId": row.id, "revision": row.revision, "mode": "MANUAL_REVIEW_ONLY"}


@router.post("/observation", status_code=201)
def add_observation(payload: ObservationInput, owner: Owner, db: DB) -> dict[str, object]:
    now = datetime.now(UTC)
    scope = _active_scope(db, payload.ip, now)
    if scope is None:
        raise HTTPException(status_code=403, detail="No current signed scope covers this IP.")
    row = db.scalar(
        select(NetworkDevice368).where(
            NetworkDevice368.source == payload.source,
            NetworkDevice368.source_id == payload.source_id,
        )
    )
    if row is None:
        row = NetworkDevice368(
            source=payload.source,
            source_id=payload.source_id,
            decision="needs_review",
            revision=1,
        )
        db.add(row)
        db.flush()
    elif row.decision == "trusted":
        # An incoming claim must not silently inherit trust from an old address.
        last = db.scalar(
            select(NetworkObservation368)
            .where(NetworkObservation368.device_id == row.id)
            .order_by(NetworkObservation368.id.desc())
            .limit(1)
        )
        if last is not None and last.ip != payload.ip:
            row.decision = "needs_review"
            row.revision += 1
    obs = NetworkObservation368(
        device_id=row.id,
        scope_id=scope.id,
        ip=payload.ip,
        lease_ref=payload.lease_ref,
        observed_by_user_id=owner.id,
        observed_at=now,
    )
    db.add(obs)
    db.flush()
    risks = _risks(db, row)
    if risks and row.decision == "trusted":
        row.decision = "needs_review"
        row.revision += 1
    record_audit_event(
        db,
        actor_user_id=owner.id,
        event_type="network368.claim.recorded",
        object_type="network_device",
        object_id=str(row.id),
        action="record",
        arguments={"source": row.source, "riskFlags": risks},
        result={"provenance": "OWNER_ENTERED_UNVERIFIED", "network_scanned": False},
    )
    db.commit()
    return {"deviceId": row.id, "decision": row.decision, "riskFlags": risks}


@router.put("/decision")
def review_decision(payload: DecisionInput, owner: Owner, db: DB) -> dict[str, object]:
    row = db.get(NetworkDevice368, payload.device_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Unknown device identity.")
    if row.revision != payload.expected_revision:
        raise HTTPException(status_code=409, detail="Identity changed; refresh first.")
    flags = _risks(db, row)
    if payload.decision == "trusted" and flags:
        raise HTTPException(
            status_code=409, detail="Cannot trust an identity with unresolved risk."
        )
    row.decision = payload.decision
    row.revision += 1
    record_audit_event(
        db,
        actor_user_id=owner.id,
        event_type="network368.identity.reviewed",
        object_type="network_device",
        object_id=str(row.id),
        action="review",
        arguments={"decision": row.decision, "revision": row.revision},
        result={"device_adopted": False, "controls_enabled": False},
    )
    db.commit()
    return {"deviceId": row.id, "decision": row.decision, "revision": row.revision}
