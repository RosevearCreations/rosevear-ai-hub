"""Build 313: signed original-host receipt and three-Master owner continuity.

Private host-only verifiers. No public evidence intake, Windows task, sender,
receiver, incident closure, or authorization to mark a Master CONNECTED.
"""

import hashlib
import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _timestamp
from rosevear_ai_hub.master_shell_acceptance306 import _trusted_signature
from rosevear_ai_hub.master_shell_acceptance308 import _hold, _on_ree
from rosevear_ai_hub.master_shell_acceptance310 import _corr, _episode, _sha
from rosevear_ai_hub.master_shell_acceptance312 import (
    _callback,
    reconcile_master_evidence312,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE = "rosevear-ai-hub"
HOST = "DESKTOP-AE894KC"
SOURCE312_MAIN = "e64e4b2e79e7c07bbd077284c298207414b149ad"
CONTROLLER378_MAIN = "a0eea834c7e8d62232a70b13b06688c6b9b4babc"
COMMS422_MAIN = "5f360821b361b43dd28aa5b2ca4c147565a84f0a"
PILOT_SCHEMA = "rosevear.ai-hub.master360-original-host-pilot313.v1"
CLOSURE_SCHEMA = "rosevear.ai-hub.master360-ql421-closure-readback313.v1"
OWNER_SCHEMA = "rosevear.ai-hub.master360-controller-owner-continuity313.v1"
STAGES = ("PILOT", "QL421_CLOSURE", "CONTROLLER")
ZERO = "0" * 64


class ProtectedPilotJournal313:
    """Atomic, ordered, metadata-only proof continuity, private to original host."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def _valid(
        self,
        monitor: PersistentReeMonitor304,
        episode: str,
        correlation: str,
        stage: str,
        digest: str,
    ) -> bool:
        return (
            _on_ree(monitor)
            and _episode(episode)
            and _corr(correlation)
            and stage in STAGES
            and _sha(digest)
        )

    def claim(
        self,
        monitor: PersistentReeMonitor304,
        *,
        episode: str,
        correlation: str,
        stage: str,
        digest: str,
        previous_digest: str,
    ) -> bool:
        if not (
            self._valid(monitor, episode, correlation, stage, digest) and _sha(previous_digest)
        ):
            return False
        expected_stage = STAGES.index(stage)
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA busy_timeout=2000")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS pilot_journal313 (
                    episode TEXT NOT NULL,
                    correlation TEXT NOT NULL,
                    stage TEXT NOT NULL,
                    digest TEXT NOT NULL,
                    previous_digest TEXT NOT NULL,
                    PRIMARY KEY(episode,stage),
                    UNIQUE(correlation,stage)
                    )"""
                )
                if expected_stage == 0:
                    if previous_digest != ZERO:
                        return False
                else:
                    predecessor = db.execute(
                        """SELECT digest FROM pilot_journal313
                        WHERE episode=? AND correlation=? AND stage=?""",
                        (episode, correlation, STAGES[expected_stage - 1]),
                    ).fetchone()
                    if predecessor != (previous_digest,):
                        return False
                cursor = db.execute(
                    """INSERT OR IGNORE INTO pilot_journal313
                    VALUES (?,?,?,?,?)""",
                    (episode, correlation, stage, digest, previous_digest),
                )
                return cursor.rowcount == 1
        except (OSError, sqlite3.Error):
            return False

    def exact(
        self,
        monitor: PersistentReeMonitor304,
        *,
        episode: str,
        correlation: str,
        stage: str,
        digest: str,
    ) -> bool:
        if not (self._valid(monitor, episode, correlation, stage, digest) and self.path.is_file()):
            return False
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                record = db.execute(
                    """SELECT digest FROM pilot_journal313
                    WHERE episode=? AND correlation=? AND stage=?""",
                    (episode, correlation, stage),
                ).fetchone()
                return record == (digest,)
        except (OSError, sqlite3.Error):
            return False


def _signed(
    envelope: Any,
    fields: set[str],
    schema: str,
    public_der: bytes | None,
    independent_pin: str,
    now_ms: int,
) -> dict[str, Any] | None:
    """Externally pinned Ed25519 signature and strict five-minute freshness."""
    if not (
        isinstance(envelope, dict)
        and set(envelope) == {"payload", "signature"}
        and isinstance(envelope["payload"], dict)
        and set(envelope["payload"]) == fields
    ):
        return None
    body = envelope["payload"]
    stamped = _timestamp(body.get("issuedAt"))
    if not (
        body.get("schema") == schema
        and stamped is not None
        and 0 <= now_ms - stamped <= 300_000
        and _trusted_signature(body, envelope["signature"], public_der, independent_pin)
    ):
        return None
    return body


def import_signed_original_pilot313(
    monitor: PersistentReeMonitor304,
    admitted_pilot: Any,
    three_master_handoff: Any,
    signed_receipt: Any,
    *,
    journal: ProtectedPilotJournal313,
    source_public_der: bytes | None,
    independent_source_pin: str,
    attest_original_installed_release: Callable[..., bool] | None,
    attest_durable_source_replay: Callable[..., bool] | None,
    authorize_owner_import: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Admit a signed *existing* pilot episode, without generating one."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(journal, ProtectedPilotJournal313)
        and isinstance(admitted_pilot, dict)
        and admitted_pilot.get("accepted") is True
        and admitted_pilot.get("state") == "ORIGINAL_HOST_PILOT_EVIDENCE_ADOPTED_NO_ACTIVATION"
        and admitted_pilot.get("sourceRevision") == "41b3d69962dd22480badf26fc6a65dfb59f88ac9"
        and admitted_pilot.get("connection") == "HOLD"
        and isinstance(three_master_handoff, dict)
        and three_master_handoff.get("accepted") is True
        and three_master_handoff.get("state")
        == "THREE_MASTER_HANDOFF_CUSTODY_WITNESSED_OWNER_DECISION_PENDING"
        and three_master_handoff.get("ownerAcceptance") == "HOLD"
        and three_master_handoff.get("connection") == "HOLD"
    ):
        return _hold("HOLD_MISSING_PROTECTED_312_PILOT_CHAIN")
    fields = {
        "schema",
        "sourceId",
        "hostId",
        "sourceRevision",
        "episodeId",
        "correlationId",
        "pilotCustodySha256",
        "threeMasterReceiptSetSha256",
        "receiverAckSha256",
        "ql421ClosureSha256",
        "issuedAt",
        "connection",
    }
    body = _signed(
        signed_receipt,
        fields,
        PILOT_SCHEMA,
        source_public_der,
        independent_source_pin,
        now,
    )
    if body is None:
        return _hold("HOLD_INVALID_OR_STALE_SOURCE_SIGNATURE")
    episode = body["episodeId"]
    corr = body["correlationId"]
    if not (
        _episode(episode)
        and _corr(corr)
        and body["sourceId"] == SOURCE
        and body["hostId"] == HOST
        and body["sourceRevision"] == SOURCE312_MAIN
        and body["connection"] == "HOLD"
        and body["pilotCustodySha256"] == admitted_pilot.get("agreementSha256")
        and body["threeMasterReceiptSetSha256"] == three_master_handoff.get("receiptSetSha256")
        and body["receiverAckSha256"] == admitted_pilot.get("receiverAckSha256")
        and body["ql421ClosureSha256"] == three_master_handoff.get("closureSha256")
        and episode == admitted_pilot.get("episodeId")
        and corr == admitted_pilot.get("correlationId")
        and episode == three_master_handoff.get("episodeId")
        and corr == three_master_handoff.get("correlationId")
        and all(
            _sha(body[key])
            for key in (
                "pilotCustodySha256",
                "threeMasterReceiptSetSha256",
                "receiverAckSha256",
                "ql421ClosureSha256",
            )
        )
    ):
        return _hold("HOLD_PILOT_SOURCE_REVISION_EPISODE_OR_DIGEST")
    digest = hashlib.sha256(_serialize(body)).hexdigest()
    evidence = {
        "host_id": HOST,
        "source_revision": SOURCE312_MAIN,
        "episode_id": episode,
        "correlation_id": corr,
        "source_receipt_digest": digest,
        "closure_digest": body["ql421ClosureSha256"],
    }
    if not (
        _callback(attest_original_installed_release, **evidence)
        and _callback(attest_durable_source_replay, **evidence)
        and _callback(authorize_owner_import, **evidence)
    ):
        return _hold("HOLD_NO_ORIGINAL_REE_INSTALL_REPLAY_OR_OWNER_WITNESS")
    if not journal.claim(
        monitor,
        episode=episode,
        correlation=corr,
        stage="PILOT",
        digest=digest,
        previous_digest=ZERO,
    ):
        return _hold("HOLD_DUPLICATE_OR_UNAVAILABLE_ORIGINAL_PILOT_JOURNAL")
    return {
        **_hold("ORIGINAL_SIGNED_PILOT_IMPORTED_NO_ACTIVATION"),
        "accepted": True,
        "episodeId": episode,
        "correlationId": corr,
        "pilotReceiptSha256": digest,
        "ql421ClosureSha256": body["ql421ClosureSha256"],
        "receiverAckSha256": body["receiverAckSha256"],
        "sourceRevision": SOURCE312_MAIN,
    }


def read_ql421_closure313(
    monitor: PersistentReeMonitor304,
    imported_pilot: Any,
    signed_comms_review: Any,
    *,
    journal: ProtectedPilotJournal313,
    comms_public_der: bytes | None,
    independent_comms_pin: str,
    attest_ql422_closure_ledger: Callable[..., bool] | None,
    attest_independent_owner_audit: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Independently witness QL-421 closure via current QL-422 custody."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(journal, ProtectedPilotJournal313)
        and isinstance(imported_pilot, dict)
        and imported_pilot.get("accepted") is True
        and imported_pilot.get("state") == "ORIGINAL_SIGNED_PILOT_IMPORTED_NO_ACTIVATION"
        and imported_pilot.get("connection") == "HOLD"
        and journal.exact(
            monitor,
            episode=imported_pilot.get("episodeId"),
            correlation=imported_pilot.get("correlationId"),
            stage="PILOT",
            digest=imported_pilot.get("pilotReceiptSha256"),
        )
    ):
        return _hold("HOLD_ORIGINAL_PILOT_JOURNAL_READBACK")
    fields = {
        "schema",
        "commsId",
        "commsRevision",
        "sourceId",
        "sourceRevision",
        "episodeId",
        "correlationId",
        "pilotReceiptSha256",
        "ql421ClosureSha256",
        "ql421OwnerAuditSha256",
        "ql422OperatorDecisionSha256",
        "decision",
        "connection",
        "ownerAcceptance",
        "issuedAt",
    }
    body = _signed(
        signed_comms_review,
        fields,
        CLOSURE_SCHEMA,
        comms_public_der,
        independent_comms_pin,
        now,
    )
    if body is None:
        return _hold("HOLD_UNSIGNED_STALE_OR_MISMATCHED_COMMS_REVIEW")
    if not (
        body["commsId"] == "rosevear-comms-hub"
        and body["commsRevision"] == COMMS422_MAIN
        and body["sourceId"] == SOURCE
        and body["sourceRevision"] == SOURCE312_MAIN
        and body["episodeId"] == imported_pilot["episodeId"]
        and body["correlationId"] == imported_pilot["correlationId"]
        and body["pilotReceiptSha256"] == imported_pilot["pilotReceiptSha256"]
        and body["ql421ClosureSha256"] == imported_pilot["ql421ClosureSha256"]
        and _sha(body["ql421OwnerAuditSha256"])
        and _sha(body["ql422OperatorDecisionSha256"])
        and body["decision"] == "OWNER_REVIEW_ELIGIBLE_NOT_ACCEPTED"
        and body["connection"] == "HOLD"
        and body["ownerAcceptance"] == "HOLD"
    ):
        return _hold("HOLD_INCONSISTENT_QL421_CLOSURE_OR_OPERATOR_DECISION")
    digest = hashlib.sha256(_serialize(body)).hexdigest()
    evidence = {
        "source_id": SOURCE,
        "source_revision": SOURCE312_MAIN,
        "comms_revision": COMMS422_MAIN,
        "episode_id": body["episodeId"],
        "correlation_id": body["correlationId"],
        "closure_digest": body["ql421ClosureSha256"],
        "owner_audit_digest": body["ql421OwnerAuditSha256"],
        "operator_digest": body["ql422OperatorDecisionSha256"],
    }
    if not (
        _callback(attest_ql422_closure_ledger, **evidence)
        and _callback(attest_independent_owner_audit, **evidence)
    ):
        return _hold("HOLD_MISSING_INDEPENDENT_QL422_CLOSURE_READBACK")
    if not journal.claim(
        monitor,
        episode=body["episodeId"],
        correlation=body["correlationId"],
        stage="QL421_CLOSURE",
        digest=digest,
        previous_digest=body["pilotReceiptSha256"],
    ):
        return _hold("HOLD_DUPLICATE_OR_UNAVAILABLE_COMMS_CLOSURE_JOURNAL")
    return {
        **_hold("QL421_CLOSURE_REVIEW_WITNESSED_NOT_ACCEPTED"),
        "accepted": True,
        "episodeId": body["episodeId"],
        "correlationId": body["correlationId"],
        "pilotReceiptSha256": body["pilotReceiptSha256"],
        "commsReviewSha256": digest,
        "ql421OwnerAuditSha256": body["ql421OwnerAuditSha256"],
        "ql422OperatorDecisionSha256": body["ql422OperatorDecisionSha256"],
    }


def review_controller_owner_continuity313(
    monitor: PersistentReeMonitor304,
    imported_pilot: Any,
    comms_review: Any,
    signed_controller_review: Any,
    *,
    journal: ProtectedPilotJournal313,
    controller_public_der: bytes | None,
    independent_controller_pin: str,
    attest_controller_ledger: Callable[..., bool] | None,
    attest_owner_reviewer_separation: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Verify signed controller owner-review continuity, never owner acceptance."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(journal, ProtectedPilotJournal313)
        and isinstance(imported_pilot, dict)
        and imported_pilot.get("accepted") is True
        and imported_pilot.get("connection") == "HOLD"
        and imported_pilot.get("state") == "ORIGINAL_SIGNED_PILOT_IMPORTED_NO_ACTIVATION"
        and isinstance(comms_review, dict)
        and comms_review.get("accepted") is True
        and comms_review.get("connection") == "HOLD"
        and comms_review.get("state") == "QL421_CLOSURE_REVIEW_WITNESSED_NOT_ACCEPTED"
        and comms_review.get("episodeId") == imported_pilot.get("episodeId")
        and comms_review.get("correlationId") == imported_pilot.get("correlationId")
        and comms_review.get("pilotReceiptSha256") == imported_pilot.get("pilotReceiptSha256")
        and journal.exact(
            monitor,
            episode=comms_review.get("episodeId"),
            correlation=comms_review.get("correlationId"),
            stage="QL421_CLOSURE",
            digest=comms_review.get("commsReviewSha256"),
        )
    ):
        return _hold("HOLD_UNVERIFIED_QL421_CLOSURE_CONTINUITY")
    fields = {
        "schema",
        "controller",
        "controllerRevision",
        "sourceId",
        "sourceRevision",
        "commsRevision",
        "episodeId",
        "correlationId",
        "pilotReceiptSha256",
        "commsReviewSha256",
        "previousControllerReviewSha256",
        "ql421OwnerAuditSha256",
        "decision",
        "ownerAcceptance",
        "connection",
        "mastersSynced",
        "issuedAt",
    }
    body = _signed(
        signed_controller_review,
        fields,
        OWNER_SCHEMA,
        controller_public_der,
        independent_controller_pin,
        now,
    )
    if body is None:
        return _hold("HOLD_INVALID_CONTROLLER_CONTINUITY_SIGNATURE")
    if not (
        body["controller"] == "ai-data-platform"
        and body["controllerRevision"] == CONTROLLER378_MAIN
        and body["sourceId"] == SOURCE
        and body["sourceRevision"] == SOURCE312_MAIN
        and body["commsRevision"] == COMMS422_MAIN
        and body["episodeId"] == imported_pilot["episodeId"]
        and body["correlationId"] == imported_pilot["correlationId"]
        and body["pilotReceiptSha256"] == imported_pilot["pilotReceiptSha256"]
        and body["commsReviewSha256"] == comms_review["commsReviewSha256"]
        and body["ql421OwnerAuditSha256"] == comms_review["ql421OwnerAuditSha256"]
        and _sha(body["previousControllerReviewSha256"])
        and body["decision"] in ("OWNER_REVIEW_PENDING", "MAINTAIN_HOLD")
        and body["ownerAcceptance"] == "HOLD"
        and body["connection"] == "HOLD"
        and body["mastersSynced"] is False
    ):
        return _hold("HOLD_CONTROLLER_REVISION_OR_OWNER_DECISION_DRIFT")
    digest = hashlib.sha256(_serialize(body)).hexdigest()
    evidence = {
        "source_revision": SOURCE312_MAIN,
        "controller_revision": CONTROLLER378_MAIN,
        "comms_revision": COMMS422_MAIN,
        "episode_id": body["episodeId"],
        "correlation_id": body["correlationId"],
        "decision_digest": digest,
        "prior_decision_digest": body["previousControllerReviewSha256"],
        "closure_digest": body["commsReviewSha256"],
    }
    if not (
        _callback(attest_controller_ledger, **evidence)
        and _callback(attest_owner_reviewer_separation, **evidence)
    ):
        return _hold("HOLD_CONTROLLER_LEDGER_OR_INDEPENDENT_OWNER_REVIEW")
    if not journal.claim(
        monitor,
        episode=body["episodeId"],
        correlation=body["correlationId"],
        stage="CONTROLLER",
        digest=digest,
        previous_digest=body["commsReviewSha256"],
    ):
        return _hold("HOLD_DUPLICATE_OR_UNAVAILABLE_OWNER_CONTINUITY_JOURNAL")
    return {
        **_hold("SIGNED_OWNER_REVIEW_CONTINUITY_NO_ACTIVATION"),
        "accepted": True,
        "episodeId": body["episodeId"],
        "correlationId": body["correlationId"],
        "controllerReviewSha256": digest,
        "ownerAcceptance": "HOLD",
        "receiver": "OFF",
        "masterSync": "HOLD",
    }


def reconcile_master_evidence313(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Owner-only, no-store, status-only HOLD projection; never live evidence."""
    return {
        **reconcile_master_evidence312(monitor),
        "schema": "rosevear.ai-hub.master360-signed-pilot-continuity313.v1",
        "sourceBuild": 313,
        "source312MainAtReconciliation": SOURCE312_MAIN,
        "controller378MainAtReconciliation": CONTROLLER378_MAIN,
        "commsQl422MainAtReconciliation": COMMS422_MAIN,
        "signedOriginalHostPilot": "HOLD_NO_INDEPENDENT_SIGNED_REE_PILOT_RECEIPT",
        "ql421ClosureReadback": "HOLD_NO_AUTHENTICATED_QL422_CLOSURE_LEDGER",
        "controllerOwnerContinuity": "HOLD_NO_INDEPENDENT_SIGNED_OWNER_REVIEW",
        "privateEpisodeJournal": "NO_PROTECTED_LIVE_EPISODE_IMPORTED",
        "ownerAcceptance": "HOLD",
        "originalHostUptime": "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION",
        "receiver": "OFF",
        "connection": "HOLD",
        "masterSync": "HOLD",
    }
