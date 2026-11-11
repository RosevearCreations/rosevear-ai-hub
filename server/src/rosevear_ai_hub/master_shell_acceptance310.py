# fmt: off
# ruff: noqa: E501, I001
"""Build 310: supervised original-host adoption, one-TEST export audit and owner gate.

No network sender, receiver, key enrollment, task, or Master connection actuator.
All privileged callbacks must be independently implemented on the original host.
"""
import hashlib
import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _timestamp
from rosevear_ai_hub.master_shell_acceptance306 import (
    EPISODE,
    HEX64,
    _trusted_signature,
    review_original_owner_release306,
)
from rosevear_ai_hub.master_shell_acceptance308 import (
    CORRELATION,
    OPERATION,
    _hold,
    _on_ree,
    _valid_source,
)
from rosevear_ai_hub.master_shell_acceptance309 import reconcile_master_evidence309
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE = "rosevear-ai-hub"
HOST = "DESKTOP-AE894KC"
SOURCE309 = "0a94c72ee4a1ded1babeac68deeb981ad33835ef"
AIDATA373 = "2e5405519b5c96a7bbd803688a099eae300dde31"
COMMS417 = "6cd77dc4f5eb5f6c7a97d3155532a51e8e4c81f6"
DECISION_SCHEMA = "rosevear.ai-data-platform.master360.owner-review310.v1"


def _sha(value: Any) -> bool:
    return isinstance(value, str) and HEX64.fullmatch(value) is not None


def _episode(value: Any) -> bool:
    return isinstance(value, str) and EPISODE.fullmatch(value) is not None


def _corr(value: Any) -> bool:
    return isinstance(value, str) and CORRELATION.fullmatch(value) is not None


class ProtectedOneTestExportAudit310:
    """Append-only-by-stage hash metadata journal; never store source envelopes.

    Construct with the original host's private application-data location. The
    original-host gate is repeated for every read/write. This has no sender.
    """

    def __init__(self, path: Path) -> None:
        self.path = path

    @staticmethod
    def _valid(monitor: PersistentReeMonitor304, episode: str, correlation: str,
               source_digest: str) -> bool:
        return (
            _on_ree(monitor) and _episode(episode) and _corr(correlation)
            and _sha(source_digest)
        )

    def claim_prepared(self, monitor: PersistentReeMonitor304, *,
                       episode: str, correlation: str, source_digest: str,
                       field_review_digest: str) -> bool:
        if not self._valid(monitor, episode, correlation, source_digest) or not _sha(field_review_digest):
            return False
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA busy_timeout=2000")
                db.execute("BEGIN IMMEDIATE")
                db.execute("""CREATE TABLE IF NOT EXISTS one_test_export310 (
                    episode TEXT PRIMARY KEY, correlation TEXT UNIQUE NOT NULL,
                    source_digest TEXT NOT NULL, field_review_digest TEXT NOT NULL,
                    stage TEXT NOT NULL CHECK(stage IN ('PREPARED','TRANSPORT_WITNESSED')),
                    transport_digest TEXT
                )""")
                result = db.execute(
                    "INSERT OR IGNORE INTO one_test_export310 VALUES (?,?,?,?, 'PREPARED', NULL)",
                    (episode, correlation, source_digest, field_review_digest),
                )
                return result.rowcount == 1
        except (OSError, sqlite3.Error):
            return False

    def attest_transport(self, monitor: PersistentReeMonitor304, *,
                         episode: str, correlation: str, source_digest: str,
                         transport_digest: str) -> bool:
        if not self._valid(monitor, episode, correlation, source_digest) or not _sha(transport_digest):
            return False
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA busy_timeout=2000")
                db.execute("BEGIN IMMEDIATE")
                result = db.execute(
                    """UPDATE one_test_export310 SET stage='TRANSPORT_WITNESSED',
                       transport_digest=? WHERE episode=? AND correlation=?
                       AND source_digest=? AND stage='PREPARED'""",
                    (transport_digest, episode, correlation, source_digest),
                )
                return result.rowcount == 1
        except (OSError, sqlite3.Error):
            return False

    def exact_witness(self, monitor: PersistentReeMonitor304, *,
                      episode: str, correlation: str, source_digest: str,
                      transport_digest: str) -> bool:
        if not self._valid(monitor, episode, correlation, source_digest) or not _sha(transport_digest):
            return False
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                row = db.execute(
                    """SELECT transport_digest FROM one_test_export310
                       WHERE episode=? AND correlation=? AND source_digest=?
                       AND stage='TRANSPORT_WITNESSED'""",
                    (episode, correlation, source_digest),
                ).fetchone()
                return row is not None and row[0] == transport_digest
        except (OSError, sqlite3.Error):
            return False


def review_installed_309_on_ree310(
    root: Path, monitor: PersistentReeMonitor304, signed_field_review: Any, *,
    reviewer_public_der: bytes | None, independent_reviewer_pin: str,
    owner_authorize: Callable[..., bool] | None, now_ms: int | None = None,
) -> dict[str, object]:
    """Adoption is the actual installed Build 309 process, not CI GREEN."""
    result = review_original_owner_release306(
        root, monitor, signed_field_review,
        reviewer_public_der=reviewer_public_der,
        independent_reviewer_pin=independent_reviewer_pin,
        expected_installed_revision=SOURCE309,
        owner_authorize=owner_authorize, now_ms=now_ms,
    )
    return {**result, "reviewBuild": 310, "requiredInstalledRevision": SOURCE309}


def prepare_supervised_export310(
    root: Path, monitor: PersistentReeMonitor304, signed_field_review: Any,
    source_envelope: Any, *, audit: ProtectedOneTestExportAudit310,
    reviewer_public_der: bytes | None, independent_reviewer_pin: str,
    release_owner_authorize: Callable[..., bool] | None,
    source_public_der: bytes | None, independently_pinned_source_sha256: str,
    source_import_claimed: Callable[..., bool] | None,
    export_owner_authorize: Callable[..., bool] | None,
    independent_export_reviewer_approve: Callable[..., bool] | None,
    correlation_id: str, now_ms: int | None = None,
) -> dict[str, object]:
    """Prepare and durably claim one *unsent* metadata-only QL-414 export."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if type(now) is not int or not _on_ree(monitor) or not _corr(correlation_id):
        return _hold("HOLD_REE_HOST_OR_CORRELATION")
    if not isinstance(audit, ProtectedOneTestExportAudit310) or not all(
        callable(fn) for fn in (
            source_import_claimed, export_owner_authorize, independent_export_reviewer_approve
        )
    ):
        return _hold("HOLD_PRIVATE_AUDIT_AUTHORITIES")
    field = review_installed_309_on_ree310(
        root, monitor, signed_field_review, reviewer_public_der=reviewer_public_der,
        independent_reviewer_pin=independent_reviewer_pin,
        owner_authorize=release_owner_authorize, now_ms=now,
    )
    if field.get("accepted") is not True:
        return _hold("HOLD_ORIGINAL_HOST_BUILD309_FIELD_ADOPTION")
    if not _valid_source(
        source_envelope, now, source_public_der,
        independently_pinned_source_sha256, expected_revision=SOURCE309,
    ):
        return _hold("HOLD_SOURCE309_SIGNATURE_REVISION_OR_FRESHNESS")
    body = source_envelope["payload"]
    digest = hashlib.sha256(_serialize(body)).hexdigest()
    args = {
        "source_id": SOURCE, "source_revision": SOURCE309,
        "episode_id": body["episodeId"], "correlation_id": correlation_id,
        "source_digest": digest, "field_review_digest": field["reviewSha256"],
    }
    try:
        authorized = (
            source_import_claimed(
                source_id=SOURCE, episode_id=body["episodeId"], envelope_sha256=digest
            ) is True
            and export_owner_authorize(**args) is True
            and independent_export_reviewer_approve(**args) is True
        )
    except (OSError, ValueError, TypeError):
        authorized = False
    if not authorized:
        return _hold("HOLD_SOURCE_IMPORT_OR_OWNER_EXPORT_APPROVAL")
    if not audit.claim_prepared(
        monitor, episode=body["episodeId"], correlation=correlation_id,
        source_digest=digest, field_review_digest=field["reviewSha256"],
    ):
        return _hold("HOLD_DUPLICATE_OR_UNAVAILABLE_PRIVATE_EXPORT_LEDGER")
    return {
        **_hold("PREPARED_SUPERVISED_ONE_TEST_NOT_TRANSMITTED"),
        "accepted": True,
        "sourceRevision": SOURCE309,
        "episodeId": body["episodeId"],
        "correlationId": correlation_id,
        "sourcePayloadSha256": digest,
        "fieldReviewSha256": field["reviewSha256"],
        "request": {"operation": OPERATION, "correlationId": correlation_id, "envelope": source_envelope},
        "transportSent": False, "commsAcknowledged": False, "mastersSynced": False,
    }


def attest_external_transport310(
    monitor: PersistentReeMonitor304, prepared: Any, *, audit: ProtectedOneTestExportAudit310,
    protected_transport_witness: Callable[..., bool] | None,
    transport_receipt_digest: str,
) -> dict[str, object]:
    """Record an *external* one-TEST send, never perform transport ourselves.

    A caller's receipt digest is not proof until a separate private transport
    witness corroborates it. This does not certify a Comms receiver ACK.
    """
    if (
        not _on_ree(monitor) or not isinstance(audit, ProtectedOneTestExportAudit310)
        or not callable(protected_transport_witness) or not _sha(transport_receipt_digest)
        or not isinstance(prepared, dict) or prepared.get("accepted") is not True
        or prepared.get("state") != "PREPARED_SUPERVISED_ONE_TEST_NOT_TRANSMITTED"
        or prepared.get("sourceRevision") != SOURCE309
        or prepared.get("transportSent") is not False
        or prepared.get("connection") != "HOLD"
        or not _episode(prepared.get("episodeId"))
        or not _corr(prepared.get("correlationId"))
        or not _sha(prepared.get("sourcePayloadSha256"))
    ):
        return _hold("HOLD_INVALID_UNSENT_EXPORT_OR_TRANSPORT_AUTHORITY")
    args = {
        "source_id": SOURCE, "source_revision": SOURCE309,
        "episode_id": prepared["episodeId"], "correlation_id": prepared["correlationId"],
        "source_digest": prepared["sourcePayloadSha256"],
        "transport_digest": transport_receipt_digest,
    }
    try:
        authenticated = protected_transport_witness(**args) is True
    except (OSError, ValueError, TypeError):
        authenticated = False
    if not authenticated or not audit.attest_transport(
        monitor, episode=args["episode_id"], correlation=args["correlation_id"],
        source_digest=args["source_digest"], transport_digest=args["transport_digest"],
    ):
        return _hold("HOLD_TRANSPORT_NOT_WITNESSED_OR_REPLAY")
    return {
        **_hold("EXTERNAL_ONE_TEST_TRANSPORT_WITNESSED_ACK_UNVERIFIED"),
        "accepted": True, "sourceRevision": SOURCE309,
        "episodeId": args["episode_id"], "correlationId": args["correlation_id"],
        "sourcePayloadSha256": args["source_digest"],
        "transportReceiptSha256": transport_receipt_digest,
        "receiverAckVerified": False, "controllerApproved": False, "mastersSynced": False,
    }


def reconcile_controller_owner_decision310(
    monitor: PersistentReeMonitor304, transport: Any,
    signed_controller_decision: Any, *, audit: ProtectedOneTestExportAudit310,
    controller_public_der: bytes | None, independently_pinned_controller_sha256: str,
    independently_attest_controller_ledger: Callable[..., bool] | None,
    owner_review_authorize: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Verify a separately signed controller owner review, never grant a connection.

    This prospective decision envelope is a proposed integration contract.
    Only a genuinely deployed AI Data controller may produce authoritative proof.
    """
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if (
        type(now) is not int or not _on_ree(monitor)
        or not isinstance(audit, ProtectedOneTestExportAudit310)
        or not callable(independently_attest_controller_ledger)
        or not callable(owner_review_authorize)
        or not isinstance(transport, dict)
        or transport.get("accepted") is not True
        or transport.get("state") != "EXTERNAL_ONE_TEST_TRANSPORT_WITNESSED_ACK_UNVERIFIED"
        or transport.get("connection") != "HOLD"
        or not isinstance(signed_controller_decision, dict)
        or set(signed_controller_decision) != {"payload", "signature"}
    ):
        return _hold("HOLD_CONTROLLER_AUTHORITY_OR_EXPORT_MISSING")
    body = signed_controller_decision["payload"]
    fields = {
        "schema", "controller", "controllerRevision", "commsRevision",
        "sourceId", "sourceRevision", "hostId", "episodeId", "correlationId",
        "sourcePayloadSha256", "transportReceiptSha256",
        "receiverAckSha256", "ql416ReviewSha256",
        "decision", "connection", "mastersSynced", "decidedAt",
    }
    if not isinstance(body, dict) or set(body) != fields:
        return _hold("HOLD_CONTROLLER_DECISION_SCHEMA")
    captured = _timestamp(body["decidedAt"])
    if (
        body["schema"] != DECISION_SCHEMA
        or body["controller"] != "ai-data-platform"
        or body["controllerRevision"] != AIDATA373
        or body["commsRevision"] != COMMS417
        or body["sourceId"] != SOURCE or body["sourceRevision"] != SOURCE309
        or body["hostId"] != HOST
        or body["episodeId"] != transport.get("episodeId")
        or body["correlationId"] != transport.get("correlationId")
        or body["sourcePayloadSha256"] != transport.get("sourcePayloadSha256")
        or body["transportReceiptSha256"] != transport.get("transportReceiptSha256")
        or not _sha(body["receiverAckSha256"]) or not _sha(body["ql416ReviewSha256"])
        or body["decision"] not in ("HOLD", "OWNER_REVIEWED_NO_ACTIVATION")
        or body["connection"] != "HOLD" or body["mastersSynced"] is not False
        or captured is None or not 0 <= now - captured <= 5 * 60_000
    ):
        return _hold("HOLD_CONTROLLER_DECISION_MISMATCH_OR_STALE")
    if not _trusted_signature(
        body, signed_controller_decision["signature"],
        controller_public_der, independently_pinned_controller_sha256,
    ) or not audit.exact_witness(
        monitor, episode=body["episodeId"], correlation=body["correlationId"],
        source_digest=body["sourcePayloadSha256"],
        transport_digest=body["transportReceiptSha256"],
    ):
        return _hold("HOLD_INDEPENDENT_CONTROLLER_SIGNATURE_OR_EXPORT_AUDIT")
    digest = hashlib.sha256(_serialize(body)).hexdigest()
    args = {
        "controller_revision": AIDATA373,
        "source_revision": SOURCE309,
        "episode_id": body["episodeId"], "correlation_id": body["correlationId"],
        "decision_digest": digest, "source_digest": body["sourcePayloadSha256"],
        "receiver_ack_digest": body["receiverAckSha256"],
        "ql416_digest": body["ql416ReviewSha256"],
    }
    try:
        authenticated = (
            independently_attest_controller_ledger(**args) is True
            and owner_review_authorize(**args) is True
        )
    except (OSError, ValueError, TypeError):
        authenticated = False
    if not authenticated:
        return _hold("HOLD_CONTROLLER_LEDGER_OR_OWNER_AUTHORIZATION")
    return {
        **_hold("CONTROLLER_OWNER_REVIEW_RECONCILED_NOT_CONNECTED"),
        "accepted": True, "decision": body["decision"],
        "controllerRevision": AIDATA373, "commsRevision": COMMS417,
        "episodeId": body["episodeId"], "correlationId": body["correlationId"],
        "decisionSha256": digest, "receiverAckVerified": False,
        "mastersSynced": False, "controllerApprovedForConnection": False,
    }


def reconcile_master_evidence310(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Static fail-closed UI projection, never a locally inferred admission."""
    state = reconcile_master_evidence309(monitor)
    return {
        **state,
        "schema": "rosevear.ai-hub.master360-field-adoption310.v1",
        "sourceBuild": 310,
        "installedRelease309Expected": SOURCE309,
        "commsQl417AtReconciliation": COMMS417,
        "aiDataBuild373AtReconciliation": AIDATA373,
        "originalHostAdoption": "HOLD_NO_INDEPENDENT_SIGNED_BUILD309_FIELD_REVIEW",
        "oneTestExportAudit": "HOLD_NO_AUTHENTICATED_PROTECTED_TRANSPORT_RECEIPT",
        "controllerReview": "HOLD_NO_SIGNED_AI_DATA_OWNER_DECISION",
        "receiver": "OFF", "connection": "HOLD", "masterSync": "HOLD",
        "newWindowsScheduledTasks": 0,
    }
