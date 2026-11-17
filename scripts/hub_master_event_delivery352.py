"""QL-461 trusted original-host CLI for operator issue delivery and peer ACKs.

Subcommands are explicit and local; no HTTP/UI mutation route or unsolicited
receiver control. Peers must implement the independent read-only event sink.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import secrets
import ssl
import sys
import time
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from rosevear_ai_hub.master_bus351 import MasterEventBus351
from rosevear_ai_hub.master_registry352 import load_master_registry352
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST, load_local_manifest349
from rosevear_ai_hub.master_transport352 import (
    MasterDeliveryLedger352,
    deliver_mtls_event352,
    signed_event352,
)
from rosevear_ai_hub.service_identity347 import _digest
from rosevear_ai_hub.transport348 import PeerEnrollment348


def main() -> int:
    parser = argparse.ArgumentParser(description="Signed three-Master event and ACK custody")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--enqueue-issues", action="store_true")
    mode.add_argument("--enqueue-pilot", action="store_true")
    mode.add_argument("--deliver", help="Deliver exact queued SHA-256 message ID")
    mode.add_argument("--operator-ack", type=Path, help="Signed Comms operator ACK receipt file")
    mode.add_argument("--status", action="store_true")
    parser.add_argument("--message-id", help="SHA-256 event ID for operator-ack")
    parser.add_argument(
        "--pilot-audience", choices=("ai-data-platform", "rosevear-comms-hub"),
        help="One independently enrolled Master peer, no broadcast",
    )
    args = parser.parse_args()
    if os.name != "nt" or platform.node().upper() != ORIGINAL_HOST:
        print("HOLD_ORIGINAL_WINDOWS_HOST_ONLY")
        return 2
    values = {
        name: os.environ.get(name) for name in (
            "ROSEVEAR_QL458_MANIFEST_PATH", "ROSEVEAR_QL458_OWNER_KEY_PATH",
            "ROSEVEAR_QL458_OWNER_KEY_PIN", "ROSEVEAR_QL461_MASTER_REGISTRY_PATH",
            "ROSEVEAR_QL461_OUTBOX_DB",
        )
    }
    if not all(values.values()):
        return 2
    now = int(time.time() * 1000)
    public_path = Path(values["ROSEVEAR_QL458_OWNER_KEY_PATH"])
    enrollment = load_local_manifest349(
        Path(values["ROSEVEAR_QL458_MANIFEST_PATH"]), public_path,
        values["ROSEVEAR_QL458_OWNER_KEY_PIN"], now, platform.node(),
    )
    if not enrollment["accepted"]:
        return 2
    registry = load_master_registry352(
        path=Path(values["ROSEVEAR_QL461_MASTER_REGISTRY_PATH"]),
        owner_public=public_path.read_bytes(),
        owner_pin=values["ROSEVEAR_QL458_OWNER_KEY_PIN"],
        enrollment=enrollment, now_ms=now, machine_name=platform.node(),
    )
    if registry is None:
        print("HOLD_SIGNED_MASTER_KEY_REGISTRY")
        return 2
    manifest_sha = _digest(enrollment["payload"])
    journal = MasterDeliveryLedger352(Path(values["ROSEVEAR_QL461_OUTBOX_DB"]))
    if not journal.initialize():
        print("HOLD_DURABLE_OUTBOX_UNAVAILABLE")
        return 2
    if args.status:
        print(json.dumps(journal.status(
            manifest_sha=manifest_sha, now_ms=now, registry=registry,
        ), sort_keys=True))
        return 0
    if args.operator_ack:
        if not args.message_id or len(args.message_id) != 64:
            return 2
        path = args.operator_ack
        if not path.is_file() or path.is_symlink() or path.stat().st_size > 8192:
            return 2
        try:
            signed = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError, UnicodeError):
            return 2
        ok = journal.mark_ack(
            message_id=args.message_id, signed_ack=signed, registry=registry,
            manifest_sha=manifest_sha, now_ms=now, operator_ack=True,
        )
        print("COMMS_SIGNED_OPERATOR_AUDIT_ACK_STORED" if ok else "HOLD_OPERATOR_ACK")
        return 0 if ok else 2
    if args.enqueue_issues or args.enqueue_pilot:
        key_path = os.environ.get("ROSEVEAR_QL461_MASTER_SIGNING_KEY_PATH")
        key_id = os.environ.get("ROSEVEAR_QL461_MASTER_SIGNING_KEY_ID")
        bus_path = os.environ.get("ROSEVEAR_QL460_EVENT_DB")
        if not all((key_path, key_id, bus_path)):
            return 2
        path = Path(key_path)
        if not path.is_file() or path.is_symlink() or path.stat().st_size != 32:
            return 2
        private = Ed25519PrivateKey.from_private_bytes(path.read_bytes())
        public_der = private.public_key().public_bytes(
            Encoding.DER, PublicFormat.SubjectPublicKeyInfo,
        )
        enrolled = registry.resolve("rosevear-ai-hub", key_id, at_ms=now)
        if enrolled is None or hashlib.sha256(public_der).hexdigest() != enrolled.pin_sha256:
            print("HOLD_MASTER_SIGNING_KEY_NOT_OWNER_ENROLLED")
            return 2
        evidence = MasterEventBus351(Path(bus_path)).recent(
            manifest_sha=manifest_sha, now_ms=now,
        )
        if evidence["integrity"] != "LOCAL_HASH_CHAIN_VALID":
            return 2
        if args.enqueue_pilot:
            if not args.pilot_audience:
                print("HOLD_PILOT_MUST_SELECT_EXACT_PEER")
                return 2
            peers = [
                p for p in enrollment["payload"]["peers"]
                if p["id"] == args.pilot_audience
                and p["protocols"] == ["1.1"]
                and "master.health.readonly" in p["capabilities"]
            ]
            if len(peers) != 1 or not any(
                registry.resolve(args.pilot_audience, key.key_id, at_ms=now)
                for key in registry.records
                if key.issuer == args.pilot_audience
            ):
                print("HOLD_PILOT_PEER_NOT_INDEPENDENTLY_ENROLLED")
                return 2
            originals = [
                e for e in evidence["events"]
                if e["source"] == "rosevear-ai-hub"
                and e["kind"] == "module.observed"
            ]
            if not originals:
                print("HOLD_NO_FRESH_ORIGINAL_HOST_SOURCE_EVENT")
                return 2
            signed = signed_event352(
                private_key=private,
                key_id=key_id,
                audience=args.pilot_audience,
                event_type="master.health",
                source_evidence_sha=originals[0]["evidenceDigest"],
                severity="INFO",
                manifest_sha=manifest_sha,
                now_ms=now,
                nonce=secrets.token_urlsafe(32),
            )
            if signed is None or not journal.queue(
                signed=signed, registry=registry,
                manifest_sha=manifest_sha, now_ms=now,
            ):
                print("HOLD_PILOT_NOT_QUEUED_OR_REPLAY")
                return 2
            print("ONE_SIGNED_PILOT_QUEUED_NO_NETWORK_DELIVERY")
            print(signed["payload"]["messageId"])
            return 0
        queued = 0
        for issue in evidence["issues"][:12]:
            signed = signed_event352(
                private_key=private, key_id=key_id,
                audience="rosevear-comms-hub", event_type="operator.issue",
                source_evidence_sha=issue["evidenceDigest"],
                severity=issue["severity"], manifest_sha=manifest_sha,
                now_ms=now, nonce=secrets.token_urlsafe(32),
            )
            if signed is not None and journal.queue(
                signed=signed, registry=registry, manifest_sha=manifest_sha, now_ms=now,
            ):
                queued += 1
        print("SIGNED_OPERATOR_ISSUES_QUEUED", queued)
        return 0
    if args.deliver:
        item = journal._entry(args.deliver)
        if item is None or item[0] != manifest_sha or item[2] != "QUEUED":
            return 2
        try:
            event = json.loads(item[1])
            recipient = event["payload"]["audience"]
            meta = next(p for p in enrollment["payload"]["peers"] if p["id"] == recipient)
        except (ValueError, KeyError, StopIteration, TypeError):
            return 2
        names = (
            "ROSEVEAR_QL461_TLS_CA", "ROSEVEAR_QL461_TLS_CERT",
            "ROSEVEAR_QL461_TLS_KEY",
        )
        tls = [os.environ.get(k) for k in names]
        if not all(tls):
            return 2
        try:
            cert = Path(tls[1]).read_text(encoding="ascii")
            client_pin = hashlib.sha256(ssl.PEM_cert_to_DER_cert(cert)).hexdigest()
        except (OSError, UnicodeError, ValueError):
            return 2
        peer = PeerEnrollment348(
            source="rosevear-ai-hub", destination=recipient,
            hostname=meta["hostname"], port=meta["port"],
            server_cert_pin=meta["tlsLeafPin"], client_cert_pin=client_pin,
            ca_file=Path(tls[0]), client_cert_file=Path(tls[1]),
            client_key_file=Path(tls[2]), peer_protocols=("1.1",),
            peer_capabilities=tuple(meta["capabilities"]), owner_approved=True,
        )
        result = deliver_mtls_event352(
            peer=peer, signed_event=event, enrollment=enrollment,
            registry=registry, journal=journal, now_ms=now,
        )
        print(result["reason"])
        return 0 if result["delivered"] else 2
    return 2


if __name__ == "__main__":
    sys.exit(main())
