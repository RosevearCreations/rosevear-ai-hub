"""Build 050: operator-initiated, non-destructive encrypted recovery rehearsals.

Uses the Build 047 restore verifier in a NEW temporary recovery directory.
No live installation, service, database or startup task is replaced.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import secrets
import sqlite3
import sys
import tarfile
import tempfile
from contextlib import closing
from datetime import UTC, datetime
from pathlib import Path

from rosevear_ai_hub.backup import BackupError, create_backup, restore_to_new_root

CHUNK = 1024 * 1024


class DrillError(Exception):
    """A failed recovery drill (never publish green evidence)."""


def _sha256_stream(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as reader:
        while block := reader.read(CHUNK):
            digest.update(block)
    return digest.hexdigest()


def _check_workspace(work_dir: Path, evidence: Path | None) -> Path:
    if work_dir.is_symlink() or not work_dir.is_dir():
        raise DrillError("Recovery scratch directory must already exist and not be a link.")
    if evidence is not None and (
        evidence.exists() or evidence.is_symlink() or not evidence.parent.is_dir()
    ):
        raise DrillError("Evidence destination must be a new file in an existing directory.")
    return work_dir.resolve(strict=True)


def _read_recovery_database(root: Path) -> int:
    recovered = root / "database" / "hub.sqlite3"
    # Immutable read-only inspection cannot create or modify WAL sidecars.
    try:
        with closing(
            sqlite3.connect(f"{recovered.as_uri()}?mode=ro&immutable=1", uri=True)
        ) as connection:
            if connection.execute("PRAGMA integrity_check").fetchone() != ("ok",):
                raise DrillError("Recovered database integrity verification failed.")
            count = int(
                connection.execute(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table'"
                ).fetchone()[0]
            )
    except sqlite3.DatabaseError as exc:
        raise DrillError("Recovered database cannot be read safely.") from exc
    if count < 1:
        raise DrillError("Recovery database has no application/schema tables.")
    return count


def _rehearse_archive(
    archive: Path, passphrase_file: Path | bytes, scratch: Path
) -> dict[str, object]:
    recovered = scratch / "recovered"
    # Restore validates GCM authentication, per-file manifest SHA256s and SQLite.
    # It refuses any existing root; no file is moved to the live installation.
    result = restore_to_new_root(archive, recovered, passphrase_file)
    count = _read_recovery_database(recovered)
    if (recovered / ".env").exists() or (recovered / "root.key").exists():
        raise DrillError("Recovery unexpectedly contains private installation secrets.")
    return {
        "status": "pass",
        "archive_sha256": _sha256_stream(archive),
        "verified_files": result["files"],
        "verified_plaintext_bytes": result["bytes"],
        "sqlite_integrity": "ok",
        "sqlite_table_count": count,
        "restore_to_live_installation": False,
        "scratch_cleanup": "on_completion",
    }


def _write_evidence(destination: Path | None, record: dict[str, object]) -> None:
    if destination is None:
        return
    # Exclusive create: no existing evidence/report is overwritten.
    with destination.open("x", encoding="utf-8") as writer:
        json.dump(record, writer, indent=2, sort_keys=True)
        writer.write("\n")


def drill_archive(
    archive: Path, passphrase_file: Path | bytes, work_dir: Path, evidence: Path | None = None
) -> dict[str, object]:
    """Rehearse a REAL encrypted backup, discarding extracted plaintext on exit."""
    parent = _check_workspace(work_dir, evidence)
    if not archive.is_file() or archive.is_symlink():
        raise DrillError("Encrypted archive is missing or is a symbolic link.")
    if not isinstance(passphrase_file, bytes) and (
        not passphrase_file.is_file() or passphrase_file.is_symlink()
    ):
        raise DrillError("Passphrase file is missing or is a symbolic link.")
    with tempfile.TemporaryDirectory(dir=parent, prefix=".hub50-recovery-") as temp:
        verified = _rehearse_archive(archive, passphrase_file, Path(temp))
    report: dict[str, object] = {
        "build": 50,
        "drill_type": "operator_archive",
        "completed_at_utc": datetime.now(UTC).isoformat(),
        **verified,
    }
    _write_evidence(evidence, report)
    return report


def drill_synthetic(work_dir: Path, evidence: Path | None = None) -> dict[str, object]:
    """Run a full isolated backup/verify/restore, without accessing household data."""
    parent = _check_workspace(work_dir, evidence)
    with tempfile.TemporaryDirectory(dir=parent, prefix=".hub50-synthetic-") as temp:
        sandbox = Path(temp)
        root = sandbox / "synthetic-hub"
        database = root / "data" / "rosevear_ai_hub.db"
        database.parent.mkdir(parents=True)
        with closing(sqlite3.connect(database)) as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute("CREATE TABLE rehearsal (id INTEGER PRIMARY KEY, marker TEXT)")
            connection.execute("INSERT INTO rehearsal (marker) VALUES ('recovered')")
            connection.commit()
        knowledge = root / "data" / "knowledge" / "sample.txt"
        knowledge.parent.mkdir(parents=True)
        knowledge.write_text("Synthetic workshop recovery sample", encoding="utf-8")
        go2rtc = root / "data" / "go2rtc" / "go2rtc.yaml"
        go2rtc.parent.mkdir(parents=True)
        go2rtc.write_text("streams: {}\n", encoding="utf-8")
        passphrase_file = sandbox / "synthetic-secret.txt"
        passphrase_file.write_text(secrets.token_urlsafe(48), encoding="utf-8")
        archive = sandbox / "synthetic.hubbackup"
        create_backup(root, archive, passphrase_file)
        isolated = sandbox / "isolated"
        isolated.mkdir()
        result = _rehearse_archive(archive, passphrase_file, isolated)
        recovered = sandbox / "isolated" / "recovered"
        if (recovered / "data" / "knowledge" / "sample.txt").read_text(
            encoding="utf-8"
        ) != "Synthetic workshop recovery sample":
            raise DrillError("Synthetic knowledge recovery does not match the source.")
        if (recovered / "data" / "go2rtc" / "go2rtc.yaml").read_text(
            encoding="utf-8"
        ) != "streams: {}\n":
            raise DrillError("Synthetic configuration recovery does not match.")
        with closing(
            sqlite3.connect(
                f"{(recovered / 'database' / 'hub.sqlite3').as_uri()}?mode=ro&immutable=1",
                uri=True,
            )
        ) as connection:
            if connection.execute("SELECT marker FROM rehearsal").fetchone() != ("recovered",):
                raise DrillError("Synthetic database row did not survive recovery.")
        # Assert the source remains intact before the temporary workspace vanishes.
        if knowledge.read_text(encoding="utf-8") != "Synthetic workshop recovery sample":
            raise DrillError("Synthetic source content was modified during recovery.")
    report: dict[str, object] = {
        "build": 50,
        "drill_type": "synthetic_only",
        "completed_at_utc": datetime.now(UTC).isoformat(),
        **result,
    }
    _write_evidence(evidence, report)
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Build 050: local-only, non-destructive recovery rehearsal"
    )
    commands = parser.add_subparsers(dest="command", required=True)
    synthetic = commands.add_parser("synthetic", help="No household data; CI-safe")
    archive = commands.add_parser("archive", help="Rehearse a real encrypted backup")
    for command in (synthetic, archive):
        command.add_argument("--work-dir", required=True, type=Path)
        command.add_argument("--evidence", type=Path)
    archive.add_argument("--archive", required=True, type=Path)
    archive.add_argument("--passphrase-file", required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        if args.command == "synthetic":
            result = drill_synthetic(args.work_dir, args.evidence)
        else:
            result = drill_archive(args.archive, args.passphrase_file, args.work_dir, args.evidence)
    except (
        BackupError,
        DrillError,
        OSError,
        sqlite3.DatabaseError,
        tarfile.TarError,
        ValueError,
    ) as exc:
        # Do not expose private paths, passwords, or backing-store details in logs.
        print(
            f"Recovery drill FAILED ({type(exc).__name__}). No live data changed.",
            file=sys.stderr,
        )
        return 1
    print(
        f"Recovery drill PASS: {result['drill_type']}; "
        f"{result['verified_files']} files, SQLite verified; "
        "no live restore was performed."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
