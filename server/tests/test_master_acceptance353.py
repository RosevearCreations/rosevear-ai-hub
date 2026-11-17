"""Build 353 / QL-462 independently pinned ceremony and Master pilot limits."""

import hashlib
from datetime import UTC, datetime
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi.testclient import TestClient

import rosevear_ai_hub.master_transport352 as transport
from rosevear_ai_hub.api.server_shell353 import (
    local_acceptance_snapshot353,
    router,
)
from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_acceptance353 import (
    AUDIT_SCHEMA353,
    CEREMONY_SCHEMA353,
    key_rotation_readiness353,
    verify_comms_audit_link353,
    verify_reboot_ceremony353,
)
from rosevear_ai_hub.master_transport352 import (
    OPERATOR_ACK_SCHEMA352,
    signed_event352,
)
from rosevear_ai_hub.original_host_witness352 import (
    TASK_NAME352,
    WITNESS_SCHEMA352,
)
from rosevear_ai_hub.service_identity347 import (
    PublicKey347,
    Registry347,
    _canonical,
    _digest,
)

NOW = 1_800_000_000_000
MANIFEST = "c" * 64


def _pub(private: Ed25519PrivateKey) -> bytes:
    return private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)


def _pin(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _signed(private: Ed25519PrivateKey, payload: dict) -> dict:
    return {
        "payload": payload,
        "signature": private.sign(_canonical(payload)).hex(),
    }


def _host_task(boot_ms: int, observed: int) -> dict:
    start = datetime.fromtimestamp((boot_ms + 10000) / 1000, UTC)
    return {
        "name": TASK_NAME352,
        "state": "Running",
        "principal": "SYSTEM",
        "trigger": "MSFT_TaskBootTrigger",
        "command": r"C:\Rosevear\venv\Scripts\python.exe",
        "arguments": r'-u "C:\Rosevear\scripts\hub_master_supervisor350.py" --watch',
        "lastRunTimeUtc": start.isoformat(),
        "lastTaskResult": 267009,
    }


def _host_receipt(
    signer: Ed25519PrivateKey, boot_ms: int, observed: int,
) -> dict:
    payload = {
        "schema": WITNESS_SCHEMA352,
        "originalHost": "DESKTOP-AE894KC",
        "manifestDigest": MANIFEST,
        "bootMs": boot_ms,
        "observedAtMs": observed,
        "task": _host_task(boot_ms, observed),
        "receiverActivationAuthorized": False,
    }
    return _signed(signer, payload)


def test_signed_two_boot_reviewer_ceremony_is_not_automatic_startup_proof():
    host_key = Ed25519PrivateKey.generate()
    reviewer_key = Ed25519PrivateKey.generate()
    host_pin = _pin(_pub(host_key))
    reviewer_pin = _pin(_pub(reviewer_key))
    before = _host_receipt(host_key, NOW - 3_600_000, NOW - 1_800_000)
    after = _host_receipt(host_key, NOW - 120_000, NOW - 20_000)
    payload = {
        "schema": CEREMONY_SCHEMA353,
        "originalHost": "DESKTOP-AE894KC",
        "manifestDigest": MANIFEST,
        "beforeReceiptDigest": _digest(before),
        "afterReceiptDigest": _digest(after),
        "beforeBootMs": before["payload"]["bootMs"],
        "afterBootMs": after["payload"]["bootMs"],
        "reviewerRole": "independent_reviewer",
        "reviewedAtMs": NOW - 10_000,
        "physicalReceiverAuthorized": False,
    }
    receipt = _signed(reviewer_key, payload)
    kwargs = {
        "signed_ceremony": receipt,
        "before_receipt": before,
        "after_receipt": after,
        "host_witness_public": _pub(host_key),
        "host_witness_pin": host_pin,
        "independent_reviewer_public": _pub(reviewer_key),
        "independent_reviewer_pin": reviewer_pin,
        "owner_pin": "0" * 64,
        "manifest_digest": MANIFEST,
        "now_ms": NOW,
    }
    valid = verify_reboot_ceremony353(**kwargs)
    assert valid["signedSequenceVerified"]
    assert valid["independentReviewerAssertionVerified"]
    assert valid["automaticStartupIndependentlyProven"] is False
    assert valid["continuous24HourOperationVerified"] is False
    assert valid["physicalReceiverAuthorized"] is False
    assert valid["bootCount"] == 2
    assert not verify_reboot_ceremony353(
        **{**kwargs, "owner_pin": reviewer_pin}
    )["signedSequenceVerified"]
    assert not verify_reboot_ceremony353(
        **{**kwargs, "now_ms": NOW + 180_000}
    )["signedSequenceVerified"]
    forged = {
        **receipt,
        "payload": {**receipt["payload"], "afterBootMs": NOW - 90_000},
    }
    assert not verify_reboot_ceremony353(
        **{**kwargs, "signed_ceremony": forged}
    )["signedSequenceVerified"]
    wrong_boot = _host_receipt(host_key, NOW - 3_600_000, NOW - 5_000)
    assert not verify_reboot_ceremony353(
        **{**kwargs, "after_receipt": wrong_boot}
    )["signedSequenceVerified"]


def _registry() -> tuple[Registry347, dict[str, Ed25519PrivateKey]]:
    keys = {
        issuer: Ed25519PrivateKey.generate()
        for issuer in (
            "rosevear-ai-hub",
            "rosevear-comms-hub",
            "ai-data-platform",
        )
    }
    records = []
    for issuer, key in keys.items():
        pub = key.public_key().public_bytes(
            Encoding.DER, PublicFormat.SubjectPublicKeyInfo,
        )
        records.append(
            PublicKey347(
                issuer=issuer,
                key_id=f"{issuer}-primary-0001",
                public_der=pub,
                pin_sha256=_pin(pub),
                active_from_ms=NOW - 50_000,
                active_until_ms=NOW + 10 * 86_400_000,
            )
        )
    return Registry347(tuple(records)), keys


def test_comms_audit_record_requires_exact_owner_allowlist_and_signatures(monkeypatch):
    monkeypatch.setattr(transport, "_on_original_host352", lambda: True)
    registry, keys = _registry()
    event = signed_event352(
        private_key=keys["rosevear-ai-hub"],
        key_id="rosevear-ai-hub-primary-0001",
        audience="rosevear-comms-hub",
        event_type="operator.issue",
        source_evidence_sha="a" * 64,
        severity="CRITICAL",
        manifest_sha=MANIFEST,
        now_ms=NOW - 20_000,
        nonce="N" * 32,
    )
    assert event is not None
    record = {
        "messageId": event["payload"]["messageId"],
        "eventDigest": _digest(event["payload"]),
        "ownerAuditId": "owner-custody-check-001",
        "actorRole": "owner",
        "outcome": "ACKNOWLEDGED",
        "occurredAtMs": NOW - 12_000,
    }
    ack_body = {
        "schema": OPERATOR_ACK_SCHEMA352,
        "protocolVersion": "1.1",
        "issuer": "rosevear-comms-hub",
        "audience": "rosevear-ai-hub",
        "keyId": "rosevear-comms-hub-primary-0001",
        "messageId": record["messageId"],
        "messageDigest": _digest(event["payload"]),
        "status": "ACKNOWLEDGED",
        "issuedAtMs": NOW - 10_000,
        "expiresAtMs": NOW + 20_000,
        "operatorRole": "owner",
        "actorAuditDigest": _digest(record),
    }
    ack = _signed(keys["rosevear-comms-hub"], ack_body)
    audit = {
        "schema": AUDIT_SCHEMA353,
        "protocolVersion": "1.1",
        "issuer": "rosevear-comms-hub",
        "audience": "rosevear-ai-hub",
        "keyId": "rosevear-comms-hub-primary-0001",
        "messageId": record["messageId"],
        "eventDigest": record["eventDigest"],
        "ackDigest": _digest(ack_body),
        "auditRecord": record,
        "issuedAtMs": NOW - 5_000,
        "expiresAtMs": NOW + 25_000,
    }
    signed_audit = _signed(keys["rosevear-comms-hub"], audit)
    kwargs = {
        "event_payload": event["payload"],
        "operator_ack": ack,
        "signed_audit": signed_audit,
        "registry": registry,
        "now_ms": NOW,
        "permitted_owner_audit_ids": frozenset({"owner-custody-check-001"}),
    }
    verified = verify_comms_audit_link353(**kwargs)
    assert verified["commsSignedAuditLinked"]
    assert verified["humanReadIndependentlyWitnessed"] is False
    assert not verify_comms_audit_link353(
        **{**kwargs, "permitted_owner_audit_ids": frozenset({"other-owner"})}
    )["commsSignedAuditLinked"]
    assert not verify_comms_audit_link353(
        **{**kwargs, "now_ms": NOW + 100_000}
    )["commsSignedAuditLinked"]
    forged = {
        **signed_audit,
        "payload": {**signed_audit["payload"], "messageId": "d" * 64},
    }
    assert not verify_comms_audit_link353(
        **{**kwargs, "signed_audit": forged}
    )["commsSignedAuditLinked"]


def test_owner_reviewed_rotation_gates_missing_and_expiring_peers():
    registry, _keys = _registry()
    status = key_rotation_readiness353(registry, NOW)
    assert status["state"] == "PINNED_KEYS_VALID"
    assert len(status["peerKeys"]) == 3
    assert status["automaticKeyActivationAuthorized"] is False
    missing = Registry347(
        tuple(x for x in registry.records if x.issuer != "rosevear-comms-hub")
    )
    assert key_rotation_readiness353(missing, NOW)["state"] == "HOLD_PEER_KEYS_MISSING"
    soon = Registry347(
        tuple(
            PublicKey347(
                issuer=x.issuer,
                key_id=x.key_id,
                public_der=x.public_der,
                pin_sha256=x.pin_sha256,
                active_from_ms=x.active_from_ms,
                active_until_ms=NOW + 50_000,
                revoked_at_ms=x.revoked_at_ms,
            )
            for x in registry.records
        )
    )
    assert key_rotation_readiness353(soon, NOW)["state"] == "ROTATION_DUE"
    assert key_rotation_readiness353(None, NOW)["peerKeys"] == []


def test_owner_only_acceptance_endpoint_and_no_remote_mutations():
    client = TestClient(app)
    route = "/api/v1/system/server-shell-353"
    assert all(item.methods == {"GET"} for item in router.routes)
    assert client.get(route).status_code in (401, 403)
    for verb in ("post", "put", "patch", "delete"):
        assert getattr(client, verb)(route).status_code in (401, 403, 405)
    summary = local_acceptance_snapshot353(
        now_ms=NOW, machine_name="WRONG-HOST",
    )
    assert summary["rebootCeremony"]["signedSequenceVerified"] is False
    assert summary["pilot"]["livePeerCurrentlyConnected"] is False
    assert summary["operatorAudit"]["commsSignedAuditLinked"] is False
    assert summary["receiverActivationAuthorized"] is False
    assert summary["webMutationAvailable"] is False
    root = Path(__file__).resolve().parents[2]
    cli = (root / "scripts" / "hub_master_event_delivery352.py").read_text()
    assert "--enqueue-pilot" in cli
    assert "--pilot-audience" in cli
    assert "ONE_SIGNED_PILOT_QUEUED_NO_NETWORK_DELIVERY" in cli
    assert "Start-Service" not in cli
    assert "Restart-Service" not in cli
