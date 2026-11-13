"""QL-440 protected original-host challenge *issuance only*, never receiver ON.

All real signatures and external readbacks must be provided by independently
supervised original-host adapters. Synthetic CI does not prove physical OFF.
"""

import json
import os
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_readiness330 import (
    ProtectedReadinessJournal330,
    _prior438,
    _verify439,
)

ISSUED = "DURABLE_QL440_NEW_CEREMONY_AUTHORIZATION_PREREQUISITES_ACCEPTED"
CHALLENGE = "NEW_CEREMONY_CHALLENGE_ONLY_NO_RECEIVER_ON"
MASTER_DECISION = "PREREQUISITES_ACCEPTED_NEW_CEREMONY_CHALLENGE_ONLY_NO_ON"
OWNER_DECISION = "ISSUE_FRESH_CEREMONY_CHALLENGE_AUTHORITY_ONLY_NO_ON"
ISSUER_DECISION = "FRESH_QL429_QL430_CEREMONY_CHALLENGE_ONLY_NO_RECEIVER_ON"
UNKNOWN = "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION"
ROLES = ("host", "receiver", "owner", "ownerReviewer", "issuer", *MASTERS)
PREV_ROLES = ("anchor", "reader", "host", "receiver", "owner", "ownerReviewer", *MASTERS)


def hold_issuance331(state: str) -> dict[str, Any]:
    return {
        "accepted": False,
        "state": state,
        "ceremonyAuthorizationIssued": False,
        "connection": "HOLD",
        "activationAuthorized": False,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "receiver": UNKNOWN,
        "manualReceiverIsolationRequired": True,
    }


class ProtectedIssuanceJournal331:
    """One-use fsynced PENDING → ISSUED; partial pending cannot be retried."""

    def __init__(self, directory: Path):
        self.directory = directory

    def _path(self, incident: str, stage: str) -> Path:
        return self.directory / f"{_digest({'incident': incident})}.{stage}.json"

    def read(self, monitor: Any, incident: str, stage: str) -> dict[str, str] | None:
        if not (
            _on_ree(monitor)
            and self.directory.is_absolute()
            and not self.directory.is_symlink()
            and stage in ("PENDING", "ISSUED")
            and isinstance(incident, str)
            and bool(incident)
        ):
            return None
        path = self._path(incident, stage)
        if path.is_symlink() or not path.is_file():
            return None
        try:
            if os.name != "nt" and path.stat().st_mode & 0o077:
                raise ValueError("unprotected custody")
            with path.open("r", encoding="utf-8") as handle:
                value = json.load(handle)
            if not isinstance(value, dict) or set(value) != {
                "incident",
                "stage",
                "requestDigest",
                "evidenceDigest",
                "receiptDigest",
            }:
                raise ValueError("unexpected fields")
            if value["incident"] != incident or value["stage"] != stage:
                raise ValueError("scope mismatch")
            if any(
                not isinstance(value.get(k), str)
                or len(value[k]) != 64
                or any(c not in "0123456789abcdef" for c in value[k])
                for k in ("requestDigest", "evidenceDigest", "receiptDigest")
            ):
                raise ValueError("invalid receipt")
            if (
                _digest(
                    {
                        "incident": incident,
                        "stage": stage,
                        "requestDigest": value["requestDigest"],
                        "evidenceDigest": value["evidenceDigest"],
                    }
                )
                != value["receiptDigest"]
            ):
                raise ValueError("tamper")
            return value
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            raise ValueError("private journal unreadable") from exc

    def claim(
        self, monitor: Any, incident: str, stage: str, request: str, evidence: str
    ) -> dict[str, str] | None:
        if not (
            _on_ree(monitor)
            and self.directory.is_absolute()
            and not self.directory.is_symlink()
            and stage in ("PENDING", "ISSUED")
            and isinstance(incident, str)
            and bool(incident)
            and all(
                isinstance(x, str) and len(x) == 64 and all(c in "0123456789abcdef" for c in x)
                for x in (request, evidence)
            )
        ):
            return None
        try:
            self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
            if self.directory.is_symlink():
                return None
            if os.name != "nt":
                os.chmod(self.directory, 0o700)
            if stage == "PENDING":
                if any(self._path(incident, x).exists() for x in ("PENDING", "ISSUED")):
                    return None
            else:
                previous = self.read(monitor, incident, "PENDING")
                if (
                    not previous
                    or previous["requestDigest"] != request
                    or self._path(incident, "ISSUED").exists()
                ):
                    return None
            record = {
                "incident": incident,
                "stage": stage,
                "requestDigest": request,
                "evidenceDigest": evidence,
            }
            record["receiptDigest"] = _digest(record)
            flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
            if hasattr(os, "O_NOFOLLOW"):
                flags |= os.O_NOFOLLOW
            fd = os.open(self._path(incident, stage), flags, 0o600)
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                json.dump(record, stream, sort_keys=True, separators=(",", ":"))
                stream.flush()
                os.fsync(stream.fileno())
            if os.name != "nt":
                directory_fd = os.open(self.directory, os.O_RDONLY)
                try:
                    os.fsync(directory_fd)
                finally:
                    os.close(directory_fd)
            return self.read(monitor, incident, stage)
        except (OSError, ValueError):
            return None


def verify440(
    role: str, envelope: Any, keys: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if (
        role not in keys
        or not isinstance(envelope, dict)
        or not isinstance(envelope.get("payload"), dict)
    ):
        return None
    body = envelope["payload"]
    schema = f"rosevear.ai-hub.ql440.{role}.v1"
    return body if _native(envelope, set(body), schema, *keys[role]) == body else None


def _prior439(
    monitor: Any,
    input438: dict[str, Any],
    readiness439: dict[str, Any],
    request439: dict[str, Any],
    journal439: ProtectedReadinessJournal330,
    signed439: dict[str, Any],
    keys439: dict[str, tuple[bytes, str]],
) -> tuple[str, dict[str, Any]] | None:
    if not (
        isinstance(input438, dict)
        and isinstance(readiness439, dict)
        and readiness439.get("accepted") is True
        and readiness439.get("state") == "DURABLE_QL439_NEW_CEREMONY_REENTRY_READINESS_ONLY"
        and readiness439.get("connection") == "HOLD"
        and readiness439.get("activationAuthorized") is False
        and isinstance(request439, dict)
        and isinstance(journal439, ProtectedReadinessJournal330)
        and isinstance(signed439, dict)
        and set(signed439) == set(PREV_ROLES)
        and isinstance(keys439, dict)
        and set(keys439) == set(PREV_ROLES)
        and len({key[0] for key in keys439.values()}) == len(keys439)
        and len({key[1] for key in keys439.values()}) == len(keys439)
        and all(
            isinstance(key, tuple)
            and len(key) == 2
            and isinstance(key[0], bytes)
            and isinstance(key[1], str)
            and _public_ed25519(*key)
            for key in keys439.values()
        )
    ):
        return None
    before = _prior438(monitor, **input438)
    if not before:
        return None
    predecessor_digest = before[0]
    original_incident = request439.get("originalIncidentId")
    if not isinstance(original_incident, str) or original_incident != readiness439.get(
        "originalIncidentId"
    ):
        return None
    pending = journal439.read(monitor, original_incident, "PENDING")
    ready = journal439.read(monitor, original_incident, "READINESS")
    if not (
        pending
        and ready
        and pending["requestDigest"] == ready["requestDigest"]
        and ready["requestDigest"] == _digest(request439)
        and pending["evidenceDigest"] == predecessor_digest
        and pending["receiptDigest"] == readiness439.get("pendingReceiptDigest")
        and ready["receiptDigest"] == readiness439.get("readinessReceiptDigest")
    ):
        return None
    for role in PREV_ROLES:
        if _verify439(role, signed439[role], keys439) is None:
            return None
    bodies = {role: signed439[role]["payload"] for role in PREV_ROLES}
    master_digest = _digest([bodies[m] for m in MASTERS])
    if not (
        bodies["anchor"].get("requestDigest") == pending["requestDigest"]
        and bodies["reader"].get("anchorDigest") == _digest(bodies["anchor"])
        and bodies["host"].get("readerDigest") == _digest(bodies["reader"])
        and bodies["receiver"].get("hostOffDigest") == _digest(bodies["host"])
        and all(
            bodies[m].get("independentOffDigest") == _digest(bodies["receiver"])
            and bodies[m].get("decision")
            == "SIGNED_NEW_CEREMONY_PREPARED_ONLY_RECEIVER_OFF_NO_ACTIVATION"
            for m in MASTERS
        )
        and all(
            bodies[role].get("masterDigest") == master_digest
            and bodies[role].get("action")
            == "OWNER_REVIEW_PREPARE_FRESH_QL429_QL430_AUTHORITY_ONLY_NO_ACTIVATION"
            for role in ("owner", "ownerReviewer")
        )
        and bodies["owner"].get("ownerId") != bodies["ownerReviewer"].get("ownerId")
    ):
        return None
    evidence = _digest(
        {
            "anchor": bodies["anchor"],
            "reader": bodies["reader"],
            "host": bodies["host"],
            "receiver": bodies["receiver"],
            "masters": [bodies[m] for m in MASTERS],
            "owners": [bodies[r] for r in ("owner", "ownerReviewer")],
            "predecessor": predecessor_digest,
        }
    )
    if ready["evidenceDigest"] != evidence:
        return None
    return _digest(
        {
            "prior": predecessor_digest,
            "pending": pending,
            "readiness": ready,
            "signed": evidence,
        }
    ), {
        "incident": original_incident,
        "ceremony": request439["proposedCeremonyId"],
        "episode": request439["proposedEpisodeId"],
        "renewalNonce": request439["renewalNonce"],
        "anchor": _digest(bodies["anchor"]),
        "reader": _digest(bodies["reader"]),
        "pending": pending,
        "readiness": ready,
    }


def review_issuance331(
    monitor: Any,
    input438: dict[str, Any],
    readiness439: dict[str, Any],
    request439: dict[str, Any],
    journal439: ProtectedReadinessJournal330,
    signed439: dict[str, Any],
    keys439: dict[str, tuple[bytes, str]],
    request: dict[str, Any],
    journal: ProtectedIssuanceJournal331,
    keys: dict[str, tuple[bytes, str]],
    *,
    read_host_off: Any,
    read_independent_off: Any,
    master_reports: dict[str, Any],
    owner_signatures: dict[str, Any],
    read_issuer: Any,
    now_ms: int,
) -> dict[str, Any]:
    """Challenge issuance is narrower than pilot/receiver ON authorization."""
    def fail(reason: str) -> dict[str, Any]:
        return hold_issuance331(reason)

    if not (
        _on_ree(monitor) and type(now_ms) is int
        and isinstance(request, dict)
        and isinstance(journal, ProtectedIssuanceJournal331)
        and isinstance(keys, dict) and set(keys) == set(ROLES)
        and all(
            isinstance(key, tuple) and len(key) == 2
            and isinstance(key[0], bytes) and isinstance(key[1], str)
            and _public_ed25519(*key) for key in keys.values()
        )
        and len({key[0] for key in keys.values()}) == len(keys)
        and len({key[1] for key in keys.values()}) == len(keys)
        and all(callable(adapter) for adapter in (
            read_host_off, read_independent_off, read_issuer
        ))
    ):
        return fail("HOLD_QL440_SOURCE_HOST_OR_SIGNERS_INVALID")
    try:
        prior = _prior439(
            monitor, input438, readiness439, request439, journal439, signed439, keys439
        )
    except (KeyError, TypeError, ValueError, OSError):
        prior = None
    if not prior:
        return fail("HOLD_QL440_EXACT_SIGNED_QL439_PRIVATE_READINESS_INVALID")
    prior_digest, linked = prior
    nonce = request.get("challengeNonce")
    if not (
        isinstance(nonce, str)
        and len(nonce) >= 16
        and nonce != linked["renewalNonce"]
        and nonce not in (linked["ceremony"], linked["episode"], linked["incident"])
        and request.get("action") == CHALLENGE
        and request.get("originalIncidentId") == linked["incident"]
        and request.get("ceremonyId") == linked["ceremony"]
        and request.get("episodeId") == linked["episode"]
        and request.get("pendingReceiptDigest") == linked["pending"]["receiptDigest"]
        and request.get("readinessReceiptDigest") == linked["readiness"]["receiptDigest"]
        and request.get("renewedAnchorDigest") == linked["anchor"]
        and request.get("independentReaderDigest") == linked["reader"]
    ):
        return fail("HOLD_QL440_FRESH_NONCE_OR_PROTECTED_SCOPE_DRIFT")
    digest = _digest(request)
    incident = linked["incident"]
    pending = journal.claim(monitor, incident, "PENDING", digest, prior_digest)
    if not pending:
        return fail("HOLD_QL440_PROTECTED_PENDING_UNDURABLE_OR_REPLAY")
    try:
        host_env = read_host_off(request=request)
        host = verify440("host", host_env, keys)
        if not (
            host
            and host.get("requestDigest") == digest
            and host.get("hostMachineId") == "DESKTOP-AE894KC"
            and host.get("receiverState") == "OFF"
            and host.get("failClosedShutdownArmed") is True
            and host.get("challengeNonce") == nonce
            and type(host.get("offSequence")) is int
            and host["offSequence"] > 0
            and type(host.get("observedAtMs")) is int
            and 0 <= now_ms - host["observedAtMs"] <= 120_000
        ):
            return fail("HOLD_QL440_SIGNED_HOST_OFF_OR_WATCHDOG_INVALID")
        receiver_env = read_independent_off(request=request, hostDigest=_digest(host))
        receiver = verify440("receiver", receiver_env, keys)
        if not (
            receiver
            and receiver.get("requestDigest") == digest
            and receiver.get("challengeNonce") == nonce
            and receiver.get("hostOffDigest") == _digest(host)
            and receiver.get("receiverState") == "OFF"
            and type(receiver.get("offSequence")) is int
            and receiver["offSequence"] >= host["offSequence"]
            and type(receiver.get("observedAtMs")) is int
            and host["observedAtMs"] <= receiver["observedAtMs"] <= now_ms
        ):
            return fail("HOLD_QL440_INDEPENDENT_SIGNED_OFF_INVALID")
        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL440_THREE_MASTER_PREREQUISITES_MISSING")
        reports = []
        for master in MASTERS:
            body = verify440(master, master_reports[master], keys)
            if not (
                body
                and body.get("masterId") == master
                and body.get("requestDigest") == digest
                and body.get("challengeNonce") == nonce
                and body.get("independentOffDigest") == _digest(receiver)
                and body.get("decision") == MASTER_DECISION
            ):
                return fail("HOLD_QL440_MASTER_SIGNED_PREREQUISITES_INVALID")
            reports.append(body)
        masters_digest = _digest(reports)
        if not isinstance(owner_signatures, dict) or set(owner_signatures) != {
            "owner",
            "ownerReviewer",
        }:
            return fail("HOLD_QL440_DUAL_OWNER_AUTHORITY_MISSING")
        owner_ids = set()
        for role in ("owner", "ownerReviewer"):
            body = verify440(role, owner_signatures[role], keys)
            if not (
                body
                and isinstance(body.get("ownerId"), str)
                and bool(body["ownerId"])
                and body.get("requestDigest") == digest
                and body.get("challengeNonce") == nonce
                and body.get("independentOffDigest") == _digest(receiver)
                and body.get("mastersDigest") == masters_digest
                and body.get("decision") == OWNER_DECISION
            ):
                return fail("HOLD_QL440_DUAL_OWNER_SIGNED_AUTHORITY_INVALID")
            owner_ids.add(body["ownerId"])
        if len(owner_ids) != 2:
            return fail("HOLD_QL440_OWNER_IDENTITIES_NOT_DISTINCT")
        owners_digest = _digest(
            [owner_signatures[r]["payload"] for r in ("owner", "ownerReviewer")]
        )
        issuer_env = read_issuer(
            request=request,
            independentOffDigest=_digest(receiver),
            mastersDigest=masters_digest,
            ownersDigest=owners_digest,
        )
        issuer = verify440("issuer", issuer_env, keys)
        if not (
            issuer
            and issuer.get("requestDigest") == digest
            and issuer.get("hostMachineId") == "DESKTOP-AE894KC"
            and issuer.get("challengeNonce") == nonce
            and issuer.get("independentOffDigest") == _digest(receiver)
            and issuer.get("mastersDigest") == masters_digest
            and issuer.get("ownersDigest") == owners_digest
            and issuer.get("action") == ISSUER_DECISION
        ):
            return fail("HOLD_QL440_ORIGINAL_HOST_NARROW_ISSUANCE_INVALID")
        refreshed = _prior439(
            monitor, input438, readiness439, request439, journal439, signed439, keys439
        )
        if not refreshed or refreshed[0] != prior_digest:
            return fail("HOLD_QL440_QL431_TO_439_PROTECTED_CUSTODY_DRIFT")
        if journal.read(monitor, incident, "PENDING") != pending:
            return fail("HOLD_QL440_PRIVATE_PENDING_TAMPERED")
        receipt = journal.claim(
            monitor,
            incident,
            "ISSUED",
            digest,
            _digest(
                {
                    "host": host,
                    "receiver": receiver,
                    "masters": reports,
                    "owners": [owner_signatures[r]["payload"] for r in ("owner", "ownerReviewer")],
                    "issuer": issuer,
                    "prior": prior_digest,
                }
            ),
        )
        if not receipt:
            return fail("HOLD_QL440_ISSUED_UNDURABLE_OR_REPLAY")
        return {
            **hold_issuance331(ISSUED),
            "accepted": True,
            "state": ISSUED,
            "ceremonyAuthorizationIssued": True,
            "originalIncidentId": incident,
            "ceremonyId": linked["ceremony"],
            "episodeId": linked["episode"],
            "challengeNonce": nonce,
            "pendingReceiptDigest": pending["receiptDigest"],
            "issuedReceiptDigest": receipt["receiptDigest"],
            "independentOffDigest": _digest(receiver),
            "issuerDigest": _digest(issuer),
        }
    except (KeyError, ValueError, TypeError, OSError):
        return fail("HOLD_QL440_SIGNED_EVIDENCE_MALFORMED_OR_UNAVAILABLE")


def private_readback331(
    monitor: Any, journal: ProtectedIssuanceJournal331, incident: str
) -> dict[str, Any]:
    status = hold_issuance331("QL440_DURABLE_PRIVATE_ISSUANCE_NEW_OFF_AND_OWNER_CHALLENGE_REQUIRED")
    try:
        status["privateIssuedPresent"] = bool(journal.read(monitor, incident, "ISSUED"))
    except (ValueError, OSError):
        status["privateIssuedPresent"] = False
    return status
