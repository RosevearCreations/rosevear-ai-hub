"""Synthetic signature checks are not original-host or owner attestation."""

import base64
import hashlib
from datetime import UTC, datetime, timedelta

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from rosevear_ai_hub.api.ql364_source_health import (
    ENVELOPE_SCHEMA,
    HEALTH_SCHEMA,
    PATH,
    RECEIPT_SCHEMA,
    canonical,
    digest,
)
from rosevear_ai_hub.protected_receipt_pilot303 import verify_one_receipt_component303


def receipt_fixture():
    secret = Ed25519PrivateKey.generate()  # fixture only; never persisted or enrolled
    pub = secret.public_key().public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    now = datetime(2026, 11, 10, 17, 0, tzinfo=UTC)

    def iso(value):
        return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")

    op = "12345678-1234-4123-8123-123456789012"
    health = {
        "schema": HEALTH_SCHEMA,
        "sourceId": "rosevear-ai-hub",
        "operationId": op,
        "health": "ok",
        "connected": False,
        "customerDataAllowed": False,
        "deviceActions": False,
    }
    payload = {
        "schema": RECEIPT_SCHEMA,
        "sourceId": "rosevear-ai-hub",
        "operationId": op,
        "requestSha256": "a" * 64,
        "receiptSha256": digest(health),
        "sourceCommitSha": "b" * 40,
        "sourceOrigin": "https://original.example",
        "environment": "TEST",
        "method": "GET",
        "path": PATH,
        "scope": "HEALTH_METADATA_ONLY_NO_CUSTOMERS_OR_DEVICES",
        "issuedAt": iso(now - timedelta(seconds=1)),
        "expiresAt": iso(now + timedelta(seconds=30)),
    }
    signature = base64.urlsafe_b64encode(secret.sign(canonical(payload))).decode().rstrip("=")
    envelope = {
        "schema": ENVELOPE_SCHEMA,
        "health": health,
        "receipt": {
            "schema": RECEIPT_SCHEMA,
            "payload": payload,
            "signature": signature,
            "keyId": "synthetic-source-key-303",
        },
    }
    args = {
        "pinned_public_key_der": pub,
        "expected_spki_sha256": hashlib.sha256(pub).hexdigest(),
        "expected_key_id": "synthetic-source-key-303",
        "expected_source_sha": "b" * 40,
        "expected_operation_id": op,
        "expected_request_sha256": "a" * 64,
        "now_ms": int(now.timestamp() * 1000),
    }
    return envelope, args


def test_valid_synthetic_signature_is_only_a_component_not_a_connection():
    envelope, args = receipt_fixture()
    result = verify_one_receipt_component303(envelope, **args)
    assert result["component"] == "SIGNATURE_COMPONENT_VALID"
    assert result["cryptographicSignatureValid"] is True
    assert result["acceptedReceipts"] == 0
    assert result["originalHostIndependentlyAttested"] is False
    assert result["durableReplayClaimed"] is False
    assert result["connection"] == "HOLD"


def test_tampered_scope_signer_pin_replay_and_expiry_fail_closed():
    envelope, args = receipt_fixture()
    assert (
        verify_one_receipt_component303(envelope, **{**args, "expected_spki_sha256": "c" * 64})[
            "component"
        ]
        == "HOLD_SOURCE_SIGNER_PIN_MISMATCH"
    )
    assert (
        verify_one_receipt_component303(
            envelope, **{**args, "known_operation_ids": frozenset({args["expected_operation_id"]})}
        )["component"]
        == "HOLD_REPLAY_SUSPECTED"
    )
    assert (
        verify_one_receipt_component303(envelope, **{**args, "now_ms": args["now_ms"] + 40_000})[
            "component"
        ]
        == "HOLD_EXPIRED_OR_INVALID_TIME"
    )
    changed = {
        **envelope,
        "receipt": {
            **envelope["receipt"],
            "payload": {**envelope["receipt"]["payload"], "scope": "DEVICE_CONTROL"},
        },
    }
    assert (
        verify_one_receipt_component303(changed, **args)["component"]
        == "HOLD_SOURCE_OR_SCOPE_MISMATCH"
    )
    changed = {
        **envelope,
        "receipt": {
            **envelope["receipt"],
            "payload": {
                **envelope["receipt"]["payload"],
                "sourceOrigin": "https://user:pass@original.example",
            },
        },
    }
    assert (
        verify_one_receipt_component303(changed, **args)["component"]
        == "HOLD_SOURCE_OR_SCOPE_MISMATCH"
    )
    changed = {**envelope, "receipt": {**envelope["receipt"], "signature": "A" * 86}}
    assert verify_one_receipt_component303(changed, **args)["component"] == "HOLD_SIGNATURE_INVALID"
    changed = {**envelope, "extraCredential": "secret"}
    assert verify_one_receipt_component303(changed, **args)["component"] == "HOLD_RECEIPT_SCHEMA"


def test_missing_protected_pin_never_downgrades_to_unsigned_acceptance():
    envelope, args = receipt_fixture()
    result = verify_one_receipt_component303(envelope, **{**args, "pinned_public_key_der": None})
    assert result["component"] == "HOLD_PROTECTED_PIN_OR_SCOPE_MISSING"
    assert result["cryptographicSignatureValid"] is False
