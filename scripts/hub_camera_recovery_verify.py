"""Compare current and isolated recovered camera inventory databases read-only.

PowerShell (use ONLY an isolated database recovered via the approved encrypted drill):
    py scripts/hub_camera_recovery_verify.py --current DB --recovered ISOLATED_DB

Never writes to the live database or attempts to decrypt encrypted backup archives.
The result contains counts and pass/fail indicators, not camera names or credentials.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path

from hub_camera_import_field_check import inspect_database


def compare_recovery(current: Path, recovered: Path) -> dict[str, object]:
    if current.resolve() == recovered.resolve():
        raise ValueError("Recovered database must be a separate isolated file.")
    current_check = inspect_database(current)
    recovered_check = inspect_database(recovered)
    counts = (
        "camera_compatibility_records",
        "camera_compatibility_ledger",
        "camera_import_reviews",
        "camera_streams",
    )
    same_counts = all(
        current_check["counts"][table] == recovered_check["counts"][table]
        for table in counts
    )
    result = (
        current_check["status"] == "GREEN"
        and recovered_check["status"] == "GREEN"
        and same_counts
    )
    return {
        "status": "MATCH" if result else "HOLD",
        "live_database_read_only": True,
        "recovery_database_read_only": True,
        "same_camera_counts": same_counts,
        "live_schema_ready": current_check["status"] == "GREEN",
        "recovered_schema_ready": recovered_check["status"] == "GREEN",
        "manual_service_acceptance_required": True,
        "restore_performed": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--current", required=True, type=Path)
    parser.add_argument("--recovered", required=True, type=Path)
    args = parser.parse_args()
    try:
        result = compare_recovery(args.current, args.recovered)
    except (ValueError, sqlite3.Error, OSError) as exc:
        print(json.dumps({"status": "HOLD", "reason": type(exc).__name__}))
        return 2
    print(json.dumps(result, sort_keys=True))
    return 0 if result["status"] == "MATCH" else 2


if __name__ == "__main__":
    raise SystemExit(main())
