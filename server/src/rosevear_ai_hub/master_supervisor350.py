"""Build 350 / QL-459: local-only Windows three-Master service custody.

No HTTP mutation endpoints, public receiver controls, arbitrary process commands,
automatic enrollment or host installation. Owners provision signed, expiring grants
out of band. Recovery needs an explicit separately signed limited-duration grant.
"""

from __future__ import annotations

import hashlib
import os
import platform
import re
import sqlite3
import subprocess
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from rosevear_ai_hub.master_shell349 import MASTER_MODULES, ORIGINAL_HOST
from rosevear_ai_hub.service_identity347 import _canonical, _digest, _sha

SCHEMA350 = "rosevear.hub.signed-local-service-permit350.v1"
SERVICES350 = {
    "ai-data-platform": "Rosevear-AIDataPlatform",
    "rosevear-ai-hub": "Rosevear-AIHub",
    "rosevear-comms-hub": "Rosevear-CommsHub",
}
RECOVERY_COOLDOWN_MS = 10 * 60_000
RECOVERY_HOURLY_MAX = 3
FRESH_OBSERVATION_MS = 120_000
SHORT_PERMIT_MS = 60_000
RECOVERY_GRANT_MS = 24 * 60 * 60_000
NONCE_RE = re.compile(r"^[A-Za-z0-9_-]{24,128}$")
SC_STATE_RE = re.compile(r"\\bSTATE\\s*:\\s*([1-7])\\s+([A-Z_]+)")


def _hold(reason: str) -> dict[str, Any]:
    return {"accepted": False, "reason": reason, "executed": False}


def verify_permit350(
    *,
    enrollment: dict[str, Any],
    permit: Any,
    owner_public: bytes,
    owner_pin: str,
    now_ms: int,
    machine_name: str,
) -> dict[str, Any]:
    """A signed QL-458 manifest alone can never start or stop a service."""
    if not (
        enrollment.get("accepted") is True
        and type(enrollment.get("payload")) is dict
        and type(now_ms) is int
        and type(machine_name) is str
        and machine_name.upper() == ORIGINAL_HOST
        and type(owner_public) is bytes
        and len(owner_public) == 32
        and _sha(owner_pin)
        and hashlib.sha256(owner_public).hexdigest() == owner_pin
        and type(permit) is dict
        and set(permit) == {"payload", "signature"}
        and type(permit["payload"]) is dict
        and type(permit["signature"]) is str
        and len(permit["signature"]) == 128
    ):
        return _hold("HOLD_ORIGINAL_HOST_OR_OWNER_ATTESTATION")
    p = permit["payload"]
    if not (
        set(p)
        == {
            "schema", "originalHost", "manifestDigest", "moduleId", "serviceName",
            "action", "nonce", "issuedAtMs", "expiresAtMs",
        }
        and p["schema"] == SCHEMA350
        and p["originalHost"] == ORIGINAL_HOST
        and type(p["moduleId"]) is str
        and p["moduleId"] in MASTER_MODULES
        and p["serviceName"] == SERVICES350[p["moduleId"]]
        and p["manifestDigest"] == _digest(enrollment["payload"])
        and type(p["action"]) is str
        and p["action"] in ("start", "stop", "recover")
        and type(p["nonce"]) is str
        and NONCE_RE.fullmatch(p["nonce"]) is not None
        and type(p["issuedAtMs"]) is int
        and type(p["expiresAtMs"]) is int
        and p["issuedAtMs"] <= now_ms < p["expiresAtMs"]
        and 0 <= now_ms - p["issuedAtMs"] <= (
            RECOVERY_GRANT_MS if p["action"] == "recover" else SHORT_PERMIT_MS
        )
        and 0 < p["expiresAtMs"] - p["issuedAtMs"] <= (
            RECOVERY_GRANT_MS if p["action"] == "recover" else SHORT_PERMIT_MS
        )
    ):
        return _hold("HOLD_SCOPE_NONCE_ACTION_OR_EXPIRY")
    module = next(m for m in enrollment["payload"]["modules"] if m["id"] == p["moduleId"])
    if p["action"] != "stop" and module["desiredEnabled"] is not True:
        return _hold("HOLD_MODULE_DISABLED_BY_OWNER")
    try:
        Ed25519PublicKey.from_public_bytes(owner_public).verify(
            bytes.fromhex(permit["signature"]), _canonical(p)
        )
    except (InvalidSignature, ValueError, TypeError):
        return _hold("HOLD_INVALID_OWNER_SIGNATURE")
    return {"accepted": True, "reason": "OWNER_SIGNED_LOCAL_PERMISSION", "payload": p}


class WindowsServices350:
    """Uses only exact three Windows SCM service names, never shell/PowerShell input."""

    def _sc(self, verb: str, service: str) -> subprocess.CompletedProcess[str] | None:
        if os.name != "nt" or platform.node().upper() != ORIGINAL_HOST:
            return None
        if verb not in ("query", "start", "stop") or service not in SERVICES350.values():
            return None
        root = os.environ.get("SystemRoot")
        if not root:
            return None
        exe = Path(root) / "System32" / "sc.exe"
        if not exe.is_file():
            return None
        try:
            return subprocess.run(
                [str(exe), verb, service],
                check=False,
                shell=False,
                capture_output=True,
                text=True,
                timeout=8,
            )
        except (OSError, subprocess.TimeoutExpired):
            return None

    def inspect(self, module_id: str) -> str:
        service = SERVICES350.get(module_id)
        if service is None:
            return "UNKNOWN"
        result = self._sc("query", service)
        if result is None or result.returncode != 0:
            return "UNKNOWN"
        match = SC_STATE_RE.search(result.stdout)
        if not match:
            return "UNKNOWN"
        return {"1": "STOPPED", "4": "RUNNING"}.get(match.group(1), "TRANSITIONING")

    def change(self, module_id: str, action: str) -> str:
        service = SERVICES350.get(module_id)
        if service is None or action not in ("start", "stop"):
            return "UNVERIFIED"
        result = self._sc(action, service)
        if result is None or result.returncode != 0:
            return "UNVERIFIED"
        expected = "RUNNING" if action == "start" else "STOPPED"
        observed = self.inspect(module_id)
        return expected if observed == expected else "PENDING_RECHECK"


class CustodyJournal350:
    """Locally protected SQLite. Reserve before SCM calls to fail closed on replay."""

    def __init__(self, path: Path):
        self.path = path

    def initialize(self) -> bool:
        if self.path.is_symlink() or not self.path.parent.is_dir():
            return False
        try:
            with sqlite3.connect(self.path, timeout=3) as db:
                db.execute("PRAGMA journal_mode=WAL")
                db.execute("PRAGMA synchronous=FULL")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS actions350 (
                    attempt_id TEXT PRIMARY KEY, grant_id TEXT NOT NULL,
                    module_id TEXT NOT NULL, action TEXT NOT NULL,
                    observed_ms INTEGER NOT NULL, outcome TEXT NOT NULL)"""
                )
                db.execute(
                    """CREATE TABLE IF NOT EXISTS observations350 (
                    module_id TEXT PRIMARY KEY, manifest_digest TEXT NOT NULL,
                    observed_ms INTEGER NOT NULL, state TEXT NOT NULL)"""
                )
            return True
        except (sqlite3.Error, OSError):
            return False

    def reserve(self, grant_id: str, module: str, action: str, now_ms: int) -> str | None:
        """Unique commands; bounded shared per-module recovery quota and cooldown."""
        attempt = (
            grant_id + "-" + str(now_ms // RECOVERY_COOLDOWN_MS)
            if action == "recover" else grant_id
        )
        if not self.path.is_file() or self.path.is_symlink():
            return None
        try:
            with sqlite3.connect(self.path, isolation_level=None, timeout=3) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                if action == "recover":
                    count, last = db.execute(
                        """SELECT COUNT(*), MAX(observed_ms) FROM actions350
                        WHERE module_id = ? AND action = 'recover' AND observed_ms > ?""",
                        (module, now_ms - 3_600_000),
                    ).fetchone()
                    if count >= RECOVERY_HOURLY_MAX or (
                        last is not None and now_ms - last < RECOVERY_COOLDOWN_MS
                    ):
                        db.execute("ROLLBACK")
                        return None
                db.execute(
                    "INSERT INTO actions350 VALUES (?,?,?,?,?,?)",
                    (attempt, grant_id, module, action, now_ms, "RESERVED"),
                )
                db.execute("COMMIT")
            return attempt
        except (sqlite3.Error, OSError):
            return None

    def finish(self, attempt: str, outcome: str) -> bool:
        if outcome not in ("RUNNING", "STOPPED", "PENDING_RECHECK", "UNVERIFIED"):
            return False
        try:
            with sqlite3.connect(self.path, timeout=3) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute(
                    """UPDATE actions350 SET outcome = ?
                    WHERE attempt_id = ? AND outcome = 'RESERVED'""",
                    (outcome, attempt),
                )
                return db.total_changes == 1
        except (sqlite3.Error, OSError):
            return False

    def observe(self, module: str, manifest_digest: str, state: str, now_ms: int) -> bool:
        if module not in MASTER_MODULES or state not in (
            "RUNNING", "STOPPED", "TRANSITIONING", "UNKNOWN"
        ) or not _sha(manifest_digest):
            return False
        try:
            with sqlite3.connect(self.path, timeout=3) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute(
                    """INSERT INTO observations350 VALUES (?,?,?,?)
                    ON CONFLICT(module_id) DO UPDATE SET
                    manifest_digest=excluded.manifest_digest,
                    observed_ms=excluded.observed_ms,
                    state=excluded.state""",
                    (module, manifest_digest, now_ms, state),
                )
            return True
        except (sqlite3.Error, OSError):
            return False

    def recent(self, manifest_digest: str, now_ms: int) -> dict[str, Any]:
        if not _sha(manifest_digest) or not self.path.is_file() or self.path.is_symlink():
            return {}
        try:
            with sqlite3.connect(f"file:{self.path}?mode=ro", uri=True, timeout=2) as db:
                rows = db.execute(
                    """SELECT module_id, manifest_digest, observed_ms, state
                    FROM observations350"""
                ).fetchall()
        except (sqlite3.Error, OSError):
            return {}
        return {
            module: {"state": state, "observedAtMs": at}
            for module, digest, at, state in rows
            if module in MASTER_MODULES and digest == manifest_digest
            and type(at) is int and 0 <= now_ms - at <= FRESH_OBSERVATION_MS
            and state in ("RUNNING", "STOPPED", "TRANSITIONING", "UNKNOWN")
        }


def apply_local_action350(
    *,
    enrollment: dict[str, Any],
    permit: Any,
    owner_public: bytes,
    owner_pin: str,
    journal: CustodyJournal350,
    controller: WindowsServices350,
    now_ms: int,
    machine_name: str,
) -> dict[str, Any]:
    """Production caller MUST run locally with Windows admin & protected permit files."""
    verified = verify_permit350(
        enrollment=enrollment, permit=permit, owner_public=owner_public,
        owner_pin=owner_pin, now_ms=now_ms, machine_name=machine_name,
    )
    if not verified["accepted"]:
        return verified
    if not isinstance(controller, WindowsServices350) or not isinstance(journal, CustodyJournal350):
        return _hold("HOLD_UNTRUSTED_SERVICE_CONTROLLER")
    if os.name != "nt" or platform.node().upper() != ORIGINAL_HOST:
        return _hold("HOLD_NOT_ORIGINAL_WINDOWS_HOST")
    p = verified["payload"]
    module = p["moduleId"]
    previous = controller.inspect(module)
    if previous not in ("STOPPED", "RUNNING"):
        return _hold("HOLD_SERVICE_STATE_UNVERIFIED")
    if p["action"] == "recover" and previous != "STOPPED":
        return _hold("HOLD_RECOVERY_REQUIRES_STOPPED")
    if p["action"] == "start" and previous == "RUNNING":
        return _hold("HOLD_ALREADY_RUNNING_NO_REPLAY")
    if p["action"] == "stop" and previous == "STOPPED":
        return _hold("HOLD_ALREADY_STOPPED_NO_REPLAY")
    attempt = journal.reserve(p["nonce"], module, p["action"], now_ms)
    if attempt is None:
        return _hold("HOLD_REPLAY_OR_RECOVERY_BUDGET")
    action = "start" if p["action"] == "recover" else p["action"]
    state = controller.change(module, action)
    if not journal.finish(attempt, state):
        return _hold("HOLD_JOURNAL_FINALIZATION_UNVERIFIED")
    journal.observe(module, p["manifestDigest"], controller.inspect(module), now_ms)
    return {
        "accepted": state == ("RUNNING" if action == "start" else "STOPPED"),
        "reason": "SCM_VERIFIED_" + state if state != "UNVERIFIED" else "HOLD_SCM_UNVERIFIED",
        "executed": True, "moduleId": module, "observedState": state,
        "receiverActivationAuthorized": False,
    }


def observe_local_modules350(
    enrollment: dict[str, Any], journal: CustodyJournal350,
    controller: WindowsServices350, now_ms: int, machine_name: str,
) -> dict[str, Any]:
    """Read-only SCM observations; no implicit recovery, no start/stop, no network."""
    if not (
        enrollment.get("accepted") is True
        and type(machine_name) is str
        and machine_name.upper() == ORIGINAL_HOST
        and os.name == "nt"
        and platform.node().upper() == ORIGINAL_HOST
    ):
        return {"observed": False, "reason": "HOLD_ORIGINAL_HOST_OR_ENROLLMENT"}
    digest = _digest(enrollment["payload"])
    values: dict[str, str] = {}
    for module in MASTER_MODULES:
        state = controller.inspect(module)
        if not journal.observe(module, digest, state, now_ms):
            return {"observed": False, "reason": "HOLD_DURABLE_OBSERVATION"}
        values[module] = state
    return {"observed": True, "states": values, "receiverActivationAuthorized": False}
