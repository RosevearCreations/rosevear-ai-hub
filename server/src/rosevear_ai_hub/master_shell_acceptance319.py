"""Build 319 — protected original-host QL-428 anchor, drift and re-entry precheck.

Only protected callers may supply real off-host store adapters and pinned Ed25519
public keys. No new receiver controls, automatic activation, signer enrollment,
browser proof intake, Windows tasks, or claim of operational CONNECTED.
"""

import hashlib
import re
import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _timestamp, _utc
from rosevear_ai_hub.master_shell_acceptance306 import _trusted_signature
from rosevear_ai_hub.master_shell_acceptance308 import _hold, _on_ree
from rosevear_ai_hub.master_shell_acceptance310 import _sha
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS, _callback
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519, _trusted_roles
from rosevear_ai_hub.master_shell_acceptance316 import CONTROLLER380_MAIN, SOURCE315_MAIN
from rosevear_ai_hub.master_shell_acceptance318 import (
    ProtectedRecoveryJournal318,
    reconcile_master_evidence318,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE318_MAIN = "821ba9094248be724e435bbe36c3065da604fd8e"
COMMS428_MAIN = "71c81f7dd7ffd858b1195d5c2cca0f6f4c29059c"
STAGES = ("ANCHOR", "RECHECK", "PRECHECK")
ZERO = "0" * 64
ID = re.compile(r"[A-Za-z0-9_-]{12,96}\Z")
PERSON = re.compile(r"[A-Za-z0-9_-]{3,80}\Z")
EXPORT = "rosevear.ql428.external-closure-anchor-export.v1"
ANCHOR = "rosevear.ql428.external-closure-anchor.v1"
READBACK = "rosevear.ql428.external-anchor-readback.v1"
OFF = "rosevear.ql428.pre-reentry-receiver-isolation.v1"
MASTER = "rosevear.ql428.master-supervised-reentry.v1"
OWNER = "rosevear.ql428.owner-supervised-reentry.v1"


def _digest(data: Any) -> str:
    return hashlib.sha256(_serialize(data)).hexdigest()


def _id(value: Any) -> bool:
    return isinstance(value, str) and bool(ID.fullmatch(value))


def _recent(value: Any, now: int) -> int | None:
    stamped = _timestamp(value)
    return stamped if stamped is not None and 0 <= now - stamped <= 60_000 else None


def _scope(scope: Any) -> bool:
    return (
        isinstance(scope, dict)
        and set(scope)
        == {"ceremonyId", "sourceId", "episodeId", "sourceRevision", "controllerRevision"}
        and _id(scope.get("ceremonyId"))
        and _id(scope.get("episodeId"))
        and scope["sourceId"] == "rosevear-ai-hub"
        and scope["sourceRevision"] == SOURCE315_MAIN
        and scope["controllerRevision"] == CONTROLLER380_MAIN
    )


def _native(envelope: Any, fields: set[str], schema: str, der: bytes, pin: str) -> Any:
    if not (
        isinstance(envelope, dict)
        and set(envelope) == {"payload", "signature"}
        and isinstance(envelope.get("payload"), dict)
        and set(envelope["payload"]) == fields
        and envelope["payload"].get("schema") == schema
        and _public_ed25519(der, pin)
        and _trusted_signature(envelope["payload"], envelope["signature"], der, pin)
    ):
        return None
    return envelope["payload"]


def _local_snapshot(reader: Any, scope: Any) -> dict[str, Any] | None:
    if not (callable(reader) and _scope(scope)):
        return None
    try:
        value = reader(scope=scope)
    except Exception:
        return None
    fields = {
        "scope",
        "incidentId",
        "checkpointIndex",
        "checkpointDigest",
        "closureReceiptDigest",
        "closurePayloadDigest",
    }
    if not (
        isinstance(value, dict)
        and set(value) == fields
        and value["scope"] == scope
        and _id(value["incidentId"])
        and type(value["checkpointIndex"]) is int
        and value["checkpointIndex"] >= 2
        and all(
            _sha(value[f])
            for f in ("checkpointDigest", "closureReceiptDigest", "closurePayloadDigest")
        )
    ):
        return None
    # Freeze the independent pre/post-I/O snapshots: protected adapters may
    # return the same mutable object from repeated reads.
    return {**value, "scope": dict(value["scope"])}


class ProtectedAnchorJournal319:
    """One-use original-host metadata ledger; not a remote append-only anchor."""

    def __init__(self, path: Path):
        self.path = path

    def exact(self, monitor: PersistentReeMonitor304, scope: Any, stage: str, digest: str) -> bool:
        if not (
            _on_ree(monitor)
            and _scope(scope)
            and stage in STAGES
            and _sha(digest)
            and self.path.is_file()
        ):
            return False
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                rows = db.execute(
                    "SELECT stage,digest,previous_digest FROM anchor319 "
                    "WHERE ceremony=? AND episode=? ORDER BY rowid",
                    (scope["ceremonyId"], scope["episodeId"]),
                ).fetchall()
            if not (STAGES.index(stage) + 1 <= len(rows) <= len(STAGES)):
                return False
            prior = ZERO
            for index, (name, value, previous) in enumerate(rows):
                if name != STAGES[index] or previous != prior or not _sha(value):
                    return False
                prior = value
            return rows[STAGES.index(stage)][1] == digest
        except (OSError, sqlite3.Error, IndexError):
            return False

    def claim(
        self,
        monitor: PersistentReeMonitor304,
        scope: Any,
        stage: str,
        digest: str,
        previous: str,
        *,
        nonce: str | None = None,
        store_id: str | None = None,
        anchor_id: str | None = None,
        sequence: int | None = None,
    ) -> bool:
        if not (
            _on_ree(monitor)
            and _scope(scope)
            and stage in STAGES
            and _sha(digest)
            and _sha(previous)
            and (nonce is None or _id(nonce))
        ):
            return False
        if stage in ("ANCHOR", "RECHECK") and not (
            _id(nonce)
            and _id(store_id)
            and _id(anchor_id)
            and type(sequence) is int
            and sequence > 0
        ):
            return False
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    "CREATE TABLE IF NOT EXISTS anchor319 (ceremony TEXT NOT NULL, "
                    "episode TEXT NOT NULL, stage TEXT NOT NULL, digest TEXT NOT NULL, "
                    "previous_digest TEXT NOT NULL, nonce TEXT UNIQUE, "
                    "PRIMARY KEY(ceremony,stage), UNIQUE(episode,stage))"
                )
                db.execute(
                    "CREATE TABLE IF NOT EXISTS anchor_watermark319 ("
                    "store_id TEXT NOT NULL, anchor_id TEXT NOT NULL, "
                    "sequence INTEGER NOT NULL, PRIMARY KEY(store_id,anchor_id))"
                )
                ix = STAGES.index(stage)
                if ix == 0:
                    if previous != ZERO:
                        return False
                else:
                    row = db.execute(
                        "SELECT digest FROM anchor319 WHERE ceremony=? AND episode=? AND stage=?",
                        (scope["ceremonyId"], scope["episodeId"], STAGES[ix - 1]),
                    ).fetchone()
                    if row != (previous,):
                        return False
                if stage in ("ANCHOR", "RECHECK"):
                    old = db.execute(
                        "SELECT sequence FROM anchor_watermark319 WHERE store_id=? AND anchor_id=?",
                        (store_id, anchor_id),
                    ).fetchone()
                    if old and sequence < old[0]:
                        return False
                row = db.execute(
                    "INSERT OR IGNORE INTO anchor319 VALUES (?,?,?,?,?,?)",
                    (scope["ceremonyId"], scope["episodeId"], stage, digest, previous, nonce),
                )
                if row.rowcount != 1:
                    return False
                if stage in ("ANCHOR", "RECHECK"):
                    db.execute(
                        "INSERT INTO anchor_watermark319 VALUES (?,?,?) ON CONFLICT "
                        "(store_id,anchor_id) DO UPDATE SET sequence=excluded.sequence",
                        (store_id, anchor_id, sequence),
                    )
                return True
        except (OSError, sqlite3.Error):
            return False


def prepare_ql428_external_anchor319(
    monitor: PersistentReeMonitor304,
    closure318: Any,
    scope: Any,
    *,
    previous: ProtectedRecoveryJournal318,
    read_local_custody: Callable[..., Any] | None,
    attest_ql427_closure: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Prepare sanitized export only; never claim it was stored off-host."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(previous, ProtectedRecoveryJournal318)
        and _scope(scope)
        and isinstance(closure318, dict)
        and closure318.get("accepted") is True
        and closure318.get("state") == "QL427_THREE_MASTER_RECOVERY_INCIDENT_CLOSED_HOLD"
        and closure318.get("connection") == "HOLD"
        and closure318.get("receiver") == "OFF"
        and closure318.get("incidentId")
        and _id(closure318["incidentId"])
        and previous.exact(
            monitor,
            scope["episodeId"],
            scope["ceremonyId"],
            "RECOVERY_CLOSURE",
            closure318.get("closureDigest"),
        )
    ):
        return _hold("HOLD_NO_DURABLE_QL427_CLOSURE_CUSTODY")
    local = _local_snapshot(read_local_custody, scope)
    if not (
        local
        and local["incidentId"] == closure318["incidentId"]
        and _callback(
            attest_ql427_closure,
            source_revision=SOURCE318_MAIN,
            comms_revision=COMMS428_MAIN,
            ceremony_id=scope["ceremonyId"],
            episode_id=scope["episodeId"],
            incident_id=local["incidentId"],
            checkpoint_digest=local["checkpointDigest"],
            closure_receipt_digest=local["closureReceiptDigest"],
            source_closure_digest=closure318["closureDigest"],
        )
    ):
        return _hold("HOLD_QL428_LOCAL_CUSTODY_OR_INDEPENDENT_CLOSURE_UNVERIFIED")
    export = {"schema": EXPORT, **local, "preparedAt": _utc(now)}
    return {
        **_hold("QL428_ANCHOR_EXPORT_PREPARED_NOT_STORED"),
        "accepted": True,
        "state": "QL428_EXTERNAL_ANCHOR_PROPOSAL_ONLY",
        "exportRecord": export,
        "exportDigest": _digest(export),
        "sourceClosureDigest": closure318["closureDigest"],
        "receiver": "OFF_NOT_FRESHLY_VERIFIED",
    }


def _anchor_readback(
    scope: Any,
    anchor_id: str,
    request_id: str,
    store_id: str,
    reader: Any,
    local_reader: Any,
    anchor_der: bytes,
    anchor_pin: str,
    readback_der: bytes,
    readback_pin: str,
    attest_external_store: Callable[..., bool] | None,
    now: int,
) -> dict[str, Any] | None:
    if not (
        _scope(scope)
        and _id(anchor_id)
        and _id(request_id)
        and _id(store_id)
        and callable(reader)
        and anchor_pin != readback_pin
        and _public_ed25519(anchor_der, anchor_pin)
        and _public_ed25519(readback_der, readback_pin)
    ):
        return None
    before = _local_snapshot(local_reader, scope)
    if before is None:
        return None
    try:
        response = reader(
            scope=scope,
            anchor_id=anchor_id,
            request_id=request_id,
            checkpoint_digest=before["checkpointDigest"],
        )
    except Exception:
        return None
    if not (isinstance(response, dict) and set(response) == {"anchor", "readback"}):
        return None
    anchor = _native(
        response["anchor"],
        {
            "schema",
            "scope",
            "incidentId",
            "checkpointIndex",
            "checkpointDigest",
            "closureReceiptDigest",
            "closurePayloadDigest",
            "anchorId",
            "externalStoreId",
            "anchorSequence",
            "anchoredAt",
        },
        ANCHOR,
        anchor_der,
        anchor_pin,
    )
    receipt = _native(
        response["readback"],
        {
            "schema",
            "scope",
            "anchorId",
            "anchorDigest",
            "requestId",
            "externalStoreId",
            "remoteDurable",
            "remoteSequence",
            "retrievedAt",
        },
        READBACK,
        readback_der,
        readback_pin,
    )
    if not (anchor and receipt):
        return None
    stamped = _timestamp(anchor["anchoredAt"])
    observed = _recent(receipt["retrievedAt"], now)
    if not (
        anchor["scope"] == scope
        and receipt["scope"] == scope
        and anchor["incidentId"] == before["incidentId"]
        and all(
            anchor[k] == before[k]
            for k in (
                "checkpointIndex",
                "checkpointDigest",
                "closureReceiptDigest",
                "closurePayloadDigest",
            )
        )
        and anchor["anchorId"] == anchor_id
        and receipt["anchorId"] == anchor_id
        and anchor["externalStoreId"] == store_id
        and receipt["externalStoreId"] == store_id
        and type(anchor["anchorSequence"]) is int
        and anchor["anchorSequence"] > 0
        and type(receipt["remoteSequence"]) is int
        and receipt["remoteSequence"] >= anchor["anchorSequence"]
        and receipt["remoteDurable"] is True
        and receipt["anchorDigest"] == _digest(anchor)
        and receipt["requestId"] == request_id
        and stamped is not None
        and stamped <= now
        and observed is not None
        and observed >= stamped
    ):
        return None
    if not _callback(
        attest_external_store,
        source_revision=SOURCE318_MAIN,
        comms_revision=COMMS428_MAIN,
        ceremony_id=scope["ceremonyId"],
        episode_id=scope["episodeId"],
        incident_id=before["incidentId"],
        anchor_id=anchor_id,
        external_store_id=store_id,
        checkpoint_digest=before["checkpointDigest"],
        closure_receipt_digest=before["closureReceiptDigest"],
        anchor_digest=_digest(anchor),
        readback_digest=_digest(receipt),
        request_id=request_id,
        remote_sequence=receipt["remoteSequence"],
    ):
        return None
    # Re-open original local QL-426/427 stores AFTER the external I/O.
    after = _local_snapshot(local_reader, scope)
    if after != before:
        return None
    return {
        "scope": scope,
        "incidentId": before["incidentId"],
        "checkpointDigest": before["checkpointDigest"],
        "closureReceiptDigest": before["closureReceiptDigest"],
        "anchorDigest": _digest(anchor),
        "readbackDigest": _digest(receipt),
        "anchorId": anchor_id,
        "externalStoreId": store_id,
        "requestId": request_id,
        "remoteSequence": receipt["remoteSequence"],
        "observedAt": receipt["retrievedAt"],
    }


def reconcile_ql428_external_custody319(
    monitor: PersistentReeMonitor304,
    proposal: Any,
    *,
    journal: ProtectedAnchorJournal319,
    stage: str,
    anchor_id: str,
    request_id: str,
    store_id: str,
    anchor_reader: Callable[..., Any] | None,
    read_local_custody: Callable[..., Any] | None,
    anchor_der: bytes,
    anchor_pin: str,
    readback_der: bytes,
    readback_pin: str,
    attest_external_store: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Verify independently signed remote anchor/readback and one-use nonce."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(journal, ProtectedAnchorJournal319)
        and isinstance(proposal, dict)
        and proposal.get("accepted") is True
        and proposal.get("state")
        in (
            "QL428_EXTERNAL_ANCHOR_PROPOSAL_ONLY",
            "QL428_EXTERNAL_ANCHOR_CUSTODY_MATCHED",
        )
        and stage in ("ANCHOR", "RECHECK")
    ):
        return _hold("HOLD_QL428_PROTECTED_ANCHOR_CONTEXT_REQUIRED")
    if stage == "ANCHOR":
        record = proposal.get("exportRecord")
        if not (
            proposal["state"] == "QL428_EXTERNAL_ANCHOR_PROPOSAL_ONLY"
            and isinstance(record, dict)
            and set(record)
            == {
                "schema",
                "scope",
                "incidentId",
                "checkpointIndex",
                "checkpointDigest",
                "closureReceiptDigest",
                "closurePayloadDigest",
                "preparedAt",
            }
            and record["schema"] == EXPORT
            and _recent(record["preparedAt"], now) is not None
            and proposal.get("exportDigest") == _digest(record)
        ):
            return _hold("HOLD_QL428_EXPORT_PROPOSAL_UNTRUSTED")
        scope, previous = record["scope"], ZERO
    else:
        if not (
            proposal["state"] == "QL428_EXTERNAL_ANCHOR_CUSTODY_MATCHED"
            and journal.exact(monitor, proposal.get("scope"), "ANCHOR", proposal.get("proofDigest"))
        ):
            return _hold("HOLD_QL428_REENTRY_REQUIRES_PRIOR_ANCHOR")
        scope, previous = proposal["scope"], proposal["proofDigest"]
    evidence = _anchor_readback(
        scope,
        anchor_id,
        request_id,
        store_id,
        anchor_reader,
        read_local_custody,
        anchor_der,
        anchor_pin,
        readback_der,
        readback_pin,
        attest_external_store,
        now,
    )
    if evidence is None:
        return {
            **_hold("HOLD_QL428_EXTERNAL_CUSTODY_DRIFT_OR_SIGNATURE"),
            "receiver": "UNKNOWN_MANUAL_RECOVERY_REQUIRED",
        }
    if stage == "ANCHOR":
        if not all(
            evidence[k] == record[k]
            for k in ("incidentId", "checkpointDigest", "closureReceiptDigest")
        ):
            return _hold("HOLD_QL428_PREPARED_EXPORT_REMOTE_DRIFT")
    elif not all(
        evidence[k] == proposal[k]
        for k in (
            "incidentId",
            "checkpointDigest",
            "closureReceiptDigest",
            "anchorDigest",
            "anchorId",
            "externalStoreId",
        )
    ):
        return _hold("HOLD_QL428_REMOTE_CUSTODY_CHANGED_ON_REENTRY_RECHECK")
    digest = _digest(evidence)
    if not journal.claim(
        monitor,
        scope,
        stage,
        digest,
        previous,
        nonce=request_id,
        store_id=store_id,
        anchor_id=anchor_id,
        sequence=evidence["remoteSequence"],
    ):
        return _hold("HOLD_QL428_DUPLICATE_NONCE_OR_CUSTODY_REGRESSION")
    return {
        **_hold("QL428_EXTERNALLY_WITNESSED_CUSTODY_HOLD"),
        **evidence,
        "accepted": True,
        "state": (
            "QL428_EXTERNAL_ANCHOR_CUSTODY_MATCHED"
            if stage == "ANCHOR"
            else "QL428_FRESH_REENTRY_CUSTODY_RECHECKED"
        ),
        "proofDigest": digest,
        "receiver": "OFF_NOT_FRESHLY_VERIFIED",
    }


def decide_ql428_supervised_reentry319(
    monitor: PersistentReeMonitor304,
    custody: Any,
    signed_receiver_off: Any,
    master_reports: Any,
    signed_owner: Any,
    *,
    journal: ProtectedAnchorJournal319,
    receiver_der: bytes,
    receiver_pin: str,
    master_keys: dict[str, bytes],
    master_pins: dict[str, str],
    owner_der: bytes,
    owner_pin: str,
    reviewer_der: bytes,
    reviewer_pin: str,
    reentry_id: str,
    read_local_custody: Callable[..., Any] | None,
    attest_receiver_isolated: Callable[..., bool] | None,
    attest_independent_owner_authority: Callable[..., bool] | None,
    attest_reopened_ql428_precheck: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Require fresh OFF + 3 Master + dual owner, record PRECHECK never ON."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    unknown = {
        **_hold("HOLD_QL428_PRECHECK_FRESH_RECEIVER_PROOF_REQUIRED"),
        "receiver": "UNKNOWN_MANUAL_RECOVERY_REQUIRED",
    }
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(journal, ProtectedAnchorJournal319)
        and isinstance(custody, dict)
        and custody.get("accepted") is True
        and custody.get("state") == "QL428_FRESH_REENTRY_CUSTODY_RECHECKED"
        and _scope(custody.get("scope"))
        and _id(reentry_id)
        and journal.exact(monitor, custody["scope"], "RECHECK", custody.get("proofDigest"))
        and _recent(custody.get("observedAt"), now) is not None
        and _trusted_roles(master_keys, master_pins, set(MASTERS))
        and _public_ed25519(receiver_der, receiver_pin)
        and _public_ed25519(owner_der, owner_pin)
        and _public_ed25519(reviewer_der, reviewer_pin)
        and len({receiver_pin, owner_pin, reviewer_pin, *master_pins.values()}) == 6
    ):
        return unknown
    scope = custody["scope"]
    off = _native(
        signed_receiver_off,
        {
            "schema",
            "scope",
            "incidentId",
            "closureReceiptDigest",
            "anchorDigest",
            "reentryId",
            "receiverState",
            "observedAt",
        },
        OFF,
        receiver_der,
        receiver_pin,
    )
    if not (
        off
        and off["scope"] == scope
        and off["incidentId"] == custody["incidentId"]
        and off["closureReceiptDigest"] == custody["closureReceiptDigest"]
        and off["anchorDigest"] == custody["anchorDigest"]
        and off["reentryId"] == reentry_id
        and off["receiverState"] == "OFF"
        and _recent(off["observedAt"], now) is not None
        and _timestamp(off["observedAt"]) >= _timestamp(custody["observedAt"])
    ):
        return unknown
    off_digest = _digest(off)
    evidence = {
        "source_revision": SOURCE318_MAIN,
        "comms_revision": COMMS428_MAIN,
        "ceremony_id": scope["ceremonyId"],
        "episode_id": scope["episodeId"],
        "incident_id": custody["incidentId"],
        "closure_receipt_digest": custody["closureReceiptDigest"],
        "anchor_digest": custody["anchorDigest"],
        "reentry_id": reentry_id,
        "receiver_off_digest": off_digest,
    }
    if not _callback(attest_receiver_isolated, **evidence):
        return unknown
    if not (isinstance(master_reports, dict) and set(master_reports) == set(MASTERS)):
        return _hold("HOLD_QL428_THREE_MASTER_REPORTS_INCOMPLETE")
    bodies = []
    for master in MASTERS:
        p = _native(
            master_reports[master],
            {
                "schema",
                "masterId",
                "scope",
                "incidentId",
                "closureReceiptDigest",
                "anchorDigest",
                "offDigest",
                "reentryId",
                "status",
                "observedAt",
            },
            MASTER,
            master_keys[master],
            master_pins[master],
        )
        if not (
            p
            and p["masterId"] == master
            and p["scope"] == scope
            and p["incidentId"] == custody["incidentId"]
            and p["closureReceiptDigest"] == custody["closureReceiptDigest"]
            and p["anchorDigest"] == custody["anchorDigest"]
            and p["offDigest"] == off_digest
            and p["reentryId"] == reentry_id
            and p["status"] == "REENTRY_PRECHECK_ONLY_NEW_QL424_CEREMONY_REQUIRED"
            and _recent(p["observedAt"], now) is not None
            and _timestamp(p["observedAt"]) >= _timestamp(off["observedAt"])
        ):
            return _hold("HOLD_QL428_MASTER_PRECHECK_INVALID")
        bodies.append(p)
    reports_digest = _digest(bodies)
    envelope = signed_owner if isinstance(signed_owner, dict) else {}
    p = envelope.get("payload")
    fields = {
        "schema",
        "scope",
        "incidentId",
        "closureReceiptDigest",
        "anchorDigest",
        "offDigest",
        "reentryId",
        "reportsDigest",
        "action",
        "ownerId",
        "reviewerId",
        "decidedAt",
    }
    if not (
        set(envelope) == {"payload", "ownerSignature", "reviewerSignature"}
        and isinstance(p, dict)
        and set(p) == fields
        and p["schema"] == OWNER
        and p["scope"] == scope
        and p["incidentId"] == custody["incidentId"]
        and p["closureReceiptDigest"] == custody["closureReceiptDigest"]
        and p["anchorDigest"] == custody["anchorDigest"]
        and p["offDigest"] == off_digest
        and p["reentryId"] == reentry_id
        and p["reportsDigest"] == reports_digest
        and p["action"] == "PREPARE_NEW_SUPERVISED_CEREMONY_KEEP_RECEIVER_OFF"
        and isinstance(p["ownerId"], str)
        and PERSON.fullmatch(p["ownerId"])
        and isinstance(p["reviewerId"], str)
        and PERSON.fullmatch(p["reviewerId"])
        and p["ownerId"] != p["reviewerId"]
        and _recent(p["decidedAt"], now) is not None
        and _timestamp(p["decidedAt"]) >= _timestamp(off["observedAt"])
        and _trusted_signature(p, envelope["ownerSignature"], owner_der, owner_pin)
        and _trusted_signature(p, envelope["reviewerSignature"], reviewer_der, reviewer_pin)
    ):
        return _hold("HOLD_QL428_DUAL_SIGNED_OWNER_PRECHECK_INVALID")
    local = _local_snapshot(read_local_custody, scope)
    if not (
        local
        and local["incidentId"] == custody["incidentId"]
        and local["checkpointDigest"] == custody["checkpointDigest"]
        and local["closureReceiptDigest"] == custody["closureReceiptDigest"]
        and _callback(attest_independent_owner_authority, **evidence)
        and _callback(
            attest_reopened_ql428_precheck,
            **evidence,
            reports_digest=reports_digest,
            owner_digest=_digest(p),
        )
    ):
        return _hold("HOLD_QL428_LOCAL_DRIFT_OR_PRECHECK_OWNER_CUSTODY")
    digest = _digest(
        {
            **evidence,
            "reports_digest": reports_digest,
            "owner_digest": _digest(p),
            "remote_readback_digest": custody["readbackDigest"],
        }
    )
    if not journal.claim(
        monitor, scope, "PRECHECK", digest, custody["proofDigest"], nonce=reentry_id
    ):
        return _hold("HOLD_QL428_REENTRY_DECISION_REPLAY_OR_STORAGE")
    return {
        **_hold("QL428_NEW_SUPERVISED_QL424_CEREMONY_REQUIRED"),
        "accepted": True,
        "state": "QL428_SUPERVISED_REENTRY_PRECHECK_ONLY",
        "reentryId": reentry_id,
        "precheckDigest": digest,
        "masterCount": 3,
        "receiver": "OFF",
        "connection": "HOLD",
        "masterSync": "HOLD",
        "ownerAcceptance": "HOLD",
        "recovery": "NEW_ORIGINAL_HOST_QL424_CEREMONY_REQUIRED",
    }


def reconcile_master_evidence319(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Protected owner-only source view, not remote or original Windows proof."""
    return {
        **reconcile_master_evidence318(monitor),
        "schema": "rosevear.ai-hub.master360-ql428-anchor-reentry319.v1",
        "sourceBuild": 319,
        "source318MainAtReconciliation": SOURCE318_MAIN,
        "commsQl428MainAtReconciliation": COMMS428_MAIN,
        "controller380MainAtReconciliation": CONTROLLER380_MAIN,
        "ql428ExternalAnchorExport": "HOLD_NO_VERIFIED_QL427_EXPORT",
        "ql428OffHostAnchor": "HOLD_NO_INDEPENDENT_OFF_HOST_SIGNED_ANCHOR",
        "ql428IndependentReadback": "HOLD_NO_FRESH_SIGNED_REMOTE_NONCE_READBACK",
        "ql428CustodyDrift": "HOLD_NO_POST_READBACK_LOCAL_REOPEN",
        "ql428ReentryReceiverOff": "HOLD_NO_NEW_SIGNED_RECEIVER_OFF",
        "ql428ThreeMasterPrecheck": "HOLD_NO_THREE_FRESH_MASTER_SIGNATURES",
        "ql428OwnerPrecheck": "HOLD_NO_DUAL_SIGNED_OWNER_DECISION",
        "ql428DurablePrecheck": "HOLD_NO_ORIGINAL_HOST_ONE_USE_REENTRY_RECEIPT",
        "receiver": "OFF",
        "connection": "HOLD",
        "ownerAcceptance": "HOLD",
        "masterSync": "HOLD",
        "runtimeUptime": "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING",
    }
