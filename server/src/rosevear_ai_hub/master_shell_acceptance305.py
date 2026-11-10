"""Build 305: fail-closed original-host release and Master360 one-TEST components.

These helpers do not install software, run a second scheduler, enroll keys, send
telemetry, start a Comms receiver or claim a verified master connection.
"""

import asyncio
import base64
import hashlib
import json
import platform
import re
import secrets
import socket
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304
from rosevear_ai_hub.master_shell_telemetry304 import _call
from rosevear_ai_hub.master_shell_uptime303 import ORIGINAL_HOST, loopback_tcp_probe
from rosevear_ai_hub.release_observability import safe_document, safe_sha

SOURCE = "rosevear-ai-hub"
COMMS_SCHEMA = "rosevear.ql411.ree-telemetry.v1"
HEX40 = re.compile(r"[0-9a-f]{40}\Z")
HEX64 = re.compile(r"[0-9a-f]{64}\Z")
OPAQUE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{7,95}\Z")
SERVICES = {"hub_api_8765", "hub_client_5173", "hub_caddy_8443"}
PORTS = (("hub_api_8765", 8765), ("hub_client_5173", 5173), ("hub_caddy_8443", 8443))
LATEST_PRODUCTION_304 = "1a52acf4fc756088d0a1ab38b350f96fccce2a1b"
CONTROLLER_360 = "4b45b435fa7b6fc83b94e31556648fe4190a9f53"


def _utc(ms: int) -> str:
    return (
        datetime.fromtimestamp(ms / 1000, UTC)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def _timestamp(value: Any) -> int | None:
    if not isinstance(value, str) or not value.endswith("Z"):
        return None
    try:
        stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if (
            stamp.tzinfo != UTC
            or stamp.isoformat(timespec="milliseconds").replace("+00:00", "Z") != value
        ):
            return None
        return int(stamp.timestamp() * 1000)
    except (ValueError, OverflowError):
        return None


def _hold(reason: str) -> dict[str, object]:
    return {
        "schema": "rosevear.ai-hub.master360-one-test-305.v1",
        "state": reason,
        "sourceId": SOURCE,
        "signed": False,
        "sent": False,
        "ackAccepted": False,
        "connection": "HOLD",
        "receiverEnabled": False,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }


def inspect_original_release305(root: Path, monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Owner read of fixed local release pointers and already-running monitor.

    An active.json pointer alone can never attest which Python binary is loaded;
    an independent process-to-launcher reviewer must bind that provenance.
    """
    on_host = platform.system() == "Windows" and socket.gethostname().upper() == ORIGINAL_HOST
    snapshot = monitor.persistent_snapshot304()
    release = safe_document(root / "logs" / "hub-deployment" / "active.json") if on_host else {}
    sha = safe_sha(release.get("sha"))
    sample_count = snapshot.get("sampleCount")
    observing = bool(
        on_host
        and monitor.persist_eligible
        and snapshot.get("collectionState") == "OBSERVING_REE_LOCAL"
        and isinstance(sample_count, int)
        and sample_count >= 2
    )
    if not on_host:
        state = "HOLD_WRONG_HOST_OR_OS"
    elif not monitor.persist_eligible:
        state = "HOLD_EXISTING_LAUNCHER_MONITOR_POLICY"
    elif not sha:
        state = "HOLD_NO_SAFE_INSTALLED_RELEASE_POINTER"
    elif sha != LATEST_PRODUCTION_304:
        state = "HOLD_RECORDED_RELEASE_DIFFERS_FROM_BUILD304"
    else:
        state = "HOLD_POINTER_MATCH_NEEDS_INDEPENDENT_PROCESS_BINDING"
    return {
        "schema": "rosevear.ai-hub.original-release-review-305.v1",
        "sourceId": SOURCE,
        "expectedHost": ORIGINAL_HOST,
        "originalHostObserved": on_host,
        "automationHostEnforced": bool(on_host and monitor.persist_eligible),
        "latestCodeRelease304": LATEST_PRODUCTION_304,
        "recordedReleaseSha": sha,
        "recorded304Matches": bool(on_host and sha == LATEST_PRODUCTION_304),
        "installedProcessRevisionVerified": False,
        "build305InstalledVerified": False,
        "independentReviewerVerified": False,
        "state": state,
        "monitoringState": snapshot.get("collectionState"),
        "durableHistoryState": "OBSERVING_TWO_OR_MORE_LOCAL_SAMPLES"
        if observing
        else "HOLD_NOT_VERIFIED",
        "durableSamples": sample_count if observing else 0,
        "newWindowsScheduledTasks": 0,
        "existingLauncherChanged": False,
        "existingRecoveryTaskChanged": False,
        "connection": "HOLD",
    }


def _serialize(payload: dict[str, Any]) -> bytes:
    """QL-411 receiver signs JS JSON.stringify insertion order (not sorted canonical JSON)."""
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode()


def _strict_samples(observations: Any, *, now_ms: int) -> list[dict[str, Any]] | None:
    if not isinstance(observations, list) or not 2 <= len(observations) <= 1440:
        return None
    rows = []
    ids = set()
    for row in observations:
        if not isinstance(row, dict) or set(row) != {
            "observationId",
            "service",
            "observedAt",
            "reachable",
            "latencyMs",
        }:
            return None
        observed = _timestamp(row["observedAt"])
        latency = row["latencyMs"]
        if (
            not isinstance(row["observationId"], str)
            or not OPAQUE.fullmatch(row["observationId"])
            or row["observationId"] in ids
            or not isinstance(row["service"], str)
            or row["service"] not in SERVICES
            or observed is None
            or observed > now_ms
            or now_ms - observed > 24 * 60 * 60 * 1000
            or type(row["reachable"]) is not bool
            or type(latency) not in (int, float)
            or not 0 <= latency <= 60_000
        ):
            return None
        ids.add(row["observationId"])
        rows.append(
            {
                key: row[key]
                for key in ("observationId", "service", "observedAt", "reachable", "latencyMs")
            }
        )
    return rows


async def capture_one_supervised_probe305(
    monitor: PersistentReeMonitor304,
    *,
    probe=loopback_tcp_probe,
) -> list[dict[str, Any]]:
    """One explicit protected-adapter loopback observation, not a background task.

    Call twice at different instants to make a QL-411 TEST sample set. Durations
    are measured locally and not invented from Build 304's boolean database.
    """
    if (
        platform.system() != "Windows"
        or socket.gethostname().upper() != ORIGINAL_HOST
        or not monitor.persist_eligible
        or monitor.persistent_snapshot304().get("collectionState") != "OBSERVING_REE_LOCAL"
    ):
        return []

    async def one(name: str, port: int) -> dict[str, Any]:
        start = time.monotonic()
        try:
            reachable = await asyncio.wait_for(probe(port), timeout=2.0) is True
        except (OSError, TimeoutError):
            reachable = False
        elapsed = min(60_000.0, round((time.monotonic() - start) * 1000, 3))
        return {
            "observationId": "r" + secrets.token_hex(12),
            "service": name,
            "observedAt": _utc(int(time.time() * 1000)),
            "reachable": reachable,
            "latencyMs": elapsed,
        }

    return list(await asyncio.gather(*(one(name, port) for name, port in PORTS)))


async def prepare_ql411_one_test305(
    monitor: PersistentReeMonitor304,
    *,
    source_revision: str,
    episode_id: str,
    observations: Any,
    authorize_original=None,
    claim_durable_episode=None,
    sign_original=None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Create ONE signed offline, metadata-only Comms-compatible envelope.

    The protected original-host adapter must independently verify ownership,
    measured observation provenance, an atomic durable episode claim and the
    Ed25519 signer pin. No HTTP POST, receiver activation or notification here.
    """
    now = now_ms if now_ms is not None else int(time.time() * 1000)
    if (
        platform.system() != "Windows"
        or socket.gethostname().upper() != ORIGINAL_HOST
        or not monitor.persist_eligible
        or monitor.persistent_snapshot304().get("collectionState") != "OBSERVING_REE_LOCAL"
        or not all(
            callable(fn) for fn in (authorize_original, claim_durable_episode, sign_original)
        )
        or not isinstance(source_revision, str)
        or not HEX40.fullmatch(source_revision)
        or not isinstance(episode_id, str)
        or not OPAQUE.fullmatch(episode_id)
        or type(now) is not int
        or now < 0
    ):
        return _hold("HOLD_ORIGINAL_HOST_RELEASE_OR_PROTECTED_AUTHORITY")
    samples = _strict_samples(observations, now_ms=now)
    if samples is None:
        return _hold("HOLD_ORIGINAL_MEASURED_SAMPLES_INVALID")
    try:
        approval = await _call(
            authorize_original,
            source_id=SOURCE,
            source_revision=source_revision,
            episode_id=episode_id,
            purpose="ONE_SUPERVISED_READ_ONLY_TEST",
        )
        if (
            not isinstance(approval, dict)
            or approval.get("state") != "INDEPENDENT_ONE_TEST_APPROVED"
            or approval.get("sourceId") != SOURCE
            or approval.get("sourceRevision") != source_revision
            or approval.get("episodeId") != episode_id
            or approval.get("installedProcessRevisionVerified") is not True
            or approval.get("measuredSamplesVerifiedOnRee") is not True
            or approval.get("independentReviewerVerified") is not True
            or approval.get("sourceOwnerVerified") is not True
            or approval.get("masterOwnerVerified") is not True
            or approval.get("ownerConsentVerified") is not True
            or approval.get("revoked") is not False
            or not isinstance(approval.get("sourceSpkiSha256"), str)
            or not HEX64.fullmatch(approval["sourceSpkiSha256"])
            or not isinstance(approval.get("sourcePublicKeyDer"), bytes)
            or len(approval["sourcePublicKeyDer"]) > 256
        ):
            return _hold("HOLD_INDEPENDENT_INSTALLED_RELEASE_OWNER_OR_MEASUREMENT")
        claimed = await _call(
            claim_durable_episode,
            source_id=SOURCE,
            source_revision=source_revision,
            episode_id=episode_id,
        )
        if claimed is not True:
            return _hold("HOLD_DURABLE_REPLAY_CLAIM")
        payload = {
            "schema": COMMS_SCHEMA,
            "sourceId": SOURCE,
            "hostId": ORIGINAL_HOST,
            "sourceRevision": source_revision,
            "capturedAt": _utc(now),
            "episodeId": episode_id,
            "samples": samples,
        }
        data = _serialize(payload)
        if len(data) > 190_000:
            return _hold("HOLD_SIGNED_ENVELOPE_OVERSIZED")
        signed = await _call(
            sign_original, source_id=SOURCE, episode_id=episode_id, exact_payload_bytes=data
        )
        if (
            not isinstance(signed, dict)
            or signed.get("attested") is not True
            or signed.get("spkiSha256") != approval["sourceSpkiSha256"]
            or not isinstance(signed.get("signature"), str)
        ):
            return _hold("HOLD_PROTECTED_SIGNATURE_UNAVAILABLE")
        raw = base64.b64decode(signed["signature"], validate=True)
        if base64.b64encode(raw).decode() != signed["signature"] or len(raw) != 64:
            return _hold("HOLD_SIGNATURE_ENCODING_INVALID")
        pub_der = approval["sourcePublicKeyDer"]
        if hashlib.sha256(pub_der).hexdigest() != approval["sourceSpkiSha256"]:
            return _hold("HOLD_PIN_MISMATCH")
        pub = serialization.load_der_public_key(pub_der)
        if not isinstance(pub, Ed25519PublicKey):
            return _hold("HOLD_WRONG_SIGNER_ALGORITHM")
        pub.verify(raw, data)
        return {
            "schema": "rosevear.ai-hub.master360-one-test-305.v1",
            "state": "SIGNED_OFFLINE_QL411_TEST_CANDIDATE_HOLD",
            "sourceId": SOURCE,
            "signed": True,
            "envelope": {"payload": payload, "signature": signed["signature"]},
            "envelopeSha256": hashlib.sha256(_serialize(payload)).hexdigest(),
            "sent": False,
            "ackAccepted": False,
            "connection": "HOLD",
            "receiverEnabled": False,
            "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        }
    except (OSError, ValueError, TypeError, OverflowError, InvalidSignature):
        return _hold("HOLD_PROTECTED_SIGNATURE_OR_OWNER_REPLAY_FAILURE")


def review_ql412_handoff305(receiver: Any, *, expected_source_revision: str) -> dict[str, object]:
    """Never infer a live Comms ACK from unsigned operator claims or CI success."""
    if (
        not isinstance(receiver, dict)
        or receiver.get("connection") != "HOLD"
        or (receiver.get("sourceRevision") != expected_source_revision)
        or receiver.get("receiverEnabled") is not False
    ):
        return _hold("HOLD_COMMS_QL412_RECEIVER_UNVERIFIED")
    # Even syntactically scoped QL-411 operator claims are not signed QL-412 ACKs.
    return _hold("HOLD_INDEPENDENT_RECEIVER_SIGNATURE_AND_DURABLE_ACK_REQUIRED")
