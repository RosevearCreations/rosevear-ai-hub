"""Build 050: isolated recovery, fault injection and no-live-restore safeguards."""

import json
import sqlite3
from contextlib import closing
from pathlib import Path

import pytest

from rosevear_ai_hub.backup import create_backup
from rosevear_ai_hub.disaster_recovery import (
    DrillError,
    drill_archive,
    drill_synthetic,
    main,
)


def _real_archive(tmp_path: Path) -> tuple[Path, Path, Path]:
    live = tmp_path / "live"
    database = live / "data" / "rosevear_ai_hub.db"
    database.parent.mkdir(parents=True)
    with closing(sqlite3.connect(database)) as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("CREATE TABLE preserved (id INTEGER PRIMARY KEY, label TEXT)")
        db.execute("INSERT INTO preserved (label) VALUES ('unchanged')")
        db.commit()
    document = live / "data" / "knowledge" / "notes.txt"
    document.parent.mkdir(parents=True)
    document.write_text("Important private notes", encoding="utf-8")
    password = tmp_path / "offline-passphrase.txt"
    password.write_text("a long offline-only recovery password 12345", encoding="utf-8")
    archive = tmp_path / "snapshot.hubbackup"
    create_backup(live, archive, password)
    return live, archive, password


def test_synthetic_drill_verifies_full_round_trip_and_cleans_scratch(tmp_path):
    work = tmp_path / "scratch"
    work.mkdir()
    report_path = tmp_path / "drill-evidence.json"
    result = drill_synthetic(work, report_path)
    assert result["status"] == "pass"
    assert result["drill_type"] == "synthetic_only"
    assert result["verified_files"] == 3
    assert result["sqlite_integrity"] == "ok"
    assert result["sqlite_table_count"] >= 1
    assert result["restore_to_live_installation"] is False
    assert list(work.iterdir()) == []
    evidence = json.loads(report_path.read_text(encoding="utf-8"))
    assert evidence == result
    assert "secret" not in json.dumps(result).lower()
    with pytest.raises(DrillError, match="new file"):
        drill_synthetic(work, report_path)


def test_operator_archive_drill_isolated_and_preserves_live_data(tmp_path):
    live, archive, password = _real_archive(tmp_path)
    work = tmp_path / "scratch"
    work.mkdir()
    expected_db = (live / "data" / "rosevear_ai_hub.db").read_bytes()
    report = drill_archive(archive, password, work)
    assert report["status"] == "pass"
    assert report["drill_type"] == "operator_archive"
    assert report["sqlite_integrity"] == "ok"
    assert report["verified_files"] == 2
    assert len(report["archive_sha256"]) == 64
    assert (live / "data" / "rosevear_ai_hub.db").read_bytes() == expected_db
    assert (live / "data" / "knowledge" / "notes.txt").read_text() == "Important private notes"
    assert list(work.iterdir()) == []


def test_wrong_password_and_tampering_never_publish_green_evidence(tmp_path):
    _, archive, password = _real_archive(tmp_path)
    work = tmp_path / "scratch"
    work.mkdir()
    evidence = tmp_path / "should-not-exist.json"
    wrong = tmp_path / "wrong-passphrase.txt"
    wrong.write_text("wrong passphrase sufficiently long 98765", encoding="utf-8")
    assert (
        main(
            [
                "archive",
                "--archive",
                str(archive),
                "--passphrase-file",
                str(wrong),
                "--work-dir",
                str(work),
                "--evidence",
                str(evidence),
            ]
        )
        == 1
    )
    assert not evidence.exists()
    assert list(work.iterdir()) == []

    damaged = tmp_path / "damaged.hubbackup"
    payload = bytearray(archive.read_bytes())
    payload[len(payload) // 2] ^= 1
    damaged.write_bytes(payload)
    with pytest.raises(Exception):
        drill_archive(damaged, password, work, evidence)
    assert not evidence.exists()
    assert list(work.iterdir()) == []


def test_cli_and_missing_work_directory_fail_closed(tmp_path, capsys):
    scratch = tmp_path / "scratch"
    evidence = tmp_path / "result.json"
    assert main(["synthetic", "--work-dir", str(scratch)]) == 1
    assert not evidence.exists()
    scratch.mkdir()
    assert main(["synthetic", "--work-dir", str(scratch), "--evidence", str(evidence)]) == 0
    assert list(scratch.iterdir()) == []
    assert json.loads(evidence.read_text(encoding="utf-8"))["status"] == "pass"
    out = capsys.readouterr()
    assert "Recovery drill PASS" in out.out
    assert "Recovery drill FAILED" in out.err
    assert "password" not in out.out.lower()
