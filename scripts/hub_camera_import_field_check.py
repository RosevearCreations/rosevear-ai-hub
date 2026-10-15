"""Read-only Build 076 camera inventory migration verification for Windows Hub.

Usage in PowerShell (after a verified backup and installation):
    py scripts/hub_camera_import_field_check.py --database "C:\\path\\to\\hub.db"

Only status and counts are printed; no camera identifiers, secrets, or database paths.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path


def inspect_database(database_path: Path) -> dict[str, object]:
    if not database_path.is_file():
        raise ValueError("Specified SQLite database file does not exist.")
    connection = sqlite3.connect(database_path.resolve().as_uri() + "?mode=ro", uri=True)
    try:
        names = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        required = {
            "camera_compatibility_records",
            "camera_compatibility_ledger",
            "camera_import_reviews",
            "alembic_version",
        }
        tables_ready = required.issubset(names)
        revision = None
        if "alembic_version" in names:
            record = connection.execute("SELECT version_num FROM alembic_version").fetchone()
            revision = record[0] if record else None
        columns_ready = False
        identity_unique = False
        if "camera_compatibility_records" in names:
            columns = {
                row[1] for row in connection.execute(
                    "PRAGMA table_info('camera_compatibility_records')"
                )
            }
            columns_ready = "identity_fingerprint" in columns
            for index in connection.execute(
                "PRAGMA index_list('camera_compatibility_records')"
            ):
                if not index[2]:
                    continue
                index_name = index[1].replace("'", "''")
                fields = {
                    row[2] for row in connection.execute(
                        f"PRAGMA index_info('{index_name}')"
                    )
                }
                identity_unique |= "identity_fingerprint" in fields
        quick_check = connection.execute("PRAGMA quick_check").fetchone()
        integrity_ok = quick_check is not None and quick_check[0] == "ok"
        counts = {}
        for table in (
            "camera_compatibility_records",
            "camera_compatibility_ledger",
            "camera_import_reviews",
            "camera_streams",
        ):
            counts[table] = (
                connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                if table in names
                else None
            )
        green = (
            revision in {"0021", "0022"}
            and tables_ready
            and columns_ready
            and identity_unique
            and integrity_ok
        )
        return {
            "status": "GREEN" if green else "HOLD",
            "revision": revision,
            "required_tables": tables_ready,
            "fingerprint_column": columns_ready,
            "fingerprint_unique": identity_unique,
            "sqlite_quick_check": integrity_ok,
            "counts": counts,
            "windows_runtime_services_verified": False,
        }
    finally:
        connection.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = inspect_database(args.database)
    except (ValueError, sqlite3.Error, OSError) as exc:
        print(json.dumps({"status": "HOLD", "reason": type(exc).__name__}))
        return 2
    print(json.dumps(result, sort_keys=True))
    return 0 if result["status"] == "GREEN" else 2


if __name__ == "__main__":
    raise SystemExit(main())
