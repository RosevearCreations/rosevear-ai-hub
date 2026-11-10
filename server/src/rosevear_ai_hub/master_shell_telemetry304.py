"""Build 304 protected metadata-only signing and Comms ACK verification components.

No public receiver, outgoing HTTP, key generation, scheduled task, or persistent
connection is installed. Only a separately approved protected host adapter can
provide original-owner authorization, atomic replay claims and private signing.
"""

import base64
import binascii
import hashlib
import inspect
import re
from datetime import UTC, datetime
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from rosevear_ai_hub.api.ql364_source_health import canonical, digest

SOURCE = "rosevear-ai-hub"
TELEMETRY = "rosevear.ai-hub.master-telemetry.signed.v1"
ENVELOPE = "rosevear.ai-hub.master-telemetry-envelope.v1"
COMMS_ACK = "rosevear.comms-hub.source-incident-ack.v1"
SHA40 = re.compile(r"[a-f0-9]{40}\Z")
SHA64 = re.compile(r"[a-f0-9]{64}\Z")
UUID = re.compile(r"[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\Z")
KEY_ID = re.compile(r"[A-Za-z0-9_-]{12,100}\Z")
SIGNATURE = re.compile(r"[A-Za-z0-9_-]{86}\Z")
UTC_TIME = re.compile(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z\Z")
SERVICE_IDS = ("hub_api", "hub_web", "caddy_proxy")


def _at(ms: int) -> str:
    return (
        datetime.fromtimestamp(ms / 1000, UTC)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def _parse_at(value: Any) -> int | None:
    if not isinstance(value, str) or not UTC_TIME.fullmatch(value):
        return None
    try:
        return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1000)
    except ValueError:
        return None


def _hold(reason: str) -> dict[str, object]:
    return {
        "schema": "rosevear.ai-hub.master-telemetry-decision.v1",
        "state": reason,
        "sourceId": SOURCE,
        "signedTelemetry": False,
        "connected": False,
        "sentToMaster": False,
        "acceptedByComms": False,
        "connection": "HOLD",
    }


async def _call(fn, **kw):
    result = fn(**kw)
    return await result if inspect.isawaitable(result) else result


def _key_and_signature_valid(der: Any, spki_sha: Any, signature: Any, payload: Any) -> bool:
    if (
        not isinstance(der, bytes)
        or len(der) > 256
        or not isinstance(spki_sha, str)
        or not SHA64.fullmatch(spki_sha)
        or hashlib.sha256(der).hexdigest() != spki_sha
        or not isinstance(signature, str)
        or not SIGNATURE.fullmatch(signature)
    ):
        return False
    try:
        key = serialization.load_der_public_key(der)
        if not isinstance(key, Ed25519PublicKey):
            return False
        raw = base64.urlsafe_b64decode(signature + "==")
        if len(raw) != 64:
            return False
        key.verify(raw, canonical(payload))
        return True
    except (InvalidSignature, ValueError, TypeError, binascii.Error):
        return False


def _valid_snapshot(snapshot: Any) -> bool:
    if (
        not isinstance(snapshot, dict)
        or snapshot.get("schema") != "rosevear.ai-hub.ree-durable-uptime.v1"
        or snapshot.get("sourceId") != SOURCE
        or snapshot.get("sourceRole") != "SOURCE"
        or snapshot.get("hostPolicy") != "REE_ORIGINAL_WINDOWS_ONLY"
        or snapshot.get("automationHostEnforced") is not True
        or snapshot.get("collectionState") != "OBSERVING_REE_LOCAL"
        or snapshot.get("historyDurability") != "SQLITE_7_DAYS_BOUNDED"
        or snapshot.get("observationScope") != "LOOPBACK_TCP_NOT_END_TO_END_UPTIME"
        or snapshot.get("connection") != "HOLD"
        or snapshot.get("remoteCommands") != 0
        or snapshot.get("newWindowsScheduledTasks") != 0
        or not isinstance(snapshot.get("sampleCount"), int)
        or not 1 <= snapshot["sampleCount"] <= 10080
        or not isinstance(snapshot.get("services"), list)
        or len(snapshot["services"]) != 3
    ):
        return False
    ids = []
    for service in snapshot["services"]:
        if (
            not isinstance(service, dict)
            or service.get("id") not in SERVICE_IDS
            or service.get("check") != "LOOPBACK_TCP_ONLY"
            or service.get("sampleCount") != snapshot["sampleCount"]
            or service.get("latestState") not in ("TCP_REACHABLE", "TCP_UNREACHABLE")
            or not isinstance(service.get("reachableSamples"), int)
            or not 0 <= service["reachableSamples"] <= snapshot["sampleCount"]
        ):
            return False
        ids.append(service["id"])
    return sorted(ids) == sorted(SERVICE_IDS)


async def sign_readonly_source_telemetry304(
    snapshot: dict[str, object],
    *,
    source_sha: str,
    operation_id: str,
    authorize_original=None,
    claim_operation=None,
    sign_original=None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Produces signed TEST telemetry only with independent server-held callbacks.

    Does not publish or accept a Master connection; an original protected
    receiver still must verify this and independently approve scope and replay.
    """
    now = now_ms if now_ms is not None else int(datetime.now(UTC).timestamp() * 1000)
    if (
        not all(callable(fn) for fn in (authorize_original, claim_operation, sign_original))
        or not isinstance(source_sha, str)
        or not SHA40.fullmatch(source_sha)
        or not isinstance(operation_id, str)
        or not UUID.fullmatch(operation_id)
        or not isinstance(now, int)
        or now < 0
        or not _valid_snapshot(snapshot)
    ):
        return _hold("HOLD_ORIGINAL_SOURCE_AUTHORITY_OR_FRESH_HISTORY")
    observed = _parse_at(snapshot.get("lastSampleAtUtc", ""))
    if observed is None or not 0 <= now - observed <= 130_999:
        return _hold("HOLD_LOCAL_TELEMETRY_STALE")
    try:
        approved = await _call(
            authorize_original,
            source_id=SOURCE,
            source_sha=source_sha,
            operation_id=operation_id,
            purpose="READ_ONLY_UPTIME_ONE_TEST",
        )
        if (
            not isinstance(approved, dict)
            or approved.get("state")
            != "INDEPENDENT_REE_SOURCE_AND_MASTER_OWNER_ONE_TEST_AUTHORIZED"
            or approved.get("sourceId") != SOURCE
            or approved.get("sourceSha") != source_sha
            or approved.get("operationId") != operation_id
            or approved.get("originalWindowsVerified") is not True
            or approved.get("independentReviewerVerified") is not True
            or approved.get("sourceOwnerVerified") is not True
            or approved.get("masterOwnerVerified") is not True
            or approved.get("ownerConsentVerified") is not True
            or approved.get("revoked") is not False
            or not KEY_ID.fullmatch(approved.get("sourceKeyId", ""))
            or not isinstance(approved.get("sourceSpkiSha256"), str)
            or not SHA64.fullmatch(approved["sourceSpkiSha256"])
        ):
            return _hold("HOLD_INDEPENDENT_OWNER_REVIEW_OR_CONSENT")
        if (
            await _call(
                claim_operation, source_id=SOURCE, operation_id=operation_id, source_sha=source_sha
            )
            is not True
        ):
            return _hold("HOLD_DURABLE_OPERATION_REPLAY_CLAIM")
        payload = {
            "schema": TELEMETRY,
            "sourceId": SOURCE,
            "sourceRevision": source_sha,
            "operationId": operation_id,
            "destination": "ai-data-platform",
            "purpose": "READ_ONLY_UPTIME_ONE_TEST",
            "environment": "TEST",
            "hostPolicy": "REE_ORIGINAL_WINDOWS_ONLY",
            "observationScope": "LOOPBACK_TCP_NOT_END_TO_END_UPTIME",
            "sampleCount": snapshot["sampleCount"],
            "lastSampleAtUtc": snapshot["lastSampleAtUtc"],
            "services": [
                {
                    "id": s["id"],
                    "reachableSamples": s["reachableSamples"],
                    "sampleCount": s["sampleCount"],
                    "latestState": s["latestState"],
                }
                for s in snapshot["services"]
            ],
            "customerDataAllowed": False,
            "deviceActionsAllowed": False,
            "persistentConnectionAllowed": False,
            "issuedAtUtc": _at(now),
            "expiresAtUtc": _at(now + 90_000),
        }
        signed = await _call(
            sign_original, source_id=SOURCE, operation_id=operation_id, payload=canonical(payload)
        )
        if (
            not isinstance(signed, dict)
            or signed.get("attested") is not True
            or signed.get("keyId") != approved["sourceKeyId"]
            or signed.get("spkiSha256") != approved["sourceSpkiSha256"]
            or not _key_and_signature_valid(
                approved.get("sourcePublicKeyDer"),
                approved["sourceSpkiSha256"],
                signed.get("signature"),
                payload,
            )
        ):
            return _hold("HOLD_SOURCE_TELEMETRY_SIGNATURE_INVALID")
        envelope = {
            "schema": ENVELOPE,
            "payload": payload,
            "signature": signed["signature"],
            "keyId": signed["keyId"],
        }
        if len(canonical(envelope)) > 4096:
            return _hold("HOLD_TELEMETRY_OVERSIZED")
        return {
            "schema": "rosevear.ai-hub.master-telemetry-decision.v1",
            "state": "SOURCE_SIGNED_METADATA_ONLY_TEST_HOLD",
            "sourceId": SOURCE,
            "signedTelemetry": True,
            "envelope": envelope,
            "digestSha256": digest(envelope),
            "connected": False,
            "sentToMaster": False,
            "acceptedByComms": False,
            "connection": "HOLD",
        }
    except (OSError, ValueError, TypeError, OverflowError):
        return _hold("HOLD_PRIVATE_SOURCE_SIGNING_OR_REPLAY_UNAVAILABLE")


def build_comms_incident_candidates304(
    snapshot: dict[str, object], *, source_sha: str
) -> list[dict[str, object]]:
    """Only source-bound offline correlation candidates; no tickets or alerts sent."""
    if not _valid_snapshot(snapshot) or not SHA40.fullmatch(source_sha):
        return []
    observed = snapshot.get("lastSampleAtUtc")
    if not isinstance(observed, str) or _parse_at(observed) is None:
        return []
    candidates = []
    for entry in snapshot.get("incidentCandidates", []):
        if (
            not isinstance(entry, dict)
            or entry.get("service") not in SERVICE_IDS
            or (entry.get("condition") != "THREE_CONSECUTIVE_TCP_FAILURES")
        ):
            continue
        basis = {
            "sourceId": SOURCE,
            "sourceSha": source_sha,
            "service": entry["service"],
            "lastSampleAtUtc": observed,
            "condition": "THREE_CONSECUTIVE_TCP_FAILURES",
        }
        candidates.append(
            {
                "schema": "rosevear.ai-hub.comms-incident-candidate.v1",
                **basis,
                "caseDigestSha256": digest(basis),
                "destination": "rosevear-comms-hub",
                "status": "OFFLINE_REVIEW_HOLD",
                "alertsSent": 0,
                "receiverEnabled": False,
                "connection": "HOLD",
            }
        )
    return candidates


def review_protected_comms_ack304(
    candidate: Any,
    acknowledgment: Any,
    *,
    pinned_receiver_public_key_der: bytes | None,
    expected_receiver_spki_sha256: str,
    expected_receiver_key_id: str,
    now_ms: int,
    prior_ack_ids: frozenset[str] = frozenset(),
) -> dict[str, object]:
    """Validate a receiver-signed correlation component, never accept a live handoff."""

    def held(state):
        return {
            "schema": "rosevear.ai-hub.comms-ack-review.v1",
            "state": state,
            "independentlyAccepted": False,
            "receiverEnabled": False,
            "alertsSent": 0,
            "connection": "HOLD",
        }

    if (
        not isinstance(candidate, dict)
        or not isinstance(acknowledgment, dict)
        or candidate.get("schema") != "rosevear.ai-hub.comms-incident-candidate.v1"
        or candidate.get("sourceId") != SOURCE
        or not SHA40.fullmatch(str(candidate.get("sourceSha", "")))
        or candidate.get("destination") != "rosevear-comms-hub"
        or candidate.get("status") != "OFFLINE_REVIEW_HOLD"
        or candidate.get("receiverEnabled") is not False
        or candidate.get("connection") != "HOLD"
        or candidate.get("alertsSent") != 0
        or not SHA64.fullmatch(str(candidate.get("caseDigestSha256", "")))
        or set(acknowledgment) != {"schema", "payload", "keyId", "signature"}
        or acknowledgment["schema"] != COMMS_ACK
        or acknowledgment["keyId"] != expected_receiver_key_id
        or not isinstance(now_ms, int)
        or now_ms < 0
        or not isinstance(expected_receiver_key_id, str)
        or not KEY_ID.fullmatch(expected_receiver_key_id)
    ):
        return held("HOLD_RECEIVER_ACK_SCOPE_OR_SCHEMA")
    # Never accept a case digest supplied by a caller without rebuilding the
    # exact original-source correlation basis (including its installed SHA).
    basis = {
        key: candidate.get(key)
        for key in ("sourceId", "sourceSha", "service", "lastSampleAtUtc", "condition")
    }
    if (
        basis["service"] not in SERVICE_IDS
        or basis["condition"] != "THREE_CONSECUTIVE_TCP_FAILURES"
        or _parse_at(basis["lastSampleAtUtc"]) is None
        or digest(basis) != candidate["caseDigestSha256"]
    ):
        return held("HOLD_CANDIDATE_PROVENANCE_UNVERIFIED")
    payload = acknowledgment["payload"]
    if not isinstance(payload, dict) or set(payload) != {
        "schema",
        "sourceId",
        "sourceSha",
        "destination",
        "caseDigestSha256",
        "ackId",
        "decision",
        "issuedAtUtc",
        "expiresAtUtc",
        "scope",
    }:
        return held("HOLD_RECEIVER_ACK_SCHEMA")
    issued, expires = _parse_at(payload["issuedAtUtc"]), _parse_at(payload["expiresAtUtc"])
    if (
        payload["schema"] != COMMS_ACK
        or payload["sourceId"] != SOURCE
        or payload["sourceSha"] != candidate["sourceSha"]
        or payload["destination"] != "rosevear-comms-hub"
        or payload["caseDigestSha256"] != candidate["caseDigestSha256"]
        or payload["decision"] != "RECEIVED_FOR_INDEPENDENT_REVIEW_ONLY"
        or payload["scope"] != "NO_CUSTOMER_NOTIFICATIONS_OR_RECOVERY"
        or not isinstance(payload["ackId"], str)
        or not UUID.fullmatch(payload["ackId"])
        or payload["ackId"] in prior_ack_ids
        or issued is None
        or expires is None
        or issued > now_ms + 5000
        or expires <= now_ms
        or expires <= issued
        or expires - issued > 90_000
    ):
        return held("HOLD_RECEIVER_ACK_MISMATCH_REPLAY_OR_EXPIRY")
    if not _key_and_signature_valid(
        pinned_receiver_public_key_der,
        expected_receiver_spki_sha256,
        acknowledgment["signature"],
        payload,
    ):
        return held("HOLD_RECEIVER_SIGNATURE_UNVERIFIED")
    # Cryptographic component verified; real receiver/audit ledger remain separate.
    return held("RECEIVER_SIGNATURE_COMPONENT_VALID_HOLD")
