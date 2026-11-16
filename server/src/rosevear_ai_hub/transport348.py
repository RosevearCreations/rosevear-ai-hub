"""Build 348 / QL-457: opt-in real mTLS read-only pilot and signed ACK custody.

There is deliberately no public HTTP route, automatic enrollment, background
sender or remote original-host command. A trusted local operator must load the
TLS certificate paths, exact peer pins and signing key outside request data.
"""

from __future__ import annotations

import hashlib
import http.client
import json
import re
import socket
import sqlite3
import ssl
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, load_der_public_key

from rosevear_ai_hub.service_identity347 import (
    ENDPOINT,
    FIELDS,
    Channel347,
    NonceLedger347,
    Registry347,
    _canonical,
    _digest,
    _sha,
    hold347,
    negotiate347,
    verify_readonly_delivery347,
)

ACK_SCHEMA = "rosevear.service.readonly-pilot-ack348.v1"
ACK_FIELDS = frozenset(
    ("schema", "issuer", "audience", "keyId", "messageId", "messageDigest",
     "bodyDigest", "status", "issuedAtMs", "expiresAtMs")
)
MAX_ACK_MS = 60_000
MAX_WIRE_BYTES = 8192
HOST_RE = re.compile(r"^[a-z0-9](?:[a-z0-9.-]{0,250}[a-z0-9])?$")


@dataclass(frozen=True)
class PeerEnrollment348:
    """Only from protected local owner-reviewed configuration, never HTTP JSON."""

    source: str
    destination: str
    hostname: str
    port: int
    server_cert_pin: str
    client_cert_pin: str
    ca_file: Path
    client_cert_file: Path
    client_key_file: Path
    peer_protocols: tuple[str, ...]
    peer_capabilities: tuple[str, ...]
    owner_approved: bool = False


def _enrolled(peer: Any) -> bool:
    return (
        isinstance(peer, PeerEnrollment348)
        and peer.owner_approved is True
        and peer.source != peer.destination
        and type(peer.hostname) is str
        and HOST_RE.fullmatch(peer.hostname) is not None
        and ".." not in peer.hostname
        and type(peer.port) is int
        and 1 <= peer.port <= 65535
        and _sha(peer.server_cert_pin)
        and _sha(peer.client_cert_pin)
        and isinstance(peer.ca_file, Path)
        and isinstance(peer.client_cert_file, Path)
        and isinstance(peer.client_key_file, Path)
        and all(x.is_file() for x in (peer.ca_file, peer.client_cert_file, peer.client_key_file))
        and isinstance(peer.peer_protocols, tuple)
        and isinstance(peer.peer_capabilities, tuple)
    )


def _tls_peer_pin348(sock: Any, expected: str) -> bool:
    """Requires an actual SSL socket, a verified CA chain and a leaf pin."""
    if not isinstance(sock, ssl.SSLSocket):
        return False
    try:
        der = sock.getpeercert(binary_form=True)
        return (
            sock.context.verify_mode == ssl.CERT_REQUIRED
            and sock.version() in ("TLSv1.2", "TLSv1.3")
            and bool(der)
            and hashlib.sha256(der).hexdigest() == expected
        )
    except (OSError, ValueError, ssl.SSLError):
        return False


class PilotAckJournal348:
    """No implicit enrollment; durable one-time local ACK evidence only."""

    def __init__(self, path: Path):
        self.path = path

    def enroll(self) -> bool:
        if not self.path.parent.is_dir():
            return False
        try:
            with sqlite3.connect(self.path, timeout=3) as db:
                db.execute("PRAGMA journal_mode=WAL")
                db.execute("PRAGMA synchronous=FULL")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS pilot_ack348 (
                    source TEXT NOT NULL, destination TEXT NOT NULL,
                    message_id TEXT PRIMARY KEY, message_digest TEXT NOT NULL,
                    ack_digest TEXT NOT NULL, observed_ms INTEGER NOT NULL)"""
                )
            return True
        except (sqlite3.Error, OSError):
            return False

    def claim(
        self,
        source: str,
        destination: str,
        message_id: str,
        message_digest: str,
        ack_digest: str,
        now_ms: int,
    ) -> bool:
        if not self.path.is_file():
            return False
        try:
            with sqlite3.connect(self.path, timeout=3, isolation_level=None) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    "INSERT INTO pilot_ack348 VALUES (?,?,?,?,?,?)",
                    (source, destination, message_id, message_digest, ack_digest, now_ms),
                )
                db.execute("COMMIT")
            return True
        except (sqlite3.Error, OSError):
            return False


def _sign_ack348(
    *,
    envelope: dict[str, Any],
    body: dict[str, Any],
    signer: Ed25519PrivateKey,
    key_id: str,
    registry: Registry347,
    now_ms: int,
) -> dict[str, Any] | None:
    p = envelope["payload"]
    audience = p["audience"]
    registered = registry.resolve(audience, key_id, at_ms=now_ms)
    if registered is None:
        return None
    public_der = signer.public_key().public_bytes(Encoding.DER, PublicFormat.SubjectPublicKeyInfo)
    if registered.public_der != public_der:
        return None
    ack = {
        "schema": ACK_SCHEMA,
        "issuer": audience,
        "audience": p["issuer"],
        "keyId": key_id,
        "messageId": p["messageId"],
        "messageDigest": _digest(envelope),
        "bodyDigest": _digest(body),
        "status": "READONLY_PERSISTED",
        "issuedAtMs": now_ms,
        "expiresAtMs": now_ms + MAX_ACK_MS,
    }
    return {"payload": ack, "signature": signer.sign(_canonical(ack)).hex()}


def receive_mtls_pilot348(
    *,
    sock: ssl.SSLSocket,
    peer: PeerEnrollment348,
    envelope: Any,
    body: Any,
    registry: Registry347,
    nonce_ledger: NonceLedger347,
    recipient_signer: Ed25519PrivateKey,
    recipient_key_id: str,
    now_ms: int,
) -> dict[str, Any]:
    """Called only after real server-side CA-verified client TLS handshake.

    The caller MUST use an SSLContext with CERT_REQUIRED for client auth.
    An HTTP route is intentionally NOT mounted by importing this module.
    """
    if not (
        _enrolled(peer)
        and isinstance(registry, Registry347)
        and isinstance(nonce_ledger, NonceLedger347)
        and isinstance(recipient_signer, Ed25519PrivateKey)
        and _tls_peer_pin348(sock, peer.client_cert_pin)
        and type(envelope) is dict
        and type(envelope.get("payload")) is dict
        and envelope["payload"].get("issuer") == peer.source
        and envelope["payload"].get("audience") == peer.destination
    ):
        return hold347("HOLD_QL457_CLIENT_TLS_OR_ENROLLMENT")
    verified = verify_readonly_delivery347(
        envelope=envelope,
        body=body,
        registry=registry,
        channel=Channel347(True, peer.source, peer.destination),
        ledger=nonce_ledger,
        peer_protocols=peer.peer_protocols,
        peer_capabilities=peer.peer_capabilities,
        now_ms=now_ms,
    )
    if not verified["accepted"]:
        return hold347("HOLD_QL457_SIGNED_INBOUND_REJECTED")
    ack = _sign_ack348(
        envelope=envelope,
        body=body,
        signer=recipient_signer,
        key_id=recipient_key_id,
        registry=registry,
        now_ms=now_ms,
    )
    if ack is None:
        return hold347("HOLD_QL457_RECIPIENT_SIGNER_NOT_ENROLLED")
    return {
        **hold347("QL457_READONLY_INBOUND_DURABLE_SIGNED_ACK_PILOT"),
        "pilotInboundVerified": True,
        "ack": ack,
    }


def verify_signed_ack348(
    *,
    ack: Any,
    envelope: Any,
    body: Any,
    peer: PeerEnrollment348,
    registry: Registry347,
    now_ms: int,
) -> bool:
    if not (
        _enrolled(peer)
        and isinstance(registry, Registry347)
        and type(now_ms) is int
        and type(ack) is dict
        and set(ack) == {"payload", "signature"}
        and type(ack["payload"]) is dict
        and set(ack["payload"]) == ACK_FIELDS
        and type(envelope) is dict
        and type(envelope.get("payload")) is dict
        and type(body) is dict
    ):
        return False
    a = ack["payload"]
    p = envelope["payload"]
    if not (
        a["schema"] == ACK_SCHEMA
        and a["issuer"] == peer.destination
        and a["audience"] == peer.source
        and a["messageId"] == p.get("messageId")
        and a["messageDigest"] == _digest(envelope)
        and a["bodyDigest"] == _digest(body)
        and a["status"] == "READONLY_PERSISTED"
        and type(a["keyId"]) is str
        and type(a["issuedAtMs"]) is int
        and type(a["expiresAtMs"]) is int
        and 0 <= now_ms - a["issuedAtMs"] <= MAX_ACK_MS
        and a["issuedAtMs"] < a["expiresAtMs"] <= a["issuedAtMs"] + MAX_ACK_MS
        and now_ms < a["expiresAtMs"]
        and type(ack["signature"]) is str
        and len(ack["signature"]) == 128
    ):
        return False
    key = registry.resolve(peer.destination, a["keyId"], at_ms=now_ms)
    if key is None or registry.resolve(peer.destination, a["keyId"], at_ms=a["issuedAtMs"]) is None:
        return False
    try:
        registered_public = load_der_public_key(key.public_der)
        registered_public.verify(bytes.fromhex(ack["signature"]), _canonical(a))
    except (InvalidSignature, TypeError, ValueError, AttributeError):
        return False
    return True


def deliver_mtls_pilot348(
    *,
    peer: PeerEnrollment348,
    envelope: Any,
    body: Any,
    registry: Registry347,
    ack_journal: PilotAckJournal348,
    now_ms: int,
) -> dict[str, Any]:
    """Send exactly one approved read-only POST over real pinned mutual TLS.

    Never follows redirects, retries, publishes commands or reports production
    CONNECTED. Successful results are specifically *pilot* delivery evidence.
    """
    if not (
        _enrolled(peer)
        and isinstance(registry, Registry347)
        and isinstance(ack_journal, PilotAckJournal348)
        and type(now_ms) is int
        and type(envelope) is dict
        and set(envelope) == {"payload", "signature"}
        and type(envelope["payload"]) is dict
        and set(envelope["payload"]) == FIELDS
        and type(body) is dict
        and envelope["payload"].get("issuer") == peer.source
        and envelope["payload"].get("audience") == peer.destination
        and envelope["payload"].get("method") == "POST"
        and envelope["payload"].get("path") == ENDPOINT
        and envelope["payload"].get("bodyDigest") == _digest(body)
        and envelope["payload"].get("issuedAtMs") is not None
        and type(envelope["payload"].get("issuedAtMs")) is int
        and type(envelope["payload"].get("expiresAtMs")) is int
        and envelope["payload"]["issuedAtMs"] <= now_ms < envelope["payload"]["expiresAtMs"]
    ):
        return hold347("HOLD_QL457_NO_APPROVED_ENROLLED_PILOT")
    p = envelope["payload"]
    negotiate = negotiate347(
        issuer=peer.source,
        audience=peer.destination,
        capability=p.get("capability"),
        peer_protocols=peer.peer_protocols,
        peer_capabilities=peer.peer_capabilities,
    )
    if not negotiate["accepted"] or negotiate.get("protocolVersion") != p.get("protocolVersion"):
        return hold347("HOLD_QL457_PEER_CAPABILITY_INCOMPATIBLE")
    signer = registry.resolve(peer.source, p.get("keyId"), at_ms=now_ms)
    if signer is None:
        return hold347("HOLD_QL457_ISSUER_KEY_UNENROLLED")
    try:
        load_der_public_key(signer.public_der).verify(
            bytes.fromhex(envelope["signature"]), _canonical(p)
        )
    except (InvalidSignature, TypeError, ValueError, KeyError, AttributeError):
        return hold347("HOLD_QL457_SENDER_SIGNATURE_INVALID")
    conn = None
    try:
        ctx = ssl.create_default_context(cafile=str(peer.ca_file))
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.verify_mode = ssl.CERT_REQUIRED
        ctx.check_hostname = True
        ctx.load_cert_chain(
            certfile=str(peer.client_cert_file), keyfile=str(peer.client_key_file)
        )
        conn = http.client.HTTPSConnection(
            peer.hostname, peer.port, timeout=5, context=ctx
        )
        conn.connect()
        if not _tls_peer_pin348(conn.sock, peer.server_cert_pin):
            return hold347("HOLD_QL457_SERVER_CERTIFICATE_PIN_MISMATCH")
        payload = _canonical({"envelope": envelope, "body": body})
        if len(payload) > MAX_WIRE_BYTES:
            return hold347("HOLD_QL457_MESSAGE_TOO_LARGE")
        conn.request(
            "POST",
            ENDPOINT,
            body=payload,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        response = conn.getresponse()
        if response.status != 200:
            return hold347("HOLD_QL457_HTTP_NOT_SUCCESS")
        raw = response.read(MAX_WIRE_BYTES + 1)
        if len(raw) > MAX_WIRE_BYTES:
            return hold347("HOLD_QL457_ACK_TOO_LARGE")
        result = json.loads(raw)
        if not isinstance(result, dict) or set(result) != {"ack"}:
            return hold347("HOLD_QL457_NO_SIGNED_ACK")
        ack = result["ack"]
        if not verify_signed_ack348(
            ack=ack, envelope=envelope, body=body, peer=peer, registry=registry,
            now_ms=now_ms
        ):
            return hold347("HOLD_QL457_INVALID_RECIPIENT_ACK")
        if not ack_journal.claim(
            peer.source, peer.destination, p["messageId"], _digest(envelope),
            _digest(ack), now_ms
        ):
            return hold347("HOLD_QL457_ACK_REPLAY_OR_DURABILITY_FAILURE")
        return {
            **hold347("QL457_PINNED_MTLS_SIGNED_ACK_PILOT_VERIFIED"),
            "pilotMutualTLSVerified": True,
            "pilotSignedAckVerified": True,
            "pilotReceiptPersisted": True,
            "protocolVersion": p["protocolVersion"],
        }
    except (
        OSError, ssl.SSLError, socket.timeout, ValueError, TypeError,
        http.client.HTTPException, json.JSONDecodeError
    ):
        return hold347("HOLD_QL457_TLS_NETWORK_OR_ACK_UNVERIFIED")
    finally:
        if conn is not None:
            conn.close()
