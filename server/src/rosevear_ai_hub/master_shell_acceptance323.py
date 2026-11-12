"""Build 323: protected QL-432 independent incident anchor / new-ceremony review.

A successful result is only an OFF/HOLD *review* of a future, new QL-429/430
ceremony. No browser input, background schedule, receiver activation or keys.
"""

import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import _timestamp, _utc
from rosevear_ai_hub.master_shell_acceptance308 import _hold, _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS, _callback
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _id
from rosevear_ai_hub.master_shell_acceptance321 import ProtectedPilotJournal321, _dual
from rosevear_ai_hub.master_shell_acceptance322 import (
    ProtectedContinuityJournal322,
    _accepted,
    _recent_signed,
    reconcile_master_evidence322,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE322_MAIN = "b5a7ced1751d99c3a3e4d23e416bb0700588da02"
COMMS432_MAIN = "f28f14f67d3ecd5fad9972d6f0500c14de0f89b7"
ACTION = "ACKNOWLEDGE_RECOVERY_ONLY_NEW_ISOLATED_CEREMONY_REQUIRED_KEEP_OFF"
ANCHOR = "rosevear.ai-hub.ql432.external-incident-anchor.v1"
READER = "rosevear.ai-hub.ql432.independent-anchor-readback.v1"
HOST = "rosevear.ai-hub.ql432.original-host-off-readback.v1"
RECEIVER = "rosevear.ai-hub.ql432.independent-receiver-off.v1"
MASTER = "rosevear.ai-hub.ql432.master-recovery-disposition.v1"
OWNER = "rosevear.ai-hub.ql432.owner-recovery-review.v1"


class ProtectedRecoveryReviewJournal323:
    """Original-host-only one-use review receipt; NOT an off-host anchor."""

    def __init__(self, path: Path):
        self.path = path

    @staticmethod
    def _read(db: sqlite3.Connection, incident_id: str) -> dict[str, str] | None:
        row = db.execute(
            "SELECT export_digest, decision_digest, receipt_digest "
            "FROM recovery_review323 WHERE incident_id=?", (incident_id,)
        ).fetchone()
        if row is None:
            return None
        e, d, receipt = row
        if not all(isinstance(x, str) and len(x) == 64 for x in row):
            raise ValueError("QL432_REVIEW_CUSTODY_CORRUPT")
        if _digest({"incidentId": incident_id, "exportDigest": e, "decisionDigest": d}) != receipt:
            raise ValueError("QL432_REVIEW_CUSTODY_TAMPERED")
        return {"exportDigest": e, "decisionDigest": d, "receiptDigest": receipt}

    def read(self, monitor: PersistentReeMonitor304, incident_id: str):
        if not (_on_ree(monitor) and _id(incident_id) and self.path.is_file()):
            return None
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                return self._read(db, incident_id)
        except (OSError, sqlite3.Error, ValueError, TypeError):
            raise ValueError("QL432_REVIEW_CUSTODY_UNREADABLE") from None

    def claim_once(
        self, monitor: PersistentReeMonitor304, incident_id: str, export_digest: str,
        decision_digest: str,
    ):
        if not (
            _on_ree(monitor) and _id(incident_id)
            and isinstance(export_digest, str) and len(export_digest) == 64
            and isinstance(decision_digest, str) and len(decision_digest) == 64
        ):
            return None
        receipt = _digest({
            "incidentId": incident_id,
            "exportDigest": export_digest,
            "decisionDigest": decision_digest,
        })
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    "CREATE TABLE IF NOT EXISTS recovery_review323 ("
                    "incident_id TEXT PRIMARY KEY, export_digest TEXT NOT NULL,"
                    "decision_digest TEXT NOT NULL, receipt_digest TEXT NOT NULL)"
                )
                if self._read(db, incident_id) is not None:
                    return None
                db.execute(
                    "INSERT INTO recovery_review323 VALUES (?,?,?,?)",
                    (incident_id, export_digest, decision_digest, receipt),
                )
            saved = self.read(monitor, incident_id)
            return saved if saved and saved["receiptDigest"] == receipt else None
        except (OSError, sqlite3.Error, ValueError, TypeError):
            return None


def _pins(keys: Any) -> bool:
    roles = ("anchor", "reader", "host", "receiver", "owner", "reviewer", *MASTERS)
    return (
        isinstance(keys, dict) and set(keys) == set(roles)
        and all(
            isinstance(keys[k], tuple) and len(keys[k]) == 2
            and _public_ed25519(*keys[k])
            for k in roles
        )
        and len({keys[k][1] for k in roles}) == len(roles)
    )


def _check(
    envelope: Any, fields: set[str], schema: str, key: tuple[bytes, str],
    now: int, earliest: int,
):
    return _recent_signed(envelope, {"schema", *fields}, schema, *key, now, earliest)


def _require(p: Any, expected: dict[str, Any]) -> bool:
    return isinstance(p, dict) and all(p.get(k) == v for k, v in expected.items())


def review_ql432_recovery323(
    monitor: PersistentReeMonitor304,
    pilot_acceptance: Any,
    anchor_id: str,
    challenge_nonce: str,
    master_reports: Any,
    owner_review: Any,
    *,
    pilot_journal: ProtectedPilotJournal321,
    incident_journal: ProtectedContinuityJournal322,
    review_journal: ProtectedRecoveryReviewJournal323,
    keys: dict[str, tuple[bytes, str]],
    read_external_anchor: Callable[..., Any] | None,
    read_original_host_off: Callable[..., Any] | None,
    read_independent_receiver_off: Callable[..., Any] | None,
    attest_operator: Callable[..., bool] | None,
    attest_fresh_nonce: Callable[..., bool] | None,
    attest_external_custody: Callable[..., bool] | None,
    attest_owner_custody: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, Any]:
    """A single, original-host supervised readback; never reactivates a receiver."""
    def hold(reason: str) -> dict[str, Any]:
        return {
            **_hold(reason),
            "receiver": "OFF_PENDING_INDEPENDENT_REVALIDATION",
            "connection": "HOLD",
        }
    now = int(time.time() * 1000) if now_ms is None else now_ms
    scope = _accepted(monitor, pilot_acceptance, pilot_journal)
    if not (
        scope and type(now) is int and _id(anchor_id) and _id(challenge_nonce)
        and anchor_id != challenge_nonce
        and isinstance(incident_journal, ProtectedContinuityJournal322)
        and isinstance(review_journal, ProtectedRecoveryReviewJournal323)
        and _pins(keys)
        and all(callable(x) for x in (
            read_external_anchor, read_original_host_off, read_independent_receiver_off
        ))
    ):
        return hold("HOLD_QL432_ORIGINAL_HOST_SIGNER_OR_PILOT_AUTHORITY_MISSING")
    try:
        checkpoint = incident_journal.read(monitor, scope)
    except ValueError:
        return hold("HOLD_QL432_QL431_CUSTODY_TAMPERED")
    if not (
        checkpoint and checkpoint["index"] >= 3
        and checkpoint["entry"]["kind"] == "RECONCILED"
        and checkpoint["entry"]["ql430AcceptedDigest"] == pilot_acceptance["acceptedDigest"]
        and all(
            checkpoint["entry"].get(k)
            for k in (
                "incidentId", "receiverOffDigest", "shutdownAckDigest",
                "reportsDigest", "ownerDecisionDigest"
            )
        )
    ):
        return hold("HOLD_QL432_RECONCILED_SIGNED_OFF_CHECKPOINT_REQUIRED")
    entry = checkpoint["entry"]
    incident = entry["incidentId"]
    export = {
        "schema": "rosevear.ai-hub.ql432.incident-export.v1",
        "scope": scope,
        "ql430AcceptedDigest": pilot_acceptance["acceptedDigest"],
        "incidentId": incident,
        "checkpointIndex": checkpoint["index"],
        "checkpointDigest": checkpoint["recordDigest"],
        "receiverOffDigest": entry["receiverOffDigest"],
        "anchorId": anchor_id,
        "challengeNonce": challenge_nonce,
        "preparedAt": _utc(now),
    }
    exported = _digest(export)
    evidence = {
        "ceremony_id": scope["ceremonyId"],
        "incident_id": incident, "checkpoint_digest": checkpoint["recordDigest"],
        "anchor_id": anchor_id, "challenge_nonce": challenge_nonce,
        "host": "DESKTOP-AE894KC",
    }
    if not all((
        _callback(attest_operator, **evidence),
        _callback(attest_fresh_nonce, **evidence),
        _callback(attest_external_custody, **evidence),
        _callback(attest_owner_custody, **evidence),
    )):
        return hold("HOLD_QL432_INDEPENDENT_PRIVATE_CUSTODY_UNVERIFIED")
    try:
        if review_journal.read(monitor, incident) is not None:
            return hold("HOLD_QL432_ONE_USE_INCIDENT_REVIEW_REPLAY")
    except ValueError:
        return hold("HOLD_QL432_REVIEW_RECEIPT_TAMPERED")
    try:
        external = read_external_anchor(export_record=export, export_digest=exported)
    except Exception:
        return hold("HOLD_QL432_EXTERNAL_ANCHOR_SERVICE_UNAVAILABLE")
    if not (isinstance(external, dict) and set(external) == {"anchor", "reader"}):
        return hold("HOLD_QL432_INDEPENDENT_EXTERNAL_READBACK_MISSING")
    a = _check(external["anchor"], {
        "anchorId", "challengeNonce", "exportDigest", "scope", "incidentId",
        "checkpointIndex", "checkpointDigest", "receiverOffDigest",
        "status", "anchoredAt",
    }, ANCHOR, keys["anchor"], now, now - 60_000)
    if not _require(a, {
        "anchorId": anchor_id, "challengeNonce": challenge_nonce,
        "exportDigest": exported, "scope": scope, "incidentId": incident,
        "checkpointIndex": checkpoint["index"],
        "checkpointDigest": checkpoint["recordDigest"],
        "receiverOffDigest": entry["receiverOffDigest"],
        "status": "EXTERNALLY_ANCHORED_IMMUTABLE_CHECKPOINT",
    }):
        return hold("HOLD_QL432_EXTERNAL_ANCHOR_SIGNATURE_OR_SCOPE_REJECTED")
    r = _check(external["reader"], {
        "anchorId", "challengeNonce", "exportDigest", "anchorDigest",
        "checkpointDigest", "status", "readAt",
    }, READER, keys["reader"], now, _timestamp(a["anchoredAt"]))
    if not _require(r, {
        "anchorId": anchor_id, "challengeNonce": challenge_nonce,
        "exportDigest": exported, "anchorDigest": _digest(a),
        "checkpointDigest": checkpoint["recordDigest"],
        "status": "INDEPENDENT_EXTERNAL_CHECKPOINT_READBACK_MATCHED",
    }):
        return hold("HOLD_QL432_INDEPENDENT_ANCHOR_READER_REJECTED")
    try:
        host_env = read_original_host_off(
            export_record=export, external_readback_digest=_digest(r)
        )
    except Exception:
        return hold("HOLD_QL432_ORIGINAL_HOST_OFF_UNAVAILABLE")
    h = _check(host_env, {
        "scope", "incidentId", "challengeNonce", "readbackDigest",
        "hostMachineId", "receiverState", "observedAt",
    }, HOST, keys["host"], now, _timestamp(r["readAt"]))
    if not _require(h, {
        "scope": scope, "incidentId": incident, "challengeNonce": challenge_nonce,
        "readbackDigest": _digest(r), "hostMachineId": "DESKTOP-AE894KC",
        "receiverState": "OFF",
    }):
        return hold("HOLD_QL432_SIGNED_ORIGINAL_HOST_OFF_REJECTED")
    try:
        receiver_env = read_independent_receiver_off(
            export_record=export, host_evidence_digest=_digest(h),
            external_readback_digest=_digest(r)
        )
    except Exception:
        return hold("HOLD_QL432_INDEPENDENT_RECEIVER_OFF_UNAVAILABLE")
    receiver = _check(receiver_env, {
        "scope", "incidentId", "challengeNonce", "hostEvidenceDigest",
        "readbackDigest", "receiverState", "observedAt",
    }, RECEIVER, keys["receiver"], now, _timestamp(h["observedAt"]))
    if not _require(receiver, {
        "scope": scope, "incidentId": incident, "challengeNonce": challenge_nonce,
        "hostEvidenceDigest": _digest(h), "readbackDigest": _digest(r),
        "receiverState": "OFF",
    }):
        return hold("HOLD_QL432_SIGNED_INDEPENDENT_RECEIVER_OFF_REJECTED")
    if not (isinstance(master_reports, dict) and set(master_reports) == set(MASTERS)):
        return hold("HOLD_QL432_THREE_MASTER_DISPOSITION_REQUIRED")
    reports = []
    for master in MASTERS:
        p = _check(master_reports[master], {
            "masterId", "scope", "incidentId", "checkpointDigest",
            "readbackDigest", "receiverOffDigest", "status", "observedAt",
        }, MASTER, keys[master], now, _timestamp(receiver["observedAt"]))
        if not _require(p, {
            "masterId": master, "scope": scope, "incidentId": incident,
            "checkpointDigest": checkpoint["recordDigest"],
            "readbackDigest": _digest(r), "receiverOffDigest": _digest(receiver),
            "status": "RECONCILED_OFF_NEW_CEREMONY_REQUIRED",
        }):
            return hold("HOLD_QL432_MASTER_RECOVERY_DISPOSITION_REJECTED")
        reports.append(p)
    owner = _dual(
        owner_review, {
            "schema", "scope", "incidentId", "checkpointDigest",
            "readbackDigest", "receiverOffDigest", "reportsDigest",
            "action", "ownerId", "reviewerId", "reviewedAt",
        }, OWNER, ACTION, *keys["owner"], *keys["reviewer"],
        now, max(_timestamp(p["observedAt"]) for p in reports), "reviewedAt"
    )
    if not _require(owner, {
        "scope": scope, "incidentId": incident,
        "checkpointDigest": checkpoint["recordDigest"],
        "readbackDigest": _digest(r),
        "receiverOffDigest": _digest(receiver),
        "reportsDigest": _digest(reports),
    }):
        return hold("HOLD_QL432_DUAL_SIGNED_OWNER_REVIEW_REJECTED")
    # Reopen after external I/O to reject local changes or chain corruption.
    try:
        reopened = incident_journal.read(monitor, scope)
    except ValueError:
        return hold("HOLD_QL432_POST_READBACK_LOCAL_CUSTODY_TAMPERED")
    if reopened != checkpoint:
        return hold("HOLD_QL432_LOCAL_CHECKPOINT_DRIFT_DURING_READBACK")
    decision_digest = _digest({
        "anchor": _digest(a), "reader": _digest(r),
        "host": _digest(h), "receiver": _digest(receiver),
        "masterReports": _digest(reports), "owner": _digest(owner)
    })
    receipt = review_journal.claim_once(monitor, incident, exported, decision_digest)
    if not receipt:
        return hold("HOLD_QL432_REVIEW_RECEIPT_ALREADY_USED_OR_UNDURABLE")
    return {
        **hold("QL432_OWNER_REVIEW_ONLY_NEW_CEREMONY_KEEP_RECEIVER_OFF"),
        "state": "DURABLE_QL432_EXTERNAL_ANCHOR_RECOVERY_OWNER_REVIEW",
        "accepted": True,
        "receiver": "OFF_VERIFIED_SIGNED_READBACK",
        "incidentId": incident,
        "exportDigest": exported,
        "externalAnchorDigest": _digest(a),
        "externalReadbackDigest": _digest(r),
        "reviewReceiptDigest": receipt["receiptDigest"],
        "ownerAcceptance": "DUAL_SIGNED_NEW_CEREMONY_REVIEW_ONLY",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }


def reconcile_master_evidence323(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Authenticated source-only read-only HOLD; not a runtime proof ingest."""
    return {
        **reconcile_master_evidence322(monitor),
        "schema": "rosevear.ai-hub.master360-ql432-anchor-recovery323.v1",
        "sourceBuild": 323,
        "source322MainAtReconciliation": SOURCE322_MAIN,
        "commsQl432ContractAtReconciliation": COMMS432_MAIN,
        "ql432ReconciledOffIncident": "HOLD_NO_REAL_ORIGINAL_HOST_TERMINAL_RECEIPT",
        "ql432ExternalAnchor": "HOLD_NO_INDEPENDENT_IMMUTABLE_EXTERNAL_PIN",
        "ql432IndependentAnchorReadback": "HOLD_NO_SEPARATE_SIGNED_ANCHOR_READER",
        "ql432OriginalHostRecoveryOff": "HOLD_NO_FRESH_SIGNED_ORIGINAL_HOST_OFF",
        "ql432IndependentReceiverOff": "HOLD_NO_FRESH_SEPARATE_SIGNED_OFF",
        "ql432ThreeMasterDisposition": "HOLD_NO_THREE_SIGNED_RECOVERY_REPORTS",
        "ql432OwnerNewCeremonyReview": "HOLD_NO_DUAL_SIGNED_NEW_CEREMONY_REVIEW",
        "ql432DurableOneUseReview": "HOLD_NO_PROTECTED_ORIGINAL_HOST_ONE_USE_RECEIPT",
        "receiver": "OFF",
        "connection": "HOLD",
        "ownerAcceptance": "HOLD",
        "masterSync": "HOLD",
        "runtimeUptime": "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING",
    }
