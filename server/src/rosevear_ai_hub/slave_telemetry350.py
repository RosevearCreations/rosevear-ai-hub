"""Build 350 / QL-459: independent mTLS and peer-signed Slave Shell observations.

Peers must explicitly implement the versioned read-only health contract before
live metrics exist. No generated, guessed, or browser-submitted observations.
"""

from __future__ import annotations

import http.client
import json
import sqlite3
import ssl
import time
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.serialization import load_der_public_key

from rosevear_ai_hub.master_shell349 import SLAVE_SHELLS
from rosevear_ai_hub.service_identity347 import Registry347, _canonical, _digest, _sha
from rosevear_ai_hub.transport348 import (
    MAX_WIRE_BYTES,
    PeerEnrollment348,
    _enrolled,
    _tls_peer_pin348,
)

TELEMETRY_SCHEMA350 = "rosevear.service.slave-health350.v1"
TELEMETRY_PATH350 = "/internal/rosevear/health/read-only/v1"
MAX_TELEMETRY_AGE_MS = 90_000
SIGNED_FIELDS = {
    "schema", "protocolVersion", "issuer", "audience", "keyId", "nonce",
    "issuedAtMs", "expiresAtMs", "state", "uptimeSec", "recentErrors", "queueLag",
}


def verify_signed_health350(
    sample: Any, *, peer_id: str, registry: Registry347, now_ms: int,
) -> dict[str, Any]:
    """Authenticity of signed measurements, separate from authenticated TLS channel."""
    if not (
        type(sample) is dict
        and set(sample) == {"payload", "signature"}
        and type(sample["payload"]) is dict
        and set(sample["payload"]) == SIGNED_FIELDS
        and type(sample["signature"]) is str
        and len(sample["signature"]) == 128
        and type(peer_id) is str and peer_id in SLAVE_SHELLS
        and isinstance(registry, Registry347)
        and type(now_ms) is int
    ):
        return {"verified": False, "reason": "HOLD_SIGNED_HEALTH_SCHEMA"}
    p = sample["payload"]
    if not (
        p["schema"] == TELEMETRY_SCHEMA350
        and p["protocolVersion"] == "1.1"
        and p["issuer"] == peer_id
        and p["audience"] == "rosevear-ai-hub"
        and type(p["keyId"]) is str and len(p["keyId"]) >= 12
        and type(p["nonce"]) is str and 24 <= len(p["nonce"]) <= 128
        and p["nonce"].isascii()
        and all(c.isalnum() or c in "_-" for c in p["nonce"])
        and type(p["issuedAtMs"]) is int and type(p["expiresAtMs"]) is int
        and 0 <= now_ms - p["issuedAtMs"] <= MAX_TELEMETRY_AGE_MS
        and p["issuedAtMs"] < p["expiresAtMs"] <= p["issuedAtMs"] + MAX_TELEMETRY_AGE_MS
        and now_ms < p["expiresAtMs"]
        and p["state"] in ("HEALTHY", "DEGRADED", "UNHEALTHY")
        and all(
            type(p[name]) is int and 0 <= p[name] <= 2_147_483_647
            for name in ("uptimeSec", "recentErrors", "queueLag")
        )
    ):
        return {"verified": False, "reason": "HOLD_SIGNED_HEALTH_SCOPE_OR_STALE"}
    record = registry.resolve(peer_id, p["keyId"], at_ms=now_ms)
    if record is None or registry.resolve(
        peer_id, p["keyId"], at_ms=p["issuedAtMs"]
    ) is None:
        return {"verified": False, "reason": "HOLD_UNENROLLED_OR_REVOKED_PEER_KEY"}
    try:
        load_der_public_key(record.public_der).verify(
            bytes.fromhex(sample["signature"]), _canonical(p)
        )
    except (InvalidSignature, TypeError, ValueError, AttributeError):
        return {"verified": False, "reason": "HOLD_INVALID_PEER_SIGNATURE"}
    return {"verified": True, "reason": "SIGNED_PEER_HEALTH_VALID", "payload": p}


class TelemetryJournal350:
    """Only the local, TLS-authenticated probe writes bounded health readings."""

    def __init__(self, path: Path):
        self.path = path

    def initialize(self) -> bool:
        if self.path.is_symlink() or not self.path.parent.is_dir():
            return False
        try:
            with sqlite3.connect(self.path, timeout=3) as db:
                db.execute("PRAGMA journal_mode=WAL")
                db.execute("PRAGMA synchronous=FULL")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS telemetry350 (
                    peer_id TEXT NOT NULL, nonce TEXT NOT NULL,
                    manifest_digest TEXT NOT NULL, leaf_pin TEXT NOT NULL,
                    signed_sample TEXT NOT NULL, observed_ms INTEGER NOT NULL,
                    latency_ms INTEGER NOT NULL, PRIMARY KEY(peer_id, nonce))"""
                )
            return True
        except (sqlite3.Error, OSError):
            return False

    def record(
        self, *, peer_id: str, manifest_digest: str, pin: str,
        sample: dict[str, Any], observed_ms: int, latency_ms: int,
    ) -> bool:
        if not (
            peer_id in SLAVE_SHELLS and _sha(manifest_digest) and _sha(pin)
            and type(observed_ms) is int
            and type(latency_ms) is int and 0 <= latency_ms <= 120_000
            and self.path.is_file() and not self.path.is_symlink()
        ):
            return False
        try:
            with sqlite3.connect(self.path, isolation_level=None, timeout=3) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                latest = db.execute(
                    "SELECT MAX(observed_ms) FROM telemetry350 WHERE peer_id = ?",
                    (peer_id,),
                ).fetchone()[0]
                if latest is not None and observed_ms < latest:
                    db.execute("ROLLBACK")
                    return False
                db.execute(
                    "INSERT INTO telemetry350 VALUES (?,?,?,?,?,?,?)",
                    (
                        peer_id, sample["payload"]["nonce"], manifest_digest, pin,
                        json.dumps(sample, sort_keys=True, separators=(",", ":")),
                        observed_ms, latency_ms,
                    ),
                )
                db.execute("COMMIT")
            return True
        except (sqlite3.Error, OSError, TypeError, KeyError, ValueError):
            return False

    def recent(
        self, *, peer_id: str, manifest_digest: str, pin: str,
        now_ms: int, registry: Registry347 | None = None,
    ) -> dict[str, Any] | None:
        """Revalidate signing key if registry provided; otherwise no trusted display."""
        if not (
            peer_id in SLAVE_SHELLS and _sha(manifest_digest) and _sha(pin)
            and isinstance(registry, Registry347)
            and self.path.is_file() and not self.path.is_symlink()
            and type(now_ms) is int
        ):
            return None
        try:
            with sqlite3.connect(f"file:{self.path}?mode=ro", uri=True, timeout=2) as db:
                result = db.execute(
                    """SELECT signed_sample, observed_ms, latency_ms, manifest_digest, leaf_pin
                    FROM telemetry350 WHERE peer_id = ?
                    ORDER BY observed_ms DESC LIMIT 1""",
                    (peer_id,),
                ).fetchone()
            if not result:
                return None
            sample_json, observed, latency, digest, recorded_pin = result
            if not (
                digest == manifest_digest and recorded_pin == pin
                and type(observed) is int
                and 0 <= now_ms - observed <= MAX_TELEMETRY_AGE_MS
                and type(latency) is int and 0 <= latency <= 120_000
            ):
                return None
            sample = json.loads(sample_json)
            verdict = verify_signed_health350(
                sample, peer_id=peer_id, registry=registry, now_ms=now_ms,
            )
            if not verdict["verified"]:
                return None
            p = verdict["payload"]
            return {
                "state": p["state"],
                "uptimeSec": p["uptimeSec"],
                "recentErrors": p["recentErrors"],
                "queueLag": p["queueLag"],
                "latencyMs": latency,
                "observedAtMs": observed,
                "proof": "FRESH_PINNED_MTLS_AND_ED25519_JOURNAL",
            }
        except (sqlite3.Error, OSError, ValueError, TypeError, KeyError):
            return None


def probe_slave350(
    *, peer: PeerEnrollment348, enrollment: dict[str, Any],
    registry: Registry347, journal: TelemetryJournal350, now_ms: int,
) -> dict[str, Any]:
    """One actual mTLS GET, exact leaf pin, Ed25519 peer signature, durable replay gate.

    Called only by trusted original-host local supervisor. No UI endpoints call it.
    """
    if not (
        isinstance(peer, PeerEnrollment348) and _enrolled(peer)
        and peer.source == "rosevear-ai-hub"
        and peer.destination in SLAVE_SHELLS
        and "business.health.readonly" in peer.peer_capabilities
        and "1.1" in peer.peer_protocols
        and enrollment.get("accepted") is True
        and isinstance(registry, Registry347)
        and isinstance(journal, TelemetryJournal350)
        and type(now_ms) is int
    ):
        return {"verified": False, "reason": "HOLD_UNENROLLED_OR_UNSUPPORTED_SLAVE"}
    matches = [
        item for item in enrollment["payload"]["peers"]
        if item["id"] == peer.destination
        and item["hostname"] == peer.hostname
        and item["port"] == peer.port
        and item["tlsLeafPin"] == peer.server_cert_pin
        and "business.health.readonly" in item["capabilities"]
    ]
    if len(matches) != 1:
        return {"verified": False, "reason": "HOLD_OWNER_PEER_MANIFEST_MISMATCH"}
    conn = None
    started = time.monotonic()
    try:
        ctx = ssl.create_default_context(cafile=str(peer.ca_file))
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.verify_mode = ssl.CERT_REQUIRED
        ctx.check_hostname = True
        ctx.load_cert_chain(certfile=str(peer.client_cert_file), keyfile=str(peer.client_key_file))
        conn = http.client.HTTPSConnection(peer.hostname, peer.port, timeout=5, context=ctx)
        conn.connect()
        if not _tls_peer_pin348(conn.sock, peer.server_cert_pin):
            return {"verified": False, "reason": "HOLD_TLS_LEAF_PIN_MISMATCH"}
        conn.request("GET", TELEMETRY_PATH350, headers={"Accept": "application/json"})
        response = conn.getresponse()
        if response.status != 200 or response.getheader("Content-Type", "").split(";")[0] != (
            "application/json"
        ):
            return {"verified": False, "reason": "HOLD_PEER_HEALTH_RESPONSE"}
        raw = response.read(MAX_WIRE_BYTES + 1)
        if len(raw) > MAX_WIRE_BYTES:
            return {"verified": False, "reason": "HOLD_PEER_HEALTH_TOO_LARGE"}
        sample = json.loads(raw)
        verdict = verify_signed_health350(
            sample, peer_id=peer.destination, registry=registry, now_ms=now_ms,
        )
        if not verdict["verified"]:
            return verdict
        latency = round((time.monotonic() - started) * 1000)
        if not journal.record(
            peer_id=peer.destination, manifest_digest=_digest(enrollment["payload"]),
            pin=peer.server_cert_pin, sample=sample, observed_ms=now_ms,
            latency_ms=latency,
        ):
            return {"verified": False, "reason": "HOLD_TELEMETRY_REPLAY_OR_LEDGER"}
        return {
            "verified": True, "reason": "PINNED_TLS_SIGNED_SLAVE_SNAPSHOT",
            "slaveId": peer.destination, "physicalReceiverVerified": False,
            "globalCrossAppConnected": False,
        }
    except (
        TimeoutError, OSError, ssl.SSLError, ValueError, TypeError,
        http.client.HTTPException, json.JSONDecodeError,
    ):
        return {"verified": False, "reason": "HOLD_TLS_NETWORK_OR_PEER_UNVERIFIED"}
    finally:
        if conn is not None:
            conn.close()
