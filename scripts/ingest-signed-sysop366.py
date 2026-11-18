"""QL-474 opt-in original-host *local* signed Sysop journal intake.

Not a network poller or Windows service. --append is required for writes.
Private source paths and trusted fingerprints are read only from server env.
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import time
from pathlib import Path

from rosevear_ai_hub.api.server_shell353 import _read_protected353
from rosevear_ai_hub.api.server_shell364 import protected_key364
from rosevear_ai_hub.api.server_shell365 import TAG
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.seven_app_stats365 import APPS, verify_peer365
from rosevear_ai_hub.sysop_history366 import append_verified366


def intake(app_id: str, *, append: bool, now_ms: int) -> dict:
    if os.name != "nt" or platform.node().upper() != ORIGINAL_HOST:
        raise ValueError("HOLD_SYSOP366_NOT_ORIGINAL_WINDOWS_HOST")
    if app_id not in APPS:
        raise ValueError("HOLD_SYSOP366_UNKNOWN_APP")
    tag = TAG[app_id]
    prefix = "ROSEVEAR_SYSOP365_" + tag + "_"
    signed = _read_protected353(os.environ.get(prefix + "SIGNED_JSON_PATH"))
    key = protected_key364(os.environ.get(prefix + "PUBLIC_KEY_PATH"))
    pin = os.environ.get(prefix + "PUBLIC_KEY_PIN", "")
    commit = os.environ.get(prefix + "SOURCE_COMMIT", "")
    result = verify_peer365(signed, key, pin, app_id, commit, now_ms)
    if not result["accepted"]:
        raise ValueError(result["reason"])
    journal_path = os.environ.get("ROSEVEAR_SYSOP366_PRIVATE_JOURNAL_PATH", "")
    if not append:
        return {
            "status": "SIGNED_CLAIM_VERIFIED_NO_JOURNAL_WRITE",
            "appId": app_id,
            "liveAuthenticatedTransportVerified": False,
            "physicalRebootIndependentlyWitnessed": False,
            "writePerformed": False,
        }
    if not journal_path:
        raise ValueError("HOLD_SYSOP366_PRIVATE_JOURNAL_PATH_REQUIRED")
    result = append_verified366(
        Path(journal_path),
        app_id=app_id,
        signed_envelope=signed,
        public_key_pem=key,
        trusted_pin=pin,
        expected_commit=commit,
        now_ms=now_ms,
    )
    return {**result, "writePerformed": True}


def main() -> None:
    p = argparse.ArgumentParser(description="Opt-in private signed Sysop statistics intake")
    p.add_argument("--app", choices=APPS, required=True)
    p.add_argument("--append", action="store_true")
    args = p.parse_args()
    try:
        print(json.dumps(intake(args.app, append=args.append, now_ms=int(time.time() * 1000))))
    except (ValueError, OSError, TypeError) as error:
        message = str(error)
        if not message.startswith("HOLD_"):
            message = "HOLD_SYSOP366_INTAKE_FAILED"
        p.exit(2, message + "\n")


if __name__ == "__main__":
    main()
