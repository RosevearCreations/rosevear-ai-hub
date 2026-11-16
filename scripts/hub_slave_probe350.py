"""QL-459 local-only signed TLS Slave Shell health probe. Never an HTTP route.

Run from original Windows host with signed QL-458 manifest and QL-459 registry.
Read-only GET to independently enrolled iCamp/YW only; no writable endpoints.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import platform
import ssl
import sys
import time
from pathlib import Path

from rosevear_ai_hub.master_runtime350 import load_owner_registry350
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST, load_local_manifest349
from rosevear_ai_hub.slave_telemetry350 import TelemetryJournal350, probe_slave350
from rosevear_ai_hub.transport348 import PeerEnrollment348


def run() -> int:
    parser = argparse.ArgumentParser(description="Pinned mTLS Slave Shell health observation")
    parser.add_argument("--peer", required=True, choices=("YW", "iCamp"))
    parser.add_argument("--watch", action="store_true", help="Opt-in 60-second health loop")
    args = parser.parse_args()
    if os.name != "nt" or platform.node().upper() != ORIGINAL_HOST:
        print("HOLD_ORIGINAL_WINDOWS_HOST_REQUIRED")
        return 2
    names = {
        "manifest": "ROSEVEAR_QL458_MANIFEST_PATH",
        "owner": "ROSEVEAR_QL458_OWNER_KEY_PATH",
        "pin": "ROSEVEAR_QL458_OWNER_KEY_PIN",
        "registry": "ROSEVEAR_QL459_REGISTRY_PATH",
        "journal": "ROSEVEAR_QL459_TELEMETRY_DB",
        "ca": "ROSEVEAR_QL459_TLS_CA",
        "cert": "ROSEVEAR_QL459_TLS_CERT",
        "key": "ROSEVEAR_QL459_TLS_KEY",
    }
    values = {key: os.environ.get(name) for key, name in names.items()}
    if not all(values.values()):
        print("HOLD_MISSING_LOCAL_TLS_AND_OWNER_CUSTODY")
        return 2
    key_path = Path(values["owner"])
    try:
        if key_path.is_symlink() or key_path.stat().st_size != 32:
            return 2
        owner_public = key_path.read_bytes()
        client_pem = Path(values["cert"]).read_text(encoding="ascii")
        client_der = ssl.PEM_cert_to_DER_cert(client_pem)
        client_pin = hashlib.sha256(client_der).hexdigest()
    except (OSError, ValueError, UnicodeError):
        print("HOLD_INVALID_LOCAL_CREDENTIAL_CUSTODY")
        return 2
    journal = TelemetryJournal350(Path(values["journal"]))
    if not journal.initialize():
        print("HOLD_DURABLE_TELEMETRY_UNAVAILABLE")
        return 2

    def once() -> bool:
        now = int(time.time() * 1000)
        enrollment = load_local_manifest349(
            Path(values["manifest"]), key_path, values["pin"], now, platform.node(),
        )
        if not enrollment["accepted"]:
            print("HOLD_ORIGINAL_HOST_ENROLLMENT")
            return False
        registry = load_owner_registry350(
            path=Path(values["registry"]), owner_key=owner_public,
            owner_pin=values["pin"], enrollment=enrollment,
            now_ms=now, machine_name=platform.node(),
        )
        if registry is None:
            print("HOLD_SIGNED_SLAVE_IDENTITY_REGISTRY")
            return False
        matches = [p for p in enrollment["payload"]["peers"] if p["id"] == args.peer]
        if len(matches) != 1:
            print("HOLD_SLAVE_NOT_SIGNED_IN_MANIFEST")
            return False
        meta = matches[0]
        peer = PeerEnrollment348(
            source="rosevear-ai-hub", destination=args.peer,
            hostname=meta["hostname"], port=meta["port"],
            server_cert_pin=meta["tlsLeafPin"], client_cert_pin=client_pin,
            ca_file=Path(values["ca"]), client_cert_file=Path(values["cert"]),
            client_key_file=Path(values["key"]), peer_protocols=tuple(meta["protocols"]),
            peer_capabilities=tuple(meta["capabilities"]), owner_approved=True,
        )
        result = probe_slave350(
            peer=peer, enrollment=enrollment, registry=registry,
            journal=journal, now_ms=now,
        )
        print(args.peer, result["reason"])
        return result["verified"]

    if not args.watch:
        return 0 if once() else 2
    try:
        while True:
            if not once():
                return 2
            time.sleep(60)
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    sys.exit(run())
