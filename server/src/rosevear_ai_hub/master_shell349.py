"""Build 349 / QL-458: owner-pinned original-host enrollment and evidence review.

No network access, installation, service start, remote command or claim of CONNECTED.
The only enrollment input is an independently signed, locally provisioned manifest.
"""

from __future__ import annotations

import hashlib
import json
import platform
import sqlite3
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from rosevear_ai_hub.service_identity347 import Registry347, _canonical, _digest, _sha
from rosevear_ai_hub.transport348 import (
    PeerEnrollment348,
    PilotAckJournal348,
    verify_signed_ack348,
)

SCHEMA349 = "rosevear.hub.original-host-enrollment349.v1"
ORIGINAL_HOST = "DESKTOP-AE894KC"
MASTER_MODULES = ("ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub")
SLAVE_SHELLS = ("iCamp", "YW")
BUSINESSES = ("devilndove", "rosiedazzlers")
PEERS = (*MASTER_MODULES, *SLAVE_SHELLS, *BUSINESSES)
CAPABILITIES = ("governance.readonly", "business.health.readonly", "master.health.readonly")
THEMES = ("instrument", "nebula", "aurora")
MAX_MANIFEST_BYTES = 32_768
MAX_VALIDITY_MS = 30 * 86_400_000


def _hold(reason: str) -> dict[str, Any]:
    return {"accepted": False, "reason": reason, "payload": None}


def verify_manifest349(
    manifest: Any,
    public_der: bytes,
    expected_public_pin: str,
    now_ms: int,
    machine_name: str,
) -> dict[str, Any]:
    """Verify full signed intent and original machine identity; never activate services."""
    if not (
        type(now_ms) is int
        and type(machine_name) is str
        and machine_name.upper() == ORIGINAL_HOST
        and type(public_der) is bytes
        and _sha(expected_public_pin)
        and hashlib.sha256(public_der).hexdigest() == expected_public_pin
        and type(manifest) is dict
        and set(manifest) == {"payload", "signature"}
        and type(manifest["payload"]) is dict
        and type(manifest["signature"]) is str
        and len(manifest["signature"]) == 128
    ):
        return _hold("HOLD_ORIGINAL_HOST_OR_OWNER_PIN")
    p = manifest["payload"]
    if not (
        set(p) == {"schema", "originalHost", "issuedAtMs", "expiresAtMs", "modules", "peers"}
        and p["schema"] == SCHEMA349
        and p["originalHost"] == ORIGINAL_HOST
        and type(p["issuedAtMs"]) is int
        and type(p["expiresAtMs"]) is int
        and 0 <= now_ms - p["issuedAtMs"] <= MAX_VALIDITY_MS
        and p["issuedAtMs"] < p["expiresAtMs"] <= p["issuedAtMs"] + MAX_VALIDITY_MS
        and now_ms < p["expiresAtMs"]
        and type(p["modules"]) is list
        and len(p["modules"]) == 3
        and type(p["peers"]) is list
        and len(p["peers"]) <= 6
    ):
        return _hold("HOLD_MANIFEST_SCHEMA_OR_FRESHNESS")
    modules = p["modules"]
    if not all(
        type(m) is dict
        and set(m) == {"id", "desiredEnabled", "theme"}
        and m["id"] == app
        and type(m["desiredEnabled"]) is bool
        and m["theme"] in THEMES
        for m, app in zip(modules, MASTER_MODULES, strict=True)
    ):
        return _hold("HOLD_MODULE_CONFIGURATION")
    seen: set[str] = set()
    for peer in p["peers"]:
        if not (
            type(peer) is dict
            and set(peer)
            == {"id", "hostname", "port", "tlsLeafPin", "capabilities", "protocols"}
            and type(peer["id"]) is str
            and peer["id"] in PEERS
            and peer["id"] != "rosevear-ai-hub"
            and peer["id"] not in seen
            and type(peer["hostname"]) is str
            and 1 <= len(peer["hostname"]) <= 253
            and peer["hostname"].isascii()
            and not any(c in peer["hostname"] for c in "/:@\\ ")
            and ".." not in peer["hostname"]
            and type(peer["port"]) is int
            and 1 <= peer["port"] <= 65535
            and _sha(peer["tlsLeafPin"])
            and type(peer["capabilities"]) is list
            and len(peer["capabilities"]) >= 1
            and len(set(peer["capabilities"])) == len(peer["capabilities"])
            and set(peer["capabilities"]).issubset(CAPABILITIES)
            and type(peer["protocols"]) is list
            and set(peer["protocols"]) == {"1.1"}
        ):
            return _hold("HOLD_PEER_ALLOWLIST_OR_PIN")
        seen.add(peer["id"])
    try:
        Ed25519PublicKey.from_public_bytes(public_der).verify(
            bytes.fromhex(manifest["signature"]), _canonical(p)
        )
    except (InvalidSignature, TypeError, ValueError):
        return _hold("HOLD_MANIFEST_SIGNATURE_INVALID")
    return {"accepted": True, "reason": "SIGNED_LOCAL_INTENT_ONLY", "payload": p}


def load_local_manifest349(
    manifest_path: Path | None,
    public_key_path: Path | None,
    expected_public_pin: str | None,
    now_ms: int,
    machine_name: str | None = None,
) -> dict[str, Any]:
    """No automatic enrollment: caller supplies protected paths and independently pinned key."""
    if not (
        isinstance(manifest_path, Path)
        and isinstance(public_key_path, Path)
        and manifest_path.is_file()
        and public_key_path.is_file()
        and not manifest_path.is_symlink()
        and not public_key_path.is_symlink()
        and type(expected_public_pin) is str
    ):
        return _hold("HOLD_NO_OWNER_PROVISIONED_LOCAL_MANIFEST")
    try:
        if manifest_path.stat().st_size > MAX_MANIFEST_BYTES:
            return _hold("HOLD_MANIFEST_TOO_LARGE")
        if public_key_path.stat().st_size != 32:
            return _hold("HOLD_PUBLIC_KEY_FORMAT")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        public_key = public_key_path.read_bytes()
    except (OSError, UnicodeError, ValueError, json.JSONDecodeError):
        return _hold("HOLD_MANIFEST_READ_INVALID")
    return verify_manifest349(
        manifest, public_key, expected_public_pin, now_ms, machine_name or platform.node()
    )


def review_durable_ack349(
    *,
    peer: PeerEnrollment348,
    registry: Registry347,
    journal: PilotAckJournal348,
    envelope: Any,
    body: Any,
    ack: Any,
    now_ms: int,
) -> dict[str, Any]:
    """Trust the QL-457 signed ACK and exact persisted receipt, not a UI checkbox."""
    if not (
        isinstance(peer, PeerEnrollment348)
        and isinstance(registry, Registry347)
        and isinstance(journal, PilotAckJournal348)
        and type(envelope) is dict
        and type(body) is dict
        and type(ack) is dict
        and type(now_ms) is int
        and verify_signed_ack348(
            ack=ack, envelope=envelope, body=body, peer=peer, registry=registry, now_ms=now_ms
        )
    ):
        return {"verified": False, "reason": "HOLD_INVALID_SIGNED_ACK"}
    try:
        message_id = envelope["payload"]["messageId"]
        with sqlite3.connect(f"file:{journal.path}?mode=ro", uri=True, timeout=2) as db:
            stored = db.execute(
                """SELECT source, destination, message_digest, ack_digest, observed_ms
                FROM pilot_ack348 WHERE message_id = ?""",
                (message_id,),
            ).fetchone()
        if not (
            stored
            and stored[0] == peer.source
            and stored[1] == peer.destination
            and stored[2] == _digest(envelope)
            and stored[3] == _digest(ack)
            and type(stored[4]) is int
            and 0 <= now_ms - stored[4] <= 60_000
        ):
            return {"verified": False, "reason": "HOLD_LEDGER_MISSING_OR_STALE"}
    except (sqlite3.Error, OSError, KeyError, TypeError, ValueError):
        return {"verified": False, "reason": "HOLD_LEDGER_UNAVAILABLE"}
    return {
        "verified": True,
        "reason": "SIGNED_PILOT_ACK_AND_DURABLE_LEDGER_MATCH",
        "productionConnected": False,
        "physicalReceiverVerified": False,
    }


def capability_snapshot349(enrollment: dict[str, Any]) -> dict[str, Any]:
    """Separates owner-signed configuration from actual runtime health evidence."""
    accepted = enrollment.get("accepted") is True
    payload = enrollment.get("payload") if accepted else None
    local_modules = {m["id"]: m for m in payload["modules"]} if payload else {}
    trusted_peers = {p["id"]: p for p in payload["peers"]} if payload else {}
    return {
        "schema": "rosevear.hub.ql458-server-shell-readiness.v1",
        "sourceBuild": 349,
        "serverShell": "ai-data-platform",
        "automationHost": ORIGINAL_HOST,
        "verifiedLocalOwnerManifest": accepted,
        "enrollmentReason": enrollment.get("reason", "HOLD_UNVERIFIED"),
        "protocolPreferred": "1.1",
        "protocolLegacyCompatible": "1.0",
        "modules": [
            {
                "id": name,
                "role": ("server-shell", "automation-runtime", "communications")[i],
                "desiredEnabled": (
                    local_modules[name]["desiredEnabled"] if name in local_modules else None
                ),
                "theme": local_modules[name]["theme"] if name in local_modules else "instrument",
                "runtimeState": "NOT_VERIFIED",
                "independentRelease": True,
            }
            for i, name in enumerate(MASTER_MODULES)
        ],
        "applications": [
            {
                "id": name,
                "kind": "slave-shell" if name in SLAVE_SHELLS else "business",
                "signedPeerIntentPresent": name in trusted_peers,
                "connectivity": "UNVERIFIED",
                "latencyMs": None,
                "errorCount": None,
                "lastVerifiedAckUtc": None,
                "capabilities": (
                    trusted_peers[name]["capabilities"] if name in trusted_peers else []
                ),
            }
            for name in (*SLAVE_SHELLS, *BUSINESSES)
        ],
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "incident": "OPEN",
        "activationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "messageDelivered": False,
        "crossAppConnectivityVerified": False,
        "configurationTogglesAreNotServiceControl": True,
    }
