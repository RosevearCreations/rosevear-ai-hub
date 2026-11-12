"""Build 311: protected one-TEST export closure and Master discrepancy review.

Only the separately authenticated original Windows host may call privileged
functions. No sender, receiver, Windows task, notification or key enrollment.
"""

import hashlib
import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _timestamp
from rosevear_ai_hub.master_shell_acceptance306 import _trusted_signature
from rosevear_ai_hub.master_shell_acceptance308 import (
    _hold,
    _on_ree,
    _valid_source,
    verify_ql414_receiver_ack308,
)
from rosevear_ai_hub.master_shell_acceptance310 import (
    SOURCE309,
    ProtectedOneTestExportAudit310,
    _corr,
    _episode,
    _sha,
    reconcile_master_evidence310,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE = "rosevear-ai-hub"
HOST = "DESKTOP-AE894KC"
SOURCE310_MAIN = "c090a9f00a82e20b0a799ad99423153d20eea7b4"
CONTROLLER376_MAIN = "b1273edf4b2b38b5ca68371d9b171a1391d6f2f6"
COMMS420_MAIN = "3ef4a087d30b2c1cfc8c6d14256d7fdfd81331a4"
CONTROLLER_SCHEMA311 = "rosevear.ai-data-platform.master360.owner-review311.v1"
ISSUE_CODES = (
    "ORIGINAL_HOST_RELEASE",
    "SIGNED_ONE_TEST_EXPORT",
    "COMMS_SIGNED_ACK",
    "CONTROLLER_OWNER_DECISION",
)
SEVERITIES = {
    "ORIGINAL_HOST_RELEASE": "REVIEW",
    "SIGNED_ONE_TEST_EXPORT": "REVIEW",
    "COMMS_SIGNED_ACK": "CRITICAL",
    "CONTROLLER_OWNER_DECISION": "REVIEW",
}
SLA_MINUTES = {"CRITICAL": 15, "REVIEW": 60}


class ProtectedExportClosureLedger311:
    """Immutable single-episode closure evidence, no payloads or secrets."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def claim(
        self,
        monitor: PersistentReeMonitor304,
        *,
        episode: str,
        correlation: str,
        source_digest: str,
        transport_digest: str,
        receiver_digest: str,
        timeline_digest: str,
    ) -> bool:
        if not (
            _on_ree(monitor)
            and _episode(episode)
            and _corr(correlation)
            and all(
                _sha(value)
                for value in (
                    source_digest,
                    transport_digest,
                    receiver_digest,
                    timeline_digest,
                )
            )
        ):
            return False
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA busy_timeout=2000")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS protected_export_closure311 (
                    episode TEXT PRIMARY KEY,
                    correlation TEXT NOT NULL UNIQUE,
                    source_digest TEXT NOT NULL,
                    transport_digest TEXT NOT NULL,
                    receiver_digest TEXT NOT NULL,
                    timeline_digest TEXT NOT NULL
                    )"""
                )
                result = db.execute(
                    """INSERT OR IGNORE INTO protected_export_closure311
                    VALUES (?, ?, ?, ?, ?, ?)""",
                    (
                        episode,
                        correlation,
                        source_digest,
                        transport_digest,
                        receiver_digest,
                        timeline_digest,
                    ),
                )
                return result.rowcount == 1
        except (OSError, sqlite3.Error):
            return False

    def exact(
        self,
        monitor: PersistentReeMonitor304,
        *,
        episode: str,
        correlation: str,
        source_digest: str,
        transport_digest: str,
        receiver_digest: str,
        timeline_digest: str,
    ) -> bool:
        if not (
            _on_ree(monitor)
            and _episode(episode)
            and _corr(correlation)
            and all(
                _sha(x)
                for x in (
                    source_digest,
                    transport_digest,
                    receiver_digest,
                    timeline_digest,
                )
            )
            and self.path.is_file()
        ):
            return False
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                row = db.execute(
                    """SELECT source_digest,transport_digest,receiver_digest,timeline_digest
                    FROM protected_export_closure311
                    WHERE episode=? AND correlation=?""",
                    (episode, correlation),
                ).fetchone()
                return row == (
                    source_digest,
                    transport_digest,
                    receiver_digest,
                    timeline_digest,
                )
        except (OSError, sqlite3.Error):
            return False


def close_witnessed_export311(
    monitor: PersistentReeMonitor304,
    export: Any,
    source_envelope: Any,
    receiver_ack: Any,
    *,
    export_audit: ProtectedOneTestExportAudit310,
    closure_ledger: ProtectedExportClosureLedger311,
    source_public_der: bytes | None,
    independent_source_pin: str,
    receiver_public_der: bytes | None,
    independent_receiver_pin: str,
    expected_receiver_key_id: str,
    timeline_digest: str,
    independently_attest_comms_timeline: Callable[..., bool] | None,
    source_import_claimed: Callable[..., bool] | None,
    protected_transport_attest: Callable[..., bool] | None,
    owner_authorize: Callable[..., bool] | None,
    reviewer_approve: Callable[..., bool] | None,
    claim_chain: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Close only a genuine source/receiver-signed, independently witnessed export.

    This closes *custody* of the prior Build 310 export. It does not close an
    incident, verify a controller owner decision, or open any connection.
    """
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if (
        type(now) is not int
        or not _on_ree(monitor)
        or not isinstance(export_audit, ProtectedOneTestExportAudit310)
        or not isinstance(closure_ledger, ProtectedExportClosureLedger311)
        or not callable(independently_attest_comms_timeline)
        or not isinstance(export, dict)
        or export.get("accepted") is not True
        or export.get("state") != "EXTERNAL_ONE_TEST_TRANSPORT_WITNESSED_ACK_UNVERIFIED"
        or export.get("sourceRevision") != SOURCE309
        or export.get("connection") != "HOLD"
    ):
        return _hold("HOLD_ORIGINAL_HOST_OR_WITNESSED_EXPORT")
    episode = export.get("episodeId")
    correlation = export.get("correlationId")
    source_digest = export.get("sourcePayloadSha256")
    transport_digest = export.get("transportReceiptSha256")
    if not (
        _episode(episode)
        and _corr(correlation)
        and all(_sha(x) for x in (source_digest, transport_digest, timeline_digest))
        and _valid_source(
            source_envelope,
            now,
            source_public_der,
            independent_source_pin,
            expected_revision=SOURCE309,
        )
        and isinstance(receiver_ack, dict)
        and isinstance(receiver_ack.get("payload"), dict)
        and source_envelope["payload"]["episodeId"] == episode
        and hashlib.sha256(_serialize(source_envelope["payload"])).hexdigest()
        == source_digest
        and export_audit.exact_witness(
            monitor,
            episode=episode,
            correlation=correlation,
            source_digest=source_digest,
            transport_digest=transport_digest,
        )
    ):
        return _hold("HOLD_EXACT_ORIGINAL_SOURCE_EXPORT_REPLAY_PROOF")
    receiver_digest = hashlib.sha256(_serialize(receiver_ack["payload"])).hexdigest()
    args = {
        "source_id": SOURCE,
        "source_revision": SOURCE309,
        "episode_id": episode,
        "correlation_id": correlation,
        "source_digest": source_digest,
        "transport_digest": transport_digest,
        "receiver_digest": receiver_digest,
        "timeline_digest": timeline_digest,
        "comms_revision": COMMS420_MAIN,
    }
    try:
        witnessed = independently_attest_comms_timeline(**args) is True
    except (OSError, ValueError, TypeError):
        witnessed = False
    if not witnessed:
        return _hold("HOLD_INDEPENDENT_QL420_CUSTODY_WITNESS")
    verified = verify_ql414_receiver_ack308(
        monitor,
        source_envelope,
        receiver_ack,
        source_public_der=source_public_der,
        independently_pinned_source_sha256=independent_source_pin,
        receiver_public_der=receiver_public_der,
        independently_pinned_receiver_sha256=independent_receiver_pin,
        expected_receiver_key_id=expected_receiver_key_id,
        correlation_id=correlation,
        source_import_claimed=source_import_claimed,
        protected_transport_attest=protected_transport_attest,
        owner_authorize=owner_authorize,
        independent_reviewer_approve=reviewer_approve,
        claim_chain=claim_chain,
        expected_source_revision=SOURCE309,
        now_ms=now,
    )
    if verified.get("accepted") is not True:
        return _hold("HOLD_INVALID_INDEPENDENT_QL414_RECEIVER_ACK")
    if not closure_ledger.claim(
        monitor,
        episode=episode,
        correlation=correlation,
        source_digest=source_digest,
        transport_digest=transport_digest,
        receiver_digest=receiver_digest,
        timeline_digest=timeline_digest,
    ):
        return _hold("HOLD_DUPLICATE_OR_UNAVAILABLE_PRIVATE_CLOSURE_LEDGER")
    return {
        **_hold("ONE_TEST_EXPORT_CUSTODY_CLOSED_NOT_CONNECTED"),
        "accepted": True,
        "sourceRevision": SOURCE309,
        "episodeId": episode,
        "correlationId": correlation,
        "sourcePayloadSha256": source_digest,
        "transportReceiptSha256": transport_digest,
        "receiverAckSha256": receiver_digest,
        "ql420TimelineSha256": timeline_digest,
        "receiverAckVerified": True,
        "exportCustodyClosed": True,
        "controllerDecisionVerified": False,
    }


def reconcile_controller_contract311(
    monitor: PersistentReeMonitor304,
    closed_export: Any,
    signed_decision: Any,
    *,
    closure_ledger: ProtectedExportClosureLedger311,
    controller_public_der: bytes | None,
    independent_controller_pin: str,
    attest_controller_ledger: Callable[..., bool] | None,
    owner_review_authorize: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Proposed controller contract; verified signature never means CONNECTED."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        type(now) is int
        and _on_ree(monitor)
        and isinstance(closure_ledger, ProtectedExportClosureLedger311)
        and callable(attest_controller_ledger)
        and callable(owner_review_authorize)
        and isinstance(closed_export, dict)
        and closed_export.get("accepted") is True
        and closed_export.get("state") == "ONE_TEST_EXPORT_CUSTODY_CLOSED_NOT_CONNECTED"
        and closed_export.get("receiverAckVerified") is True
        and closed_export.get("connection") == "HOLD"
        and isinstance(signed_decision, dict)
        and set(signed_decision) == {"payload", "signature"}
    ):
        return _hold("HOLD_PRIVATE_CONTROLLER_OR_EXPORT_AUTHORITY")
    body = signed_decision["payload"]
    fields = {
        "schema",
        "controller",
        "controllerRevision",
        "commsRevision",
        "sourceId",
        "sourceProductionRevision",
        "sourceExportRevision",
        "hostId",
        "episodeId",
        "correlationId",
        "sourcePayloadSha256",
        "transportReceiptSha256",
        "receiverAckSha256",
        "ql420TimelineSha256",
        "decision",
        "connection",
        "mastersSynced",
        "decidedAt",
    }
    if not isinstance(body, dict) or set(body) != fields:
        return _hold("HOLD_CONTROLLER311_SCHEMA_CONVERGENCE")
    decided = _timestamp(body["decidedAt"])
    if not (
        body["schema"] == CONTROLLER_SCHEMA311
        and body["controller"] == "ai-data-platform"
        and body["controllerRevision"] == CONTROLLER376_MAIN
        and body["commsRevision"] == COMMS420_MAIN
        and body["sourceId"] == SOURCE
        and body["sourceProductionRevision"] == SOURCE310_MAIN
        and body["sourceExportRevision"] == SOURCE309
        and body["hostId"] == HOST
        and body["episodeId"] == closed_export.get("episodeId")
        and body["correlationId"] == closed_export.get("correlationId")
        and body["sourcePayloadSha256"] == closed_export.get("sourcePayloadSha256")
        and body["transportReceiptSha256"] == closed_export.get("transportReceiptSha256")
        and body["receiverAckSha256"] == closed_export.get("receiverAckSha256")
        and body["ql420TimelineSha256"] == closed_export.get("ql420TimelineSha256")
        and body["decision"] in ("HOLD", "OWNER_REVIEWED_NO_ACTIVATION")
        and body["connection"] == "HOLD"
        and body["mastersSynced"] is False
        and decided is not None
        and 0 <= now - decided <= 300_000
    ):
        return _hold("HOLD_CONTROLLER311_REVISION_CUSTODY_OR_FRESHNESS")
    if not (
        _trusted_signature(
            body,
            signed_decision["signature"],
            controller_public_der,
            independent_controller_pin,
        )
        and closure_ledger.exact(
            monitor,
            episode=body["episodeId"],
            correlation=body["correlationId"],
            source_digest=body["sourcePayloadSha256"],
            transport_digest=body["transportReceiptSha256"],
            receiver_digest=body["receiverAckSha256"],
            timeline_digest=body["ql420TimelineSha256"],
        )
    ):
        return _hold("HOLD_INDEPENDENT_CONTROLLER_SIGNATURE_OR_EXACT_EXPORT")
    digest = hashlib.sha256(_serialize(body)).hexdigest()
    args = {
        "controller_revision": CONTROLLER376_MAIN,
        "source_revision": SOURCE310_MAIN,
        "episode_id": body["episodeId"],
        "correlation_id": body["correlationId"],
        "decision_digest": digest,
        "receiver_digest": body["receiverAckSha256"],
        "timeline_digest": body["ql420TimelineSha256"],
    }
    try:
        authorized = (
            attest_controller_ledger(**args) is True
            and owner_review_authorize(**args) is True
        )
    except (OSError, ValueError, TypeError):
        authorized = False
    if not authorized:
        return _hold("HOLD_INDEPENDENT_CONTROLLER_LEDGER_OR_OWNER_REVIEW")
    return {
        **_hold("SIGNED_CONTROLLER_OWNER_REVIEWED_NO_ACTIVATION"),
        "accepted": True,
        "decisionSha256": digest,
        "decision": body["decision"],
        "episodeId": body["episodeId"],
        "correlationId": body["correlationId"],
        "mastersSynced": False,
        "receiver": "OFF",
    }


def review_master_discrepancy311(
    monitor: PersistentReeMonitor304,
    *,
    issue: str,
    observed_at_ms: int,
    now_ms: int,
    independent_case_witness: Callable[..., bool] | None,
) -> dict[str, object]:
    """Only a protected witness may start a QL420 SLA from a real observation."""
    if not (
        _on_ree(monitor)
        and issue in ISSUE_CODES
        and type(observed_at_ms) is int
        and type(now_ms) is int
        and 0 <= now_ms - observed_at_ms <= 7 * 24 * 60 * 60 * 1000
        and callable(independent_case_witness)
    ):
        return _hold("HOLD_NO_AUTHENTICATED_CASE_OBSERVATION")
    severity = SEVERITIES[issue]
    try:
        trusted = independent_case_witness(
            source_id=SOURCE,
            issue_code=issue,
            observed_at_ms=observed_at_ms,
            source_revision=SOURCE310_MAIN,
        ) is True
    except (OSError, ValueError, TypeError):
        trusted = False
    if not trusted:
        return _hold("HOLD_PROTECTED_CASE_WITNESS")
    deadline = observed_at_ms + SLA_MINUTES[severity] * 60_000
    return {
        **_hold("PROTECTED_CASE_REVIEW_NOT_NOTIFIED"),
        "accepted": True,
        "issueCode": issue,
        "severity": severity,
        "slaMinutes": SLA_MINUTES[severity],
        "deadlineAtMs": deadline,
        "slaState": "DUE" if now_ms <= deadline else "OVERDUE",
        "notification": "NOT_SENT",
        "ownerClosure": "HOLD_INDEPENDENT_REVIEW_REQUIRED",
    }


def reconcile_master_evidence311(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Owner-only view of missing proofs; no implied sent notifications."""
    base = reconcile_master_evidence310(monitor)
    return {
        **base,
        "schema": "rosevear.ai-hub.master360-private-convergence311.v1",
        "sourceBuild": 311,
        "source310MainAtReconciliation": SOURCE310_MAIN,
        "controller376MainAtReconciliation": CONTROLLER376_MAIN,
        "commsQl420MainAtReconciliation": COMMS420_MAIN,
        "controllerContract": "PROPOSED_PRIVATE_SCHEMA_NOT_DEPLOYED",
        "exportClosure": "HOLD_NO_INDEPENDENT_SIGNED_RECEIVER_AND_CUSTODY",
        "ownerDecision": "HOLD_NO_PROTECTED_CONTROLLER_OWNER_DECISION",
        "discrepancies": [
            {
                "code": code,
                "severity": SEVERITIES[code],
                "slaMinutes": SLA_MINUTES[SEVERITIES[code]],
                "observation": "UNVERIFIED",
                "notification": "NOT_SENT",
                "state": "HOLD",
            }
            for code in ISSUE_CODES
        ],
        "receiver": "OFF",
        "connection": "HOLD",
        "masterSync": "HOLD",
        "newWindowsScheduledTasks": 0,
    }
