"""Build 308: Ree-host release handoff and actual Comms QL-414 ACK contract.

Protected, explicitly invoked helpers only. No HTTP sender, signer enrollment,
Windows scheduler, receiver activation, or connection-state mutation.
"""

import hashlib
import platform
import re
import socket
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
    _ree_monitor_ready,
    _trusted_signature,
    reconcile_three_master_uptime306,
    review_original_owner_release306,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304
from rosevear_ai_hub.master_shell_uptime303 import ORIGINAL_HOST

SOURCE = "rosevear-ai-hub"
AIHUB307_MAIN = "34e017dcf0586a7281d8726d5e8fb4a4a7054526"
COMMS_QL414_MAIN = "182fe951379605cbb909e7072009b59c9e498126"
COMMS_QL415_MAIN_AT_RECONCILIATION = "8c2d488582801e8abc5ca718b4719c615863274c"
AIDATA_367_MAIN_AT_RECONCILIATION = "ff7ac9aea87e6d2e1d9ebc8d29b2fd784f901f01"
CONTROLLER_360 = "4b45b435fa7b6fc83b94e31556648fe4190a9f53"
ACK_SCHEMA = "rosevear.master360.ql414.receiver-ack.v1"
OPERATION = "MASTER360_ONE_TEST_READ_ONLY"
CORRELATION = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{11,95}\Z")
ACK_KEYS = (
    "schema",
    "operation",
    "sourceId",
    "hostId",
    "sourceRevision",
    "sourceEpisodeId",
    "correlationId",
    "receivedAt",
    "receiverKeyId",
    "sourcePayloadSha256",
    "decision",
    "connection",
)
SOURCE_KEYS = (
    "schema",
    "sourceId",
    "hostId",
    "sourceRevision",
    "capturedAt",
    "episodeId",
    "samples",
)
MASTER_SOURCES = ("ai-data-platform", "rosevear-comms-hub", "rosevear-ai-hub")
MASTER_RECEIPT_KEYS = (
    "schema",
    "sourceId",
    "hostId",
    "revision",
    "issuedAt",
    "receiptId",
    "evidence",
)
MASTER_EVIDENCE_AXES = (
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


def _on_ree(monitor: PersistentReeMonitor304) -> bool:
    return (
        platform.system() == "Windows"
        and socket.gethostname().upper() == ORIGINAL_HOST
        and _ree_monitor_ready(monitor)
    )


def review_installed_307_on_ree308(
    root: Path,
    monitor: PersistentReeMonitor304,
    signed_review: Any,
    *,
    reviewer_public_der: bytes | None,
    independent_reviewer_pin: str,
    owner_authorize: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Independent TEMPLAR field proof must match *installed* Build 307."""
    result = review_original_owner_release306(
        root,
        monitor,
        signed_review,
        reviewer_public_der=reviewer_public_der,
        independent_reviewer_pin=independent_reviewer_pin,
        expected_installed_revision=AIHUB307_MAIN,
        owner_authorize=owner_authorize,
        now_ms=now_ms,
    )
    return {**result, "reviewBuild": 308, "requiredInstalledRevision": AIHUB307_MAIN}


def _valid_source(
    envelope: Any,
    now: int,
    source_public_der: bytes | None,
    pin: str,
    *,
    expected_revision: str = AIHUB307_MAIN,
) -> bool:
    if (
        not isinstance(envelope, dict)
        or set(envelope) != {"payload", "signature"}
        or not isinstance(envelope["payload"], dict)
    ):
        return False
    p = envelope["payload"]
    captured = _timestamp(p.get("capturedAt"))
    return bool(
        list(p) == list(SOURCE_KEYS)
        and p["schema"] == COMMS_SCHEMA
        and p["sourceId"] == SOURCE
        and p["hostId"] == ORIGINAL_HOST
        and p["sourceRevision"] == expected_revision
        and isinstance(p["episodeId"], str)
        and EPISODE.fullmatch(p["episodeId"])
        and captured is not None
        and 0 <= now - captured <= 300_000
        and _strict_samples(p["samples"], now_ms=captured) is not None
        and _trusted_signature(p, envelope["signature"], source_public_der, pin)
    )


def _field_accepted(
    root: Path,
    monitor: PersistentReeMonitor304,
    signed_field_review: Any,
    reviewer_public_der: bytes | None,
    independent_reviewer_pin: str,
    release_owner_authorize: Callable[..., bool] | None,
    now: int,
) -> bool:
    return (
        review_installed_307_on_ree308(
            root,
            monitor,
            signed_field_review,
            reviewer_public_der=reviewer_public_der,
            independent_reviewer_pin=independent_reviewer_pin,
            owner_authorize=release_owner_authorize,
            now_ms=now,
        ).get("accepted")
        is True
    )


def prepare_ql414_one_test_request308(
    root: Path,
    monitor: PersistentReeMonitor304,
    signed_field_review: Any,
    source_envelope: Any,
    *,
    reviewer_public_der: bytes | None,
    independent_reviewer_pin: str,
    release_owner_authorize: Callable[..., bool] | None,
    source_public_der: bytes | None,
    independently_pinned_source_sha256: str,
    source_import_claimed: Callable[..., bool] | None,
    owner_authorize_one_test: Callable[..., bool] | None,
    independent_reviewer_approve: Callable[..., bool] | None,
    correlation_id: str,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Prepare the real QL-414 in-process request; NEVER transmit it.

    The original-source episode must already have a durable Build 306 import.
    Merely constructing a request is not receiver acceptance or operation.
    """
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not _on_ree(monitor) or type(now) is not int:
        return _hold("HOLD_NOT_ORIGINAL_REE_HOST_WITH_MONITOR")
    if not all(
        callable(x)
        for x in (source_import_claimed, owner_authorize_one_test, independent_reviewer_approve)
    ):
        return _hold("HOLD_MISSING_PROTECTED_ORIGINAL_HOST_AUTHORITIES")
    if not isinstance(correlation_id, str) or not CORRELATION.fullmatch(correlation_id):
        return _hold("HOLD_QL414_CORRELATION_FORMAT")
    if not _field_accepted(
        root,
        monitor,
        signed_field_review,
        reviewer_public_der,
        independent_reviewer_pin,
        release_owner_authorize,
        now,
    ):
        return _hold("HOLD_INSTALLED_BUILD307_OWNER_REVIEW")
    if not _valid_source(
        source_envelope, now, source_public_der, independently_pinned_source_sha256
    ):
        return _hold("HOLD_SOURCE_SIGNED_QL411_REVISION_OR_FRESHNESS")
    p = source_envelope["payload"]
    digest = hashlib.sha256(_serialize(p)).hexdigest()
    args = {
        "source_id": SOURCE,
        "source_revision": AIHUB307_MAIN,
        "episode_id": p["episodeId"],
        "envelope_sha256": digest,
        "correlation_id": correlation_id,
    }
    try:
        if (
            source_import_claimed(
                source_id=SOURCE, episode_id=p["episodeId"], envelope_sha256=digest
            )
            is not True
            or owner_authorize_one_test(**args) is not True
            or independent_reviewer_approve(**args) is not True
        ):
            return _hold("HOLD_IMPORT_OR_INDEPENDENT_ONE_TEST_AUTHORITY")
    except (OSError, TypeError, ValueError):
        return _hold("HOLD_PROTECTED_ONE_TEST_AUTHORITY_FAILED")
    return {
        **_hold("QL414_REQUEST_PREPARED_NOT_TRANSMITTED"),
        "accepted": True,
        "request": {
            "operation": OPERATION,
            "correlationId": correlation_id,
            "envelope": source_envelope,
        },
        "sourceEnvelopeSha256": digest,
        "sourceRevision": AIHUB307_MAIN,
        "transportSent": False,
        "commsAcknowledged": False,
    }


def verify_ql414_receiver_ack308(
    monitor: PersistentReeMonitor304,
    source_envelope: Any,
    comms_ack: Any,
    *,
    source_public_der: bytes | None,
    independently_pinned_source_sha256: str,
    receiver_public_der: bytes | None,
    independently_pinned_receiver_sha256: str,
    expected_receiver_key_id: str,
    correlation_id: str,
    source_import_claimed: Callable[..., bool] | None,
    protected_transport_attest: Callable[..., bool] | None,
    owner_authorize: Callable[..., bool] | None,
    independent_reviewer_approve: Callable[..., bool] | None,
    claim_chain: Callable[..., bool] | None,
    expected_source_revision: str = AIHUB307_MAIN,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Validate authentic QL-414 SHA/episode/correlation and claim durable chain.

    The receiver signature is distinct from the source signature; neither
    authorizes CONNECTED, AI Data acceptance, nor Windows recovery.
    """
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not _on_ree(monitor) or type(now) is not int:
        return _hold("HOLD_NOT_ORIGINAL_REE_HOST_WITH_MONITOR")
    if not all(
        callable(x)
        for x in (
            source_import_claimed,
            protected_transport_attest,
            owner_authorize,
            independent_reviewer_approve,
            claim_chain,
        )
    ):
        return _hold("HOLD_INDEPENDENT_RUNTIME_AUTHORITY_MISSING")
    if not _valid_source(
        source_envelope,
        now,
        source_public_der,
        independently_pinned_source_sha256,
        expected_revision=expected_source_revision,
    ):
        return _hold("HOLD_INVALID_SIGNED_SOURCE_ENVELOPE")
    if not isinstance(comms_ack, dict) or set(comms_ack) != {"payload", "signature"}:
        return _hold("HOLD_MISSING_INDEPENDENT_COMMS_SIGNATURE")
    p, ack = source_envelope["payload"], comms_ack["payload"]
    if not isinstance(ack, dict) or set(ack) != set(ACK_KEYS):
        return _hold("HOLD_ACTUAL_QL414_ACK_SCHEMA_MISMATCH")
    when = _timestamp(ack["receivedAt"])
    source_digest = hashlib.sha256(_serialize(p)).hexdigest()
    if (
        ack["schema"] != ACK_SCHEMA
        or ack["operation"] != OPERATION
        or ack["sourceId"] != SOURCE
        or ack["hostId"] != ORIGINAL_HOST
        or ack["sourceRevision"] != expected_source_revision
        or ack["sourceEpisodeId"] != p["episodeId"]
        or ack["sourcePayloadSha256"] != source_digest
        or ack["connection"] != "HOLD"
        or ack["decision"] != "METADATA_VERIFIED_FOR_OWNER_REVIEW"
        or not isinstance(expected_receiver_key_id, str)
        or not CORRELATION.fullmatch(expected_receiver_key_id)
        or ack["receiverKeyId"] != expected_receiver_key_id
        or not isinstance(correlation_id, str)
        or not CORRELATION.fullmatch(correlation_id)
        or ack["correlationId"] != correlation_id
        or when is None
        or not _timestamp(p["capturedAt"]) <= when <= now
        or now - when > 300_000
    ):
        return _hold("HOLD_ACK_REVISION_EPISODE_DIGEST_CORRELATION_OR_FRESHNESS")
    if not _trusted_signature(
        ack, comms_ack["signature"], receiver_public_der, independently_pinned_receiver_sha256
    ):
        return _hold("HOLD_INDEPENDENT_COMMS_SIGNER_PIN_MISMATCH")
    ack_digest = hashlib.sha256(_serialize(ack)).hexdigest()
    args = {
        "source_id": SOURCE,
        "source_revision": expected_source_revision,
        "episode_id": p["episodeId"],
        "source_digest": source_digest,
        "comms_digest": ack_digest,
        "correlation_id": correlation_id,
    }
    try:
        if (
            source_import_claimed(
                source_id=SOURCE, episode_id=p["episodeId"], envelope_sha256=source_digest
            )
            is not True
            or protected_transport_attest(**args) is not True
            or owner_authorize(**args) is not True
            or independent_reviewer_approve(**args) is not True
            or claim_chain(
                episode_id=p["episodeId"], source_digest=source_digest, comms_digest=ack_digest
            )
            is not True
        ):
            return _hold("HOLD_TRANSPORT_OWNER_REVIEW_OR_DURABLE_REPLAY")
    except (OSError, ValueError, TypeError):
        return _hold("HOLD_PROTECTED_RECEIVER_REVIEW_FAILED")
    return {
        **_hold("SIGNED_QL414_SOURCE_RECEIVER_CHAIN_REVIEWED_NOT_CONNECTED"),
        "accepted": True,
        "sourceRevision": expected_source_revision,
        "commsContractRevision": COMMS_QL414_MAIN,
        "episodeId": p["episodeId"],
        "correlationId": correlation_id,
        "sourceEnvelopeSha256": source_digest,
        "receiverAckSha256": ack_digest,
        "uptime": "ORIGINAL_HOST_SIGNED_SAMPLES_ONLY",
        "aiDataAccepted": False,
    }


def review_three_master_receipts308(
    monitor: PersistentReeMonitor304,
    receipts: Any,
    *,
    pinned_public_der: dict[str, bytes],
    independent_pins_sha256: dict[str, str],
    owner_authorize: Callable[..., bool] | None,
    independent_reviewer_approve: Callable[..., bool] | None,
    atomic_claim_batch: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Review exact QL-413 receipts from all three masters, never sync them.

    All pins, revision expectations and atomic replay authority come from the
    independently authenticated original-host runtime, NOT receipt metadata.
    This cannot establish the separate QL-415 operational runtime proof.
    """
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not _on_ree(monitor) or type(now) is not int:
        return _hold("HOLD_NOT_ORIGINAL_REE_HOST_WITH_MONITOR")
    if not all(
        callable(x) for x in (owner_authorize, independent_reviewer_approve, atomic_claim_batch)
    ):
        return _hold("HOLD_MASTER_INDEPENDENT_RUNTIME_AUTHORITIES")
    if not isinstance(receipts, list) or len(receipts) != 3:
        return _hold("HOLD_REQUIRE_ALL_THREE_MASTER_RECEIPTS")
    if not isinstance(pinned_public_der, dict) or not isinstance(independent_pins_sha256, dict):
        return _hold("HOLD_INDEPENDENT_MASTER_PINS_NOT_ENROLLED")
    expected = {
        "rosevear-ai-hub": AIHUB307_MAIN,
        "rosevear-comms-hub": COMMS_QL415_MAIN_AT_RECONCILIATION,
        "ai-data-platform": AIDATA_367_MAIN_AT_RECONCILIATION,
    }
    observed: dict[str, dict[str, Any]] = {}
    claims: list[str] = []
    for item in receipts:
        if not isinstance(item, dict) or set(item) != {"payload", "signature"}:
            return _hold("HOLD_UNTRUSTED_MASTER_RECEIPT_ENVELOPE")
        payload = item["payload"]
        if not isinstance(payload, dict) or set(payload) != set(MASTER_RECEIPT_KEYS):
            return _hold("HOLD_QL413_MASTER_RECEIPT_SCHEMA")
        source_id = payload["sourceId"]
        if (
            not isinstance(source_id, str)
            or source_id not in MASTER_SOURCES
            or source_id in observed
        ):
            return _hold("HOLD_DUPLICATE_OR_FOREIGN_MASTER")
        evidence = payload["evidence"]
        when = _timestamp(payload["issuedAt"])
        receipt_id = payload["receiptId"]
        if (
            payload["schema"] != "rosevear.master360.protected-receipt.v1"
            or payload["revision"] != expected[source_id]
            or payload["hostId"]
            != (ORIGINAL_HOST if source_id == SOURCE else "PROTECTED_MASTER_RUNTIME")
            or when is None
            or not 0 <= now - when <= 300_000
            or not isinstance(receipt_id, str)
            or not CORRELATION.fullmatch(receipt_id)
            or not isinstance(evidence, dict)
            or set(evidence) != set(MASTER_EVIDENCE_AXES)
            or any(evidence[axis] not in ("VERIFIED", "HOLD") for axis in MASTER_EVIDENCE_AXES)
            or not _trusted_signature(
                payload,
                item["signature"],
                pinned_public_der.get(source_id),
                independent_pins_sha256.get(source_id, ""),
            )
        ):
            return _hold("HOLD_MASTER_REVISION_FRESHNESS_PIN_OR_EVIDENCE")
        observed[source_id] = payload
        claims.append(f"master360:{source_id}:{receipt_id}")
    if len(observed) != 3:
        return _hold("HOLD_MISSING_DISTINCT_MASTER_RECEIPT")
    digest = hashlib.sha256(_serialize({"receipts": sorted(claims)})).hexdigest()
    try:
        if (
            owner_authorize(batch_sha256=digest) is not True
            or independent_reviewer_approve(batch_sha256=digest) is not True
            or atomic_claim_batch(replay_keys=tuple(sorted(claims)), batch_sha256=digest)
            is not True
        ):
            return _hold("HOLD_OWNER_REVIEW_OR_DURABLE_MASTER_RECEIPT_REPLAY")
    except (OSError, TypeError, ValueError):
        return _hold("HOLD_PROTECTED_MASTER_RECEIPT_REVIEW_FAILED")
    return {
        **_hold("SIGNED_THREE_MASTER_RECEIPTS_REVIEWED_NOT_CONNECTED"),
        "accepted": True,
        "receiptCount": 3,
        "batchSha256": digest,
        "allClaimedEvidenceVerified": all(
            all(payload["evidence"][axis] == "VERIFIED" for axis in MASTER_EVIDENCE_AXES)
            for payload in observed.values()
        ),
        "independentRuntimeAcceptance": "HOLD_QL415_ORIGINAL_HOST_PROOF_REQUIRED",
        "aiDataOwnerDecision": "HOLD_SEPARATE_AUTHENTICATED_CONTROLLER_DECISION",
    }


def reconcile_master_evidence308(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Source-side owner UI: observe local data, never invent master ACKs."""
    base = reconcile_three_master_uptime306(monitor)
    return {
        **base,
        "schema": "rosevear.ai-hub.master360-three-master-acceptance308.v1",
        "sourceBuild": 308,
        "installedRelease307Expected": AIHUB307_MAIN,
        "commsQl414ContractRevision": COMMS_QL414_MAIN,
        "commsQl415MainAtReconciliation": COMMS_QL415_MAIN_AT_RECONCILIATION,
        "aiDataBuild367MainAtReconciliation": AIDATA_367_MAIN_AT_RECONCILIATION,
        "ql414ActualAckSchema": ACK_SCHEMA,
        "ql414RequestOperation": OPERATION,
        "ql414Contract": "CODE_MATCHED_PROTECTED_IN_PROCESS_ONLY",
        "installedBuild307Review": "HOLD_NO_ORIGINAL_REE_SIGNED_FIELD_EVIDENCE",
        "protectedOneTest": "HOLD_NO_OWNER_APPROVED_ORIGINAL_HOST_OPERATION",
        "signedReceiverAck": "HOLD_NO_AUTHENTICATED_QL414_RUNTIME_RECEIVER",
        "ql415RuntimeReview": "HOLD_NO_INDEPENDENT_PIN_AND_REPLAY_EVIDENCE",
        "aiDataMasterEvidence": "HOLD_NO_AUTHENTICATED_CONTROLLER_ACCEPTANCE",
        "newWindowsScheduledTasks": 0,
        "receiver": "OFF",
        "connection": "HOLD",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }
