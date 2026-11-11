"""Build 309: protected original-Ree one-TEST admission and controller handoff.

This module has no listener, private-key discovery, sender, scheduler or
connection actuator. All callbacks are supplied by a separately authenticated
owner/reviewer runtime; browser fields are never used as authority.
"""

import hashlib
import math
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import _serialize
from rosevear_ai_hub.master_shell_acceptance306 import review_original_owner_release306
from rosevear_ai_hub.master_shell_acceptance308 import (
    CORRELATION,
    OPERATION,
    _hold,
    _on_ree,
    _valid_source,
    reconcile_master_evidence308,
    verify_ql414_receiver_ack308,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE = "rosevear-ai-hub"
ORIGINAL_HOST = "DESKTOP-AE894KC"
AIHUB308_MAIN = "cefc2b8859e51ca29f0255f69f8361161f8a117d"
COMMS_QL416_MAIN = "95d5780f377c7e2fd3c357789cbc2566fcf03b6c"
AIDATA_369_MAIN_AT_RECONCILIATION = "206aaf4f5007da10607efe692776256b90a9a28b"
CONTROLLER_360 = "4b45b435fa7b6fc83b94e31556648fe4190a9f53"
SERVICES = ("hub_api_8765", "hub_client_5173", "hub_caddy_8443")


def review_installed_308_on_ree309(
    root: Path,
    monitor: PersistentReeMonitor304,
    signed_field_review: Any,
    *,
    reviewer_public_der: bytes | None,
    independent_reviewer_pin: str,
    owner_authorize: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """The installed process, not a GitHub commit, must prove Build 308."""
    result = review_original_owner_release306(
        root,
        monitor,
        signed_field_review,
        reviewer_public_der=reviewer_public_der,
        independent_reviewer_pin=independent_reviewer_pin,
        expected_installed_revision=AIHUB308_MAIN,
        owner_authorize=owner_authorize,
        now_ms=now_ms,
    )
    return {**result, "reviewBuild": 309, "requiredInstalledRevision": AIHUB308_MAIN}


def prepare_ql414_one_test309(
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
    one_test_owner_authorize: Callable[..., bool] | None,
    independent_reviewer_approve: Callable[..., bool] | None,
    correlation_id: str,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Prepare one exact QL-414 request for the *installed* Build 308.

    Returning the request never transmits it. A separately authenticated
    private transport must perform the authorized operation.
    """
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if type(now) is not int or not _on_ree(monitor):
        return _hold("HOLD_ORIGINAL_REE_MONITOR_UNAVAILABLE")
    if not all(
        callable(x)
        for x in (
            source_import_claimed,
            one_test_owner_authorize,
            independent_reviewer_approve,
        )
    ):
        return _hold("HOLD_PRIVATE_OWNER_OR_REPLAY_AUTHORITY")
    if not isinstance(correlation_id, str) or not CORRELATION.fullmatch(correlation_id):
        return _hold("HOLD_CORRELATION_INVALID")
    if (
        review_installed_308_on_ree309(
            root,
            monitor,
            signed_field_review,
            reviewer_public_der=reviewer_public_der,
            independent_reviewer_pin=independent_reviewer_pin,
            owner_authorize=release_owner_authorize,
            now_ms=now,
        ).get("accepted")
        is not True
    ):
        return _hold("HOLD_INSTALLED_BUILD308_NOT_INDEPENDENTLY_WITNESSED")
    if not _valid_source(
        source_envelope,
        now,
        source_public_der,
        independently_pinned_source_sha256,
        expected_revision=AIHUB308_MAIN,
    ):
        return _hold("HOLD_BUILD308_SIGNED_SOURCE_ENVELOPE")
    p = source_envelope["payload"]
    digest = hashlib.sha256(_serialize(p)).hexdigest()
    args = {
        "source_id": SOURCE,
        "source_revision": AIHUB308_MAIN,
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
            or one_test_owner_authorize(**args) is not True
            or independent_reviewer_approve(**args) is not True
        ):
            return _hold("HOLD_UNCLAIMED_SOURCE_OR_OWNER_ONE_TEST_DECISION")
    except (OSError, TypeError, ValueError):
        return _hold("HOLD_PRIVATE_AUTHORITY_FAILED")
    return {
        **_hold("QL414_BUILD308_REQUEST_PREPARED_NOT_SENT"),
        "accepted": True,
        "request": {
            "operation": OPERATION,
            "correlationId": correlation_id,
            "envelope": source_envelope,
        },
        "sourcePayloadSha256": digest,
        "sourceRevision": AIHUB308_MAIN,
        "transportSent": False,
        "commsAcknowledged": False,
    }


def _ql416_matches(
    result: Any,
    source: dict[str, Any],
    ack: dict[str, Any],
    *,
    controller_revision: str,
) -> bool:
    """Reject an uncorrelated or overstated QL-416 uptime projection."""
    if not isinstance(result, dict) or not isinstance(result.get("services"), list):
        return False
    expected = {
        "state": "SIGNED_ONE_TEST_IMPORTED_FOR_REVIEW",
        "source": SOURCE,
        "host": ORIGINAL_HOST,
        "installedSourceRevision": AIHUB308_MAIN,
        "aiDataControllerRevision": controller_revision,
        "episodeId": source["episodeId"],
        "correlationId": ack.get("correlationId"),
        "capturedAt": source["capturedAt"],
        "uptime": "SIGNED_SAMPLED_READ_MODEL_ONLY",
        "replay": "INDEPENDENT_PROTECTED_LEDGER_RECORD_MATCHED",
        "receiverAck": "INDEPENDENT_SIGNED_ACK_MATCHED",
        "receiver": "OFF",
        "connection": "HOLD",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }
    if any(result.get(key) != value for key, value in expected.items()):
        return False
    if result.get("ownerDecision") not in ("HOLD", "INCIDENT_REVIEWED_NO_ACTIVATION"):
        return False
    observed = result["services"]
    if len(observed) != len(SERVICES):
        return False
    incidents = []
    for service, item in zip(SERVICES, observed, strict=True):
        samples = [x for x in source["samples"] if x["service"] == service]
        count = len(samples)
        uptime = (
            math.floor(sum(x["reachable"] for x in samples) * 10000 / count + 0.5) / 100
            if count >= 2
            else None
        )
        if not isinstance(item, dict) or item != {
            "service": service,
            "samples": count,
            "sampledUptimePercent": uptime,
        }:
            return False
        if uptime is not None and uptime < 100:
            incidents.append(
                {
                    "service": service,
                    "classification": "SIGNED_SAMPLE_REACHABILITY_GAP",
                    "sampledUptimePercent": uptime,
                    "acceptance": "OWNER_REVIEWED"
                    if result["ownerDecision"] == "INCIDENT_REVIEWED_NO_ACTIVATION"
                    else "AWAITING_OWNER_REVIEW",
                }
            )
    return result.get("incidents") == incidents


def admit_ql416_one_test309(
    monitor: PersistentReeMonitor304,
    source_envelope: Any,
    comms_ack: Any,
    ql416_review: Any,
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
    independently_attest_comms_ql416_ledger: Callable[..., bool] | None,
    claim_chain: Callable[..., bool] | None,
    controller_revision: str,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Admission requires an independently attested Comms QL-416 ledger.

    Comms projection is compared to signed source samples, but projection
    alone is NOT authority. The separate protected ledger witness must attest
    before the original-host Build 307 chain ledger consumes this episode.
    """
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if type(now) is not int or not _on_ree(monitor):
        return _hold("HOLD_ORIGINAL_REE_MONITOR_UNAVAILABLE")
    if (
        not isinstance(controller_revision, str)
        or controller_revision != AIDATA_369_MAIN_AT_RECONCILIATION
    ):
        return _hold("HOLD_AI_DATA_CONTROLLER_REVISION_REQUIRED")
    if not callable(independently_attest_comms_ql416_ledger):
        return _hold("HOLD_INDEPENDENT_QL416_LEDGER_ATTESTATION")
    if (
        not _valid_source(
            source_envelope,
            now,
            source_public_der,
            independently_pinned_source_sha256,
            expected_revision=AIHUB308_MAIN,
        )
        or not isinstance(comms_ack, dict)
        or not isinstance(comms_ack.get("payload"), dict)
    ):
        return _hold("HOLD_SIGNED_BUILD308_SOURCE_OR_COMMS_ACK")
    source, ack = source_envelope["payload"], comms_ack["payload"]
    if not _ql416_matches(ql416_review, source, ack, controller_revision=controller_revision):
        return _hold("HOLD_QL416_EPISODE_UPTIME_OR_CONTROLLER_MISMATCH")
    source_digest = hashlib.sha256(_serialize(source)).hexdigest()
    ack_digest = hashlib.sha256(_serialize(ack)).hexdigest()
    ql416_digest = hashlib.sha256(_serialize(ql416_review)).hexdigest()
    try:
        if (
            independently_attest_comms_ql416_ledger(
                source_id=SOURCE,
                episode_id=source["episodeId"],
                source_revision=AIHUB308_MAIN,
                controller_revision=controller_revision,
                source_digest=source_digest,
                receiver_ack_digest=ack_digest,
                ql416_review_digest=ql416_digest,
            )
            is not True
        ):
            return _hold("HOLD_PROTECTED_COMMS_QL416_LEDGER_NOT_WITNESSED")
    except (OSError, ValueError, TypeError):
        return _hold("HOLD_PROTECTED_COMMS_LEDGER_AUTHORITY_FAILED")
    checked = verify_ql414_receiver_ack308(
        monitor,
        source_envelope,
        comms_ack,
        source_public_der=source_public_der,
        independently_pinned_source_sha256=independently_pinned_source_sha256,
        receiver_public_der=receiver_public_der,
        independently_pinned_receiver_sha256=independently_pinned_receiver_sha256,
        expected_receiver_key_id=expected_receiver_key_id,
        correlation_id=correlation_id,
        source_import_claimed=source_import_claimed,
        protected_transport_attest=protected_transport_attest,
        owner_authorize=owner_authorize,
        independent_reviewer_approve=independent_reviewer_approve,
        claim_chain=claim_chain,
        expected_source_revision=AIHUB308_MAIN,
        now_ms=now,
    )
    if checked.get("accepted") is not True:
        return _hold(f"HOLD_QL414_RECEIVER_PROOF_{checked['state']}")
    return {
        **_hold("ONE_TEST_SOURCE_COMMS_QL416_ADMITTED_FOR_AI_DATA_REVIEW"),
        "accepted": True,
        "sourceRevision": AIHUB308_MAIN,
        "controllerRevision": controller_revision,
        "commsRevision": COMMS_QL416_MAIN,
        "episodeId": source["episodeId"],
        "correlationId": correlation_id,
        "sourcePayloadSha256": source_digest,
        "receiverAckSha256": ack_digest,
        "ql416ReviewSha256": ql416_digest,
        "uptime": "SIGNED_SAMPLED_READ_MODEL_ONLY",
        "incidentCandidates": ql416_review["incidents"],
        "aiDataOwnerDecision": "HOLD_INDEPENDENT_CONTROLLER_DECISION_REQUIRED",
        "mastersSynced": False,
    }


def prepare_ai_data_owner_handoff309(
    monitor: PersistentReeMonitor304,
    admission: Any,
    *,
    independently_attest_original_chain: Callable[..., bool] | None,
    owner_authorize: Callable[..., bool] | None,
    independent_reviewer_approve: Callable[..., bool] | None,
) -> dict[str, object]:
    """Prepare a *metadata-only* controller review request, never decide it.

    A passed-in success object is untrusted until separately corroborated
    against the original Windows durable chain by its own protected witness.
    """
    if not _on_ree(monitor):
        return _hold("HOLD_NOT_ORIGINAL_REE_MONITOR")
    if not isinstance(admission, dict) or admission.get("accepted") is not True:
        return _hold("HOLD_NO_ADMITTED_ONE_TEST")
    if not all(
        callable(x)
        for x in (
            independently_attest_original_chain,
            owner_authorize,
            independent_reviewer_approve,
        )
    ):
        return _hold("HOLD_CONTROLLER_OWNER_REVIEW_AUTHORITIES")
    if (
        admission.get("state") != "ONE_TEST_SOURCE_COMMS_QL416_ADMITTED_FOR_AI_DATA_REVIEW"
        or admission.get("sourceRevision") != AIHUB308_MAIN
        or admission.get("commsRevision") != COMMS_QL416_MAIN
        or admission.get("connection") != "HOLD"
        or admission.get("receiver") != "OFF"
        or admission.get("mastersSynced") is not False
    ):
        return _hold("HOLD_UNTRUSTED_SOURCE_TO_CONTROLLER_STATE")
    args = {
        "source_id": SOURCE,
        "source_revision": AIHUB308_MAIN,
        "controller_revision": admission.get("controllerRevision"),
        "episode_id": admission.get("episodeId"),
        "correlation_id": admission.get("correlationId"),
        "source_digest": admission.get("sourcePayloadSha256"),
        "comms_digest": admission.get("receiverAckSha256"),
        "ql416_digest": admission.get("ql416ReviewSha256"),
    }
    if (
        not isinstance(args["correlation_id"], str)
        or not CORRELATION.fullmatch(args["correlation_id"])
        or not isinstance(args["episode_id"], str)
        or not CORRELATION.fullmatch(args["episode_id"])
        or not isinstance(args["controller_revision"], str)
        or args["controller_revision"] != AIDATA_369_MAIN_AT_RECONCILIATION
        or any(
            not isinstance(args[key], str)
            or len(args[key]) != 64
            or any(x not in "0123456789abcdef" for x in args[key])
            for key in ("source_digest", "comms_digest", "ql416_digest")
        )
    ):
        return _hold("HOLD_CONTROLLER_HANDOFF_DIGESTS_INVALID")
    try:
        if (
            independently_attest_original_chain(**args) is not True
            or owner_authorize(**args) is not True
            or independent_reviewer_approve(**args) is not True
        ):
            return _hold("HOLD_INDEPENDENT_OWNER_CONTROLLER_HANDOFF")
    except (OSError, TypeError, ValueError):
        return _hold("HOLD_CONTROLLER_HANDOFF_AUTHORITY_FAILED")
    return {
        **_hold("PREPARED_FOR_AI_DATA_369_OWNER_DECISION_NOT_SENT"),
        "accepted": True,
        "handoff": {
            "schema": "rosevear.ai-hub.master360-owner-handoff309.v1",
            "sourceId": SOURCE,
            "hostId": ORIGINAL_HOST,
            "sourceRevision": AIHUB308_MAIN,
            "commsRevision": COMMS_QL416_MAIN,
            "controllerRevision": args["controller_revision"],
            "episodeId": args["episode_id"],
            "correlationId": args["correlation_id"],
            "sourcePayloadSha256": args["source_digest"],
            "receiverAckSha256": args["comms_digest"],
            "ql416ReviewSha256": args["ql416_digest"],
            "connection": "HOLD",
            "ownerDecision": "PENDING_INDEPENDENT_AI_DATA_REVIEW",
        },
        "sent": False,
        "controllerApproved": False,
    }


def reconcile_master_evidence309(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Owner-only read model: code compatibility is never runtime admission."""
    state = reconcile_master_evidence308(monitor)
    return {
        **state,
        "schema": "rosevear.ai-hub.master360-operational-acceptance309.v1",
        "sourceBuild": 309,
        "installedRelease308Expected": AIHUB308_MAIN,
        "commsQl416MainAtReconciliation": COMMS_QL416_MAIN,
        "aiDataBuild369MainAtReconciliation": AIDATA_369_MAIN_AT_RECONCILIATION,
        "operationalAdmission": "HOLD_ORIGINAL_HOST_SIGNED_ONE_TEST_AND_DURABLE_CHAIN",
        "ql416OperationalReview": "HOLD_INDEPENDENT_PROTECTED_COMMS_LEDGER",
        "controllerOwnerDecision": "HOLD_AI_DATA_VERIFIED_RUNTIME_AND_OWNER_DECISION",
        "sampledUptime": "UNKNOWN_NO_AUTHENTICATED_ORIGINAL_HOST_RECEIPT",
        "masterSync": "HOLD",
        "receiver": "OFF",
        "connection": "HOLD",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }
