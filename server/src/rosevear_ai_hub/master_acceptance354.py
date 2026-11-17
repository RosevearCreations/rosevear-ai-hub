"""QL-463: owner-pinned boot enrollment, peer sink evidence and TLS rotation gates.

All verifiers fail closed. Signed reports are source assertions, not proof of
independent physical uptime or a currently connected remote Master. No browser
mutation, service control, key issuance or physical receiver authorization.
"""

from __future__ import annotations

import hashlib
import socket
import ssl
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from rosevear_ai_hub.master_acceptance353 import verify_reboot_ceremony353
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.master_transport352 import (
    _verify_registry_signature,
    verify_ack352,
    verify_event352,
)
from rosevear_ai_hub.service_identity347 import Registry347, _canonical, _digest, _sha

WITNESS_ENROLLMENT_SCHEMA354 = "rosevear.hub.owner-witness-enrollment354.v1"
SINK_PILOT_SCHEMA354 = "rosevear.master.signed-sink-pilot354.v1"
CERT_ROTATION_SCHEMA354 = "rosevear.hub.owner-certificate-rotation354.v1"
MAX_EVIDENCE_AGE_MS = 90_000
MAX_ROTATION_WINDOW_MS = 86_400_000
MAX_ENROLLMENT_MS = 30 * 86_400_000
PEER_SINKS = ("ai-data-platform", "rosevear-comms-hub")


def _signed_owner_payload354(
    signed: Any, *, owner_public: bytes, owner_pin: str,
) -> dict[str, Any] | None:
    if not (
        type(signed) is dict and set(signed) == {"payload", "signature"}
        and type(signed["payload"]) is dict
        and type(signed["signature"]) is str and len(signed["signature"]) == 128
        and type(owner_public) is bytes and len(owner_public) == 32
        and _sha(owner_pin)
        and hashlib.sha256(owner_public).hexdigest() == owner_pin
    ):
        return None
    try:
        Ed25519PublicKey.from_public_bytes(owner_public).verify(
            bytes.fromhex(signed["signature"]), _canonical(signed["payload"]),
        )
        return signed["payload"]
    except (InvalidSignature, TypeError, ValueError):
        return None


def verify_witness_enrollment354(
    *, signed_enrollment: Any, owner_public: bytes, owner_pin: str,
    witness_public: bytes, reviewer_public: bytes,
    manifest_digest: str, now_ms: int, machine_name: str,
) -> dict[str, Any]:
    hold = {
        "state": "HOLD_NO_OWNER_ENROLLED_INDEPENDENT_BOOT_WITNESSES",
        "ownerPinnedEnrollmentVerified": False,
        "independentWitnessKeyVerified": False,
        "independentReviewerKeyVerified": False,
        "originalHostRuntimeVerified": False,
        "physicalReceiverAuthorized": False,
    }
    if not (
        type(now_ms) is int and _sha(manifest_digest)
        and type(machine_name) is str and machine_name.upper() == ORIGINAL_HOST
        and type(witness_public) is bytes and len(witness_public) == 32
        and type(reviewer_public) is bytes and len(reviewer_public) == 32
    ):
        return hold
    p = _signed_owner_payload354(
        signed_enrollment, owner_public=owner_public, owner_pin=owner_pin,
    )
    if not (
        type(p) is dict and set(p) == {
            "schema", "originalHost", "manifestDigest",
            "hostWitnessPin", "reviewerPin", "issuedAtMs", "expiresAtMs",
            "receiverActivationAuthorized",
        }
        and p["schema"] == WITNESS_ENROLLMENT_SCHEMA354
        and p["originalHost"] == ORIGINAL_HOST
        and p["manifestDigest"] == manifest_digest
        and p["receiverActivationAuthorized"] is False
        and _sha(p["hostWitnessPin"]) and _sha(p["reviewerPin"])
        and len({p["hostWitnessPin"], p["reviewerPin"], owner_pin}) == 3
        and hashlib.sha256(witness_public).hexdigest() == p["hostWitnessPin"]
        and hashlib.sha256(reviewer_public).hexdigest() == p["reviewerPin"]
        and type(p["issuedAtMs"]) is int and type(p["expiresAtMs"]) is int
        and 0 <= now_ms - p["issuedAtMs"] <= MAX_ENROLLMENT_MS
        and p["issuedAtMs"] < p["expiresAtMs"]
        <= p["issuedAtMs"] + MAX_ENROLLMENT_MS
        and now_ms < p["expiresAtMs"]
    ):
        return hold
    return {
        **hold,
        "state": "OWNER_SIGNED_SEPARATE_BOOT_AND_REVIEWER_KEYS",
        "ownerPinnedEnrollmentVerified": True,
        "independentWitnessKeyVerified": True,
        "independentReviewerKeyVerified": True,
    }


def verify_enrolled_reboot354(
    *, enrollment_result: dict[str, Any], ceremony_result: dict[str, Any],
) -> dict[str, Any]:
    hold = {
        "state": "HOLD_NO_ENROLLED_TWO_BOOT_CORROBORATION",
        "signedTwoBootsCorroborated": False,
        "unattendedTaskStartupVerified": False,
        "continuous24HourUptimeVerified": False,
        "physicalReceiverAuthorized": False,
    }
    if (
        enrollment_result.get("ownerPinnedEnrollmentVerified") is True
        and ceremony_result.get("signedSequenceVerified") is True
        and ceremony_result.get("independentReviewerAssertionVerified") is True
    ):
        return {
            **hold, "state": "OWNER_ENROLLED_SIGNED_TWO_BOOT_ASSERTION",
            "signedTwoBootsCorroborated": True,
        }
    return hold


def verify_signed_peer_sink354(
    *, signed_sink: Any, signed_event: Any, signed_delivery_ack: Any,
    registry: Registry347, manifest_digest: str,
    peer_tls_pin: str, now_ms: int,
) -> dict[str, Any]:
    hold = {
        "state": "HOLD_NO_INDEPENDENTLY_SIGNED_PEER_SINK_EVIDENCE",
        "signedPeerSinkReceiptVerified": False,
        "originPinnedTlsConnectionVerified": False,
        "livePeerCurrentlyConnected": False,
        "physicalReceiverAuthorized": False,
        "peer": None,
    }
    if not (
        isinstance(registry, Registry347)
        and _sha(manifest_digest) and _sha(peer_tls_pin)
        and type(now_ms) is int
    ):
        return hold
    event = verify_event352(
        signed_event, registry=registry,
        manifest_sha=manifest_digest, now_ms=now_ms,
    )
    if not event["verified"] or event["payload"]["eventType"] != "master.health":
        return hold
    p_event = event["payload"]
    if p_event["audience"] not in PEER_SINKS:
        return hold
    ack = verify_ack352(
        signed_delivery_ack, expected_event=p_event,
        registry=registry, now_ms=now_ms,
    )
    if not ack["verified"]:
        return hold
    if not (
        type(signed_sink) is dict and set(signed_sink) == {"payload", "signature"}
        and type(signed_sink["payload"]) is dict
    ):
        return hold
    p = signed_sink["payload"]
    if not (
        set(p) == {
            "schema", "protocolVersion", "issuer", "audience",
            "keyId", "manifestDigest", "messageId", "messageDigest",
            "deliveryAckDigest", "sourceEvidenceDigest", "tlsLeafPin",
            "sinkDisposition", "observedAtMs", "expiresAtMs",
        }
        and p["schema"] == SINK_PILOT_SCHEMA354
        and p["protocolVersion"] == "1.1"
        and p["issuer"] == p_event["audience"]
        and p["audience"] == "rosevear-ai-hub"
        and p["manifestDigest"] == manifest_digest
        and p["messageId"] == p_event["messageId"]
        and p["messageDigest"] == _digest(p_event)
        and p["deliveryAckDigest"] == _digest(signed_delivery_ack["payload"])
        and p["sourceEvidenceDigest"] == p_event["sourceEvidenceDigest"]
        and p["tlsLeafPin"] == peer_tls_pin
        and p["sinkDisposition"] == "READ_ONLY_EVENT_RECORDED"
        and type(p["observedAtMs"]) is int
        and type(p["expiresAtMs"]) is int
        and p_event["issuedAtMs"] <= p["observedAtMs"] <= now_ms
        and 0 <= now_ms - p["observedAtMs"] <= MAX_EVIDENCE_AGE_MS
        and p["observedAtMs"] < p["expiresAtMs"]
        <= p["observedAtMs"] + MAX_EVIDENCE_AGE_MS
        and now_ms < p["expiresAtMs"]
        and _verify_registry_signature(
            signed=signed_sink, issuer=p["issuer"], key_id=p["keyId"],
            registry=registry, at_ms=now_ms, issued_at_ms=p["observedAtMs"],
        )
    ):
        return hold
    return {
        **hold, "state": "PEER_SIGNED_READ_ONLY_SINK_ASSERTION",
        "signedPeerSinkReceiptVerified": True, "peer": p["issuer"],
    }


def verify_certificate_rotation_plan354(
    *, signed_plan: Any, owner_public: bytes, owner_pin: str,
    manifest_digest: str, peer: dict[str, Any], now_ms: int,
) -> dict[str, Any]:
    hold = {
        "state": "HOLD_NO_OWNER_SIGNED_CERTIFICATE_ROTATION_PLAN",
        "ownerSignedPlanVerified": False,
        "candidateTlsHandshakeVerified": False,
        "certificateActivated": False,
        "automaticKeyRotationAuthorized": False,
        "physicalReceiverAuthorized": False,
    }
    if not (
        _sha(manifest_digest) and type(peer) is dict
        and type(now_ms) is int
        and peer.get("id") in PEER_SINKS
        and _sha(peer.get("tlsLeafPin"))
        and type(peer.get("hostname")) is str
        and type(peer.get("port")) is int
    ):
        return hold
    p = _signed_owner_payload354(
        signed_plan, owner_public=owner_public, owner_pin=owner_pin,
    )
    if not (
        type(p) is dict and set(p) == {
            "schema", "manifestDigest", "peer", "hostname", "port",
            "previousTlsLeafPin", "candidateTlsLeafPin",
            "issuedAtMs", "expiresAtMs", "activateAutomatically",
        }
        and p["schema"] == CERT_ROTATION_SCHEMA354
        and p["manifestDigest"] == manifest_digest
        and p["peer"] == peer["id"]
        and p["hostname"] == peer["hostname"]
        and p["port"] == peer["port"]
        and p["previousTlsLeafPin"] == peer["tlsLeafPin"]
        and _sha(p["candidateTlsLeafPin"])
        and p["candidateTlsLeafPin"] != p["previousTlsLeafPin"]
        and p["activateAutomatically"] is False
        and type(p["issuedAtMs"]) is int
        and type(p["expiresAtMs"]) is int
        and 0 <= now_ms - p["issuedAtMs"] <= MAX_ROTATION_WINDOW_MS
        and p["issuedAtMs"] < p["expiresAtMs"]
        <= p["issuedAtMs"] + MAX_ROTATION_WINDOW_MS
        and now_ms < p["expiresAtMs"]
    ):
        return hold
    return {**hold, "state": "OWNER_SIGNED_CANDIDATE_PLAN_ONLY",
            "ownerSignedPlanVerified": True,
            "candidateTlsLeafPin": p["candidateTlsLeafPin"]}


def probe_candidate_mtls354(
    *, plan: dict[str, Any], peer: dict[str, Any],
    ca_file: Path, client_cert_file: Path, client_key_file: Path,
) -> dict[str, Any]:
    """Explicit original-host CLI only: no HTTP or service changes, no dynamic URL."""
    hold = {
        "state": "HOLD_NO_CANDIDATE_MTLS_HANDSHAKE",
        "candidateTlsHandshakeVerified": False,
        "certificateActivated": False,
    }
    if not (
        plan.get("ownerSignedPlanVerified") is True
        and peer.get("id") in PEER_SINKS
        and type(peer.get("hostname")) is str
        and type(peer.get("port")) is int and 1 <= peer["port"] <= 65535
        and all(
            isinstance(p, Path) and p.is_file() and not p.is_symlink()
            for p in (ca_file, client_cert_file, client_key_file)
        )
    ):
        return hold
    # Candidate pin is only accepted if separately owner-approved in the caller.
    expected_pin = plan.get("candidateTlsLeafPin")
    if not _sha(expected_pin):
        return hold
    try:
        ctx = ssl.create_default_context(cafile=str(ca_file))
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.verify_mode = ssl.CERT_REQUIRED
        ctx.check_hostname = True
        ctx.load_cert_chain(
            certfile=str(client_cert_file), keyfile=str(client_key_file),
        )
        with socket.create_connection((peer["hostname"], peer["port"]), timeout=5) as raw:
            with ctx.wrap_socket(raw, server_hostname=peer["hostname"]) as conn:
                conn.settimeout(5)
                der = conn.getpeercert(binary_form=True)
                if not der or hashlib.sha256(der).hexdigest() != expected_pin:
                    return hold
                return {
                    **hold,
                    "state": "OWNER_PINNED_CANDIDATE_TLS_HANDSHAKE_ONLY",
                    "candidateTlsHandshakeVerified": True,
                }
    except (OSError, ssl.SSLError, ValueError, TypeError):
        return hold


def acceptance_summary354(
    *, witness: dict[str, Any], reboot: dict[str, Any],
    sink_results: list[dict[str, Any]], rotation: dict[str, Any],
    audit: dict[str, Any],
) -> dict[str, Any]:
    sinks = {
        peer: "PEER_SIGNED_SINK_ONLY" if any(
            x.get("peer") == peer and x.get("signedPeerSinkReceiptVerified") is True
            for x in sink_results
        ) else "UNVERIFIED"
        for peer in PEER_SINKS
    }
    return {
        "schema": "rosevear.hub.master-acceptance354.v1",
        "sourceBuild": 354, "serverShell": "ai-data-platform",
        "originalHost": ORIGINAL_HOST,
        "witnessEnrollment": witness, "rebootCorroboration": reboot,
        "peerSinks": sinks, "certificateRotation": rotation, "commsAudit": audit,
        "liveThreeMasterMtlSPilotVerified": False,
        "independentHumanReadVerified": False,
        "unattendedWindowsRecoveryVerified": False,
        "receiverActivationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "incidentStatus": "OPEN", "webMutationAvailable": False,
        "protocolPreferred": "1.1", "protocolLegacyCompatible": "1.0",
    }
