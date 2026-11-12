"""Build 324 — protected QL-433 non-activating new-ceremony custody precheck.

Only original-host private code with independently attested signer pins and
adapters may call this module. No receiver controls, browser proof intake,
credentials, scheduled tasks, or universal CONNECTED transition.
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
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _id, _native, _recent
from rosevear_ai_hub.master_shell_acceptance321 import ProtectedPilotJournal321, _dual
from rosevear_ai_hub.master_shell_acceptance322 import (
    ProtectedContinuityJournal322,
    _accepted,
)
from rosevear_ai_hub.master_shell_acceptance323 import (
    ProtectedRecoveryReviewJournal323,
    _pins,
    reconcile_master_evidence323,
)
from rosevear_ai_hub.master_shell_acceptance316 import CONTROLLER380_MAIN
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE323_MAIN = "99a6eba7d60373328d5e29f869082172c895e93a"
COMMS433_MAIN = "6926d83b8984ee5b46e568f39cb41ac8db7274bc"
PRECHECK_ACTION = "PRECHECK_NEW_OWNER_SUPERVISED_QL429_QL430_ONLY_KEEP_RECEIVER_OFF"
OWNER_ACTION = "AUTHORIZE_NEW_CEREMONY_PRECHECK_ONLY_RECEIVER_OFF_NO_ACTIVATION"
EXPORT = "rosevear.ai-hub.ql433.recovery-decision-export.v1"
ANCHOR = "rosevear.ai-hub.ql433.external-decision-anchor.v1"
READER = "rosevear.ai-hub.ql433.independent-decision-anchor-readback.v1"
HOST = "rosevear.ai-hub.ql433.original-host-reentry-off.v1"
RECEIVER = "rosevear.ai-hub.ql433.independent-reentry-off.v1"
MASTER = "rosevear.ai-hub.ql433.master-new-ceremony-precheck.v1"
OWNER = "rosevear.ai-hub.ql433.owner-new-ceremony-precheck.v1"


class ProtectedNewCeremonyJournal324:
    """Original-host one-use SQLite FULL-sync receipt, not an external anchor."""

    def __init__(self, path: Path):
        self.path = path

    @staticmethod
    def _read(db: sqlite3.Connection, incident_id: str):
        row = db.execute(
            "SELECT export_digest, evidence_digest, receipt_digest "
            "FROM new_ceremony324 WHERE incident_id=?",
            (incident_id,),
        ).fetchone()
        if row is None:
            return None
        export_digest, evidence_digest, receipt_digest = row
        if not all(_sha(x) for x in row):
            raise ValueError("QL433_PRECHECK_RECEIPT_INVALID")
        expected = _digest(
            {
                "incidentId": incident_id,
                "exportDigest": export_digest,
                "evidenceDigest": evidence_digest,
            }
        )
        if expected != receipt_digest:
            raise ValueError("QL433_PRECHECK_RECEIPT_TAMPERED")
        return {
            "exportDigest": export_digest,
            "evidenceDigest": evidence_digest,
            "receiptDigest": receipt_digest,
        }

    def read(self, monitor: PersistentReeMonitor304, incident_id: str):
        if not (_on_ree(monitor) and _id(incident_id) and self.path.is_file()):
            return None
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                return self._read(db, incident_id)
        except (OSError, sqlite3.Error, ValueError, TypeError):
            raise ValueError("QL433_PRECHECK_RECEIPT_UNREADABLE") from None

    def claim_once(
        self,
        monitor: PersistentReeMonitor304,
        incident_id: str,
        export_digest: str,
        evidence_digest: str,
    ):
        if not (
            _on_ree(monitor)
            and _id(incident_id)
            and _sha(export_digest)
            and _sha(evidence_digest)
        ):
            return None
        receipt_digest = _digest(
            {
                "incidentId": incident_id,
                "exportDigest": export_digest,
                "evidenceDigest": evidence_digest,
            }
        )
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    "CREATE TABLE IF NOT EXISTS new_ceremony324 ("
                    "incident_id TEXT PRIMARY KEY, export_digest TEXT NOT NULL,"
                    "evidence_digest TEXT NOT NULL, receipt_digest TEXT NOT NULL)"
                )
                if self._read(db, incident_id) is not None:
                    return None
                db.execute(
                    "INSERT INTO new_ceremony324 VALUES (?,?,?,?)",
                    (incident_id, export_digest, evidence_digest, receipt_digest),
                )
            saved = self.read(monitor, incident_id)
            return saved if saved and saved["receiptDigest"] == receipt_digest else None
        except (OSError, sqlite3.Error, ValueError, TypeError):
            return None


def _signed(
    envelope: Any,
    fields: set[str],
    schema: str,
    key: tuple[bytes, str],
    now: int,
    not_before: int,
    timestamp_field: str,
):
    p = _native(envelope, {"schema", *fields}, schema, *key)
    checked = _recent(p.get(timestamp_field), now) if p else None
    return p if checked is not None and checked >= not_before else None


def _match(p: Any, expected: dict[str, Any]) -> bool:
    return isinstance(p, dict) and all(p.get(k) == v for k, v in expected.items())


def _ql432_decision_ok(decision: Any, receipt: Any, checkpoint: Any) -> bool:
    return (
        isinstance(decision, dict)
        and decision.get("accepted") is True
        and decision.get("state") == "DURABLE_QL432_EXTERNAL_ANCHOR_RECOVERY_OWNER_REVIEW"
        and decision.get("connection") == "HOLD"
        and decision.get("receiver") == "OFF_VERIFIED_SIGNED_READBACK"
        and decision.get("ownerAcceptance") == "DUAL_SIGNED_NEW_CEREMONY_REVIEW_ONLY"
        and decision.get("slaveGate") == "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
        and _id(decision.get("incidentId"))
        and all(
            _sha(decision.get(k))
            for k in (
                "exportDigest",
                "externalAnchorDigest",
                "externalReadbackDigest",
                "reviewReceiptDigest",
            )
        )
        and isinstance(receipt, dict)
        and receipt.get("receiptDigest") == decision["reviewReceiptDigest"]
        and receipt.get("exportDigest") == decision["exportDigest"]
        and checkpoint
        and checkpoint["index"] >= 3
        and checkpoint["entry"]["kind"] == "RECONCILED"
        and checkpoint["entry"]["incidentId"] == decision["incidentId"]
        and _sha(checkpoint["recordDigest"])
    )


def run_ql433_new_ceremony_precheck324(
    monitor: PersistentReeMonitor304,
    pilot_acceptance: Any,
    ql432_decision: Any,
    export_id: str,
    challenge_nonce: str,
    next_ceremony_id: str,
    next_episode_id: str,
    master_reports: Any,
    owner_review: Any,
    *,
    pilot_journal: ProtectedPilotJournal321,
    incident_journal: ProtectedContinuityJournal322,
    review_journal: ProtectedRecoveryReviewJournal323,
    precheck_journal: ProtectedNewCeremonyJournal324,
    keys: dict[str, tuple[bytes, str]],
    read_external_decision_anchor: Callable[..., Any] | None,
    read_original_host_off: Callable[..., Any] | None,
    read_independent_receiver_off: Callable[..., Any] | None,
    attest_operator: Callable[..., bool] | None,
    attest_signed_ql432_decision: Callable[..., bool] | None,
    attest_next_scope: Callable[..., bool] | None,
    attest_fresh_nonce: Callable[..., bool] | None,
    attest_external_custody: Callable[..., bool] | None,
    attest_owner_custody: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, Any]:
    """One protected review of a NEW isolated ceremony; never a receiver operation."""

    def hold(reason: str) -> dict[str, Any]:
        return {
            **_hold(reason),
            "receiver": "OFF_PENDING_INDEPENDENT_REVALIDATION",
            "connection": "HOLD",
        }

    now = int(time.time() * 1000) if now_ms is None else now_ms
    scope = _accepted(monitor, pilot_acceptance, pilot_journal)
    new_ids = (export_id, challenge_nonce, next_ceremony_id, next_episode_id)
    if not (
        scope
        and type(now) is int
        and all(_id(v) for v in new_ids)
        and len(set(new_ids)) == 4
        and next_ceremony_id not in (scope["ceremonyId"], scope["episodeId"])
        and next_episode_id not in (scope["ceremonyId"], scope["episodeId"])
        and isinstance(incident_journal, ProtectedContinuityJournal322)
        and isinstance(review_journal, ProtectedRecoveryReviewJournal323)
        and isinstance(precheck_journal, ProtectedNewCeremonyJournal324)
        and _pins(keys)
        and all(
            callable(x)
            for x in (
                read_external_decision_anchor,
                read_original_host_off,
                read_independent_receiver_off,
            )
        )
    ):
        return hold("HOLD_QL433_NEW_CEREMONY_OR_PRIVATE_SIGNER_AUTHORITY_MISSING")
    try:
        checkpoint = incident_journal.read(monitor, scope)
        if not checkpoint:
            return hold("HOLD_QL433_ORIGINAL_INCIDENT_CHECKPOINT_MISSING")
        receipt = review_journal.read(monitor, checkpoint["entry"]["incidentId"])
        previously_approved = precheck_journal.read(
            monitor, checkpoint["entry"]["incidentId"]
        )
    except (ValueError, KeyError):
        return hold("HOLD_QL433_PRIOR_OR_LOCAL_CUSTODY_UNREADABLE")
    if not _ql432_decision_ok(ql432_decision, receipt, checkpoint):
        return hold("HOLD_QL433_QL432_REVIEW_OR_RECONCILED_OFF_INVALID")
    if previously_approved is not None:
        return hold("HOLD_QL433_INCIDENT_PRECHECK_ALREADY_USED")
    incident_id = ql432_decision["incidentId"]
    export = {
        "schema": EXPORT,
        "scope": scope,
        "incidentId": incident_id,
        "ql431CheckpointIndex": checkpoint["index"],
        "ql431CheckpointDigest": checkpoint["recordDigest"],
        "ql432OwnerReviewReceiptDigest": receipt["receiptDigest"],
        "ql432ExternalAnchorDigest": ql432_decision["externalAnchorDigest"],
        "ql432IndependentReadbackDigest": ql432_decision["externalReadbackDigest"],
        "exportId": export_id,
        "challengeNonce": challenge_nonce,
        "nextCeremonyId": next_ceremony_id,
        "nextEpisodeId": next_episode_id,
        "nextSourceRevision": SOURCE323_MAIN,
        "nextControllerRevision": CONTROLLER380_MAIN,
        "nextHostId": "DESKTOP-AE894KC",
        "action": PRECHECK_ACTION,
        "preparedAt": _utc(now),
    }
    export_digest = _digest(export)
    evidence = {
        "host": "DESKTOP-AE894KC",
        "incident_id": incident_id,
        "checkpoint_digest": checkpoint["recordDigest"],
        "ql432_review_receipt_digest": receipt["receiptDigest"],
        "export_digest": export_digest,
        "challenge_nonce": challenge_nonce,
        "next_ceremony_id": next_ceremony_id,
        "next_episode_id": next_episode_id,
        "next_source_revision": SOURCE323_MAIN,
        "next_controller_revision": CONTROLLER380_MAIN,
    }
    if not all(
        (
            _callback(attest_operator, **evidence),
            _callback(attest_signed_ql432_decision, **evidence),
            _callback(attest_next_scope, **evidence),
            _callback(attest_fresh_nonce, **evidence),
            _callback(attest_external_custody, **evidence),
            _callback(attest_owner_custody, **evidence),
        )
    ):
        return hold("HOLD_QL433_INDEPENDENT_SIGNED_PRIOR_OR_NEW_SCOPE_NOT_VERIFIED")
    try:
        external = read_external_decision_anchor(
            export_record=export, export_digest=export_digest
        )
    except Exception:
        return hold("HOLD_QL433_REAL_EXTERNAL_DECISION_ANCHOR_UNAVAILABLE")
    if not isinstance(external, dict) or set(external) != {"anchor", "reader"}:
        return hold("HOLD_QL433_DISTINCT_EXTERNAL_ANCHOR_AND_READER_REQUIRED")
    a = _signed(
        external["anchor"],
        {
            "exportId",
            "challengeNonce",
            "exportDigest",
            "ql431CheckpointDigest",
            "ql432OwnerReviewReceiptDigest",
            "nextCeremonyId",
            "nextEpisodeId",
            "status",
            "anchoredAt",
        },
        ANCHOR,
        keys["anchor"],
        now,
        now - 60_000,
        "anchoredAt",
    )
    if not _match(
        a,
        {
            "exportId": export_id,
            "challengeNonce": challenge_nonce,
            "exportDigest": export_digest,
            "ql431CheckpointDigest": checkpoint["recordDigest"],
            "ql432OwnerReviewReceiptDigest": receipt["receiptDigest"],
            "nextCeremonyId": next_ceremony_id,
            "nextEpisodeId": next_episode_id,
            "status": "EXTERNAL_IMMUTABLE_DECISION_EXPORT_ANCHORED",
        },
    ):
        return hold("HOLD_QL433_EXTERNAL_SIGNED_DECISION_ANCHOR_INVALID")
    r = _signed(
        external["reader"],
        {
            "exportId",
            "challengeNonce",
            "exportDigest",
            "anchorDigest",
            "status",
            "readAt",
        },
        READER,
        keys["reader"],
        now,
        _timestamp(a["anchoredAt"]),
        "readAt",
    )
    if not _match(
        r,
        {
            "exportId": export_id,
            "challengeNonce": challenge_nonce,
            "exportDigest": export_digest,
            "anchorDigest": _digest(a),
            "status": "INDEPENDENT_EXACT_DECISION_EXPORT_READBACK",
        },
    ):
        return hold("HOLD_QL433_INDEPENDENT_SIGNED_DECISION_READER_INVALID")
    try:
        host_envelope = read_original_host_off(
            export_record=export, external_readback_digest=_digest(r)
        )
    except Exception:
        return hold("HOLD_QL433_ORIGINAL_HOST_OFF_UNAVAILABLE")
    h = _signed(
        host_envelope,
        {
            "scope",
            "incidentId",
            "exportId",
            "challengeNonce",
            "nextCeremonyId",
            "nextEpisodeId",
            "externalDecisionAnchorDigest",
            "independentReadbackDigest",
            "hostMachineId",
            "receiverState",
            "observedAt",
        },
        HOST,
        keys["host"],
        now,
        _timestamp(r["readAt"]),
        "observedAt",
    )
    if not _match(
        h,
        {
            "scope": scope,
            "incidentId": incident_id,
            "exportId": export_id,
            "challengeNonce": challenge_nonce,
            "nextCeremonyId": next_ceremony_id,
            "nextEpisodeId": next_episode_id,
            "externalDecisionAnchorDigest": _digest(a),
            "independentReadbackDigest": _digest(r),
            "hostMachineId": "DESKTOP-AE894KC",
            "receiverState": "OFF",
        },
    ):
        return hold("HOLD_QL433_SIGNED_ORIGINAL_HOST_OFF_INVALID")
    try:
        off_envelope = read_independent_receiver_off(
            export_record=export,
            host_evidence_digest=_digest(h),
            external_readback_digest=_digest(r),
        )
    except Exception:
        return hold("HOLD_QL433_INDEPENDENT_RECEIVER_OFF_UNAVAILABLE")
    off = _signed(
        off_envelope,
        {
            "scope",
            "incidentId",
            "exportId",
            "challengeNonce",
            "hostEvidenceDigest",
            "decisionReadbackDigest",
            "receiverState",
            "observedAt",
        },
        RECEIVER,
        keys["receiver"],
        now,
        _timestamp(h["observedAt"]),
        "observedAt",
    )
    if not _match(
        off,
        {
            "scope": scope,
            "incidentId": incident_id,
            "exportId": export_id,
            "challengeNonce": challenge_nonce,
            "hostEvidenceDigest": _digest(h),
            "decisionReadbackDigest": _digest(r),
            "receiverState": "OFF",
        },
    ):
        return hold("HOLD_QL433_SEPARATE_SIGNED_RECEIVER_OFF_INVALID")
    if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
        return hold("HOLD_QL433_THREE_INDEPENDENT_MASTER_REPORTS_REQUIRED")
    master_bodies = []
    for master in MASTERS:
        p = _signed(
            master_reports[master],
            {
                "masterId",
                "scope",
                "incidentId",
                "ql432OwnerReviewReceiptDigest",
                "externalDecisionReadbackDigest",
                "receiverOffDigest",
                "nextCeremonyId",
                "nextEpisodeId",
                "status",
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
                "scope": scope,
                "incidentId": incident_id,
                "ql432OwnerReviewReceiptDigest": receipt["receiptDigest"],
                "externalDecisionReadbackDigest": _digest(r),
                "receiverOffDigest": _digest(off),
                "nextCeremonyId": next_ceremony_id,
                "nextEpisodeId": next_episode_id,
                "status": "NEW_CEREMONY_PRECHECK_ONLY_RECEIVER_OFF",
            },
        ):
            return hold("HOLD_QL433_SIGNED_MASTER_NEW_CEREMONY_PRECHECK_INVALID")
        master_bodies.append(p)
    ordered_digest = _digest(master_bodies)
    o = _dual(
        owner_review,
        {
            "schema",
            "scope",
            "incidentId",
            "exportId",
            "challengeNonce",
            "ql432OwnerReviewReceiptDigest",
            "externalDecisionReadbackDigest",
            "receiverOffDigest",
            "mastersDigest",
            "nextCeremonyId",
            "nextEpisodeId",
            "action",
            "ownerId",
            "reviewerId",
            "authorizedAt",
        },
        OWNER,
        OWNER_ACTION,
        *keys["owner"],
        *keys["reviewer"],
        now,
        max(_timestamp(p["observedAt"]) for p in master_bodies),
        "authorizedAt",
    )
    if not _match(
        o,
        {
            "scope": scope,
            "incidentId": incident_id,
            "exportId": export_id,
            "challengeNonce": challenge_nonce,
            "ql432OwnerReviewReceiptDigest": receipt["receiptDigest"],
            "externalDecisionReadbackDigest": _digest(r),
            "receiverOffDigest": _digest(off),
            "mastersDigest": ordered_digest,
            "nextCeremonyId": next_ceremony_id,
            "nextEpisodeId": next_episode_id,
        },
    ):
        return hold("HOLD_QL433_DUAL_SIGNED_OWNER_PRECHECK_ONLY_INVALID")
    try:
        current = incident_journal.read(monitor, scope)
        current_review = review_journal.read(monitor, incident_id)
    except ValueError:
        return hold("HOLD_QL433_CUSTODY_DRIFT_AFTER_EXTERNAL_READBACK")
    if current != checkpoint or current_review != receipt:
        return hold("HOLD_QL433_CUSTODY_CHANGED_DURING_EXTERNAL_READBACK")
    evidence_digest = _digest(
        {
            "anchorDigest": _digest(a),
            "readerDigest": _digest(r),
            "hostOffDigest": _digest(h),
            "receiverOffDigest": _digest(off),
            "mastersDigest": ordered_digest,
            "ownerDigest": _digest(o),
        }
    )
    saved = precheck_journal.claim_once(monitor, incident_id, export_digest, evidence_digest)
    if saved is None:
        return hold("HOLD_QL433_PRECHECK_RECEIPT_REPLAY_OR_UNDURABLE")
    return {
        **hold("QL433_NEW_CEREMONY_PRECHECK_ONLY_KEEP_RECEIVER_OFF"),
        "accepted": True,
        "state": "DURABLE_QL433_NEW_CEREMONY_PRECHECK_ONLY",
        "receiver": "OFF_VERIFIED_SIGNED_READBACK",
        "ownerAcceptance": "DUAL_SIGNED_NEW_CEREMONY_PRECHECK_ONLY",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "nextStep": "NEW_QL429_QL430_OWNER_SUPERVISED_CEREMONY_ONLY",
        "incidentId": incident_id,
        "nextCeremonyId": next_ceremony_id,
        "nextEpisodeId": next_episode_id,
        "exportDigest": export_digest,
        "externalAnchorDigest": _digest(a),
        "independentReadbackDigest": _digest(r),
        "precheckReceiptDigest": saved["receiptDigest"],
        "connection": "HOLD",
    }


def reconcile_master_evidence324(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """No live original-host evidence is inferred from a GitHub release."""
    return {
        **reconcile_master_evidence323(monitor),
        "schema": "rosevear.ai-hub.master360-ql433-new-ceremony324.v1",
        "sourceBuild": 324,
        "source323MainAtReconciliation": SOURCE323_MAIN,
        "commsQl433ContractAtReconciliation": COMMS433_MAIN,
        "ql433QL432ProtectedOwnerReceipt": "HOLD_NO_INDEPENDENT_QL432_DECISION_READBACK",
        "ql433ReconciledOffCheckpoint": "HOLD_NO_ORIGINAL_HOST_QL431_TERMINAL_READBACK",
        "ql433NewCeremonyScope": "HOLD_NO_FRESH_SUPERVISED_NEW_CEREMONY",
        "ql433ExternalDecisionAnchor": "HOLD_NO_INDEPENDENT_DECISION_EXPORT_ANCHOR",
        "ql433IndependentAnchorReader": "HOLD_NO_DISTINCT_SIGNED_EXPORT_READBACK",
        "ql433OriginalHostOff": "HOLD_NO_FRESH_ORIGINAL_HOST_SIGNED_OFF",
        "ql433IndependentReceiverOff": "HOLD_NO_FRESH_SIGNED_RECEIVER_OFF",
        "ql433ThreeMasterPrecheck": "HOLD_NO_THREE_SIGNED_NEW_CEREMONY_REPORTS",
        "ql433DualOwnerPrecheck": "HOLD_NO_DUAL_SIGNED_PRECHECK_ONLY_CONSENT",
        "ql433DurableOneUsePrecheck": "HOLD_NO_PRIVATE_ONE_USE_PRECHECK_RECEIPT",
        "receiver": "OFF",
        "connection": "HOLD",
        "ownerAcceptance": "HOLD",
        "masterSync": "HOLD",
        "runtimeUptime": "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING",
    }
