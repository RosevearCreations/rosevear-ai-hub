"""QL-463 original Windows-host acceptance ceremony and explicit TLS probe.

No automatic reboot, task execution, service mutation, private key issuance,
recipient controls, live-peer claims or remote browser actions.
"""

from __future__ import annotations

import argparse
import os
import platform
import sys
import time
from pathlib import Path

from rosevear_ai_hub.api.server_shell353 import _read_key353, _read_protected353
from rosevear_ai_hub.api.server_shell354 import local_acceptance_snapshot354
from rosevear_ai_hub.master_acceptance354 import probe_candidate_mtls354
from rosevear_ai_hub.master_bus351 import MasterEventBus351
from rosevear_ai_hub.master_registry352 import load_master_registry352
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST, load_local_manifest349
from rosevear_ai_hub.master_source_audit354 import MasterSourceAuditLedger354
from rosevear_ai_hub.master_transport352 import MasterDeliveryLedger352
from rosevear_ai_hub.service_identity347 import _digest


def main() -> int:
    parser = argparse.ArgumentParser(description="Owner-only local QL-463 evidence ceremony")
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--inspect", action="store_true")
    modes.add_argument("--record-audit", type=Path)
    modes.add_argument(
        "--probe-candidate",
        choices=("ai-data-platform", "rosevear-comms-hub"),
    )
    args = parser.parse_args()
    if os.name != "nt" or platform.node().upper() != ORIGINAL_HOST:
        print("HOLD_NOT_ORIGINAL_WINDOWS_HOST")
        return 2
    now_ms = int(time.time() * 1000)
    if args.inspect:
        result = local_acceptance_snapshot354(
            now_ms=now_ms, machine_name=platform.node(),
        )
        print(
            "HUB_Q463_READ_ONLY_STATUS",
            result["witnessEnrollment"]["state"],
            result["commsAudit"]["state"],
        )
        return 0
    env = {
        name: os.environ.get(name)
        for name in (
            "ROSEVEAR_QL458_MANIFEST_PATH",
            "ROSEVEAR_QL458_OWNER_KEY_PATH",
            "ROSEVEAR_QL458_OWNER_KEY_PIN",
            "ROSEVEAR_QL461_MASTER_REGISTRY_PATH",
            "ROSEVEAR_QL461_OUTBOX_DB",
        )
    }
    if not all(env.values()):
        print("HOLD_NO_ORIGINAL_HOST_PROTECTED_CONFIG")
        return 2
    owner = _read_key353(env["ROSEVEAR_QL458_OWNER_KEY_PATH"])
    if owner is None:
        return 2
    enrollment = load_local_manifest349(
        Path(env["ROSEVEAR_QL458_MANIFEST_PATH"]),
        Path(env["ROSEVEAR_QL458_OWNER_KEY_PATH"]),
        env["ROSEVEAR_QL458_OWNER_KEY_PIN"],
        now_ms, platform.node(),
    )
    if enrollment.get("accepted") is not True:
        return 2
    digest = _digest(enrollment["payload"])
    registry = load_master_registry352(
        path=Path(env["ROSEVEAR_QL461_MASTER_REGISTRY_PATH"]),
        owner_public=owner,
        owner_pin=env["ROSEVEAR_QL458_OWNER_KEY_PIN"],
        enrollment=enrollment, now_ms=now_ms,
        machine_name=platform.node(),
    )
    if registry is None:
        print("HOLD_NO_OWNER_SIGNED_PEER_REGISTRY")
        return 2
    if args.record_audit:
        source_db = os.environ.get("ROSEVEAR_QL460_EVENT_DB")
        durable_db = os.environ.get("ROSEVEAR_QL463_SOURCE_AUDIT_DB")
        owner_id = os.environ.get("ROSEVEAR_QL462_OWNER_AUDIT_ID")
        if not all((source_db, durable_db, owner_id)):
            return 2
        if (
            args.record_audit.is_symlink()
            or not args.record_audit.is_file()
            or args.record_audit.stat().st_size > 16_384
        ):
            return 2
        package = _read_protected353(
            str(args.record_audit), max_bytes=16_384,
        )
        source = MasterEventBus351(Path(source_db)).recent(
            manifest_sha=digest, now_ms=now_ms,
        )
        ledger = MasterSourceAuditLedger354(Path(durable_db))
        if not ledger.initialize():
            return 2
        outcome = ledger.capture(
            package=package,
            local_bus=source,
            outbox=MasterDeliveryLedger352(
                Path(env["ROSEVEAR_QL461_OUTBOX_DB"])
            ),
            registry=registry, manifest_sha=digest,
            owner_audit_id=owner_id, now_ms=now_ms,
        )
        print(
            "TWO_SOURCE_SIGNED_COMMS_AND_SCM_AUDIT_RECORDED"
            if outcome else "HOLD_SOURCE_AUDIT_NOT_CORROBORATED"
        )
        return 0 if outcome else 2
    if args.probe_candidate:
        plan = _read_protected353(
            os.environ.get("ROSEVEAR_QL463_CERT_PLAN_PATH"),
        )
        peer = [
            p for p in enrollment["payload"]["peers"]
            if p["id"] == args.probe_candidate
        ]
        paths = [
            os.environ.get("ROSEVEAR_QL461_TLS_CA"),
            os.environ.get("ROSEVEAR_QL461_TLS_CERT"),
            os.environ.get("ROSEVEAR_QL461_TLS_KEY"),
        ]
        if len(peer) != 1 or not all(paths):
            return 2
        result = probe_candidate_mtls354(
            signed_plan=plan, owner_public=owner,
            owner_pin=env["ROSEVEAR_QL458_OWNER_KEY_PIN"],
            manifest_digest=digest, now_ms=now_ms, peer=peer[0],
            ca_file=Path(paths[0]), client_cert_file=Path(paths[1]),
            client_key_file=Path(paths[2]),
        )
        print(result["state"])
        print("NO_CERTIFICATE_ACTIVATION_OR_REMOTE_SERVICE_CHANGE")
        return 0 if result["candidateTlsHandshakeVerified"] else 2
    return 2


if __name__ == "__main__":
    sys.exit(main())
