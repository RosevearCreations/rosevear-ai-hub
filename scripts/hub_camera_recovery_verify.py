"""Build 078: compare live and isolated recovery content without revealing camera data.

This does not decrypt backups, restore databases, change services or prove playback.
Only a separately recovered SQLite file is valid for --recovered.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

from hub_camera_import_field_check import inspect_database

TABLES = (
    "camera_compatibility_records",
    "camera_compatibility_ledger",
    "camera_import_reviews",
    "camera_import_acceptance_evidence",
    "camera_streams",
)
REQUIRED = frozenset(TABLES[:-1])


def private_table_digests(path: Path) -> dict[str, str | None]:
    """Hash canonical row content, not merely table counts or filenames."""
    if not path.is_file():
        raise ValueError("SQLite database does not exist.")
    connection = sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)
    try:
        connection.execute("BEGIN")
        present = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        if not REQUIRED.issubset(present):
            raise ValueError("Required camera evidence table is absent.")
        result: dict[str, str | None] = {}
        for table in TABLES:
            if table not in present:
                result[table] = None
                continue
            # These identifiers come exclusively from the fixed TABLES tuple.
            rows = []
            for row in connection.execute(f'SELECT * FROM "{table}"'):
                encoded = json.dumps(
                    list(row), sort_keys=True, default=str, separators=(",", ":")
                ).encode("utf-8")
                rows.append(hashlib.sha256(encoded).digest())
            hasher = hashlib.sha256()
            for row_hash in sorted(rows):
                hasher.update(row_hash)
            result[table] = hasher.hexdigest()
        return result
    finally:
        connection.close()


def compare_recovery(current: Path, recovered: Path) -> dict[str, object]:
    if current.resolve() == recovered.resolve():
        raise ValueError("Recovered database must be a separate isolated file.")
    if current.is_file() and recovered.is_file() and current.samefile(recovered):
        raise ValueError("Recovered database must not be a hard link to the live file.")

    current_check = inspect_database(current)
    recovered_check = inspect_database(recovered)
    tables_equal = private_table_digests(current) == private_table_digests(recovered)
    same_counts = current_check["counts"] == recovered_check["counts"]
    schema_ready = (
        current_check["status"] == "GREEN"
        and recovered_check["status"] == "GREEN"
        and current_check["revision"] == "0022"
        and recovered_check["revision"] == "0022"
    )
    match = schema_ready and same_counts and tables_equal
    return {
        "status": "EVIDENCE_MATCH" if match else "HOLD",
        "live_database_read_only": True,
        "recovery_database_read_only": True,
        "same_camera_counts": same_counts,
        "same_camera_and_acceptance_content": tables_equal,
        "schema_0022_ready": schema_ready,
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
    return 0 if result["status"] == "EVIDENCE_MATCH" else 2


if __name__ == "__main__":
    raise SystemExit(main())
