"""QL-461: independently pinned original-host Task Scheduler and reboot receipts.

A second Ed25519 witness key (distinct from the manifest owner key) signs facts
captured locally from the original Windows host. This is proof of a signed
host-side report, NOT third-party witnessing or proof of unattended operation.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import subprocess
import time
from pathlib import Path, PureWindowsPath
from datetime import datetime, timezone
from typing import Any

import psutil
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.service_identity347 import _canonical, _digest, _sha

WITNESS_SCHEMA352 = "rosevear.hub.signed-original-host-witness352.v1"
TASK_NAME352 = "Rosevear Three-Master Observer QL460"
MAX_WITNESS_AGE_MS = 120_000
TASK_FIELDS352 = {
    "name", "state", "principal", "trigger", "command", "arguments",
    "lastRunTimeUtc", "lastTaskResult",
}


def _host() -> bool:
    return os.name == "nt" and platform.node().upper() == ORIGINAL_HOST


def inspect_windows_task352() -> dict[str, Any] | None:
    """Literal, allowlisted, read-only PowerShell command; no caller input."""
    if not _host():
        return None
    script = """
$ErrorActionPreference='Stop'
$t=Get-ScheduledTask -TaskName 'Rosevear Three-Master Observer QL460' -ErrorAction Stop
$i=Get-ScheduledTaskInfo -TaskName 'Rosevear Three-Master Observer QL460' -ErrorAction Stop
if (@($t.Actions).Count -ne 1 -or @($t.Triggers).Count -ne 1) { throw 'HOLD_TASK_MISMATCH' }
[pscustomobject]@{
 name=$t.TaskName;state=[string]$t.State;principal=[string]$t.Principal.UserId;
 trigger=[string]$t.Triggers[0].CimClass.CimClassName;
 command=[string]$t.Actions[0].Execute;arguments=[string]$t.Actions[0].Arguments;
 lastRunTimeUtc=$i.LastRunTime.ToUniversalTime().ToString('o');
 lastTaskResult=[int]$i.LastTaskResult
} | ConvertTo-Json -Compress
"""
    try:
        result = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script],
            check=False, capture_output=True, text=True, timeout=12, shell=False,
        )
        if result.returncode != 0 or len(result.stdout) > 8192:
            return None
        data = json.loads(result.stdout)
        return data if type(data) is dict and set(data) == TASK_FIELDS352 else None
    except (OSError, subprocess.TimeoutExpired, ValueError, UnicodeError):
        return None


def valid_task352(task: Any) -> bool:
    if not (type(task) is dict and set(task) == TASK_FIELDS352):
        return False
    command = task["command"]
    args = task["arguments"]
    return (
        task["name"] == TASK_NAME352
        and task["state"] in ("Ready", "Running")
        and task["principal"] in ("SYSTEM", "S-1-5-18")
        and task["trigger"] == "MSFT_TaskBootTrigger"
        and type(command) is str
        and PureWindowsPath(command).name.lower() in ("python.exe", "pythonw.exe")
        and PureWindowsPath(command).is_absolute()
        and type(args) is str and args.count("--watch") == 1
        and "--recovery-grants" not in args
        and "hub_master_supervisor350.py" in args
        and type(task["lastRunTimeUtc"]) is str
        and len(task["lastRunTimeUtc"]) <= 48
        and type(task["lastTaskResult"]) is int
        and task["lastTaskResult"] in (0, 267009)
    )


def _task_run_matches_boot352(value: str, boot_ms: int, observed_ms: int) -> bool:
    """Actual Task Scheduler last run must be after this boot and before capture."""
    try:
        stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            return False
        at_ms = round(stamp.astimezone(timezone.utc).timestamp() * 1000)
        return boot_ms <= at_ms <= observed_ms
    except (ValueError, OverflowError, OSError, TypeError):
        return False


def build_local_receipt352(
    *, enrollment: dict[str, Any], task: dict[str, Any],
    private_key: Ed25519PrivateKey, now_ms: int,
) -> dict[str, Any] | None:
    """Owner-run local ceremony only; never callable from an HTTP handler."""
    if not (
        _host() and enrollment.get("accepted") is True and valid_task352(task)
        and isinstance(private_key, Ed25519PrivateKey)
        and type(now_ms) is int
    ):
        return None
    boot_ms = round(psutil.boot_time() * 1000)
    if not (
        0 <= now_ms - boot_ms <= 365 * 86_400_000
        and _task_run_matches_boot352(task["lastRunTimeUtc"], boot_ms, now_ms)
    ):
        return None
    payload = {
        "schema": WITNESS_SCHEMA352,
        "originalHost": ORIGINAL_HOST,
        "manifestDigest": _digest(enrollment["payload"]),
        "bootMs": boot_ms,
        "observedAtMs": now_ms,
        "task": task,
        "receiverActivationAuthorized": False,
    }
    return {"payload": payload, "signature": private_key.sign(_canonical(payload)).hex()}


def verify_signed_witness352(
    *, receipt: Any, public_key: bytes, independent_pin: str,
    owner_pin: str, manifest_digest: str, now_ms: int,
) -> dict[str, Any]:
    hold = {
        "verified": False, "status": "HOLD_NO_FRESH_INDEPENDENTLY_PINNED_HOST_RECEIPT",
        "bootMs": None, "taskState": "UNVERIFIED",
        "taskAutostartProven": False, "independentThirdPartyWitness": False,
        "receiverActivationAuthorized": False,
    }
    if not (
        type(receipt) is dict and set(receipt) == {"payload", "signature"}
        and type(receipt["payload"]) is dict
        and type(receipt["signature"]) is str and len(receipt["signature"]) == 128
        and type(public_key) is bytes and len(public_key) == 32
        and _sha(independent_pin) and _sha(owner_pin) and _sha(manifest_digest)
        and independent_pin != owner_pin
        and hashlib.sha256(public_key).hexdigest() == independent_pin
        and type(now_ms) is int
    ):
        return hold
    p = receipt["payload"]
    if not (
        set(p) == {
            "schema", "originalHost", "manifestDigest", "bootMs",
            "observedAtMs", "task", "receiverActivationAuthorized",
        }
        and p["schema"] == WITNESS_SCHEMA352
        and p["originalHost"] == ORIGINAL_HOST
        and p["manifestDigest"] == manifest_digest
        and p["receiverActivationAuthorized"] is False
        and type(p["bootMs"]) is int and type(p["observedAtMs"]) is int
        and 0 <= now_ms - p["observedAtMs"] <= MAX_WITNESS_AGE_MS
        and 0 <= p["observedAtMs"] - p["bootMs"] <= 365 * 86_400_000
        and valid_task352(p["task"])
        and _task_run_matches_boot352(
            p["task"]["lastRunTimeUtc"], p["bootMs"], p["observedAtMs"],
        )
    ):
        return hold
    try:
        Ed25519PublicKey.from_public_bytes(public_key).verify(
            bytes.fromhex(receipt["signature"]), _canonical(p),
        )
    except (InvalidSignature, ValueError, TypeError):
        return hold
    return {
        **hold,
        "verified": True, "status": "SIGNED_LOCAL_INSTALL_AND_BOOT_OBSERVATION",
        "bootMs": p["bootMs"], "taskState": p["task"]["state"],
        "taskAutostartProven": False,
    }


def local_signed_witness_status352(
    *, enrollment: dict[str, Any], now_ms: int,
) -> dict[str, Any]:
    hold = {
        "verified": False, "status": "HOLD_NO_FRESH_INDEPENDENTLY_PINNED_HOST_RECEIPT",
        "taskAutostartProven": False, "independentThirdPartyWitness": False,
        "receiverActivationAuthorized": False, "bootMs": None, "taskState": "UNVERIFIED",
    }
    if not (_host() and enrollment.get("accepted") is True):
        return hold
    receipt_path = os.environ.get("ROSEVEAR_QL461_RECEIPT_PATH")
    witness_key_path = os.environ.get("ROSEVEAR_QL461_WITNESS_PUB_PATH")
    pin = os.environ.get("ROSEVEAR_QL461_WITNESS_PUB_PIN")
    owner_pin = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PIN")
    if not all((receipt_path, witness_key_path, pin, owner_pin)):
        return hold
    try:
        paths = (Path(receipt_path), Path(witness_key_path))
        if any(not p.is_file() or p.is_symlink() for p in paths):
            return hold
        if paths[0].stat().st_size > 8192 or paths[1].stat().st_size != 32:
            return hold
        receipt = json.loads(paths[0].read_text(encoding="utf-8"))
        public = paths[1].read_bytes()
        return verify_signed_witness352(
            receipt=receipt, public_key=public, independent_pin=pin,
            owner_pin=owner_pin, manifest_digest=_digest(enrollment["payload"]),
            now_ms=now_ms,
        )
    except (OSError, UnicodeError, ValueError, TypeError):
        return hold
