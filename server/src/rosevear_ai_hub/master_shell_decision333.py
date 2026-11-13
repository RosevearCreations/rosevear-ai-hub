"""QL-442 original-host bounded witness decision custody — no receiver controls.

A private DECISION is historical evidence, never current ON/OFF proof. These
operations require a supervised, original-host eligible monitor and NEVER
activate or restart a receiver.
"""

import json
import os
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance319 import _digest

STAGES = ("PENDING", "CLOSED", "EXCEPTION")
UNKNOWN = "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION"


def hold_decision333(reason: str) -> dict[str, Any]:
    return {
        "accepted": False,
        "state": reason,
        "connection": "HOLD",
        "activationAuthorized": False,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "manualReceiverIsolationRequired": True,
        "receiver": UNKNOWN,
        "independentFreshOffRequired": True,
        "decision": "UNVERIFIED_HOLD",
    }


def _sha(value: Any) -> bool:
    return (
        isinstance(value, str)
        and len(value) == 64
        and all(letter in "0123456789abcdef" for letter in value)
    )


class ProtectedWitnessJournal333:
    """One-use PENDING -> CLOSED or EXCEPTION; interrupted PENDING remains consumed."""

    def __init__(self, directory: Path):
        self.directory = directory

    def _path(self, incident: str, stage: str) -> Path:
        return self.directory / f"{_digest({'incident': incident})}.{stage}.json"

    def read(self, monitor: Any, incident: str, stage: str) -> dict[str, str] | None:
        if not (
            _on_ree(monitor)
            and self.directory.is_absolute()
            and not self.directory.is_symlink()
            and stage in STAGES
            and isinstance(incident, str)
            and bool(incident)
        ):
            return None
        path = self._path(incident, stage)
        if path.is_symlink() or not path.is_file():
            return None
        try:
            if os.name != "nt" and (
                self.directory.stat().st_mode & 0o077 or path.stat().st_mode & 0o077
            ):
                raise ValueError("unprotected witness directory or receipt")
            with path.open("r", encoding="utf-8") as file:
                value = json.load(file)
            if not isinstance(value, dict) or set(value) != {
                "incident",
                "stage",
                "requestDigest",
                "evidenceDigest",
                "receiptDigest",
            }:
                raise ValueError("unexpected witness receipt fields")
            if value["incident"] != incident or value["stage"] != stage:
                raise ValueError("incorrect incident or stage")
            if not all(
                _sha(value.get(field))
                for field in ("requestDigest", "evidenceDigest", "receiptDigest")
            ):
                raise ValueError("invalid digest")
            expected = _digest(
                {
                    "incident": incident,
                    "stage": stage,
                    "requestDigest": value["requestDigest"],
                    "evidenceDigest": value["evidenceDigest"],
                }
            )
            if expected != value["receiptDigest"]:
                raise ValueError("tampered receipt")
            return value
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            raise ValueError("private witness receipt unreadable") from exc

    def claim(
        self,
        monitor: Any,
        incident: str,
        stage: str,
        request_digest: str,
        evidence_digest: str,
    ) -> dict[str, str] | None:
        if not (
            _on_ree(monitor)
            and self.directory.is_absolute()
            and not self.directory.is_symlink()
            and stage in STAGES
            and isinstance(incident, str)
            and bool(incident)
            and _sha(request_digest)
            and _sha(evidence_digest)
        ):
            return None
        try:
            self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)
            if self.directory.is_symlink():
                return None
            if os.name != "nt":
                if self.directory.stat().st_mode & 0o077:
                    return None
            if stage == "PENDING":
                if any(
                    self._path(incident, item).exists()
                    or self._path(incident, item).is_symlink()
                    for item in STAGES
                ):
                    return None
            else:
                pending = self.read(monitor, incident, "PENDING")
                if (
                    not pending
                    or pending["requestDigest"] != request_digest
                    or any(
                        self._path(incident, item).exists()
                        or self._path(incident, item).is_symlink()
                        for item in ("CLOSED", "EXCEPTION")
                    )
                ):
                    return None
            record = {
                "incident": incident,
                "stage": stage,
                "requestDigest": request_digest,
                "evidenceDigest": evidence_digest,
            }
            record["receiptDigest"] = _digest(record)
            flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
            if hasattr(os, "O_NOFOLLOW"):
                flags |= os.O_NOFOLLOW
            descriptor = os.open(self._path(incident, stage), flags, 0o600)
            with os.fdopen(descriptor, "w", encoding="utf-8") as file:
                json.dump(record, file, sort_keys=True, separators=(",", ":"))
                file.flush()
                os.fsync(file.fileno())
            if os.name != "nt":
                directory_descriptor = os.open(self.directory, os.O_RDONLY)
                try:
                    os.fsync(directory_descriptor)
                finally:
                    os.close(directory_descriptor)
            return self.read(monitor, incident, stage)
        except (OSError, ValueError):
            return None


def read_private_decision333(
    monitor: Any, journal: ProtectedWitnessJournal333, incident: str
) -> dict[str, Any]:
    # No local receipt proves current physical OFF. An EXCEPTION stays OPEN.
    status = hold_decision333("QL442_PRIVATE_CUSTODY_REQUIRES_FRESH_INDEPENDENT_OFF")
    try:
        closed = journal.read(monitor, incident, "CLOSED")
        late = journal.read(monitor, incident, "EXCEPTION")
        pending = journal.read(monitor, incident, "PENDING")
        if closed and late:
            status["state"] = "HOLD_QL442_CONFLICTING_TERMINAL_CUSTODY"
        elif closed and pending and closed["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL442_PROTECTED_EVIDENCE_CLOSEOUT_NOT_CURRENT_RECEIVER_OFF"
            status["historicalReceiptDigest"] = closed["receiptDigest"]
        elif late and pending and late["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL442_DURABLE_EXPIRED_LEASE_EXCEPTION_REMAINS_OPEN"
            status["historicalReceiptDigest"] = late["receiptDigest"]
        elif pending:
            status["state"] = "QL442_PROTECTED_PENDING_NOT_REPLAYABLE"
    except (ValueError, OSError):
        status["state"] = "HOLD_QL442_PRIVATE_CUSTODY_UNREADABLE"
    return status
