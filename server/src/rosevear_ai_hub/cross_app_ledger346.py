"""Build 346 / QL-455: durable signed seven-app metadata outbox/inbox.

All writes are local protected SQLite transactions with WAL and FULL fsync.
No network transport, private signing key, receiver action, incident closure,
live CONNECTED claim, or remote user-controlled resource lookup is provided.

This component must run behind a trusted server adapter that owns its DB path,
protected seven-app public key pins and the receiving application identity.
"""

import json
import sqlite3
from pathlib import Path
from typing import Any

from rosevear_ai_hub.cross_app_security344 import (
    ORDER,
    SCHEMA,
    validate_handoff344,
)
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native

ACK_SCHEMA = "rosevear.cross-app.persisted-ack346.v1"
ACK_FIELDS = {
    "schema",
    "messageId",
    "source",
    "destination",
    "originalDigest",
    "evidenceDigest",
    "attempt",
    "status",
    "issuedAtMs",
    "expiresAtMs",
}
MAX_ATTEMPTS = 4
MAX_ACK_AGE_MS = 30_000
LEASE_MS = 20_000
BACKOFF_MS = (0, 3_000, 12_000, 60_000)
SCHEMA_VERSION = 1


def reject(reason: str) -> dict[str, Any]:
    return {
        "accepted": False,
        "state": reason,
        "messageDelivered": False,
        "connectivityVerified": False,
        "connection": "HOLD",
        "incidentStatus": "OPEN",
        "activationAuthorized": False,
        "closureAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
    }


def _valid_time(value: Any) -> bool:
    return type(value) is int and value >= 0


def _valid_sender(e: Any) -> bool:
    return isinstance(e, dict) and isinstance(e.get("payload"), dict)


class DurableSignedMailbox346:
    """Protected local evidence store. Never expose its methods as public HTTP."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def _connect(self) -> sqlite3.Connection:
        if not self.path.is_file():
            raise FileNotFoundError("Private signed mailbox not enrolled")
        db = sqlite3.connect(self.path, timeout=5, isolation_level=None)
        db.execute("PRAGMA busy_timeout=5000")
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("PRAGMA synchronous=FULL")
        return db

    def enroll(self) -> None:
        """An explicit trusted local installation step, not an HTTP operation."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if self.path.is_symlink():
            raise ValueError("Mailbox path cannot be a symlink")
        with sqlite3.connect(self.path, timeout=5) as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.execute("PRAGMA synchronous=FULL")
            db.execute(
                """CREATE TABLE IF NOT EXISTS mailbox346 (
                    direction TEXT NOT NULL CHECK(direction IN ('OUT','IN')),
                    message_id TEXT NOT NULL,
                    source TEXT NOT NULL,
                    destination TEXT NOT NULL,
                    envelope_digest TEXT NOT NULL,
                    evidence_digest TEXT NOT NULL,
                    envelope TEXT NOT NULL,
                    state TEXT NOT NULL
                        CHECK(state IN ('PENDING','LEASED','RETRY','ACKED','RECEIVED','DEAD')),
                    attempts INTEGER NOT NULL DEFAULT 0,
                    next_at INTEGER NOT NULL,
                    lease_until INTEGER,
                    ack_digest TEXT,
                    PRIMARY KEY (direction, message_id)
                )"""
            )
            db.execute(
                """CREATE TABLE IF NOT EXISTS ack346 (
                    message_id TEXT PRIMARY KEY,
                    envelope_digest TEXT NOT NULL,
                    received_at INTEGER NOT NULL
                )"""
            )
            db.execute(
                "CREATE INDEX IF NOT EXISTS mailbox346_due "
                "ON mailbox346(direction,state,next_at)"
            )
            db.commit()

    def stage_outbound(
        self, envelope: Any, *, pins: dict[str, tuple[bytes, str]], now_ms: int
    ) -> dict[str, Any]:
        if not _valid_sender(envelope) or not _valid_time(now_ms):
            return reject("HOLD_QL455_INVALID_SOURCE_ENVELOPE")
        proof = validate_handoff344(envelope, sender_pins=pins, now_ms=now_ms)
        if proof["accepted"] is not True:
            return reject("HOLD_QL455_INVALID_SIGNED_OUTBOUND")
        payload = envelope["payload"]
        try:
            with self._connect() as db:
                db.execute("BEGIN IMMEDIATE")
                if db.execute(
                    "SELECT 1 FROM mailbox346 WHERE direction='OUT' AND message_id=?",
                    (payload["messageId"],),
                ).fetchone():
                    return reject("HOLD_QL455_DURABLE_REPLAY")
                db.execute(
                    """INSERT INTO mailbox346
                    (direction,message_id,source,destination,envelope_digest,
                     evidence_digest,envelope,state,attempts,next_at)
                    VALUES ('OUT',?,?,?,?,?,?,'PENDING',0,?)""",
                    (
                        payload["messageId"],
                        payload["source"],
                        payload["destination"],
                        _digest(envelope),
                        payload["evidenceDigest"],
                        json.dumps(envelope, sort_keys=True, separators=(",", ":")),
                        now_ms,
                    ),
                )
            return {
                **reject("QL455_PERSISTED_OUTBOUND_NO_DELIVERY"),
                "accepted": True,
                "messageId": payload["messageId"],
                "state": "PENDING",
            }
        except (OSError, sqlite3.Error, TypeError, ValueError, KeyError):
            return reject("HOLD_QL455_OUTBOX_STORAGE_FAILURE")

    def receive_inbound(
        self,
        envelope: Any,
        *,
        local_app: str,
        pins: dict[str, tuple[bytes, str]],
        now_ms: int,
    ) -> dict[str, Any]:
        if not (_valid_sender(envelope) and local_app in ORDER and _valid_time(now_ms)):
            return reject("HOLD_QL455_UNTRUSTED_INBOX")
        proof = validate_handoff344(envelope, sender_pins=pins, now_ms=now_ms)
        if proof["accepted"] is not True or proof["destination"] != local_app:
            return reject("HOLD_QL455_INBOX_ROUTE_OR_SIGNATURE")
        payload = envelope["payload"]
        digest = _digest(envelope)
        try:
            with self._connect() as db:
                db.execute("BEGIN IMMEDIATE")
                row = db.execute(
                    """SELECT envelope_digest FROM mailbox346
                    WHERE direction='IN' AND message_id=?""",
                    (payload["messageId"],),
                ).fetchone()
                if row is not None:
                    return {
                        **reject("QL455_INBOX_IDEMPOTENT_DUPLICATE_NO_PROCESSING"),
                        "accepted": row[0] == digest,
                        "idempotent": row[0] == digest,
                    }
                db.execute(
                    """INSERT INTO mailbox346
                    (direction,message_id,source,destination,envelope_digest,
                     evidence_digest,envelope,state,attempts,next_at)
                    VALUES ('IN',?,?,?,?,?,?,'RECEIVED',0,?)""",
                    (
                        payload["messageId"],
                        payload["source"],
                        payload["destination"],
                        digest,
                        payload["evidenceDigest"],
                        json.dumps(envelope, sort_keys=True, separators=(",", ":")),
                        now_ms,
                    ),
                )
            return {
                **reject("QL455_INBOX_DURABLY_PERSISTED_NO_PROCESSING"),
                "accepted": True,
                "idempotent": False,
                "messageId": payload["messageId"],
                "originalDigest": digest,
            }
        except (OSError, sqlite3.Error, TypeError, ValueError, KeyError):
            return reject("HOLD_QL455_INBOX_STORAGE_FAILURE")

    def claim_due(self, *, now_ms: int) -> dict[str, Any]:
        """Local worker obtains one lease; nothing is sent over a network."""
        if not _valid_time(now_ms):
            return reject("HOLD_QL455_INVALID_CLOCK")
        try:
            with self._connect() as db:
                db.execute("BEGIN IMMEDIATE")
                row = db.execute(
                    """SELECT message_id, envelope, attempts FROM mailbox346
                    WHERE direction='OUT' AND state IN ('PENDING','RETRY')
                    AND next_at<=? ORDER BY next_at,message_id LIMIT 1""",
                    (now_ms,),
                ).fetchone()
                if row is None:
                    return reject("QL455_NO_DUE_MESSAGES")
                message_id, envelope, attempts = row
                try:
                    expires_at = json.loads(envelope)["payload"]["expiresAtMs"]
                except (KeyError, TypeError, ValueError):
                    expires_at = 0
                if type(expires_at) is not int or now_ms >= expires_at:
                    db.execute(
                        "UPDATE mailbox346 SET state='DEAD' WHERE direction='OUT' AND message_id=?",
                        (message_id,),
                    )
                    return reject("HOLD_QL455_OUTBOUND_EXPIRED_DEAD_LETTER")
                if attempts >= MAX_ATTEMPTS:
                    db.execute(
                        "UPDATE mailbox346 SET state='DEAD' WHERE direction='OUT' AND message_id=?",
                        (message_id,),
                    )
                    return reject("HOLD_QL455_MAX_RETRIES_DEAD_LETTER")
                db.execute(
                    """UPDATE mailbox346 SET state='LEASED',attempts=?,
                    lease_until=? WHERE direction='OUT' AND message_id=?""",
                    (attempts + 1, now_ms + LEASE_MS, message_id),
                )
            return {
                **reject("QL455_LEASED_NOT_SENT"),
                "accepted": True,
                "messageId": message_id,
                "attempt": attempts + 1,
                "signedEnvelope": json.loads(envelope),
                "leaseExpiresAt": now_ms + LEASE_MS,
            }
        except (OSError, sqlite3.Error, TypeError, ValueError):
            return reject("HOLD_QL455_LEASE_STORAGE_FAILURE")

    def recover_expired(self, *, now_ms: int) -> dict[str, Any]:
        if not _valid_time(now_ms):
            return reject("HOLD_QL455_INVALID_CLOCK")
        try:
            with self._connect() as db:
                db.execute("BEGIN IMMEDIATE")
                rows = db.execute(
                    """SELECT message_id,attempts FROM mailbox346
                    WHERE direction='OUT' AND state='LEASED'
                    AND lease_until<=?""",
                    (now_ms,),
                ).fetchall()
                for mid, attempts in rows:
                    state = "DEAD" if attempts >= MAX_ATTEMPTS else "RETRY"
                    delay = 0 if state == "DEAD" else BACKOFF_MS[attempts]
                    db.execute(
                        """UPDATE mailbox346 SET state=?,next_at=?,lease_until=NULL
                        WHERE direction='OUT' AND message_id=?""",
                        (state, now_ms + delay, mid),
                    )
            return {
                **reject("QL455_EXPIRED_LEASES_RECONCILED_NO_NETWORK_RETRY"),
                "accepted": True,
                "recovered": len(rows),
                "deadLetters": sum(a >= MAX_ATTEMPTS for _, a in rows),
            }
        except (OSError, sqlite3.Error):
            return reject("HOLD_QL455_RECOVERY_STORAGE_FAILURE")

    def accept_signed_ack(
        self,
        envelope: Any,
        *,
        pins: dict[str, tuple[bytes, str]],
        now_ms: int,
    ) -> dict[str, Any]:
        """Valid recipient-signature ACK is an evidence record, not live proof."""
        if not (
            _valid_sender(envelope)
            and _valid_time(now_ms)
            and isinstance(pins, dict)
            and set(pins) == set(ORDER)
            and all(isinstance(p, tuple) and len(p) == 2 for p in pins.values())
        ):
            return reject("HOLD_QL455_ACK_UNTRUSTED")
        body = envelope["payload"]
        receiver = body.get("source")
        if receiver not in ORDER:
            return reject("HOLD_QL455_UNKNOWN_ACK_ISSUER")
        from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519

        if not all(_public_ed25519(*p) for p in pins.values()):
            return reject("HOLD_QL455_BAD_PUBLIC_PINS")
        if len({p[0] for p in pins.values()}) != len(ORDER):
            return reject("HOLD_QL455_DUPLICATED_SIGNER")
        ack = _native(envelope, ACK_FIELDS, ACK_SCHEMA, *pins[receiver])
        if not (
            ack
            and ack["status"] == "PERSISTED"
            and ack["destination"] in ORDER
            and ack["source"] != ack["destination"]
            and type(ack["attempt"]) is int
            and 1 <= ack["attempt"] <= MAX_ATTEMPTS
            and type(ack["issuedAtMs"]) is int
            and type(ack["expiresAtMs"]) is int
            and 0 <= now_ms - ack["issuedAtMs"] <= MAX_ACK_AGE_MS
            and ack["issuedAtMs"] < ack["expiresAtMs"]
            <= ack["issuedAtMs"] + MAX_ACK_AGE_MS
            and now_ms < ack["expiresAtMs"]
        ):
            return reject("HOLD_QL455_SIGNED_ACK_INVALID_OR_EXPIRED")
        try:
            with self._connect() as db:
                db.execute("BEGIN IMMEDIATE")
                row = db.execute(
                    """SELECT source,destination,envelope_digest,evidence_digest,
                    attempts,state,lease_until FROM mailbox346
                    WHERE direction='OUT' AND message_id=?""",
                    (ack["messageId"],),
                ).fetchone()
                if not row:
                    return reject("HOLD_QL455_ACK_UNKNOWN_MESSAGE")
                source, dest, digest, evidence, attempts, state, lease_until = row
                if not (
                    state == "LEASED"
                    and type(lease_until) is int
                    and now_ms < lease_until
                    and ack["source"] == dest
                    and ack["destination"] == source
                    and ack["attempt"] == attempts
                    and ack["originalDigest"] == digest
                    and ack["evidenceDigest"] == evidence
                ):
                    return reject("HOLD_QL455_ACK_ROUTE_DIGEST_OR_REPLAY")
                db.execute(
                    """UPDATE mailbox346 SET state='ACKED',ack_digest=?,
                    lease_until=NULL WHERE direction='OUT' AND message_id=?""",
                    (_digest(envelope), ack["messageId"]),
                )
                db.execute(
                    "INSERT INTO ack346(message_id,envelope_digest,received_at) "
                    "VALUES(?,?,?)",
                    (ack["messageId"], _digest(envelope), now_ms),
                )
            return {
                **reject("QL455_VERIFIED_SIGNED_ACK_PERSISTED"),
                "accepted": True,
                "messageId": ack["messageId"],
                "state": "ACKED",
                "historicalAckVerified": True,
                "messageDelivered": False,
            }
        except (OSError, sqlite3.Error, TypeError, KeyError, ValueError):
            return reject("HOLD_QL455_ACK_STORAGE_FAILURE")

    def counts(self) -> dict[str, Any]:
        """Aggregates only; never returns signed envelopes or private metadata."""
        try:
            with self._connect() as db:
                rows = db.execute(
                    "SELECT direction,state,COUNT(*) FROM mailbox346 "
                    "GROUP BY direction,state"
                ).fetchall()
            return {
                **reject("QL455_PROTECTED_LOCAL_LEDGER_COUNTS_NO_LIVE_LINK"),
                "ledgerEnrolled": True,
                "counts": {f"{direction}_{state}": num for direction, state, num in rows},
            }
        except (OSError, sqlite3.Error):
            return {**reject("HOLD_QL455_LEDGER_NOT_ENROLLED"), "ledgerEnrolled": False}
