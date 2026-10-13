"""Encrypted offline-recovery archives for the local Rosevear AI Hub.

Backups use the SQLite online-backup API, SHA-256 per file, and streaming
scrypt + AES-256-GCM. Restores always stage into a NEW directory and never
overwrite a live installation.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import sys
import tarfile
import tempfile
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

MAGIC = b"RAH47ENC1"
SALT_SIZE = 16
NONCE_SIZE = 12
TAG_SIZE = 16
CHUNK = 1024 * 1024
MAX_FILE_BYTES = 2 * 1024**3
MAX_TOTAL_BYTES = 8 * 1024**3
MAX_FILE_COUNT = 20_000
MANIFEST = "backup-manifest.json"
DATABASE = "database/hub.sqlite3"
FOLDERS = ("data/knowledge", "data/go2rtc")


class BackupError(Exception):
    """A fail-closed backup, validation, or restore refusal."""


def _passphrase(path: Path | bytes) -> bytes:
    # Current-user DPAPI automation can supply bytes in memory. Existing file
    # callers retain their interface; neither route prints or logs the secret.
    if isinstance(path, bytes):
        data = path
    else:
        if path.is_symlink() or not path.is_file():
            raise BackupError("Passphrase file missing or is a symbolic link.")
        data = path.read_bytes().rstrip(b"\r\n")
    if len(data) < 20 or len(data) > 4096:
        raise BackupError("Passphrase must contain 20 to 4096 bytes.")
    return data


def _key(passphrase: bytes, salt: bytes) -> bytes:
    return Scrypt(salt=salt, length=32, n=2**15, r=8, p=1).derive(passphrase)


def _sha256(path: Path) -> tuple[int, str]:
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as reader:
        while block := reader.read(CHUNK):
            size += len(block)
            if size > MAX_FILE_BYTES:
                raise BackupError("Backup input file exceeds the per-file limit.")
            digest.update(block)
    return size, digest.hexdigest()


def _safe_name(name: str) -> bool:
    if not isinstance(name, str) or not name or "\\" in name:
        return False
    path = PurePosixPath(name)
    return (
        not path.is_absolute()
        and all(part not in (".", "..", "") for part in name.split("/"))
        and (name == DATABASE or any(name.startswith(folder + "/") for folder in FOLDERS))
    )


def _sqlite_check(path: Path) -> None:
    try:
        connection = sqlite3.connect(f"{path.as_uri()}?mode=ro", uri=True)
        try:
            if connection.execute("PRAGMA integrity_check").fetchone() != ("ok",):
                raise BackupError("SQLite integrity check failed.")
        finally:
            connection.close()
    except sqlite3.DatabaseError as exc:
        raise BackupError("SQLite database is corrupt or invalid.") from exc


def _snapshot_database(source: Path, snapshot: Path) -> None:
    if not source.is_file() or source.is_symlink():
        raise BackupError("Source SQLite database is missing or a symbolic link.")
    _sqlite_check(source)
    try:
        live = sqlite3.connect(f"{source.as_uri()}?mode=ro", uri=True, timeout=15)
        try:
            # sqlite3's connection context manager does not close the database.
            # Close handles explicitly so Windows can remove temporary snapshots.
            target = sqlite3.connect(snapshot)
            try:
                live.backup(target, pages=100, sleep=0.1)
                target.commit()
            finally:
                target.close()
        finally:
            live.close()
    except sqlite3.DatabaseError as exc:
        raise BackupError("SQLite online backup failed.") from exc
    _sqlite_check(snapshot)


def _snapshot_inputs(root: Path, stage: Path) -> dict[str, dict[str, object]]:
    src_db = root / "data" / "rosevear_ai_hub.db"
    db = stage / DATABASE
    db.parent.mkdir(parents=True)
    _snapshot_database(src_db, db)
    files: dict[str, dict[str, object]] = {}
    total = 0

    def record(name: str, path: Path) -> None:
        nonlocal total
        size, digest = _sha256(path)
        total += size
        if total > MAX_TOTAL_BYTES or len(files) >= MAX_FILE_COUNT:
            raise BackupError("Backup exceeds file-count or total-size limit.")
        files[name] = {"size": size, "sha256": digest}

    record(DATABASE, db)
    for folder in FOLDERS:
        source_dir = root / folder
        if not source_dir.exists():
            continue
        if source_dir.is_symlink() or not source_dir.is_dir():
            raise BackupError("Backup data directory is not a regular directory.")
        for current, dirs, names in os.walk(source_dir, followlinks=False):
            for directory in dirs:
                if (Path(current) / directory).is_symlink():
                    raise BackupError("Backup refuses directory symbolic links.")
            for filename in names:
                original = Path(current) / filename
                if original.is_symlink() or not original.is_file():
                    raise BackupError("Backup refuses symbolic links and special files.")
                relative = original.relative_to(root).as_posix()
                if not _safe_name(relative):
                    raise BackupError("Unexpected backup source path.")
                destination = stage / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                with original.open("rb") as reader, destination.open("xb") as writer:
                    copied = 0
                    while block := reader.read(CHUNK):
                        copied += len(block)
                        if copied > MAX_FILE_BYTES:
                            raise BackupError("Backup input file exceeds per-file limit.")
                        writer.write(block)
                record(relative, destination)
    return files


def _encrypt(plaintext: Path, output: Path, secret: bytes) -> None:
    salt, nonce = os.urandom(SALT_SIZE), os.urandom(NONCE_SIZE)
    encryptor = Cipher(algorithms.AES(_key(secret, salt)), modes.GCM(nonce)).encryptor()
    with plaintext.open("rb") as reader, output.open("xb") as writer:
        writer.write(MAGIC + salt + nonce)
        while block := reader.read(CHUNK):
            writer.write(encryptor.update(block))
        writer.write(encryptor.finalize())
        writer.write(encryptor.tag)


def _decrypt(archive: Path, plaintext: Path, secret: bytes) -> None:
    if archive.is_symlink() or not archive.is_file():
        raise BackupError("Encrypted backup archive not found.")
    size = archive.stat().st_size
    header_len = len(MAGIC) + SALT_SIZE + NONCE_SIZE
    if size <= header_len + TAG_SIZE or size > MAX_TOTAL_BYTES + 1024**3:
        raise BackupError("Encrypted archive has invalid size.")
    with archive.open("rb") as reader:
        header = reader.read(header_len)
        if header[: len(MAGIC)] != MAGIC:
            raise BackupError("Unrecognized backup archive format.")
        salt = header[len(MAGIC) : len(MAGIC) + SALT_SIZE]
        nonce = header[-NONCE_SIZE:]
        reader.seek(size - TAG_SIZE)
        tag = reader.read(TAG_SIZE)
        reader.seek(header_len)
        remaining = size - header_len - TAG_SIZE
        decryptor = Cipher(algorithms.AES(_key(secret, salt)), modes.GCM(nonce, tag)).decryptor()
        try:
            with plaintext.open("xb") as writer:
                while remaining:
                    block = reader.read(min(CHUNK, remaining))
                    if not block:
                        raise BackupError("Encrypted archive is truncated.")
                    remaining -= len(block)
                    writer.write(decryptor.update(block))
                writer.write(decryptor.finalize())
        except InvalidTag as exc:
            raise BackupError(
                "Archive authentication failed: wrong passphrase or damaged file."
            ) from exc


def _extract_validated(tar_path: Path, destination: Path) -> dict[str, object]:
    observed: dict[str, dict[str, object]] = {}
    total = 0
    with tarfile.open(tar_path, mode="r:gz") as archive:
        members = archive.getmembers()
        if not members or len(members) > MAX_FILE_COUNT + 1:
            raise BackupError("Archive file count is invalid.")
        seen: set[str] = set()
        manifest_data: object = None
        for entry in members:
            name = entry.name
            if name in seen or not entry.isfile():
                raise BackupError("Archive has duplicate, symbolic-link, or special entry.")
            seen.add(name)
            if name != MANIFEST and not _safe_name(name):
                raise BackupError("Archive contains an unsafe path.")
            if entry.size > MAX_FILE_BYTES or entry.size < 0:
                raise BackupError("Archive file size is invalid.")
            total += entry.size
            if total > MAX_TOTAL_BYTES:
                raise BackupError("Archive extracted size limit exceeded.")
            content = archive.extractfile(entry)
            if content is None:
                raise BackupError("Cannot read archive file.")
            if name == MANIFEST:
                if entry.size > CHUNK:
                    raise BackupError("Manifest is too large.")
                try:
                    manifest_data = json.loads(content.read(CHUNK + 1))
                except (ValueError, UnicodeDecodeError) as exc:
                    raise BackupError("Manifest JSON invalid.") from exc
                continue
            target = destination / name
            target.parent.mkdir(parents=True, exist_ok=True)
            digest = hashlib.sha256()
            copied = 0
            with target.open("xb") as writer:
                while block := content.read(CHUNK):
                    copied += len(block)
                    if copied > MAX_FILE_BYTES:
                        raise BackupError("Extracted file size limit exceeded.")
                    digest.update(block)
                    writer.write(block)
            if copied != entry.size:
                raise BackupError("Archive member size mismatch.")
            observed[name] = {"size": copied, "sha256": digest.hexdigest()}

    if not isinstance(manifest_data, dict) or manifest_data.get("format") != 1:
        raise BackupError("Backup manifest version is unsupported.")
    if manifest_data.get("files") != observed or DATABASE not in observed:
        raise BackupError("Manifest hashes or file list do not match archive.")
    _sqlite_check(destination / DATABASE)
    return {"files": len(observed), "bytes": sum(x["size"] for x in observed.values())}


def inspect_backup(archive: Path, passphrase_file: Path | bytes) -> dict[str, object]:
    """Authenticate, fully extract in temporary storage, verify hashes and SQLite."""
    with tempfile.TemporaryDirectory(prefix="hub47-verify-") as temp:
        area = Path(temp)
        _decrypt(archive, area / "archive.tar.gz", _passphrase(passphrase_file))
        content = area / "extracted"
        content.mkdir()
        return _extract_validated(area / "archive.tar.gz", content)


def create_backup(
    root: Path, destination: Path, passphrase_file: Path | bytes
) -> dict[str, object]:
    """Create encrypted, verified backup from online SQLite plus selected stored files."""
    root = root.resolve(strict=True)
    destination = destination.absolute()
    if destination.exists() or destination.is_symlink() or not destination.parent.is_dir():
        raise BackupError("Backup destination must be a new file in an existing directory.")
    secret = _passphrase(passphrase_file)
    with tempfile.TemporaryDirectory(prefix="hub47-create-") as temp:
        stage = Path(temp) / "files"
        stage.mkdir()
        files = _snapshot_inputs(root, stage)
        manifest = {
            "format": 1,
            "created_utc": datetime.now(UTC).isoformat(),
            "files": files,
        }
        (stage / MANIFEST).write_text(json.dumps(manifest, sort_keys=True), encoding="utf-8")
        archive = Path(temp) / "snapshot.tar.gz"
        with tarfile.open(archive, "w:gz") as tar:
            for name in [MANIFEST, *sorted(files)]:
                tar.add(stage / name, arcname=name, recursive=False)
        with tempfile.TemporaryDirectory(dir=destination.parent, prefix=".hub47-") as final_temp:
            encrypted = Path(final_temp) / "encrypted.tmp"
            _encrypt(archive, encrypted, secret)
            result = inspect_backup(encrypted, passphrase_file)
            # Atomic, no-clobber publication on the same volume, even under concurrency.
            try:
                os.link(encrypted, destination)
            except FileExistsError as exc:
                raise BackupError("Backup destination already exists.") from exc
            return result


def restore_to_new_root(
    archive: Path, target_root: Path, passphrase_file: Path | bytes
) -> dict[str, object]:
    """Restore only to an absent target directory (never overwrite live Hub)."""
    target_root = target_root.absolute()
    if target_root.exists() or target_root.is_symlink() or not target_root.parent.is_dir():
        raise BackupError("Restore target must not exist and its parent must exist.")
    with tempfile.TemporaryDirectory(dir=target_root.parent, prefix=".hub47-restore-") as temp:
        area = Path(temp)
        _decrypt(archive, area / "archive.tar.gz", _passphrase(passphrase_file))
        data = area / "staged"
        data.mkdir()
        result = _extract_validated(area / "archive.tar.gz", data)
        # Never delete or silently overwrite an existing destination.
        if target_root.exists() or target_root.is_symlink():
            raise BackupError("Restore destination already exists.")
        data.rename(target_root)
        return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Hub 047: encrypted SQLite and knowledge backup")
    subs = parser.add_subparsers(dest="command", required=True)
    create = subs.add_parser("create", help="Online SQLite snapshot and encrypted backup")
    create.add_argument("--source-root", type=Path, required=True)
    create.add_argument("--destination", type=Path, required=True)
    verify = subs.add_parser("verify", help="Authenticate and verify full backup")
    verify.add_argument("--archive", type=Path, required=True)
    restore = subs.add_parser("restore", help="Extract to NEW recovery directory only")
    restore.add_argument("--archive", type=Path, required=True)
    restore.add_argument("--target-root", type=Path, required=True)
    for item in (create, verify, restore):
        item.add_argument("--passphrase-file", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == "create":
            result = create_backup(args.source_root, args.destination, args.passphrase_file)
        elif args.command == "verify":
            result = inspect_backup(args.archive, args.passphrase_file)
        else:
            result = restore_to_new_root(args.archive, args.target_root, args.passphrase_file)
    except (BackupError, OSError, tarfile.TarError, ValueError) as exc:
        print(f"Backup operation refused: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    print(f"Verified {result['files']} files ({result['bytes']} plaintext bytes).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
