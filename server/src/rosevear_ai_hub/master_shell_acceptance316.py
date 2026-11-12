"""Build 316 protected original-host isolated pilot health and recovery audit.

A code deployment never enables a receiver or proves a live Windows pilot.
Private backend supplies independently authenticated QL-424/425 custody.
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
from rosevear_ai_hub.master_shell_acceptance310 import _corr, _episode, _sha
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS, _callback
from rosevear_ai_hub.master_shell_acceptance313 import _signed
from rosevear_ai_hub.master_shell_acceptance315 import (
    ProtectedAuthorityJournal315,
    _identity,
    _public_ed25519,
    _trusted_roles,
    reconcile_master_evidence315,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE = "rosevear-ai-hub"
HOST = "DESKTOP-AE894KC"
SOURCE315_MAIN = "0ae23d6ce3b09cc14da9187635cb2875269f3739"
COMMS425_MAIN = "d40b3445c766ba9dab5d069fdfe51f20caadb28c"
COMMS_RUNTIME_MAIN = "fb9ef12aebd5594bd56af5e800011b82812f7ffa"
CONTROLLER380_MAIN = "ccd291f22e15750392fa3995dc3d5811c506cd05"
PILOT_SCHEMA = "rosevear.ai-hub.master360-original-isolated-pilot316.v1"
HEARTBEAT_SCHEMA = "rosevear.ql425.master-pilot-heartbeat.v1"
OFF_SCHEMA = "rosevear.ai-hub.master360-ql425-receiver-off316.v1"
OWNER_SCHEMA = "rosevear.ai-hub.master360-owner-fail-closed-recovery316.v1"


def _digest(value: Any) -> str:
    return hashlib.sha256(_serialize(value)).hexdigest()


def _master_heartbeat(
    envelope: Any,
    master: str,
    pilot: dict[str, Any],
    der: bytes,
    pin: str,
    now_ms: int,
) -> tuple[int, str] | None:
    """Native QL-425 JS JSON.stringify bytes, 60-second freshness."""
    fields = {
        "schema",
        "masterId",
        "ceremonyId",
        "sourceId",
        "episodeId",
        "sourceRevision",
        "controllerRevision",
        "status",
        "observedAt",
        "sequence",
    }
    if not (
        isinstance(envelope, dict)
        and set(envelope) == {"payload", "signature"}
        and isinstance(envelope["payload"], dict)
        and set(envelope["payload"]) == fields
        and _public_ed25519(der, pin)
    ):
        return None
    body = envelope["payload"]
    stamped = _timestamp(body.get("observedAt"))
    sequence = body.get("sequence")
    if not (
        body.get("schema") == HEARTBEAT_SCHEMA
        and body.get("masterId") == master
        and body.get("ceremonyId") == pilot["ceremonyId"]
        and body.get("sourceId") == SOURCE
        and body.get("episodeId") == pilot["episodeId"]
        and body.get("sourceRevision") == SOURCE315_MAIN
        and body.get("controllerRevision") == CONTROLLER380_MAIN
        and body.get("status") == "ISOLATED_PILOT_HEALTHY"
        and type(sequence) is int
        and 0 < sequence <= 2**53 - 1
        and stamped is not None
        and 0 <= now_ms - stamped <= 60_000
        and _trusted_signature(body, envelope["signature"], der, pin)
    ):
        return None
    return sequence, _digest(body)


class ProtectedPilotContinuityJournal316:
    """Atomic per-Master monotonic sequence custody and one-use recovery audit."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def accept_snapshot(
        self,
        monitor: PersistentReeMonitor304,
        *,
        ceremony: str,
        episode: str,
        sequences: dict[str, int],
        digest: str,
    ) -> bool:
        if not (
            _on_ree(monitor)
            and _identity(ceremony)
            and _episode(episode)
            and set(sequences) == set(MASTERS)
            and all(type(n) is int and 0 < n <= 2**53 - 1 for n in sequences.values())
            and _sha(digest)
        ):
            return False
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA busy_timeout=2000")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS pilot_episode316 (
                    ceremony TEXT PRIMARY KEY, episode TEXT NOT NULL)"""
                )
                db.execute(
                    """CREATE TABLE IF NOT EXISTS pilot_watermark316 (
                    ceremony TEXT NOT NULL, master TEXT NOT NULL,
                    seq INTEGER NOT NULL, PRIMARY KEY(ceremony,master))"""
                )
                db.execute(
                    """CREATE TABLE IF NOT EXISTS pilot_snapshot316 (
                    ceremony TEXT NOT NULL, episode TEXT NOT NULL,
                    digest TEXT PRIMARY KEY)"""
                )
                prior = db.execute(
                    "SELECT episode FROM pilot_episode316 WHERE ceremony=?",
                    (ceremony,),
                ).fetchone()
                if prior is not None and prior != (episode,):
                    raise ValueError("ceremony changed episode")
                for master in MASTERS:
                    row = db.execute(
                        """SELECT seq FROM pilot_watermark316
                        WHERE ceremony=? AND master=?""",
                        (ceremony, master),
                    ).fetchone()
                    if row and sequences[master] <= row[0]:
                        raise ValueError("replayed Master sequence")
                if db.execute(
                    "SELECT 1 FROM pilot_snapshot316 WHERE digest=?", (digest,)
                ).fetchone():
                    raise ValueError("snapshot replay")
                db.execute(
                    "INSERT OR IGNORE INTO pilot_episode316 VALUES (?,?)",
                    (ceremony, episode),
                )
                for master in MASTERS:
                    db.execute(
                        """INSERT OR REPLACE INTO pilot_watermark316
                        VALUES (?,?,?)""",
                        (ceremony, master, sequences[master]),
                    )
                db.execute(
                    "INSERT INTO pilot_snapshot316 VALUES (?,?,?)",
                    (ceremony, episode, digest),
                )
                return True
        except (OSError, sqlite3.Error, ValueError):
            return False

    def exact(
        self,
        monitor: PersistentReeMonitor304,
        ceremony: str,
        episode: str,
        digest: str,
    ) -> bool:
        if not (
            _on_ree(monitor)
            and _identity(ceremony)
            and _episode(episode)
            and _sha(digest)
            and self.path.is_file()
        ):
            return False
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                row = db.execute(
                    """SELECT episode FROM pilot_snapshot316
                    WHERE ceremony=? AND digest=?""",
                    (ceremony, digest),
                ).fetchone()
                return row == (episode,)
        except (OSError, sqlite3.Error):
            return False

    def claim_recovery(
        self,
        monitor: PersistentReeMonitor304,
        *,
        ceremony: str,
        episode: str,
        snapshot_digest: str,
        recovery_digest: str,
    ) -> bool:
        if not (self.exact(monitor, ceremony, episode, snapshot_digest) and _sha(recovery_digest)):
            return False
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS pilot_recovery316 (
                    ceremony TEXT NOT NULL, episode TEXT NOT NULL,
                    snapshot_digest TEXT NOT NULL, recovery_digest TEXT NOT NULL,
                    PRIMARY KEY(ceremony, episode))"""
                )
                row = db.execute(
                    "INSERT OR IGNORE INTO pilot_recovery316 VALUES (?,?,?,?)",
                    (ceremony, episode, snapshot_digest, recovery_digest),
                )
                return row.rowcount == 1
        except (OSError, sqlite3.Error):
            return False


def attest_isolated_original_pilot316(
    monitor: PersistentReeMonitor304,
    prior_gate315: Any,
    accepted_ql424: Any,
    signed_original: Any,
    *,
    prior_journal: ProtectedAuthorityJournal315,
    source_der: bytes,
    source_pin: str,
    attest_original_installed_process: Callable[..., bool] | None,
    attest_independent_ql424_signed_acceptance: Callable[..., bool] | None,
    attest_receiver_isolated_state: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Trust authenticated QL-424 only when independent protected checks pass."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(prior_journal, ProtectedAuthorityJournal315)
        and isinstance(prior_gate315, dict)
        and isinstance(accepted_ql424, dict)
        and prior_gate315.get("accepted") is True
        and prior_gate315.get("state") == "THREE_MASTER_SUPERVISED_PILOT_READY_NOT_EXECUTED"
        and prior_gate315.get("ownerAcceptance") == "HOLD"
        and prior_gate315.get("connection") == "HOLD"
        and accepted_ql424.get("state") == "VERIFIED_THREE_MASTER_ISOLATED_PILOT_ACCEPTANCE"
        and accepted_ql424.get("connection") == "VERIFIED_CONNECTED_PILOT"
        and accepted_ql424.get("receiver") == "ISOLATED_ONE_TEST_ON"
        and accepted_ql424.get("ownerAcceptance") == "DUAL_SIGNED_FOR_ISOLATED_PILOT"
        and accepted_ql424.get("masterCount") == 3
        and accepted_ql424.get("sourceId") == SOURCE
        and accepted_ql424.get("sourceRevision") == SOURCE315_MAIN
        and accepted_ql424.get("controllerRevision") == CONTROLLER380_MAIN
        and accepted_ql424.get("episodeId") == prior_gate315.get("episodeId")
        and _identity(accepted_ql424.get("ceremonyId"))
        and _episode(accepted_ql424.get("episodeId"))
        and _corr(prior_gate315.get("correlationId"))
        and _sha(prior_gate315.get("readinessDigest"))
        and _public_ed25519(source_der, source_pin)
        and prior_journal.exact(
            monitor,
            prior_gate315["episodeId"],
            prior_gate315["correlationId"],
            "OWNER_GATE",
            prior_gate315["readinessDigest"],
        )
    ):
        return _hold("HOLD_NO_AUTHENTICATED_QL424_AND_315_PILOT_CHAIN")
    fields = {
        "schema",
        "hostId",
        "sourceId",
        "sourceRevision",
        "commsRevision",
        "controllerRevision",
        "episodeId",
        "correlationId",
        "ceremonyId",
        "readinessDigest",
        "ql424AcceptanceSha256",
        "issuedAt",
        "pilotMode",
    }
    body = _signed(signed_original, fields, PILOT_SCHEMA, source_der, source_pin, now)
    if body is None or not (
        body["hostId"] == HOST
        and body["sourceId"] == SOURCE
        and body["sourceRevision"] == SOURCE315_MAIN
        and body["commsRevision"] == COMMS_RUNTIME_MAIN
        and body["controllerRevision"] == CONTROLLER380_MAIN
        and body["episodeId"] == prior_gate315["episodeId"]
        and body["correlationId"] == prior_gate315["correlationId"]
        and body["ceremonyId"] == accepted_ql424["ceremonyId"]
        and body["readinessDigest"] == prior_gate315["readinessDigest"]
        and _sha(body["ql424AcceptanceSha256"])
        and body["pilotMode"] == "ISOLATED_ONE_TEST"
    ):
        return _hold("HOLD_INVALID_SIGNED_ORIGINAL_HOST_PILOT_ATTESTATION")
    evidence = {
        "host_id": HOST,
        "source_revision": SOURCE315_MAIN,
        "comms_contract_revision": COMMS425_MAIN,
        "comms_runtime_revision": COMMS_RUNTIME_MAIN,
        "controller_revision": CONTROLLER380_MAIN,
        "episode_id": prior_gate315["episodeId"],
        "correlation_id": prior_gate315["correlationId"],
        "ceremony_id": accepted_ql424["ceremonyId"],
        "acceptance_digest": body["ql424AcceptanceSha256"],
        "source_attestation_digest": _digest(body),
    }
    if not (
        _callback(attest_original_installed_process, **evidence)
        and _callback(attest_independent_ql424_signed_acceptance, **evidence)
        and _callback(attest_receiver_isolated_state, **evidence)
    ):
        return _hold("HOLD_NO_REAL_ORIGINAL_SOURCE_OR_QL424_RECEIVER_PROOF")
    return {
        **_hold("ISOLATED_ORIGINAL_HOST_PILOT_ATTESTED_SNAPSHOT_PENDING"),
        "accepted": True,
        "episodeId": prior_gate315["episodeId"],
        "correlationId": prior_gate315["correlationId"],
        "ceremonyId": accepted_ql424["ceremonyId"],
        "acceptanceDigest": body["ql424AcceptanceSha256"],
        "sourceAttestationDigest": _digest(body),
        "sourceRevision": SOURCE315_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
    }


def verify_three_master_health316(
    monitor: PersistentReeMonitor304,
    pilot: Any,
    heartbeats: Any,
    *,
    journal: ProtectedPilotContinuityJournal316,
    master_keys: dict[str, bytes],
    master_pins: dict[str, str],
    attest_independent_ql425_health_readback: Callable[..., bool] | None,
    attest_protected_receiver_state: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Native three-Master QL-425 signatures, 60s freshness and durable sequence."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(journal, ProtectedPilotContinuityJournal316)
        and isinstance(pilot, dict)
        and pilot.get("accepted") is True
        and pilot.get("state") == "ISOLATED_ORIGINAL_HOST_PILOT_ATTESTED_SNAPSHOT_PENDING"
        and pilot.get("connection") == "HOLD"
        and _identity(pilot.get("ceremonyId"))
        and _episode(pilot.get("episodeId"))
        and isinstance(heartbeats, dict)
        and set(heartbeats) == set(MASTERS)
        and _trusted_roles(master_keys, master_pins, set(MASTERS))
    ):
        return _hold("HOLD_NO_INDEPENDENT_ISOLATED_PILOT_OR_HEALTH_SIGNERS")
    sequences = {}
    payload_digests = []
    for master in MASTERS:
        checked = _master_heartbeat(
            heartbeats[master],
            master,
            pilot,
            master_keys[master],
            master_pins[master],
            now,
        )
        if checked is None:
            return {
                **_hold("HOLD_QL425_HEALTH_LOST_REQUIRE_PROTECTED_DISABLE"),
                "receiver": "UNKNOWN_MANUAL_RECOVERY_UNTIL_SIGNED_OFF_READBACK",
            }
        sequences[master] = checked[0]
        payload_digests.append(checked[1])
    digest = hashlib.sha256("|".join(payload_digests).encode()).hexdigest()
    evidence = {
        "ceremony_id": pilot["ceremonyId"],
        "episode_id": pilot["episodeId"],
        "source_revision": SOURCE315_MAIN,
        "comms_contract_revision": COMMS425_MAIN,
        "comms_runtime_revision": COMMS_RUNTIME_MAIN,
        "controller_revision": CONTROLLER380_MAIN,
        "pilot_attestation_digest": pilot["sourceAttestationDigest"],
        "heartbeat_digest": digest,
    }
    if not (
        _callback(attest_independent_ql425_health_readback, **evidence)
        and _callback(attest_protected_receiver_state, **evidence)
    ):
        return _hold("HOLD_NO_PROTECTED_RECEIVER_OR_HEALTH_READBACK")
    if not journal.accept_snapshot(
        monitor,
        ceremony=pilot["ceremonyId"],
        episode=pilot["episodeId"],
        sequences=sequences,
        digest=digest,
    ):
        return _hold("HOLD_QL425_HEALTH_SEQUENCE_REPLAY_OR_STORAGE")
    return {
        **_hold("THREE_MASTER_SIGNED_QL425_HEALTH_SNAPSHOT_NOT_UPTIME"),
        "accepted": True,
        "episodeId": pilot["episodeId"],
        "ceremonyId": pilot["ceremonyId"],
        "healthDigest": digest,
        "sequences": sequences,
        "receiver": "OFF_NOT_CLAIMED_FROM_HEALTH",
        "runtimeUptime": "SINGLE_SIGNED_SNAPSHOT_NOT_CONTINUOUS_UPTIME",
    }


def review_fail_closed_recovery316(
    monitor: PersistentReeMonitor304,
    health: Any,
    signed_receiver_off: Any,
    signed_owner_reviews: Any,
    *,
    journal: ProtectedPilotContinuityJournal316,
    receiver_der: bytes,
    receiver_pin: str,
    operator_keys: dict[str, bytes],
    operator_pins: dict[str, str],
    attest_ql425_disable_execution: Callable[..., bool] | None,
    attest_independent_receiver_off_readback: Callable[..., bool] | None,
    attest_owner_incident_authorization: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Review rollback only after actual receiver OFF proof; never restart."""
    unknown = {
        **_hold("HOLD_RECEIVER_OFF_NOT_VERIFIED_MANUAL_RECOVERY"),
        "receiver": "UNKNOWN_MANUAL_RECOVERY_REQUIRED",
    }
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(journal, ProtectedPilotContinuityJournal316)
        and isinstance(health, dict)
        and health.get("accepted") is True
        and health.get("state") == "THREE_MASTER_SIGNED_QL425_HEALTH_SNAPSHOT_NOT_UPTIME"
        and _sha(health.get("healthDigest"))
        and journal.exact(
            monitor,
            health.get("ceremonyId"),
            health.get("episodeId"),
            health.get("healthDigest"),
        )
        and _public_ed25519(receiver_der, receiver_pin)
        and _trusted_roles(operator_keys, operator_pins, {"owner", "reviewer"})
        and receiver_pin not in operator_pins.values()
        and isinstance(signed_owner_reviews, dict)
        and set(signed_owner_reviews) == {"owner", "reviewer"}
    ):
        return unknown
    off_fields = {
        "schema",
        "receiverId",
        "ceremonyId",
        "episodeId",
        "sourceRevision",
        "commsRevision",
        "controllerRevision",
        "healthDigest",
        "receiverState",
        "rollbackState",
        "issuedAt",
    }
    off = _signed(signed_receiver_off, off_fields, OFF_SCHEMA, receiver_der, receiver_pin, now)
    if off is None or not (
        off["receiverId"] == "rosevear-comms-hub"
        and off["ceremonyId"] == health["ceremonyId"]
        and off["episodeId"] == health["episodeId"]
        and off["sourceRevision"] == SOURCE315_MAIN
        and off["commsRevision"] == COMMS_RUNTIME_MAIN
        and off["controllerRevision"] == CONTROLLER380_MAIN
        and off["healthDigest"] == health["healthDigest"]
        and off["receiverState"] == "OFF"
        and off["rollbackState"] == "QL425_FAIL_CLOSED_DISABLED"
    ):
        return unknown
    off_digest = _digest(off)
    owner_fields = {
        "schema",
        "role",
        "operatorId",
        "ceremonyId",
        "episodeId",
        "sourceRevision",
        "commsRevision",
        "controllerRevision",
        "healthDigest",
        "receiverOffSha256",
        "decision",
        "issuedAt",
        "connection",
        "ownerAcceptance",
    }
    records = []
    for role in ("owner", "reviewer"):
        body = _signed(
            signed_owner_reviews[role],
            owner_fields,
            OWNER_SCHEMA,
            operator_keys[role],
            operator_pins[role],
            now,
        )
        if body is None or not (
            body["role"] == role
            and _identity(body["operatorId"])
            and body["ceremonyId"] == health["ceremonyId"]
            and body["episodeId"] == health["episodeId"]
            and body["sourceRevision"] == SOURCE315_MAIN
            and body["commsRevision"] == COMMS_RUNTIME_MAIN
            and body["controllerRevision"] == CONTROLLER380_MAIN
            and body["healthDigest"] == health["healthDigest"]
            and body["receiverOffSha256"] == off_digest
            and body["decision"] == "MAINTAIN_HOLD_MANUAL_RECOVERY"
            and body["connection"] == "HOLD"
            and body["ownerAcceptance"] == "HOLD"
        ):
            return unknown
        records.append(body)
    if records[0]["operatorId"] == records[1]["operatorId"] or any(
        records[0][key] != records[1][key]
        for key in owner_fields - {"role", "operatorId", "issuedAt"}
    ):
        return unknown
    digest = _digest([off, records])
    evidence = {
        "ceremony_id": health["ceremonyId"],
        "episode_id": health["episodeId"],
        "health_digest": health["healthDigest"],
        "receiver_off_digest": off_digest,
        "owner_review_digest": digest,
    }
    if not (
        _callback(attest_ql425_disable_execution, **evidence)
        and _callback(attest_independent_receiver_off_readback, **evidence)
        and _callback(attest_owner_incident_authorization, **evidence)
    ):
        return unknown
    if not journal.claim_recovery(
        monitor,
        ceremony=health["ceremonyId"],
        episode=health["episodeId"],
        snapshot_digest=health["healthDigest"],
        recovery_digest=digest,
    ):
        return unknown
    return {
        **_hold("QL425_SIGNED_ROLLBACK_OWNER_HOLD_RECORDED"),
        "accepted": True,
        "ceremonyId": health["ceremonyId"],
        "episodeId": health["episodeId"],
        "recoveryDigest": digest,
        "receiver": "OFF",
        "ownerAcceptance": "HOLD",
        "connection": "HOLD",
        "masterSync": "HOLD",
        "recovery": "MANUAL_SUPERVISED_NEW_CEREMONY_REQUIRED",
    }


def reconcile_master_evidence316(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Read-only source-code status. Never infer runtime from a CI run."""
    return {
        **reconcile_master_evidence315(monitor),
        "schema": "rosevear.ai-hub.master360-ql425-health-recovery316.v1",
        "sourceBuild": 316,
        "source315MainAtReconciliation": SOURCE315_MAIN,
        "commsQl425MainAtReconciliation": COMMS425_MAIN,
        "commsRuntimeMainAtReconciliation": COMMS_RUNTIME_MAIN,
        "controller380MainAtReconciliation": CONTROLLER380_MAIN,
        "originalHostIsolatedPilot": "HOLD_NO_SIGNED_ORIGINAL_REE_QL424_CEREMONY",
        "ql425ThreeMasterHealth": "HOLD_NO_FRESH_THREE_MASTER_HEARTBEATS",
        "ql425DurableReplay": "HOLD_NO_PROTECTED_HEALTH_SEQUENCE_CUSTODY",
        "ql425ReceiverRollback": "HOLD_NO_INDEPENDENT_SIGNED_OFF_READBACK",
        "ownerRecoveryDecision": "HOLD_NO_DISTINCT_OWNER_REVIEWER_AUTHORIZATION",
        "pilotUptime": "UNKNOWN_NO_CONTINUOUS_SIGNED_MONITORING",
        "originalHostUptime": "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION",
        "ownerAcceptance": "HOLD",
        "receiver": "OFF",
        "connection": "HOLD",
        "masterSync": "HOLD",
    }
