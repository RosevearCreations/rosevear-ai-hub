"""Build 383: supervised, original-Windows-host signed two-peer delivery.

This is a real network sender, NOT a receiver, mock-ACK generator, web action or
background worker. QL-340C private receiver authority is never granted here.
"""
from __future__ import annotations

import hashlib
import ipaddress
import secrets
import ssl
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from rosevear_ai_hub.master_bus351 import MasterEventBus351
from rosevear_ai_hub.master_transport352 import (
    MasterDeliveryLedger352,
    deliver_mtls_event352,
    signed_event352,
)
from rosevear_ai_hub.service_identity347 import Registry347, _digest
from rosevear_ai_hub.transport348 import PeerEnrollment348
from rosevear_ai_hub import master_transport352

PEERS383 = ("ai-data-platform", "rosevear-comms-hub")
ACCEPTED383 = "BOTH_INDEPENDENT_PINNED_PEER_ACKS_VERIFIED"
HOLD383 = "HOLD_THREE_MASTER_SIGNED_PEER_DELIVERY"


def private_ip383(hostname: str) -> bool:
    """Only literal RFC1918 IPv4 or Tailscale CGNAT IPv4; no DNS rebinding."""
    if type(hostname) is not str:
        return False
    try:
        ip = ipaddress.ip_address(hostname)
    except ValueError:
        return False
    return ip.version == 4 and (
        ip in ipaddress.ip_network("10.0.0.0/8")
        or ip in ipaddress.ip_network("172.16.0.0/12")
        or ip in ipaddress.ip_network("192.168.0.0/16")
        or ip in ipaddress.ip_network("100.64.0.0/10")
    )


def peer_preflight383(peers: dict[str, PeerEnrollment348]) -> bool:
    """Distinct remote leaf pins, per-peer CA, per-peer client certificate identity.

    Actual CA+hostname verification still happens in deliver_mtls_event352.
    """
    if type(peers) is not dict or set(peers) != set(PEERS383):
        return False
    ca_digests: set[str] = set()
    client_pins: set[str] = set()
    leaf_pins: set[str] = set()
    for recipient in PEERS383:
        peer = peers[recipient]
        if not (
            isinstance(peer, PeerEnrollment348)
            and peer.owner_approved is True
            and peer.source == "rosevear-ai-hub"
            and peer.destination == recipient
            and private_ip383(peer.hostname)
            and type(peer.port) is int
            and 1 <= peer.port <= 65535
            and peer.peer_protocols == ("1.1",)
            and "master.health.readonly" in peer.peer_capabilities
            and type(peer.server_cert_pin) is str
            and len(peer.server_cert_pin) == 64
            and all(c in "0123456789abcdef" for c in peer.server_cert_pin)
        ):
            return False
        paths = (peer.ca_file, peer.client_cert_file, peer.client_key_file)
        if not all(
            isinstance(p, Path) and p.is_absolute() and p.is_file()
            and not p.is_symlink() and p.stat().st_size <= 64_000
            for p in paths
        ):
            return False
        try:
            ca_sha = hashlib.sha256(peer.ca_file.read_bytes()).hexdigest()
            client_der = ssl.PEM_cert_to_DER_cert(
                peer.client_cert_file.read_text(encoding="ascii")
            )
            client_sha = hashlib.sha256(client_der).hexdigest()
        except (OSError, UnicodeError, ValueError, ssl.SSLError):
            return False
        if client_sha != peer.client_cert_pin:
            return False
        ca_digests.add(ca_sha)
        client_pins.add(client_sha)
        leaf_pins.add(peer.server_cert_pin)
    return len(ca_digests) == len(client_pins) == len(leaf_pins) == 2


def verified_pair383(
    ledger_snapshot: dict[str, Any],
    messages: dict[str, str],
) -> dict[str, Any]:
    """Trust only the signature-reverified Build352 ledger snapshot, never counts."""
    hold = {"accepted": False, "reason": HOLD383, "receipts": {}}
    if not (
        type(ledger_snapshot) is dict
        and ledger_snapshot.get("stage") == "SIGNED_HISTORICAL_ACKS_NOT_CURRENT_PEER_HEALTH"
        and type(messages) is dict
        and set(messages) == set(PEERS383)
        and all(
            type(mid) is str and len(mid) == 64
            and all(c in "0123456789abcdef" for c in mid)
            for mid in messages.values()
        )
        and len(set(messages.values())) == 2
        and type(ledger_snapshot.get("latest")) is list
    ):
        return hold
    records: dict[str, str] = {}
    for peer in PEERS383:
        entries = [
            e for e in ledger_snapshot["latest"]
            if type(e) is dict
            and e.get("messageId") == messages[peer]
            and e.get("audience") == peer
            and e.get("eventType") == "master.health"
            and e.get("stage") in ("TRANSPORT_ACKED", "OPERATOR_ACKED")
        ]
        if len(entries) != 1:
            return hold
        records[peer] = messages[peer]
    return {
        "accepted": True,
        "reason": ACCEPTED383,
        "receipts": records,
        "historicalOnly": True,
        "currentUptimeVerified": False,
        "operatorAcknowledged": False,
        "ql340cReceiverAuthorized": False,
    }


def deliver_pair_once383(
    *,
    enrollment: dict[str, Any],
    registry: Registry347,
    journal: MasterDeliveryLedger352,
    bus: MasterEventBus351,
    signing_key: Ed25519PrivateKey,
    signing_key_id: str,
    peers: dict[str, PeerEnrollment348],
    now_ms: int,
) -> dict[str, Any]:
    """Queue both source-bound envelopes, then perform one bounded live POST each.

    Failed/partial deliveries remain explicitly HOLD. Never synthesizes receipts
    or deletes valid previous receipts on rollback.
    """
    hold = {"accepted": False, "reason": HOLD383, "receipts": {}}
    if not (
        master_transport352._on_original_host352()
        and type(enrollment) is dict
        and enrollment.get("accepted") is True
        and isinstance(registry, Registry347)
        and isinstance(journal, MasterDeliveryLedger352)
        and isinstance(bus, MasterEventBus351)
        and isinstance(signing_key, Ed25519PrivateKey)
        and type(now_ms) is int
        and peer_preflight383(peers)
    ):
        return hold
    manifest_sha = _digest(enrollment["payload"])
    manifest_peers = enrollment["payload"].get("peers", [])
    for recipient in PEERS383:
        peer = peers[recipient]
        matches = [
            p for p in manifest_peers
            if p.get("id") == recipient
            and p.get("hostname") == peer.hostname
            and p.get("port") == peer.port
            and p.get("tlsLeafPin") == peer.server_cert_pin
            and p.get("protocols") == ["1.1"]
            and "master.health.readonly" in p.get("capabilities", [])
        ]
        if len(matches) != 1:
            return hold
        if not any(
            registry.resolve(recipient, key.key_id, at_ms=now_ms)
            for key in registry.records if key.issuer == recipient
        ):
            return hold
    source = registry.resolve("rosevear-ai-hub", signing_key_id, at_ms=now_ms)
    signer_der = signing_key.public_key().public_bytes(
        Encoding.DER, PublicFormat.SubjectPublicKeyInfo
    )
    if source is None or source.public_der != signer_der:
        return hold
    readings = bus.recent(manifest_sha=manifest_sha, now_ms=now_ms)
    if readings.get("integrity") != "LOCAL_HASH_CHAIN_VALID":
        return hold
    originals = [
        e for e in readings["events"]
        if e.get("source") == "rosevear-ai-hub"
        and e.get("kind") == "module.observed"
        and type(e.get("observedAtMs")) is int
        and 0 <= now_ms - e["observedAtMs"] <= 90_000
    ]
    if not originals:
        return hold
    signed: dict[str, dict[str, Any]] = {}
    for recipient in PEERS383:
        event = signed_event352(
            private_key=signing_key, key_id=signing_key_id,
            audience=recipient, event_type="master.health",
            source_evidence_sha=originals[0]["evidenceDigest"], severity="INFO",
            manifest_sha=manifest_sha, now_ms=now_ms,
            nonce=secrets.token_urlsafe(32),
        )
        if event is None or not journal.queue(
            signed=event, registry=registry,
            manifest_sha=manifest_sha, now_ms=now_ms,
        ):
            return hold
        signed[recipient] = event
    messages = {p: event["payload"]["messageId"] for p, event in signed.items()}
    delivered = {}
    for recipient in PEERS383:
        result = deliver_mtls_event352(
            peer=peers[recipient], signed_event=signed[recipient],
            enrollment=enrollment, registry=registry,
            journal=journal, now_ms=now_ms,
        )
        delivered[recipient] = result.get("delivered") is True
    if not all(delivered.values()):
        return {
            **hold, "reason": "HOLD_PARTIAL_OR_MISSING_PEER_ACK",
            "messageIds": messages, "deliveryAttempts": delivered,
        }
    status = journal.status(manifest_sha=manifest_sha, now_ms=now_ms + 30_000, registry=registry)
    proof = verified_pair383(status, messages)
    return {**proof, "messageIds": messages, "deliveryAttempts": delivered}
