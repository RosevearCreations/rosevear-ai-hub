"""QL-461 local-original-host-only installer receipt; no service mutations.

Run from protected Windows administrator console after scheduled observer is
enabled and actually running. Store private witness key outside Git and webroot.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import sys
import time
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST, load_local_manifest349
from rosevear_ai_hub.original_host_witness352 import (
    build_local_receipt352,
    inspect_windows_task352,
    verify_signed_witness352,
)
from rosevear_ai_hub.service_identity347 import _digest


def main() -> int:
    if os.name != "nt" or platform.node().upper() != ORIGINAL_HOST:
        print("HOLD_NOT_ORIGINAL_WINDOWS_HOST")
        return 2
    env = {
        name: os.environ.get(name) for name in (
            "ROSEVEAR_QL458_MANIFEST_PATH",
            "ROSEVEAR_QL458_OWNER_KEY_PATH",
            "ROSEVEAR_QL458_OWNER_KEY_PIN",
            "ROSEVEAR_QL461_WITNESS_PRIV_PATH",
            "ROSEVEAR_QL461_WITNESS_PUB_PIN",
            "ROSEVEAR_QL461_RECEIPT_PATH",
        )
    }
    if not all(env.values()):
        print("HOLD_OWNER_OR_INDEPENDENT_WITNESS_CONFIGURATION_MISSING")
        return 2
    now = int(time.time() * 1000)
    enrollment = load_local_manifest349(
        Path(env["ROSEVEAR_QL458_MANIFEST_PATH"]),
        Path(env["ROSEVEAR_QL458_OWNER_KEY_PATH"]),
        env["ROSEVEAR_QL458_OWNER_KEY_PIN"], now, platform.node(),
    )
    if not enrollment["accepted"]:
        print("HOLD_SIGNED_ORIGINAL_HOST_ENROLLMENT")
        return 2
    private_path = Path(env["ROSEVEAR_QL461_WITNESS_PRIV_PATH"])
    receipt_path = Path(env["ROSEVEAR_QL461_RECEIPT_PATH"])
    if (
        private_path.is_symlink() or not private_path.is_file()
        or private_path.stat().st_size != 32
        or not receipt_path.parent.is_dir() or receipt_path.is_symlink()
    ):
        print("HOLD_PRIVATE_KEY_OR_RECEIPT_PATH")
        return 2
    try:
        private = Ed25519PrivateKey.from_private_bytes(private_path.read_bytes())
        public = private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    except (ValueError, OSError):
        return 2
    pin = hashlib.sha256(public).hexdigest()
    if pin != env["ROSEVEAR_QL461_WITNESS_PUB_PIN"] or (
        pin == env["ROSEVEAR_QL458_OWNER_KEY_PIN"]
    ):
        print("HOLD_WITNESS_KEY_NOT_INDEPENDENTLY_PINNED")
        return 2
    task = inspect_windows_task352()
    if task is None:
        print("HOLD_SCHEDULED_TASK_NOT_READABLE")
        return 2
    receipt = build_local_receipt352(
        enrollment=enrollment, task=task, private_key=private, now_ms=now,
    )
    if receipt is None or not verify_signed_witness352(
        receipt=receipt, public_key=public, independent_pin=pin,
        owner_pin=env["ROSEVEAR_QL458_OWNER_KEY_PIN"],
        manifest_digest=_digest(enrollment["payload"]), now_ms=now,
    )["verified"]:
        print("HOLD_TASK_OR_REBOOT_WITNESS_UNVERIFIED")
        return 2
    temp = receipt_path.with_suffix(receipt_path.suffix + ".pending")
    if temp.is_symlink() or temp.exists():
        print("HOLD_RECEIPT_PENDING_FILE_EXISTS")
        return 2
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    try:
        fd = os.open(temp, flags, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(receipt, handle, sort_keys=True, separators=(",", ":"))
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp, receipt_path)
    except OSError:
        try:
            temp.unlink(missing_ok=True)
        except OSError:
            pass
        return 2
    print("SIGNED_ORIGINAL_HOST_TASK_RECEIPT_STORED_NOT_INDEPENDENT_REBOOT_ACCEPTANCE")
    return 0


if __name__ == "__main__":
    sys.exit(main())
