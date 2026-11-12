"""Build 317 durable QL-426 checkpoint, signed rollback and incident closure.

Original Ree-host-only, private metadata and independently pinned Ed25519.
No receiver controls, auto-restart, production key enrollment or live status claims.
"""

import hashlib
import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _timestamp
from rosevear_ai_hub.master_shell_acceptance306 import _trusted_signature
from rosevear_ai_hub.master_shell_acceptance308 import _hold, _on_ree
from rosevear_ai_hub.master_shell_acceptance310 import _episode, _sha
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS, _callback
from rosevear_ai_hub.master_shell_acceptance313 import _signed
from rosevear_ai_hub.master_shell_acceptance315 import (
    _identity,
    _public_ed25519,
    _trusted_roles,
)
from rosevear_ai_hub.master_shell_acceptance316 import (
    CONTROLLER380_MAIN,
    SOURCE315_MAIN,
    ProtectedPilotContinuityJournal316,
    reconcile_master_evidence316,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE316_MAIN = "4804a7a200ac7c63f8e08b08e1f37c6085960054"
COMMS426_MAIN = "fb9ef12aebd5594bd56af5e800011b82812f7ffa"
COMMS_CURRENT_MAIN = "94bd91afafa19ae54e701b48cb52df608ac326a5"
CHECKPOINT_SCHEMA = "rosevear.ai-hub.master360-ql426-checkpoint317.v1"
MASTER_SCHEMA = "rosevear.ai-hub.master360-independent-recovery317.v1"
RECEIVER_SCHEMA = "rosevear.ql426.receiver-rollback-readback.v1"
ACK_SCHEMA = "rosevear.ql426.owner-incident-ack.v1"
STAGES = ("CHECKPOINT", "ROLLBACK", "OWNER_AUDIT")
ZERO = "0" * 64


def _digest(value: Any) -> str:
    return hashlib.sha256(_serialize(value)).hexdigest()


def _receiver_off(envelope: Any, der: bytes, pin: str, now: int) -> dict[str, Any] | None:
    fields = {
        "schema",
        "ceremonyId",
        "sourceId",
        "episodeId",
        "sourceRevision",
        "controllerRevision",
        "incidentId",
        "receiverState",
        "observedAt",
    }
    if not (
        isinstance(envelope, dict)
        and set(envelope) == {"payload", "signature"}
        and isinstance(envelope.get("payload"), dict)
        and set(envelope["payload"]) == fields
        and _public_ed25519(der, pin)
    ):
        return None
    p = envelope["payload"]
    observed = _timestamp(p.get("observedAt"))
    if (
        p.get("schema") == RECEIVER_SCHEMA
        and p.get("sourceId") == "rosevear-ai-hub"
        and p.get("sourceRevision") == SOURCE315_MAIN
        and p.get("controllerRevision") == CONTROLLER380_MAIN
        and p.get("receiverState") == "OFF"
        and observed is not None
        and 0 <= now - observed <= 60_000
        and _trusted_signature(p, envelope["signature"], der, pin)
    ):
        return p
    return None


class ProtectedCheckpointJournal317:
    """Ordered one-use source receipts and tamper-evident durable digest chain."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def exact(
        self,
        monitor: PersistentReeMonitor304,
        episode: str,
        ceremony: str,
        stage: str,
        digest: str,
    ) -> bool:
        if not (
            _on_ree(monitor)
            and _episode(episode)
            and _identity(ceremony)
            and stage in STAGES
            and _sha(digest)
            and self.path.is_file()
        ):
            return False
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                chain = db.execute(
                    """SELECT stage, digest, previous_digest FROM checkpoint_journal317
                    WHERE episode=? AND ceremony=? ORDER BY rowid""",
                    (episode, ceremony),
                ).fetchall()
                if len(chain) < STAGES.index(stage) + 1:
                    return False
                prev = ZERO
                for index, row in enumerate(chain):
                    if row != (STAGES[index], row[1], prev) or not _sha(row[1]):
                        return False
                    prev = row[1]
                return chain[STAGES.index(stage)][1] == digest
        except (OSError, sqlite3.Error, IndexError):
            return False

    def claim(
        self,
        monitor: PersistentReeMonitor304,
        episode: str,
        ceremony: str,
        stage: str,
        digest: str,
        previous_digest: str,
    ) -> bool:
        if not (
            _on_ree(monitor)
            and _episode(episode)
            and _identity(ceremony)
            and stage in STAGES
            and _sha(digest)
            and _sha(previous_digest)
        ):
            return False
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA busy_timeout=2000")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS checkpoint_journal317 (
                    episode TEXT NOT NULL, ceremony TEXT NOT NULL,
                    stage TEXT NOT NULL, digest TEXT NOT NULL,
                    previous_digest TEXT NOT NULL,
                    PRIMARY KEY(ceremony,stage), UNIQUE(episode,stage))"""
                )
                ix = STAGES.index(stage)
                if ix == 0:
                    if previous_digest != ZERO:
                        return False
                else:
                    prior = db.execute(
                        """SELECT digest FROM checkpoint_journal317
                        WHERE episode=? AND ceremony=? AND stage=?""",
                        (episode, ceremony, STAGES[ix - 1]),
                    ).fetchone()
                    if prior != (previous_digest,):
                        return False
                row = db.execute(
                    """INSERT OR IGNORE INTO checkpoint_journal317
                    VALUES (?,?,?,?,?)""",
                    (episode, ceremony, stage, digest, previous_digest),
                )
                return row.rowcount == 1
        except (OSError, sqlite3.Error):
            return False


def witness_durable_ql426_checkpoint317(
    monitor: PersistentReeMonitor304,
    health316: Any,
    signed_host_checkpoint: Any,
    *,
    old_journal: ProtectedPilotContinuityJournal316,
    journal: ProtectedCheckpointJournal317,
    original_host_der: bytes,
    original_host_pin: str,
    attest_ql426_reopened_checkpoint: Callable[..., bool] | None,
    attest_original_installed_host: Callable[..., bool] | None,
    attest_external_head_custody: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Confirm source-signed metadata and independently reopened QL-426 head."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(old_journal, ProtectedPilotContinuityJournal316)
        and isinstance(journal, ProtectedCheckpointJournal317)
        and isinstance(health316, dict)
        and health316.get("accepted") is True
        and health316.get("state") == "THREE_MASTER_SIGNED_QL425_HEALTH_SNAPSHOT_NOT_UPTIME"
        and health316.get("connection") == "HOLD"
        and _sha(health316.get("healthDigest"))
        and old_journal.exact(
            monitor,
            health316.get("ceremonyId"),
            health316.get("episodeId"),
            health316.get("healthDigest"),
        )
    ):
        return _hold("HOLD_316_SIGNED_PILOT_HEALTH_AND_JOURNAL_MISSING")
    fields = {
        "schema", "hostId", "sourceId", "sourceRevision",
        "ql426CommsRevision", "controllerRevision", "episodeId",
        "ceremonyId", "healthDigest", "ql426CheckpointDigest",
        "ql426Index", "ql426EvidenceDigest", "issuedAt", "connection",
    }
    p = _signed(
        signed_host_checkpoint, fields, CHECKPOINT_SCHEMA,
        original_host_der, original_host_pin, now,
    )
    if p is None or not (
        p["hostId"] == "DESKTOP-AE894KC"
        and p["sourceId"] == "rosevear-ai-hub"
        and p["sourceRevision"] == SOURCE316_MAIN
        and p["ql426CommsRevision"] == COMMS426_MAIN
        and p["controllerRevision"] == CONTROLLER380_MAIN
        and p["episodeId"] == health316["episodeId"]
        and p["ceremonyId"] == health316["ceremonyId"]
        and p["healthDigest"] == health316["healthDigest"]
        and _sha(p["ql426CheckpointDigest"])
        and _sha(p["ql426EvidenceDigest"])
        and type(p["ql426Index"]) is int
        and 1 <= p["ql426Index"] <= 99999999
        and p["connection"] == "HOLD"
    ):
        return _hold("HOLD_UNTRUSTED_OR_DRIFTED_QL426_CHECKPOINT")
    digest = _digest(p)
    evidence = {
        "episode_id": p["episodeId"],
        "ceremony_id": p["ceremonyId"],
        "source_revision": SOURCE316_MAIN,
        "comms_revision": COMMS426_MAIN,
        "controller_revision": CONTROLLER380_MAIN,
        "health_digest": p["healthDigest"],
        "ql426_checkpoint_digest": p["ql426CheckpointDigest"],
        "ql426_evidence_digest": p["ql426EvidenceDigest"],
        "ql426_index": p["ql426Index"],
        "original_host_digest": digest,
    }
    if not (
        _callback(attest_ql426_reopened_checkpoint, **evidence)
        and _callback(attest_original_installed_host, **evidence)
        and _callback(attest_external_head_custody, **evidence)
    ):
        return _hold("HOLD_NO_REOPENED_QL426_OR_EXTERNAL_CUSTODY_PROOF")
    if not journal.claim(
        monitor, p["episodeId"], p["ceremonyId"], "CHECKPOINT", digest, ZERO
    ):
        return _hold("HOLD_CHECKPOINT_REPLAY_OR_STORAGE_FAILURE")
    return {
        **_hold("QL426_DURABLE_ORIGINAL_HOST_CHECKPOINT_WITNESSED_REVIEW_ONLY"),
        "accepted": True,
        "episodeId": p["episodeId"],
        "ceremonyId": p["ceremonyId"],
        "healthDigest": p["healthDigest"],
        "checkpointDigest": digest,
        "commsCheckpointDigest": p["ql426CheckpointDigest"],
    }


def reconcile_ql426_signed_rollback317(
    monitor: PersistentReeMonitor304,
    checkpoint: Any,
    ql426_rollback: Any,
    signed_receiver_off: Any,
    *,
    journal: ProtectedCheckpointJournal317,
    receiver_der: bytes,
    receiver_pin: str,
    attest_reopened_ql426_rollback: Callable[..., bool] | None,
    attest_independent_receiver_disabled: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Only authentic QL-426 OFF receipt plus durable rollback can claim OFF."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    unknown = {
        **_hold("HOLD_QL426_RECEIVER_OFF_OR_ROLLBACK_UNVERIFIED"),
        "receiver": "UNKNOWN_MANUAL_RECOVERY_REQUIRED",
    }
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(journal, ProtectedCheckpointJournal317)
        and isinstance(checkpoint, dict)
        and checkpoint.get("accepted") is True
        and checkpoint.get("state")
        == "QL426_DURABLE_ORIGINAL_HOST_CHECKPOINT_WITNESSED_REVIEW_ONLY"
        and isinstance(ql426_rollback, dict)
        and ql426_rollback.get("state") == "DURABLE_VERIFIED_ROLLBACK_INCIDENT"
        and _identity(ql426_rollback.get("incidentId"))
        and _sha(ql426_rollback.get("rollbackCheckpointDigest"))
        and journal.exact(
            monitor,
            checkpoint.get("episodeId"),
            checkpoint.get("ceremonyId"),
            "CHECKPOINT",
            checkpoint.get("checkpointDigest"),
        )
    ):
        return unknown
    off = _receiver_off(signed_receiver_off, receiver_der, receiver_pin, now)
    if off is None or not (
        off["ceremonyId"] == checkpoint["ceremonyId"]
        and off["episodeId"] == checkpoint["episodeId"]
        and off["incidentId"] == ql426_rollback["incidentId"]
        and ql426_rollback.get("scope", {}).get("ceremonyId") == off["ceremonyId"]
        and ql426_rollback["scope"].get("episodeId") == off["episodeId"]
        and ql426_rollback["scope"].get("sourceRevision") == SOURCE315_MAIN
        and ql426_rollback["scope"].get("controllerRevision") == CONTROLLER380_MAIN
    ):
        return unknown
    off_digest = _digest(off)
    evidence = {
        "episode_id": checkpoint["episodeId"],
        "ceremony_id": checkpoint["ceremonyId"],
        "incident_id": ql426_rollback["incidentId"],
        "comms_rollback_digest": ql426_rollback["rollbackCheckpointDigest"],
        "source_checkpoint_digest": checkpoint["checkpointDigest"],
        "receiver_off_digest": off_digest,
        "source_revision": SOURCE316_MAIN,
        "comms_revision": COMMS426_MAIN,
    }
    if not (
        _callback(attest_reopened_ql426_rollback, **evidence)
        and _callback(attest_independent_receiver_disabled, **evidence)
    ):
        return unknown
    digest = _digest(evidence)
    if not journal.claim(
        monitor,
        checkpoint["episodeId"],
        checkpoint["ceremonyId"],
        "ROLLBACK",
        digest,
        checkpoint["checkpointDigest"],
    ):
        return unknown
    return {
        **_hold("SIGNED_QL426_RECEIVER_OFF_ROLLBACK_DURABLY_CORRELATED"),
        "accepted": True,
        "episodeId": checkpoint["episodeId"],
        "ceremonyId": checkpoint["ceremonyId"],
        "incidentId": ql426_rollback["incidentId"],
        "commsRollbackDigest": ql426_rollback["rollbackCheckpointDigest"],
        "rollbackDigest": digest,
        "receiverOffDigest": off_digest,
        "receiver": "OFF",
    }


def audit_independent_owner_incident317(
    monitor: PersistentReeMonitor304,
    rollback: Any,
    ql426_owner_ack: Any,
    three_master_receipts: Any,
    *,
    journal: ProtectedCheckpointJournal317,
    owner_der: bytes,
    owner_pin: str,
    reviewer_der: bytes,
    reviewer_pin: str,
    master_keys: dict[str, bytes],
    master_pins: dict[str, str],
    attest_ql426_durable_owner_ack: Callable[..., bool] | None,
    attest_three_master_independent_recovery: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Incident audit may close; receiver OFF and operational recovery stay HOLD."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(journal, ProtectedCheckpointJournal317)
        and isinstance(rollback, dict)
        and rollback.get("accepted") is True
        and rollback.get("state")
        == "SIGNED_QL426_RECEIVER_OFF_ROLLBACK_DURABLY_CORRELATED"
        and rollback.get("receiver") == "OFF"
        and isinstance(ql426_owner_ack, dict)
        and ql426_owner_ack.get("state") == "DURABLE_DUAL_SIGNED_OWNER_INCIDENT_ACK"
        and ql426_owner_ack.get("incidentId") == rollback.get("incidentId")
        and _sha(ql426_owner_ack.get("ackCheckpointDigest"))
        and isinstance(three_master_receipts, dict)
        and set(three_master_receipts) == set(MASTERS)
        and _public_ed25519(owner_der, owner_pin)
        and _public_ed25519(reviewer_der, reviewer_pin)
        and owner_pin != reviewer_pin
        and _trusted_roles(master_keys, master_pins, set(MASTERS))
        and not set(master_pins.values()) & {owner_pin, reviewer_pin}
        and journal.exact(
            monitor,
            rollback.get("episodeId"),
            rollback.get("ceremonyId"),
            "ROLLBACK",
            rollback.get("rollbackDigest"),
        )
    ):
        return _hold("HOLD_MISSING_VERIFIED_ROLLBACK_AND_DISTINCT_SIGNERS")
    fields = {
        "schema", "masterId", "episodeId", "ceremonyId", "incidentId",
        "sourceRevision", "commsRevision", "controllerRevision",
        "rollbackDigest", "commsOwnerAckDigest", "decision",
        "issuedAt", "connection",
    }
    receipts = []
    for master in MASTERS:
        body = _signed(
            three_master_receipts[master], fields, MASTER_SCHEMA,
            master_keys[master], master_pins[master], now,
        )
        if body is None or not (
            body["masterId"] == master
            and body["episodeId"] == rollback["episodeId"]
            and body["ceremonyId"] == rollback["ceremonyId"]
            and body["incidentId"] == rollback["incidentId"]
            and body["sourceRevision"] == SOURCE316_MAIN
            and body["commsRevision"] == COMMS426_MAIN
            and body["controllerRevision"] == CONTROLLER380_MAIN
            and body["rollbackDigest"] == rollback["rollbackDigest"]
            and body["commsOwnerAckDigest"] == ql426_owner_ack["ackCheckpointDigest"]
            and body["decision"] == "RECOVERY_HOLD_VERIFIED"
            and body["connection"] == "HOLD"
        ):
            return _hold("HOLD_THREE_MASTER_RECOVERY_SIGNATURE_MISMATCH")
        receipts.append(body)
    # QL-426 native owner ACK is dual-signed over one common payload, not
    # two independent payloads. The protected caller supplies its authentic
    # envelope and QL-426 reopened owner-ACK record through the custody hook.
    signed_ack = ql426_owner_ack.get("signedEnvelope")
    p = signed_ack.get("payload") if isinstance(signed_ack, dict) else None
    ack_fields = {
        "schema", "incidentId", "ceremonyId", "sourceId", "episodeId",
        "sourceRevision", "controllerRevision", "rollbackCheckpointDigest",
        "action", "acceptedAt", "ownerId", "reviewerId",
    }
    if not (
        isinstance(signed_ack, dict)
        and set(signed_ack) == {"payload", "ownerSignature", "reviewerSignature"}
        and isinstance(p, dict)
        and set(p) == ack_fields
        and p["schema"] == ACK_SCHEMA
        and p["incidentId"] == rollback["incidentId"]
        and p["ceremonyId"] == rollback["ceremonyId"]
        and p["sourceId"] == "rosevear-ai-hub"
        and p["episodeId"] == rollback["episodeId"]
        and p["sourceRevision"] == SOURCE315_MAIN
        and p["controllerRevision"] == CONTROLLER380_MAIN
        and p["rollbackCheckpointDigest"] == rollback["commsRollbackDigest"]
        and p["action"] == "ACKNOWLEDGE_VERIFIED_ISOLATED_ROLLBACK"
        and _identity(p["ownerId"])
        and _identity(p["reviewerId"])
        and p["ownerId"] != p["reviewerId"]
        and _timestamp(p["acceptedAt"]) is not None
        and 0 <= now - _timestamp(p["acceptedAt"]) <= 60_000
        and _trusted_signature(p, signed_ack["ownerSignature"], owner_der, owner_pin)
        and _trusted_signature(p, signed_ack["reviewerSignature"], reviewer_der, reviewer_pin)
    ):
        return _hold("HOLD_UNTRUSTED_QL426_DUAL_SIGNED_OWNER_ACK")
    evidence = {
        "episode_id": rollback["episodeId"],
        "ceremony_id": rollback["ceremonyId"],
        "incident_id": rollback["incidentId"],
        "ql426_owner_ack_digest": ql426_owner_ack["ackCheckpointDigest"],
        "comms_rollback_digest": rollback["commsRollbackDigest"],
        "source_rollback_digest": rollback["rollbackDigest"],
        "three_master_digest": _digest(receipts),
        "owner_ack_payload_digest": _digest(p),
    }
    if not (
        _callback(attest_ql426_durable_owner_ack, **evidence)
        and _callback(attest_three_master_independent_recovery, **evidence)
    ):
        return _hold("HOLD_NO_INDEPENDENT_OWNER_OR_THREE_MASTER_CUSTODY")
    digest = _digest(evidence)
    if not journal.claim(
        monitor,
        rollback["episodeId"],
        rollback["ceremonyId"],
        "OWNER_AUDIT",
        digest,
        rollback["rollbackDigest"],
    ):
        return _hold("HOLD_DUPLICATE_OR_UNRECORDED_OWNER_INCIDENT_AUDIT")
    return {
        **_hold("DURABLE_INDEPENDENT_OWNER_INCIDENT_AUDIT_CLOSED_RECOVERY_HOLD"),
        "accepted": True,
        "episodeId": rollback["episodeId"],
        "ceremonyId": rollback["ceremonyId"],
        "incidentId": rollback["incidentId"],
        "auditDigest": digest,
        "receiver": "OFF",
        "ownerAcceptance": "HOLD",
        "connection": "HOLD",
        "masterSync": "HOLD",
        "recovery": "NEW_SUPERVISED_QL424_CEREMONY_REQUIRED",
    }


def reconcile_master_evidence317(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Static owner-only source status, no runtime enrollment or receiver action."""
    return {
        **reconcile_master_evidence316(monitor),
        "schema": "rosevear.ai-hub.master360-ql426-custody-audit317.v1",
        "sourceBuild": 317,
        "source316MainAtReconciliation": SOURCE316_MAIN,
        "commsQl426MainAtReconciliation": COMMS426_MAIN,
        "commsCurrentMainAtReconciliation": COMMS_CURRENT_MAIN,
        "controller380MainAtReconciliation": CONTROLLER380_MAIN,
        "ql426CheckpointCustody": "HOLD_NO_REOPENED_ORIGINAL_HOST_CHECKPOINT",
        "ql426RemoteHeadWitness": "HOLD_NO_EXTERNALLY_WITNESSED_HEAD",
        "ql426SignedReceiverOff": "HOLD_NO_SIGNED_OFF_ROLLBACK_READBACK",
        "ql426DurableIncident": "HOLD_NO_RECONCILED_ROLLBACK_RECORD",
        "independentOwnerIncidentAudit": "HOLD_NO_DUAL_SIGNED_OWNER_THREE_MASTER_REVIEW",
        "runtimeUptime": "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING",
        "originalHostUptime": "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION",
        "ownerAcceptance": "HOLD",
        "receiver": "OFF",
        "connection": "HOLD",
        "masterSync": "HOLD",
    }
