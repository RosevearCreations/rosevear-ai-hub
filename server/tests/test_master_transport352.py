"""QL-461 signed host witness, Master transport receipts and operator ACK boundaries."""

import base64
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi.testclient import TestClient

import rosevear_ai_hub.master_transport352 as transport
import rosevear_ai_hub.original_host_witness352 as witness
from rosevear_ai_hub.api.server_shell352 import (
    local_master_custody_status352,
    router,
)
from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_registry352 import (
    REGISTRY_SCHEMA352,
    load_master_registry352,
)
from rosevear_ai_hub.master_transport352 import (
    ACK_SCHEMA352,
    OPERATOR_ACK_SCHEMA352,
    MasterDeliveryLedger352,
    deliver_mtls_event352,
    signed_event352,
    verify_ack352,
    verify_event352,
)
from rosevear_ai_hub.service_identity347 import (
    PublicKey347,
    Registry347,
    _canonical,
    _digest,
)

NOW = 1_800_000_000_000
MANIFEST_SHA = "a" * 64


def _keys():
    return {
        issuer: Ed25519PrivateKey.generate()
        for issuer in ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")
    }


def _registry(keys):
    items = []
    for issuer, private in keys.items():
        der = private.public_key().public_bytes(
            Encoding.DER, PublicFormat.SubjectPublicKeyInfo,
        )
        items.append(PublicKey347(
            issuer=issuer, key_id="key-" + issuer + "-0001",
            public_der=der, pin_sha256=hashlib.sha256(der).hexdigest(),
            active_from_ms=NOW - 50_000,
            active_until_ms=NOW + 3 * 86_400_000,
        ))
    return Registry347(tuple(items))


def _event(keys, now=NOW):
    return signed_event352(
        private_key=keys["rosevear-ai-hub"],
        key_id="key-rosevear-ai-hub-0001",
        audience="rosevear-comms-hub", event_type="operator.issue",
        source_evidence_sha="b" * 64, severity="CRITICAL",
        manifest_sha=MANIFEST_SHA, now_ms=now,
        nonce="N" * 32,
    )


def _ack(keys, event, *, issued=NOW + 1000, operator=False):
    payload = {
        "schema": OPERATOR_ACK_SCHEMA352 if operator else ACK_SCHEMA352,
        "protocolVersion": "1.1",
        "issuer": "rosevear-comms-hub", "audience": "rosevear-ai-hub",
        "keyId": "key-rosevear-comms-hub-0001",
        "messageId": event["payload"]["messageId"],
        "messageDigest": _digest(event["payload"]),
        "status": "ACKNOWLEDGED" if operator else "RECEIVED",
        "issuedAtMs": issued, "expiresAtMs": issued + 30_000,
    }
    if operator:
        payload["actorAuditDigest"] = "c" * 64
        payload["operatorRole"] = "owner"
    return {
        "payload": payload,
        "signature": keys["rosevear-comms-hub"].sign(_canonical(payload)).hex(),
    }


def test_unsigned_wrong_audience_and_stale_events_fail(monkeypatch):
    monkeypatch.setattr(transport, "_on_original_host352", lambda: True)
    keys = _keys()
    registry = _registry(keys)
    event = _event(keys)
    assert verify_event352(
        event, registry=registry, manifest_sha=MANIFEST_SHA, now_ms=NOW,
    )["verified"]
    assert not verify_event352(
        event, registry=registry, manifest_sha="d" * 64, now_ms=NOW,
    )["verified"]
    assert not verify_event352(
        event, registry=registry, manifest_sha=MANIFEST_SHA, now_ms=NOW + 91_000,
    )["verified"]
    assert not verify_event352(
        event, registry=registry, manifest_sha=MANIFEST_SHA,
        now_ms=NOW + 8 * 86_400_000, allow_expired=True,
    )["verified"]
    event["payload"]["audience"] = "physical-receiver"
    assert not verify_event352(
        event, registry=registry, manifest_sha=MANIFEST_SHA, now_ms=NOW,
    )["verified"]
    assert signed_event352(
        private_key=keys["rosevear-ai-hub"],
        key_id="key-rosevear-ai-hub-0001",
        audience="ai-data-platform", event_type="operator.issue",
        source_evidence_sha="b" * 64, severity="CRITICAL",
        manifest_sha=MANIFEST_SHA, now_ms=NOW, nonce="N" * 32,
    ) is None


def test_verified_mtls_delivery_is_not_operator_ack_and_replays_fail(
    monkeypatch, tmp_path: Path,
):
    monkeypatch.setattr(transport, "_on_original_host352", lambda: True)
    keys = _keys()
    registry = _registry(keys)
    event = _event(keys)
    journal = MasterDeliveryLedger352(tmp_path / "outbox.sqlite")
    assert journal.initialize()
    assert journal.queue(
        signed=event, registry=registry, manifest_sha=MANIFEST_SHA, now_ms=NOW,
    )
    assert not journal.queue(
        signed=event, registry=registry, manifest_sha=MANIFEST_SHA, now_ms=NOW,
    )
    sent = _ack(keys, event)
    assert verify_ack352(
        sent, expected_event=event["payload"], registry=registry, now_ms=NOW + 1001,
    )["verified"]
    assert not journal.mark_ack(
        message_id=event["payload"]["messageId"],
        signed_ack=_ack(keys, event, operator=True),
        registry=registry, manifest_sha=MANIFEST_SHA,
        now_ms=NOW + 1001, operator_ack=True,
    )
    assert journal.mark_ack(
        message_id=event["payload"]["messageId"], signed_ack=sent,
        registry=registry, manifest_sha=MANIFEST_SHA, now_ms=NOW + 1001,
    )
    snapshot = journal.status(
        manifest_sha=MANIFEST_SHA, now_ms=NOW + 1001, registry=registry,
    )
    assert snapshot["queued"] == 0
    assert snapshot["transportAcked"] == 1
    assert snapshot["operatorAcked"] == 0
    assert snapshot["operatorAckMeansHumanVerified"] is False
    assert not journal.mark_ack(
        message_id=event["payload"]["messageId"], signed_ack=sent,
        registry=registry, manifest_sha=MANIFEST_SHA, now_ms=NOW + 1002,
    )
    operator = _ack(keys, event, issued=NOW + 120_000, operator=True)
    assert journal.mark_ack(
        message_id=event["payload"]["messageId"], signed_ack=operator,
        registry=registry, manifest_sha=MANIFEST_SHA,
        now_ms=NOW + 120_001, operator_ack=True,
    )
    snapshot = journal.status(
        manifest_sha=MANIFEST_SHA, now_ms=NOW + 120_001, registry=registry,
    )
    assert snapshot["operatorAcked"] == 1
    assert snapshot["operatorAckMeansHumanVerified"] is False
    assert not journal.mark_ack(
        message_id=event["payload"]["messageId"], signed_ack=operator,
        registry=registry, manifest_sha=MANIFEST_SHA,
        now_ms=NOW + 120_002, operator_ack=True,
    )


def test_database_stage_cannot_self_certify_ack(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(transport, "_on_original_host352", lambda: True)
    keys = _keys()
    registry = _registry(keys)
    event = _event(keys)
    journal = MasterDeliveryLedger352(tmp_path / "outbox.sqlite")
    assert journal.initialize()
    assert journal.queue(
        signed=event, registry=registry, manifest_sha=MANIFEST_SHA, now_ms=NOW,
    )
    import sqlite3

    with sqlite3.connect(journal.path) as db:
        db.execute(
            """UPDATE master_delivery352 SET stage='OPERATOR_ACKED',
            delivery_ack_sha=?, operator_ack_sha=?""",
            ("d" * 64, "e" * 64),
        )
    status = journal.status(
        manifest_sha=MANIFEST_SHA, now_ms=NOW + 1000, registry=registry,
    )
    assert status["stage"] == "HOLD"
    assert status["operatorAcked"] == 0


def test_delivery_rejects_unenrolled_peer_without_network(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(transport, "_on_original_host352", lambda: True)
    keys = _keys()
    journal = MasterDeliveryLedger352(tmp_path / "outbox.sqlite")
    assert journal.initialize()
    result = deliver_mtls_event352(
        peer=None, signed_event=_event(keys),
        enrollment={"accepted": False}, registry=_registry(keys),
        journal=journal, now_ms=NOW,
    )
    assert not result["delivered"]
    assert not result.get("operatorAckVerified", False)


def test_fresh_independent_original_host_signature_and_reboot_order(monkeypatch):
    monkeypatch.setattr(witness, "_host", lambda: True)
    monkeypatch.setattr(witness.psutil, "boot_time", lambda: (NOW - 60000) / 1000)
    private = Ed25519PrivateKey.generate()
    pub = private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    pin = hashlib.sha256(pub).hexdigest()
    task = {
        "name": witness.TASK_NAME352, "state": "Running",
        "principal": "SYSTEM", "trigger": "MSFT_TaskBootTrigger",
        "command": r"C:\Rosevear\venv\Scripts\python.exe",
        "arguments": r'-u "C:\Rosevear\scripts\hub_master_supervisor350.py" --watch',
        "lastRunTimeUtc": datetime.fromtimestamp(
            (NOW - 30000) / 1000, UTC,
        ).isoformat(),
        "lastTaskResult": 267009,
    }
    enrollment = {"accepted": True, "payload": {"test": "manifest"}}
    receipt = witness.build_local_receipt352(
        enrollment=enrollment, task=task, private_key=private, now_ms=NOW,
    )
    assert receipt is not None
    manifest_sha = _digest(enrollment["payload"])
    result = witness.verify_signed_witness352(
        receipt=receipt, public_key=pub, independent_pin=pin,
        owner_pin="0" * 64, manifest_digest=manifest_sha, now_ms=NOW,
    )
    assert result["verified"]
    assert result["taskAutostartProven"] is False
    assert result["independentThirdPartyWitness"] is False
    assert not witness.verify_signed_witness352(
        receipt=receipt, public_key=pub, independent_pin=pin,
        owner_pin=pin, manifest_digest=manifest_sha, now_ms=NOW,
    )["verified"]
    receipt["payload"]["bootMs"] = NOW - 3 * 86_400_000
    assert not witness.verify_signed_witness352(
        receipt=receipt, public_key=pub, independent_pin=pin,
        owner_pin="0" * 64, manifest_digest=manifest_sha, now_ms=NOW,
    )["verified"]
    task["lastRunTimeUtc"] = datetime.fromtimestamp(
        (NOW - 70000) / 1000, UTC,
    ).isoformat()
    assert witness.build_local_receipt352(
        enrollment=enrollment, task=task, private_key=private, now_ms=NOW,
    ) is None


def test_owner_signed_key_registry_is_manifest_scoped(tmp_path: Path):
    owner = Ed25519PrivateKey.generate()
    owner_pub = owner.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    owner_pin = hashlib.sha256(owner_pub).hexdigest()
    keys = _keys()
    payload = {"signed": "manifest", "peers": [{
        "id": "rosevear-comms-hub",
    }]}
    registry_payload = {
        "schema": REGISTRY_SCHEMA352,
        "originalHost": "DESKTOP-AE894KC",
        "manifestDigest": _digest(payload),
        "issuedAtMs": NOW - 1000,
        "expiresAtMs": NOW + 100000,
        "keys": [
            {
                "issuer": issuer, "keyId": "key-" + issuer + "-0001",
                "publicDerBase64": base64.b64encode(
                    private.public_key().public_bytes(
                        Encoding.DER, PublicFormat.SubjectPublicKeyInfo,
                    )
                ).decode("ascii"),
                "activeFromMs": NOW - 30000,
                "activeUntilMs": NOW + 1000000,
                "revokedAtMs": None,
            }
            for issuer, private in keys.items()
            if issuer != "ai-data-platform"
        ],
    }
    path = tmp_path / "signed_master_keys.json"
    path.write_text(json.dumps({
        "payload": registry_payload,
        "signature": owner.sign(_canonical(registry_payload)).hex(),
    }))
    enrollment = {"accepted": True, "payload": payload}
    assert load_master_registry352(
        path=path, owner_public=owner_pub, owner_pin=owner_pin,
        enrollment=enrollment, now_ms=NOW, machine_name="DESKTOP-AE894KC",
    ) is not None
    assert load_master_registry352(
        path=path, owner_public=owner_pub, owner_pin=owner_pin,
        enrollment=enrollment, now_ms=NOW, machine_name="OTHER-HOST",
    ) is None
    assert load_master_registry352(
        path=path, owner_public=owner_pub, owner_pin=owner_pin,
        enrollment={"accepted": True, "payload": {"changed": True, "peers": []}},
        now_ms=NOW, machine_name="DESKTOP-AE894KC",
    ) is None
    registry_payload["keys"][0]["issuer"] = "physical-receiver"
    path.write_text(json.dumps({
        "payload": registry_payload,
        "signature": owner.sign(_canonical(registry_payload)).hex(),
    }))
    assert load_master_registry352(
        path=path, owner_public=owner_pub, owner_pin=owner_pin,
        enrollment=enrollment, now_ms=NOW, machine_name="DESKTOP-AE894KC",
    ) is None


def test_owner_only_get_and_no_network_or_device_control():
    client = TestClient(app)
    url = "/api/v1/system/server-shell-352"
    assert all(route.methods == {"GET"} for route in router.routes)
    assert client.get(url).status_code in (401, 403)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(url).status_code in (401, 403, 405)
    off_host = local_master_custody_status352(
        now_ms=NOW, machine_name="OTHER-HOST",
    )
    assert off_host["installationWitness"]["verified"] is False
    assert off_host["masterTransport"]["operatorAcked"] == 0
    assert off_host["receiverActivationAuthorized"] is False
    assert off_host["webMutationAvailable"] is False
