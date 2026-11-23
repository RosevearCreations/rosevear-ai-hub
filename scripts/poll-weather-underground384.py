"""AcuRite 5-in-1 via owner-enrolled Weather Underground, supervised one-pass.

This CLI is never installed as a scheduled task and cannot change Home Assistant
or automate any workshop/physical equipment.
"""

from __future__ import annotations

import json
import os
import platform
import sys
import time
from pathlib import Path

from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.weather_pws384 import cached_weather384, poll_once384


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in ("--once", "--status"):
        print("Usage: python scripts/poll-weather-underground384.py --once|--status")
        return 2
    if os.name != "nt" or platform.node().upper() != ORIGINAL_HOST:
        print("HOLD_ORIGINAL_WINDOWS_HOST_ONLY")
        return 2
    cache = os.environ.get("ROSEVEAR_WU384_CACHE_DB")
    if not cache:
        print("HOLD_WU_PRIVATE_CACHE_NOT_CONFIGURED")
        return 2
    now = int(time.time() * 1000)
    if sys.argv[1] == "--status":
        result = cached_weather384(Path(cache), now_ms=now, original_host=True)
    else:
        station = os.environ.get("ROSEVEAR_WU384_STATION_ID", "")
        key_file = os.environ.get("ROSEVEAR_WU384_API_KEY_PATH", "")
        try:
            result = poll_once384(
                Path(cache), station_id=station, key_path=key_file,
                now_ms=now, original_host=True,
            )
        except (OSError, UnicodeError, ValueError, TypeError):
            print("HOLD_WU_CONFIGURATION_BUDGET_OR_PROVIDER")
            return 2
    print(json.dumps(result, sort_keys=True))
    return 0 if not result["status"].startswith("HOLD") else 2


if __name__ == "__main__":
    sys.exit(main())
