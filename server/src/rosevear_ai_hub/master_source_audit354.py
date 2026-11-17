"""QL-463 protected two-source audit custody for the original Windows host.

Combines the local QL-460 hash-chained SCM source, QL-461 signed
acknowledgement outbox and a separately signed Comms source audit. This
is a local tamper-evident reconciliation, NOT a third-party notary or
independent proof a human read an alert.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_acceptance353 import verify_comms_audit_link353
from rosevear_ai_hub.master_transport352 import (
    MasterDeliveryLedger352,
    _on_original_host352,
)
from rosevear_ai_hub.service_identity347 import Registry347, _canonical, _digest, _sha

AUDIT_SCHEMA354 = "rosevear.hub.two-source-audit-ledger354.v1"
MAX_CAPTURE_BYTES354 = 16_384


def verify_source_crosscheck354(
    *,
    package: Any,
    local_bus: dict[str, Any],
    delivery: dict[str, Any],
    registry: Registry347,
    manifest_sha: str,
    owner_audit_id: str,
    now_ms: int,
) -> dict[str, Any]:
    hold = {
        "state": "HOLD_NO_COMMS_AND_ORIGINAL_HOST_SOURCE_CORROBORATION",
        "twoSourceDigestCorroborated": False,
        "humanReadIndependentlyWitnessed": False,
        "messageId": None,
        "sourceEvidenceDigest": None,
    }
    if not (
        type(package) is dict
        and set(package)
        == {
            "event",
            "operatorAck",
            "signedAudit",
        }
        and type(package["event"]) is dict
        and type(local_bus) is dict
        and local_bus.get("integrity") == "LOCAL_HASH_CHAIN_VALID"
        and type(local_bus.get("events")) is list
        and type(delivery) is dict
        and delivery.get("stage") == "SIGNED_HISTORICAL_ACKS_NOT_CURRENT_PEER_HEALTH"
        and type(delivery.get("latest")) is list
        and isinstance(registry, Registry347)
        and _sha(manifest_sha)
        and type(owner_audit_id) is str
        and 12 <= len(owner_audit_id) <= 128
        and all(ch.isalnum() or ch in "-_" for ch in owner_audit_id)
        and type(now_ms) is int
    ):
        return hold
    event = package["event"]
    if not (
        event.get("manifestDigest") == manifest_sha
        and event.get("eventType") == "operator.issue"
        and event.get("audience") == "rosevear-comms-hub"
        and _sha(event.get("sourceEvidenceDigest"))
        and _sha(event.get("messageId"))
        and type(event.get("issuedAtMs")) is int
        and any(
            type(row) is dict
            and row.get("manifestDigest") == manifest_sha
            and row.get("evidenceDigest") == event["sourceEvidenceDigest"]
            and row.get("kind") in ("module.observed", "slave.verified", "home.status")
            and type(row.get("observedAtMs")) is int
            and 0 <= event["issuedAtMs"] - row["observedAtMs"] <= 120_000
            for row in local_bus["events"]
        )
        and any(
            type(row) is dict
            and row.get("messageId") == event["messageId"]
            and row.get("audience") == "rosevear-comms-hub"
            and row.get("eventType") == "operator.issue"
            and row.get("stage") == "OPERATOR_ACKED"
            for row in delivery["latest"]
        )
    ):
        return hold
    signed = verify_comms_audit_link353(
        event_payload=event,
        operator_ack=package["operatorAck"],
        signed_audit=package["signedAudit"],
        registry=registry,
        now_ms=now_ms,
        permitted_owner_audit_ids=frozenset((owner_audit_id,)),
    )
    if signed["commsSignedAuditLinked"] is not True:
        return hold
    return {
        **hold,
        "state": "SIGNED_COMMS_AUDIT_AND_ORIGINAL_HOST_SOURCE_MATCH",
        "twoSourceDigestCorroborated": True,
        "messageId": event["messageId"],
        "sourceEvidenceDigest": event["sourceEvidenceDigest"],
    }


class MasterSourceAuditLedger354:
    """Append-only local hash-chain; signature + source checks at ingestion/readback."""

    def __init__(self, path: Path):
        self.path = path

    def initialize(self) -> bool:
        if not self.path.parent.is_dir() or self.path.is_symlink():
            return False
        try:
            with sqlite3.connect(self.path, timeout=3) as db:
                db.execute("PRAGMA journal_mode=WAL")
                db.execute("PRAGMA synchronous=FULL")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS source_audit354 (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT,
                    message_id TEXT NOT NULL UNIQUE,
                    manifest_sha TEXT NOT NULL,
                    event_sha TEXT NOT NULL,
                    source_sha TEXT NOT NULL,
                    signed_package TEXT NOT NULL,
                    owner_audit_id TEXT NOT NULL,
                    captured_ms INTEGER NOT NULL,
                    previous_sha TEXT NOT NULL,
                    entry_sha TEXT NOT NULL)"""
                )
            return True
        except (OSError, sqlite3.Error):
            return False

    def capture(
        self,
        *,
        package: dict[str, Any],
        local_bus: dict[str, Any],
        outbox: MasterDeliveryLedger352,
        registry: Registry347,
        manifest_sha: str,
        owner_audit_id: str,
        now_ms: int,
    ) -> bool:
        if not (
            _on_original_host352()
            and self.path.is_file()
            and not self.path.is_symlink()
            and isinstance(outbox, MasterDeliveryLedger352)
            and type(package) is dict
        ):
            return False
        text = json.dumps(package, sort_keys=True, separators=(",", ":"))
        if len(text.encode("utf-8")) > MAX_CAPTURE_BYTES354:
            return False
        delivery = outbox.status(
            manifest_sha=manifest_sha,
            now_ms=now_ms,
            registry=registry,
        )
        proof = verify_source_crosscheck354(
            package=package,
            local_bus=local_bus,
            delivery=delivery,
            registry=registry,
            manifest_sha=manifest_sha,
            owner_audit_id=owner_audit_id,
            now_ms=now_ms,
        )
        if proof["twoSourceDigestCorroborated"] is not True:
            return False
        data = [
            proof["messageId"],
            manifest_sha,
            _digest(package["event"]),
            proof["sourceEvidenceDigest"],
            _digest(package),
            owner_audit_id,
            now_ms,
        ]
        try:
            with sqlite3.connect(self.path, timeout=3, isolation_level=None) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                rows = db.execute(
                    """SELECT seq, message_id, manifest_sha, event_sha,
                    source_sha, signed_package, owner_audit_id,
                    captured_ms, previous_sha, entry_sha
                    FROM source_audit354 ORDER BY seq"""
                ).fetchall()
                if not _chain_valid354(rows):
                    db.execute("ROLLBACK")
                    return False
                seq = len(rows) + 1
                prev = rows[-1][-1] if rows else "0" * 64
                entry = hashlib.sha256(_canonical([seq, *data, prev])).hexdigest()
                db.execute(
                    "INSERT INTO source_audit354 VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (
                        seq,
                        proof["messageId"],
                        manifest_sha,
                        _digest(package["event"]),
                        proof["sourceEvidenceDigest"],
                        text,
                        owner_audit_id,
                        now_ms,
                        prev,
                        entry,
                    ),
                )
                db.execute("COMMIT")
                return True
        except (OSError, sqlite3.Error, ValueError, TypeError):
            return False

    def summary(
        self,
        *,
        manifest_sha: str,
        registry: Registry347 | None,
        outbox: MasterDeliveryLedger352 | None,
        now_ms: int,
    ) -> dict[str, Any]:
        hold = {
            "state": "HOLD_NO_VERIFIED_DURABLE_SOURCE_AUDIT",
            "integrity": "HOLD",
            "corroboratedCount": 0,
            "independentHumanReadVerified": False,
            "latestMessageId": None,
        }
        if not (
            _sha(manifest_sha)
            and isinstance(registry, Registry347)
            and isinstance(outbox, MasterDeliveryLedger352)
            and type(now_ms) is int
            and self.path.is_file()
            and not self.path.is_symlink()
        ):
            return hold
        try:
            with sqlite3.connect(
                f"file:{self.path}?mode=ro",
                uri=True,
                timeout=3,
            ) as db:
                rows = db.execute(
                    """SELECT seq, message_id, manifest_sha, event_sha,
                    source_sha, signed_package, owner_audit_id,
                    captured_ms, previous_sha, entry_sha
                    FROM source_audit354 ORDER BY seq"""
                ).fetchall()
        except (OSError, sqlite3.Error):
            return hold
        if not rows or len(rows) > 2000 or not _chain_valid354(rows):
            return hold
        delivery = outbox.status(
            manifest_sha=manifest_sha,
            now_ms=now_ms,
            registry=registry,
        )
        if delivery["stage"] != "SIGNED_HISTORICAL_ACKS_NOT_CURRENT_PEER_HEALTH":
            return hold
        try:
            for row in rows:
                _, msg, digest, event_sha, source_sha, raw, owner_id, captured, _, _ = row
                if digest != manifest_sha or not 0 <= now_ms - captured <= 7 * 86_400_000:
                    return hold
                package = json.loads(raw)
                signed = verify_comms_audit_link353(
                    event_payload=package["event"],
                    operator_ack=package["operatorAck"],
                    signed_audit=package["signedAudit"],
                    registry=registry,
                    now_ms=captured,
                    permitted_owner_audit_ids=frozenset((owner_id,)),
                )
                if not (
                    signed["commsSignedAuditLinked"]
                    and signed["messageId"] == msg
                    and _digest(package["event"]) == event_sha
                    and package["event"]["sourceEvidenceDigest"] == source_sha
                    and any(
                        x["messageId"] == msg and x["stage"] == "OPERATOR_ACKED"
                        for x in delivery["latest"]
                    )
                ):
                    return hold
        except (ValueError, TypeError, KeyError):
            return hold
        return {
            **hold,
            "state": "SIGNED_HISTORICAL_TWO_SOURCE_CUSTODY_ONLY",
            "integrity": "LOCAL_HASH_CHAIN_AND_SIGNED_COMMS_VERIFIED",
            "corroboratedCount": len(rows),
            "latestMessageId": rows[-1][1],
        }


def _chain_valid354(rows: list[tuple[Any, ...]]) -> bool:
    previous = "0" * 64
    for i, row in enumerate(rows, 1):
        seq, msg, manifest, event_sha, source, raw, owner, when, before, after = row
        if not (
            type(seq) is int
            and seq == i
            and _sha(msg)
            and _sha(manifest)
            and _sha(event_sha)
            and _sha(source)
            and type(raw) is str
            and type(owner) is str
            and type(when) is int
            and before == previous
            and _sha(after)
        ):
            return False
        try:
            package = json.loads(raw)
            if (
                type(package) is not dict
                or _digest(package["event"]) != event_sha
                or package["event"]["messageId"] != msg
                or package["event"]["sourceEvidenceDigest"] != source
            ):
                return False
        except (ValueError, TypeError, KeyError):
            return False
        expected = hashlib.sha256(
            _canonical(
                [
                    seq,
                    msg,
                    manifest,
                    event_sha,
                    source,
                    _digest(package),
                    owner,
                    when,
                    before,
                ]
            )
        ).hexdigest()
        if expected != after:
            return False
        previous = after
    return True
