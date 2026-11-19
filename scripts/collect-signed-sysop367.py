"""Build 367 operator-only, one-source private authenticated TLS telemetry read.

Never runs on import, schedules a task, activates QL-340C, or prints secrets.
"""
from __future__ import annotations

import argparse
import json

from rosevear_ai_hub.live_sources367 import collect_once367
from rosevear_ai_hub.seven_app_stats365 import APPS


def main() -> None:
    parser = argparse.ArgumentParser(description="Original Windows host private signed telemetry GET")
    parser.add_argument("--app", required=True, choices=APPS)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    if not args.once:
        parser.exit(2, "HOLD_SYSOP367_EXPLICIT_ONCE_REQUIRED\n")
    try:
        print(json.dumps(collect_once367(args.app), separators=(",", ":")))
    except (ValueError, OSError, UnicodeError) as error:
        message = str(error)
        if not message.startswith("HOLD_"):
            message = "HOLD_SYSOP367_SOURCE_REJECTED"
        parser.exit(2, message + "\n")


if __name__ == "__main__":
    main()
