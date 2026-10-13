"""Private local key enrollment and per-adoption encrypted backup rehearsal.

The provision action MUST run in a separate local interactive console. Never
enter a passphrase in a chat, argument, environment variable or recorded tool.
DPAPI is current-user scoped; no plaintext key file is written by this helper.
"""

from __future__ import annotations

import argparse
import base64
import ctypes
import getpass
import json
import os
import subprocess
import sys
from ctypes import wintypes
from datetime import UTC, datetime
from pathlib import Path


class Blob(ctypes.Structure):
    _fields_ = [("size", wintypes.DWORD), ("data", ctypes.POINTER(ctypes.c_ubyte))]


def protect(data, decrypt=False):
    buffer = (ctypes.c_ubyte * len(data)).from_buffer_copy(data)
    source = Blob(len(data), buffer)
    result = Blob()
    crypt = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.LocalFree.argtypes = [ctypes.c_void_p]
    kernel.LocalFree.restype = ctypes.c_void_p
    fn = crypt.CryptUnprotectData if decrypt else crypt.CryptProtectData
    fn.argtypes = [
        ctypes.POINTER(Blob),
        ctypes.c_void_p,
        ctypes.c_void_p,
        ctypes.c_void_p,
        ctypes.c_void_p,
        wintypes.DWORD,
        ctypes.POINTER(Blob),
    ]
    fn.restype = wintypes.BOOL
    if not fn(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(result)):
        raise RuntimeError("Current-user DPAPI operation failed.")
    try:
        return ctypes.string_at(result.data, result.size)
    finally:
        ctypes.memset(result.data, 0, result.size)
        kernel.LocalFree(result.data)
        ctypes.memset(buffer, 0, len(buffer))


def secure_folder(path):
    path.mkdir(parents=True, exist_ok=True)
    sid = (
        subprocess.check_output(["whoami.exe", "/user", "/fo", "csv", "/nh"], text=True)
        .strip()
        .split(",")[-1]
        .strip('"')
    )
    result = subprocess.run(
        [
            "icacls.exe",
            str(path),
            "/inheritance:r",
            "/grant:r",
            f"*{sid}:(OI)(CI)F",
            "*S-1-5-18:(OI)(CI)F",
        ],
        capture_output=True,
    )
    if result.returncode:
        raise RuntimeError("Could not restrict backup directory permissions.")
    escaped = str(path).replace("'", "''")
    check = (
        "$ErrorActionPreference='Stop'; "
        f"$acl=Get-Acl -LiteralPath '{escaped}'; "
        f"$allowed=@('{sid}','S-1-5-18','S-1-5-32-544'); "
        "foreach($rule in $acl.Access) { "
        "$sidType=[Security.Principal.SecurityIdentifier]; "
        "$ruleSid=$rule.IdentityReference.Translate($sidType).Value; "
        "if ($rule.AccessControlType -eq 'Allow' -and $ruleSid -notin $allowed) "
        "{throw 'Unexpected backup folder access grant'} }"
    )
    result = subprocess.run(
        [
            "powershell.exe",
            "-NoProfile",
            "-NonInteractive",
            "-EncodedCommand",
            base64.b64encode(check.encode("utf-16le")).decode("ascii"),
        ],
        capture_output=True,
    )
    if result.returncode:
        raise RuntimeError(
            "Backup directory grants access beyond its owner, SYSTEM and administrators."
        )


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("action", choices=["provision", "create"])
    p.add_argument("--repo-root", type=Path, required=True)
    args = p.parse_args()
    if os.name != "nt":
        raise RuntimeError("Current-user DPAPI enrollment requires Windows.")
    if args.action == "provision" and not sys.stdin.isatty():
        raise RuntimeError("Provisioning requires a private local interactive console.")
    root = args.repo_root.resolve()
    home = root / "logs/private-recovery"
    if home.is_symlink() or not home.resolve().is_relative_to(root):
        raise RuntimeError("Backup directory must stay inside the approved live root.")
    secure_folder(home)
    key = home / "backup-key.dpapi"
    if key.is_symlink():
        raise RuntimeError("Protected backup key must not be a file link.")
    if args.action == "provision":
        if key.exists():
            raise RuntimeError("Existing protected key will not be overwritten.")
        print("Private local enrollment. Save the passphrase separately before continuing.")
        while True:
            secret = getpass.getpass("Backup passphrase (20+ UTF-8 bytes): ")
            if secret != getpass.getpass("Confirm privately: "):
                print("Entries differ; try again. No key has been stored.")
                continue
            if not 20 <= len(secret.encode()) <= 4096:
                print("Use 20 to 4096 UTF-8 bytes; try again. No key has been stored.")
                continue
            break
        if (
            input("Type SAVED to confirm separate escrow and current-user DPAPI storage: ")
            != "SAVED"
        ):
            raise RuntimeError("Private enrollment cancelled.")
        with key.open("xb") as writer:
            writer.write(protect(secret.encode()))
        print("Current-user DPAPI key enrolled. Test a real backup before scheduling updates.")
        return
    sys.path.insert(0, str(root / "server/src"))
    import tempfile

    from sqlalchemy.engine import make_url

    from rosevear_ai_hub.backup import create_backup
    from rosevear_ai_hub.config import get_settings
    from rosevear_ai_hub.disaster_recovery import drill_archive

    configured = make_url(get_settings().database_url)
    if (
        configured.get_backend_name() != "sqlite"
        or Path(configured.database).resolve() != (root / "data/rosevear_ai_hub.db").resolve()
    ):
        raise RuntimeError("Configured database differs from the supported backup source.")

    secret = protect(key.read_bytes(), decrypt=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    archive = home / f"hub-{stamp}.hubbackup"
    evidence = home / f"hub-{stamp}-verified.json"
    with tempfile.TemporaryDirectory(dir=home, prefix="private-scratch-") as temp:
        create_backup(root, archive, secret)
        record = drill_archive(archive, secret, Path(temp))
    del secret
    record.update(
        {
            "archive_filename": archive.name,
            "scratch_cleanup_verified": not Path(temp).exists(),
            "off_machine_copy_verified": False,
        }
    )
    with evidence.open("x", encoding="utf-8") as writer:
        json.dump(record, writer, indent=2)
    # Only this metadata file path leaves the local helper; never the key.
    print(evidence)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Private backup failed: " + type(error).__name__, file=sys.stderr)
        raise SystemExit(1) from None
