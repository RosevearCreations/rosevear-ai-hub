"""QL-473 independent copied-ledger readback and three-party signed pilot claims.

All verification is offline/read-only. Valid signatures establish assertions by pinned
keys, not physical off-host durability, real mutual TLS, reboot, ACK, or authority.
"""
from __future__ import annotations

import base64
import hashlib
import re
from datetime import UTC, datetime, timedelta
from typing import Any

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, load_pem_public_key

from rosevear_ai_hub.master_custody363 import verified_anchor363
from rosevear_ai_hub.signed_intake362 import HEX40, HEX64, HOST, canonical, utc, verify_ledger

READBACK_SCHEMA = "rosevear.hub.ql473.independent-readback364.v1"
PILOT_SCHEMA = "rosevear.hub.ql473.three-master-pilot364.v1"
DASH_SCHEMA = "rosevear.hub.ql473.cross-module-acceptance364.v1"
SERVICES = ("Rosevear-AIHub", "Rosevear-AIDataPlatform", "Rosevear-CommsHub")
SAFE_VERSION = re.compile(r"[A-Za-z0-9][A-Za-z0-9._+-]{0,63}\Z")
IDENT = re.compile(r"[A-Za-z0-9_-]{12,64}\Z")
READBACK_KEYS = frozenset(
    {
        "schema", "originalHost", "sourceCommit", "ledgerSha256",
        "anchorPayloadSha256", "ledgerHeadSha256", "ledgerCount",
        "readbackId", "readbackAt", "independentKeyFingerprint",
        "offHostStorageReadbackClaimed", "workerPilotAuthorized",
        "receiverActivationAuthorized",
    }
)
PILOT_KEYS = frozenset(
    {
        "schema", "originalHost", "sourceCommit", "challenge",
        "drillId", "observedAt", "issuedAt", "peerVersions",
        "claimedBoundedMtls", "claimedSignedPeerAcks", "claimedRollbackReady",
        "performedOnOriginalHostClaimed", "automaticStartupAuthorized",
        "ql340cReceiverAuthorized",
    }
)


def signed_payload364(
    package: Any,
    expected_schema: str,
    keys: frozenset[str],
) -> tuple[dict[str, Any], Any]:
    expected_keys = (
        {"payload", "signatures"} if expected_schema == PILOT_SCHEMA
        else {"payload", "signature"}
    )
    if not isinstance(package, dict) or set(package) != expected_keys:
        raise ValueError("HOLD_QL473_PACKAGE_SHAPE")
    payload = package["payload"]
    if not isinstance(payload, dict) or set(payload) != keys or payload["schema"] != expected_schema:
        raise ValueError("HOLD_QL473_PAYLOAD_SHAPE")
    if len(canonical(package)) > 8192:
        raise ValueError("HOLD_QL473_PACKAGE_OVERSIZE")
    signature = package["signature"] if expected_schema == READBACK_SCHEMA else package["signatures"]
    return payload, signature


def require_source364(payload: dict[str, Any], expected_commit: str) -> None:
    if (
        type(expected_commit) is not str
        or HEX40.fullmatch(expected_commit) is None
        or payload["sourceCommit"] != expected_commit
        or payload["originalHost"] != HOST
    ):
        raise ValueError("HOLD_QL473_SOURCE_OR_HOST_MISMATCH")


def checked_key364(pem: bytes | None, pin: str) -> Ed25519PublicKey:
    if (
        not isinstance(pin, str)
        or HEX64.fullmatch(pin) is None
        or not isinstance(pem, bytes)
        or not 1 <= len(pem) <= 4096
    ):
        raise ValueError("HOLD_QL473_INDEPENDENT_PUBLIC_PIN_REQUIRED")
    try:
        key = load_pem_public_key(pem)
        if not isinstance(key, Ed25519PublicKey):
            raise ValueError("HOLD_QL473_ED25519_REQUIRED")
        raw = key.public_bytes(Encoding.Raw, PublicFormat.Raw)
        if hashlib.sha256(raw).hexdigest() != pin:
            raise ValueError("HOLD_QL473_PUBLIC_PIN_MISMATCH")
    except ValueError:
        raise
    except Exception as error:
        raise ValueError("HOLD_QL473_BAD_PUBLIC_KEY") from error
    return key


def verify_signature364(
    payload: dict[str, Any],
    signature_text: Any,
    public_pem: bytes | None,
    fingerprint: str,
) -> None:
    key = checked_key364(public_pem, fingerprint)
    if not isinstance(signature_text, str) or not 1 <= len(signature_text) <= 128:
        raise ValueError("HOLD_QL473_SIGNATURE_FORMAT")
    try:
        signature = base64.b64decode(signature_text, validate=True)
        if len(signature) != 64:
            raise ValueError("HOLD_QL473_SIGNATURE_FORMAT")
        key.verify(signature, canonical(payload))
    except ValueError:
        raise
    except Exception as error:
        raise ValueError("HOLD_QL473_INVALID_SIGNATURE") from error


def verify_readback364(
    source_ledger: Any,
    copied_ledger: Any,
    signed_anchor: Any,
    readback: Any,
    key_pem: bytes | None,
    independent_pin: str,
    expected_commit: str,
    now: datetime,
) -> dict[str, Any]:
    """Validate exact copied bytes/content and separate signed readback witness."""
    original = verify_ledger(source_ledger, expected_commit)
    copied = verify_ledger(copied_ledger, expected_commit)
    if not original["events"] or canonical(original) != canonical(copied):
        raise ValueError("HOLD_QL473_COPIED_LEDGER_DIFFERS")
    if (
        not isinstance(signed_anchor, dict)
        or not isinstance(signed_anchor.get("payload"), dict)
    ):
        raise ValueError("HOLD_QL473_ANCHOR_UNAVAILABLE")
    anchor = signed_anchor["payload"]
    payload, signature = signed_payload364(readback, READBACK_SCHEMA, READBACK_KEYS)
    require_source364(payload, expected_commit)
    if (
        type(payload["ledgerCount"]) is not int
        or payload["ledgerCount"] != len(original["events"])
        or payload["ledgerHeadSha256"] != original["events"][-1]["sha256"]
        or payload["ledgerSha256"] != hashlib.sha256(canonical(original)).hexdigest()
        or payload["anchorPayloadSha256"] != hashlib.sha256(canonical(anchor)).hexdigest()
    ):
        raise ValueError("HOLD_QL473_READBACK_DIGEST_MISMATCH")
    if (
        not isinstance(payload["readbackId"], str)
        or IDENT.fullmatch(payload["readbackId"]) is None
        or payload["offHostStorageReadbackClaimed"] is not True
        or payload["workerPilotAuthorized"] is not False
        or payload["receiverActivationAuthorized"] is not False
        or payload["independentKeyFingerprint"] != independent_pin
        or independent_pin == anchor.get("custodianPin")
        or independent_pin in {e["signerKeyFingerprint"] for e in original["events"]}
    ):
        raise ValueError("HOLD_QL473_READBACK_INDEPENDENCE_OR_AUTHORITY")
    observed = utc(payload["readbackAt"])
    if (
        observed < utc(anchor["issuedAt"])
        or observed > now + timedelta(minutes=2)
        or now - observed > timedelta(days=2)
    ):
        raise ValueError("HOLD_QL473_READBACK_STALE")
    verify_signature364(payload, signature, key_pem, independent_pin)
    return {
        "signedReadbackClaimVerified": True,
        "copiedLedgerByteEquivalent": True,
        "readbackReceiptDigest": hashlib.sha256(canonical(readback)).hexdigest(),
        "readbackAt": payload["readbackAt"],
        "offHostStorageIndependentlyProven": False,
    }


def verify_three_master364(
    package: Any,
    public_keys: Any,
    pinned_keys: Any,
    expected_commit: str,
    now: datetime,
    excluded_pins: set[str],
) -> dict[str, Any]:
    """Three distinct signers attest one challenge, not live service connectivity."""
    payload, signatures = signed_payload364(package, PILOT_SCHEMA, PILOT_KEYS)
    require_source364(payload, expected_commit)
    if (
        type(public_keys) is not dict
        or type(pinned_keys) is not dict
        or type(signatures) is not dict
        or set(public_keys) != set(SERVICES)
        or set(pinned_keys) != set(SERVICES)
        or set(signatures) != set(SERVICES)
        or not all(type(s) is str and HEX64.fullmatch(s) for s in pinned_keys.values())
        or len(set(pinned_keys.values())) != 3
        or set(pinned_keys.values()) & excluded_pins
    ):
        raise ValueError("HOLD_QL473_INDEPENDENT_PEER_KEYS_REQUIRED")
    if (
        type(payload["peerVersions"]) is not dict
        or set(payload["peerVersions"]) != set(SERVICES)
        or any(
            type(version) is not str or SAFE_VERSION.fullmatch(version) is None
            for version in payload["peerVersions"].values()
        )
        or type(payload["challenge"]) is not str
        or re.fullmatch("[0-9a-f]{32}", payload["challenge"]) is None
        or type(payload["drillId"]) is not str
        or IDENT.fullmatch(payload["drillId"]) is None
        or any(
            payload[key] is not True
            for key in (
                "claimedBoundedMtls", "claimedSignedPeerAcks",
                "claimedRollbackReady", "performedOnOriginalHostClaimed",
            )
        )
        or payload["automaticStartupAuthorized"] is not False
        or payload["ql340cReceiverAuthorized"] is not False
    ):
        raise ValueError("HOLD_QL473_PILOT_SCOPE_OR_AUTHORITY")
    observed, issued = utc(payload["observedAt"]), utc(payload["issuedAt"])
    if (
        observed > issued
        or issued > now + timedelta(minutes=2)
        or now - observed > timedelta(minutes=15)
        or issued - observed > timedelta(minutes=5)
    ):
        raise ValueError("HOLD_QL473_PILOT_TIME_WINDOW")
    for service in SERVICES:
        verify_signature364(payload, signatures[service], public_keys[service], pinned_keys[service])
    return {
        "threeDistinctPeerSignaturesVerified": True,
        "claimedPeerVersions": payload["peerVersions"],
        "claimedObservationAt": payload["observedAt"],
        "claimedChallengeDigest": hashlib.sha256(
            payload["challenge"].encode("ascii")
        ).hexdigest(),
        "liveMtlsIndependentlyObserved": False,
        "realSignedPeerAckIndependentlyProven": False,
        "workerInstallationAuthorized": False,
    }


def review364(
    *,
    ledger: Any,
    copy: Any,
    anchor: Any,
    anchor_key: bytes | None,
    anchor_pin: str,
    readback: Any,
    readback_key: bytes | None,
    readback_pin: str,
    pilot: Any,
    peer_keys: Any,
    peer_pins: Any,
    expected_commit: str,
    now_ms: int,
    original_host: bool,
) -> dict[str, Any]:
    """Fail closed: code safety signals must never assert operational GREEN."""
    result = {
        "schema": DASH_SCHEMA,
        "sourceBuild": 364,
        "originalHost": HOST,
        "serverShell": "ai-data-platform",
        "sourceFeatureCoverageEstimate": 73,
        "featureCoverageBaseline": 68,
        "estimatedSourceFeatureGainPoints": 5,
        "fieldAcceptanceEstimate": 25,
        "estimatedOverallReadiness": 56,
        "progressIsPlanningEstimateNotRuntimeProof": True,
        "anchorStatus": "HOLD_MISSING_OR_INVALID",
        "readbackStatus": "HOLD_MISSING_OR_INVALID",
        "peerPilotStatus": "HOLD_MISSING_OR_INVALID",
        "independentReadbackClaimVerified": False,
        "copiedLedgerContentMatched": False,
        "distinctThreeMasterSignedClaimsVerified": False,
        "liveThreeMasterPilotIndependentlyVerified": False,
        "offHostStorageIndependentlyProven": False,
        "originalHostUnattendedRecoveryVerified": False,
        "physicalUnattendedProductionGreen": False,
        "threeMasterWorkerProductionGreen": False,
        "commsPrivateReceiverAuthorized": False,
        "workerAutomaticStartupAuthorized": False,
        "webMutationAvailable": False,
        "workerReviews": [
            {
                "worker": service,
                "readOnlySignedClaimStatus": "HOLD_MISSING_INDEPENDENT_LIVE_EVIDENCE",
                "liveConnectedVerified": False,
                "ownerPilotInstallationApproved": False,
                "realRollbackWitnessed": False,
            }
            for service in SERVICES
        ],
    }
    if not original_host:
        result["anchorStatus"] = "HOLD_NOT_ORIGINAL_WINDOWS_HOST"
        return result
    now = datetime.fromtimestamp(now_ms / 1000, tz=UTC)
    try:
        anchored = verified_anchor363(
            ledger, anchor, anchor_key, anchor_pin, expected_commit, now
        )
        result["anchorStatus"] = "SIGNED_ANCHOR_CLAIM_VERIFIED"
    except (ValueError, TypeError, KeyError, OverflowError):
        return result
    try:
        verified = verify_readback364(
            ledger, copy, anchor, readback, readback_key,
            readback_pin, expected_commit, now
        )
        result["readbackStatus"] = "SIGNED_INDEPENDENT_READBACK_CLAIM_VERIFIED_NOT_STORAGE_PROOF"
        result["independentReadbackClaimVerified"] = verified["signedReadbackClaimVerified"]
        result["copiedLedgerContentMatched"] = verified["copiedLedgerByteEquivalent"]
    except (ValueError, TypeError, KeyError, OverflowError):
        return result
    try:
        excluded = {anchor_pin, readback_pin}
        excluded.update(e["signerKeyFingerprint"] for e in verify_ledger(ledger, expected_commit)["events"])
        verified_pilot = verify_three_master364(
            pilot, peer_keys, peer_pins, expected_commit, now, excluded
        )
        result["peerPilotStatus"] = "THREE_PEER_SIGNED_CLAIMS_VALID_NOT_LIVE_CONNECTED"
        result["distinctThreeMasterSignedClaimsVerified"] = verified_pilot[
            "threeDistinctPeerSignaturesVerified"
        ]
        for worker in result["workerReviews"]:
            worker["readOnlySignedClaimStatus"] = "SIGNED_PILOT_CLAIM_NOT_APPROVED_SERVICE"
    except (ValueError, TypeError, KeyError, OverflowError):
        pass
    return result
