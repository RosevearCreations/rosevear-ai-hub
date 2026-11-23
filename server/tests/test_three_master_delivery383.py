"""Build383 no-false-GREEN and peer identity safety regression."""
from __future__ import annotations

from pathlib import Path

from rosevear_ai_hub.three_master_delivery383 import (
    PEERS383, private_ip383, peer_preflight383, verified_pair383,
)
from rosevear_ai_hub.transport348 import PeerEnrollment348


def test_only_private_literal_ip_not_dns_or_public():
    for value in ("192.168.68.110", "10.0.0.20", "172.31.0.1", "100.100.100.100"):
        assert private_ip383(value)
    for value in ("example.com", "8.8.8.8", "127.0.0.1", "169.254.1.1", "::1", "", "192.168.68.110.evil"):
        assert not private_ip383(value)


def test_missing_peer_and_mixed_receipts_never_green():
    messages = {"ai-data-platform": "a" * 64, "rosevear-comms-hub": "b" * 64}
    good = {
        "stage": "SIGNED_HISTORICAL_ACKS_NOT_CURRENT_PEER_HEALTH",
        "latest": [
            {"messageId": messages[p], "audience": p, "eventType": "master.health", "stage": "TRANSPORT_ACKED"}
            for p in PEERS383
        ],
    }
    assert verified_pair383(good, messages)["accepted"]
    assert verified_pair383(good, messages)["currentUptimeVerified"] is False
    assert verified_pair383(good, messages)["ql340cReceiverAuthorized"] is False
    assert not verified_pair383({**good, "stage": "HOLD"}, messages)["accepted"]
    assert not verified_pair383({**good, "latest": good["latest"][:1]}, messages)["accepted"]
    assert not verified_pair383({**good, "latest": [good["latest"][0], {**good["latest"][1], "stage": "QUEUED"}]}, messages)["accepted"]
    assert not verified_pair383(good, {**messages, "rosevear-comms-hub": "a" * 64})["accepted"]
    assert not verified_pair383({**good, "latest": [good["latest"][0], {**good["latest"][1], "audience": "ai-data-platform"}]}, messages)["accepted"]


def test_tls_preflight_needs_both_and_independent_custody(tmp_path: Path):
    assert not peer_preflight383({})
    def peer(destination: str):
        return PeerEnrollment348(
            source="rosevear-ai-hub", destination=destination,
            hostname="192.168.68.3", port=8443,
            server_cert_pin="a" * 64, client_cert_pin="b" * 64,
            ca_file=tmp_path / "ca", client_cert_file=tmp_path / "cert",
            client_key_file=tmp_path / "key", peer_protocols=("1.1",),
            peer_capabilities=("master.health.readonly",), owner_approved=True,
        )
    peers = {p: peer(p) for p in PEERS383}
    assert not peer_preflight383(peers)
    peers[PEERS383[1]] = PeerEnrollment348(
        **{**peers[PEERS383[1]].__dict__, "hostname": "evil.example"}
    )
    assert not peer_preflight383(peers)
