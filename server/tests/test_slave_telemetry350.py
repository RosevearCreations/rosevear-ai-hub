"""QL-459 peer-signed isolated telemetry: no spoofed CONNECTED or stale metrics."""

import base64
import hashlib
import json
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from rosevear_ai_hub.master_runtime350 import (
    REGISTRY_SCHEMA350,
    load_owner_registry350,
    owner_shell_snapshot350,
)
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST, SCHEMA349
from rosevear_ai_hub.service_identity347 import PublicKey347, Registry347, _canonical, _digest
from rosevear_ai_hub.slave_telemetry350 import (
    TELEMETRY_SCHEMA350,
    TelemetryJournal350,
    probe_slave350,
    verify_signed_health350,
)


def build_fixture(now: int):
    signer = Ed25519PrivateKey.generate()
    public = signer.public_key().public_bytes(Encoding.DER, PublicFormat.SubjectPublicKeyInfo)
    issuer = PublicKey347(
        issuer="YW",
        key_id="key-rosevear-yw-0001",
        public_der=public,
        pin_sha256=hashlib.sha256(public).hexdigest(),
        active_from_ms=now - 60_000,
        active_until_ms=now + 2_000_000,
    )
    registry = Registry347((issuer,))
    payload = {
        "schema": TELEMETRY_SCHEMA350,
        "protocolVersion": "1.1",
        "issuer": "YW",
        "audience": "rosevear-ai-hub",
        "keyId": "key-rosevear-yw-0001",
        "nonce": "TestTelemetryNonce_00000001",
        "issuedAtMs": now - 1000,
        "expiresAtMs": now + 30000,
        "state": "HEALTHY",
        "uptimeSec": 3000,
        "recentErrors": 0,
        "queueLag": 2,
    }
    sample = {"payload": payload, "signature": signer.sign(_canonical(payload)).hex()}
    return signer, registry, sample, public


def test_peer_signature_tamper_nonce_expiry_and_issuer_rejected():
    now = 1_800_000_000_000
    signer, registry, sample, _ = build_fixture(now)
    assert verify_signed_health350(
        sample,
        peer_id="YW",
        registry=registry,
        now_ms=now,
    )["verified"]
    assert not verify_signed_health350(
        sample,
        peer_id="iCamp",
        registry=registry,
        now_ms=now,
    )["verified"]
    assert not verify_signed_health350(
        sample,
        peer_id="YW",
        registry=registry,
        now_ms=now + 40000,
    )["verified"]
    sample["payload"]["queueLag"] = 0
    assert not verify_signed_health350(
        sample,
        peer_id="YW",
        registry=registry,
        now_ms=now,
    )["verified"]
    sample["signature"] = signer.sign(_canonical(sample["payload"])).hex()
    assert verify_signed_health350(
        sample,
        peer_id="YW",
        registry=registry,
        now_ms=now,
    )["verified"]


def test_durable_signed_telemetry_replay_freshness_and_pins(tmp_path: Path):
    now = 1_800_000_000_000
    _, registry, sample, _ = build_fixture(now)
    journal = TelemetryJournal350(tmp_path / "peer.sqlite")
    assert journal.initialize()
    dig = "a" * 64
    pin = "b" * 64
    assert journal.record(
        peer_id="YW",
        manifest_digest=dig,
        pin=pin,
        sample=sample,
        observed_ms=now,
        latency_ms=18,
    )
    assert not journal.record(
        peer_id="YW",
        manifest_digest=dig,
        pin=pin,
        sample=sample,
        observed_ms=now,
        latency_ms=18,
    )
    good = journal.recent(
        peer_id="YW",
        manifest_digest=dig,
        pin=pin,
        now_ms=now,
        registry=registry,
    )
    assert good and good["queueLag"] == 2 and good["latencyMs"] == 18
    assert good["proof"] == "FRESH_PINNED_MTLS_AND_ED25519_JOURNAL"
    assert (
        journal.recent(
            peer_id="YW",
            manifest_digest=dig,
            pin="c" * 64,
            now_ms=now,
            registry=registry,
        )
        is None
    )
    assert (
        journal.recent(
            peer_id="YW",
            manifest_digest=dig,
            pin=pin,
            now_ms=now,
            registry=None,
        )
        is None
    )
    assert (
        journal.recent(
            peer_id="YW",
            manifest_digest=dig,
            pin=pin,
            now_ms=now + 100000,
            registry=registry,
        )
        is None
    )


def test_no_unapproved_or_non_tls_peer_probe(tmp_path: Path):
    now = 1_800_000_000_000
    _, registry, _, _ = build_fixture(now)
    journal = TelemetryJournal350(tmp_path / "peer.sqlite")
    assert journal.initialize()
    assert not probe_slave350(
        peer=None,
        enrollment={"accepted": False},
        registry=registry,
        journal=journal,
        now_ms=now,
    )["verified"]


def test_owner_signed_registry_and_fail_closed_non_windows_dashboard(tmp_path: Path):
    now = 1_800_000_000_000
    _, _, _, slave_pub = build_fixture(now)
    master_key = Ed25519PrivateKey.generate()
    master_pub = master_key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    master_pin = hashlib.sha256(master_pub).hexdigest()
    original = {
        "schema": SCHEMA349,
        "originalHost": ORIGINAL_HOST,
        "issuedAtMs": now - 1000,
        "expiresAtMs": now + 100000,
        "modules": [
            {"id": id, "desiredEnabled": True, "theme": "aurora"}
            for id in ("ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub")
        ],
        "peers": [
            {
                "id": "YW",
                "hostname": "yw.example.test",
                "port": 443,
                "tlsLeafPin": "c" * 64,
                "protocols": ["1.1"],
                "capabilities": ["business.health.readonly"],
            }
        ],
    }
    enrollment = {"accepted": True, "payload": original}
    registry_payload = {
        "schema": REGISTRY_SCHEMA350,
        "originalHost": ORIGINAL_HOST,
        "manifestDigest": _digest(original),
        "issuedAtMs": now - 1000,
        "expiresAtMs": now + 100000,
        "keys": [
            {
                "issuer": "YW",
                "keyId": "key-rosevear-yw-0001",
                "publicDerBase64": base64.b64encode(slave_pub).decode(),
                "activeFromMs": now - 60000,
                "activeUntilMs": now + 1000000,
                "revokedAtMs": None,
            }
        ],
    }
    file = tmp_path / "signed_registry.json"
    file.write_text(
        json.dumps(
            {
                "payload": registry_payload,
                "signature": master_key.sign(_canonical(registry_payload)).hex(),
            }
        )
    )
    registry = load_owner_registry350(
        path=file,
        owner_key=master_pub,
        owner_pin=master_pin,
        enrollment=enrollment,
        now_ms=now,
        machine_name=ORIGINAL_HOST,
    )
    assert registry is not None
    summary = owner_shell_snapshot350(
        enrollment,
        custody=None,
        telemetry=None,
        registry=registry,
        now_ms=now,
        machine_name=ORIGINAL_HOST,
    )
    assert summary["globalConnectivityVerified"] is False
    assert summary["physicalReceiverCurrentlyOff"] is False
    assert summary["applications"][0]["state"] == "UNVERIFIED"
    assert summary["modules"][0]["runtimeState"] == "UNVERIFIED"
    assert (
        load_owner_registry350(
            path=file,
            owner_key=master_pub,
            owner_pin="0" * 64,
            enrollment=enrollment,
            now_ms=now,
            machine_name=ORIGINAL_HOST,
        )
        is None
    )
    assert (
        load_owner_registry350(
            path=file,
            owner_key=master_pub,
            owner_pin=master_pin,
            enrollment=enrollment,
            now_ms=now + 200000,
            machine_name=ORIGINAL_HOST,
        )
        is None
    )
