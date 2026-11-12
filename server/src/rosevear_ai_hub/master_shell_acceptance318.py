"""Build 318: original-host QL-427 external witness and recovery closure.

No receiver commands, key enrollment, live proof intake or automatic re-entry.
Only original-host, protected, independently pinned signed evidence can advance
the metadata-only journal. Operational connection remains HOLD throughout.
"""

import hashlib
import re
import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _timestamp
from rosevear_ai_hub.master_shell_acceptance306 import _trusted_signature
from rosevear_ai_hub.master_shell_acceptance308 import _hold, _on_ree
from rosevear_ai_hub.master_shell_acceptance310 import _sha
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS, _callback
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519, _trusted_roles
from rosevear_ai_hub.master_shell_acceptance316 import CONTROLLER380_MAIN, SOURCE315_MAIN
from rosevear_ai_hub.master_shell_acceptance317 import (
    ProtectedCheckpointJournal317,
    reconcile_master_evidence317,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE317_MAIN = "20f1ac3ab519872b786c5d09fed57168353a213c"
COMMS427_MAIN = "94bd91afafa19ae54e701b48cb52df608ac326a5"
STAGES = ("WITNESS", "ISOLATION", "RECOVERY_CLOSURE")
ID = re.compile(r"[A-Za-z0-9_-]{12,96}\Z")
PERSON = re.compile(r"[A-Za-z0-9_-]{3,80}\Z")
ZERO = "0" * 64
EXPORT_SCHEMA = "rosevear.ql427.checkpoint-witness-export.v1"
WITNESS_SCHEMA = "rosevear.ql427.independent-checkpoint-witness.v1"
OFF_SCHEMA = "rosevear.ql427.post-rollback-isolation.v1"
MASTER_SCHEMA = "rosevear.ql427.master-recovery-closure.v1"
OWNER_SCHEMA = "rosevear.ql427.owner-recovery-closure.v1"


def _digest(value: Any) -> str:
    return hashlib.sha256(_serialize(value)).hexdigest()


def _fresh(value: Any, now: int) -> int | None:
    stamp = _timestamp(value)
    return stamp if stamp is not None and 0 <= now - stamp <= 120_000 else None


def _scope(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and set(value) == {
            "ceremonyId", "sourceId", "episodeId",
            "sourceRevision", "controllerRevision",
        }
        and bool(ID.fullmatch(str(value.get("ceremonyId", ""))))
        and bool(ID.fullmatch(str(value.get("episodeId", ""))))
        and value["sourceId"] == "rosevear-ai-hub"
        and value["sourceRevision"] == SOURCE315_MAIN
        and value["controllerRevision"] == CONTROLLER380_MAIN
    )


def _signed_native(envelope: Any, fields: set[str], schema: str, der: bytes,
                   pin: str, issued: str, now: int) -> dict[str, Any] | None:
    if not (
        isinstance(envelope, dict) and set(envelope) == {"payload", "signature"}
        and isinstance(envelope["payload"], dict)
        and set(envelope["payload"]) == fields
        and envelope["payload"].get("schema") == schema
        and _fresh(envelope["payload"].get(issued), now) is not None
        and _public_ed25519(der, pin)
        and _trusted_signature(envelope["payload"], envelope["signature"], der, pin)
    ):
        return None
    return envelope["payload"]


class ProtectedRecoveryJournal318:
    """One-use, ordered, metadata-only SQLite custody; external anchor still required."""

    def __init__(self, path: Path):
        self.path = path

    def _rows(self, episode: str, ceremony: str):
        with sqlite3.connect(self.path, timeout=2) as db:
            db.execute("PRAGMA query_only=ON")
            return db.execute(
                "SELECT stage,digest,previous_digest FROM recovery318 "
                "WHERE episode=? AND ceremony=? ORDER BY rowid",
                (episode, ceremony),
            ).fetchall()

    def exact(self, monitor: PersistentReeMonitor304, episode: str, ceremony: str,
              stage: str, digest: str) -> bool:
        if not (_on_ree(monitor) and stage in STAGES and _sha(digest)
                and isinstance(episode, str) and ID.fullmatch(episode)
                and isinstance(ceremony, str) and ID.fullmatch(ceremony)
                and self.path.is_file()):
            return False
        try:
            rows = self._rows(episode, ceremony)
            if len(rows) < STAGES.index(stage) + 1 or len(rows) > len(STAGES):
                return False
            previous = ZERO
            for idx, (name, value, linked) in enumerate(rows):
                if name != STAGES[idx] or linked != previous or not _sha(value):
                    return False
                previous = value
            return rows[STAGES.index(stage)][1] == digest
        except (OSError, sqlite3.Error, IndexError):
            return False

    def claim(self, monitor: PersistentReeMonitor304, episode: str, ceremony: str,
              stage: str, digest: str, previous: str) -> bool:
        if not (_on_ree(monitor) and stage in STAGES and _sha(digest) and _sha(previous)
                and isinstance(episode, str) and ID.fullmatch(episode)
                and isinstance(ceremony, str) and ID.fullmatch(ceremony)):
            return False
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    "CREATE TABLE IF NOT EXISTS recovery318 (episode TEXT NOT NULL, "
                    "ceremony TEXT NOT NULL, stage TEXT NOT NULL, digest TEXT NOT NULL, "
                    "previous_digest TEXT NOT NULL, PRIMARY KEY(ceremony,stage), "
                    "UNIQUE(episode,stage))"
                )
                ix = STAGES.index(stage)
                if ix == 0:
                    if previous != ZERO:
                        return False
                else:
                    prior = db.execute(
                        "SELECT digest FROM recovery318 WHERE episode=? AND ceremony=? AND stage=?",
                        (episode, ceremony, STAGES[ix - 1]),
                    ).fetchone()
                    if prior != (previous,):
                        return False
                row = db.execute(
                    "INSERT OR IGNORE INTO recovery318 VALUES (?,?,?,?,?)",
                    (episode, ceremony, stage, digest, previous),
                )
                return row.rowcount == 1
        except (OSError, sqlite3.Error):
            return False


def verify_ql427_external_witness318(
    monitor: PersistentReeMonitor304, audit317: Any, export: Any, witness: Any, *,
    prior: ProtectedCheckpointJournal317, journal: ProtectedRecoveryJournal318,
    witness_der: bytes, witness_pin: str,
    attest_reopened_owner_ack: Callable[..., bool] | None,
    attest_external_witness_custody: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Verify original audit plus exact native QL-427 independent witness."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor) and isinstance(prior, ProtectedCheckpointJournal317)
        and isinstance(journal, ProtectedRecoveryJournal318)
        and isinstance(audit317, dict) and audit317.get("accepted") is True
        and audit317.get("state") == "DURABLE_INDEPENDENT_OWNER_INCIDENT_AUDIT_CLOSED_RECOVERY_HOLD"
        and audit317.get("receiver") == "OFF" and audit317.get("connection") == "HOLD"
        and prior.exact(monitor, audit317.get("episodeId"), audit317.get("ceremonyId"),
                        "OWNER_AUDIT", audit317.get("auditDigest"))
        and isinstance(export, dict)
        and set(export) == {"schema", "scope", "checkpointIndex", "checkpointDigest",
                            "incidentId", "ownerAckEvidenceDigest",
                            "rollbackCheckpointDigest", "preparedAt"}
        and export["schema"] == EXPORT_SCHEMA and _scope(export["scope"])
        and type(export["checkpointIndex"]) is int and export["checkpointIndex"] >= 2
        and all(_sha(export.get(k)) for k in
                ("checkpointDigest", "ownerAckEvidenceDigest", "rollbackCheckpointDigest"))
        and _fresh(export["preparedAt"], now) is not None
        and export["scope"]["episodeId"] == audit317["episodeId"]
        and export["scope"]["ceremonyId"] == audit317["ceremonyId"]
        and export["incidentId"] == audit317["incidentId"]
    ):
        return _hold("HOLD_QL427_REOPENED_OWNER_AUDIT_AND_EXPORT_REQUIRED")
    p = _signed_native(
        witness, {"schema", "scope", "checkpointIndex", "checkpointDigest", "incidentId",
                  "exportDigest", "witnessId", "witnessedAt"},
        WITNESS_SCHEMA, witness_der, witness_pin, "witnessedAt", now,
    )
    if not (
        p and p["scope"] == export["scope"]
        and p["checkpointIndex"] == export["checkpointIndex"]
        and p["checkpointDigest"] == export["checkpointDigest"]
        and p["incidentId"] == export["incidentId"]
        and p["exportDigest"] == _digest(export)
        and isinstance(p["witnessId"], str) and PERSON.fullmatch(p["witnessId"])
        and _fresh(p["witnessedAt"], now) >= _fresh(export["preparedAt"], now)
    ):
        return _hold("HOLD_QL427_INDEPENDENT_SIGNED_WITNESS_INVALID")
    digest = _digest(p)
    evidence = {
        "source_revision": SOURCE317_MAIN,
        "comms_revision": COMMS427_MAIN,
        "controller_revision": CONTROLLER380_MAIN,
        "ceremony_id": audit317["ceremonyId"],
        "episode_id": audit317["episodeId"],
        "incident_id": audit317["incidentId"],
        "checkpoint_digest": export["checkpointDigest"],
        "owner_ack_digest": export["ownerAckEvidenceDigest"],
        "witness_digest": digest,
    }
    if not (
        _callback(attest_reopened_owner_ack, **evidence)
        and _callback(attest_external_witness_custody, **evidence)
        and journal.claim(monitor, audit317["episodeId"], audit317["ceremonyId"],
                          "WITNESS", digest, ZERO)
    ):
        return _hold("HOLD_QL427_EXTERNAL_WITNESS_CUSTODY_OR_REPLAY")
    return {
        **_hold("QL427_INDEPENDENT_CHECKPOINT_WITNESS_ONLY"),
        "accepted": True, "scope": export["scope"], "incidentId": audit317["incidentId"],
        "checkpointDigest": export["checkpointDigest"], "witnessDigest": digest,
        "witnessedAt": p["witnessedAt"], "receiver": "OFF_NOT_FRESHLY_VERIFIED",
    }


def revalidate_ql427_isolation318(
    monitor: PersistentReeMonitor304, witnessed: Any, signed_off: Any, *,
    journal: ProtectedRecoveryJournal318, receiver_der: bytes, receiver_pin: str,
    attest_independent_receiver_off: Callable[..., bool] | None,
    attest_ql427_post_rollback_readback: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """A new signed OFF observation is mandatory; QL-426 OFF is not enough."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    unknown = {**_hold("HOLD_QL427_FRESH_OFF_UNVERIFIED"),
               "receiver": "UNKNOWN_MANUAL_RECOVERY_REQUIRED"}
    if not (
        isinstance(witnessed, dict) and witnessed.get("accepted") is True
        and witnessed.get("state") == "QL427_INDEPENDENT_CHECKPOINT_WITNESS_ONLY"
        and isinstance(journal, ProtectedRecoveryJournal318)
        and _scope(witnessed.get("scope"))
        and journal.exact(monitor, witnessed["scope"]["episodeId"],
                          witnessed["scope"]["ceremonyId"], "WITNESS",
                          witnessed.get("witnessDigest"))
    ):
        return unknown
    p = _signed_native(
        signed_off, {"schema", "scope", "incidentId", "checkpointDigest",
                     "witnessDigest", "checkId", "receiverState", "observedAt"},
        OFF_SCHEMA, receiver_der, receiver_pin, "observedAt", now,
    )
    if not (
        p and p["scope"] == witnessed["scope"]
        and p["incidentId"] == witnessed["incidentId"]
        and p["checkpointDigest"] == witnessed["checkpointDigest"]
        and p["witnessDigest"] == witnessed["witnessDigest"]
        and isinstance(p["checkId"], str) and ID.fullmatch(p["checkId"])
        and p["receiverState"] == "OFF"
        and _fresh(p["observedAt"], now) >= _timestamp(witnessed["witnessedAt"])
    ):
        return unknown
    digest = _digest(p)
    evidence = {"source_revision": SOURCE317_MAIN, "comms_revision": COMMS427_MAIN,
                "incident_id": witnessed["incidentId"],
                "checkpoint_digest": witnessed["checkpointDigest"],
                "witness_digest": witnessed["witnessDigest"],
                "isolation_digest": digest, "check_id": p["checkId"]}
    if not (
        _callback(attest_independent_receiver_off, **evidence)
        and _callback(attest_ql427_post_rollback_readback, **evidence)
        and journal.claim(monitor, p["scope"]["episodeId"], p["scope"]["ceremonyId"],
                          "ISOLATION", digest, witnessed["witnessDigest"])
    ):
        return unknown
    return {
        **_hold("QL427_FRESH_SIGNED_RECEIVER_OFF_REVALIDATED"),
        "accepted": True, "scope": p["scope"], "incidentId": p["incidentId"],
        "checkpointDigest": p["checkpointDigest"], "witnessDigest": p["witnessDigest"],
        "isolationDigest": digest, "observedAt": p["observedAt"], "receiver": "OFF",
    }


def close_ql427_three_master_recovery318(
    monitor: PersistentReeMonitor304, isolated: Any, reports: Any,
    owner_signed: Any, comms_closure: Any, *,
    journal: ProtectedRecoveryJournal318,
    master_keys: dict[str, bytes], master_pins: dict[str, str],
    owner_der: bytes, owner_pin: str, reviewer_der: bytes, reviewer_pin: str,
    attest_reopened_comms_closure: Callable[..., bool] | None,
    attest_independent_closure_anchor: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Administrative recovery closure only; never pilot reactivation."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        isinstance(isolated, dict) and isolated.get("accepted") is True
        and isolated.get("state") == "QL427_FRESH_SIGNED_RECEIVER_OFF_REVALIDATED"
        and isolated.get("receiver") == "OFF" and _scope(isolated.get("scope"))
        and isinstance(journal, ProtectedRecoveryJournal318)
        and journal.exact(monitor, isolated["scope"]["episodeId"],
                          isolated["scope"]["ceremonyId"], "ISOLATION",
                          isolated.get("isolationDigest"))
        and isinstance(reports, dict) and set(reports) == set(MASTERS)
        and _trusted_roles(master_keys, master_pins, set(MASTERS))
        and _public_ed25519(owner_der, owner_pin) and _public_ed25519(reviewer_der, reviewer_pin)
        and owner_pin != reviewer_pin
        and not ({owner_pin, reviewer_pin} & set(master_pins.values()))
        and isinstance(comms_closure, dict)
        and comms_closure.get("state") == "DURABLE_THREE_MASTER_RECOVERY_CLOSURE_RECORDED"
        and comms_closure.get("incidentId") == isolated["incidentId"]
        and comms_closure.get("checkpointDigest") == isolated["checkpointDigest"]
        and comms_closure.get("masterCount") == 3
        and comms_closure.get("receiver") == "OFF_VERIFIED_SIGNED_READBACK"
        and comms_closure.get("connection") == "HOLD"
        and _sha(comms_closure.get("recoveryClosureDigest"))
    ):
        return _hold("HOLD_INDEPENDENT_QL427_CLOSURE_AND_SIGNER_CUSTODY_REQUIRED")
    fields = {"schema", "masterId", "scope", "incidentId", "checkpointDigest",
              "witnessDigest", "isolationDigest", "status", "observedAt"}
    bodies = []
    for master in MASTERS:
        p = _signed_native(reports[master], fields, MASTER_SCHEMA,
                           master_keys[master], master_pins[master], "observedAt", now)
        if not (
            p and p["masterId"] == master and p["scope"] == isolated["scope"]
            and p["incidentId"] == isolated["incidentId"]
            and p["checkpointDigest"] == isolated["checkpointDigest"]
            and p["witnessDigest"] == isolated["witnessDigest"]
            and p["isolationDigest"] == isolated["isolationDigest"]
            and p["status"] == "CONFIRMED_ISOLATED_RECOVERY_CLOSED"
            and _fresh(p["observedAt"], now) >= _timestamp(isolated["observedAt"])
        ):
            return _hold("HOLD_QL427_THREE_MASTER_SIGNATURE_OR_SCOPE_INVALID")
        bodies.append(p)
    report_digest = _digest(bodies)
    envelope = owner_signed if isinstance(owner_signed, dict) else {}
    p = envelope.get("payload")
    owner_fields = {"schema", "scope", "incidentId", "checkpointDigest", "witnessDigest",
                    "isolationDigest", "reportsDigest", "action", "closedAt",
                    "ownerId", "reviewerId"}
    if not (
        set(envelope) == {"payload", "ownerSignature", "reviewerSignature"}
        and isinstance(p, dict) and set(p) == owner_fields
        and p["schema"] == OWNER_SCHEMA
        and p["scope"] == isolated["scope"] and p["incidentId"] == isolated["incidentId"]
        and p["checkpointDigest"] == isolated["checkpointDigest"]
        and p["witnessDigest"] == isolated["witnessDigest"]
        and p["isolationDigest"] == isolated["isolationDigest"]
        and p["reportsDigest"] == report_digest
        and p["action"] == "ACCEPT_RECOVERY_CLOSURE_KEEP_RECEIVER_OFF"
        and isinstance(p["ownerId"], str) and PERSON.fullmatch(p["ownerId"])
        and isinstance(p["reviewerId"], str) and PERSON.fullmatch(p["reviewerId"])
        and p["ownerId"] != p["reviewerId"]
        and _fresh(p["closedAt"], now) is not None
        and _fresh(p["closedAt"], now) >= _timestamp(isolated["observedAt"])
        and _trusted_signature(p, envelope["ownerSignature"], owner_der, owner_pin)
        and _trusted_signature(p, envelope["reviewerSignature"], reviewer_der, reviewer_pin)
    ):
        return _hold("HOLD_QL427_DUAL_OWNER_RECOVERY_CLOSURE_INVALID")
    digest = _digest(p)
    evidence = {"source_revision": SOURCE317_MAIN, "comms_revision": COMMS427_MAIN,
                "episode_id": isolated["scope"]["episodeId"],
                "ceremony_id": isolated["scope"]["ceremonyId"],
                "incident_id": isolated["incidentId"],
                "checkpoint_digest": isolated["checkpointDigest"],
                "witness_digest": isolated["witnessDigest"],
                "isolation_digest": isolated["isolationDigest"],
                "three_master_digest": report_digest,
                "owner_digest": digest,
                "comms_closure_digest": comms_closure["recoveryClosureDigest"]}
    if not (
        _callback(attest_reopened_comms_closure, **evidence)
        and _callback(attest_independent_closure_anchor, **evidence)
        and journal.claim(monitor, isolated["scope"]["episodeId"],
                          isolated["scope"]["ceremonyId"], "RECOVERY_CLOSURE",
                          _digest(evidence), isolated["isolationDigest"])
    ):
        return _hold("HOLD_QL427_CLOSURE_READBACK_ANCHOR_OR_REPLAY")
    return {
        **_hold("QL427_THREE_MASTER_RECOVERY_INCIDENT_CLOSED_HOLD"),
        "accepted": True, "incidentId": isolated["incidentId"],
        "closureDigest": _digest(evidence),
        "receiver": "OFF", "connection": "HOLD", "ownerAcceptance": "HOLD",
        "masterSync": "HOLD", "recovery": "NEW_SUPERVISED_QL424_CEREMONY_REQUIRED",
    }


def reconcile_master_evidence318(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Owner-only source-state projection; no protected evidence accepted here."""
    return {
        **reconcile_master_evidence317(monitor),
        "schema": "rosevear.ai-hub.master360-ql427-recovery318.v1",
        "sourceBuild": 318,
        "source317MainAtReconciliation": SOURCE317_MAIN,
        "commsQl427MainAtReconciliation": COMMS427_MAIN,
        "controller380MainAtReconciliation": CONTROLLER380_MAIN,
        "ql427CheckpointExport": "HOLD_NO_AUTHENTICATED_EXPORT",
        "ql427IndependentWitness": "HOLD_NO_EXTERNAL_SIGNED_WITNESS",
        "ql427ReceiverIsolation": "HOLD_NO_FRESH_SIGNED_POST_ROLLBACK_OFF",
        "ql427ThreeMasterRecovery": "HOLD_NO_THREE_SIGNED_CLOSURE_REPORTS",
        "ql427OwnerClosure": "HOLD_NO_DUAL_SIGNED_OWNER_REVIEWER",
        "ql427ExternalClosureAnchor": "HOLD_NO_EXTERNAL_DURABLE_CLOSURE_ANCHOR",
        "runtimeUptime": "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING",
        "originalHostUptime": "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION",
        "receiver": "OFF", "connection": "HOLD", "ownerAcceptance": "HOLD",
        "masterSync": "HOLD",
    }
