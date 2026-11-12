"""Build 312: original-host pilot and protected three-Master handoff.

This module never sends evidence, creates Windows tasks, opens a receiver,
certifies actual uptime or grants CONNECTED/owner acceptance. Privileged
functions require original-host authority plus independent runtime witnesses.
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
from rosevear_ai_hub.master_shell_acceptance311 import (
    CONTROLLER_SCHEMA311,
    ProtectedExportClosureLedger311,
    reconcile_master_evidence311,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE = "rosevear-ai-hub"
HOST = "DESKTOP-AE894KC"
SOURCE311_MAIN = "41b3d69962dd22480badf26fc6a65dfb59f88ac9"
CONTROLLER376_MAIN = "b1273edf4b2b38b5ca68371d9b171a1391d6f2f6"
COMMS421_MAIN = "a89a885ce444f266da00d9311eeece1811d482e2"
NEGOTIATION_SCHEMA = "rosevear.ai-hub.master360-controller-negotiation312.v1"
HANDOFF_SCHEMA = "rosevear.ai-hub.master360-three-master-handoff312.v1"
MASTERS = ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")


def _callback(callback: Callable[..., bool] | None, **kwargs: Any) -> bool:
    """Only a protected caller can supply an independent trust witness."""
    if not callable(callback):
        return False
    try:
        return callback(**kwargs) is True
    except (OSError, TypeError, ValueError):
        return False


def negotiate_controller_schema312(
    monitor: PersistentReeMonitor304,
    signed_agreement: Any,
    *,
    controller_public_der: bytes | None,
    independent_controller_pin: str,
    attest_deployed_schema: Callable[..., bool] | None,
    owner_authorize: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Require an independently signed, deployed, exact controller contract."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(signed_agreement, dict)
        and set(signed_agreement) == {"payload", "signature"}
    ):
        return _hold("HOLD_ORIGINAL_HOST_OR_CONTROLLER_AUTHORITY")
    body = signed_agreement["payload"]
    if not isinstance(body, dict) or set(body) != {
        "schema",
        "controller",
        "controllerRevision",
        "sourceId",
        "sourceRevision",
        "commsRevision",
        "controllerOwnerReviewSchema",
        "compatibility",
        "connection",
        "negotiatedAt",
    }:
        return _hold("HOLD_CONTROLLER_SCHEMA_NEGOTIATION")
    stamp = _timestamp(body["negotiatedAt"])
    if not (
        body["schema"] == NEGOTIATION_SCHEMA
        and body["controller"] == "ai-data-platform"
        and body["controllerRevision"] == CONTROLLER376_MAIN
        and body["sourceId"] == SOURCE
        and body["sourceRevision"] == SOURCE311_MAIN
        and body["commsRevision"] == COMMS421_MAIN
        and body["controllerOwnerReviewSchema"] == CONTROLLER_SCHEMA311
        and body["compatibility"] == "DEPLOYED_READ_ONLY_EXACT"
        and body["connection"] == "HOLD"
        and stamp is not None
        and 0 <= now - stamp <= 300_000
        and _trusted_signature(
            body,
            signed_agreement["signature"],
            controller_public_der,
            independent_controller_pin,
        )
    ):
        return _hold("HOLD_CONTROLLER_SIGNATURE_REVISION_OR_FRESHNESS")
    digest = hashlib.sha256(_serialize(body)).hexdigest()
    args = {
        "controller_revision": CONTROLLER376_MAIN,
        "source_revision": SOURCE311_MAIN,
        "comms_revision": COMMS421_MAIN,
        "agreement_digest": digest,
        "schema": CONTROLLER_SCHEMA311,
    }
    if not (_callback(attest_deployed_schema, **args) and _callback(owner_authorize, **args)):
        return _hold("HOLD_NO_INDEPENDENT_CONTROLLER_DEPLOYMENT_OR_OWNER")
    return {
        **_hold("SCHEMA_MATCHED_READ_ONLY_NO_ACTIVATION"),
        "accepted": True,
        "agreementSha256": digest,
        "controllerRevision": CONTROLLER376_MAIN,
        "sourceRevision": SOURCE311_MAIN,
        "commsRevision": COMMS421_MAIN,
    }


def adopt_original_host_pilot312(
    monitor: PersistentReeMonitor304,
    closed_export: Any,
    controller_review: Any,
    agreement: Any,
    *,
    closure_ledger: ProtectedExportClosureLedger311,
    attest_original_host: Callable[..., bool] | None,
    attest_controller_review: Callable[..., bool] | None,
) -> dict[str, object]:
    """Adopt existing exact protected custody, not a synthetic release receipt."""
    if not (
        _on_ree(monitor)
        and isinstance(closure_ledger, ProtectedExportClosureLedger311)
        and isinstance(closed_export, dict)
        and isinstance(controller_review, dict)
        and isinstance(agreement, dict)
        and closed_export.get("accepted") is True
        and closed_export.get("state") == "ONE_TEST_EXPORT_CUSTODY_CLOSED_NOT_CONNECTED"
        and closed_export.get("receiverAckVerified") is True
        and closed_export.get("connection") == "HOLD"
        and controller_review.get("accepted") is True
        and controller_review.get("state") == "SIGNED_CONTROLLER_OWNER_REVIEWED_NO_ACTIVATION"
        and controller_review.get("episodeId") == closed_export.get("episodeId")
        and controller_review.get("correlationId") == closed_export.get("correlationId")
        and controller_review.get("connection") == "HOLD"
        and agreement.get("accepted") is True
        and agreement.get("state") == "SCHEMA_MATCHED_READ_ONLY_NO_ACTIVATION"
        and agreement.get("sourceRevision") == SOURCE311_MAIN
        and agreement.get("controllerRevision") == CONTROLLER376_MAIN
        and agreement.get("commsRevision") == COMMS421_MAIN
    ):
        return _hold("HOLD_UNVERIFIED_ORIGINAL_HOST_PILOT_CHAIN")
    episode = closed_export.get("episodeId")
    correlation = closed_export.get("correlationId")
    digests = {
        "source_digest": closed_export.get("sourcePayloadSha256"),
        "transport_digest": closed_export.get("transportReceiptSha256"),
        "receiver_digest": closed_export.get("receiverAckSha256"),
        "timeline_digest": closed_export.get("ql420TimelineSha256"),
    }
    if not (
        _episode(episode)
        and _corr(correlation)
        and all(_sha(d) for d in digests.values())
        and _sha(controller_review.get("decisionSha256"))
        and _sha(agreement.get("agreementSha256"))
        and closure_ledger.exact(monitor, episode=episode, correlation=correlation, **digests)
    ):
        return _hold("HOLD_EXACT_311_CLOSURE_CUSTODY_OR_DIGEST")
    args = {
        "host_id": HOST,
        "source_revision": SOURCE311_MAIN,
        "episode_id": episode,
        "correlation_id": correlation,
        "receiver_digest": digests["receiver_digest"],
        "controller_digest": controller_review["decisionSha256"],
        "agreement_digest": agreement["agreementSha256"],
    }
    if not (
        _callback(attest_original_host, **args) and _callback(attest_controller_review, **args)
    ):
        return _hold("HOLD_MISSING_INDEPENDENT_ORIGINAL_HOST_WITNESS")
    return {
        **_hold("ORIGINAL_HOST_PILOT_EVIDENCE_ADOPTED_NO_ACTIVATION"),
        "accepted": True,
        "episodeId": episode,
        "correlationId": correlation,
        "sourceRevision": SOURCE311_MAIN,
        "controllerDecisionSha256": controller_review["decisionSha256"],
        "agreementSha256": agreement["agreementSha256"],
        "receiverAckSha256": digests["receiver_digest"],
        "ql420TimelineSha256": digests["timeline_digest"],
    }


class ProtectedHandoffLedger312:
    """Single-use metadata-only proof, without keys, envelopes, IPs or media."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def claim(
        self,
        monitor: PersistentReeMonitor304,
        *,
        episode: str,
        correlation: str,
        closure_digest: str,
        receipts_digest: str,
    ) -> bool:
        if not (
            _on_ree(monitor)
            and _episode(episode)
            and _corr(correlation)
            and _sha(closure_digest)
            and _sha(receipts_digest)
        ):
            return False
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA busy_timeout=2000")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS protected_handoff312 (
                    episode TEXT PRIMARY KEY,
                    correlation TEXT UNIQUE NOT NULL,
                    closure_digest TEXT NOT NULL,
                    receipts_digest TEXT NOT NULL
                    )"""
                )
                cursor = db.execute(
                    "INSERT OR IGNORE INTO protected_handoff312 VALUES (?,?,?,?)",
                    (episode, correlation, closure_digest, receipts_digest),
                )
                return cursor.rowcount == 1
        except (sqlite3.Error, OSError):
            return False


def certify_three_master_handoff312(
    monitor: PersistentReeMonitor304,
    adopted_pilot: Any,
    signed_receipts: Any,
    *,
    closure_digest: str,
    public_keys: dict[str, bytes],
    independent_pins: dict[str, str],
    ledger: ProtectedHandoffLedger312,
    attest_ql421_closure: Callable[..., bool] | None,
    attest_durable_replay: Callable[..., bool] | None,
    independent_owner_reviewer: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Certify *custody review*, never close the incident or accept owners."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(ledger, ProtectedHandoffLedger312)
        and isinstance(adopted_pilot, dict)
        and adopted_pilot.get("accepted") is True
        and adopted_pilot.get("state") == "ORIGINAL_HOST_PILOT_EVIDENCE_ADOPTED_NO_ACTIVATION"
        and adopted_pilot.get("connection") == "HOLD"
        and adopted_pilot.get("sourceRevision") == SOURCE311_MAIN
        and isinstance(signed_receipts, dict)
        and set(signed_receipts) == set(MASTERS)
        and set(public_keys) == set(MASTERS)
        and set(independent_pins) == set(MASTERS)
        and _sha(closure_digest)
    ):
        return _hold("HOLD_THREE_MASTER_CUSTODY_PREREQUISITES")
    episode = adopted_pilot.get("episodeId")
    correlation = adopted_pilot.get("correlationId")
    if not _episode(episode) or not _corr(correlation):
        return _hold("HOLD_SOURCE_EPISODE_OR_CORRELATION")
    receipt_ids = set()
    digests = []
    for master in MASTERS:
        signed = signed_receipts[master]
        if not (
            isinstance(signed, dict)
            and set(signed) == {"payload", "signature"}
            and isinstance(signed["payload"], dict)
        ):
            return _hold("HOLD_UNSIGNED_MASTER_HANDOFF")
        body = signed["payload"]
        if set(body) != {
            "schema",
            "master",
            "receiptId",
            "sourceId",
            "hostId",
            "sourceRevision",
            "controllerRevision",
            "commsRevision",
            "episodeId",
            "correlationId",
            "closureSha256",
            "receiverAckSha256",
            "issuedAt",
            "connection",
            "ownerAcceptance",
        }:
            return _hold("HOLD_MASTER_RECEIPT_SCHEMA")
        timestamp = _timestamp(body["issuedAt"])
        rid = body["receiptId"]
        if not (
            isinstance(rid, str)
            and 8 <= len(rid) <= 96
            and rid.isascii()
            and rid.isalnum()
            and rid not in receipt_ids
            and body["schema"] == HANDOFF_SCHEMA
            and body["master"] == master
            and body["sourceId"] == SOURCE
            and body["hostId"] == HOST
            and body["sourceRevision"] == SOURCE311_MAIN
            and body["controllerRevision"] == CONTROLLER376_MAIN
            and body["commsRevision"] == COMMS421_MAIN
            and body["episodeId"] == episode
            and body["correlationId"] == correlation
            and body["closureSha256"] == closure_digest
            and body["receiverAckSha256"] == adopted_pilot.get("receiverAckSha256")
            and body["connection"] == "HOLD"
            and body["ownerAcceptance"] == "HOLD"
            and timestamp is not None
            and 0 <= now - timestamp <= 300_000
            and _trusted_signature(
                body, signed["signature"], public_keys[master], independent_pins[master]
            )
        ):
            return _hold("HOLD_STALE_FORGED_OR_MISMATCHED_MASTER_RECEIPT")
        receipt_ids.add(rid)
        digests.append(hashlib.sha256(_serialize(body)).hexdigest())
    args = {
        "source_id": SOURCE,
        "source_revision": SOURCE311_MAIN,
        "comms_revision": COMMS421_MAIN,
        "controller_revision": CONTROLLER376_MAIN,
        "episode_id": episode,
        "correlation_id": correlation,
        "closure_digest": closure_digest,
    }
    if not (
        _callback(attest_ql421_closure, **args)
        and _callback(attest_durable_replay, **args)
        and _callback(independent_owner_reviewer, **args)
    ):
        return _hold("HOLD_INDEPENDENT_QL421_REPLAY_OR_OWNER_WITNESS")
    receipts_digest = hashlib.sha256("|".join(digests).encode()).hexdigest()
    if not ledger.claim(
        monitor,
        episode=episode,
        correlation=correlation,
        closure_digest=closure_digest,
        receipts_digest=receipts_digest,
    ):
        return _hold("HOLD_DUPLICATE_THREE_MASTER_HANDOFF")
    return {
        **_hold("THREE_MASTER_HANDOFF_CUSTODY_WITNESSED_OWNER_DECISION_PENDING"),
        "accepted": True,
        "episodeId": episode,
        "correlationId": correlation,
        "closureSha256": closure_digest,
        "receiptSetSha256": receipts_digest,
        "independentMasters": list(MASTERS),
        "ownerAcceptance": "HOLD",
    }


def reconcile_master_evidence312(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Owner-scoped read-only CODE/HOLD status, never runtime attestation."""
    return {
        **reconcile_master_evidence311(monitor),
        "schema": "rosevear.ai-hub.master360-protected-pilot312.v1",
        "sourceBuild": 312,
        "source311MainAtReconciliation": SOURCE311_MAIN,
        "controller376MainAtReconciliation": CONTROLLER376_MAIN,
        "commsQl421MainAtReconciliation": COMMS421_MAIN,
        "schemaNegotiation": "HOLD_NO_INDEPENDENT_CONTROLLER_SCHEMA_ADOPTION",
        "originalHostPilot": "HOLD_NO_AUTHENTICATED_REE_PILOT_EVIDENCE",
        "incidentHandoff": "HOLD_NO_THREE_SIGNED_MASTER_RECEIPTS",
        "ownerCertification": "HOLD_NO_INDEPENDENT_OWNER_CLOSURE_DECISION",
        "handoffMasters": [
            {"master": name, "state": "HOLD_NO_INDEPENDENT_RECEIPT"} for name in MASTERS
        ],
        "receiver": "OFF",
        "connection": "HOLD",
        "masterSync": "HOLD",
    }
