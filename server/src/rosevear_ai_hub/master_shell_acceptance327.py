"""Build 327 — QL-436 signed shutdown and independent OFF custody.

Readback-only original-host reconciliation. No receiver enable, restart or
shutdown command. Any missing, stale or forged proof remains UNKNOWN/HOLD.
A durable PENDING record is written before calling external signed adapters.
"""

import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import _timestamp, _utc
from rosevear_ai_hub.master_shell_acceptance308 import _hold, _on_ree
from rosevear_ai_hub.master_shell_acceptance310 import _sha
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS, _callback
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _id
from rosevear_ai_hub.master_shell_acceptance321 import ProtectedPilotJournal321, _dual
from rosevear_ai_hub.master_shell_acceptance322 import ProtectedContinuityJournal322, _accepted
from rosevear_ai_hub.master_shell_acceptance323 import ProtectedRecoveryReviewJournal323
from rosevear_ai_hub.master_shell_acceptance324 import (
    ProtectedNewCeremonyJournal324,
    _match,
    _signed,
)
from rosevear_ai_hub.master_shell_acceptance325 import ProtectedReadinessJournal325
from rosevear_ai_hub.master_shell_acceptance326 import (
    ProtectedIsolatedPilotJournal326,
    reconcile_master_evidence326,
)
from rosevear_ai_hub.master_shell_acceptance326 import _prior as _prior326
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE326_MAIN = "cd5d1d46196d2cbf9bbd4d6165861356f447dc16"
COMMS436_MAIN = "7bf522660f6f10a1cd1b039aacf9b93af165304f"
REQUEST = "rosevear.ai-hub.ql436.supervised-shutdown-reconciliation.v1"
HOST = "rosevear.ai-hub.ql436.original-host-signed-shutdown.v1"
OFF = "rosevear.ai-hub.ql436.independent-receiver-off-readback.v1"
MASTER = "rosevear.ai-hub.ql436.three-master-shutdown-continuity.v1"
OWNER = "rosevear.ai-hub.ql436.dual-owner-shutdown-incident-review.v1"
ACTION = "READ_SIGNED_SHUTDOWN_AND_INDEPENDENT_OFF_NO_REACTIVATION"
ACK = "ACK_SIGNED_OFF_NO_REACTIVATION"
TIMELY = "WITHIN_LEASE_INDEPENDENT_OFF_CONFIRMED"
LATE_HOST = "LATE_HOST_SHUTDOWN_ESCALATION"
LATE_OFF = "LATE_INDEPENDENT_OFF_READBACK_ESCALATION"
OWNER_TIMELY = "ACK_SIGNED_OFF_WITHIN_LEASE_RETAIN_HOLD"
OWNER_LATE = "ACK_SIGNED_OFF_AND_ESCALATE_LEASE_EXCEPTION_RETAIN_HOLD"


class ProtectedShutdownJournal327:
    """Exclusive one-use protected original-host incident ledger.

    The PENDING row is never erased after any failed signed shutdown review.
    A crashed attempt cannot be replayed under the same ceremony.
    """

    def __init__(self, path: Path):
        self.path = path

    @staticmethod
    def _read(db: sqlite3.Connection, ceremony: str, stage: str):
        row = db.execute(
            "SELECT request_digest,evidence_digest,receipt_digest "
            "FROM shutdown327 WHERE ceremony_id=? AND stage=?",
            (ceremony, stage),
        ).fetchone()
        if row is None:
            return None
        req, evidence, receipt = row
        if not all(_sha(v) for v in row):
            raise ValueError("QL436_SHUTDOWN_RECEIPT_INVALID")
        if (
            _digest(
                {
                    "ceremonyId": ceremony,
                    "stage": stage,
                    "requestDigest": req,
                    "evidenceDigest": evidence,
                }
            )
            != receipt
        ):
            raise ValueError("QL436_SHUTDOWN_RECEIPT_TAMPERED")
        return {
            "requestDigest": req,
            "evidenceDigest": evidence,
            "receiptDigest": receipt,
        }

    def read(self, monitor: PersistentReeMonitor304, ceremony: str, stage: str):
        if not (
            _on_ree(monitor)
            and _id(ceremony)
            and stage in ("PENDING", "RECONCILED")
            and self.path.is_file()
        ):
            return None
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                return self._read(db, ceremony, stage)
        except (OSError, sqlite3.Error, ValueError, TypeError):
            raise ValueError("QL436_SHUTDOWN_LEDGER_UNREADABLE") from None

    def claim_once(
        self,
        monitor: PersistentReeMonitor304,
        ceremony: str,
        stage: str,
        request_digest: str,
        evidence_digest: str,
    ):
        if not (
            _on_ree(monitor)
            and _id(ceremony)
            and stage in ("PENDING", "RECONCILED")
            and _sha(request_digest)
            and _sha(evidence_digest)
            and self.path.is_absolute()
        ):
            return None
        receipt = _digest(
            {
                "ceremonyId": ceremony,
                "stage": stage,
                "requestDigest": request_digest,
                "evidenceDigest": evidence_digest,
            }
        )
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            if self.path.parent.is_symlink() or self.path.is_symlink():
                return None
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    "CREATE TABLE IF NOT EXISTS shutdown327 ("
                    "ceremony_id TEXT NOT NULL,stage TEXT NOT NULL,"
                    "request_digest TEXT NOT NULL,evidence_digest TEXT NOT NULL,"
                    "receipt_digest TEXT NOT NULL,PRIMARY KEY(ceremony_id,stage))"
                )
                if stage == "PENDING":
                    if db.execute(
                        "SELECT COUNT(*) FROM shutdown327 WHERE ceremony_id=?",
                        (ceremony,),
                    ).fetchone()[0]:
                        return None
                else:
                    pending = self._read(db, ceremony, "PENDING")
                    if (
                        pending is None
                        or pending["requestDigest"] != request_digest
                        or self._read(db, ceremony, "RECONCILED") is not None
                    ):
                        return None
                db.execute(
                    "INSERT INTO shutdown327 VALUES (?,?,?,?,?)",
                    (ceremony, stage, request_digest, evidence_digest, receipt),
                )
            reread = self.read(monitor, ceremony, stage)
            return reread if reread and reread["receiptDigest"] == receipt else None
        except (OSError, sqlite3.Error, ValueError, TypeError):
            return None


def _pins(keys: Any) -> bool:
    roles = ("host", "receiver", "owner", "reviewer", *MASTERS)
    return (
        isinstance(keys, dict)
        and set(keys) == set(roles)
        and all(
            isinstance(keys[k], tuple) and len(keys[k]) == 2 and _public_ed25519(*keys[k])
            for k in roles
        )
        and len({keys[k][1] for k in roles}) == len(roles)
    )


def _prior(
    monitor: PersistentReeMonitor304,
    scope: Any,
    ql432_decision: Any,
    ql433_precheck: Any,
    ql434_readiness: Any,
    ql435_pilot: Any,
    incident_journal: ProtectedContinuityJournal322,
    review_journal: ProtectedRecoveryReviewJournal323,
    precheck_journal: ProtectedNewCeremonyJournal324,
    readiness_journal: ProtectedReadinessJournal325,
    pilot_evidence_journal: ProtectedIsolatedPilotJournal326,
):
    if not (
        isinstance(ql435_pilot, dict)
        and ql435_pilot.get("accepted") is True
        and ql435_pilot.get("state") == "DURABLE_QL435_ISOLATED_PILOT_ON_EVIDENCE_DECISION"
        and ql435_pilot.get("receiver") == "ISOLATED_ONE_TEST_ON_SIGNED_WITNESS_ONLY"
        and ql435_pilot.get("connection") == "HOLD"
        and ql435_pilot.get("activationAuthorized") is False
        and ql435_pilot.get("manualReceiverIsolationRequired") is True
        and ql435_pilot.get("ownerAcceptance") == "DUAL_SIGNED_SINGLE_PILOT_EVIDENCE_REVIEW"
        and ql435_pilot.get("slaveGate") == "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
        and ql435_pilot.get("masterCount") == 3
        and ql435_pilot.get("permittedNextAction")
        == "SUPERVISED_FAIL_CLOSED_OFF_AND_SIGNED_RUNTIME_CONTINUITY_RECHECK_ONLY"
        and ql435_pilot.get("incidentId") == ql434_readiness.get("incidentId")
        and ql435_pilot.get("nextCeremonyId") == ql434_readiness.get("nextCeremonyId")
        and ql435_pilot.get("nextEpisodeId") == ql434_readiness.get("nextEpisodeId")
        and _id(ql435_pilot.get("challengeId"))
        and _id(ql435_pilot.get("challengeNonce"))
        and ql435_pilot["challengeId"] != ql435_pilot["challengeNonce"]
        and _timestamp(ql435_pilot.get("leaseExpiresAt")) is not None
        and all(
            _sha(ql435_pilot.get(k))
            for k in (
                "pendingReceiptDigest",
                "acceptedReceiptDigest",
                "independentOnWitnessDigest",
            )
        )
        and isinstance(pilot_evidence_journal, ProtectedIsolatedPilotJournal326)
    ):
        return None
    chain = _prior326(
        monitor,
        scope,
        ql432_decision,
        ql433_precheck,
        ql434_readiness,
        incident_journal,
        review_journal,
        precheck_journal,
        readiness_journal,
    )
    if not chain:
        return None
    try:
        pending = pilot_evidence_journal.read(monitor, ql435_pilot["nextCeremonyId"], "PENDING")
        accepted = pilot_evidence_journal.read(monitor, ql435_pilot["nextCeremonyId"], "ACCEPTED")
    except ValueError:
        return None
    if not (
        pending
        and accepted
        and pending["receiptDigest"] == ql435_pilot["pendingReceiptDigest"]
        and accepted["receiptDigest"] == ql435_pilot["acceptedReceiptDigest"]
        and pending["requestDigest"] == accepted["requestDigest"]
    ):
        return None
    return {"chain": chain, "pending": pending, "accepted": accepted}


def prepare_ql436_shutdown327(
    scope: dict[str, Any],
    ql435_pilot: dict[str, Any],
    prior: dict[str, Any],
    shutdown_nonce: str,
    incident_review_id: str,
    now_ms: int,
):
    """Sanitized exact-digest request only; never proof of shutdown or OFF."""
    return {
        "schema": REQUEST,
        "scope": scope,
        "originalIncidentId": ql435_pilot["incidentId"],
        "incidentReviewId": incident_review_id,
        "nextCeremonyId": ql435_pilot["nextCeremonyId"],
        "nextEpisodeId": ql435_pilot["nextEpisodeId"],
        "challengeId": ql435_pilot["challengeId"],
        "originalChallengeNonce": ql435_pilot["challengeNonce"],
        "shutdownNonce": shutdown_nonce,
        "leaseExpiresAt": ql435_pilot["leaseExpiresAt"],
        "ql431CheckpointDigest": prior["chain"]["chain"]["checkpoint"]["recordDigest"],
        "ql432OwnerReceiptDigest": prior["chain"]["chain"]["review"]["receiptDigest"],
        "ql433PrecheckReceiptDigest": prior["chain"]["chain"]["precheck"]["receiptDigest"],
        "ql434ReadinessReceiptDigest": prior["chain"]["readiness"]["receiptDigest"],
        "ql435PendingReceiptDigest": prior["pending"]["receiptDigest"],
        "ql435AcceptedReceiptDigest": prior["accepted"]["receiptDigest"],
        "ql435IndependentOnWitnessDigest": ql435_pilot["independentOnWitnessDigest"],
        "originalHostId": "DESKTOP-AE894KC",
        "source326Main": SOURCE326_MAIN,
        "requestedAction": ACTION,
        "preparedAt": _utc(now_ms),
    }


def _disposition(lease_ms: int, shutdown_at_ms: int, off_at_ms: int) -> str:
    """Late shutdown takes precedence over late independent observation."""
    if shutdown_at_ms > lease_ms:
        return LATE_HOST
    if off_at_ms > lease_ms:
        return LATE_OFF
    return TIMELY


def run_ql436_shutdown_reconciliation327(
    monitor: PersistentReeMonitor304,
    pilot_acceptance: Any,
    ql432_decision: Any,
    ql433_precheck: Any,
    ql434_readiness: Any,
    ql435_pilot: Any,
    shutdown_nonce: str,
    incident_review_id: str,
    master_reports: Any,
    owner_review: Any,
    *,
    pilot_journal: ProtectedPilotJournal321,
    incident_journal: ProtectedContinuityJournal322,
    review_journal: ProtectedRecoveryReviewJournal323,
    precheck_journal: ProtectedNewCeremonyJournal324,
    readiness_journal: ProtectedReadinessJournal325,
    pilot_evidence_journal: ProtectedIsolatedPilotJournal326,
    shutdown_journal: ProtectedShutdownJournal327,
    keys: dict[str, tuple[bytes, str]],
    read_signed_host_shutdown: Callable[..., Any] | None,
    read_signed_independent_off: Callable[..., Any] | None,
    attest_operator: Callable[..., bool] | None,
    attest_signed_ql435: Callable[..., bool] | None,
    attest_fail_closed_shutdown: Callable[..., bool] | None,
    attest_independent_receiver: Callable[..., bool] | None,
    attest_owner_custody: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, Any]:
    """Never changes receiver state. Signed evidence cannot confer CONNECTED."""

    def hold(reason: str) -> dict[str, Any]:
        return {
            **_hold(reason),
            "receiver": "UNKNOWN_UNTIL_INDEPENDENT_SIGNED_OFF",
            "connection": "HOLD",
            "activationAuthorized": False,
            "manualReceiverIsolationRequired": True,
            "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        }

    now = int(time.time() * 1000) if now_ms is None else now_ms
    scope = _accepted(monitor, pilot_acceptance, pilot_journal)
    if not (
        scope
        and isinstance(ql435_pilot, dict)
        and type(now) is int
        and _id(shutdown_nonce)
        and _id(incident_review_id)
        and shutdown_nonce != incident_review_id
        and isinstance(shutdown_journal, ProtectedShutdownJournal327)
        and _pins(keys)
        and all(callable(x) for x in (read_signed_host_shutdown, read_signed_independent_off))
    ):
        return hold("HOLD_QL436_PROTECTED_SHUTDOWN_AUTHORITY_OR_SIGNER_PINS_MISSING")
    prior = _prior(
        monitor,
        scope,
        ql432_decision,
        ql433_precheck,
        ql434_readiness,
        ql435_pilot,
        incident_journal,
        review_journal,
        precheck_journal,
        readiness_journal,
        pilot_evidence_journal,
    )
    lease = _timestamp(ql435_pilot.get("leaseExpiresAt"))
    if not (
        prior
        and lease is not None
        and -15_000 <= now - lease <= 60_000
        and shutdown_nonce
        not in (
            ql435_pilot["challengeId"],
            ql435_pilot["challengeNonce"],
            ql435_pilot["nextCeremonyId"],
        )
        and incident_review_id
        not in (
            ql435_pilot["challengeId"],
            ql435_pilot["challengeNonce"],
            ql435_pilot["nextCeremonyId"],
        )
    ):
        return hold("HOLD_QL436_QL431_TO_QL435_PRIVATE_CHAIN_OR_LEASE_INVALID")
    ceremony = ql435_pilot["nextCeremonyId"]
    try:
        if shutdown_journal.read(monitor, ceremony, "PENDING") or shutdown_journal.read(
            monitor, ceremony, "RECONCILED"
        ):
            return hold("HOLD_QL436_CEREMONY_SHUTDOWN_REVIEW_ALREADY_CONSUMED")
    except ValueError:
        return hold("HOLD_QL436_SHUTDOWN_LEDGER_UNREADABLE")
    request = prepare_ql436_shutdown327(
        scope,
        ql435_pilot,
        prior,
        shutdown_nonce,
        incident_review_id,
        now,
    )
    request_digest = _digest(request)
    evidence = {
        "host_id": "DESKTOP-AE894KC",
        "incident_id": request["originalIncidentId"],
        "ceremony_id": ceremony,
        "challenge_id": request["challengeId"],
        "challenge_nonce": request["originalChallengeNonce"],
        "shutdown_nonce": shutdown_nonce,
        "review_id": incident_review_id,
        "lease_expires_at": request["leaseExpiresAt"],
        "request_digest": request_digest,
    }
    if not all(
        (
            _callback(attest_operator, **evidence),
            _callback(attest_signed_ql435, **evidence),
            _callback(attest_fail_closed_shutdown, **evidence),
            _callback(attest_independent_receiver, **evidence),
            _callback(attest_owner_custody, **evidence),
        )
    ):
        return hold("HOLD_QL436_ORIGINAL_HOST_OR_SIGNED_SHUTDOWN_AUTHORITY_UNVERIFIED")
    pending = shutdown_journal.claim_once(
        monitor,
        ceremony,
        "PENDING",
        request_digest,
        _digest(
            {
                "reviewId": incident_review_id,
                "shutdownNonce": shutdown_nonce,
                "ql435AcceptedReceiptDigest": request["ql435AcceptedReceiptDigest"],
                "leaseExpiresAt": request["leaseExpiresAt"],
            }
        ),
    )
    if pending is None:
        return hold("HOLD_QL436_DURABLE_PENDING_WRITE_FAILED_OR_REPLAY")
    try:
        host_env = read_signed_host_shutdown(
            request=request,
            request_digest=request_digest,
            pending_receipt_digest=pending["receiptDigest"],
        )
    except Exception:
        return hold("HOLD_QL436_ORIGINAL_HOST_SHUTDOWN_PROOF_UNAVAILABLE")
    host = _signed(
        host_env,
        {
            "requestDigest",
            "hostMachineId",
            "scope",
            "originalIncidentId",
            "incidentReviewId",
            "nextCeremonyId",
            "nextEpisodeId",
            "challengeId",
            "originalChallengeNonce",
            "shutdownNonce",
            "leaseExpiresAt",
            "ql435AcceptedReceiptDigest",
            "shutdownMechanism",
            "receiverState",
            "shutdownAt",
            "observedAt",
            "shutdownSequence",
        },
        HOST,
        keys["host"],
        now,
        now - 60_000,
        "observedAt",
    )
    shutdown_at = _timestamp(host.get("shutdownAt")) if host else None
    if not (
        _match(
            host,
            {
                "requestDigest": request_digest,
                "hostMachineId": "DESKTOP-AE894KC",
                "scope": scope,
                "originalIncidentId": request["originalIncidentId"],
                "incidentReviewId": incident_review_id,
                "nextCeremonyId": ceremony,
                "nextEpisodeId": request["nextEpisodeId"],
                "challengeId": request["challengeId"],
                "originalChallengeNonce": request["originalChallengeNonce"],
                "shutdownNonce": shutdown_nonce,
                "leaseExpiresAt": request["leaseExpiresAt"],
                "ql435AcceptedReceiptDigest": request["ql435AcceptedReceiptDigest"],
                "shutdownMechanism": "ORIGINAL_HOST_FAIL_CLOSED_PILOT_DISABLE",
                "receiverState": "OFF",
            },
        )
        and type(host.get("shutdownSequence")) is int
        and host["shutdownSequence"] >= 1
        and shutdown_at is not None
        and now - 60_000 <= shutdown_at <= _timestamp(host["observedAt"])
    ):
        return hold("HOLD_QL436_HOST_SIGNED_OFF_OR_SHUTDOWN_SEQUENCE_INVALID")
    try:
        off_env = read_signed_independent_off(
            request=request,
            host_shutdown_digest=_digest(host),
            required_state="OFF",
        )
    except Exception:
        return hold("HOLD_QL436_INDEPENDENT_RECEIVER_OFF_UNAVAILABLE")
    off = _signed(
        off_env,
        {
            "requestDigest",
            "originalIncidentId",
            "incidentReviewId",
            "nextCeremonyId",
            "challengeId",
            "shutdownNonce",
            "hostShutdownDigest",
            "leaseExpiresAt",
            "receiverState",
            "offContinuitySequence",
            "observedAt",
        },
        OFF,
        keys["receiver"],
        now,
        _timestamp(host["observedAt"]),
        "observedAt",
    )
    if not (
        _match(
            off,
            {
                "requestDigest": request_digest,
                "originalIncidentId": request["originalIncidentId"],
                "incidentReviewId": incident_review_id,
                "nextCeremonyId": ceremony,
                "challengeId": request["challengeId"],
                "shutdownNonce": shutdown_nonce,
                "hostShutdownDigest": _digest(host),
                "leaseExpiresAt": request["leaseExpiresAt"],
                "receiverState": "OFF",
            },
        )
        and type(off.get("offContinuitySequence")) is int
        and off["offContinuitySequence"] >= host["shutdownSequence"]
        and off["offContinuitySequence"] >= 1
    ):
        return hold("HOLD_QL436_INDEPENDENT_SIGNED_RECEIVER_OFF_READBACK_INVALID")
    disposition = _disposition(
        lease,
        shutdown_at,
        _timestamp(off["observedAt"]),
    )
    if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
        return hold("HOLD_QL436_THREE_INDEPENDENT_MASTER_CONTINUITY_REPORTS_MISSING")
    masters = []
    for master in MASTERS:
        p = _signed(
            master_reports[master],
            {
                "masterId",
                "requestDigest",
                "incidentReviewId",
                "originalIncidentId",
                "nextCeremonyId",
                "shutdownNonce",
                "hostShutdownDigest",
                "independentOffDigest",
                "leaseExpiresAt",
                "leaseDisposition",
                "decision",
                "observedAt",
            },
            MASTER,
            keys[master],
            now,
            _timestamp(off["observedAt"]),
            "observedAt",
        )
        if not _match(
            p,
            {
                "masterId": master,
                "requestDigest": request_digest,
                "incidentReviewId": incident_review_id,
                "originalIncidentId": request["originalIncidentId"],
                "nextCeremonyId": ceremony,
                "shutdownNonce": shutdown_nonce,
                "hostShutdownDigest": _digest(host),
                "independentOffDigest": _digest(off),
                "leaseExpiresAt": request["leaseExpiresAt"],
                "leaseDisposition": disposition,
                "decision": ACK,
            },
        ):
            return hold("HOLD_QL436_THREE_MASTER_SIGNED_INCIDENT_CUSTODY_MISMATCH")
        masters.append(p)
    owner_action = OWNER_TIMELY if disposition == TIMELY else OWNER_LATE
    owner = _dual(
        owner_review,
        {
            "schema",
            "requestDigest",
            "incidentReviewId",
            "originalIncidentId",
            "nextCeremonyId",
            "shutdownNonce",
            "hostShutdownDigest",
            "independentOffDigest",
            "mastersDigest",
            "leaseDisposition",
            "action",
            "ownerId",
            "reviewerId",
            "reviewedAt",
        },
        OWNER,
        owner_action,
        *keys["owner"],
        *keys["reviewer"],
        now,
        max(_timestamp(m["observedAt"]) for m in masters),
        "reviewedAt",
    )
    if not _match(
        owner,
        {
            "requestDigest": request_digest,
            "incidentReviewId": incident_review_id,
            "originalIncidentId": request["originalIncidentId"],
            "nextCeremonyId": ceremony,
            "shutdownNonce": shutdown_nonce,
            "hostShutdownDigest": _digest(host),
            "independentOffDigest": _digest(off),
            "mastersDigest": _digest(masters),
            "leaseDisposition": disposition,
        },
    ):
        return hold("HOLD_QL436_DUAL_OWNER_LEASE_DISPOSITION_OR_ESCALATION_INVALID")
    latest = _prior(
        monitor,
        scope,
        ql432_decision,
        ql433_precheck,
        ql434_readiness,
        ql435_pilot,
        incident_journal,
        review_journal,
        precheck_journal,
        readiness_journal,
        pilot_evidence_journal,
    )
    try:
        reread_pending = shutdown_journal.read(monitor, ceremony, "PENDING")
    except ValueError:
        reread_pending = None
    if latest != prior or reread_pending != pending:
        return hold("HOLD_QL436_PRIOR_OR_PENDING_CUSTODY_DRIFT")
    reconciled = shutdown_journal.claim_once(
        monitor,
        ceremony,
        "RECONCILED",
        request_digest,
        _digest(
            {
                "pendingReceiptDigest": pending["receiptDigest"],
                "hostShutdownDigest": _digest(host),
                "independentOffDigest": _digest(off),
                "leaseDisposition": disposition,
                "mastersDigest": _digest(masters),
                "ownerReviewDigest": _digest(owner),
            }
        ),
    )
    if reconciled is None:
        return hold("HOLD_QL436_RECONCILED_RECEIPT_UNDURABLE_OR_REPLAY")
    return {
        **hold("SIGNATURE_VERIFIED_OFF_RECONCILED_NO_AUTOMATIC_REENTRY"),
        "accepted": True,
        "state": "DURABLE_QL436_POST_PILOT_SIGNED_OFF_RECONCILED",
        "receiver": "OFF_VERIFIED_HOST_AND_INDEPENDENT_READBACK",
        "ownerAcceptance": "DUAL_SIGNED_OFF_AND_EXPIRY_REVIEW_ONLY",
        "originalIncidentId": request["originalIncidentId"],
        "incidentReviewId": incident_review_id,
        "nextCeremonyId": ceremony,
        "shutdownNonce": shutdown_nonce,
        "leaseExpiresAt": request["leaseExpiresAt"],
        "leaseDisposition": disposition,
        "leaseExceptionEscalationRequired": disposition != TIMELY,
        "masterCount": 3,
        "pendingReceiptDigest": pending["receiptDigest"],
        "reconciledReceiptDigest": reconciled["receiptDigest"],
        "permittedNextAction": "SUPERVISED_POST_OFF_CONTINUITY_REVIEW_NO_AUTOMATIC_REENTRY",
        "connection": "HOLD",
        "activationAuthorized": False,
        "manualReceiverIsolationRequired": True,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }


def reconcile_master_evidence327(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Read-only source projection. Never extrapolate actual receiver OFF."""
    return {
        **reconcile_master_evidence326(monitor),
        "schema": "rosevear.ai-hub.master360-ql436-shutdown327.v1",
        "sourceBuild": 327,
        "source326MainAtReconciliation": SOURCE326_MAIN,
        "commsQl436ContractAtReconciliation": COMMS436_MAIN,
        "ql436PriorQl431To435Custody": "HOLD_NO_PRIVATE_PRIOR_SIGNED_READBACK",
        "ql436ProtectedShutdownAuthority": "HOLD_NO_ORIGINAL_HOST_SHUTDOWN_SESSION",
        "ql436OneUsePending": "HOLD_NO_DURABLE_SHUTDOWN_PENDING",
        "ql436SignedOriginalHostOff": "HOLD_NO_SIGNED_ORIGINAL_HOST_OFF_PROOF",
        "ql436IndependentReceiverOff": "HOLD_NO_INDEPENDENT_SIGNED_RECEIVER_OFF",
        "ql436LeaseDisposition": "HOLD_NO_SIGNED_ON_TIME_OR_LATE_CLASSIFICATION",
        "ql436ThreeMasterContinuity": "HOLD_NO_THREE_SIGNED_INCIDENT_CONTINUITY_REPORTS",
        "ql436DualOwnerReview": "HOLD_NO_DUAL_SIGNED_HOLD_OR_ESCALATION",
        "ql436ReconciledReceipt": "HOLD_NO_DURABLE_ONE_USE_RECONCILED_RECEIPT",
        "ql436IndependentRuntimeOff": "UNKNOWN_NO_REAL_ORIGINAL_HOST_OFF_OBSERVATION",
        "activationAuthorized": False,
        "receiver": "UNKNOWN_UNTIL_INDEPENDENT_SIGNED_OFF",
        "connection": "HOLD",
        "ownerAcceptance": "HOLD",
        "masterSync": "HOLD",
        "runtimeUptime": "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING",
    }
