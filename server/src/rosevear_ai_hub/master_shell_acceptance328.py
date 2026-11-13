"""Build 328 / QL-437: anchored post-shutdown OFF evidence and incident custody.

Read-only external adapters must be supervised on DESKTOP-AE894KC. Private
CI-generated signatures and local SQLite do NOT establish immutable external
custody or an actual original-host receiver OFF state.
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
from rosevear_ai_hub.master_shell_acceptance326 import ProtectedIsolatedPilotJournal326
from rosevear_ai_hub.master_shell_acceptance327 import (
    LATE_HOST,
    LATE_OFF,
    TIMELY,
    ProtectedShutdownJournal327,
    reconcile_master_evidence327,
)
from rosevear_ai_hub.master_shell_acceptance327 import _prior as _prior327
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE327_MAIN = "8227b392b403b714d492a1f82e85c080e41a1f5a"
COMMS437_MAIN = "7bf522660f6f10a1cd1b039aacf9b93af165304f"
EXPORT_SCHEMA = "rosevear.ai-hub.ql437.post-shutdown-off-evidence-export.v1"
ANCHOR_SCHEMA = "rosevear.ai-hub.ql437.external-off-evidence-anchor.v1"
READBACK_SCHEMA = "rosevear.ai-hub.ql437.independent-off-anchor-readback.v1"
HOST_SCHEMA = "rosevear.ai-hub.ql437.original-host-post-shutdown-off.v1"
OFF_SCHEMA = "rosevear.ai-hub.ql437.independent-post-shutdown-off.v1"
MASTER_SCHEMA = "rosevear.ai-hub.ql437.master-post-shutdown-incident-continuity.v1"
EXCEPTION_SCHEMA = "rosevear.ai-hub.ql437.independent-expired-lease-custody.v1"
OWNER_SCHEMA = "rosevear.ai-hub.ql437.dual-owner-incident-closure-readback.v1"
EXPORT_ACTION = "INDEPENDENT_ANCHOR_OFF_EVIDENCE_NO_ACTIVATION_NO_REENTRY"
ON_TIME_ACTION = "ACK_ON_TIME_POST_SHUTDOWN_INCIDENT_CLOSURE_NO_REENTRY_KEEP_HOLD"
LATE_ACTION = "ACK_LEASE_EXCEPTION_OPEN_NO_INCIDENT_CLOSURE_KEEP_HOLD"


class ProtectedClosureJournal328:
    """Single-use original-incident PENDING -> FINAL custody, SQLite FULL sync.

    Durable local receipts detect retained-record corruption and replay; their
    deletion by a privileged actor requires separate immutable off-host custody.
    """

    def __init__(self, path: Path):
        self.path = path

    @staticmethod
    def _read(db: sqlite3.Connection, incident: str, stage: str):
        row = db.execute(
            "SELECT export_digest,evidence_digest,receipt_digest "
            "FROM closure328 WHERE incident_id=? AND stage=?",
            (incident, stage),
        ).fetchone()
        if row is None:
            return None
        exported, evidence, receipt = row
        if not all(_sha(x) for x in row):
            raise ValueError("QL437_INVALID_CLOSURE_RECEIPT")
        if (
            _digest(
                {
                    "incidentId": incident,
                    "stage": stage,
                    "exportDigest": exported,
                    "evidenceDigest": evidence,
                }
            )
            != receipt
        ):
            raise ValueError("QL437_TAMPERED_CLOSURE_RECEIPT")
        return {
            "exportDigest": exported,
            "evidenceDigest": evidence,
            "receiptDigest": receipt,
        }

    def read(self, monitor: PersistentReeMonitor304, incident: str, stage: str):
        if not (
            _on_ree(monitor)
            and _id(incident)
            and stage in ("PENDING", "FINAL")
            and self.path.is_file()
        ):
            return None
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                return self._read(db, incident, stage)
        except (OSError, sqlite3.Error, ValueError, TypeError):
            raise ValueError("QL437_PRIVATE_CLOSURE_CUSTODY_UNREADABLE") from None

    def claim_once(
        self,
        monitor: PersistentReeMonitor304,
        incident: str,
        stage: str,
        export_digest: str,
        evidence_digest: str,
    ):
        if not (
            _on_ree(monitor)
            and _id(incident)
            and stage in ("PENDING", "FINAL")
            and _sha(export_digest)
            and _sha(evidence_digest)
            and self.path.is_absolute()
        ):
            return None
        receipt = _digest(
            {
                "incidentId": incident,
                "stage": stage,
                "exportDigest": export_digest,
                "evidenceDigest": evidence_digest,
            }
        )
        try:
            self.path.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
            if self.path.is_symlink() or self.path.parent.is_symlink():
                return None
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    "CREATE TABLE IF NOT EXISTS closure328 ("
                    "incident_id TEXT NOT NULL,stage TEXT NOT NULL,"
                    "export_digest TEXT NOT NULL,evidence_digest TEXT NOT NULL,"
                    "receipt_digest TEXT NOT NULL,PRIMARY KEY(incident_id,stage))"
                )
                if stage == "PENDING":
                    if db.execute(
                        "SELECT COUNT(*) FROM closure328 WHERE incident_id=?",
                        (incident,),
                    ).fetchone()[0]:
                        return None
                else:
                    p = self._read(db, incident, "PENDING")
                    if (
                        p is None
                        or p["exportDigest"] != export_digest
                        or self._read(db, incident, "FINAL") is not None
                    ):
                        return None
                db.execute(
                    "INSERT INTO closure328 VALUES (?,?,?,?,?)",
                    (incident, stage, export_digest, evidence_digest, receipt),
                )
            recorded = self.read(monitor, incident, stage)
            return recorded if recorded and recorded["receiptDigest"] == receipt else None
        except (OSError, sqlite3.Error, ValueError, TypeError):
            return None

    def status(self, monitor: PersistentReeMonitor304, incident: str):
        """Recovered local FINAL must never be presented as current live OFF."""
        try:
            pending = self.read(monitor, incident, "PENDING")
            final = self.read(monitor, incident, "FINAL")
            if final and not pending:
                return "HOLD_QL437_FINAL_WITHOUT_PENDING"
            if final:
                return "QL437_PRIVATE_FINAL_RECORD_PRESENT_NOT_LIVE_OFF_PROOF"
            if pending:
                return "HOLD_QL437_PENDING_INCOMPLETE_NO_RECEIVER_OFF_PROOF"
        except ValueError:
            return "HOLD_QL437_PRIVATE_LEDGER_UNREADABLE"
        return "HOLD_QL437_NO_PROTECTED_CLOSURE_RECORD"


def _pins(keys: Any) -> bool:
    roles = ("anchor", "reader", "host", "receiver", "exception", "owner", "reviewer", *MASTERS)
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
    ql436_shutdown: Any,
    incident_journal: ProtectedContinuityJournal322,
    review_journal: ProtectedRecoveryReviewJournal323,
    precheck_journal: ProtectedNewCeremonyJournal324,
    readiness_journal: ProtectedReadinessJournal325,
    pilot_evidence_journal: ProtectedIsolatedPilotJournal326,
    shutdown_journal: ProtectedShutdownJournal327,
):
    if not (
        isinstance(ql436_shutdown, dict)
        and ql436_shutdown.get("accepted") is True
        and ql436_shutdown.get("state") == "DURABLE_QL436_POST_PILOT_SIGNED_OFF_RECONCILED"
        and ql436_shutdown.get("receiver") == "OFF_VERIFIED_HOST_AND_INDEPENDENT_READBACK"
        and ql436_shutdown.get("connection") == "HOLD"
        and ql436_shutdown.get("activationAuthorized") is False
        and ql436_shutdown.get("manualReceiverIsolationRequired") is True
        and ql436_shutdown.get("ownerAcceptance") == "DUAL_SIGNED_OFF_AND_EXPIRY_REVIEW_ONLY"
        and ql436_shutdown.get("slaveGate") == "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
        and ql436_shutdown.get("permittedNextAction")
        == "SUPERVISED_POST_OFF_CONTINUITY_REVIEW_NO_AUTOMATIC_REENTRY"
        and ql436_shutdown.get("masterCount") == 3
        and ql436_shutdown.get("originalIncidentId") == ql435_pilot.get("incidentId")
        and ql436_shutdown.get("nextCeremonyId") == ql435_pilot.get("nextCeremonyId")
        and ql436_shutdown.get("leaseExpiresAt") == ql435_pilot.get("leaseExpiresAt")
        and ql436_shutdown.get("leaseDisposition") in (TIMELY, LATE_HOST, LATE_OFF)
        and ql436_shutdown.get("leaseExceptionEscalationRequired")
        is (ql436_shutdown.get("leaseDisposition") != TIMELY)
        and _id(ql436_shutdown.get("incidentReviewId"))
        and _id(ql436_shutdown.get("shutdownNonce"))
        and _sha(ql436_shutdown.get("pendingReceiptDigest"))
        and _sha(ql436_shutdown.get("reconciledReceiptDigest"))
        and isinstance(shutdown_journal, ProtectedShutdownJournal327)
    ):
        return None
    chain = _prior327(
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
    if not chain:
        return None
    try:
        pending = shutdown_journal.read(monitor, ql436_shutdown["nextCeremonyId"], "PENDING")
        reconciled = shutdown_journal.read(
            monitor,
            ql436_shutdown["nextCeremonyId"],
            "RECONCILED",
        )
    except ValueError:
        return None
    if not (
        pending
        and reconciled
        and pending["receiptDigest"] == ql436_shutdown["pendingReceiptDigest"]
        and reconciled["receiptDigest"] == ql436_shutdown["reconciledReceiptDigest"]
        and pending["requestDigest"] == reconciled["requestDigest"]
    ):
        return None
    return {"chain": chain, "pending": pending, "reconciled": reconciled}


def prepare_ql437_export328(
    scope: dict[str, Any],
    ql435_pilot: dict[str, Any],
    ql436_shutdown: dict[str, Any],
    prior: dict[str, Any],
    export_id: str,
    anchor_nonce: str,
    now: int,
):
    """An exported proposal is not an immutable anchor or live receiver proof."""
    chain327 = prior["chain"]
    chain326 = chain327["chain"]
    prior325 = chain326["chain"]
    return {
        "schema": EXPORT_SCHEMA,
        "scope": scope,
        "originalIncidentId": ql436_shutdown["originalIncidentId"],
        "incidentReviewId": ql436_shutdown["incidentReviewId"],
        "nextCeremonyId": ql436_shutdown["nextCeremonyId"],
        "nextEpisodeId": ql435_pilot["nextEpisodeId"],
        "leaseExpiresAt": ql436_shutdown["leaseExpiresAt"],
        "leaseDisposition": ql436_shutdown["leaseDisposition"],
        "exceptionEscalationRequired": ql436_shutdown["leaseExceptionEscalationRequired"],
        "ql431CheckpointDigest": prior325["checkpoint"]["recordDigest"],
        "ql432OwnerReceiptDigest": prior325["review"]["receiptDigest"],
        "ql433PrecheckReceiptDigest": prior325["precheck"]["receiptDigest"],
        "ql434ReadinessReceiptDigest": chain326["readiness"]["receiptDigest"],
        "ql435PendingReceiptDigest": chain327["pending"]["receiptDigest"],
        "ql435AcceptedReceiptDigest": chain327["accepted"]["receiptDigest"],
        "ql436PendingReceiptDigest": prior["pending"]["receiptDigest"],
        "ql436ReconciledReceiptDigest": prior["reconciled"]["receiptDigest"],
        "exportId": export_id,
        "anchorChallengeNonce": anchor_nonce,
        "originalHostId": "DESKTOP-AE894KC",
        "source327Main": SOURCE327_MAIN,
        "action": EXPORT_ACTION,
        "preparedAt": _utc(now),
    }


def run_ql437_anchored_off_closure328(
    monitor: PersistentReeMonitor304,
    pilot_acceptance: Any,
    ql432_decision: Any,
    ql433_precheck: Any,
    ql434_readiness: Any,
    ql435_pilot: Any,
    ql436_shutdown: Any,
    export_id: str,
    anchor_nonce: str,
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
    closure_journal: ProtectedClosureJournal328,
    keys: dict[str, tuple[bytes, str]],
    read_external_anchor: Callable[..., Any] | None,
    read_host_off: Callable[..., Any] | None,
    read_independent_off: Callable[..., Any] | None,
    read_exception_custody: Callable[..., Any] | None,
    attest_operator: Callable[..., bool] | None,
    attest_signed_ql436: Callable[..., bool] | None,
    attest_independent_anchor: Callable[..., bool] | None,
    attest_independent_receiver: Callable[..., bool] | None,
    attest_owner_custody: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, Any]:
    """Never calls enable/disable/restart; stale or incomplete evidence HOLDs."""

    def hold(reason: str):
        return {
            **_hold(reason),
            "receiver": "UNKNOWN_PENDING_INDEPENDENT_OFF_REVALIDATION",
            "connection": "HOLD",
            "activationAuthorized": False,
            "manualReceiverIsolationRequired": True,
            "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
            "incidentClosureAuthorized": False,
        }

    now = int(time.time() * 1000) if now_ms is None else now_ms
    scope = _accepted(monitor, pilot_acceptance, pilot_journal)
    if not (
        scope
        and isinstance(ql436_shutdown, dict)
        and type(now) is int
        and _id(export_id)
        and _id(anchor_nonce)
        and export_id != anchor_nonce
        and export_id
        not in (
            ql436_shutdown.get("incidentReviewId"),
            ql436_shutdown.get("originalIncidentId"),
            ql436_shutdown.get("nextCeremonyId"),
        )
        and anchor_nonce
        not in (
            ql436_shutdown.get("incidentReviewId"),
            ql436_shutdown.get("shutdownNonce"),
        )
        and isinstance(closure_journal, ProtectedClosureJournal328)
        and _pins(keys)
        and all(
            callable(x)
            for x in (
                read_external_anchor,
                read_host_off,
                read_independent_off,
            )
        )
    ):
        return hold("HOLD_QL437_PROTECTED_ORIGINAL_HOST_EXPORT_OR_PINS_MISSING")
    prior = _prior(
        monitor,
        scope,
        ql432_decision,
        ql433_precheck,
        ql434_readiness,
        ql435_pilot,
        ql436_shutdown,
        incident_journal,
        review_journal,
        precheck_journal,
        readiness_journal,
        pilot_evidence_journal,
        shutdown_journal,
    )
    if not prior:
        return hold("HOLD_QL437_EXACT_QL431_TO_QL436_PRIVATE_CUSTODY_INVALID")
    export = prepare_ql437_export328(
        scope,
        ql435_pilot,
        ql436_shutdown,
        prior,
        export_id,
        anchor_nonce,
        now,
    )
    export_digest = _digest(export)
    evidence = {
        "host_id": "DESKTOP-AE894KC",
        "incident_id": export["originalIncidentId"],
        "review_id": export["incidentReviewId"],
        "ceremony_id": export["nextCeremonyId"],
        "export_id": export_id,
        "anchor_nonce": anchor_nonce,
        "lease_disposition": export["leaseDisposition"],
        "ql436_digest": export["ql436ReconciledReceiptDigest"],
        "export_digest": export_digest,
    }
    if not all(
        (
            _callback(attest_operator, **evidence),
            _callback(attest_signed_ql436, **evidence),
            _callback(attest_independent_anchor, **evidence),
            _callback(attest_independent_receiver, **evidence),
            _callback(attest_owner_custody, **evidence),
        )
    ):
        return hold("HOLD_QL437_INDEPENDENT_SIGNED_CUSTODY_AUTHORITY_UNVERIFIED")
    if export["exceptionEscalationRequired"] and not callable(read_exception_custody):
        return hold("HOLD_QL437_EXPIRED_LEASE_INDEPENDENT_EXCEPTION_CUSTODY_REQUIRED")
    incident = export["originalIncidentId"]
    try:
        if closure_journal.read(monitor, incident, "PENDING") or closure_journal.read(
            monitor, incident, "FINAL"
        ):
            return hold("HOLD_QL437_INCIDENT_REVIEW_ALREADY_CONSUMED")
    except ValueError:
        return hold("HOLD_QL437_PRIVATE_LEDGER_UNREADABLE")
    pending = closure_journal.claim_once(
        monitor,
        incident,
        "PENDING",
        export_digest,
        _digest(
            {
                "anchorChallengeNonce": anchor_nonce,
                "ql436ReconciledReceiptDigest": export["ql436ReconciledReceiptDigest"],
                "leaseDisposition": export["leaseDisposition"],
            }
        ),
    )
    if pending is None:
        return hold("HOLD_QL437_PENDING_WRITE_FAILED_OR_REPLAY")
    try:
        anchor_env = read_external_anchor(
            export_record=export,
            export_digest=export_digest,
            pending_receipt_digest=pending["receiptDigest"],
        )
    except Exception:
        return hold("HOLD_QL437_EXTERNAL_ANCHOR_UNAVAILABLE")
    if not isinstance(anchor_env, dict):
        return hold("HOLD_QL437_ANCHOR_OR_INDEPENDENT_READER_MISSING")
    anchor = _signed(
        anchor_env.get("anchor"),
        {
            "exportId",
            "anchorChallengeNonce",
            "exportDigest",
            "originalIncidentId",
            "incidentReviewId",
            "nextCeremonyId",
            "ql436ReconciledReceiptDigest",
            "leaseDisposition",
            "status",
            "anchoredAt",
        },
        ANCHOR_SCHEMA,
        keys["anchor"],
        now,
        now - 60_000,
        "anchoredAt",
    )
    if not _match(
        anchor,
        {
            "exportId": export_id,
            "anchorChallengeNonce": anchor_nonce,
            "exportDigest": export_digest,
            "originalIncidentId": incident,
            "incidentReviewId": export["incidentReviewId"],
            "nextCeremonyId": export["nextCeremonyId"],
            "ql436ReconciledReceiptDigest": export["ql436ReconciledReceiptDigest"],
            "leaseDisposition": export["leaseDisposition"],
            "status": "EXTERNAL_IMMUTABLE_SIGNED_OFF_EVIDENCE_ANCHORED",
        },
    ) or _timestamp(anchor["anchoredAt"]) < _timestamp(export["preparedAt"]):
        return hold("HOLD_QL437_EXTERNAL_ANCHOR_INVALID")
    reader = _signed(
        anchor_env.get("reader"),
        {
            "exportId",
            "anchorChallengeNonce",
            "exportDigest",
            "externalAnchorDigest",
            "originalIncidentId",
            "status",
            "readAt",
        },
        READBACK_SCHEMA,
        keys["reader"],
        now,
        _timestamp(anchor["anchoredAt"]),
        "readAt",
    )
    if not _match(
        reader,
        {
            "exportId": export_id,
            "anchorChallengeNonce": anchor_nonce,
            "exportDigest": export_digest,
            "externalAnchorDigest": _digest(anchor),
            "originalIncidentId": incident,
            "status": "INDEPENDENT_EXACT_ANCHORED_OFF_EVIDENCE_READBACK",
        },
    ):
        return hold("HOLD_QL437_DISTINCT_ANCHOR_READER_INVALID")
    try:
        host_env = read_host_off(
            export_record=export,
            anchor_digest=_digest(anchor),
            independent_reader_digest=_digest(reader),
        )
    except Exception:
        return hold("HOLD_QL437_ORIGINAL_HOST_POST_SHUTDOWN_OFF_UNAVAILABLE")
    host = _signed(
        host_env,
        {
            "hostMachineId",
            "scope",
            "originalIncidentId",
            "nextCeremonyId",
            "exportId",
            "anchorChallengeNonce",
            "anchorDigest",
            "independentReadbackDigest",
            "receiverState",
            "shutdownContinuitySequence",
            "observedAt",
        },
        HOST_SCHEMA,
        keys["host"],
        now,
        _timestamp(reader["readAt"]),
        "observedAt",
    )
    if (
        not _match(
            host,
            {
                "hostMachineId": "DESKTOP-AE894KC",
                "scope": scope,
                "originalIncidentId": incident,
                "nextCeremonyId": export["nextCeremonyId"],
                "exportId": export_id,
                "anchorChallengeNonce": anchor_nonce,
                "anchorDigest": _digest(anchor),
                "independentReadbackDigest": _digest(reader),
                "receiverState": "OFF",
            },
        )
        or type(host["shutdownContinuitySequence"]) is not int
        or (host["shutdownContinuitySequence"] < 1)
    ):
        return hold("HOLD_QL437_SIGNED_ORIGINAL_HOST_OFF_INVALID")
    try:
        off_env = read_independent_off(
            export_record=export,
            host_off_digest=_digest(host),
            independent_reader_digest=_digest(reader),
        )
    except Exception:
        return hold("HOLD_QL437_INDEPENDENT_RECEIVER_OFF_UNAVAILABLE")
    off = _signed(
        off_env,
        {
            "originalIncidentId",
            "nextCeremonyId",
            "exportId",
            "anchorChallengeNonce",
            "hostOffDigest",
            "independentAnchorReadbackDigest",
            "receiverState",
            "offContinuitySequence",
            "observedAt",
        },
        OFF_SCHEMA,
        keys["receiver"],
        now,
        _timestamp(host["observedAt"]),
        "observedAt",
    )
    if (
        not _match(
            off,
            {
                "originalIncidentId": incident,
                "nextCeremonyId": export["nextCeremonyId"],
                "exportId": export_id,
                "anchorChallengeNonce": anchor_nonce,
                "hostOffDigest": _digest(host),
                "independentAnchorReadbackDigest": _digest(reader),
                "receiverState": "OFF",
            },
        )
        or type(off["offContinuitySequence"]) is not int
        or (off["offContinuitySequence"] < host["shutdownContinuitySequence"])
    ):
        return hold("HOLD_QL437_INDEPENDENT_FRESH_SIGNED_OFF_INVALID")
    if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
        return hold("HOLD_QL437_THREE_MASTER_SIGNED_CONTINUITY_MISSING")
    masters = []
    for master_id in MASTERS:
        m = _signed(
            master_reports[master_id],
            {
                "masterId",
                "originalIncidentId",
                "nextCeremonyId",
                "exportDigest",
                "independentAnchorReadbackDigest",
                "independentOffDigest",
                "leaseDisposition",
                "status",
                "observedAt",
            },
            MASTER_SCHEMA,
            keys[master_id],
            now,
            _timestamp(off["observedAt"]),
            "observedAt",
        )
        if not _match(
            m,
            {
                "masterId": master_id,
                "originalIncidentId": incident,
                "nextCeremonyId": export["nextCeremonyId"],
                "exportDigest": export_digest,
                "independentAnchorReadbackDigest": _digest(reader),
                "independentOffDigest": _digest(off),
                "leaseDisposition": export["leaseDisposition"],
                "status": "SIGNED_POST_SHUTDOWN_OFF_HOLD_NO_REENTRY",
            },
        ):
            return hold("HOLD_QL437_THREE_MASTER_SIGNED_CUSTODY_INVALID")
        masters.append(m)
    masters_digest = _digest(masters)
    latest_masters = max(_timestamp(m["observedAt"]) for m in masters)
    exception = None
    if export["exceptionEscalationRequired"]:
        try:
            exception_env = read_exception_custody(
                export_record=export,
                masters_digest=masters_digest,
                independent_off_digest=_digest(off),
            )
        except Exception:
            return hold("HOLD_QL437_EXPIRED_LEASE_CUSTODY_UNAVAILABLE")
        exception = _signed(
            exception_env,
            {
                "originalIncidentId",
                "incidentReviewId",
                "nextCeremonyId",
                "exportDigest",
                "independentAnchorReadbackDigest",
                "independentOffDigest",
                "mastersDigest",
                "leaseDisposition",
                "status",
                "recordedAt",
            },
            EXCEPTION_SCHEMA,
            keys["exception"],
            now,
            latest_masters,
            "recordedAt",
        )
        if not _match(
            exception,
            {
                "originalIncidentId": incident,
                "incidentReviewId": export["incidentReviewId"],
                "nextCeremonyId": export["nextCeremonyId"],
                "exportDigest": export_digest,
                "independentAnchorReadbackDigest": _digest(reader),
                "independentOffDigest": _digest(off),
                "mastersDigest": masters_digest,
                "leaseDisposition": export["leaseDisposition"],
                "status": "LEASE_EXCEPTION_INDEPENDENT_CUSTODY_OPEN_NOT_CLOSED",
            },
        ):
            return hold("HOLD_QL437_SIGNED_EXCEPTION_CUSTODY_INVALID")
    owner_action = LATE_ACTION if exception else ON_TIME_ACTION
    owner = _dual(
        owner_review,
        {
            "schema",
            "originalIncidentId",
            "incidentReviewId",
            "exportDigest",
            "independentAnchorReadbackDigest",
            "independentOffDigest",
            "mastersDigest",
            "exceptionCustodyDigest",
            "leaseDisposition",
            "action",
            "ownerId",
            "reviewerId",
            "reviewedAt",
        },
        OWNER_SCHEMA,
        owner_action,
        *keys["owner"],
        *keys["reviewer"],
        now,
        _timestamp(exception["recordedAt"]) if exception else latest_masters,
        "reviewedAt",
    )
    if not _match(
        owner,
        {
            "originalIncidentId": incident,
            "incidentReviewId": export["incidentReviewId"],
            "exportDigest": export_digest,
            "independentAnchorReadbackDigest": _digest(reader),
            "independentOffDigest": _digest(off),
            "mastersDigest": masters_digest,
            "exceptionCustodyDigest": _digest(exception) if exception else None,
            "leaseDisposition": export["leaseDisposition"],
        },
    ):
        return hold("HOLD_QL437_DUAL_OWNER_CLOSURE_OR_EXCEPTION_DECISION_INVALID")
    latest = _prior(
        monitor,
        scope,
        ql432_decision,
        ql433_precheck,
        ql434_readiness,
        ql435_pilot,
        ql436_shutdown,
        incident_journal,
        review_journal,
        precheck_journal,
        readiness_journal,
        pilot_evidence_journal,
        shutdown_journal,
    )
    try:
        reread_pending = closure_journal.read(monitor, incident, "PENDING")
    except ValueError:
        reread_pending = None
    if latest != prior or reread_pending != pending:
        return hold("HOLD_QL437_PROTECTED_CHAIN_OR_PENDING_DRIFT")
    final = closure_journal.claim_once(
        monitor,
        incident,
        "FINAL",
        export_digest,
        _digest(
            {
                "pendingDigest": pending["receiptDigest"],
                "externalAnchorDigest": _digest(anchor),
                "independentReadbackDigest": _digest(reader),
                "hostOffDigest": _digest(host),
                "independentOffDigest": _digest(off),
                "mastersDigest": masters_digest,
                "exceptionCustodyDigest": _digest(exception) if exception else None,
                "ownerDecisionDigest": _digest(owner),
                "leaseDisposition": export["leaseDisposition"],
            }
        ),
    )
    if final is None:
        return hold("HOLD_QL437_FINAL_READBACK_OR_COMMIT_FAILED")
    late = export["exceptionEscalationRequired"]
    return {
        **hold("SIGNED_POST_SHUTDOWN_OFF_CUSTODY_RECONCILED_HOLD"),
        "accepted": True,
        "state": (
            "DURABLE_QL437_EXPIRED_LEASE_EXCEPTION_OPEN_INDEPENDENT_CUSTODY"
            if late
            else "DURABLE_QL437_OWNER_SUPERVISED_INCIDENT_CLOSURE_READBACK"
        ),
        "receiver": "OFF_VERIFIED_HOST_AND_INDEPENDENT_READBACK_FOR_THIS_REVIEW_ONLY",
        "ownerAcceptance": (
            "DUAL_SIGNED_OPEN_LEASE_EXCEPTION_NO_CLOSURE"
            if late
            else "DUAL_SIGNED_ON_TIME_INCIDENT_CLOSURE_READBACK_ONLY"
        ),
        "incidentClosureAuthorized": not late,
        "leaseExceptionOpen": late,
        "leaseDisposition": export["leaseDisposition"],
        "originalIncidentId": incident,
        "incidentReviewId": export["incidentReviewId"],
        "exportId": export_id,
        "anchorChallengeNonce": anchor_nonce,
        "nextCeremonyId": export["nextCeremonyId"],
        "masterCount": 3,
        "pendingReceiptDigest": pending["receiptDigest"],
        "finalReceiptDigest": final["receiptDigest"],
        "externalAnchorDigest": _digest(anchor),
        "independentAnchorReadbackDigest": _digest(reader),
        "independentOffDigest": _digest(off),
        "exceptionCustodyDigest": _digest(exception) if exception else None,
        "permittedNextAction": "FRESH_OWNER_SUPERVISED_CEREMONY_ONLY_NO_AUTOMATIC_REENTRY",
        "connection": "HOLD",
        "activationAuthorized": False,
        "manualReceiverIsolationRequired": True,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }


def reconcile_master_evidence328(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Authenticated source-only status, never live external anchor or OFF proof."""
    return {
        **reconcile_master_evidence327(monitor),
        "schema": "rosevear.ai-hub.master360-ql437-anchor328.v1",
        "sourceBuild": 328,
        "source327MainAtReconciliation": SOURCE327_MAIN,
        "commsQl437ContractAtReconciliation": COMMS437_MAIN,
        "ql437OriginalQl431To436Custody": "HOLD_NO_PRIVATE_RECEIPT_READBACK",
        "ql437ProtectedExportProposal": "HOLD_NO_ORIGINAL_HOST_EXPORT_SESSION",
        "ql437OneUsePending": "HOLD_NO_DURABLE_ONE_USE_PENDING",
        "ql437ExternalAnchor": "HOLD_NO_SIGNED_IMMUTABLE_EXTERNAL_ANCHOR",
        "ql437IndependentAnchorReader": "HOLD_NO_DISTINCT_PINNED_ANCHOR_READER",
        "ql437OriginalHostFreshOff": "HOLD_NO_FRESH_ORIGINAL_HOST_SIGNED_OFF",
        "ql437IndependentReceiverFreshOff": "HOLD_NO_SEPARATELY_SIGNED_RECEIVER_OFF",
        "ql437ThreeMasterContinuity": "HOLD_NO_THREE_MASTER_SIGNED_CONTINUITY",
        "ql437ExpiredLeaseException": "HOLD_NO_INDEPENDENT_EXCEPTION_CUSTODY",
        "ql437DualOwnerDecision": "HOLD_NO_DUAL_OWNER_CLOSURE_OR_EXCEPTION_REVIEW",
        "ql437OneUseFinal": "HOLD_NO_DURABLE_FINAL_RECEIPT",
        "ql437LiveOff": "UNKNOWN_NO_FRESH_ORIGINAL_HOST_RUNTIME_READBACK",
        "receiver": "UNKNOWN_PENDING_INDEPENDENT_OFF_REVALIDATION",
        "connection": "HOLD",
        "activationAuthorized": False,
        "ownerAcceptance": "HOLD",
        "masterSync": "HOLD",
        "runtimeUptime": "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING",
    }
