"""Cross-app signed governance routing rejects higher privilege and delivery claims."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import cross_app_security344 as c
from test_master_shell_acceptance322 import signed, signer


def fixture():
    keys = {name: signer() for name in c.ORDER}
    pins = {name: key[1:] for name, key in keys.items()}
    message = {
        "schema": c.SCHEMA,
        "messageId": "QL453UniqueMessage2026",
        "nonce": "QL453OriginalNonce2026",
        "correlationId": "QL453OriginalCorrelation2026",
        "source": "ai-data-platform",
        "destination": "rosevear-ai-hub",
        "eventType": c.MESSAGE,
        "securityTier": "MASTER_GOVERNANCE",
        "capability": "governance.readonly",
        "tenantId": None,
        "evidenceDigest": "a" * 64,
        "incidentStatus": "OPEN_HOLD",
        "connection": "HOLD",
        "createdAtMs": 2_200_000,
        "expiresAtMs": 2_240_000,
    }
    return keys, pins, message


def test_signed_envelope_is_not_a_transport_or_hardware_grant():
    keys, pins, message = fixture()
    result = c.validate_handoff344(signed(keys[message["source"]], message),
                                    sender_pins=pins, now_ms=2_210_000)
    assert result["accepted"] is True
    assert result["messageDelivered"] is False
    assert result["connectivityVerified"] is False
    assert result["activationAuthorized"] is False
    assert result["closureAuthorized"] is False
    assert result["physicalReceiverCurrentlyOff"] is False
    assert result["requiresDurableReplayLedger"] is True
    assert result["contractDigest"] == c.CONTRACT_DIGEST


@pytest.mark.parametrize("field,value", [
    ("destination", "rosiedazzlers"),
    ("eventType", "receiver.activate.v1"),
    ("securityTier", "ORIGINAL_HOST_OWNER_CEREMONY"),
    ("capability", "receiver.shutdown"),
    ("tenantId", "other-tenant"),
    ("incidentStatus", "CLOSED"),
    ("connection", "CONNECTED"),
    ("expiresAtMs", 2_200_000),
    ("createdAtMs", 2_210_001),
])
def test_even_validly_signed_unsafe_messages_are_denied(field, value):
    keys, pins, message = fixture()
    message[field] = value
    result = c.validate_handoff344(signed(keys[message["source"]], message),
                                    sender_pins=pins, now_ms=2_210_000)
    assert result["accepted"] is False
    assert result["messageDelivered"] is False


def test_replay_expiry_signature_tamper_and_untrusted_keys_block():
    keys, pins, message = fixture()
    signed_message = signed(keys[message["source"]], message)
    assert c.validate_handoff344(signed_message, sender_pins=pins,
                                 now_ms=2_241_000)["accepted"] is False
    assert c.validate_handoff344(
        signed_message, sender_pins=pins, now_ms=2_210_000,
        previously_seen_ids={message["messageId"]},
    )["accepted"] is False
    tampered = deepcopy(signed_message)
    tampered["payload"]["evidenceDigest"] = "b" * 64
    assert c.validate_handoff344(tampered, sender_pins=pins,
                                 now_ms=2_210_000)["accepted"] is False
    pins["rosevear-ai-hub"] = pins["ai-data-platform"]
    assert c.validate_handoff344(signed_message, sender_pins=pins,
                                 now_ms=2_210_000)["accepted"] is False
