"""QL-461: signed three-Master event transport and durable operator ACK custody.

No recipient HTTP route is installed here: receiving Masters must independently
adopt this versioned, no-command event contract. Only original-host local
dispatcher is allowed to deliver through exact enrolled, pinned mTLS peers.
"""

from __future__ import annotations

import hashlib
import http.client
import json
import os
import platform
import sqlite3
import ssl
import time
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.serialization import load_der_public_key

from rosevear_ai_hub.master_shell349 import MASTER_MODULES, ORIGINAL_HOST
from rosevear_ai_hub.service_identity347 import Registry347, _canonical, _digest, _sha
from rosevear_ai_hub.transport348 import (
    MAX_WIRE_BYTES,
    PeerEnrollment348,
    _enrolled,
    _tls_peer_pin348,
)

EVENT_SCHEMA352 = "rosevear.hub.signed-master-event352.v1"
ACK_SCHEMA352 = "rosevear.hub.signed-master-delivery-ack352.v1"
OPERATOR_ACK_SCHEMA352 = "rosevear.hub.signed-operator-audit-ack352.v1"
TRANSPORT_PATH352 = "/internal/rosevear/master/events/read-only/v1"
MAX_EVENT_AGE_MS = 90_000
ALERT_TYPES = ("master.health", "operator.issue")
DESTINATIONS = ("ai-data-platform", "rosevear-comms-hub")
EVENT_FIELDS = {
    "schema",
    "protocolVersion",
    "issuer",
    "audience",
    "keyId",
    "messageId",
    "nonce",
    "eventType",
    "sourceEvidenceDigest",
    "severity",
    "manifestDigest",
    "issuedAtMs",
    "expiresAtMs",
}
ACK_FIELDS = {
    "schema",
    "protocolVersion",
    "issuer",
    "audience",
    "keyId",
    "messageId",
    "messageDigest",
    "status",
    "issuedAtMs",
    "expiresAtMs",
}
OP_ACK_FIELDS = ACK_FIELDS | {"actorAuditDigest", "operatorRole"}


def _on_original_host352() -> bool:
    return os.name == "nt" and platform.node().upper() == ORIGINAL_HOST


def signed_event352(
    *,
    private_key: Ed25519PrivateKey,
    key_id: str,
    audience: str,
    event_type: str,
    source_evidence_sha: str,
    severity: str,
    manifest_sha: str,
    now_ms: int,
    nonce: str,
) -> dict[str, Any] | None:
    """Only trusted local original-host code may sign source-evidence references."""
    if not (
        _on_original_host352()
        and isinstance(private_key, Ed25519PrivateKey)
        and type(key_id) is str
        and 12 <= len(key_id) <= 128
        and audience in DESTINATIONS
        and event_type in ALERT_TYPES
        and (event_type != "operator.issue" or audience == "rosevear-comms-hub")
        and _sha(source_evidence_sha)
        and _sha(manifest_sha)
        and severity in ("INFO", "WARNING", "CRITICAL")
        and (event_type != "operator.issue" or severity != "INFO")
        and type(now_ms) is int
        and type(nonce) is str
        and 24 <= len(nonce) <= 128
        and nonce.isascii()
        and all(c.isalnum() or c in "-_" for c in nonce)
    ):
        return None
    payload = {
        "schema": EVENT_SCHEMA352,
        "protocolVersion": "1.1",
        "issuer": "rosevear-ai-hub",
        "audience": audience,
        "keyId": key_id,
        "messageId": hashlib.sha256(
            _canonical(
                [
                    manifest_sha,
                    audience,
                    event_type,
                    source_evidence_sha,
                ]
            )
        ).hexdigest(),
        "nonce": nonce,
        "eventType": event_type,
        "sourceEvidenceDigest": source_evidence_sha,
        "severity": severity,
        "manifestDigest": manifest_sha,
        "issuedAtMs": now_ms,
        "expiresAtMs": now_ms + MAX_EVENT_AGE_MS,
    }
    return {
        "payload": payload,
        "signature": private_key.sign(_canonical(payload)).hex(),
    }


def _verify_registry_signature(
    *,
    signed: Any,
    issuer: str,
    key_id: str,
    registry: Registry347,
    at_ms: int,
    issued_at_ms: int,
) -> bool:
    if not (
        isinstance(registry, Registry347)
        and type(signed) is dict
        and set(signed) == {"payload", "signature"}
        and type(signed["signature"]) is str
        and len(signed["signature"]) == 128
        and type(issuer) is str
        and issuer in MASTER_MODULES
        and type(key_id) is str
        and type(at_ms) is int
        and type(issued_at_ms) is int
    ):
        return False
    current = registry.resolve(issuer, key_id, at_ms=at_ms)
    old = registry.resolve(issuer, key_id, at_ms=issued_at_ms)
    if current is None or old is None:
        return False
    try:
        public = load_der_public_key(current.public_der)
        if not isinstance(public, Ed25519PublicKey):
            return False
        public.verify(bytes.fromhex(signed["signature"]), _canonical(signed["payload"]))
        return True
    except (InvalidSignature, TypeError, ValueError, AttributeError):
        return False


def verify_event352(
    signed: Any,
    *,
    registry: Registry347,
    manifest_sha: str,
    now_ms: int,
    allow_expired: bool = False,
) -> dict[str, Any]:
    hold = {"verified": False, "reason": "HOLD_UNSIGNED_STALE_OR_UNENROLLED_MASTER_EVENT"}
    if not (
        type(signed) is dict
        and set(signed) == {"payload", "signature"}
        and type(signed["payload"]) is dict
        and set(signed["payload"]) == EVENT_FIELDS
        and _sha(manifest_sha)
        and type(now_ms) is int
    ):
        return hold
    p = signed["payload"]
    if not (
        p["schema"] == EVENT_SCHEMA352
        and p["protocolVersion"] == "1.1"
        and p["issuer"] == "rosevear-ai-hub"
        and p["audience"] in DESTINATIONS
        and p["eventType"] in ALERT_TYPES
        and (p["eventType"] != "operator.issue" or p["audience"] == "rosevear-comms-hub")
        and p["severity"] in ("INFO", "WARNING", "CRITICAL")
        and (p["eventType"] != "operator.issue" or p["severity"] != "INFO")
        and _sha(p["sourceEvidenceDigest"])
        and _sha(p["manifestDigest"])
        and p["manifestDigest"] == manifest_sha
        and type(p["messageId"]) is str
        and p["messageId"]
        == hashlib.sha256(
            _canonical(
                [
                    manifest_sha,
                    p["audience"],
                    p["eventType"],
                    p["sourceEvidenceDigest"],
                ]
            )
        ).hexdigest()
        and type(p["nonce"]) is str
        and 24 <= len(p["nonce"]) <= 128
        and p["nonce"].isascii()
        and all(c.isalnum() or c in "-_" for c in p["nonce"])
        and type(p["issuedAtMs"]) is int
        and type(p["expiresAtMs"]) is int
        and 0 <= now_ms - p["issuedAtMs"] <= (7 * 86_400_000 if allow_expired else MAX_EVENT_AGE_MS)
        and p["issuedAtMs"] < p["expiresAtMs"] <= p["issuedAtMs"] + MAX_EVENT_AGE_MS
        and (allow_expired or now_ms < p["expiresAtMs"])
        and _verify_registry_signature(
            signed=signed,
            issuer=p["issuer"],
            key_id=p["keyId"],
            registry=registry,
            at_ms=now_ms,
            issued_at_ms=p["issuedAtMs"],
        )
    ):
        return hold
    return {
        "verified": True,
        "reason": "ED25519_ENROLLED_MASTER_EVENT",
        "payload": p,
        "digest": _digest(p),
    }


def verify_ack352(
    signed: Any,
    *,
    expected_event: dict[str, Any],
    registry: Registry347,
    now_ms: int,
    operator_ack: bool = False,
) -> dict[str, Any]:
    hold = {"verified": False, "reason": "HOLD_UNVERIFIED_PEER_OR_OPERATOR_ACK"}
    if not (
        type(signed) is dict
        and set(signed) == {"payload", "signature"}
        and type(signed["payload"]) is dict
        and set(signed["payload"]) == (OP_ACK_FIELDS if operator_ack else ACK_FIELDS)
        and type(expected_event) is dict
        and set(expected_event) == EVENT_FIELDS
        and type(now_ms) is int
    ):
        return hold
    p = signed["payload"]
    if not (
        p["schema"] == (OPERATOR_ACK_SCHEMA352 if operator_ack else ACK_SCHEMA352)
        and p["protocolVersion"] == "1.1"
        and p["issuer"] == expected_event["audience"]
        and p["audience"] == expected_event["issuer"]
        and p["messageId"] == expected_event["messageId"]
        and p["messageDigest"] == _digest(expected_event)
        and p["status"] == ("ACKNOWLEDGED" if operator_ack else "RECEIVED")
        and type(p["issuedAtMs"]) is int
        and type(p["expiresAtMs"]) is int
        and expected_event["issuedAtMs"] <= p["issuedAtMs"] <= now_ms
        and p["issuedAtMs"] - expected_event["issuedAtMs"] <= 7 * 86_400_000
        and 0 <= now_ms - p["issuedAtMs"] <= MAX_EVENT_AGE_MS
        and p["issuedAtMs"] < p["expiresAtMs"] <= p["issuedAtMs"] + MAX_EVENT_AGE_MS
        and now_ms < p["expiresAtMs"]
        and (
            not operator_ack
            or (
                expected_event["eventType"] == "operator.issue"
                and p["issuer"] == "rosevear-comms-hub"
                and p["operatorRole"] == "owner"
                and _sha(p["actorAuditDigest"])
            )
        )
        and _verify_registry_signature(
            signed=signed,
            issuer=p["issuer"],
            key_id=p["keyId"],
            registry=registry,
            at_ms=now_ms,
            issued_at_ms=p["issuedAtMs"],
        )
    ):
        return hold
    return {
        "verified": True,
        "reason": (
            "COMMS_SIGNED_OWNER_AUDIT_ASSERTION"
            if operator_ack
            else "PINNED_PEER_SIGNED_DELIVERY_RECEIPT"
        ),
        "digest": _digest(p),
        "payload": p,
    }


class MasterDeliveryLedger352:
    """Durable bounded outbox; signatures and pins verified before terminal states."""

    def __init__(self, path: Path):
        self.path = path

    def initialize(self) -> bool:
        if self.path.is_symlink() or not self.path.parent.is_dir():
            return False
        try:
            with sqlite3.connect(self.path, timeout=3) as db:
                db.execute("PRAGMA journal_mode=WAL")
                db.execute("PRAGMA synchronous=FULL")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS master_delivery352 (
                    message_id TEXT PRIMARY KEY, manifest_sha TEXT NOT NULL,
                    audience TEXT NOT NULL, event_type TEXT NOT NULL,
                    signed_event TEXT NOT NULL, created_ms INTEGER NOT NULL,
                    stage TEXT NOT NULL, delivery_ack_sha TEXT,
                    operator_ack_sha TEXT, updated_ms INTEGER NOT NULL)"""
                )
            return True
        except (OSError, sqlite3.Error):
            return False

    def queue(
        self,
        *,
        signed: dict[str, Any],
        registry: Registry347,
        manifest_sha: str,
        now_ms: int,
    ) -> bool:
        if not _on_original_host352() or self.path.is_symlink() or not self.path.is_file():
            return False
        result = verify_event352(
            signed,
            registry=registry,
            manifest_sha=manifest_sha,
            now_ms=now_ms,
        )
        if not result["verified"]:
            return False
        p = result["payload"]
        try:
            with sqlite3.connect(self.path, timeout=3) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute(
                    "INSERT INTO master_delivery352 VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (
                        p["messageId"],
                        manifest_sha,
                        p["audience"],
                        p["eventType"],
                        json.dumps(signed, sort_keys=True, separators=(",", ":")),
                        now_ms,
                        "QUEUED",
                        None,
                        None,
                        now_ms,
                    ),
                )
            return True
        except (OSError, sqlite3.Error, TypeError, ValueError):
            return False

    def _entry(self, message_id: str) -> tuple[Any, ...] | None:
        if not _sha(message_id) or self.path.is_symlink() or not self.path.is_file():
            return None
        try:
            with sqlite3.connect(
                f"file:{self.path}?mode=ro",
                uri=True,
                timeout=3,
            ) as db:
                return db.execute(
                    """SELECT manifest_sha, signed_event, stage
                    FROM master_delivery352 WHERE message_id=?""",
                    (message_id,),
                ).fetchone()
        except (sqlite3.Error, OSError):
            return None

    def mark_ack(
        self,
        *,
        message_id: str,
        signed_ack: dict[str, Any],
        registry: Registry347,
        manifest_sha: str,
        now_ms: int,
        operator_ack: bool = False,
    ) -> bool:
        entry = self._entry(message_id)
        if not _on_original_host352() or entry is None or entry[0] != manifest_sha:
            return False
        try:
            signed_event = json.loads(entry[1])
            valid_event = verify_event352(
                signed_event,
                registry=registry,
                manifest_sha=manifest_sha,
                now_ms=now_ms,
                allow_expired=operator_ack,
            )
            if not valid_event["verified"]:
                return False
            if operator_ack and entry[2] != "TRANSPORT_ACKED":
                return False
            if not operator_ack and entry[2] != "QUEUED":
                return False
            receipt = verify_ack352(
                signed_ack,
                expected_event=valid_event["payload"],
                registry=registry,
                now_ms=now_ms,
                operator_ack=operator_ack,
            )
            if not receipt["verified"]:
                return False
            target_stage = "OPERATOR_ACKED" if operator_ack else "TRANSPORT_ACKED"
            field = "operator_ack_sha" if operator_ack else "delivery_ack_sha"
            with sqlite3.connect(self.path, timeout=3, isolation_level=None) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                count = db.execute(
                    f"""UPDATE master_delivery352 SET stage=?, {field}=?, updated_ms=?
                    WHERE message_id=? AND stage=? AND manifest_sha=?""",
                    (
                        target_stage,
                        json.dumps(signed_ack, sort_keys=True, separators=(",", ":")),
                        now_ms,
                        message_id,
                        entry[2],
                        manifest_sha,
                    ),
                ).rowcount
                if count != 1:
                    db.execute("ROLLBACK")
                    return False
                db.execute("COMMIT")
            return True
        except (ValueError, KeyError, TypeError, sqlite3.Error, OSError):
            return False

    def status(
        self,
        *,
        manifest_sha: str,
        now_ms: int,
        registry: Registry347 | None = None,
    ) -> dict[str, Any]:
        base = {
            "stage": "HOLD",
            "queued": 0,
            "transportAcked": 0,
            "operatorAcked": 0,
            "latest": [],
            "operatorAckMeansHumanVerified": False,
        }
        if not (
            _sha(manifest_sha)
            and type(now_ms) is int
            and isinstance(registry, Registry347)
            and self.path.is_file()
            and not self.path.is_symlink()
        ):
            return base
        try:
            with sqlite3.connect(f"file:{self.path}?mode=ro", uri=True, timeout=3) as db:
                rows = db.execute(
                    """SELECT message_id, audience, event_type, stage, updated_ms,
                    delivery_ack_sha, operator_ack_sha, signed_event
                    FROM master_delivery352 WHERE manifest_sha=?
                    ORDER BY updated_ms DESC LIMIT 100""",
                    (manifest_sha,),
                ).fetchall()
        except (sqlite3.Error, OSError):
            return base
        output = []
        for msg, audience, etype, stage, updated, delivery, operator, raw in rows:
            try:
                event = json.loads(raw)
                p = event["payload"]
                proof = verify_event352(
                    event,
                    registry=registry,
                    manifest_sha=manifest_sha,
                    now_ms=now_ms,
                    allow_expired=True,
                )
                if not (
                    proof["verified"]
                    and p["messageId"] == msg
                    and p["audience"] == audience
                    and p["eventType"] == etype
                    and p["manifestDigest"] == manifest_sha
                    and stage in ("QUEUED", "TRANSPORT_ACKED", "OPERATOR_ACKED")
                    and type(updated) is int
                    and updated <= now_ms
                    and (
                        stage == "QUEUED"
                        or (
                            type(delivery) is str
                            and verify_ack352(
                                json.loads(delivery),
                                expected_event=p,
                                registry=registry,
                                now_ms=min(
                                    now_ms,
                                    json.loads(delivery)["payload"]["issuedAtMs"] + 1,
                                ),
                            )["verified"]
                        )
                    )
                    and (
                        stage != "OPERATOR_ACKED"
                        or (
                            type(operator) is str
                            and verify_ack352(
                                json.loads(operator),
                                expected_event=p,
                                registry=registry,
                                now_ms=min(
                                    now_ms,
                                    json.loads(operator)["payload"]["issuedAtMs"] + 1,
                                ),
                                operator_ack=True,
                            )["verified"]
                        )
                    )
                ):
                    return base
                output.append(
                    {
                        "messageId": msg,
                        "audience": audience,
                        "eventType": etype,
                        "stage": stage,
                        "updatedAtMs": updated,
                    }
                )
            except (KeyError, TypeError, ValueError, AttributeError):
                return base
        return {
            **base,
            "stage": "SIGNED_HISTORICAL_ACKS_NOT_CURRENT_PEER_HEALTH",
            "queued": sum(v["stage"] == "QUEUED" for v in output),
            "transportAcked": sum(v["stage"] == "TRANSPORT_ACKED" for v in output),
            "operatorAcked": sum(v["stage"] == "OPERATOR_ACKED" for v in output),
            "latest": output[:12],
        }


def deliver_mtls_event352(
    *,
    peer: PeerEnrollment348,
    signed_event: dict[str, Any],
    enrollment: dict[str, Any],
    registry: Registry347,
    journal: MasterDeliveryLedger352,
    now_ms: int,
) -> dict[str, Any]:
    hold = {"delivered": False, "reason": "HOLD_UNVERIFIED_SIGNED_MTLS_DELIVERY"}
    if not (
        _on_original_host352()
        and isinstance(peer, PeerEnrollment348)
        and _enrolled(peer)
        and peer.source == "rosevear-ai-hub"
        and peer.destination in DESTINATIONS
        and peer.peer_protocols == ("1.1",)
        and "master.health.readonly" in peer.peer_capabilities
        and enrollment.get("accepted") is True
        and isinstance(registry, Registry347)
        and isinstance(journal, MasterDeliveryLedger352)
    ):
        return hold
    manifest_sha = _digest(enrollment["payload"])
    valid = verify_event352(
        signed_event,
        registry=registry,
        manifest_sha=manifest_sha,
        now_ms=now_ms,
    )
    if not valid["verified"] or valid["payload"]["audience"] != peer.destination:
        return hold
    matches = [
        item
        for item in enrollment["payload"]["peers"]
        if item["id"] == peer.destination
        and item["hostname"] == peer.hostname
        and item["port"] == peer.port
        and item["tlsLeafPin"] == peer.server_cert_pin
        and "master.health.readonly" in item["capabilities"]
        and item["protocols"] == ["1.1"]
    ]
    if len(matches) != 1 or journal._entry(valid["payload"]["messageId"]) is None:
        return hold
    connection = None
    try:
        ctx = ssl.create_default_context(cafile=str(peer.ca_file))
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.verify_mode = ssl.CERT_REQUIRED
        ctx.check_hostname = True
        ctx.load_cert_chain(
            certfile=str(peer.client_cert_file),
            keyfile=str(peer.client_key_file),
        )
        connection = http.client.HTTPSConnection(
            peer.hostname,
            peer.port,
            timeout=5,
            context=ctx,
        )
        connection.connect()
        if not _tls_peer_pin348(connection.sock, peer.server_cert_pin):
            return hold
        body = _canonical(signed_event)
        if len(body) > MAX_WIRE_BYTES:
            return hold
        connection.request(
            "POST",
            TRANSPORT_PATH352,
            body=body,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        response = connection.getresponse()
        if (
            response.status != 200
            or response.getheader("Content-Type", "").split(";")[0] != "application/json"
        ):
            return hold
        raw = response.read(MAX_WIRE_BYTES + 1)
        if len(raw) > MAX_WIRE_BYTES:
            return hold
        signed_ack = json.loads(raw)
        if not journal.mark_ack(
            message_id=valid["payload"]["messageId"],
            signed_ack=signed_ack,
            registry=registry,
            manifest_sha=manifest_sha,
            now_ms=int(time.time() * 1000),
        ):
            return hold
        return {
            "delivered": True,
            "reason": "REAL_MTLS_AND_SIGNED_PEER_RECEIPT",
            "recipient": peer.destination,
            "operatorAckVerified": False,
            "physicalReceiverAuthorized": False,
        }
    except (
        OSError,
        ssl.SSLError,
        TimeoutError,
        http.client.HTTPException,
        TypeError,
        ValueError,
        json.JSONDecodeError,
    ):
        return hold
    finally:
        if connection is not None:
            connection.close()
