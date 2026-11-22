"""Provision the Build 432 original-host telemetry signer on DESKTOP-AE894KC.

The private key is generated locally and never leaves the original Windows host.
Only public-key pin evidence is printed. The affected Hub backend must be restarted
after provisioning so it inherits the persisted user environment.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import platform
import re
import subprocess
import sys
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

ORIGINAL_HOST = "DESKTOP-AE894KC"
HEX40 = re.compile(r"^[a-f0-9]{40}$")


def _repo_commit() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip().lower()


def _persist_user_environment(name: str, value: str) -> None:
    import winreg

    with winreg.OpenKey(
        winreg.HKEY_CURRENT_USER,
        r"Environment",
        0,
        winreg.KEY_SET_VALUE,
    ) as key:
        winreg.SetValueEx(key, name, 0, winreg.REG_SZ, value)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-commit", default=None)
    parser.add_argument("--key-path", default=None)
    args = parser.parse_args()

    if os.name != "nt" or platform.node().upper() != ORIGINAL_HOST:
        print("HOLD_BUILD432_NOT_ORIGINAL_WINDOWS_HOST")
        return 2

    source_commit = (args.source_commit or _repo_commit()).strip().lower()
    if not HEX40.fullmatch(source_commit):
        print("HOLD_BUILD432_SOURCE_COMMIT_INVALID")
        return 3

    program_data = Path(os.environ.get("PROGRAMDATA", r"C:\ProgramData"))
    key_path = (
        Path(args.key_path).expanduser().resolve()
        if args.key_path
        else program_data
        / "Rosevear AI Hub"
        / "build432"
        / "sysop-ed25519.pem"
    )
    key_path.parent.mkdir(parents=True, exist_ok=True)

    if key_path.exists():
        private = serialization.load_pem_private_key(
            key_path.read_bytes(),
            password=None,
        )
        if not isinstance(private, Ed25519PrivateKey):
            print("HOLD_BUILD432_EXISTING_KEY_NOT_ED25519")
            return 4
    else:
        private = Ed25519PrivateKey.generate()
        key_path.write_bytes(
            private.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            )
        )

    public_der = private.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    public_pem = private.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("ascii")
    fingerprint = hashlib.sha256(public_der).hexdigest()

    _persist_user_environment(
        "ROSEVEAR_SYSOP_TELEMETRY_PRIVATE_KEY_PATH",
        str(key_path),
    )
    _persist_user_environment(
        "ROSEVEAR_SYSOP_TELEMETRY_SOURCE_COMMIT",
        source_commit,
    )

    print(
        json.dumps(
            {
                "state": "BUILD432_SIGNER_PROVISIONED_RESTART_REQUIRED",
                "host": ORIGINAL_HOST,
                "sourceCommit": source_commit,
                "keyPath": str(key_path),
                "spkiSha256": fingerprint,
                "publicKeyPemBase64": base64.b64encode(
                    public_pem.encode("ascii")
                ).decode("ascii"),
                "privateKeyExported": False,
            },
            separators=(",", ":"),
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
