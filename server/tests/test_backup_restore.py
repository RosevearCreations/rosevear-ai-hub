"""Build 047 backup integrity, confidentiality, and safe restore coverage."""

import io
import sqlite3
import tarfile
from pathlib import Path

import pytest

from rosevear_ai_hub.backup import (
    BackupError,
    _encrypt,
    _passphrase,
    _safe_name,
    create_backup,
    inspect_backup,
    main,
    restore_to_new_root,
)


def setup_hub(tmp_path: Path) -> tuple[Path, Path]:
    root = tmp_path / "hub"
    database = root / "data" / "rosevear_ai_hub.db"
    database.parent.mkdir(parents=True)
    with sqlite3.connect(database) as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT)")
        db.execute("INSERT INTO users (username) VALUES ('owner')")
        db.commit()
    document = root / "data" / "knowledge" / "docs" / "handbook.txt"
    document.parent.mkdir(parents=True)
    document.write_text("Private household workshop notes", encoding="utf-8")
    camera = root / "data" / "go2rtc" / "go2rtc.yaml"
    camera.parent.mkdir(parents=True)
    camera.write_text("streams: {}\n", encoding="utf-8")
    (root / ".env").write_text("SECRET_ENCRYPTION_KEY=never-export-this", encoding="utf-8")
    secret = tmp_path / "recovery-passphrase.txt"
    secret.write_bytes(b"my very long unique recovery password 123!")
    return root, secret


def test_online_snapshot_is_encrypted_verified_and_restorable(tmp_path: Path) -> None:
    root, passphrase = setup_hub(tmp_path)
    encrypted = tmp_path / "household.hubbackup"
    info = create_backup(root, encrypted, passphrase)
    assert info["files"] == 3
    raw = encrypted.read_bytes()
    assert raw.startswith(b"RAH47ENC1")
    assert b"Private household workshop notes" not in raw
    assert b"never-export-this" not in raw
    assert b"owner" not in raw
    assert inspect_backup(encrypted, passphrase) == info

    # Never overwrite the current data during restore.
    (root / "data" / "knowledge" / "docs" / "handbook.txt").write_text("new work")
    target = tmp_path / "recovery"
    restored = restore_to_new_root(encrypted, target, passphrase)
    assert restored == info
    assert (target / "data/knowledge/docs/handbook.txt").read_text() == (
        "Private household workshop notes"
    )
    assert not (target / ".env").exists()
    with sqlite3.connect(target / "database/hub.sqlite3") as db:
        assert db.execute("SELECT username FROM users").fetchone() == ("owner",)
    assert (root / "data/knowledge/docs/handbook.txt").read_text() == "new work"


def test_wrong_key_tampering_and_existing_destination_fail_closed(tmp_path: Path) -> None:
    root, passphrase = setup_hub(tmp_path)
    destination = tmp_path / "snapshot.hubbackup"
    create_backup(root, destination, passphrase)
    with pytest.raises(BackupError, match="already exists|must be a new"):
        create_backup(root, destination, passphrase)
    with pytest.raises(BackupError, match="must not exist"):
        restore_to_new_root(destination, root, passphrase)

    incorrect = tmp_path / "incorrect.txt"
    incorrect.write_text("something else sufficiently long for the restore", encoding="utf-8")
    with pytest.raises(BackupError, match="authentication failed"):
        inspect_backup(destination, incorrect)
    assert not (tmp_path / "recovery").exists()
    with pytest.raises(BackupError, match="authentication failed"):
        restore_to_new_root(destination, tmp_path / "recovery", incorrect)

    tampered = tmp_path / "tampered.hubbackup"
    changed = bytearray(destination.read_bytes())
    changed[len(changed) // 2] ^= 1
    tampered.write_bytes(changed)
    with pytest.raises(BackupError, match="authentication failed"):
        inspect_backup(tampered, passphrase)


def test_links_and_unsafe_paths_refused(tmp_path: Path) -> None:
    root, secret = setup_hub(tmp_path)
    if not hasattr(Path, "symlink_to"):
        pytest.skip("symlinks unavailable")
    linked = root / "data" / "knowledge" / "source-link.txt"
    try:
        linked.symlink_to(root / ".env")
    except OSError:
        pytest.skip("test environment does not allow symlinks")
    with pytest.raises(BackupError, match="symbolic"):
        create_backup(root, tmp_path / "no-backup.hubbackup", secret)
    assert not (tmp_path / "no-backup.hubbackup").exists()
    assert not _safe_name("../../.env")
    assert not _safe_name("data/knowledge/../../.env")
    assert not _safe_name("/data/knowledge/file")
    assert not _safe_name("data\\knowledge\\file")
    assert not _safe_name("data/lan-access/root.key")
    assert _safe_name("data/knowledge/subdir/notes.txt")


def test_authenticated_malicious_tar_member_not_extracted(tmp_path: Path) -> None:
    _, secret = setup_hub(tmp_path)
    tar_path = tmp_path / "malicious.tar.gz"
    with tarfile.open(tar_path, "w:gz") as archive:
        member = tarfile.TarInfo("../../escape.txt")
        member.size = 4
        archive.addfile(member, io.BytesIO(b"evil"))
    encrypted = tmp_path / "malicious.hubbackup"
    _encrypt(tar_path, encrypted, _passphrase(secret))
    with pytest.raises(BackupError, match="unsafe path"):
        restore_to_new_root(encrypted, tmp_path / "extract", secret)
    assert not (tmp_path / "escape.txt").exists()
    assert not (tmp_path / "extract").exists()


def test_corrupt_sqlite_is_rejected(tmp_path: Path) -> None:
    root, secret = setup_hub(tmp_path)
    database = root / "data" / "rosevear_ai_hub.db"
    for extension in ("-wal", "-shm"):
        Path(str(database) + extension).unlink(missing_ok=True)
    database.write_bytes(b"not sqlite")
    with pytest.raises(BackupError, match="SQLite"):
        create_backup(root, tmp_path / "corrupt.hubbackup", secret)
    assert not (tmp_path / "corrupt.hubbackup").exists()


def test_cli_commands_and_too_short_password(tmp_path: Path, capsys) -> None:
    root, secret = setup_hub(tmp_path)
    output = tmp_path / "snapshot.hubbackup"
    assert (
        main(
            [
                "create",
                "--source-root",
                str(root),
                "--destination",
                str(output),
                "--passphrase-file",
                str(secret),
            ]
        )
        == 0
    )
    assert main(["verify", "--archive", str(output), "--passphrase-file", str(secret)]) == 0
    assert (
        main(
            [
                "restore",
                "--archive",
                str(output),
                "--target-root",
                str(tmp_path / "restored"),
                "--passphrase-file",
                str(secret),
            ]
        )
        == 0
    )
    short = tmp_path / "short.txt"
    short.write_text("short", encoding="utf-8")
    assert main(["verify", "--archive", str(output), "--passphrase-file", str(short)]) == 1
    messages = capsys.readouterr()
    assert "my very long unique" not in messages.out + messages.err
