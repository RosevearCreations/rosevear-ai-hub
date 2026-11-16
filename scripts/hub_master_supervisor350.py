"""QL-459 original-Windows-host CLI. Never run as an HTTP request handler.

Examples:
  python scripts/hub_master_supervisor350.py --observe
  python scripts/hub_master_supervisor350.py --action --permit C:\\Protected\\start.json
  python scripts/hub_master_supervisor350.py --watch --recovery-grants C:\\Protected\\Grants

Manifest, pinned public key and journal paths MUST be set in the service
environment. --watch is opt-in; merely importing the module does not start it.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import sys
import time
from pathlib import Path

from rosevear_ai_hub.master_shell349 import MASTER_MODULES, load_local_manifest349
from rosevear_ai_hub.master_supervisor350 import (
    CustodyJournal350,
    WindowsServices350,
    apply_local_action350,
    observe_local_modules350,
)


def run() -> int:
    parser = argparse.ArgumentParser(description="Owner-signed local Windows Master supervisor")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--observe", action="store_true", help="Query signed local service states")
    mode.add_argument("--action", action="store_true", help="Apply one owner-signed action")
    mode.add_argument("--watch", action="store_true", help="Observe every 60s; recovery opt-in")
    parser.add_argument("--permit", type=Path, help="One signed short-lived action permit")
    parser.add_argument("--recovery-grants", type=Path, help="Protected directory of per-module grants")
    args = parser.parse_args()
    if args.action and args.permit is None:
        parser.error("--action requires --permit")
    if args.recovery_grants and not args.watch:
        parser.error("--recovery-grants requires --watch")
    host = platform.node()
    journal_value = os.environ.get("ROSEVEAR_QL459_CUSTODY_DB")
    manifest = os.environ.get("ROSEVEAR_QL458_MANIFEST_PATH")
    public = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PATH")
    pin = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PIN")
    if not (journal_value and manifest and public and pin):
        print("HOLD_LOCAL_CONFIGURATION_MISSING")
        return 2
    journal = CustodyJournal350(Path(journal_value))
    controller = WindowsServices350()
    if not journal.initialize():
        print("HOLD_DURABLE_JOURNAL_UNAVAILABLE")
        return 2
    try:
        owner_public = Path(public).read_bytes()
    except OSError:
        print("HOLD_OWNER_PUBLIC_KEY_UNAVAILABLE")
        return 2

    def once() -> int:
        now = int(time.time() * 1000)
        enrollment = load_local_manifest349(Path(manifest), Path(public), pin, now, host)
        if not enrollment["accepted"]:
            print(enrollment["reason"])
            return 2
        result = observe_local_modules350(
            enrollment, journal, controller, now, host,
        )
        print(json.dumps(result, sort_keys=True))
        if not result["observed"]:
            return 2
        grants = (
            list(args.recovery_grants.glob("*.json"))
            if args.watch and args.recovery_grants and args.recovery_grants.is_dir() else []
        )
        if args.action:
            grants = [args.permit]
        if args.watch and args.recovery_grants and not args.recovery_grants.is_dir():
            print("HOLD_RECOVERY_GRANT_DIRECTORY_UNAVAILABLE")
            return 2
        if len(grants) > 3:
            print("HOLD_TOO_MANY_OWNER_GRANTS")
            return 2
        for file in grants:
            if file is None or not file.is_file() or file.is_symlink() or file.stat().st_size > 8192:
                print("HOLD_UNTRUSTED_PERMIT_FILE")
                return 2
            try:
                permit = json.loads(file.read_text(encoding="utf-8"))
            except (OSError, UnicodeError, ValueError):
                print("HOLD_INVALID_PERMIT")
                return 2
            if args.watch and permit.get("payload", {}).get("action") != "recover":
                print("HOLD_WATCH_CAN_ONLY_RECOVER")
                return 2
            verdict = apply_local_action350(
                enrollment=enrollment, permit=permit, owner_public=owner_public,
                owner_pin=pin, journal=journal, controller=controller,
                now_ms=now, machine_name=host,
            )
            print(json.dumps(verdict, sort_keys=True))
            if args.action and not verdict["accepted"]:
                return 2
        return 0

    if not args.watch:
        return once()
    try:
        while True:
            if once():
                return 2
            time.sleep(60)
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    sys.exit(run())
