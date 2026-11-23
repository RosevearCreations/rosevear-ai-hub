"""Original-host owner-supervised Build383 live two-peer delivery, no auto-start."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import ssl
import sys
import time
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from rosevear_ai_hub.master_bus351 import MasterEventBus351
from rosevear_ai_hub.master_registry352 import load_master_registry352
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST, load_local_manifest349
from rosevear_ai_hub.master_transport352 import MasterDeliveryLedger352
from rosevear_ai_hub.service_identity347 import _digest
from rosevear_ai_hub.three_master_delivery383 import (
    PEERS383, deliver_pair_once383, peer_preflight383,
)
from rosevear_ai_hub.transport348 import PeerEnrollment348

TAG383 = {"ai-data-platform": "AIDP", "rosevear-comms-hub": "COMMS"}


def _envpath(name: str) -> Path | None:
    raw = os.environ.get(name)
    if not raw:
        return None
    return Path(raw)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build383 one-shot real two-Master signed delivery")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--preflight", action="store_true")
    mode.add_argument("--deliver-once", action="store_true")
    mode.add_argument("--status", action="store_true")
    args = parser.parse_args()
    if os.name != "nt" or platform.node().upper() != ORIGINAL_HOST:
        print("HOLD_ORIGINAL_WINDOWS_HOST_ONLY")
        return 2
    owner_pub = _envpath("ROSEVEAR_QL458_OWNER_KEY_PATH")
    manifest_path = _envpath("ROSEVEAR_QL458_MANIFEST_PATH")
    registry_path = _envpath("ROSEVEAR_QL461_MASTER_REGISTRY_PATH")
    outbox_path = _envpath("ROSEVEAR_QL461_OUTBOX_DB")
    pin = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PIN")
    if not all((owner_pub, manifest_path, registry_path, outbox_path, pin)):
        print("HOLD_OWNER_CONFIGURATION_MISSING")
        return 2
    now = int(time.time() * 1000)
    try:
        if owner_pub.is_symlink() or owner_pub.stat().st_size != 32:
            return 2
        enrollment = load_local_manifest349(
            manifest_path, owner_pub, pin, now, platform.node(),
        )
        if not enrollment.get("accepted"):
            print("HOLD_OWNER_ENROLLMENT")
            return 2
        registry = load_master_registry352(
            path=registry_path, owner_public=owner_pub.read_bytes(),
            owner_pin=pin, enrollment=enrollment,
            now_ms=now, machine_name=platform.node(),
        )
        if registry is None:
            print("HOLD_OWNER_SIGNED_PEER_REGISTRY")
            return 2
        journal = MasterDeliveryLedger352(outbox_path)
        if not journal.initialize():
            print("HOLD_DURABLE_ACK_JOURNAL")
            return 2
        if args.status:
            status = journal.status(
                manifest_sha=_digest(enrollment["payload"]), now_ms=now,
                registry=registry,
            )
            print(json.dumps(status, sort_keys=True))
            return 0 if status["stage"] != "HOLD" else 2
        peers = {}
        for name in PEERS383:
            manifest = [
                p for p in enrollment["payload"]["peers"] if p.get("id") == name
            ]
            if len(manifest) != 1:
                print("HOLD_MISSING_EXACT_PEER")
                return 2
            meta = manifest[0]
            tag = TAG383[name]
            prefix = "ROSEVEAR_383_" + tag + "_"
            ca, cert, key = (
                _envpath(prefix + suffix) for suffix in ("TLS_CA", "TLS_CERT", "TLS_KEY")
            )
            if not all((ca, cert, key)):
                print("HOLD_PER_PEER_TLS_CONFIG")
                return 2
            cert_sha = hashlib.sha256(
                ssl.PEM_cert_to_DER_cert(cert.read_text(encoding="ascii"))
            ).hexdigest()
            peers[name] = PeerEnrollment348(
                source="rosevear-ai-hub", destination=name,
                hostname=meta["hostname"], port=meta["port"],
                server_cert_pin=meta["tlsLeafPin"], client_cert_pin=cert_sha,
                ca_file=ca, client_cert_file=cert, client_key_file=key,
                peer_protocols=("1.1",),
                peer_capabilities=tuple(meta["capabilities"]), owner_approved=True,
            )
        if not peer_preflight383(peers):
            print("HOLD_INDEPENDENT_PRIVATE_TLS_CUSTODY")
            return 2
        if args.preflight:
            print("PREFLIGHT_ONLY_NO_NETWORK_OR_PEER_ACK")
            return 0
        signing_path = _envpath("ROSEVEAR_QL461_MASTER_SIGNING_KEY_PATH")
        key_id = os.environ.get("ROSEVEAR_QL461_MASTER_SIGNING_KEY_ID")
        bus_path = _envpath("ROSEVEAR_QL460_EVENT_DB")
        if not all((signing_path, key_id, bus_path)):
            return 2
        if signing_path.is_symlink() or signing_path.stat().st_size != 32:
            return 2
        signer = Ed25519PrivateKey.from_private_bytes(signing_path.read_bytes())
        result = deliver_pair_once383(
            enrollment=enrollment, registry=registry, journal=journal,
            bus=MasterEventBus351(bus_path), signing_key=signer,
            signing_key_id=key_id, peers=peers, now_ms=now,
        )
        print(json.dumps(result, sort_keys=True))
        return 0 if result["accepted"] else 2
    except (OSError, UnicodeError, TypeError, KeyError, ValueError, ssl.SSLError):
        print("HOLD_INVALID_PROTECTED_CONFIGURATION")
        return 2


if __name__ == "__main__":
    sys.exit(main())
