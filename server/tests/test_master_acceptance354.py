"""QL-463 witness enrollment, signed peer sink, Comms source and TLS rotation tests."""

import hashlib
import json
import sqlite3
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi.testclient import TestClient

import rosevear_ai_hub.master_transport352 as transport
from rosevear_ai_hub.api.server_shell354 import (
    local_acceptance_snapshot354,
    router,
)
from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_acceptance353 import AUDIT_SCHEMA353
from rosevear_ai_hub.master_acceptance354 import (
    CERT_ROTATION_SCHEMA354,
    SINK_PILOT_SCHEMA354,
    WITNESS_ENROLLMENT_SCHEMA354,
    acceptance_summary354,
    crosscheck_peer_outbox354,
    probe_candidate_mtls354,
    verify_certificate_rotation_plan354,
    verify_enrolled_reboot354,
    verify_signed_peer_sink354,
    verify_witness_enrollment354,
)
from rosevear_ai_hub.master_source_audit354 import (
    MasterSourceAuditLedger354,
    verify_source_crosscheck354,
)
from rosevear_ai_hub.master_transport352 import (
    ACK_SCHEMA352,
    OPERATOR_ACK_SCHEMA352,
    MasterDeliveryLedger352,
    signed_event352,
)
from rosevear_ai_hub.service_identity347 import (
    PublicKey347,
    Registry347,
    _canonical,
    _digest,
)

NOW = 1_800_000_000_000
MANIFEST = "c" * 64
TLS_PIN = "a" * 64


def _raw(private):
    return private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)


def _sha(data):
    return hashlib.sha256(data).hexdigest()


def _sign(private, body):
    return {"payload": body, "signature": private.sign(_canonical(body)).hex()}


def _registry(keys):
    records = []
    for issuer, private in keys.items():
        der = private.public_key().public_bytes(
            Encoding.DER, PublicFormat.SubjectPublicKeyInfo,
        )
        records.append(PublicKey347(
            issuer=issuer,
            key_id=issuer + "-2026-build354-key",
            public_der=der, pin_sha256=_sha(der),
            active_from_ms=NOW - 200_000,
            active_until_ms=NOW + 86_400_000,
        ))
    return Registry347(tuple(records))


def _peer():
    return {
        "id": "rosevear-comms-hub", "hostname": "comms.internal.example",
        "port": 443, "tlsLeafPin": TLS_PIN,
    }


def _source(keys):
    event = signed_event352(
        private_key=keys["rosevear-ai-hub"],
        key_id="rosevear-ai-hub-2026-build354-key",
        audience="rosevear-comms-hub",
        event_type="operator.issue",
        source_evidence_sha="f" * 64,
        severity="CRITICAL", manifest_sha=MANIFEST,
        now_ms=NOW - 20_000, nonce="B" * 32,
    )
    return event


def _ack(keys, event, *, operator=False):
    body = {
        "schema": OPERATOR_ACK_SCHEMA352 if operator else ACK_SCHEMA352,
        "protocolVersion": "1.1", "issuer": "rosevear-comms-hub",
        "audience": "rosevear-ai-hub",
        "keyId": "rosevear-comms-hub-2026-build354-key",
        "messageId": event["payload"]["messageId"],
        "messageDigest": _digest(event["payload"]),
        "status": "ACKNOWLEDGED" if operator else "RECEIVED",
        "issuedAtMs": NOW - (5_000 if operator else 10_000),
        "expiresAtMs": NOW + 30_000,
    }
    if operator:
        body["operatorRole"] = "owner"
        body["actorAuditDigest"] = "d" * 64
    return _sign(keys["rosevear-comms-hub"], body)


def test_owner_pinned_witness_keys_are_distinct_manifest_and_fresh():
    owner = Ed25519PrivateKey.generate()
    witness = Ed25519PrivateKey.generate()
    reviewer = Ed25519PrivateKey.generate()
    wpub = _raw(witness)
    rpub = _raw(reviewer)
    p = {
        "schema": WITNESS_ENROLLMENT_SCHEMA354,
        "originalHost": "DESKTOP-AE894KC",
        "manifestDigest": MANIFEST,
        "hostWitnessPin": _sha(wpub), "reviewerPin": _sha(rpub),
        "issuedAtMs": NOW - 1000, "expiresAtMs": NOW + 100000,
        "receiverActivationAuthorized": False,
    }
    kwargs = dict(
        signed_enrollment=_sign(owner, p), owner_public=_raw(owner),
        owner_pin=_sha(_raw(owner)), witness_public=wpub,
        reviewer_public=rpub, manifest_digest=MANIFEST,
        now_ms=NOW, machine_name="DESKTOP-AE894KC",
    )
    passed = verify_witness_enrollment354(**kwargs)
    assert passed["ownerPinnedEnrollmentVerified"]
    assert passed["originalHostRuntimeVerified"] is False
    assert not verify_witness_enrollment354(
        **{**kwargs, "machine_name": "OTHER"}
    )["ownerPinnedEnrollmentVerified"]
    assert not verify_witness_enrollment354(
        **{**kwargs, "reviewer_public": wpub}
    )["ownerPinnedEnrollmentVerified"]
    assert not verify_witness_enrollment354(
        **{**kwargs, "manifest_digest": "e" * 64}
    )["ownerPinnedEnrollmentVerified"]
    assert not verify_witness_enrollment354(
        **{**kwargs, "now_ms": NOW + 200_000}
    )["ownerPinnedEnrollmentVerified"]
    forged = _sign(owner, {**p, "receiverActivationAuthorized": True})
    assert not verify_witness_enrollment354(
        **{**kwargs, "signed_enrollment": forged}
    )["ownerPinnedEnrollmentVerified"]
    reboot = verify_enrolled_reboot354(
        enrollment_result=passed,
        ceremony_result={
            "signedSequenceVerified": True,
            "independentReviewerAssertionVerified": True,
        },
    )
    assert reboot["signedTwoBootsCorroborated"]
    assert reboot["unattendedTaskStartupVerified"] is False


def test_peer_sink_must_match_event_ack_original_host_outbox_and_tls_pin(
    monkeypatch, tmp_path: Path,
):
    monkeypatch.setattr(transport, "_on_original_host352", lambda: True)
    keys = {
        issuer: Ed25519PrivateKey.generate()
        for issuer in ("rosevear-ai-hub", "rosevear-comms-hub")
    }
    registry = _registry(keys)
    event = signed_event352(
        private_key=keys["rosevear-ai-hub"],
        key_id="rosevear-ai-hub-2026-build354-key",
        audience="rosevear-comms-hub",
        event_type="master.health", source_evidence_sha="f" * 64,
        severity="INFO", manifest_sha=MANIFEST,
        now_ms=NOW - 20_000, nonce="B" * 32,
    )
    ack = _ack(keys, event)
    sink = {
        "schema": SINK_PILOT_SCHEMA354,
        "protocolVersion": "1.1", "issuer": "rosevear-comms-hub",
        "audience": "rosevear-ai-hub",
        "keyId": "rosevear-comms-hub-2026-build354-key",
        "manifestDigest": MANIFEST,
        "messageId": event["payload"]["messageId"],
        "messageDigest": _digest(event["payload"]),
        "deliveryAckDigest": _digest(ack["payload"]),
        "sourceEvidenceDigest": event["payload"]["sourceEvidenceDigest"],
        "tlsLeafPin": TLS_PIN,
        "sinkDisposition": "READ_ONLY_EVENT_RECORDED",
        "observedAtMs": NOW - 2_000, "expiresAtMs": NOW + 20_000,
    }
    receipt = _sign(keys["rosevear-comms-hub"], sink)
    verify = dict(
        signed_sink=receipt, signed_event=event,
        signed_delivery_ack=ack, registry=registry,
        manifest_digest=MANIFEST, peer_tls_pin=TLS_PIN, now_ms=NOW,
    )
    assert verify_signed_peer_sink354(**verify)["signedPeerSinkReceiptVerified"]
    assert not verify_signed_peer_sink354(
        **{**verify, "peer_tls_pin": "d" * 64}
    )["signedPeerSinkReceiptVerified"]
    assert not verify_signed_peer_sink354(
        **{**verify, "now_ms": NOW + 100_000}
    )["signedPeerSinkReceiptVerified"]
    malformed = _sign(keys["rosevear-comms-hub"], {
        **sink, "sinkDisposition": "COMMAND_EXECUTED",
    })
    assert not verify_signed_peer_sink354(
        **{**verify, "signed_sink": malformed}
    )["signedPeerSinkReceiptVerified"]
    ledger = MasterDeliveryLedger352(tmp_path / "outbox.sqlite")
    assert ledger.initialize()
    assert ledger.queue(
        signed=event, registry=registry, manifest_sha=MANIFEST,
        now_ms=NOW,
    )
    package = {"event": event, "deliveryAck": ack, "signedSink": receipt}
    assert not crosscheck_peer_outbox354(
        outbox_path=ledger.path, package=package, peer=_peer(),
        manifest_digest=MANIFEST, registry=registry, now_ms=NOW,
    )
    assert ledger.mark_ack(
        message_id=event["payload"]["messageId"], signed_ack=ack,
        registry=registry, manifest_sha=MANIFEST, now_ms=NOW,
    )
    assert crosscheck_peer_outbox354(
        outbox_path=ledger.path, package=package, peer=_peer(),
        manifest_digest=MANIFEST, registry=registry, now_ms=NOW,
    )
    wrong = {**_peer(), "tlsLeafPin": "d" * 64}
    assert not crosscheck_peer_outbox354(
        outbox_path=ledger.path, package=package, peer=wrong,
        manifest_digest=MANIFEST, registry=registry, now_ms=NOW,
    )
    with sqlite3.connect(ledger.path) as db:
        db.execute(
            "UPDATE master_delivery352 SET delivery_ack_sha = ?",
            (json.dumps({"fake": True}),),
        )
    assert not crosscheck_peer_outbox354(
        outbox_path=ledger.path, package=package, peer=_peer(),
        manifest_digest=MANIFEST, registry=registry, now_ms=NOW,
    )


def test_cert_rotation_owner_scope_and_no_auto_activation(tmp_path: Path):
    owner = Ed25519PrivateKey.generate()
    peer = _peer()
    p = {
        "schema": CERT_ROTATION_SCHEMA354, "manifestDigest": MANIFEST,
        "peer": peer["id"], "hostname": peer["hostname"], "port": peer["port"],
        "previousTlsLeafPin": TLS_PIN, "candidateTlsLeafPin": "b" * 64,
        "issuedAtMs": NOW - 1000, "expiresAtMs": NOW + 20_000,
        "activateAutomatically": False,
    }
    args = dict(
        signed_plan=_sign(owner, p),
        owner_public=_raw(owner), owner_pin=_sha(_raw(owner)),
        manifest_digest=MANIFEST, peer=peer, now_ms=NOW,
    )
    accepted = verify_certificate_rotation_plan354(**args)
    assert accepted["ownerSignedPlanVerified"]
    assert accepted["certificateActivated"] is False
    assert accepted["candidateTlsHandshakeVerified"] is False
    assert not verify_certificate_rotation_plan354(
        **{**args, "peer": {**peer, "tlsLeafPin": "e" * 64}}
    )["ownerSignedPlanVerified"]
    assert not verify_certificate_rotation_plan354(
        **{**args, "now_ms": NOW + 90_000}
    )["ownerSignedPlanVerified"]
    assert not verify_certificate_rotation_plan354(
        **{**args, "signed_plan": _sign(owner, {
            **p, "activateAutomatically": True,
        })}
    )["ownerSignedPlanVerified"]
    assert not probe_candidate_mtls354(
        **args,
        ca_file=tmp_path / "absent", client_cert_file=tmp_path / "cert",
        client_key_file=tmp_path / "key",
    )["candidateTlsHandshakeVerified"]


def test_durable_comms_audit_must_match_hash_checked_source_and_signed_outbox(
    monkeypatch, tmp_path: Path,
):
    monkeypatch.setattr(transport, "_on_original_host352", lambda: True)
    keys = {
        issuer: Ed25519PrivateKey.generate()
        for issuer in ("rosevear-ai-hub", "rosevear-comms-hub")
    }
    registry = _registry(keys)
    event = _source(keys)
    sent = _ack(keys, event)
    record = {
        "messageId": event["payload"]["messageId"],
        "eventDigest": _digest(event["payload"]),
        "ownerAuditId": "owner-evidence-check-354",
        "actorRole": "owner", "outcome": "ACKNOWLEDGED",
        "occurredAtMs": NOW - 7_000,
    }
    operator_body = {
        **_ack(keys, event, operator=True)["payload"],
        "actorAuditDigest": _digest(record),
    }
    op = _sign(keys["rosevear-comms-hub"], operator_body)
    audit_body = {
        "schema": AUDIT_SCHEMA353, "protocolVersion": "1.1",
        "issuer": "rosevear-comms-hub",
        "audience": "rosevear-ai-hub",
        "keyId": "rosevear-comms-hub-2026-build354-key",
        "messageId": event["payload"]["messageId"],
        "eventDigest": _digest(event["payload"]),
        "ackDigest": _digest(operator_body),
        "auditRecord": record, "issuedAtMs": NOW - 1000,
        "expiresAtMs": NOW + 20_000,
    }
    package = {
        "event": event["payload"], "operatorAck": op,
        "signedAudit": _sign(keys["rosevear-comms-hub"], audit_body),
    }
    outbox = MasterDeliveryLedger352(tmp_path / "outbox.sqlite")
    assert outbox.initialize()
    assert outbox.queue(
        signed=event, registry=registry, manifest_sha=MANIFEST,
        now_ms=NOW - 10_000,
    )
    assert outbox.mark_ack(
        message_id=event["payload"]["messageId"], signed_ack=sent,
        registry=registry, manifest_sha=MANIFEST, now_ms=NOW - 4_000,
    )
    assert outbox.mark_ack(
        message_id=event["payload"]["messageId"], signed_ack=op,
        registry=registry, manifest_sha=MANIFEST, now_ms=NOW,
        operator_ack=True,
    )
    source = {
        "integrity": "LOCAL_HASH_CHAIN_VALID",
        "events": [{
            "manifestDigest": MANIFEST,
            "evidenceDigest": "f" * 64,
            "kind": "module.observed",
            "observedAtMs": NOW - 22_000,
        }],
    }
    delivery = outbox.status(
        manifest_sha=MANIFEST, now_ms=NOW, registry=registry,
    )
    valid = verify_source_crosscheck354(
        package=package, local_bus=source, delivery=delivery,
        registry=registry, manifest_sha=MANIFEST,
        owner_audit_id="owner-evidence-check-354", now_ms=NOW,
    )
    assert valid["twoSourceDigestCorroborated"]
    assert not verify_source_crosscheck354(
        package=package, local_bus={**source, "integrity": "HOLD"},
        delivery=delivery, registry=registry, manifest_sha=MANIFEST,
        owner_audit_id="owner-evidence-check-354", now_ms=NOW,
    )["twoSourceDigestCorroborated"]
    ledger = MasterSourceAuditLedger354(tmp_path / "proof.sqlite")
    assert ledger.initialize()
    assert ledger.capture(
        package=package, local_bus=source, outbox=outbox,
        registry=registry, manifest_sha=MANIFEST,
        owner_audit_id="owner-evidence-check-354", now_ms=NOW,
    )
    assert not ledger.capture(
        package=package, local_bus=source, outbox=outbox,
        registry=registry, manifest_sha=MANIFEST,
        owner_audit_id="owner-evidence-check-354", now_ms=NOW,
    )
    snapshot = ledger.summary(
        manifest_sha=MANIFEST, registry=registry,
        outbox=outbox, now_ms=NOW,
    )
    assert snapshot["corroboratedCount"] == 1
    assert snapshot["independentHumanReadVerified"] is False
    with sqlite3.connect(ledger.path) as db:
        db.execute(
            "UPDATE source_audit354 SET event_sha = ?",
            ("e" * 64,),
        )
    assert ledger.summary(
        manifest_sha=MANIFEST, registry=registry,
        outbox=outbox, now_ms=NOW,
    )["integrity"] == "HOLD"


def test_owner_only_api_no_browser_control():
    client = TestClient(app)
    uri = "/api/v1/system/server-shell-354"
    assert all(item.methods == {"GET"} for item in router.routes)
    assert client.get(uri).status_code in (401, 403)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(uri).status_code in (401, 403, 405)
    summary = local_acceptance_snapshot354(
        now_ms=NOW, machine_name="OTHER-HOST",
    )
    assert summary["receiverActivationAuthorized"] is False
    assert summary["webMutationAvailable"] is False
    assert summary["liveThreeMasterMtlSPilotVerified"] is False
    assert summary["witnessEnrollment"]["ownerPinnedEnrollmentVerified"] is False
    assert summary["peerSinks"]["ai-data-platform"] == "UNVERIFIED"
    assert summary["certificateRotation"]["certificateActivated"] is False
    assert acceptance_summary354(
        witness={}, reboot={}, sink_results=[], rotation={}, audit={},
    )["unattendedWindowsRecoveryVerified"] is False
