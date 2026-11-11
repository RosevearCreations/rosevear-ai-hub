"""Build 307: original Ree host field acceptance and protected master handoff.

No HTTP transmitter, signer enrollment, automatic receiver activation, Windows
task changes, or public import API. A protected caller must supply separate
owner consent, independent public keys and an original-host signer callback.
"""

import hashlib
import os
import platform
import socket
import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import (
    COMMS_SCHEMA,
    _serialize,
    _strict_samples,
    _timestamp,
)
from rosevear_ai_hub.master_shell_acceptance306 import (
    EPISODE,
    HEX64,
    _ree_monitor_ready,
    _trusted_signature,
    reconcile_three_master_uptime306,
    review_original_owner_release306,
)
from rosevear_ai_hub.master_shell_monitor304 import (
    PersistentReeMonitor304,
    storage_location304,
)
from rosevear_ai_hub.master_shell_uptime303 import ORIGINAL_HOST

SOURCE = "rosevear-ai-hub"
AIHUB306_MAIN = "2780e94077fcee154a22e0e61ace72c36410cb90"
COMMS_QL413_MAIN = "c670c2523001294e8ac2e4f283a1f8e5edda3ddb"
AIDATA_366_MAIN_AT_RECONCILIATION = "a5ba69a3e09fb4dd41f2b7586db027ba3e819301"
QL413_SCHEMA = "rosevear.master360.protected-receipt.v1"
# Explicit proposed QL-414 bridge; not represented as an installed QL-413 ACK.
QL414_ACK_PROPOSAL = "rosevear.comms.ql414.source-one-test-ack.v1"
EVIDENCE_AXES = (
    "installedRelease",
    "persistentHistory",
    "signedTelemetry",
    "replayProtection",
    "incidentAcceptance",
)


def _hold(reason: str) -> dict[str, object]:
    return {
        "state": reason,
        "accepted": False,
        "sourceId": SOURCE,
        "receiver": "OFF",
        "connection": "HOLD",
        "masterSync": "HOLD",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }


def review_installed_306_on_ree307(
    root: Path,
    monitor: PersistentReeMonitor304,
    signed_review: Any,
    *,
    reviewer_public_der: bytes | None,
    independent_reviewer_pin: str,
    owner_authorize: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Require the Build 306 process SHA, launcher pointer and TEMPLAR proof."""
    result = review_original_owner_release306(
        root,
        monitor,
        signed_review,
        reviewer_public_der=reviewer_public_der,
        independent_reviewer_pin=independent_reviewer_pin,
        expected_installed_revision=AIHUB306_MAIN,
        owner_authorize=owner_authorize,
        now_ms=now_ms,
    )
    return {
        **result,
        "reviewBuild": 307,
        "requiredInstalledRevision": AIHUB306_MAIN,
        "independentCommsAcceptance": "HOLD_SEPARATE_RECEIVER_PROOF_REQUIRED",
    }


class ProtectedChainLedger307:
    """Atomic source+Comms digest pair admission on the original Windows host."""

    def __init__(self, path: Path) -> None:
        self.path = path

    @classmethod
    def on_original_host(cls) -> "ProtectedChainLedger307 | None":
        location = storage_location304(os.getenv("LOCALAPPDATA"))
        if (
            platform.system() != "Windows"
            or socket.gethostname().upper() != ORIGINAL_HOST
            or location is None
        ):
            return None
        return cls(location.with_name("source-comms-chain307.sqlite3"))

    def claim(self, *, episode_id: str, source_digest: str, comms_digest: str) -> bool:
        if (
            platform.system() != "Windows"
            or socket.gethostname().upper() != ORIGINAL_HOST
            or not isinstance(episode_id, str)
            or not EPISODE.fullmatch(episode_id)
            or not isinstance(source_digest, str)
            or not HEX64.fullmatch(source_digest)
            or not isinstance(comms_digest, str)
            or not HEX64.fullmatch(comms_digest)
        ):
            return False
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA busy_timeout=2000")
                db.execute("BEGIN IMMEDIATE")
                db.execute("""CREATE TABLE IF NOT EXISTS accepted_chain307 (
                    episode_id TEXT PRIMARY KEY,
                    source_digest TEXT NOT NULL,
                    comms_digest TEXT NOT NULL,
                    accepted_at_epoch INTEGER NOT NULL
                )""")
                row = db.execute(
                    "INSERT OR IGNORE INTO accepted_chain307 VALUES (?,?,?,?)",
                    (episode_id, source_digest, comms_digest, int(time.time())),
                )
                return row.rowcount == 1
        except (OSError, sqlite3.Error):
            return False


def verify_source_comms_chain307(
    source_envelope: Any,
    comms_ack: Any,
    *,
    source_public_der: bytes | None,
    independently_pinned_source_sha256: str,
    comms_public_der: bytes | None,
    independently_pinned_comms_sha256: str,
    source_import_claimed: Callable[..., bool] | None,
    owner_authorize: Callable[..., bool] | None,
    independent_reviewer_approve: Callable[..., bool] | None,
    claim_chain: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Correlate two *independently signed* receipts after Build 306 source import.

    This QL-414 ACK proposal is not deployed by Comms QL-413. Even a valid
    future ACK does not authorize network activity or connection release.
    """
    if platform.system() != "Windows" or socket.gethostname().upper() != ORIGINAL_HOST:
        return _hold("HOLD_NOT_ORIGINAL_REE_HOST")
    if not all(
        callable(x)
        for x in (source_import_claimed, owner_authorize, independent_reviewer_approve, claim_chain)
    ):
        return _hold("HOLD_PROTECTED_CHAIN_AUTHORITIES_NOT_ENROLLED")
    if (
        not isinstance(source_envelope, dict)
        or set(source_envelope) != {"payload", "signature"}
        or not isinstance(comms_ack, dict)
        or set(comms_ack) != {"payload", "signature"}
    ):
        return _hold("HOLD_MISSING_SIGNED_SOURCE_OR_COMMS_RECEIPT")
    source = source_envelope["payload"]
    ack = comms_ack["payload"]
    source_fields = (
        "schema",
        "sourceId",
        "hostId",
        "sourceRevision",
        "capturedAt",
        "episodeId",
        "samples",
    )
    ack_fields = (
        "schema",
        "sourceId",
        "hostId",
        "revision",
        "ackedAt",
        "ackId",
        "episodeId",
        "sourceHost",
        "sourceRevision",
        "sourceEnvelopeSha256",
        "decision",
    )
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if (
        type(now) is not int
        or not isinstance(source, dict)
        or list(source) != list(source_fields)
        or not isinstance(ack, dict)
        or list(ack) != list(ack_fields)
    ):
        return _hold("HOLD_SIGNED_RECEIPT_SCHEMA")
    source_at = _timestamp(source["capturedAt"])
    ack_at = _timestamp(ack["ackedAt"])
    if (
        source["schema"] != COMMS_SCHEMA
        or source["sourceId"] != SOURCE
        or source["hostId"] != ORIGINAL_HOST
        or source["sourceRevision"] != AIHUB306_MAIN
        or not isinstance(source["episodeId"], str)
        or not EPISODE.fullmatch(source["episodeId"])
        or source_at is None
        or not 0 <= now - source_at <= 5 * 60_000
        or _strict_samples(source["samples"], now_ms=source_at) is None
        or ack["schema"] != QL414_ACK_PROPOSAL
        or ack["sourceId"] != "rosevear-comms-hub"
        or ack["hostId"] != "PROTECTED_MASTER_RUNTIME"
        or ack["revision"] != COMMS_QL413_MAIN
        or ack["sourceHost"] != ORIGINAL_HOST
        or ack["sourceRevision"] != AIHUB306_MAIN
        or ack["episodeId"] != source["episodeId"]
        or not isinstance(ack["ackId"], str)
        or not EPISODE.fullmatch(ack["ackId"])
        or ack["decision"] != "RECEIVED_FOR_INDEPENDENT_REVIEW"
        or ack_at is None
        or not source_at <= ack_at <= now
        or now - ack_at > 5 * 60_000
    ):
        return _hold("HOLD_SOURCE_REVISION_EPISODE_OR_FRESHNESS")
    source_digest = hashlib.sha256(_serialize(source)).hexdigest()
    comms_digest = hashlib.sha256(_serialize(ack)).hexdigest()
    if ack["sourceEnvelopeSha256"] != source_digest:
        return _hold("HOLD_COMMS_ACK_NOT_BOUND_TO_SOURCE")
    if not _trusted_signature(
        source,
        source_envelope["signature"],
        source_public_der,
        independently_pinned_source_sha256,
    ) or not _trusted_signature(
        ack,
        comms_ack["signature"],
        comms_public_der,
        independently_pinned_comms_sha256,
    ):
        return _hold("HOLD_INDEPENDENT_SOURCE_OR_COMMS_SIGNATURE")
    opts = {
        "episode_id": source["episodeId"],
        "source_digest": source_digest,
        "comms_digest": comms_digest,
    }
    try:
        if (
            source_import_claimed(
                source_id=SOURCE,
                episode_id=source["episodeId"],
                envelope_sha256=source_digest,
            )
            is not True
        ):
            return _hold("HOLD_NO_DURABLE_BUILD306_SOURCE_IMPORT")
        if owner_authorize(**opts) is not True or independent_reviewer_approve(**opts) is not True:
            return _hold("HOLD_OWNER_OR_INDEPENDENT_REVIEWER")
        if claim_chain(**opts) is not True:
            return _hold("HOLD_CHAIN_REPLAY_OR_DURABLE_STORAGE")
    except (OSError, ValueError, TypeError, sqlite3.Error):
        return _hold("HOLD_PROTECTED_CHAIN_REVIEW_FAILED")
    return {
        **_hold("SOURCE_COMMS_SIGNED_CHAIN_REVIEWED_NOT_CONNECTED"),
        "accepted": True,
        "sourceRevision": AIHUB306_MAIN,
        "commsRevision": COMMS_QL413_MAIN,
        "episodeId": source["episodeId"],
        "sourceEnvelopeSha256": source_digest,
        "commsAckSha256": comms_digest,
        "ackDecision": "RECEIVED_FOR_INDEPENDENT_REVIEW",
        "transportSent": False,
        "commsReceiverEnabled": False,
    }


def prepare_ai_data_uptime_exchange307(
    root: Path,
    monitor: PersistentReeMonitor304,
    signed_field_review: Any,
    *,
    reviewer_public_der: bytes | None,
    independent_reviewer_pin: str,
    release_owner_authorize: Callable[..., bool] | None,
    receipt_id: str,
    original_host_sign: Callable[..., str] | None,
    source_public_der: bytes | None,
    independently_pinned_source_sha256: str,
    owner_authorize: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Prepare a source-only QL-413-compatible receipt. Never transmit it.

    The signing callback is provided by protected host authority; this code
    neither finds a key on disk nor creates a new key or Windows task.
    """
    if not _ree_monitor_ready(monitor):
        return _hold("HOLD_ORIGINAL_HOST_HISTORY_OR_RELEASE_REVIEW")
    installed_release_review = review_installed_306_on_ree307(
        root,
        monitor,
        signed_field_review,
        reviewer_public_der=reviewer_public_der,
        independent_reviewer_pin=independent_reviewer_pin,
        owner_authorize=release_owner_authorize,
        now_ms=now_ms,
    )
    if (
        installed_release_review.get("accepted") is not True
        or installed_release_review.get("sourceRevision") != AIHUB306_MAIN
        or installed_release_review.get("reviewBuild") != 307
        or not isinstance(installed_release_review.get("reviewSha256"), str)
        or not HEX64.fullmatch(installed_release_review["reviewSha256"])
        or not isinstance(receipt_id, str)
        or not EPISODE.fullmatch(receipt_id)
        or len(receipt_id) < 12
        or not callable(original_host_sign)
        or not callable(owner_authorize)
    ):
        return _hold("HOLD_SIGNER_REVIEW_OR_OWNER_GATE")
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if type(now) is not int or now < 0:
        return _hold("HOLD_INVALID_RECEIPT_TIME")
    trend = monitor.ledger.observed_daily_trend306(now) if monitor.ledger is not None else None
    if not isinstance(trend, list) or not trend:
        return _hold("HOLD_NO_DURABLE_REE_UPTIME_TREND")
    try:
        if (
            owner_authorize(
                source_id=SOURCE,
                source_revision=AIHUB306_MAIN,
                receipt_id=receipt_id,
                field_review_sha256=installed_release_review["reviewSha256"],
            )
            is not True
        ):
            return _hold("HOLD_OWNER_NOT_AUTHORIZED_FOR_ONE_RECEIPT")
    except (OSError, TypeError, ValueError):
        return _hold("HOLD_OWNER_AUTHORITY_UNAVAILABLE")
    from rosevear_ai_hub.master_shell_acceptance305 import _utc

    payload = {
        "schema": QL413_SCHEMA,
        "sourceId": SOURCE,
        "hostId": ORIGINAL_HOST,
        "revision": AIHUB306_MAIN,
        "issuedAt": _utc(now),
        "receiptId": receipt_id,
        # A signed source claim is not independent receiver or master acceptance.
        "evidence": {
            "installedRelease": "VERIFIED",
            "persistentHistory": "VERIFIED",
            "signedTelemetry": "HOLD",
            "replayProtection": "HOLD",
            "incidentAcceptance": "HOLD",
        },
    }
    try:
        signature = original_host_sign(payload=payload)
    except (OSError, TypeError, ValueError):
        return _hold("HOLD_PROTECTED_SIGNER_FAILED")
    if not _trusted_signature(
        payload, signature, source_public_der, independently_pinned_source_sha256
    ):
        return _hold("HOLD_SOURCE_SIGNATURE_NOT_INDEPENDENTLY_VERIFIED")
    return {
        **_hold("SOURCE_SIGNED_QL413_METADATA_READY_NOT_TRANSMITTED"),
        "accepted": True,
        "signedReceipt": {"payload": payload, "signature": signature},
        "receiptSha256": hashlib.sha256(_serialize(payload)).hexdigest(),
        "uptimeTrendSha256": hashlib.sha256(_serialize({"days": trend})).hexdigest(),
        "observedDays": len(trend),
        "transportSent": False,
        "aiDataAcknowledged": False,
        "commsAcknowledged": False,
    }


def reconcile_master_evidence307(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Read-only UI projection; never represent unimported evidence as accepted."""
    base = reconcile_three_master_uptime306(monitor)
    return {
        **base,
        "schema": "rosevear.ai-hub.master360-three-master-acceptance307.v1",
        "sourceBuild": 307,
        "expectedInstalledRevision306": AIHUB306_MAIN,
        "commsMainQl413AtReconciliation": COMMS_QL413_MAIN,
        "aiDataMain366AtReconciliation": AIDATA_366_MAIN_AT_RECONCILIATION,
        "originalHostFieldReview": "HOLD_NO_INDEPENDENT_BUILD306_PROCESS_REVIEW",
        "sourceCommsOneReceiptChain": "HOLD_NO_AUTHENTICATED_RECEIVER_ACK",
        "aiDataUptimeExchange": "HOLD_NO_ORIGINAL_HOST_SIGNED_RECEIPT_ACCEPTED_BY_CONTROLLER",
        "protectedReceiptSchema": QL413_SCHEMA,
        "commsQl414AckSchema": "PROPOSED_NOT_INSTALLED",
        "newWindowsScheduledTasks": 0,
        "receiver": "OFF",
        "connection": "HOLD",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }
