"""QL-472 independent custodian signature, fresh host drill correlation, worker HOLD review.

The anchor is a separately pinned Ed25519 signature about an existing QL-471
ledger. A signed off-host custody CLAIM is not a verified durable off-host copy.
Fresh local Windows telemetry is unsigned and is never independent boot proof.
No tasks, devices, peers, receivers, services or approval states are changed.
"""

from __future__ import annotations

import base64
import hashlib
from datetime import UTC, datetime, timedelta
from typing import Any

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, load_pem_public_key

from rosevear_ai_hub.master_acceptance361 import trusted_local_telemetry361
from rosevear_ai_hub.signed_intake362 import (
    HEX64,
    HOST,
    canonical,
    utc,
    verify_ledger,
)

ANCHOR_SCHEMA = "rosevear.hub.ql472.independent-anchor363.v1"
DASH_SCHEMA = "rosevear.hub.ql472.anchor-and-drill-status363.v1"
ANCHOR_KEYS = frozenset(
    {
        "schema",
        "originalHost",
        "sourceCommit",
        "ledgerSha256",
        "ledgerHeadSha256",
        "ledgerCount",
        "custodianRole",
        "custodianPin",
        "nonce",
        "issuedAt",
        "offHostCopyClaimed",
        "workerPilotAuthorized",
        "receiverActivationAuthorized",
        "physicalRuntimeIndependentlyVerified",
    }
)
WORKER_SCOPES = ("ai-data-worker", "comms-worker")


def verified_anchor363(
    ledger: Any,
    anchor: Any,
    public_pem: bytes | None,
    independent_pin: str,
    expected_commit: str,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Reject absent/stale/forged custodian assertions; do not certify off-host storage."""
    verified = verify_ledger(ledger, expected_commit)
    if not verified["events"]:
        raise ValueError("HOLD_QL472_NO_SIGNED_CLAIMS_TO_ANCHOR")
    if (
        not isinstance(anchor, dict)
        or set(anchor) != {"payload", "signature"}
        or not isinstance(anchor["payload"], dict)
        or set(anchor["payload"]) != ANCHOR_KEYS
    ):
        raise ValueError("HOLD_QL472_ANCHOR_SHAPE")
    p = anchor["payload"]
    if (
        p["schema"] != ANCHOR_SCHEMA
        or p["originalHost"] != HOST
        or p["sourceCommit"] != expected_commit
        or p["custodianRole"] != "independent-evidence-custodian"
        or p["offHostCopyClaimed"] is not True
        or p["workerPilotAuthorized"] is not False
        or p["receiverActivationAuthorized"] is not False
        or p["physicalRuntimeIndependentlyVerified"] is not False
    ):
        raise ValueError("HOLD_QL472_UNTRUSTED_HOST_OR_AUTHORITY")
    if (
        type(p["ledgerCount"]) is not int
        or p["ledgerCount"] != len(verified["events"])
        or p["ledgerHeadSha256"] != verified["events"][-1]["sha256"]
        or p["ledgerSha256"] != hashlib.sha256(canonical(verified)).hexdigest()
    ):
        raise ValueError("HOLD_QL472_LEDGER_HASH_OR_COUNT_CHANGED")
    if (
        type(independent_pin) is not str
        or not HEX64.fullmatch(independent_pin)
        or p["custodianPin"] != independent_pin
        or type(p["nonce"]) is not str
        or len(p["nonce"]) != 32
        or not all(c in "0123456789abcdef" for c in p["nonce"])
    ):
        raise ValueError("HOLD_QL472_INDEPENDENT_TRUST_PIN_REQUIRED")
    if independent_pin in {e["signerKeyFingerprint"] for e in verified["events"]}:
        raise ValueError("HOLD_QL472_CUSTODIAN_NOT_INDEPENDENT")
    issued = utc(p["issuedAt"])
    time_now = now or datetime.now(UTC)
    if issued > time_now + timedelta(minutes=2) or time_now - issued > timedelta(days=7):
        raise ValueError("HOLD_QL472_ANCHOR_STALE_OR_FUTURE")
    if issued < max(utc(e["observedAt"]) for e in verified["events"]):
        raise ValueError("HOLD_QL472_ANCHOR_PRECEDES_CLAIMS")
    if not isinstance(public_pem, bytes) or not 1 <= len(public_pem) <= 4096:
        raise ValueError("HOLD_QL472_PUBLIC_KEY_REQUIRED")
    try:
        key = load_pem_public_key(public_pem)
        if not isinstance(key, Ed25519PublicKey):
            raise ValueError("HOLD_QL472_ED25519_REQUIRED")
        raw = key.public_bytes(Encoding.Raw, PublicFormat.Raw)
        if hashlib.sha256(raw).hexdigest() != independent_pin:
            raise ValueError("HOLD_QL472_KEY_PIN_MISMATCH")
        signature_field = anchor["signature"]
        if not isinstance(signature_field, str) or not 1 <= len(signature_field) <= 256:
            raise ValueError("HOLD_QL472_SIGNATURE_FORMAT")
        signature = base64.b64decode(signature_field, validate=True)
        if len(signature) != 64:
            raise ValueError("HOLD_QL472_SIGNATURE_FORMAT")
        key.verify(signature, canonical(p))
    except ValueError:
        raise
    except Exception as err:
        raise ValueError("HOLD_QL472_SIGNATURE_INVALID") from err
    return {
        "signatureVerified": True,
        "independentlyPinnedCustodianSigner": True,
        "offHostStorageIsIndependentlyProven": False,
        "signedOffHostCopyClaimOnly": True,
        "ledgerCount": len(verified["events"]),
        "ledgerHeadSha256": p["ledgerHeadSha256"],
        "anchorIssuedAt": p["issuedAt"],
    }


def original_host_correlation363(
    ledger: Any,
    telemetry: Any,
    expected_commit: str,
    now_ms: int,
    *,
    original_host: bool,
) -> dict[str, Any]:
    """Correlate original-host fresh UNSIGNED boot time with prior signed claims."""
    hold = {
        "state": "HOLD_NO_FRESH_MATCHING_ORIGINAL_HOST_REBOOT_OBSERVATION",
        "freshUnsignedWindowsSample": False,
        "pairedIndependentSignerClaims": False,
        "bootBoundaryChronologicallyCorrelated": False,
        "physicalRebootIndependentlyProven": False,
        "authenticatedGuestRuntimeIndependentlyProven": False,
    }
    if not original_host or not trusted_local_telemetry361(
        telemetry, now_ms=now_ms, expected_commit=expected_commit
    ):
        return hold
    result = {**hold, "freshUnsignedWindowsSample": True}
    try:
        records = verify_ledger(ledger, expected_commit)["events"]
        boot = utc(telemetry["lastWindowsBootUtc"])
    except (ValueError, TypeError, KeyError):
        return result
    drills = list(dict.fromkeys(e["drillId"] for e in records))
    for drill in drills:
        events = [e for e in records if e["drillId"] == drill]
        starts = [e for e in events if e["scope"] == "reboot-before"]
        ends = [e for e in events if e["scope"] == "reboot-after"]
        for before in starts:
            for after in ends:
                if before["signerKeyFingerprint"] != after["signerKeyFingerprint"] and utc(
                    before["observedAt"]
                ) < utc(after["observedAt"]):
                    result["pairedIndependentSignerClaims"] = True
                    if utc(before["observedAt"]) < boot < utc(after["observedAt"]):
                        result["bootBoundaryChronologicallyCorrelated"] = True
                        result["state"] = (
                            "SIGNED_CLAIMS_AND_FRESH_UNSIGNED_BOOT_TIMELINE_CORRELATED_"
                            "NOT_PHYSICAL_PROOF"
                        )
                        return result
    return result


def review363(
    *,
    ledger: Any,
    anchor: Any,
    public_pem: bytes | None,
    pin: str,
    expected_commit: str,
    telemetry: Any,
    now_ms: int,
    original_host: bool,
) -> dict[str, Any]:
    """Owner-only review; never implies live operational service authority."""
    anchored: dict[str, Any] | None = None
    anchor_status = "HOLD_NO_INDEPENDENTLY_PINNED_ANCHOR"
    history: dict[str, Any] | None = None
    try:
        history = verify_ledger(ledger, expected_commit)
        anchored = verified_anchor363(
            ledger,
            anchor,
            public_pem,
            pin,
            expected_commit,
            datetime.fromtimestamp(now_ms / 1000, tz=UTC),
        )
        anchor_status = "SIGNED_CUSTODIAN_ANCHOR_VERIFIED_OFFHOST_DURABILITY_UNPROVEN"
    except (ValueError, TypeError, OverflowError):
        pass
    if not original_host:
        anchored = None
        anchor_status = "HOLD_ORIGINAL_HOST_ONLY"
        history = None
    correlation = original_host_correlation363(
        history,
        telemetry,
        expected_commit,
        now_ms,
        original_host=original_host and anchored is not None,
    )
    observed = history["events"] if history else []
    worker_reviews = []
    for scope, service in (
        ("ai-data-worker", "Rosevear-AIDataPlatform"),
        ("comms-worker", "Rosevear-CommsHub"),
    ):
        worker_claims = [e for e in observed if e["scope"] == scope]
        worker_reviews.append(
            {
                "worker": service,
                "fieldClaimCount": len(worker_claims),
                "escalation": (
                    "HOLD_INDEPENDENT_ANCHOR_REQUIRED"
                    if anchored is None
                    else "REVIEW_OWNER_APPROVAL_SIGNED_PEER_ACK_AND_ROLLBACK"
                    if worker_claims
                    else "REVIEW_MISSING_SIGNED_WORKER_EVIDENCE"
                ),
                "pilotInstallAuthorized": False,
                "sourceEvidenceMeansLivePeer": False,
                "signedPeerAckIndependentlyVerified": False,
                "rollbackIndependentlyWitnessed": False,
            }
        )
    return {
        "schema": DASH_SCHEMA,
        "sourceBuild": 363,
        "originalHost": HOST,
        "serverShell": "ai-data-platform",
        "anchorStatus": anchor_status,
        "independentCustodianSignatureVerified": bool(anchored),
        "offHostStorageIndependentlyVerified": False,
        "anchorHeadSha256": anchored["ledgerHeadSha256"] if anchored else None,
        "anchorIssuedAt": anchored["anchorIssuedAt"] if anchored else None,
        "historyEntryCount": len(observed),
        "rebootCorrelation": correlation,
        "workerReviews": worker_reviews,
        "physicalUnattendedProductionGreen": False,
        "threeMasterWorkerProductionGreen": False,
        "commsPrivateReceiverAuthorized": False,
        "webMutationAvailable": False,
    }
