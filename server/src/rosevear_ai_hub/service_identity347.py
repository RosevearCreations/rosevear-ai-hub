"""Build 347 / QL-456: independently deployable, fail-closed signed peer admission.

This is a protected transport ADMISSION PRIMITIVE, not an enrolled public HTTP
endpoint or a live network transport. Trusted pins/channel facts must come from
server-side administration, NEVER an incoming request. No private keys are stored.
"""
from __future__ import annotations

import hashlib
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import load_der_public_key

from rosevear_ai_hub.cross_app_security344 import ORDER

PROTOCOLS = ("1.0", "1.1")
SCHEMA = "rosevear.service.signed-readonly347.v1"
ENDPOINT = "/internal/rosevear/sync/read-only"  # Contract marker; NOT a mounted HTTP route
MAX_AGE_MS = 300_000
MAX_ROTATION_MS = 90 * 86_400_000
MAX_OVERLAP_MS = 24 * 3_600_000
MASTERS = ("ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub")
BRANDS = ("devilndove", "rosiedazzlers")
ALLOWED = frozenset(("governance.readonly", "business.health.readonly", "master.health.readonly"))
FIELDS = frozenset((
    "schema", "protocolVersion", "issuer", "audience", "keyId", "nonce",
    "messageId", "capability", "method", "path", "bodyDigest",
    "issuedAtMs", "expiresAtMs",
))
BODY_FIELDS = frozenset(("eventType", "evidenceDigest", "connection", "incidentStatus"))


def _canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, ensure_ascii=True, allow_nan=False,
                      separators=(",", ":")).encode("utf-8")


def _id(value: Any) -> bool:
    return (type(value) is str and 12 <= len(value) <= 128 and value.isascii()
            and all(c.isalnum() or c in "_-" for c in value))


def _digest(value: Any) -> str:
    return hashlib.sha256(_canonical(value)).hexdigest()


def _sha(value: Any) -> bool:
    return type(value) is str and len(value) == 64 and all(c in "0123456789abcdef" for c in value)


def hold347(reason: str, **extra: Any) -> dict[str, Any]:
    return {
        "accepted": False, "state": reason, "connection": "HOLD",
        "messageDelivered": False, "crossAppConnectivityVerified": False,
        "activationAuthorized": False, "closureAuthorized": False,
        "physicalReceiverCurrentlyOff": False, **extra,
    }


@dataclass(frozen=True)
class PublicKey347:
    """Protected configuration/public metadata only. Not received over HTTP."""
    issuer: str
    key_id: str
    public_der: bytes
    pin_sha256: str
    active_from_ms: int
    active_until_ms: int
    revoked_at_ms: int | None = None


@dataclass(frozen=True)
class Channel347:
    """Populated solely by a trusted TLS transport adapter, not JSON headers."""
    verified_tls: bool
    authenticated_peer: str
    recipient_service: str


class Registry347:
    """Optional, independently enrolled peers; missing peers hold only their route."""

    def __init__(self, records: tuple[PublicKey347, ...]):
        self.records = records
        if not isinstance(records, tuple):
            raise ValueError("trusted registry requires immutable records")
        seen_ids: set[tuple[str, str]] = set()
        seen_pins: set[str] = set()
        for r in records:
            if not (isinstance(r, PublicKey347)
                    and r.issuer in ORDER and _id(r.key_id)
                    and type(r.active_from_ms) is int and r.active_from_ms >= 0
                    and type(r.active_until_ms) is int
                    and 0 < r.active_until_ms - r.active_from_ms <= MAX_ROTATION_MS
                    and (r.revoked_at_ms is None or
                         (type(r.revoked_at_ms) is int and r.revoked_at_ms >= r.active_from_ms))
                    and _sha(r.pin_sha256)
                    and (r.issuer, r.key_id) not in seen_ids
                    and r.pin_sha256 not in seen_pins):
                raise ValueError("invalid issuer, independent key ID, rotation or revocation")
            try:
                pub = load_der_public_key(r.public_der)
                if not isinstance(pub, Ed25519PublicKey):
                    raise ValueError("Ed25519 public key required")
                if hashlib.sha256(r.public_der).hexdigest() != r.pin_sha256:
                    raise ValueError("public key pin mismatch")
            except (TypeError, ValueError) as exc:
                raise ValueError("invalid protected public key") from exc
            seen_ids.add((r.issuer, r.key_id))
            seen_pins.add(r.pin_sha256)
        # Overlapping generations are permitted only for one day, per issuer.
        for i, left in enumerate(records):
            for right in records[i + 1:]:
                if left.issuer == right.issuer:
                    overlap = min(left.active_until_ms, right.active_until_ms) - max(
                        left.active_from_ms, right.active_from_ms)
                    if overlap > MAX_OVERLAP_MS:
                        raise ValueError("rotation overlap exceeds one day")

    def resolve(self, issuer: str, key_id: str, *, at_ms: int) -> PublicKey347 | None:
        for r in self.records:
            if (r.issuer == issuer and r.key_id == key_id
                    and r.active_from_ms <= at_ms < r.active_until_ms
                    and (r.revoked_at_ms is None or at_ms < r.revoked_at_ms)):
                return r
        return None

    def public_summary(self) -> dict[str, Any]:
        return {"enrolledServices": sorted(set(r.issuer for r in self.records)),
                "keyCount": len(self.records), "containsPrivateKeys": False}


def allowed_route347(issuer: str, audience: str, capability: str) -> bool:
    if issuer not in ORDER or audience not in ORDER or issuer == audience:
        return False
    if capability == "governance.readonly":
        return ORDER.index(issuer) + 1 == ORDER.index(audience)
    if capability == "business.health.readonly":
        return issuer in BRANDS and audience in MASTERS
    if capability == "master.health.readonly":
        return issuer in MASTERS and audience in BRANDS
    return False


def negotiate347(*, issuer: str, audience: str, capability: str,
                 peer_protocols: Any, peer_capabilities: Any) -> dict[str, Any]:
    """1.1 additive; 1.0 adjacency remains safe; unsupported route only is held."""
    if not allowed_route347(issuer, audience, capability):
        return hold347("HOLD_QL456_UNKNOWN_OR_UNAUTHORIZED_CAPABILITY")
    if (not isinstance(peer_protocols, (list, tuple))
            or not peer_protocols
            or any(type(p) is not str or p not in PROTOCOLS for p in peer_protocols)
            or len(set(peer_protocols)) != len(peer_protocols)
            or not isinstance(peer_capabilities, (list, tuple))
            or any(type(c) is not str or c not in ALLOWED for c in peer_capabilities)
            or len(set(peer_capabilities)) != len(peer_capabilities)):
        return hold347("HOLD_QL456_UNKNOWN_PEER_PROTOCOL_OR_CAPABILITY")
    if "1.1" in peer_protocols and capability in peer_capabilities:
        return {**hold347("QL456_PROTOCOL_1_1_NEGOTIATED_NOT_CONNECTED"),
                "accepted": True, "protocolVersion": "1.1"}
    if ("1.0" in peer_protocols and capability == "governance.readonly"
            and capability in peer_capabilities):
        return {**hold347("QL456_LEGACY_1_0_CAPABILITY_NOT_CONNECTED"),
                "accepted": True, "protocolVersion": "1.0"}
    return hold347("HOLD_QL456_ONLY_DEPENDENT_PEER_CAPABILITY")


class NonceLedger347:
    """Durable local anti-replay journal. Never auto-enrolled over HTTP."""

    def __init__(self, path: Path):
        self.path = path

    def enroll(self) -> bool:
        try:
            if not self.path.parent.is_dir():
                return False
            with sqlite3.connect(self.path, timeout=3) as db:
                db.execute("PRAGMA journal_mode=WAL")
                db.execute("PRAGMA synchronous=FULL")
                db.execute("""CREATE TABLE IF NOT EXISTS service_nonce347(
                    issuer TEXT NOT NULL, nonce TEXT NOT NULL,
                    message_id TEXT NOT NULL, received_ms INTEGER NOT NULL,
                    PRIMARY KEY(issuer,nonce), UNIQUE(issuer,message_id))""")
            return True
        except (OSError, sqlite3.Error):
            return False

    def claim(self, issuer: str, nonce: str, message_id: str, now_ms: int) -> bool:
        try:
            if not self.path.is_file():
                return False
            with sqlite3.connect(self.path, timeout=3, isolation_level=None) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                db.execute("INSERT INTO service_nonce347 VALUES(?,?,?,?)",
                           (issuer, nonce, message_id, now_ms))
                db.execute("COMMIT")
            return True
        except (OSError, sqlite3.Error):
            return False


def verify_readonly_delivery347(*, envelope: Any, body: Any,
                                registry: Registry347 | None,
                                channel: Channel347 | None,
                                ledger: NonceLedger347 | None,
                                peer_protocols: Any, peer_capabilities: Any,
                                now_ms: int) -> dict[str, Any]:
    """Admit a signed request into a trusted *local* boundary, never send it.

    TLS authentication MUST be supplied by a real trusted transport adapter.
    A caller-supplied boolean cannot serve as proof of verified TLS in production.
    """
    if not (isinstance(registry, Registry347) and isinstance(channel, Channel347)
            and isinstance(ledger, NonceLedger347) and type(now_ms) is int and now_ms >= 0
            and channel.verified_tls is True
            and channel.authenticated_peer in ORDER
            and channel.recipient_service in ORDER):
        return hold347("HOLD_QL456_TRANSPORT_OR_TRUST_NOT_ENROLLED")
    if not (type(envelope) is dict and set(envelope) == {"payload", "signature"}
            and type(envelope["payload"]) is dict
            and set(envelope["payload"]) == FIELDS
            and type(body) is dict and set(body) == BODY_FIELDS
            and all(type(body.get(k)) is str for k in BODY_FIELDS)):
        return hold347("HOLD_QL456_UNRECOGNIZED_SIGNED_SCHEMA")
    p = envelope["payload"]
    issuer, audience, capability = p.get("issuer"), p.get("audience"), p.get("capability")
    if not (issuer == channel.authenticated_peer and audience == channel.recipient_service
            and type(p.get("keyId")) is str and _id(p["keyId"])
            and _id(p.get("nonce")) and _id(p.get("messageId"))
            and p["nonce"] != p["messageId"]
            and p.get("schema") == SCHEMA
            and p.get("method") == "POST" and p.get("path") == ENDPOINT
            and type(capability) is str
            and p.get("bodyDigest") == _digest(body)
            and body.get("connection") == "HOLD"
            and body.get("incidentStatus") == "OPEN_HOLD"
            and _sha(body.get("evidenceDigest"))
            and body.get("eventType") in (
                "governance.open_hold.handoff.v1",
                "business.health.readonly.v1",
                "master.health.readonly.v1",
            )
            and body["eventType"] == {
                "governance.readonly": "governance.open_hold.handoff.v1",
                "business.health.readonly": "business.health.readonly.v1",
                "master.health.readonly": "master.health.readonly.v1",
            }.get(capability)
            and type(p.get("issuedAtMs")) is int
            and type(p.get("expiresAtMs")) is int
            and 0 <= now_ms - p["issuedAtMs"] <= MAX_AGE_MS
            and p["issuedAtMs"] < p["expiresAtMs"] <= p["issuedAtMs"] + MAX_AGE_MS
            and now_ms < p["expiresAtMs"]):
        return hold347("HOLD_QL456_SCOPE_BODY_CLOCK_OR_AUDIENCE")
    neg = negotiate347(issuer=issuer, audience=audience, capability=capability,
                       peer_protocols=peer_protocols, peer_capabilities=peer_capabilities)
    if not neg["accepted"] or p.get("protocolVersion") != neg["protocolVersion"]:
        return hold347("HOLD_QL456_PROTOCOL_CAPABILITY_MISMATCH")
    key = registry.resolve(issuer, p["keyId"], at_ms=now_ms)
    if key is None or registry.resolve(issuer, p["keyId"], at_ms=p["issuedAtMs"]) is None:
        return hold347("HOLD_QL456_ISSUER_KEY_UNENROLLED_EXPIRED_OR_REVOKED")
    sig = envelope["signature"]
    if type(sig) is not str or len(sig) != 128 or any(c not in "0123456789abcdef" for c in sig):
        return hold347("HOLD_QL456_INVALID_ED25519_SIGNATURE")
    try:
        public = load_der_public_key(key.public_der)
        public.verify(bytes.fromhex(sig), _canonical(p))
    except (InvalidSignature, TypeError, ValueError):
        # Only an Ed25519 verification failure should reach here; no exception detail leaks.
        return hold347("HOLD_QL456_INVALID_ED25519_SIGNATURE")
    if not ledger.claim(issuer, p["nonce"], p["messageId"], now_ms):
        return hold347("HOLD_QL456_DURABLE_REPLAY_OR_STORAGE")
    return {**hold347("QL456_AUTHENTICATED_LOCAL_ADMISSION_NOT_DELIVERED"),
            "accepted": True, "issuer": issuer, "audience": audience,
            "protocolVersion": neg["protocolVersion"],
            "capability": capability, "idempotentReceiptStored": True}
