"""Build 322 — protected QL-431 signed post-reentry continuity and fail-closed custody.

Only an independently supervised original-host private backend may inject real
signer public pins, a read-only receiver attestation, and a protected shutdown
adapter. No scheduler, browser activation, private keys or live CONNECTED claim.
"""

import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import _timestamp, _utc
from rosevear_ai_hub.master_shell_acceptance308 import _hold, _on_ree
from rosevear_ai_hub.master_shell_acceptance310 import _sha
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS, _callback
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance316 import CONTROLLER380_MAIN
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _id, _native, _recent
from rosevear_ai_hub.master_shell_acceptance321 import (
    ProtectedPilotJournal321,
    _call,
    _dual,
    reconcile_master_evidence321,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE321_MAIN = "dbc3fd8ae7f8df3bfc85a402a00b0954648ec543"
COMMS431_CONTRACT = "f28f14f67d3ecd5fad9972d6f0500c14de0f89b7"
HEALTH_MASTER = "rosevear.ql431.master-post-reentry-health.v1"
RECEIVER_STATE = "rosevear.ql431.independent-receiver-health.v1"
SHUTDOWN = "rosevear.ql431.signed-fail-closed-shutdown.v1"
INCIDENT_MASTER = "rosevear.ql431.master-incident-custody.v1"
INCIDENT_OWNER = "rosevear.ql431.owner-incident-reconciliation.v1"
INCIDENT_ACTION = "ACKNOWLEDGE_FAIL_CLOSED_INCIDENT_KEEP_RECEIVER_OFF"
STAGES = ("HEALTH", "PENDING", "OFF", "RECONCILED")


def _scope(pilot: Any) -> dict[str, Any] | None:
    if not (
        isinstance(pilot, dict)
        and pilot.get("accepted") is True
        and pilot.get("state") == "DURABLE_VERIFIED_THREE_MASTER_REENTRY_ISOLATED_PILOT"
        and pilot.get("connection") == "VERIFIED_CONNECTED_PILOT"
        and pilot.get("receiver") == "ISOLATED_ONE_TEST_ON"
        and pilot.get("ownerAcceptance") == "DUAL_SIGNED_FOR_ISOLATED_PILOT"
        and pilot.get("slaveGate") == "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
        and pilot.get("masterCount") == 3
        and _sha(pilot.get("acceptedDigest"))
        and _sha(pilot.get("ql429WitnessDigest"))
        and _sha(pilot.get("independentReceiverDigest"))
        and _id(pilot.get("ceremonyId"))
        and _id(pilot.get("episodeId"))
        and pilot.get("sourceId") == "rosevear-ai-hub"
        and isinstance(pilot.get("sourceRevision"), str)
        and len(pilot["sourceRevision"]) == 40
        and isinstance(pilot.get("controllerRevision"), str)
        and len(pilot["controllerRevision"]) == 40
    ):
        return None
    return {
        k: pilot[k]
        for k in ("ceremonyId", "sourceId", "episodeId", "sourceRevision", "controllerRevision")
    }


def _sequences(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and set(value) == set(MASTERS)
        and all(type(value[m]) is int and 0 <= value[m] <= 9_007_199_254_740_991 for m in MASTERS)
    )


def _entry(entry: Any) -> bool:
    if not (
        isinstance(entry, dict)
        and set(entry)
        == {
            "kind",
            "scope",
            "observationId",
            "observedAt",
            "ql430AcceptedDigest",
            "evidenceDigest",
            "sequences",
            "incidentId",
            "shutdownAckDigest",
            "receiverOffDigest",
            "reportsDigest",
            "ownerDecisionDigest",
        }
        and entry["kind"] in STAGES
        and isinstance(entry["scope"], dict)
        and set(entry["scope"])
        == {"ceremonyId", "sourceId", "episodeId", "sourceRevision", "controllerRevision"}
        and entry["scope"]["sourceId"] == "rosevear-ai-hub"
        and _id(entry["scope"]["ceremonyId"])
        and _id(entry["scope"]["episodeId"])
        and _id(entry["observationId"])
        and _timestamp(entry["observedAt"]) is not None
        and _sha(entry["ql430AcceptedDigest"])
        and _sha(entry["evidenceDigest"])
        and _sequences(entry["sequences"])
    ):
        return False
    if entry["kind"] == "HEALTH":
        return all(entry["sequences"][m] > 0 for m in MASTERS) and all(
            entry[k] is None
            for k in (
                "incidentId",
                "shutdownAckDigest",
                "receiverOffDigest",
                "reportsDigest",
                "ownerDecisionDigest",
            )
        )
    if not _id(entry["incidentId"]):
        return False
    if entry["kind"] == "PENDING":
        return all(
            entry[k] is None
            for k in (
                "shutdownAckDigest",
                "receiverOffDigest",
                "reportsDigest",
                "ownerDecisionDigest",
            )
        )
    if not (_sha(entry["shutdownAckDigest"]) and _sha(entry["receiverOffDigest"])):
        return False
    return (
        entry["reportsDigest"] is None and entry["ownerDecisionDigest"] is None
        if entry["kind"] == "OFF"
        else _sha(entry["reportsDigest"]) and _sha(entry["ownerDecisionDigest"])
    )


def _transition(prior: Any, next_entry: dict[str, Any]) -> bool:
    if prior is None:
        return next_entry["kind"] in ("HEALTH", "PENDING")
    p, n = prior["entry"], next_entry
    if not (
        p["scope"] == n["scope"]
        and p["ql430AcceptedDigest"] == n["ql430AcceptedDigest"]
        and _timestamp(n["observedAt"]) >= _timestamp(p["observedAt"])
    ):
        return False
    if p["kind"] == "HEALTH":
        if n["kind"] == "HEALTH":
            return n["observationId"] != p["observationId"] and all(
                n["sequences"][m] > p["sequences"][m] for m in MASTERS
            )
        return (
            n["kind"] == "PENDING"
            and n["observationId"] != p["observationId"]
            and n["sequences"] == p["sequences"]
        )
    if p["kind"] == "PENDING":
        return (
            n["kind"] == "OFF"
            and n["observationId"] == p["observationId"]
            and n["incidentId"] == p["incidentId"]
            and n["sequences"] == p["sequences"]
        )
    if p["kind"] == "OFF":
        return (
            n["kind"] == "RECONCILED"
            and n["observationId"] == p["observationId"]
            and n["incidentId"] == p["incidentId"]
            and n["sequences"] == p["sequences"]
            and n["shutdownAckDigest"] == p["shutdownAckDigest"]
            and n["receiverOffDigest"] == p["receiverOffDigest"]
        )
    return False


class ProtectedContinuityJournal322:
    """SQLite full-sync hash-linked single-writer custody on original Windows host.

    Every read verifies the entire checkpoint chain. Privileged deletion of the
    whole local store still requires independent remote anchoring outside CI.
    """

    def __init__(self, path: Path):
        self.path = path

    @staticmethod
    def _read(db: sqlite3.Connection, scope: dict[str, Any]):
        rows = db.execute(
            "SELECT idx,previous_digest,entry_blob,record_digest "
            "FROM continuity322 WHERE scope_digest=? ORDER BY idx",
            (_digest(scope),),
        ).fetchall()
        prior = None
        for index, previous, blob, record_digest in rows:
            import json

            row = json.loads(blob)
            if not (
                type(index) is int
                and index == (prior["index"] + 1 if prior else 1)
                and previous == (prior["recordDigest"] if prior else "0" * 64)
                and _entry(row)
                and row["scope"] == scope
                and _transition(prior, row)
                and record_digest
                == _digest(
                    {
                        "index": index,
                        "previousDigest": previous,
                        "entry": row,
                    }
                )
            ):
                raise ValueError("QL431_CUSTODY_CHAIN_TAMPERED")
            prior = {
                "index": index,
                "previousDigest": previous,
                "entry": row,
                "recordDigest": record_digest,
            }
        return prior

    def read(self, monitor: PersistentReeMonitor304, scope: dict[str, Any]):
        if not (_on_ree(monitor) and isinstance(scope, dict) and self.path.is_file()):
            return None
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                return self._read(db, scope)
        except (OSError, sqlite3.Error, ValueError, TypeError):
            raise ValueError("QL431_CUSTODY_UNREADABLE_OR_TAMPERED") from None

    def append(
        self,
        monitor: PersistentReeMonitor304,
        scope: dict[str, Any],
        entry: Any,
        expected_digest: str | None,
    ):
        if not (
            _on_ree(monitor)
            and _entry(entry)
            and entry["scope"] == scope
            and (expected_digest is None or _sha(expected_digest))
        ):
            return None
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    "CREATE TABLE IF NOT EXISTS continuity322 ("
                    "scope_digest TEXT NOT NULL, idx INTEGER NOT NULL,"
                    "previous_digest TEXT NOT NULL, entry_blob TEXT NOT NULL,"
                    "record_digest TEXT NOT NULL,PRIMARY KEY(scope_digest,idx))"
                )
                prior = self._read(db, scope)
                if (prior["recordDigest"] if prior else None) != expected_digest or not _transition(
                    prior, entry
                ):
                    return None
                index = prior["index"] + 1 if prior else 1
                previous = expected_digest or "0" * 64
                record_digest = _digest(
                    {
                        "index": index,
                        "previousDigest": previous,
                        "entry": entry,
                    }
                )
                import json

                db.execute(
                    "INSERT INTO continuity322 VALUES (?,?,?,?,?)",
                    (
                        _digest(scope),
                        index,
                        previous,
                        json.dumps(entry, separators=(",", ":")),
                        record_digest,
                    ),
                )
            reopened = self.read(monitor, scope)
            return reopened if reopened and reopened["recordDigest"] == record_digest else None
        except (OSError, sqlite3.Error, ValueError, TypeError):
            return None


def _pins_ok(
    master_keys: Any, receiver_der: bytes, receiver_pin: str, shutdown_der: bytes, shutdown_pin: str
) -> bool:
    return (
        isinstance(master_keys, dict)
        and set(master_keys) == set(MASTERS)
        and all(
            isinstance(master_keys[m], tuple)
            and len(master_keys[m]) == 2
            and _public_ed25519(*master_keys[m])
            for m in MASTERS
        )
        and _public_ed25519(receiver_der, receiver_pin)
        and _public_ed25519(shutdown_der, shutdown_pin)
        and len({receiver_pin, shutdown_pin, *(master_keys[m][1] for m in MASTERS)}) == 5
    )


def _recent_signed(
    envelope: Any,
    fields: set[str],
    schema: str,
    der: bytes,
    pin: str,
    now: int,
    earliest: int | None = None,
):
    p = _native(envelope, fields, schema, der, pin)
    if not (
        p
        and _recent(p.get("observedAt"), now) is not None
        and (earliest is None or _timestamp(p["observedAt"]) >= earliest)
    ):
        return None
    return p


def _receiver(
    envelope: Any,
    scope: dict[str, Any],
    accepted_digest: str,
    observation_id: str,
    incident_id: str | None,
    ack_digest: str | None,
    state: str,
    der: bytes,
    pin: str,
    now: int,
    earliest: int | None = None,
):
    p = _recent_signed(
        envelope,
        {
            "schema",
            "scope",
            "ql430AcceptedDigest",
            "observationId",
            "incidentId",
            "shutdownAckDigest",
            "receiverState",
            "observedAt",
        },
        RECEIVER_STATE,
        der,
        pin,
        now,
        earliest,
    )
    if not (
        p
        and p["scope"] == scope
        and p["ql430AcceptedDigest"] == accepted_digest
        and p["observationId"] == observation_id
        and p["incidentId"] == incident_id
        and p["shutdownAckDigest"] == ack_digest
        and p["receiverState"] == state
    ):
        return None
    return p


def _health(
    heartbeats: Any,
    scope: dict[str, Any],
    digest: str,
    pins: dict[str, tuple[bytes, str]],
    prev: dict[str, int],
    now: int,
):
    if not (isinstance(heartbeats, dict) and set(heartbeats) == set(MASTERS)):
        return None
    bodies = []
    for m in MASTERS:
        p = _recent_signed(
            heartbeats[m],
            {
                "schema",
                "masterId",
                "scope",
                "ql430AcceptedDigest",
                "status",
                "sequence",
                "observedAt",
            },
            HEALTH_MASTER,
            *pins[m],
            now,
        )
        if not (
            p
            and p["masterId"] == m
            and p["scope"] == scope
            and p["ql430AcceptedDigest"] == digest
            and p["status"] == "ISOLATED_PILOT_HEALTHY"
            and type(p["sequence"]) is int
            and 0 < p["sequence"] <= 9_007_199_254_740_991
            and p["sequence"] > prev[m]
        ):
            return None
        bodies.append(p)
    return {
        "sequences": {p["masterId"]: p["sequence"] for p in bodies},
        "masterDigest": _digest(bodies),
    }


def _base(
    kind: str,
    scope: dict[str, Any],
    observation_id: str,
    now: int,
    accepted_digest: str,
    sequences: dict[str, int],
):
    return {
        "kind": kind,
        "scope": scope,
        "observationId": observation_id,
        "observedAt": _utc(now),
        "ql430AcceptedDigest": accepted_digest,
        "evidenceDigest": _digest({"kind": kind, "observationId": observation_id, "scope": scope}),
        "sequences": sequences,
        "incidentId": None,
        "shutdownAckDigest": None,
        "receiverOffDigest": None,
        "reportsDigest": None,
        "ownerDecisionDigest": None,
    }


def _accepted(monitor: PersistentReeMonitor304, pilot: Any, journal: ProtectedPilotJournal321):
    scope = _scope(pilot)
    if not (_on_ree(monitor) and scope and isinstance(journal, ProtectedPilotJournal321)):
        return None
    record = journal.read(monitor, scope["ceremonyId"], "ACCEPTED")
    if record != {
        "digest": pilot["acceptedDigest"],
        "previous": journal.read(monitor, scope["ceremonyId"], "ATTEMPT")["digest"]
        if journal.read(monitor, scope["ceremonyId"], "ATTEMPT")
        else None,
    }:
        return None
    return scope if record and _sha(record["previous"]) else None


async def _fail_closed(
    monitor: PersistentReeMonitor304,
    journal: ProtectedContinuityJournal322,
    scope: dict[str, Any],
    accepted_digest: str,
    observation_id: str,
    incident_id: str,
    now: int,
    sequences: dict[str, int],
    prior: Any,
    reason: str,
    receiver_adapter: Any,
    read_independent_receiver: Any,
    shutdown_der: bytes,
    shutdown_pin: str,
    receiver_der: bytes,
    receiver_pin: str,
):
    pending = _base("PENDING", scope, observation_id, now, accepted_digest, sequences)
    pending["incidentId"] = incident_id
    pending["evidenceDigest"] = _digest(
        {
            "reason": reason,
            "observationId": observation_id,
            "incidentId": incident_id,
            "scope": scope,
        }
    )
    receipt = journal.append(monitor, scope, pending, prior["recordDigest"] if prior else None)
    if receipt is None:
        # The active receiver may still be ON; request emergency shutdown but
        # never claim OFF or allow replay when durable custody is unavailable.
        try:
            await _call(
                receiver_adapter.disable_one_test,
                ceremony_id=scope["ceremonyId"],
                observation_id=observation_id,
                incident_id=incident_id,
                reason="UNRECORDED_PENDING_" + reason,
            )
        except Exception:
            pass
        return {
            **_hold("HOLD_QL431_PENDING_NOT_DURABLE_EMERGENCY_SHUTDOWN_REQUESTED"),
            "receiver": "UNKNOWN_MANUAL_OPERATOR_RECOVERY_REQUIRED",
        }
    try:
        ack = await _call(
            receiver_adapter.disable_one_test,
            ceremony_id=scope["ceremonyId"],
            observation_id=observation_id,
            incident_id=incident_id,
            reason=reason,
        )
    except Exception:
        return {
            **_hold("HOLD_QL431_SHUTDOWN_FAILED_MANUAL_RECOVERY"),
            "receiver": "UNKNOWN_MANUAL_OPERATOR_RECOVERY_REQUIRED",
        }
    p = _native(
        ack.get("signedAck") if isinstance(ack, dict) else None,
        {"schema", "scope", "observationId", "incidentId", "reason", "receiverState", "disabledAt"},
        SHUTDOWN,
        shutdown_der,
        shutdown_pin,
    )
    if not (
        isinstance(ack, dict)
        and ack.get("disabled") is True
        and p
        and p["scope"] == scope
        and p["observationId"] == observation_id
        and p["incidentId"] == incident_id
        and p["reason"] == reason
        and p["receiverState"] == "OFF"
        and _recent(p["disabledAt"], now) is not None
    ):
        return {
            **_hold("HOLD_QL431_SIGNED_SHUTDOWN_ACK_INVALID"),
            "receiver": "UNKNOWN_MANUAL_OPERATOR_RECOVERY_REQUIRED",
        }
    try:
        off_envelope = await _call(
            read_independent_receiver,
            ceremony_id=scope["ceremonyId"],
            observation_id=observation_id,
            incident_id=incident_id,
            required_state="OFF",
            shutdown_ack_digest=_digest(p),
        )
    except Exception:
        return {
            **_hold("HOLD_QL431_INDEPENDENT_OFF_READBACK_UNAVAILABLE"),
            "receiver": "UNKNOWN_MANUAL_OPERATOR_RECOVERY_REQUIRED",
        }
    off = _receiver(
        off_envelope,
        scope,
        accepted_digest,
        observation_id,
        incident_id,
        _digest(p),
        "OFF",
        receiver_der,
        receiver_pin,
        now,
        _timestamp(p["disabledAt"]),
    )
    if off is None:
        return {
            **_hold("HOLD_QL431_FRESH_SIGNED_INDEPENDENT_OFF_INVALID"),
            "receiver": "UNKNOWN_MANUAL_OPERATOR_RECOVERY_REQUIRED",
        }
    entry = {
        **pending,
        "kind": "OFF",
        "observedAt": _utc(now),
        "shutdownAckDigest": _digest(p),
        "receiverOffDigest": _digest(off),
    }
    saved = journal.append(monitor, scope, entry, receipt["recordDigest"])
    if saved is None:
        return {
            **_hold("HOLD_QL431_SIGNED_OFF_UNDURABLE"),
            "receiver": "OFF_SIGNED_BUT_NOT_DURABLY_RECORDED",
        }
    return {
        **_hold("QL431_SHUTDOWN_AWAITING_THREE_MASTER_INCIDENT_CUSTODY"),
        "state": "DURABLE_SIGNED_FAIL_CLOSED_SHUTDOWN",
        "receiver": "OFF_VERIFIED_SIGNED_READBACK",
        "incidentId": incident_id,
        "shutdownCheckpointDigest": saved["recordDigest"],
        "checkpointIndex": saved["index"],
        "connection": "HOLD",
    }


async def run_ql431_post_reentry_health322(
    monitor: PersistentReeMonitor304,
    pilot_acceptance: Any,
    observation_id: str,
    incident_id: str,
    heartbeats: Any,
    *,
    pilot_journal: ProtectedPilotJournal321,
    journal: ProtectedContinuityJournal322,
    master_keys: dict[str, tuple[bytes, str]],
    receiver_der: bytes,
    receiver_pin: str,
    shutdown_der: bytes,
    shutdown_pin: str,
    attest_original_operator: Callable[..., bool] | None,
    attest_ql430_accepted_custody: Callable[..., bool] | None,
    attest_independent_signers: Callable[..., bool] | None,
    receiver_adapter: Any,
    read_independent_receiver: Callable[..., Any] | None,
    now_ms: int | None = None,
) -> dict[str, Any]:
    """Single supervised invocation; never a scheduled auto-health monitor."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    scope = _accepted(monitor, pilot_acceptance, pilot_journal)
    if not (
        scope
        and type(now) is int
        and _id(observation_id)
        and _id(incident_id)
        and observation_id != incident_id
        and isinstance(journal, ProtectedContinuityJournal322)
        and _pins_ok(master_keys, receiver_der, receiver_pin, shutdown_der, shutdown_pin)
        and callable(getattr(receiver_adapter, "disable_one_test", None))
        and callable(read_independent_receiver)
    ):
        return _hold("HOLD_QL431_PROTECTED_ORIGINAL_HOST_PILOT_AUTHORITY_MISSING")
    evidence = {
        "source_revision": SOURCE321_MAIN,
        "comms_revision": COMMS431_CONTRACT,
        "ceremony_id": scope["ceremonyId"],
        "episode_id": scope["episodeId"],
        "accepted_digest": pilot_acceptance["acceptedDigest"],
        "observation_id": observation_id,
        "host": "DESKTOP-AE894KC",
    }
    if not all(
        (
            _callback(attest_original_operator, **evidence),
            _callback(attest_ql430_accepted_custody, **evidence),
            _callback(attest_independent_signers, **evidence),
        )
    ):
        return _hold("HOLD_QL431_REAL_HOST_OR_SIGNER_CUSTODY_UNVERIFIED")
    try:
        prior = journal.read(monitor, scope)
    except ValueError:
        prior = None
        reason = "QL431_CUSTODY_CHAIN_UNREADABLE"
        return await _fail_closed(
            monitor,
            journal,
            scope,
            pilot_acceptance["acceptedDigest"],
            observation_id,
            incident_id,
            now,
            {m: 0 for m in MASTERS},
            prior,
            reason,
            receiver_adapter,
            read_independent_receiver,
            shutdown_der,
            shutdown_pin,
            receiver_der,
            receiver_pin,
        )
    if prior and prior["entry"]["kind"] != "HEALTH":
        return {
            **_hold("HOLD_QL431_TERMINAL_INCIDENT_NO_AUTO_REENTRY"),
            "receiver": "UNKNOWN_MANUAL_OPERATOR_RECOVERY_REQUIRED",
        }
    if prior and prior["entry"]["observationId"] == observation_id:
        return _hold("HOLD_QL431_REPLAYED_HEALTH_OBSERVATION")
    prior_seq = prior["entry"]["sequences"] if prior else {m: 0 for m in MASTERS}
    accepted_digest = pilot_acceptance["acceptedDigest"]
    health = _health(heartbeats, scope, accepted_digest, master_keys, prior_seq, now)
    state = None
    if health:
        try:
            state = await _call(
                read_independent_receiver,
                ceremony_id=scope["ceremonyId"],
                observation_id=observation_id,
                incident_id=None,
                required_state="ISOLATED_ONE_TEST_ON",
                shutdown_ack_digest=None,
            )
        except Exception:
            pass
    on = (
        _receiver(
            state,
            scope,
            accepted_digest,
            observation_id,
            None,
            None,
            "ISOLATED_ONE_TEST_ON",
            receiver_der,
            receiver_pin,
            now,
        )
        if health
        else None
    )
    if health and on:
        entry = _base("HEALTH", scope, observation_id, now, accepted_digest, health["sequences"])
        entry["evidenceDigest"] = _digest(
            {
                "masterReportsDigest": health["masterDigest"],
                "independentReceiverDigest": _digest(on),
            }
        )
        checkpoint = journal.append(monitor, scope, entry, prior["recordDigest"] if prior else None)
        if checkpoint:
            return {
                "state": "DURABLE_QL431_POST_REENTRY_HEALTH_SNAPSHOT",
                "accepted": True,
                "receiver": "ISOLATED_ONE_TEST_ON",
                "connection": "VERIFIED_CONNECTED_PILOT",
                "ownerAcceptance": "DUAL_SIGNED_FOR_ISOLATED_PILOT",
                "runtimeUptime": "SIGNED_SINGLE_CYCLE_NOT_MEASURED_UPTIME",
                "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
                "scope": scope,
                "checkpointIndex": checkpoint["index"],
                "checkpointDigest": checkpoint["recordDigest"],
                "observedAt": entry["observedAt"],
                "sequences": health["sequences"],
            }
    return await _fail_closed(
        monitor,
        journal,
        scope,
        accepted_digest,
        observation_id,
        incident_id,
        now,
        prior_seq,
        prior,
        "QL431_DURABLE_HEALTH_WRITE_FAILED"
        if health and on
        else "QL431_SIGNED_POST_REENTRY_HEALTH_REJECTED",
        receiver_adapter,
        read_independent_receiver,
        shutdown_der,
        shutdown_pin,
        receiver_der,
        receiver_pin,
    )


def reconcile_ql431_incident322(
    monitor: PersistentReeMonitor304,
    scope: dict[str, Any],
    incident_id: str,
    reports: Any,
    owner_acceptance: Any,
    *,
    journal: ProtectedContinuityJournal322,
    master_keys: dict[str, tuple[bytes, str]],
    owner_der: bytes,
    owner_pin: str,
    reviewer_der: bytes,
    reviewer_pin: str,
    attest_operator: Callable[..., bool] | None,
    attest_master_custody: Callable[..., bool] | None,
    attest_owner_custody: Callable[..., bool] | None,
    attest_external_custody: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, Any]:
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and _id(incident_id)
        and isinstance(journal, ProtectedContinuityJournal322)
        and isinstance(master_keys, dict)
        and set(master_keys) == set(MASTERS)
        and all(_public_ed25519(*master_keys[m]) for m in MASTERS)
        and _public_ed25519(owner_der, owner_pin)
        and _public_ed25519(reviewer_der, reviewer_pin)
        and len({owner_pin, reviewer_pin, *(master_keys[m][1] for m in MASTERS)}) == 5
    ):
        return _hold("HOLD_QL431_INCIDENT_CUSTODY_SIGNER_AUTHORITY_REQUIRED")
    try:
        prior = journal.read(monitor, scope)
    except ValueError:
        return _hold("HOLD_QL431_INCIDENT_LEDGER_UNREADABLE")
    if not (
        prior and prior["entry"]["kind"] == "OFF" and prior["entry"]["incidentId"] == incident_id
    ):
        return _hold("HOLD_QL431_SIGNED_DURABLE_OFF_REQUIRED")
    e = prior["entry"]
    if not (isinstance(reports, dict) and set(reports) == set(MASTERS)):
        return _hold("HOLD_QL431_THREE_MASTER_INCIDENT_REPORTS_REQUIRED")
    bodies = []
    for m in MASTERS:
        p = _recent_signed(
            reports[m],
            {
                "schema",
                "masterId",
                "scope",
                "incidentId",
                "shutdownRecordDigest",
                "receiverOffDigest",
                "status",
                "observedAt",
            },
            INCIDENT_MASTER,
            *master_keys[m],
            now,
            _timestamp(e["observedAt"]),
        )
        if not (
            p
            and p["masterId"] == m
            and p["scope"] == scope
            and p["incidentId"] == incident_id
            and p["shutdownRecordDigest"] == prior["recordDigest"]
            and p["receiverOffDigest"] == e["receiverOffDigest"]
            and p["status"] == "ISOLATED_RECEIVER_OFF_INCIDENT_HELD"
        ):
            return _hold("HOLD_QL431_SIGNED_MASTER_INCIDENT_CUSTODY_REJECTED")
        bodies.append(p)
    digest = _digest(bodies)
    o = _dual(
        owner_acceptance,
        {
            "schema",
            "scope",
            "incidentId",
            "shutdownRecordDigest",
            "reportsDigest",
            "action",
            "ownerId",
            "reviewerId",
            "acceptedAt",
        },
        INCIDENT_OWNER,
        INCIDENT_ACTION,
        owner_der,
        owner_pin,
        reviewer_der,
        reviewer_pin,
        now,
        max(_timestamp(p["observedAt"]) for p in bodies),
        "acceptedAt",
    )
    if not (
        o
        and o["scope"] == scope
        and o["incidentId"] == incident_id
        and o["shutdownRecordDigest"] == prior["recordDigest"]
        and o["reportsDigest"] == digest
    ):
        return _hold("HOLD_QL431_DUAL_SIGNED_OWNER_INCIDENT_REJECTED")
    custody = {
        "source_revision": SOURCE321_MAIN,
        "comms_revision": COMMS431_CONTRACT,
        "ceremony_id": scope["ceremonyId"],
        "incident_id": incident_id,
        "shutdown_record_digest": prior["recordDigest"],
        "master_reports_digest": digest,
        "owner_decision_digest": _digest(o),
    }
    if not all(
        (
            _callback(attest_operator, **custody),
            _callback(attest_master_custody, **custody),
            _callback(attest_owner_custody, **custody),
            _callback(attest_external_custody, **custody),
        )
    ):
        return _hold("HOLD_QL431_INDEPENDENT_INCIDENT_CUSTODY_UNVERIFIED")
    entry = {
        **e,
        "kind": "RECONCILED",
        "observedAt": _utc(now),
        "reportsDigest": digest,
        "ownerDecisionDigest": _digest(o),
    }
    saved = journal.append(monitor, scope, entry, prior["recordDigest"])
    if saved is None:
        return _hold("HOLD_QL431_INCIDENT_RECONCILIATION_DURABILITY_OR_REPLAY")
    return {
        **_hold("QL431_INCIDENT_RECONCILED_RECEIVER_REMAINS_OFF"),
        "state": "DURABLE_QL431_THREE_MASTER_INCIDENT_RECONCILED",
        "accepted": True,
        "receiver": "OFF_VERIFIED_SIGNED_READBACK",
        "connection": "HOLD",
        "ownerAcceptance": "DUAL_SIGNED_INCIDENT_CUSTODY_ONLY",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "masterCount": 3,
        "incidentId": incident_id,
        "checkpointIndex": saved["index"],
        "reconciliationDigest": saved["recordDigest"],
    }


def reconcile_master_evidence322(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """No source code or browser may advertise a real original-host pilot."""
    return {
        **reconcile_master_evidence321(monitor),
        "schema": "rosevear.ai-hub.master360-ql431-pilot-continuity322.v1",
        "sourceBuild": 322,
        "source321MainAtReconciliation": SOURCE321_MAIN,
        "commsQl431ContractAtReconciliation": COMMS431_CONTRACT,
        "controller380MainAtReconciliation": CONTROLLER380_MAIN,
        "ql431Ql430AcceptedPilot": "HOLD_NO_REAL_DURABLE_QL430_PILOT_RECEIPT",
        "ql431IndependentMasterHealth": "HOLD_NO_THREE_FRESH_SIGNED_HEARTBEATS",
        "ql431MonotonicSequences": "HOLD_NO_DURABLE_HIGH_WATER_RECHECK",
        "ql431IndependentReceiverOn": "HOLD_NO_SEPARATE_SIGNED_ON",
        "ql431DurableHealthCheckpoint": "HOLD_NO_ORIGINAL_HOST_IMMUTABLE_HEALTH",
        "ql431PendingFailClosedIncident": "HOLD_NO_ORIGINAL_HOST_INCIDENT_ATTEMPT",
        "ql431SignedReceiverShutdown": "HOLD_NO_FRESH_ORIGINAL_SIGNED_SHUTDOWN",
        "ql431IndependentReceiverOff": "HOLD_NO_SEPARATE_SIGNED_OFF_READBACK",
        "ql431ThreeMasterIncident": "HOLD_NO_THREE_SIGNED_INCIDENT_CUSTODY_REPORTS",
        "ql431DualOwnerIncident": "HOLD_NO_DUAL_SIGNED_INCIDENT_ACCEPTANCE",
        "ql431DurableReconciliation": "HOLD_NO_IMMUTABLE_INCIDENT_CLOSURE",
        "receiver": "OFF",
        "connection": "HOLD",
        "ownerAcceptance": "HOLD",
        "masterSync": "HOLD",
        "runtimeUptime": "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING",
    }
