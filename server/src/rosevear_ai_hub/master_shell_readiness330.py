"""QL-439 original-host, protected, signed *readiness only* review.

No receiver control, activation, CONNECTED transition, key enrollment or live OFF
readback exists in this module. External adapters are read-only and must be
independently supervised; synthetic evidence is not physical attestation.
"""

import json
import os
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_acceptance329 import ProtectedCorrectiveJournal329
from rosevear_ai_hub.master_shell_acceptance329 import (
    _verify as verify438,
)
from rosevear_ai_hub.master_shell_history329 import ProtectedHistoricalChain329

READY = "DURABLE_QL439_NEW_CEREMONY_REENTRY_READINESS_ONLY"
PREPARE = "OWNER_REVIEW_PREPARE_FRESH_QL429_QL430_AUTHORITY_ONLY_NO_ACTIVATION"
MASTER = "SIGNED_NEW_CEREMONY_PREPARED_ONLY_RECEIVER_OFF_NO_ACTIVATION"
UNKNOWN = "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION"
ROLES = ("anchor", "reader", "host", "receiver", "owner", "ownerReviewer", *MASTERS)
PREV_ROLES = (
    "host",
    "receiver",
    "remediationReviewer",
    "anchor",
    "reader",
    "owner",
    "ownerReviewer",
    *MASTERS,
)


def hold439(state: str) -> dict[str, Any]:
    return {
        "accepted": False,
        "state": state,
        "connection": "HOLD",
        "activationAuthorized": False,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "manualReceiverIsolationRequired": True,
        "receiver": UNKNOWN,
        "runtimeUptime": "UNKNOWN",
    }


class ProtectedReadinessJournal330:
    """Exclusive file-backed PENDING -> READINESS; failure consumes incident.

    Both stages fsync their own file and their parent directory. There is no
    overwrite, delete, retry of PENDING, or automatic resume after interruption.
    """

    def __init__(self, directory: Path):
        self.directory = directory

    def _path(self, incident: str, stage: str) -> Path:
        return self.directory / f"{_digest({'incident': incident})}.{stage}.json"

    def read(self, monitor: Any, incident: str, stage: str) -> dict[str, str] | None:
        if not (
            _on_ree(monitor)
            and self.directory.is_absolute()
            and stage in ("PENDING", "READINESS")
            and isinstance(incident, str)
            and bool(incident)
            and not self.directory.is_symlink()
        ):
            return None
        path = self._path(incident, stage)
        if path.is_symlink() or not path.is_file():
            return None
        try:
            if os.name != "nt" and (path.stat().st_mode & 0o077):
                raise ValueError("unprotected receipt")
            with path.open("r", encoding="utf-8") as stream:
                receipt = json.load(stream)
            if not isinstance(receipt, dict) or set(receipt) != {
                "incident",
                "stage",
                "requestDigest",
                "evidenceDigest",
                "receiptDigest",
            }:
                raise ValueError("malformed receipt")
            if receipt["incident"] != incident or receipt["stage"] != stage:
                raise ValueError("receipt scope changed")
            if not all(
                isinstance(receipt.get(field), str)
                and len(receipt[field]) == 64
                and all(ch in "0123456789abcdef" for ch in receipt[field])
                for field in ("requestDigest", "evidenceDigest", "receiptDigest")
            ):
                raise ValueError("receipt digests malformed")
            expected = _digest(
                {
                    key: receipt[key]
                    for key in ("incident", "stage", "requestDigest", "evidenceDigest")
                }
            )
            if expected != receipt["receiptDigest"]:
                raise ValueError("receipt tampered")
            return receipt
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            raise ValueError("protected receipt unreadable") from exc

    def claim(
        self, monitor: Any, incident: str, stage: str, request_digest: str, evidence_digest: str
    ) -> dict[str, str] | None:
        if not (
            _on_ree(monitor)
            and self.directory.is_absolute()
            and not self.directory.is_symlink()
            and stage in ("PENDING", "READINESS")
            and isinstance(incident, str)
            and bool(incident)
            and all(
                isinstance(x, str) and len(x) == 64 and all(ch in "0123456789abcdef" for ch in x)
                for x in (request_digest, evidence_digest)
            )
        ):
            return None
        try:
            self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)
            if self.directory.is_symlink():
                return None
            if os.name != "nt":
                os.chmod(self.directory, 0o700)
            if stage == "PENDING":
                if any(self._path(incident, x).exists() for x in ("PENDING", "READINESS")):
                    return None
            else:
                pending = self.read(monitor, incident, "PENDING")
                if (
                    not pending
                    or pending["requestDigest"] != request_digest
                    or self._path(incident, "READINESS").exists()
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
            fd = os.open(self._path(incident, stage), flags, 0o600)
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as out:
                    json.dump(record, out, sort_keys=True, separators=(",", ":"))
                    out.flush()
                    os.fsync(out.fileno())
            except BaseException:
                # Never delete a partial one-use receipt: fail closed on retry.
                raise
            if os.name != "nt":
                dir_fd = os.open(self.directory, os.O_RDONLY)
                try:
                    os.fsync(dir_fd)
                finally:
                    os.close(dir_fd)
            return self.read(monitor, incident, stage)
        except (OSError, ValueError):
            return None


def _verify439(
    role: str, envelope: Any, keys: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if not isinstance(envelope, dict) or not isinstance(envelope.get("payload"), dict):
        return None
    if role not in keys:
        return None
    payload = envelope["payload"]
    schema = f"rosevear.ai-hub.ql439.{role}.v1"
    if payload.get("schema") != schema:
        return None
    return payload if _native(envelope, set(payload), schema, *keys[role]) == payload else None


def _prior438(
    monitor: Any,
    prior437: Any,
    request438: Any,
    result438: Any,
    ql438_journal: Any,
    historical: Any,
    signed438: Any,
    pins438: Any,
) -> tuple[str, dict[str, Any]] | None:
    if not (
        isinstance(prior437, dict)
        and isinstance(request438, dict)
        and isinstance(result438, dict)
        and result438.get("accepted") is True
        and result438.get("state") == "DURABLE_QL438_OWNER_GATED_LEASE_EXCEPTION_CLOSURE_READBACK"
        and result438.get("connection") == "HOLD"
        and result438.get("activationAuthorized") is False
        and result438.get("leaseExceptionOpen") is False
        and prior437.get("leaseExceptionOpen") is True
        and isinstance(ql438_journal, ProtectedCorrectiveJournal329)
        and isinstance(historical, ProtectedHistoricalChain329)
        and isinstance(signed438, dict)
        and set(signed438) == set(PREV_ROLES)
        and isinstance(pins438, dict)
        and set(pins438) == set(PREV_ROLES)
    ):
        return None
    incident = prior437.get("originalIncidentId")
    if not isinstance(incident, str) or incident != result438.get("originalIncidentId"):
        return None
    prior_chain = historical.read(monitor, prior437, request438)
    pending = ql438_journal.read(monitor, incident, "PENDING")
    closed = ql438_journal.read(monitor, incident, "CLOSED")
    if not (
        prior_chain
        and pending
        and closed
        and pending["requestDigest"] == closed["requestDigest"]
        and pending["requestDigest"] == _digest(request438)
        and closed["receiptDigest"] == result438.get("closedReceiptDigest")
    ):
        return None
    for role in PREV_ROLES:
        env = signed438[role]
        if not (
            isinstance(env, dict)
            and isinstance(env.get("payload"), dict)
            and verify438(role, env, pins438, env["payload"])
        ):
            return None
    payloads = {role: signed438[role]["payload"] for role in PREV_ROLES}
    expected_evidence = _digest(
        {
            "host": payloads["host"],
            "off": payloads["receiver"],
            "review": payloads["remediationReviewer"],
            "masters": _digest([payloads[m] for m in MASTERS]),
            "anchor": payloads["anchor"],
            "reader": payloads["reader"],
            "owners": [payloads[r] for r in ("owner", "ownerReviewer")],
        }
    )
    if expected_evidence != closed["evidenceDigest"]:
        return None
    anchor = payloads["anchor"]
    reader = payloads["reader"]
    if not (
        anchor.get("requestDigest") == pending["requestDigest"]
        and anchor.get("immutable") is True
        and reader.get("anchorDigest") == _digest(anchor)
        and reader.get("remoteDurable") is True
    ):
        return None
    return _digest(
        {
            "ql431To437": prior_chain,
            "ql438Pending": pending,
            "ql438Closed": closed,
            "signedEvidenceDigest": expected_evidence,
        }
    ), {"anchor": _digest(anchor), "reader": _digest(reader), "closed": closed}


def review_readiness330(
    monitor: Any,
    prior437: dict[str, Any],
    request438: dict[str, Any],
    result438: dict[str, Any],
    ql438_journal: ProtectedCorrectiveJournal329,
    historical: ProtectedHistoricalChain329,
    signed438: dict[str, Any],
    keys438: dict[str, tuple[bytes, str]],
    request: dict[str, Any],
    journal: ProtectedReadinessJournal330,
    keys: dict[str, tuple[bytes, str]],
    *,
    read_anchor: Any,
    read_reader: Any,
    read_host_off: Any,
    read_independent_off: Any,
    master_reports: dict[str, Any],
    owner_signatures: dict[str, Any],
    now_ms: int,
) -> dict[str, Any]:
    """Never turns a receiver ON. Acceptance is historical code-level readiness."""
    def fail(reason: str) -> dict[str, Any]:
        return hold439(reason)

    if not (
        _on_ree(monitor)
        and type(now_ms) is int
        and isinstance(request, dict)
        and isinstance(keys, dict)
        and isinstance(journal, ProtectedReadinessJournal330)
        and set(keys) == set(ROLES)
        and all(
            isinstance(key, tuple)
            and len(key) == 2
            and isinstance(key[0], bytes)
            and isinstance(key[1], str)
            and _public_ed25519(*key)
            for key in keys.values()
        )
        and len({key[0] for key in keys.values()}) == len(keys)
        and len({key[1] for key in keys.values()}) == len(keys)
        and all(
            callable(f) for f in (read_anchor, read_reader, read_host_off, read_independent_off)
        )
    ):
        return fail("HOLD_QL439_SOURCE_HOST_OR_KEYS_INVALID")
    try:
        previous = _prior438(
            monitor, prior437, request438, result438, ql438_journal, historical, signed438, keys438
        )
    except (ValueError, KeyError, OSError, TypeError):
        previous = None
    if previous is None:
        return fail("HOLD_QL439_EXACT_QL431_TO_438_PROTECTED_HISTORY_INVALID")
    previous_digest, linked = previous
    incident = prior437["originalIncidentId"]
    ceremony = request.get("proposedCeremonyId")
    episode = request.get("proposedEpisodeId")
    nonce = request.get("renewalNonce")
    old_ceremony = prior437.get("nextCeremonyId")
    old_episode = historical.ql435.get("episodeId")
    if not (
        isinstance(ceremony, str)
        and len(ceremony) >= 12
        and isinstance(episode, str)
        and len(episode) >= 12
        and isinstance(nonce, str)
        and len(nonce) >= 16
        and len({ceremony, episode, nonce, incident, old_ceremony}) == 5
        and ceremony != old_ceremony
        and episode != old_episode
        and nonce not in (request438.get("remediationNonce"), prior437.get("anchorChallengeNonce"))
        and request.get("originalIncidentId") == incident
        and request.get("ql438ClosedReceiptDigest") == linked["closed"]["receiptDigest"]
        and request.get("ql438AnchorDigest") == linked["anchor"]
        and request.get("ql438ReaderDigest") == linked["reader"]
        and request.get("sourceRevision") == request438.get("sourceRevision")
        and request.get("controllerRevision") == request438.get("controllerRevision")
        and request.get("previousCeremonyId") == old_ceremony
        and request.get("oldLeaseExpiresAt") == historical.ql435.get("leaseExpiresAt")
        and request.get("action") == "RENEW_CORRECTIVE_ANCHOR_PREPARE_ONLY_NO_ACTIVATION"
    ):
        return fail("HOLD_QL439_RENEWAL_SCOPE_OR_NEW_IDS_INVALID")
    digest = _digest(request)
    pending = journal.claim(monitor, incident, "PENDING", digest, previous_digest)
    if pending is None:
        return fail("HOLD_QL439_PENDING_UNDURABLE_OR_ONE_USE_REPLAY")
    try:
        anchor_env = read_anchor(request=request)
        anchor = _verify439("anchor", anchor_env, keys)
        if not (
            anchor
            and anchor.get("requestDigest") == digest
            and anchor.get("previousAnchorDigest") == linked["anchor"]
            and anchor.get("previousReaderDigest") == linked["reader"]
            and anchor.get("renewalNonce") == nonce
            and anchor.get("ceremonyId") == ceremony
            and anchor.get("episodeId") == episode
            and anchor.get("immutable") is True
            and isinstance(anchor.get("externalStoreId"), str)
            and bool(anchor["externalStoreId"])
            and type(anchor.get("anchorSequence")) is int
            and anchor["anchorSequence"] > 0
        ):
            return fail("HOLD_QL439_SIGNED_EXTERNAL_RENEWAL_INVALID")
        reader_env = read_reader(request=request, anchorDigest=_digest(anchor))
        reader = _verify439("reader", reader_env, keys)
        if not (
            reader
            and reader.get("requestDigest") == digest
            and reader.get("renewalNonce") == nonce
            and reader.get("anchorDigest") == _digest(anchor)
            and reader.get("externalStoreId") == anchor["externalStoreId"]
            and reader.get("durableReadback") is True
            and type(reader.get("readbackSequence")) is int
            and reader["readbackSequence"] >= anchor["anchorSequence"]
        ):
            return fail("HOLD_QL439_DISTINCT_SIGNED_ANCHOR_READER_INVALID")
        host_env = read_host_off(request=request, readerDigest=_digest(reader))
        host = _verify439("host", host_env, keys)
        if not (
            host
            and host.get("requestDigest") == digest
            and host.get("hostMachineId") == "DESKTOP-AE894KC"
            and host.get("renewalNonce") == nonce
            and host.get("receiverState") == "OFF"
            and host.get("failClosedShutdownArmed") is True
            and host.get("readerDigest") == _digest(reader)
            and host.get("ceremonyId") == ceremony
            and host.get("episodeId") == episode
            and type(host.get("offSequence")) is int
            and host["offSequence"] > 0
            and type(host.get("observedAtMs")) is int
            and 0 <= now_ms - host["observedAtMs"] <= 120_000
        ):
            return fail("HOLD_QL439_WATCHDOG_ARMED_ORIGINAL_HOST_OFF_INVALID")
        receiver_env = read_independent_off(
            request=request, hostDigest=_digest(host), readerDigest=_digest(reader)
        )
        receiver = _verify439("receiver", receiver_env, keys)
        if not (
            receiver
            and receiver.get("requestDigest") == digest
            and receiver.get("renewalNonce") == nonce
            and receiver.get("hostOffDigest") == _digest(host)
            and receiver.get("readerDigest") == _digest(reader)
            and receiver.get("receiverState") == "OFF"
            and receiver.get("ceremonyId") == ceremony
            and receiver.get("episodeId") == episode
            and type(receiver.get("offSequence")) is int
            and receiver["offSequence"] >= host["offSequence"]
            and type(receiver.get("observedAtMs")) is int
            and host["observedAtMs"] <= receiver["observedAtMs"] <= now_ms
            and now_ms - receiver["observedAtMs"] <= 120_000
        ):
            return fail("HOLD_QL439_INDEPENDENT_MONOTONIC_SIGNED_OFF_INVALID")
        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL439_THREE_DISTINCT_MASTERS_MISSING")
        master_payloads = []
        for master in MASTERS:
            report = _verify439(master, master_reports[master], keys)
            if not (
                report
                and report.get("masterId") == master
                and report.get("requestDigest") == digest
                and report.get("renewalNonce") == nonce
                and report.get("ceremonyId") == ceremony
                and report.get("episodeId") == episode
                and report.get("readerDigest") == _digest(reader)
                and report.get("independentOffDigest") == _digest(receiver)
                and report.get("decision") == MASTER
            ):
                return fail("HOLD_QL439_THREE_MASTER_READINESS_INVALID")
            master_payloads.append(report)
        master_digest = _digest(master_payloads)
        if not isinstance(owner_signatures, dict) or set(owner_signatures) != {
            "owner",
            "ownerReviewer",
        }:
            return fail("HOLD_QL439_DUAL_SIGNED_PREPARATION_MISSING")
        ids = set()
        for role in ("owner", "ownerReviewer"):
            owner = _verify439(role, owner_signatures[role], keys)
            if not (
                owner
                and isinstance(owner.get("ownerId"), str)
                and bool(owner["ownerId"])
                and owner.get("requestDigest") == digest
                and owner.get("renewalNonce") == nonce
                and owner.get("readerDigest") == _digest(reader)
                and owner.get("independentOffDigest") == _digest(receiver)
                and owner.get("masterDigest") == master_digest
                and owner.get("action") == PREPARE
            ):
                return fail("HOLD_QL439_DUAL_OWNER_NARROW_AUTHORITY_INVALID")
            ids.add(owner["ownerId"])
        if len(ids) != 2:
            return fail("HOLD_QL439_OWNER_IDENTITIES_NOT_DISTINCT")
        latest = _prior438(
            monitor, prior437, request438, result438, ql438_journal, historical, signed438, keys438
        )
        if not latest or latest[0] != previous_digest:
            return fail("HOLD_QL439_PROTECTED_QL431_TO_438_CUSTODY_DRIFT")
        if journal.read(monitor, incident, "PENDING") != pending:
            return fail("HOLD_QL439_PENDING_RECEIPT_TAMPERED")
        evidence_digest = _digest(
            {
                "anchor": anchor,
                "reader": reader,
                "host": host,
                "receiver": receiver,
                "masters": master_payloads,
                "owners": [owner_signatures[r]["payload"] for r in ("owner", "ownerReviewer")],
                "predecessor": previous_digest,
            }
        )
        completed = journal.claim(monitor, incident, "READINESS", digest, evidence_digest)
        if not completed:
            return fail("HOLD_QL439_READINESS_COMMIT_OR_READBACK_FAILED")
        return {
            **hold439(READY),
            "accepted": True,
            "state": READY,
            "receiver": "OFF_VERIFIED_POST_REMEDIATION_INDEPENDENT_READBACK",
            "ownerAcceptance": "DUAL_SIGNED_NEW_CEREMONY_PREPARATION_ONLY",
            "originalIncidentId": incident,
            "pendingReceiptDigest": pending["receiptDigest"],
            "readinessReceiptDigest": completed["receiptDigest"],
            "proposedCeremonyId": ceremony,
            "proposedEpisodeId": episode,
        }
    except (KeyError, ValueError, OSError, TypeError):
        return fail("HOLD_QL439_SIGNED_EVIDENCE_MISSING_OR_MALFORMED")


def private_readback330(
    monitor: Any, journal: ProtectedReadinessJournal330, incident: str
) -> dict[str, Any]:
    """Historical evidence on disk never establishes current physical OFF."""
    result = hold439("QL439_DURABLE_PRIVATE_READINESS_FRESH_OFF_RECHECK_REQUIRED")
    try:
        result["protectedReadinessPresent"] = bool(journal.read(monitor, incident, "READINESS"))
    except (ValueError, OSError):
        result["protectedReadinessPresent"] = False
    return result
