"""Build 394: private migration rehearsal and supervised cutover preflight.

Never change a live database, process, task, active pointer, or activation journal.
A successful rehearsal is not authority to perform a production migration.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import subprocess
import sys
import tempfile
from contextlib import closing
from pathlib import Path

import hub_release_manager as releases
from hub_private_backup import secure_folder

SOURCE = "0029"
TARGET = "0040"


def readonly(path):
    return sqlite3.connect(path.resolve(strict=True).as_uri() + "?mode=ro", uri=True)


def revision(connection):
    rows = connection.execute("SELECT version_num FROM alembic_version").fetchall()
    if len(rows) != 1:
        raise ValueError("HOLD_SINGLE_DATABASE_REVISION_REQUIRED")
    return rows[0][0]


def quote(identifier):
    return '"' + identifier.replace('"', '""') + '"'


def table_state(connection):
    # Private comparison only. No table names, rows or digests leave this function
    # via CLI output. All existing application tables are compared on both copies.
    tables = connection.execute(
        "SELECT name FROM sqlite_master WHERE type='table' "
        "AND name NOT LIKE 'sqlite_%' AND name <> 'alembic_version' ORDER BY name"
    ).fetchall()
    result = {}
    for (name,) in tables:
        table = quote(name)
        columns = [
            row[1] for row in connection.execute(f"PRAGMA table_info({table})")
        ]
        order = ", ".join(quote(column) + " COLLATE BINARY" for column in columns)
        digest = hashlib.sha256()
        count = 0
        for row in connection.execute(f"SELECT * FROM {table} ORDER BY {order}"):
            # Include types and lengths to distinguish NULL, numeric, text and BLOB.
            for value in row:
                raw = repr(value).encode("utf-8", errors="surrogatepass")
                digest.update(len(raw).to_bytes(8, "big"))
                digest.update(raw)
            count += 1
        result[name] = (tuple(columns), count, digest.hexdigest())
    return result


def integrity(connection):
    return (
        connection.execute("PRAGMA integrity_check").fetchall() == [("ok",)]
        and connection.execute("PRAGMA foreign_key_check").fetchone() is None
    )


def rehearse(source, scratch, migrate):
    source = source.resolve(strict=True)
    scratch = scratch.resolve()
    if source == scratch or scratch.exists() or not scratch.parent.is_dir():
        raise ValueError("HOLD_NEW_ISOLATED_DATABASE_REQUIRED")
    with closing(readonly(source)) as origin:
        with closing(sqlite3.connect(scratch)) as copy:
            origin.backup(copy, pages=128, sleep=0.05)
            if revision(copy) != SOURCE or not integrity(copy):
                raise ValueError("HOLD_SOURCE_REVISION_OR_INTEGRITY")
            baseline = table_state(copy)
    migrate(scratch)
    with closing(readonly(scratch)) as copy:
        if revision(copy) != TARGET or not integrity(copy):
            raise ValueError("HOLD_MIGRATED_REVISION_OR_INTEGRITY")
        after = table_state(copy)
        if any(after.get(name) != state for name, state in baseline.items()):
            raise ValueError("HOLD_EXISTING_RECORDS_CHANGED")
    return {
        "sourceRevision": SOURCE,
        "rehearsedRevision": TARGET,
        "existingTablesPreserved": len(baseline),
        "newTables": len(after.keys() - baseline.keys()),
        "existingRowsPreserved": True,
        "integrityAndForeignKeys": "pass",
        "liveMigrationPerformed": False,
        "runtimeActivated": False,
    }


def journal_state(manager):
    try:
        active = releases.read_json(manager.state) if manager.state.exists() else None
        journal = releases.read_json(manager.journal) if manager.journal.exists() else None
        if active is not None and not releases.SHA.fullmatch(active.get("sha", "")):
            return "UNKNOWN_HOLD"
        if journal is None:
            return "MANAGED" if active else "LEGACY"
        phase = journal.get("phase")
        if phase == "activating":
            return "INTERRUPTED_ACTIVATION_HOLD"
        if phase == "supervised_bootstrap" and not active:
            return "SUPERVISED_BOOTSTRAP"
        if (
            phase in {"committed", "rolled_back"}
            and active
            and active["sha"] == journal.get(
                "candidate" if phase == "committed" else "previous"
            )
        ):
            return "MANAGED"
        return "UNKNOWN_HOLD"
    except (OSError, ValueError, TypeError, AttributeError):
        return "UNKNOWN_HOLD"


def inspect_local(manager):
    with closing(readonly(manager.root / "data/rosevear_ai_hub.db")) as db:
        current = revision(db)
    state = journal_state(manager)
    return {
        "databaseRevision": current,
        "targetRevision": TARGET,
        "releaseState": state,
        "backupEnrollmentPresent": (
            manager.root / "logs/private-recovery/backup-key.dpapi"
        ).is_file(),
        "requiresSchemaCutover": current != TARGET,
        "liveMigrationPerformed": False,
        "runtimeActivated": False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["inspect", "rehearse"])
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--expected-commit", default="")
    args = parser.parse_args()
    manager = releases.Manager(args.repo_root.resolve(strict=True))
    if args.action == "inspect":
        print(json.dumps(inspect_local(manager)))
        return
    if sys.platform != "win32":
        raise ValueError("HOLD_ORIGINAL_WINDOWS_OPERATOR_REQUIRED")
    if not releases.SHA.fullmatch(args.expected_commit):
        raise ValueError("HOLD_EXACT_GREEN_COMMIT_REQUIRED")
    sha = args.expected_commit
    with releases.controller_lock(manager.home / "controller.lock"):
        if releases.green_main() != sha:
            raise ValueError("HOLD_APPROVED_MAIN_CHANGED")
        # Historical staging permits PREPARATION across a schema boundary,
        # but does not bypass any existing activation/rollback gate.
        manifest = manager.prepare(sha, historical=True)
        if manifest["schema_revision"] != TARGET:
            raise ValueError("HOLD_UNEXPECTED_TARGET_SCHEMA")
        manager.validate_database_config(sha)
        manager.manifest(sha)
        private = manager.root / "logs/private-recovery"
        if not private.is_dir() or private.is_symlink():
            raise ValueError("HOLD_EXISTING_PRIVATE_BACKUP_DIRECTORY_REQUIRED")
        secure_folder(private)
        slot = manager.slot(sha)
        python = slot / ".venv/Scripts/python.exe"

        def migrate(path):
            env = releases.clean_test_environment()
            # Explicit absolute SQLite URL, no inherited DATABASE_URL or .env.
            env["DATABASE_URL"] = "sqlite:///" + path.as_posix()
            result = subprocess.run(
                [str(python), "-B", "-m", "alembic", "upgrade", TARGET],
                cwd=slot,
                env=env,
                capture_output=True,
                timeout=600,
                check=False,
            )
            if result.returncode:
                raise ValueError("HOLD_ISOLATED_MIGRATION_FAILED")

        with tempfile.TemporaryDirectory(prefix="schema394-", dir=private) as temp:
            secure_folder(Path(temp))
            report = rehearse(
                manager.root / "data/rosevear_ai_hub.db",
                Path(temp) / "rehearsal.sqlite3",
                migrate,
            )
        report.update(
            {
                "approvedCommit": sha,
                "scratchCleanupVerified": not Path(temp).exists(),
                "releaseState": journal_state(manager),
                "cutoverAuthorized": False,
                "nextStep": "SUPERVISED_STOPPED_HUB_CUTOVER_REQUIRED",
            }
        )
        print(json.dumps(report))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Fixed exception class only: no private paths or migration row data.
        print("SCHEMA394_HOLD: " + type(error).__name__, file=sys.stderr)
        raise SystemExit(1) from None
