"""Build 347: signed service admission, 1.0/1.1 mixed peer compatibility."""

import hashlib
from dataclasses import replace

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from rosevear_ai_hub.service_identity347 import (
    ENDPOINT,
    SCHEMA,
    Channel347,
    NonceLedger347,
    PublicKey347,
    Registry347,
    _canonical,
    _digest,
    allowed_route347,
    negotiate347,
    verify_readonly_delivery347,
)

NOW = 1_780_000_000_000
SENDER = "devilndove"
RECIPIENT = "rosevear-ai-hub"
CAPABILITY = "business.health.readonly"


def fixture(tmp_path, *, capability=CAPABILITY, sender=SENDER, recipient=RECIPIENT, proto="1.1"):
    private = Ed25519PrivateKey.generate()
    der = private.public_key().public_bytes(Encoding.DER, PublicFormat.SubjectPublicKeyInfo)
    key = PublicKey347(
        sender,
        "issuer-key-2026",
        der,
        hashlib.sha256(der).hexdigest(),
        NOW - 100_000,
        NOW + 100_000,
    )
    registry = Registry347((key,))
    ledger = NonceLedger347(tmp_path / "nonce.sqlite")
    assert ledger.enroll()
    body = {
        "eventType": {
            "business.health.readonly": "business.health.readonly.v1",
            "master.health.readonly": "master.health.readonly.v1",
            "governance.readonly": "governance.open_hold.handoff.v1",
        }[capability],
        "evidenceDigest": "b" * 64,
        "connection": "HOLD",
        "incidentStatus": "OPEN_HOLD",
    }
    p = {
        "schema": SCHEMA,
        "protocolVersion": proto,
        "issuer": sender,
        "audience": recipient,
        "keyId": key.key_id,
        "nonce": "nonce-private-001",
        "messageId": "message-private-001",
        "capability": capability,
        "method": "POST",
        "path": ENDPOINT,
        "bodyDigest": _digest(body),
        "issuedAtMs": NOW - 1000,
        "expiresAtMs": NOW + 10_000,
    }
    env = {"payload": p, "signature": private.sign(_canonical(p)).hex()}
    return private, registry, ledger, body, env


def evaluate(
    registry,
    ledger,
    body,
    env,
    *,
    tls=True,
    now=NOW,
    versions=("1.1",),
    caps=(CAPABILITY,),
    peer=SENDER,
    recipient=RECIPIENT,
):
    return verify_readonly_delivery347(
        envelope=env,
        body=body,
        registry=registry,
        ledger=ledger,
        channel=Channel347(tls, peer, recipient),
        peer_protocols=versions,
        peer_capabilities=caps,
        now_ms=now,
    )


def resign(private, env):
    env["signature"] = private.sign(_canonical(env["payload"])).hex()


def test_protocol_11_independent_business_master_and_replay(tmp_path):
    private, registry, ledger, body, env = fixture(tmp_path)
    accepted = evaluate(registry, ledger, body, env)
    assert accepted["accepted"] and accepted["idempotentReceiptStored"]
    assert accepted["protocolVersion"] == "1.1"
    assert accepted["messageDelivered"] is False
    assert not evaluate(registry, ledger, body, env)["accepted"]
    assert "REPLAY" in evaluate(registry, ledger, body, env)["state"]
    assert registry.public_summary()["enrolledServices"] == [SENDER]


def test_missing_peer_only_its_capability_on_hold():
    assert not negotiate347(
        issuer=SENDER,
        audience=RECIPIENT,
        capability=CAPABILITY,
        peer_protocols=["1.0"],
        peer_capabilities=[CAPABILITY],
    )["accepted"]
    assert (
        negotiate347(
            issuer="ai-data-platform",
            audience="rosevear-ai-hub",
            capability="governance.readonly",
            peer_protocols=["1.0"],
            peer_capabilities=["governance.readonly"],
        )["protocolVersion"]
        == "1.0"
    )
    assert (
        negotiate347(
            issuer="ai-data-platform",
            audience="rosevear-ai-hub",
            capability="governance.readonly",
            peer_protocols=["1.0", "1.1"],
            peer_capabilities=["governance.readonly"],
        )["protocolVersion"]
        == "1.1"
    )
    assert not negotiate347(
        issuer=SENDER,
        audience=RECIPIENT,
        capability="customer.read",
        peer_protocols=["1.1"],
        peer_capabilities=["customer.read"],
    )["accepted"]
    assert not allowed_route347("iCamp", "devilndove", "business.health.readonly")


def test_legacy_governance_signed_sender(tmp_path):
    key, registry, ledger, body, env = fixture(
        tmp_path,
        capability="governance.readonly",
        sender="ai-data-platform",
        recipient="rosevear-ai-hub",
        proto="1.0",
    )
    result = evaluate(
        registry,
        ledger,
        body,
        env,
        versions=("1.0",),
        caps=("governance.readonly",),
        peer="ai-data-platform",
    )
    assert result["accepted"] and result["protocolVersion"] == "1.0"
    assert not result["crossAppConnectivityVerified"]


def test_no_tls_or_unknown_recipient_or_wrong_digest(tmp_path):
    private, registry, ledger, body, env = fixture(tmp_path)
    assert not evaluate(registry, ledger, body, env, tls=False)["accepted"]
    assert not evaluate(registry, ledger, body, env, recipient="rosiedazzlers")["accepted"]
    body["evidenceDigest"] = "a" * 64
    assert not evaluate(registry, ledger, body, env)["accepted"]


def test_tampered_signature_and_changed_audience(tmp_path):
    private, registry, ledger, body, env = fixture(tmp_path)
    env["payload"]["messageId"] = "different-message-001"
    assert "SIGNATURE" in evaluate(registry, ledger, body, env)["state"]
    resign(private, env)
    env["payload"]["audience"] = "iCamp"
    assert not evaluate(registry, ledger, body, env)["accepted"]


def test_expiry_future_replay_and_unknown_protocol(tmp_path):
    private, registry, ledger, body, env = fixture(tmp_path)
    assert not evaluate(registry, ledger, body, env, now=NOW + 15_000)["accepted"]
    assert not evaluate(registry, ledger, body, env, now=NOW - 2_000)["accepted"]
    assert not evaluate(registry, ledger, body, env, versions=("1.2",))["accepted"]


def test_revoked_keys_and_missing_nonce_journal(tmp_path):
    private, registry, ledger, body, env = fixture(tmp_path)
    revoked = Registry347((replace(registry.records[0], revoked_at_ms=NOW - 1),))
    assert not evaluate(revoked, ledger, body, env)["accepted"]
    missing = NonceLedger347(tmp_path / "no-ledger.sqlite")
    assert not evaluate(registry, missing, body, env)["accepted"]


def test_rotation_policy_and_independent_key_pin(tmp_path):
    private, registry, ledger, body, env = fixture(tmp_path)
    key = registry.records[0]
    with pytest.raises(ValueError):
        Registry347((replace(key, active_until_ms=NOW + 91 * 86_400_000),))
    with pytest.raises(ValueError):
        Registry347((key, replace(key, key_id="another-issuer-key")))
    with pytest.raises(ValueError):
        Registry347((replace(key, pin_sha256="0" * 64),))


def test_sensitive_payload_and_t5_stay_denied(tmp_path):
    private, registry, ledger, body, env = fixture(tmp_path)
    body["customerId"] = "secret"
    assert not evaluate(registry, ledger, body, env)["accepted"]
    body.pop("customerId")
    env["payload"]["capability"] = "receiver.original_host.activate"
    resign(private, env)
    assert not evaluate(registry, ledger, body, env)["accepted"]
