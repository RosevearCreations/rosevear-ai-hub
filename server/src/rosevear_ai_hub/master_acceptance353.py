"""QL-462: conservative post-reboot, Comms audit, Master-pilot and key rotation proofs.

These are verifiers for separately supplied, independently pinned source receipts.
No receipt is generated or fabricated by the API, and no unattended reboot,
human acknowledgement, remote peer connection or receiver action is presumed.
"""

from __future__ import annotations

import hashlib
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from rosevear_ai_hub.master_shell349 import MASTER_MODULES, ORIGINAL_HOST
from rosevear_ai_hub.master_transport352 import (
    _verify_registry_signature,
    verify_ack352,
)
from rosevear_ai_hub.original_host_witness352 import verify_signed_witness352
from rosevear_ai_hub.service_identity347 import (
    MAX_OVERLAP_MS,
    Registry347,
    _canonical,
    _digest,
    _sha,
)

CEREMONY_SCHEMA353 = "rosevear.hub.original-host-acceptance353.v1"
AUDIT_SCHEMA353 = "rosevear.comms.audit-linked-operator-ack353.v1"
MAX_CEREMONY_INTERVAL_MS = 7 * 86_400_000
MAX_SOURCE_AGE_MS = 120_000
MAX_AUDIT_AGE_MS = 90_000
ROTATION_ALERT_MS = 7 * 86_400_000


def _signed_payload353(signed: Any, public: bytes, pin: str) -> dict[str, Any] | None:
    if not (
        type(signed) is dict
        and set(signed) == {"payload", "signature"}
        and type(signed["payload"]) is dict
        and type(signed["signature"]) is str
        and len(signed["signature"]) == 128
        and type(public) is bytes
        and len(public) == 32
        and _sha(pin)
        and hashlib.sha256(public).hexdigest() == pin
    ):
        return None
    try:
        Ed25519PublicKey.from_public_bytes(public).verify(
            bytes.fromhex(signed["signature"]), _canonical(signed["payload"])
        )
    except (InvalidSignature, ValueError, TypeError):
        return None
    return signed["payload"]


def verify_reboot_ceremony353(
    *,
    signed_ceremony: Any,
    before_receipt: Any,
    after_receipt: Any,
    host_witness_public: bytes,
    host_witness_pin: str,
    independent_reviewer_public: bytes,
    independent_reviewer_pin: str,
    owner_pin: str,
    manifest_digest: str,
    now_ms: int,
) -> dict[str, Any]:
    hold = {
        "state": "HOLD_NO_VALID_INDEPENDENT_REBOOT_CORROBORATION",
        "signedSequenceVerified": False,
        "independentReviewerAssertionVerified": False,
        "automaticStartupIndependentlyProven": False,
        "continuous24HourOperationVerified": False,
        "physicalReceiverAuthorized": False,
        "bootCount": 0,
    }
    if not (
        type(now_ms) is int
        and _sha(manifest_digest)
        and _sha(host_witness_pin)
        and _sha(independent_reviewer_pin)
        and _sha(owner_pin)
        and len({host_witness_pin, independent_reviewer_pin, owner_pin}) == 3
        and type(before_receipt) is dict
        and type(after_receipt) is dict
        and type(before_receipt.get("payload")) is dict
        and type(after_receipt.get("payload")) is dict
    ):
        return hold
    old = before_receipt["payload"]
    new = after_receipt["payload"]
    if not (
        type(old.get("observedAtMs")) is int
        and type(new.get("observedAtMs")) is int
        and 60_000 <= new["observedAtMs"] - old["observedAtMs"] <= MAX_CEREMONY_INTERVAL_MS
        and 0 <= now_ms - new["observedAtMs"] <= MAX_SOURCE_AGE_MS
        and type(old.get("bootMs")) is int
        and type(new.get("bootMs")) is int
        and old["bootMs"] < new["bootMs"] <= new["observedAtMs"]
        and new["bootMs"] > old["observedAtMs"]
    ):
        return hold
    for sample in (before_receipt, after_receipt):
        result = verify_signed_witness352(
            receipt=sample,
            public_key=host_witness_public,
            independent_pin=host_witness_pin,
            owner_pin=owner_pin,
            manifest_digest=manifest_digest,
            now_ms=sample["payload"]["observedAtMs"],
        )
        if result["verified"] is not True:
            return hold
    p = _signed_payload353(
        signed_ceremony, independent_reviewer_public, independent_reviewer_pin
    )
    if not (
        type(p) is dict
        and set(p)
        == {
            "schema", "originalHost", "manifestDigest", "beforeReceiptDigest",
            "afterReceiptDigest", "beforeBootMs", "afterBootMs",
            "reviewerRole", "reviewedAtMs", "physicalReceiverAuthorized",
        }
        and p["schema"] == CEREMONY_SCHEMA353
        and p["originalHost"] == ORIGINAL_HOST
        and p["manifestDigest"] == manifest_digest
        and p["beforeReceiptDigest"] == _digest(before_receipt)
        and p["afterReceiptDigest"] == _digest(after_receipt)
        and p["beforeBootMs"] == old["bootMs"]
        and p["afterBootMs"] == new["bootMs"]
        and p["reviewerRole"] == "independent_reviewer"
        and p["physicalReceiverAuthorized"] is False
        and type(p["reviewedAtMs"]) is int
        and new["observedAtMs"] <= p["reviewedAtMs"] <= now_ms
        and 0 <= now_ms - p["reviewedAtMs"] <= MAX_SOURCE_AGE_MS
    ):
        return hold
    return {
        **hold,
        "state": "SIGNED_TWO_BOOT_SEQUENCE_AND_REVIEWER_ASSERTION",
        "signedSequenceVerified": True,
        "independentReviewerAssertionVerified": True,
        "bootCount": 2,
    }


def verify_comms_audit_link353(
    *,
    event_payload: Any,
    operator_ack: Any,
    signed_audit: Any,
    registry: Registry347,
    now_ms: int,
    permitted_owner_audit_ids: frozenset[str],
) -> dict[str, Any]:
    hold = {
        "state": "HOLD_NO_VERIFIED_COMMS_SOURCE_AUDIT_LINK",
        "commsSignedAuditLinked": False,
        "humanReadIndependentlyWitnessed": False,
        "messageId": None,
    }
    if not (
        type(event_payload) is dict
        and type(operator_ack) is dict
        and type(signed_audit) is dict
        and type(signed_audit.get("payload")) is dict
        and isinstance(registry, Registry347)
        and type(now_ms) is int
        and isinstance(permitted_owner_audit_ids, frozenset)
        and permitted_owner_audit_ids
    ):
        return hold
    ack = verify_ack352(
        operator_ack,
        expected_event=event_payload,
        registry=registry,
        now_ms=now_ms,
        operator_ack=True,
    )
    if ack["verified"] is not True:
        return hold
    p = signed_audit["payload"]
    if not (
        set(p)
        == {
            "schema", "protocolVersion", "issuer", "audience", "keyId",
            "messageId", "eventDigest", "ackDigest", "auditRecord",
            "issuedAtMs", "expiresAtMs",
        }
        and p["schema"] == AUDIT_SCHEMA353
        and p["protocolVersion"] == "1.1"
        and p["issuer"] == "rosevear-comms-hub"
        and p["audience"] == "rosevear-ai-hub"
        and p["messageId"] == event_payload.get("messageId")
        and p["eventDigest"] == _digest(event_payload)
        and p["ackDigest"] == _digest(operator_ack["payload"])
        and type(p["auditRecord"]) is dict
        and set(p["auditRecord"])
        == {
            "messageId", "eventDigest", "ownerAuditId", "actorRole",
            "outcome", "occurredAtMs",
        }
        and p["auditRecord"]["messageId"] == p["messageId"]
        and p["auditRecord"]["eventDigest"] == p["eventDigest"]
        and p["auditRecord"]["actorRole"] == "owner"
        and p["auditRecord"]["outcome"] == "ACKNOWLEDGED"
        and p["auditRecord"]["ownerAuditId"] in permitted_owner_audit_ids
        and type(p["auditRecord"]["occurredAtMs"]) is int
        and event_payload["issuedAtMs"]
        <= p["auditRecord"]["occurredAtMs"]
        <= operator_ack["payload"]["issuedAtMs"]
        and _digest(p["auditRecord"])
        == operator_ack["payload"]["actorAuditDigest"]
        and type(p["issuedAtMs"]) is int
        and type(p["expiresAtMs"]) is int
        and operator_ack["payload"]["issuedAtMs"] <= p["issuedAtMs"] <= now_ms
        and 0 <= now_ms - p["issuedAtMs"] <= MAX_AUDIT_AGE_MS
        and p["issuedAtMs"] < p["expiresAtMs"] <= p["issuedAtMs"] + MAX_AUDIT_AGE_MS
        and now_ms < p["expiresAtMs"]
        and _verify_registry_signature(
            signed=signed_audit,
            issuer=p["issuer"],
            key_id=p["keyId"],
            registry=registry,
            at_ms=now_ms,
            issued_at_ms=p["issuedAtMs"],
        )
    ):
        return hold
    return {
        **hold,
        "state": "COMMS_SIGNED_OWNER_AUDIT_DIGEST_CORROBORATED",
        "commsSignedAuditLinked": True,
        "messageId": p["messageId"],
    }


def key_rotation_readiness353(registry: Registry347 | None, now_ms: int) -> dict[str, Any]:
    hold = {
        "state": "HOLD_NO_OWNER_SIGNED_MASTER_REGISTRY",
        "peerKeys": [],
        "automaticKeyActivationAuthorized": False,
        "keyMaterialExposed": False,
        "livePeerEnrollmentVerified": False,
    }
    if not isinstance(registry, Registry347) or type(now_ms) is not int:
        return hold
    records = registry.records
    per_service = []
    for issuer in MASTER_MODULES:
        keys = [x for x in records if x.issuer == issuer]
        if not keys:
            per_service.append({
                "id": issuer, "state": "HOLD_NO_KEY",
                "activeGenerations": 0, "expiryWithinDays": None,
            })
            continue
        active = [
            x for x in keys if x.active_from_ms <= now_ms < x.active_until_ms
            and (x.revoked_at_ms is None or now_ms < x.revoked_at_ms)
        ]
        remaining = min((x.active_until_ms - now_ms for x in active), default=None)
        pending = any(now_ms < x.active_from_ms for x in keys)
        per_service.append({
            "id": issuer,
            "state": (
                "EXPIRED_OR_REVOKED" if not active
                else "ROTATION_DUE" if remaining is not None and remaining <= ROTATION_ALERT_MS
                else "ACTIVE_PINNED_GENERATIONS"
            ),
            "activeGenerations": len(active),
            "expiryWithinDays": (
                round(remaining / 86_400_000, 1) if remaining is not None else None
            ),
            "futureKeyEnrolled": pending,
        })
    missing = any(x["state"] in ("HOLD_NO_KEY", "EXPIRED_OR_REVOKED") for x in per_service)
    due = any(x["state"] == "ROTATION_DUE" for x in per_service)
    for a in records:
        for b in records:
            if a is b or a.issuer != b.issuer:
                continue
            overlap = min(a.active_until_ms, b.active_until_ms) - max(
                a.active_from_ms, b.active_from_ms
            )
            if overlap > MAX_OVERLAP_MS:
                return hold
    return {
        **hold,
        "state": "HOLD_PEER_KEYS_MISSING" if missing else "ROTATION_DUE" if due else "PINNED_KEYS_VALID",
        "peerKeys": per_service,
    }
