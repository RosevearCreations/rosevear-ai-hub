"""Build 315 private signer enrollment and QL-424 supervised-pilot readiness.

Only original-host metadata may be checked. No receiver execution, Windows
task, signing-key generation, or automatic owner/Master activation.
"""

import hashlib
import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives.serialization import load_der_public_key
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from rosevear_ai_hub.master_shell_acceptance305 import _serialize
from rosevear_ai_hub.master_shell_acceptance308 import _hold, _on_ree
from rosevear_ai_hub.master_shell_acceptance310 import _corr, _episode, _sha
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS, _callback
from rosevear_ai_hub.master_shell_acceptance313 import _signed
from rosevear_ai_hub.master_shell_acceptance314 import (
    ProtectedFieldJournal314,
    reconcile_master_evidence314,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

HOST = "DESKTOP-AE894KC"
SOURCE = "rosevear-ai-hub"
SOURCE314_MAIN = "124c78f0c15b054881c9b7f45c6d9b2f6d8eb88c"
COMMS424_MAIN = "d40b3445c766ba9dab5d069fdfe51f20caadb28c"
CONTROLLER380_MAIN = "ccd291f22e15750392fa3995dc3d5811c506cd05"
ENROLL_SCHEMA = "rosevear.ai-hub.master360-source-receiver-enrollment315.v1"
SOURCE_SCHEMA = "rosevear.ai-hub.master360-original-source-witness315.v1"
RECEIVER_SCHEMA = "rosevear.ai-hub.master360-receiver-disabled-witness315.v1"
MASTER_SCHEMA = "rosevear.ai-hub.master360-three-master-readiness315.v1"
OWNER_SCHEMA = "rosevear.ai-hub.master360-operator-owner-gate315.v1"
STAGES = ("ENROLL", "RECEIVER_WITNESS", "OWNER_GATE")
ZERO = "0" * 64


def _identity(value: Any) -> bool:
    return (
        isinstance(value, str)
        and 12 <= len(value) <= 96
        and value.isascii()
        and all(c.isalnum() or c in "_-" for c in value)
    )


def _public_ed25519(der: Any, pin: Any) -> bool:
    if not (
        isinstance(der, bytes)
        and 32 <= len(der) <= 512
        and isinstance(pin, str)
        and len(pin) == 64
    ):
        return False
    try:
        key = load_der_public_key(der)
        return isinstance(key, Ed25519PublicKey) and hashlib.sha256(der).hexdigest() == pin
    except (ValueError, TypeError):
        return False


def _trusted_roles(keys: Any, pins: Any, roles: set[str]) -> bool:
    return (
        isinstance(keys, dict)
        and isinstance(pins, dict)
        and set(keys) == roles
        and set(pins) == roles
        and len({keys[k] for k in roles}) == len(roles)
        and len({pins[k] for k in roles}) == len(roles)
        and all(_public_ed25519(keys[k], pins[k]) for k in roles)
    )


class ProtectedAuthorityJournal315:
    """Original-host SQLite: ordered one-use hashes only, no signed envelopes."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def exact(
        self,
        monitor: PersistentReeMonitor304,
        episode: str,
        correlation: str,
        stage: str,
        digest: str,
    ) -> bool:
        if not (
            _on_ree(monitor)
            and _episode(episode)
            and _corr(correlation)
            and stage in STAGES
            and _sha(digest)
            and self.path.is_file()
        ):
            return False
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                result = db.execute(
                    """SELECT digest FROM authority_journal315
                    WHERE episode=? AND correlation=? AND stage=?""",
                    (episode, correlation, stage),
                ).fetchone()
                return result == (digest,)
        except (OSError, sqlite3.Error):
            return False

    def claim(
        self,
        monitor: PersistentReeMonitor304,
        episode: str,
        correlation: str,
        stage: str,
        digest: str,
        predecessor: str,
    ) -> bool:
        if not (
            _on_ree(monitor)
            and _episode(episode)
            and _corr(correlation)
            and stage in STAGES
            and _sha(digest)
            and _sha(predecessor)
        ):
            return False
        index = STAGES.index(stage)
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA busy_timeout=2000")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS authority_journal315 (
                    episode TEXT NOT NULL, correlation TEXT NOT NULL,
                    stage TEXT NOT NULL, digest TEXT NOT NULL,
                    predecessor TEXT NOT NULL, PRIMARY KEY(episode,stage),
                    UNIQUE(correlation,stage))"""
                )
                if index == 0:
                    if predecessor != ZERO:
                        return False
                else:
                    prior = db.execute(
                        """SELECT digest FROM authority_journal315
                        WHERE episode=? AND correlation=? AND stage=?""",
                        (episode, correlation, STAGES[index - 1]),
                    ).fetchone()
                    if prior != (predecessor,):
                        return False
                result = db.execute(
                    """INSERT OR IGNORE INTO authority_journal315
                    VALUES (?,?,?,?,?)""",
                    (episode, correlation, stage, digest, predecessor),
                )
                return result.rowcount == 1
        except (OSError, sqlite3.Error):
            return False


def enroll_original_host_authority315(
    monitor: PersistentReeMonitor304,
    previous_owner: Any,
    previous_restoration: Any,
    certificates: Any,
    *,
    old_journal: ProtectedFieldJournal314,
    journal: ProtectedAuthorityJournal315,
    source_der: bytes,
    receiver_der: bytes,
    owner_keys: dict[str, bytes],
    owner_pins: dict[str, str],
    attest_source_host_key_custody: Callable[..., bool] | None,
    attest_receiver_public_pin_custody: Callable[..., bool] | None,
    attest_distinct_owner_authorization: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Dual-signed authorization can admit public pins, not execute QL-424."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(old_journal, ProtectedFieldJournal314)
        and isinstance(journal, ProtectedAuthorityJournal315)
        and isinstance(previous_owner, dict)
        and isinstance(previous_restoration, dict)
        and previous_owner.get("accepted") is True
        and previous_restoration.get("accepted") is True
        and previous_owner.get("state")
        == "READY_FOR_SEPARATE_SUPERVISED_ACTIVATION_NOT_EXECUTED"
        and previous_restoration.get("state")
        == "THREE_MASTER_QL423_RESTORATION_WITNESSED_REVIEW_ONLY"
        and previous_owner.get("connection") == "HOLD"
        and previous_owner.get("ownerAcceptance") == "HOLD"
        and previous_restoration.get("connection") == "HOLD"
        and isinstance(certificates, dict)
        and set(certificates) == {"owner", "reviewer"}
        and _trusted_roles(owner_keys, owner_pins, {"owner", "reviewer"})
    ):
        return _hold("HOLD_ORIGINAL_HOST_314_OWNER_CHAIN_OR_KEYS")
    episode = previous_owner.get("episodeId")
    corr = previous_owner.get("correlationId")
    prior_digest = previous_owner.get("ownerDecisionSha256")
    if not (
        _episode(episode)
        and _corr(corr)
        and _sha(prior_digest)
        and previous_restoration.get("episodeId") == episode
        and previous_restoration.get("correlationId") == corr
        and _sha(previous_restoration.get("fieldDigest"))
        and _sha(previous_restoration.get("restorationDigest"))
        and old_journal.exact(monitor, episode, corr, "REVIEW", prior_digest)
    ):
        return _hold("HOLD_MISSING_EXACT_314_OWNER_LEDGER")
    source_pin = hashlib.sha256(source_der).hexdigest() if isinstance(source_der, bytes) else ""
    receiver_pin = (
        hashlib.sha256(receiver_der).hexdigest() if isinstance(receiver_der, bytes) else ""
    )
    if not (
        _public_ed25519(source_der, source_pin)
        and _public_ed25519(receiver_der, receiver_pin)
        and source_pin != receiver_pin
        and source_pin not in owner_pins.values()
        and receiver_pin not in owner_pins.values()
    ):
        return _hold("HOLD_INVALID_OR_SHARED_PUBLIC_SIGNER_AUTHORITY")
    fields = {
        "schema", "role", "operatorId", "hostId", "sourceId",
        "sourceRevision", "commsRevision", "controllerRevision",
        "episodeId", "correlationId", "sourcePublicSha256",
        "receiverPublicSha256", "priorOwnerDecisionSha256",
        "fieldDigest", "restorationDigest", "enrollmentId",
        "intent", "issuedAt", "connection",
    }
    records = []
    for role in ("owner", "reviewer"):
        body = _signed(
            certificates[role], fields, ENROLL_SCHEMA,
            owner_keys[role], owner_pins[role], now,
        )
        if body is None or not (
            body["role"] == role
            and _identity(body["operatorId"])
            and body["hostId"] == HOST
            and body["sourceId"] == SOURCE
            and body["sourceRevision"] == SOURCE314_MAIN
            and body["commsRevision"] == COMMS424_MAIN
            and body["controllerRevision"] == CONTROLLER380_MAIN
            and body["episodeId"] == episode
            and body["correlationId"] == corr
            and body["sourcePublicSha256"] == source_pin
            and body["receiverPublicSha256"] == receiver_pin
            and body["priorOwnerDecisionSha256"] == prior_digest
            and body["fieldDigest"] == previous_restoration["fieldDigest"]
            and body["restorationDigest"] == previous_restoration["restorationDigest"]
            and _identity(body["enrollmentId"])
            and body["intent"] == "REQUEST_ISOLATED_PILOT_READINESS"
            and body["connection"] == "HOLD"
        ):
            return _hold("HOLD_INVALID_DUAL_SIGNED_ORIGINAL_HOST_ENROLLMENT")
        records.append(body)
    if records[0]["operatorId"] == records[1]["operatorId"] or any(
        records[0][k] != records[1][k]
        for k in fields - {"role", "operatorId", "issuedAt"}
    ):
        return _hold("HOLD_OWNER_REVIEWER_ENROLLMENT_DISAGREEMENT")
    digest = hashlib.sha256(_serialize(records)).hexdigest()
    evidence = {
        "host_id": HOST,
        "source_revision": SOURCE314_MAIN,
        "comms_revision": COMMS424_MAIN,
        "controller_revision": CONTROLLER380_MAIN,
        "episode_id": episode,
        "correlation_id": corr,
        "enrollment_id": records[0]["enrollmentId"],
        "source_pin": source_pin,
        "receiver_pin": receiver_pin,
        "receipt_digest": digest,
    }
    if not (
        _callback(attest_source_host_key_custody, **evidence)
        and _callback(attest_receiver_public_pin_custody, **evidence)
        and _callback(attest_distinct_owner_authorization, **evidence)
    ):
        return _hold("HOLD_NO_INDEPENDENT_SOURCE_RECEIVER_OWNER_CUSTODY")
    if not journal.claim(monitor, episode, corr, "ENROLL", digest, ZERO):
        return _hold("HOLD_DUPLICATE_OR_UNAVAILABLE_AUTHORITY_JOURNAL")
    return {
        **_hold("SOURCE_RECEIVER_PINS_WITNESSED_NOT_ACTIVATED"),
        "accepted": True,
        "episodeId": episode,
        "correlationId": corr,
        "enrollmentId": records[0]["enrollmentId"],
        "enrollmentDigest": digest,
        "sourcePublicSha256": source_pin,
        "receiverPublicSha256": receiver_pin,
        "fieldDigest": previous_restoration["fieldDigest"],
        "restorationDigest": previous_restoration["restorationDigest"],
    }


def verify_isolated_receiver_readiness315(
    monitor: PersistentReeMonitor304,
    enrollment: Any,
    signed_source: Any,
    signed_receiver: Any,
    *,
    journal: ProtectedAuthorityJournal315,
    source_der: bytes,
    receiver_der: bytes,
    attest_ql424_preflight: Callable[..., bool] | None,
    attest_receiver_disabled_readback: Callable[..., bool] | None,
    attest_original_source_process: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Verify separately signed OFF/readiness proof without receiver enablement."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(journal, ProtectedAuthorityJournal315)
        and isinstance(enrollment, dict)
        and enrollment.get("accepted") is True
        and enrollment.get("state") == "SOURCE_RECEIVER_PINS_WITNESSED_NOT_ACTIVATED"
        and enrollment.get("connection") == "HOLD"
        and _public_ed25519(source_der, enrollment.get("sourcePublicSha256"))
        and _public_ed25519(receiver_der, enrollment.get("receiverPublicSha256"))
        and enrollment.get("sourcePublicSha256") != enrollment.get("receiverPublicSha256")
        and journal.exact(
            monitor, enrollment.get("episodeId"), enrollment.get("correlationId"),
            "ENROLL", enrollment.get("enrollmentDigest"),
        )
    ):
        return _hold("HOLD_NO_EXACT_SOURCE_RECEIVER_AUTHORITY_ENROLLMENT")
    source_fields = {
        "schema", "hostId", "sourceId", "sourceRevision",
        "commsRevision", "controllerRevision", "episodeId",
        "correlationId", "enrollmentDigest", "enrollmentId",
        "receiverIntent", "issuedAt", "connection",
    }
    original = _signed(
        signed_source, source_fields, SOURCE_SCHEMA,
        source_der, enrollment["sourcePublicSha256"], now,
    )
    if original is None or not (
        original["hostId"] == HOST
        and original["sourceId"] == SOURCE
        and original["sourceRevision"] == SOURCE314_MAIN
        and original["commsRevision"] == COMMS424_MAIN
        and original["controllerRevision"] == CONTROLLER380_MAIN
        and original["episodeId"] == enrollment["episodeId"]
        and original["correlationId"] == enrollment["correlationId"]
        and original["enrollmentId"] == enrollment["enrollmentId"]
        and original["enrollmentDigest"] == enrollment["enrollmentDigest"]
        and original["receiverIntent"] == "ISOLATED_ONE_TEST_READY_NOT_EXECUTED"
        and original["connection"] == "HOLD"
    ):
        return _hold("HOLD_INVALID_ORIGINAL_HOST_SIGNED_PRE_FLIGHT")
    original_digest = hashlib.sha256(_serialize(original)).hexdigest()
    receiver_fields = {
        "schema", "receiverId", "hostId", "sourceRevision",
        "commsRevision", "controllerRevision", "episodeId",
        "correlationId", "enrollmentDigest", "enrollmentId",
        "sourceTelemetrySha256", "receiverState", "ceremonyState",
        "issuedAt", "connection",
    }
    received = _signed(
        signed_receiver, receiver_fields, RECEIVER_SCHEMA,
        receiver_der, enrollment["receiverPublicSha256"], now,
    )
    if received is None or not (
        received["receiverId"] == "rosevear-comms-hub"
        and received["hostId"] == HOST
        and received["sourceRevision"] == SOURCE314_MAIN
        and received["commsRevision"] == COMMS424_MAIN
        and received["controllerRevision"] == CONTROLLER380_MAIN
        and received["episodeId"] == enrollment["episodeId"]
        and received["correlationId"] == enrollment["correlationId"]
        and received["enrollmentDigest"] == enrollment["enrollmentDigest"]
        and received["enrollmentId"] == enrollment["enrollmentId"]
        and received["sourceTelemetrySha256"] == original_digest
        and received["receiverState"] == "OFF"
        and received["ceremonyState"] == "NOT_EXECUTED"
        and received["connection"] == "HOLD"
    ):
        return _hold("HOLD_UNVERIFIED_RECEIVER_OFF_STATE_OR_ACK_SIGNATURE")
    digest = hashlib.sha256(_serialize([original, received])).hexdigest()
    evidence = {
        "host_id": HOST,
        "source_revision": SOURCE314_MAIN,
        "comms_revision": COMMS424_MAIN,
        "controller_revision": CONTROLLER380_MAIN,
        "episode_id": enrollment["episodeId"],
        "correlation_id": enrollment["correlationId"],
        "enrollment_digest": enrollment["enrollmentDigest"],
        "source_digest": original_digest,
        "receiver_digest": hashlib.sha256(_serialize(received)).hexdigest(),
        "witness_digest": digest,
    }
    if not (
        _callback(attest_ql424_preflight, **evidence)
        and _callback(attest_receiver_disabled_readback, **evidence)
        and _callback(attest_original_source_process, **evidence)
    ):
        return _hold("HOLD_NO_REAL_RECEIVER_OFF_OR_HOST_PRE_FLIGHT")
    if not journal.claim(
        monitor, enrollment["episodeId"], enrollment["correlationId"],
        "RECEIVER_WITNESS", digest, enrollment["enrollmentDigest"],
    ):
        return _hold("HOLD_RECEIVER_WITNESS_REPLAY_OR_STORAGE")
    return {
        **_hold("SIGNED_SOURCE_RECEIVER_OFF_WITNESS_READY_ONLY"),
        "accepted": True,
        "episodeId": enrollment["episodeId"],
        "correlationId": enrollment["correlationId"],
        "enrollmentDigest": enrollment["enrollmentDigest"],
        "witnessDigest": digest,
        "receiverState": "OFF",
        "ceremonyState": "NOT_EXECUTED",
    }


def review_three_master_operational_gate315(
    monitor: PersistentReeMonitor304,
    witness: Any,
    signed_masters: Any,
    signed_decisions: Any,
    *,
    journal: ProtectedAuthorityJournal315,
    master_keys: dict[str, bytes],
    master_pins: dict[str, str],
    operator_keys: dict[str, bytes],
    operator_pins: dict[str, str],
    attest_independent_master_registry: Callable[..., bool] | None,
    attest_ql424_owner_session: Callable[..., bool] | None,
    attest_controller_connection_still_hold: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Three independently signed Master READINESS plus separate owner review."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(journal, ProtectedAuthorityJournal315)
        and isinstance(witness, dict)
        and witness.get("accepted") is True
        and witness.get("state") == "SIGNED_SOURCE_RECEIVER_OFF_WITNESS_READY_ONLY"
        and witness.get("connection") == "HOLD"
        and witness.get("receiverState") == "OFF"
        and witness.get("ceremonyState") == "NOT_EXECUTED"
        and isinstance(signed_masters, dict)
        and set(signed_masters) == set(MASTERS)
        and isinstance(signed_decisions, dict)
        and set(signed_decisions) == {"owner", "reviewer"}
        and _trusted_roles(master_keys, master_pins, set(MASTERS))
        and _trusted_roles(operator_keys, operator_pins, {"owner", "reviewer"})
        and not set(master_pins.values()) & set(operator_pins.values())
        and journal.exact(
            monitor, witness.get("episodeId"), witness.get("correlationId"),
            "RECEIVER_WITNESS", witness.get("witnessDigest"),
        )
    ):
        return _hold("HOLD_THREE_MASTER_Ql424_PILOT_PRE_FLIGHT")
    fields = {
        "schema", "master", "sourceRevision", "commsRevision",
        "controllerRevision", "episodeId", "correlationId",
        "enrollmentDigest", "witnessDigest", "ceremonyState",
        "decision", "issuedAt", "connection",
    }
    receipts = []
    for master in MASTERS:
        body = _signed(
            signed_masters[master], fields, MASTER_SCHEMA,
            master_keys[master], master_pins[master], now,
        )
        if body is None or not (
            body["master"] == master
            and body["sourceRevision"] == SOURCE314_MAIN
            and body["commsRevision"] == COMMS424_MAIN
            and body["controllerRevision"] == CONTROLLER380_MAIN
            and body["episodeId"] == witness["episodeId"]
            and body["correlationId"] == witness["correlationId"]
            and body["enrollmentDigest"] == witness["enrollmentDigest"]
            and body["witnessDigest"] == witness["witnessDigest"]
            and body["ceremonyState"] == "NOT_EXECUTED"
            and body["decision"] == "READY_FOR_SUPERVISED_PILOT_REVIEW"
            and body["connection"] == "HOLD"
        ):
            return _hold("HOLD_INDEPENDENT_MASTER_READINESS_SIGNATURE")
        receipts.append(body)
    master_digest = hashlib.sha256(_serialize(receipts)).hexdigest()
    owner_fields = {
        "schema", "role", "operatorId", "sourceRevision",
        "commsRevision", "controllerRevision", "episodeId",
        "correlationId", "witnessDigest", "threeMasterSha256",
        "decision", "issuedAt", "ownerAcceptance", "connection",
    }
    decisions = []
    for role in ("owner", "reviewer"):
        body = _signed(
            signed_decisions[role], owner_fields, OWNER_SCHEMA,
            operator_keys[role], operator_pins[role], now,
        )
        if body is None or not (
            body["role"] == role
            and _identity(body["operatorId"])
            and body["sourceRevision"] == SOURCE314_MAIN
            and body["commsRevision"] == COMMS424_MAIN
            and body["controllerRevision"] == CONTROLLER380_MAIN
            and body["episodeId"] == witness["episodeId"]
            and body["correlationId"] == witness["correlationId"]
            and body["witnessDigest"] == witness["witnessDigest"]
            and body["threeMasterSha256"] == master_digest
            and body["decision"] == "AUTHORIZE_SUPERVISED_REVIEW_ONLY"
            and body["ownerAcceptance"] == "HOLD"
            and body["connection"] == "HOLD"
        ):
            return _hold("HOLD_OWNER_SUPERVISOR_OR_REVIEWER_DISAGREEMENT")
        decisions.append(body)
    if decisions[0]["operatorId"] == decisions[1]["operatorId"] or any(
        decisions[0][k] != decisions[1][k]
        for k in owner_fields - {"role", "operatorId", "issuedAt"}
    ):
        return _hold("HOLD_OWNER_REVIEWER_SEPARATION_FAILED")
    digest = hashlib.sha256(_serialize([receipts, decisions])).hexdigest()
    evidence = {
        "source_revision": SOURCE314_MAIN,
        "comms_revision": COMMS424_MAIN,
        "controller_revision": CONTROLLER380_MAIN,
        "episode_id": witness["episodeId"],
        "correlation_id": witness["correlationId"],
        "witness_digest": witness["witnessDigest"],
        "three_master_digest": master_digest,
        "decision_digest": digest,
    }
    if not (
        _callback(attest_independent_master_registry, **evidence)
        and _callback(attest_ql424_owner_session, **evidence)
        and _callback(attest_controller_connection_still_hold, **evidence)
    ):
        return _hold("HOLD_NO_INDEPENDENT_MASTER_OR_OWNER_GATE_CUSTODY")
    if not journal.claim(
        monitor, witness["episodeId"], witness["correlationId"],
        "OWNER_GATE", digest, witness["witnessDigest"],
    ):
        return _hold("HOLD_REPLAYED_THREE_MASTER_OPERATOR_DECISION")
    return {
        **_hold("THREE_MASTER_SUPERVISED_PILOT_READY_NOT_EXECUTED"),
        "accepted": True,
        "episodeId": witness["episodeId"],
        "correlationId": witness["correlationId"],
        "readinessDigest": digest,
        "ownerAcceptance": "HOLD",
        "receiver": "OFF",
        "connection": "HOLD",
        "masterSync": "HOLD",
    }


def reconcile_master_evidence315(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """No browser receipt intake; read-only code-level source HOLD snapshot."""
    return {
        **reconcile_master_evidence314(monitor),
        "schema": "rosevear.ai-hub.master360-ql424-ceremony-readiness315.v1",
        "sourceBuild": 315,
        "source314MainAtReconciliation": SOURCE314_MAIN,
        "commsQl424MainAtReconciliation": COMMS424_MAIN,
        "controller380MainAtReconciliation": CONTROLLER380_MAIN,
        "sourceSignerEnrollment": "HOLD_NO_REE_ORIGINAL_SOURCE_PUBLIC_PIN_ADMITTED",
        "receiverWitnessEnrollment": "HOLD_NO_INDEPENDENT_RECEIVER_PIN_AND_OFF_READBACK",
        "ql424CeremonyReadiness": "HOLD_NO_PROTECTED_ONE_TEST_SUPERVISION",
        "threeMasterOwnerGate": "HOLD_NO_THREE_MASTER_SIGNED_OWNER_REVIEW",
        "privateAuthorityJournal": "NO_LIVE_ORIGINAL_HOST_AUTHORITY_ENROLLMENT",
        "originalHostUptime": "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION",
        "ownerAcceptance": "HOLD",
        "receiver": "OFF",
        "connection": "HOLD",
        "masterSync": "HOLD",
    }
