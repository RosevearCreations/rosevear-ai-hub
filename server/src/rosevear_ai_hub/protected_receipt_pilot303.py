"""Build 303: one-receipt independent *component* verifier for a protected adapter.

Neither a valid cryptographic signature nor this pure verifier establishes original
Windows custody, owner approval, durable replay protection, or Shell connection.
Only a separately enrolled server-side caller may supply a pinned public key.
No browser intake or remote endpoint is installed for this function.
"""

import base64
import binascii
import hashlib
import re
from datetime import UTC, datetime
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from rosevear_ai_hub.api.ql364_source_health import (
    ENVELOPE_SCHEMA,
    HEALTH_SCHEMA,
    PATH,
    RECEIPT_SCHEMA,
    SOURCE_ID,
    canonical,
    digest,
    valid_source_origin,
)

HEX40 = re.compile(r"[a-f0-9]{40}\Z")
HEX64 = re.compile(r"[a-f0-9]{64}\Z")
SIG = re.compile(r"[A-Za-z0-9_-]{86}\Z")
KEY_ID = re.compile(r"[A-Za-z0-9_-]{12,100}\Z")
OPERATION_ID = re.compile(
    r"[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\Z"
)
UTC_TIME = re.compile(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z\Z")
HEALTH_KEYS = {
    "schema",
    "sourceId",
    "operationId",
    "health",
    "connected",
    "customerDataAllowed",
    "deviceActions",
}
RECEIPT_KEYS = {"schema", "payload", "signature", "keyId"}
PAYLOAD_KEYS = {
    "schema",
    "sourceId",
    "operationId",
    "requestSha256",
    "receiptSha256",
    "sourceCommitSha",
    "sourceOrigin",
    "environment",
    "method",
    "path",
    "scope",
    "issuedAt",
    "expiresAt",
}


def _utc_ms(value: Any) -> int | None:
    if not isinstance(value, str) or not UTC_TIME.fullmatch(value):
        return None
    try:
        timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return int(timestamp.timestamp() * 1000) if timestamp.tzinfo == UTC else None
    except ValueError:
        return None


def _hold(code: str) -> dict[str, object]:
    return {
        "schema": "rosevear.ai-hub.one-receipt-verification.v1",
        "sourceId": SOURCE_ID,
        "component": code,
        "cryptographicSignatureValid": code == "SIGNATURE_COMPONENT_VALID",
        "originalHostIndependentlyAttested": False,
        "reviewerAndWitnessVerified": False,
        "ownerConsentVerified": False,
        "durableReplayClaimed": False,
        "receiverEnrolled": False,
        "acceptedReceipts": 0,
        "published": False,
        "connection": "HOLD",
    }


def verify_one_receipt_component303(
    envelope: Any,
    *,
    pinned_public_key_der: bytes | None,
    expected_spki_sha256: str,
    expected_key_id: str,
    expected_source_sha: str,
    expected_operation_id: str,
    expected_request_sha256: str,
    now_ms: int,
    known_operation_ids: frozenset[str] = frozenset(),
) -> dict[str, object]:
    """Verify signed QL-364 bytes under externally supplied pins; always HOLD.

    `known_operation_ids` is only a diagnostic replay precheck. The real receiver
    MUST use its own durable atomic replay ledger before accepting any receipt.
    """
    if (
        not isinstance(now_ms, int)
        or now_ms < 0
        or not HEX64.fullmatch(expected_spki_sha256)
        or not KEY_ID.fullmatch(expected_key_id)
        or not HEX40.fullmatch(expected_source_sha)
        or not HEX64.fullmatch(expected_request_sha256)
        or not isinstance(expected_operation_id, str)
        or not OPERATION_ID.fullmatch(expected_operation_id)
        or not isinstance(pinned_public_key_der, bytes)
        or len(pinned_public_key_der) > 256
    ):
        return _hold("HOLD_PROTECTED_PIN_OR_SCOPE_MISSING")
    if (
        not isinstance(envelope, dict)
        or set(envelope) != {"schema", "health", "receipt"}
        or envelope["schema"] != ENVELOPE_SCHEMA
        or not isinstance(envelope["health"], dict)
        or set(envelope["health"]) != HEALTH_KEYS
        or not isinstance(envelope["receipt"], dict)
        or set(envelope["receipt"]) != RECEIPT_KEYS
    ):
        return _hold("HOLD_RECEIPT_SCHEMA")
    try:
        if len(canonical(envelope)) > 4096:
            return _hold("HOLD_RECEIPT_TOO_LARGE")
    except (TypeError, ValueError, RecursionError):
        return _hold("HOLD_RECEIPT_SCHEMA")
    health, receipt = envelope["health"], envelope["receipt"]
    payload = receipt["payload"]
    if not isinstance(payload, dict) or set(payload) != PAYLOAD_KEYS:
        return _hold("HOLD_RECEIPT_SCHEMA")
    if (
        health["schema"] != HEALTH_SCHEMA
        or health["sourceId"] != SOURCE_ID
        or health["operationId"] != expected_operation_id
        or health["health"] != "ok"
        or health["connected"] is not False
        or health["customerDataAllowed"] is not False
        or health["deviceActions"] is not False
        or receipt["schema"] != RECEIPT_SCHEMA
        or receipt["keyId"] != expected_key_id
        or payload["schema"] != RECEIPT_SCHEMA
        or payload["sourceId"] != SOURCE_ID
        or payload["operationId"] != expected_operation_id
        or payload["requestSha256"] != expected_request_sha256
        or payload["receiptSha256"] != digest(health)
        or payload["sourceCommitSha"] != expected_source_sha
        or not valid_source_origin(payload["sourceOrigin"])
        or payload["environment"] != "TEST"
        or payload["method"] != "GET"
        or payload["path"] != PATH
        or payload["scope"] != "HEALTH_METADATA_ONLY_NO_CUSTOMERS_OR_DEVICES"
    ):
        return _hold("HOLD_SOURCE_OR_SCOPE_MISMATCH")
    issued, expires = _utc_ms(payload["issuedAt"]), _utc_ms(payload["expiresAt"])
    if (
        issued is None
        or expires is None
        or issued > now_ms + 5_000
        or expires <= now_ms
        or expires <= issued
        or expires - issued > 90_000
    ):
        return _hold("HOLD_EXPIRED_OR_INVALID_TIME")
    if expected_operation_id in known_operation_ids:
        return _hold("HOLD_REPLAY_SUSPECTED")
    if not isinstance(receipt["signature"], str) or not SIG.fullmatch(receipt["signature"]):
        return _hold("HOLD_SIGNATURE_FORMAT")
    try:
        if hashlib.sha256(pinned_public_key_der).hexdigest() != expected_spki_sha256:
            return _hold("HOLD_SOURCE_SIGNER_PIN_MISMATCH")
        public_key = serialization.load_der_public_key(pinned_public_key_der)
        if not isinstance(public_key, Ed25519PublicKey):
            return _hold("HOLD_SOURCE_SIGNER_ALGORITHM")
        signature = base64.urlsafe_b64decode(receipt["signature"] + "==")
        if len(signature) != 64:
            return _hold("HOLD_SIGNATURE_FORMAT")
        public_key.verify(signature, canonical(payload))
    except (InvalidSignature, ValueError, TypeError, binascii.Error):
        return _hold("HOLD_SIGNATURE_INVALID")
    # An independently valid Ed25519 component is necessary but insufficient.
    return _hold("SIGNATURE_COMPONENT_VALID")
