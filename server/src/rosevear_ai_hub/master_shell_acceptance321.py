"""Build 321 — QL-430 original-host supervised isolated pilot, never autonomous.

Protected original-Windows-host library only. Runtime adapters, independent
signers, external custody and owner authority must be supplied and attested by
the real protected operator. This module creates no web intake, scheduled task,
receiver integration or claim that original-host deployment has occurred.
"""

import inspect
import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance305 import _timestamp
from rosevear_ai_hub.master_shell_acceptance306 import _trusted_signature
from rosevear_ai_hub.master_shell_acceptance308 import _hold, _on_ree
from rosevear_ai_hub.master_shell_acceptance310 import _sha
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS, _callback
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance316 import CONTROLLER380_MAIN
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _id, _native, _recent
from rosevear_ai_hub.master_shell_acceptance320 import (
    ProtectedEnrollmentJournal320,
    _enrolled,
    reconcile_master_evidence320,
    verify_ql429_original_host_off320,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE320_MAIN = "146f8c4c22a7155c9c7e08b0f7697dffc25754a9"
COMMS430_CONTRACT = "a7625fed29e0b4dd6b41b8454e576828b19d6d6e"
HOST = "DESKTOP-AE894KC"
STAGES = ("ATTEMPT", "ACCEPTED")
ZERO = "0" * 64
QL424_ACTIVATION = "rosevear.ql424.supervised-receiver-ceremony.v1"
QL424_RECEIVER = "rosevear.ql424.protected-receiver-state.v1"
QL424_MASTER = "rosevear.ql424.master-operational-acceptance.v1"
QL424_OWNER = "rosevear.ql424.supervised-operational-acceptance.v1"
QL430_AUTH = "rosevear.ql430.supervised-reentry-authorization.v1"
QL430_RECEIVER = "rosevear.ql430.independent-receiver-runtime.v1"
QL430_MASTER = "rosevear.ql430.master-runtime-acceptance.v1"
QL430_OWNER = "rosevear.ql430.owner-runtime-acceptance.v1"
QL430_OFF = "rosevear.ql430.independent-failclosed-off.v1"
REENTRY_ACTION = "EXECUTE_NEW_SUPERVISED_QL424_ISOLATED_ONE_TEST"
PILOT_ACTION = "ACCEPT_FRESH_ISOLATED_PILOT_ONLY_KEEP_SLAVE_GATE_HOLD"


def _oktime(t: Any, now: int, earliest: int | None = None) -> bool:
    stamped = _recent(t, now)
    return stamped is not None and (earliest is None or stamped >= earliest)


def _person(x: Any) -> bool:
    return (
        isinstance(x, str)
        and len(x) >= 3
        and len(x) <= 80
        and all(c.isalnum() or c in "_-" for c in x)
        and x.isascii()
    )


def _bound(payload: Any, scope: dict[str, Any]) -> bool:
    return (
        isinstance(payload, dict)
        and all(
            payload.get(field) == scope[field]
            for field in ("episodeId", "sourceRevision", "controllerRevision")
        )
        and payload.get("sourceId") == "rosevear-ai-hub"
    )


def _dual(
    envelope: Any,
    fields: set[str],
    schema: str,
    action: str,
    owner_der: bytes,
    owner_pin: str,
    reviewer_der: bytes,
    reviewer_pin: str,
    now: int,
    earliest: int,
    time_field: str,
) -> dict[str, Any] | None:
    p = envelope.get("payload") if isinstance(envelope, dict) else None
    if not (
        isinstance(envelope, dict)
        and set(envelope) == {"payload", "ownerSignature", "reviewerSignature"}
        and isinstance(p, dict)
        and set(p) == fields
        and p.get("schema") == schema
        and p.get("action") == action
        and _person(p.get("ownerId"))
        and _person(p.get("reviewerId"))
        and p["ownerId"] != p["reviewerId"]
        and _oktime(p.get(time_field), now, earliest)
        and owner_pin != reviewer_pin
        and _public_ed25519(owner_der, owner_pin)
        and _public_ed25519(reviewer_der, reviewer_pin)
        and _trusted_signature(p, envelope["ownerSignature"], owner_der, owner_pin)
        and _trusted_signature(p, envelope["reviewerSignature"], reviewer_der, reviewer_pin)
    ):
        return None
    return p


class ProtectedPilotJournal321:
    """Original Windows host one-use ATTEMPT before any receiver enable.

    No private keys, payloads or Windows service state are stored. Privileged
    deletion requires independent off-host custody monitoring by the operator.
    """

    def __init__(self, path: Path):
        self.path = path

    def read(self, monitor: PersistentReeMonitor304, ceremony: str, stage: str):
        if not (_on_ree(monitor) and _id(ceremony) and stage in STAGES and self.path.is_file()):
            return None
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                row = db.execute(
                    "SELECT digest,previous_digest FROM pilot321 WHERE ceremony=? AND stage=?",
                    (ceremony, stage),
                ).fetchone()
            if row and _sha(row[0]) and _sha(row[1]):
                return {"digest": row[0], "previous": row[1]}
        except (OSError, sqlite3.Error):
            return None
        return None

    def claim(
        self,
        monitor: PersistentReeMonitor304,
        ceremony: str,
        stage: str,
        digest: str,
        previous: str,
    ) -> bool:
        if not (
            _on_ree(monitor)
            and _id(ceremony)
            and stage in STAGES
            and _sha(digest)
            and _sha(previous)
        ):
            return False
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    "CREATE TABLE IF NOT EXISTS pilot321 ("
                    "ceremony TEXT NOT NULL, stage TEXT NOT NULL, digest TEXT NOT NULL,"
                    "previous_digest TEXT NOT NULL,"
                    "PRIMARY KEY(ceremony,stage))"
                )
                if stage == "ATTEMPT":
                    if previous != ZERO:
                        return False
                else:
                    first = db.execute(
                        "SELECT digest FROM pilot321 WHERE ceremony=? AND stage='ATTEMPT'",
                        (ceremony,),
                    ).fetchone()
                    if first != (previous,):
                        return False
                row = db.execute(
                    "INSERT OR IGNORE INTO pilot321 VALUES (?,?,?,?)",
                    (ceremony, stage, digest, previous),
                )
                if row.rowcount != 1:
                    return False
            return self.read(monitor, ceremony, stage) == {"digest": digest, "previous": previous}
        except (OSError, sqlite3.Error):
            return False


async def _call(fn: Any, **kwargs):
    if not callable(fn):
        raise ValueError("PROTECTED_ADAPTER_REQUIRED")
    result = fn(**kwargs)
    return await result if inspect.isawaitable(result) else result


def _prior_ql429(
    monitor: PersistentReeMonitor304,
    journal: ProtectedEnrollmentJournal320,
    external_store_id: str,
    reentry_id: str,
    signed_host: Any,
    attest_original_host_off: Any,
    now: int,
):
    host = verify_ql429_original_host_off320(
        monitor,
        external_store_id,
        reentry_id,
        signed_host,
        journal=journal,
        attest_original_host_off=attest_original_host_off,
        now_ms=now,
    )
    if not host.get("accepted"):
        return None
    witness = journal.read(monitor, "witness", reentry_id)
    challenge = journal.read(monitor, "challenge", reentry_id)
    enrolled = _enrolled(monitor, journal, external_store_id)
    if not (witness and challenge and enrolled):
        return None
    data = witness["payload"]
    if not (
        data.get("enrollmentDigest") == enrolled[0]["recordDigest"]
        and data.get("challengeDigest") == host["challengeDigest"]
        and data.get("hostResponseDigest") == host["hostResponseDigest"]
        and data.get("nextCeremonyId") == host["nextCeremonyId"]
        and challenge["payload"].get("enrollmentDigest") == enrolled[0]["recordDigest"]
        and isinstance(data.get("mastersDigest"), str)
        and _sha(data["mastersDigest"])
        and isinstance(data.get("ownerDecisionDigest"), str)
        and _sha(data["ownerDecisionDigest"])
    ):
        return None
    return host, witness, challenge, enrolled


def _ql424_context(
    activation: Any,
    host: dict[str, Any],
    witness: dict[str, Any],
    replay_digest: str,
    ql430_authorization: Any,
    owner_der: bytes,
    owner_pin: str,
    reviewer_der: bytes,
    reviewer_pin: str,
    now: int,
) -> dict[str, Any] | None:
    p = activation.get("payload") if isinstance(activation, dict) else None
    body_fields = {
        "schema",
        "sourceId",
        "hostId",
        "episodeId",
        "sourceRevision",
        "controllerRevision",
        "custodyRecordDigest",
        "priorDecisionId",
        "enrollmentId",
        "ceremonyId",
        "mode",
        "issuedAt",
        "ownerId",
        "reviewerId",
    }
    if not (
        isinstance(activation, dict)
        and set(activation) == {"payload", "ownerSignature", "reviewerSignature"}
        and isinstance(p, dict)
        and set(p) == body_fields
        and p["schema"] == QL424_ACTIVATION
        and p["sourceId"] == "rosevear-ai-hub"
        and p["hostId"] == HOST
        and _id(p["episodeId"])
        and p["episodeId"] != host["scope"]["episodeId"]
        and p["sourceRevision"] == host["scope"]["sourceRevision"]
        and p["controllerRevision"] == host["scope"]["controllerRevision"]
        and p["ceremonyId"] == host["nextCeremonyId"]
        and p["ceremonyId"] != host["scope"]["ceremonyId"]
        and p["mode"] == "ISOLATED_ONE_TEST"
        and _id(p["priorDecisionId"])
        and _id(p["enrollmentId"])
        and p["custodyRecordDigest"] == replay_digest
        and _person(p["ownerId"])
        and _person(p["reviewerId"])
        and p["ownerId"] != p["reviewerId"]
        and _oktime(p["issuedAt"], now, _timestamp(host["hostObservedAt"]))
        and owner_pin != reviewer_pin
        and _trusted_signature(p, activation["ownerSignature"], owner_der, owner_pin)
        and _trusted_signature(p, activation["reviewerSignature"], reviewer_der, reviewer_pin)
    ):
        return None
    owner = _dual(
        ql430_authorization,
        {
            "schema",
            "externalStoreId",
            "reentryId",
            "ql429WitnessDigest",
            "challengeDigest",
            "nextCeremonyId",
            "activationDigest",
            "action",
            "ownerId",
            "reviewerId",
            "authorizedAt",
        },
        QL430_AUTH,
        REENTRY_ACTION,
        owner_der,
        owner_pin,
        reviewer_der,
        reviewer_pin,
        now,
        _timestamp(host["hostObservedAt"]),
        "authorizedAt",
    )
    if not (
        owner
        and owner["externalStoreId"] == host["externalStoreId"]
        and owner["reentryId"] == host["reentryId"]
        and owner["ql429WitnessDigest"] == witness["recordDigest"]
        and owner["challengeDigest"] == host["challengeDigest"]
        and owner["nextCeremonyId"] == p["ceremonyId"]
        and owner["activationDigest"] == _digest(p)
    ):
        return None
    return p


def _ql424_original_receiver(
    result: Any,
    activation: dict[str, Any],
    receiver_der: bytes,
    receiver_pin: str,
    replay_digest: str,
    now: int,
) -> dict[str, Any] | None:
    if not (
        isinstance(result, dict)
        and result.get("state") == "ISOLATED_RECEIVER_ACTIVATED_PENDING_THREE_MASTER_ACCEPTANCE"
        and result.get("ceremonyId") == activation["ceremonyId"]
        and result.get("recordDigest") == replay_digest
    ):
        return None
    body = _native(
        result.get("receiverProof"),
        {
            "schema",
            "ceremonyId",
            "sourceId",
            "episodeId",
            "sourceRevision",
            "controllerRevision",
            "receiverState",
            "observedAt",
        },
        QL424_RECEIVER,
        receiver_der,
        receiver_pin,
    )
    if not (
        body
        and body["ceremonyId"] == activation["ceremonyId"]
        and _bound(body, activation)
        and body["receiverState"] == "ISOLATED_ONE_TEST_ON"
        and _oktime(body["observedAt"], now, _timestamp(activation["issuedAt"]))
    ):
        return None
    return body


def _independent_receiver(
    envelope: Any,
    activation: dict[str, Any],
    witness_digest: str,
    challenge_id: str,
    der: bytes,
    pin: str,
    now: int,
    earliest: int,
    state: str,
) -> dict[str, Any] | None:
    body = _native(
        envelope,
        {
            "schema",
            "ceremonyId",
            "sourceId",
            "episodeId",
            "sourceRevision",
            "controllerRevision",
            "ql429WitnessDigest",
            "challengeId",
            "receiverState",
            "observedAt",
        },
        QL430_RECEIVER if state == "ISOLATED_ONE_TEST_ON" else QL430_OFF,
        der,
        pin,
    )
    if not (
        body
        and body["ceremonyId"] == activation["ceremonyId"]
        and _bound(body, activation)
        and body["ql429WitnessDigest"] == witness_digest
        and body["challengeId"] == challenge_id
        and body["receiverState"] == state
        and _oktime(body["observedAt"], now, earliest)
    ):
        return None
    return body


def _three_masters(
    reports: Any,
    schema: str,
    fields: set[str],
    activation: dict[str, Any],
    pins: dict[str, tuple[bytes, str]],
    now: int,
    earliest: int,
    expected: dict[str, Any],
    status: str,
) -> list[dict[str, Any]] | None:
    if not (isinstance(reports, dict) and set(reports) == set(MASTERS)):
        return None
    values = []
    for master in MASTERS:
        p = _native(reports[master], fields, schema, *pins[master])
        if not (
            p
            and p["masterId"] == master
            and p["ceremonyId"] == activation["ceremonyId"]
            and _bound(p, activation)
            and p["status"] == status
            and _oktime(p["observedAt"], now, earliest)
            and all(p.get(k) == v for k, v in expected.items())
        ):
            return None
        values.append(p)
    return values


async def _rollback(
    receiver: Any,
    read_independent: Any,
    activation: dict[str, Any],
    witness_digest: str,
    challenge_id: str,
    der: bytes,
    pin: str,
    now: int,
    reason: str,
) -> dict[str, Any]:
    try:
        disabled = await _call(
            receiver.disable_one_test, ceremony_id=activation["ceremonyId"], reason=reason
        )
        if not (isinstance(disabled, dict) and disabled.get("disabled") is True):
            return {
                **_hold("QL430_RECEIVER_DISABLE_NOT_CONFIRMED"),
                "receiver": "UNKNOWN_MANUAL_OPERATOR_RECOVERY_REQUIRED",
            }
        # A disable acknowledgement alone does not prove OFF.
        try:
            observed = await _call(
                read_independent,
                ceremony_id=activation["ceremonyId"],
                episode_id=activation["episodeId"],
                required_state="OFF",
                ql429_witness_digest=witness_digest,
                challenge_id=challenge_id,
            )
            off = _independent_receiver(
                observed,
                activation,
                witness_digest,
                challenge_id,
                der,
                pin,
                now,
                _timestamp(activation["issuedAt"]),
                "OFF",
            )
            if off:
                return {
                    **_hold("QL430_PILOT_FAILED_SIGNED_OFF_RECHECK"),
                    "receiver": "OFF_VERIFIED_SIGNED_AFTER_ROLLBACK",
                }
        except Exception:
            pass
        return {
            **_hold("QL430_DISABLE_ACK_WITHOUT_FRESH_INDEPENDENT_OFF"),
            "receiver": "OFF_NOT_INDEPENDENTLY_RECHECKED",
        }
    except Exception:
        return {
            **_hold("QL430_ROLLBACK_FAILED_MANUAL_ORIGINAL_HOST_RECOVERY"),
            "receiver": "UNKNOWN_MANUAL_OPERATOR_RECOVERY_REQUIRED",
        }


async def run_ql430_supervised_pilot321(
    monitor: PersistentReeMonitor304,
    external_store_id: str,
    reentry_id: str,
    host_response: Any,
    activation: Any,
    authorization: Any,
    *,
    enrollment_journal: ProtectedEnrollmentJournal320,
    pilot_journal: ProtectedPilotJournal321,
    ql423_replay_digest: str,
    ql424_receiver_der: bytes,
    ql424_receiver_pin: str,
    independent_receiver_der: bytes,
    independent_receiver_pin: str,
    owner_der: bytes,
    owner_pin: str,
    reviewer_der: bytes,
    reviewer_pin: str,
    attest_original_host_off: Callable[..., bool] | None,
    attest_ql429_signed_witness: Callable[..., bool] | None,
    attest_ql423_replay: Callable[..., bool] | None,
    attest_new_ql424_enrollment: Callable[..., bool] | None,
    attest_operator_session: Callable[..., bool] | None,
    attest_ql424_execution: Callable[..., bool] | None,
    attest_independent_receiver: Callable[..., bool] | None,
    attest_three_master_custody: Callable[..., bool] | None,
    attest_owner_runtime: Callable[..., bool] | None,
    attest_external_custody: Callable[..., bool] | None,
    receiver_adapter: Any,
    run_signed_ql424: Callable[..., Any] | None,
    read_independent_receiver: Callable[..., Any] | None,
    read_runtime_evidence: Callable[..., Any] | None,
    now_ms: int | None = None,
) -> dict[str, Any]:
    """One protected one-TEST invocation; fail-close on ANY post-enable failure."""
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if not (
        _on_ree(monitor)
        and type(now) is int
        and isinstance(pilot_journal, ProtectedPilotJournal321)
        and isinstance(enrollment_journal, ProtectedEnrollmentJournal320)
        and _id(external_store_id)
        and _id(reentry_id)
        and _sha(ql423_replay_digest)
        and _public_ed25519(ql424_receiver_der, ql424_receiver_pin)
        and _public_ed25519(independent_receiver_der, independent_receiver_pin)
        and _public_ed25519(owner_der, owner_pin)
        and _public_ed25519(reviewer_der, reviewer_pin)
        and len({ql424_receiver_pin, independent_receiver_pin, owner_pin, reviewer_pin}) == 4
        and callable(run_signed_ql424)
        and callable(read_independent_receiver)
        and callable(read_runtime_evidence)
        and callable(getattr(receiver_adapter, "disable_one_test", None))
    ):
        return _hold("HOLD_QL430_ORIGINAL_HOST_PROTECTED_EXECUTION_AUTHORITY_REQUIRED")
    prior = _prior_ql429(
        monitor,
        enrollment_journal,
        external_store_id,
        reentry_id,
        host_response,
        attest_original_host_off,
        now,
    )
    if prior is None:
        return _hold("HOLD_QL430_SIGNED_QL429_WITNESS_OR_HOST_OFF_UNVERIFIED")
    host, witness, challenge, enrolled = prior
    master_pins = {m: enrolled[2][m] for m in MASTERS}
    if (
        len(
            {
                ql424_receiver_pin,
                independent_receiver_pin,
                owner_pin,
                reviewer_pin,
                *(p[1] for p in master_pins.values()),
            }
        )
        != 7
    ):
        return _hold("HOLD_QL430_INDEPENDENT_RECEIVER_AND_MASTER_PINS_REQUIRED")
    p = _ql424_context(
        activation,
        host,
        witness,
        ql423_replay_digest,
        authorization,
        owner_der,
        owner_pin,
        reviewer_der,
        reviewer_pin,
        now,
    )
    if p is None:
        return _hold("HOLD_QL430_NEW_QL424_CEREMONY_AUTHORIZATION_REJECTED")
    scope = {
        "source_revision": SOURCE320_MAIN,
        "comms_revision": COMMS430_CONTRACT,
        "old_ceremony_id": host["scope"]["ceremonyId"],
        "new_ceremony_id": p["ceremonyId"],
        "old_episode_id": host["scope"]["episodeId"],
        "episode_id": p["episodeId"],
        "reentry_id": reentry_id,
        "host": HOST,
        "ql429_witness_digest": witness["recordDigest"],
        "ql423_replay_digest": ql423_replay_digest,
        "ql424_activation_digest": _digest(p),
    }
    if not all(
        (
            _callback(attest_ql429_signed_witness, **scope),
            _callback(attest_ql423_replay, **scope),
            _callback(attest_new_ql424_enrollment, **scope),
            _callback(attest_operator_session, **scope),
            _callback(attest_ql424_execution, **scope),
        )
    ):
        return _hold("HOLD_QL430_INDEPENDENT_ORIGINAL_HOST_AUTHORITY_MISSING")
    attempt_digest = _digest(
        {
            **scope,
            "authorizationDigest": _digest(authorization["payload"]),
            "hostResponseDigest": host["hostResponseDigest"],
        }
    )
    if not pilot_journal.claim(
        monitor,
        p["ceremonyId"],
        "ATTEMPT",
        attempt_digest,
        ZERO,
    ):
        return _hold("HOLD_QL430_ATTEMPT_ALREADY_CONSUMED_OR_UNDURABLE")

    # Attempt is irrevocably consumed before any possible one-TEST enable.
    async def fail(reason: str):
        return await _rollback(
            receiver_adapter,
            read_independent_receiver,
            p,
            witness["recordDigest"],
            challenge["payload"]["challenge"]["challengeId"],
            independent_receiver_der,
            independent_receiver_pin,
            now,
            reason,
        )

    try:
        result = await _call(
            run_signed_ql424,
            activation=activation,
            replay_digest=ql423_replay_digest,
            expected_source=p["sourceRevision"],
            expected_controller=p["controllerRevision"],
            original_host=HOST,
            ceremony_id=p["ceremonyId"],
            mode="ISOLATED_ONE_TEST",
        )
    except Exception:
        return await fail("QL424_RUNNER_ERROR_AFTER_RESERVED_ATTEMPT")
    orig = _ql424_original_receiver(
        result, p, ql424_receiver_der, ql424_receiver_pin, ql423_replay_digest, now
    )
    if orig is None:
        return await fail("QL424_ORIGINAL_SIGNED_RECEIVER_ON_UNVERIFIED")
    try:
        independent = await _call(
            read_independent_receiver,
            ceremony_id=p["ceremonyId"],
            episode_id=p["episodeId"],
            required_state="ISOLATED_ONE_TEST_ON",
            ql429_witness_digest=witness["recordDigest"],
            challenge_id=challenge["payload"]["challenge"]["challengeId"],
        )
    except Exception:
        return await fail("QL430_INDEPENDENT_RECEIVER_READBACK_UNAVAILABLE")
    observed = _independent_receiver(
        independent,
        p,
        witness["recordDigest"],
        challenge["payload"]["challenge"]["challengeId"],
        independent_receiver_der,
        independent_receiver_pin,
        now,
        _timestamp(orig["observedAt"]),
        "ISOLATED_ONE_TEST_ON",
    )
    if observed is None:
        return await fail("QL430_SECOND_INDEPENDENT_RECEIVER_ATTESTATION_INVALID")
    receiver_digest = _digest(observed)
    evidence_scope = {
        **scope,
        "independent_receiver_digest": receiver_digest,
        "original_receiver_digest": _digest(orig),
    }
    if not _callback(attest_independent_receiver, **evidence_scope):
        return await fail("QL430_INDEPENDENT_RECEIVER_CUSTODY_NOT_VERIFIED")
    try:
        evidence = await _call(
            read_runtime_evidence,
            ceremony_id=p["ceremonyId"],
            episode_id=p["episodeId"],
            ql429_witness_digest=witness["recordDigest"],
            independent_receiver_digest=receiver_digest,
            replay_digest=ql423_replay_digest,
        )
    except Exception:
        return await fail("QL430_PROTECTED_MASTER_RUNTIME_EVIDENCE_UNAVAILABLE")
    if not isinstance(evidence, dict) or set(evidence) != {
        "ql424Reports",
        "ql424Owner",
        "ql430Reports",
        "ql430Owner",
    }:
        return await fail("QL430_RUNTIME_EVIDENCE_STRUCTURE_INVALID")
    ql424_reports = _three_masters(
        evidence["ql424Reports"],
        QL424_MASTER,
        {
            "schema",
            "masterId",
            "ceremonyId",
            "sourceId",
            "episodeId",
            "sourceRevision",
            "controllerRevision",
            "custodyRecordDigest",
            "receiverState",
            "status",
            "observedAt",
        },
        p,
        master_pins,
        now,
        _timestamp(orig["observedAt"]),
        {"custodyRecordDigest": ql423_replay_digest, "receiverState": "ISOLATED_ONE_TEST_ON"},
        "VERIFIED_LIVE_PILOT",
    )
    if ql424_reports is None:
        return await fail("QL424_THREE_SIGNED_MASTER_LIVE_ACCEPTANCE_INVALID")
    ql424_digest = _digest(ql424_reports)
    ql424_owner = _dual(
        evidence["ql424Owner"],
        {
            "schema",
            "ceremonyId",
            "sourceId",
            "episodeId",
            "sourceRevision",
            "controllerRevision",
            "custodyRecordDigest",
            "reportsDigest",
            "action",
            "acceptedAt",
            "ownerId",
            "reviewerId",
        },
        QL424_OWNER,
        "ACCEPT_ISOLATED_OPERATIONAL_PILOT",
        owner_der,
        owner_pin,
        reviewer_der,
        reviewer_pin,
        now,
        max(_timestamp(m["observedAt"]) for m in ql424_reports),
        "acceptedAt",
    )
    if not (
        ql424_owner
        and ql424_owner["ceremonyId"] == p["ceremonyId"]
        and _bound(ql424_owner, p)
        and ql424_owner["custodyRecordDigest"] == ql423_replay_digest
        and ql424_owner["reportsDigest"] == ql424_digest
    ):
        return await fail("QL424_DUAL_SIGNED_OPERATIONAL_OWNER_REJECTED")
    accepted_424 = _digest(
        {
            "ql424Masters": ql424_reports,
            "ql424Owner": ql424_owner,
        }
    )
    ql430_reports = _three_masters(
        evidence["ql430Reports"],
        QL430_MASTER,
        {
            "schema",
            "masterId",
            "ceremonyId",
            "sourceId",
            "episodeId",
            "sourceRevision",
            "controllerRevision",
            "ql429WitnessDigest",
            "independentReceiverDigest",
            "ql424AcceptanceDigest",
            "status",
            "observedAt",
        },
        p,
        master_pins,
        now,
        _timestamp(observed["observedAt"]),
        {
            "ql429WitnessDigest": witness["recordDigest"],
            "independentReceiverDigest": receiver_digest,
            "ql424AcceptanceDigest": accepted_424,
        },
        "VERIFIED_NEW_ISOLATED_ONE_TEST_RUNTIME",
    )
    if ql430_reports is None:
        return await fail("QL430_THREE_FRESH_MASTER_RUNTIME_SIGNATURES_INVALID")
    masters_digest = _digest(ql430_reports)
    ql430_owner = _dual(
        evidence["ql430Owner"],
        {
            "schema",
            "ceremonyId",
            "sourceId",
            "episodeId",
            "sourceRevision",
            "controllerRevision",
            "ql429WitnessDigest",
            "independentReceiverDigest",
            "ql424AcceptanceDigest",
            "reportsDigest",
            "action",
            "acceptedAt",
            "ownerId",
            "reviewerId",
        },
        QL430_OWNER,
        PILOT_ACTION,
        owner_der,
        owner_pin,
        reviewer_der,
        reviewer_pin,
        now,
        max(_timestamp(m["observedAt"]) for m in ql430_reports),
        "acceptedAt",
    )
    if not (
        ql430_owner
        and ql430_owner["ceremonyId"] == p["ceremonyId"]
        and _bound(ql430_owner, p)
        and ql430_owner["ql429WitnessDigest"] == witness["recordDigest"]
        and ql430_owner["independentReceiverDigest"] == receiver_digest
        and ql430_owner["ql424AcceptanceDigest"] == accepted_424
        and ql430_owner["reportsDigest"] == masters_digest
    ):
        return await fail("QL430_DUAL_SIGNED_RUNTIME_OWNER_ACCEPTANCE_REJECTED")
    custody = {
        **evidence_scope,
        "ql424_acceptance_digest": accepted_424,
        "ql430_masters_digest": masters_digest,
        "ql430_owner_digest": _digest(ql430_owner),
    }
    if not all(
        (
            _callback(attest_three_master_custody, **custody),
            _callback(attest_owner_runtime, **custody),
            _callback(attest_external_custody, **custody),
        )
    ):
        return await fail("QL430_INDEPENDENT_RUNTIME_CUSTODY_NOT_ATTESTED")
    accepted_digest = _digest(custody)
    if not pilot_journal.claim(
        monitor, p["ceremonyId"], "ACCEPTED", accepted_digest, attempt_digest
    ):
        return await fail("QL430_DURABLE_RUNTIME_ACCEPTANCE_FAILED")
    if pilot_journal.read(monitor, p["ceremonyId"], "ACCEPTED") != {
        "digest": accepted_digest,
        "previous": attempt_digest,
    }:
        return await fail("QL430_ACCEPTED_RECEIPT_REOPEN_MISMATCH")
    return {
        "state": "DURABLE_VERIFIED_THREE_MASTER_REENTRY_ISOLATED_PILOT",
        "accepted": True,
        "connection": "VERIFIED_CONNECTED_PILOT",
        "receiver": "ISOLATED_ONE_TEST_ON",
        "runtimeUptime": "SINGLE_SIGNED_RUNTIME_SNAPSHOT_NOT_CONTINUOUS_UPTIME",
        "ownerAcceptance": "DUAL_SIGNED_FOR_ISOLATED_PILOT",
        "masterSync": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "sourceId": "rosevear-ai-hub",
        "episodeId": p["episodeId"],
        "ceremonyId": p["ceremonyId"],
        "sourceRevision": p["sourceRevision"],
        "controllerRevision": p["controllerRevision"],
        "masterCount": 3,
        "acceptedDigest": accepted_digest,
        "independentReceiverDigest": receiver_digest,
        "ql429WitnessDigest": witness["recordDigest"],
    }


def reconcile_master_evidence321(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Owner status is source-only HOLD; never publish protected live pilot proof."""
    return {
        **reconcile_master_evidence320(monitor),
        "schema": "rosevear.ai-hub.master360-ql430-runtime-pilot321.v1",
        "sourceBuild": 321,
        "source320MainAtReconciliation": SOURCE320_MAIN,
        "commsQl430ContractAtReconciliation": COMMS430_CONTRACT,
        "controller380MainAtReconciliation": CONTROLLER380_MAIN,
        "ql430ProtectedOperator": "HOLD_NO_REAL_ORIGINAL_HOST_SUPERVISED_SESSION",
        "ql430PriorQl429Witness": "HOLD_NO_FRESH_SIGNED_WITNESS_CUSTODY",
        "ql430NewQl424Ceremony": "HOLD_NO_NEW_DUAL_SIGNED_ONE_TEST_AUTHORITY",
        "ql430SignedQl423Replay": "HOLD_NO_FRESH_PROTECTED_REPLAY_RESTORATION",
        "ql430ReceiverExecution": "HOLD_NO_ACTUAL_ORIGINAL_HOST_ONE_TEST",
        "ql430IndependentReceiver": "HOLD_NO_SEPARATE_FRESH_SIGNED_RUNTIME_ON",
        "ql430Ql424ThreeMaster": "HOLD_NO_QL424_LIVE_THREE_MASTER_ACCEPTANCE",
        "ql430ThreeMasterRuntime": "HOLD_NO_QL430_SEPARATE_THREE_MASTER_REPORTS",
        "ql430DualOwnerRuntime": "HOLD_NO_DUAL_SIGNED_LIVE_OWNER_ACCEPTANCE",
        "ql430DurablePilot": "HOLD_NO_ONE_USE_INDEPENDENT_RUNTIME_CUSTODY",
        "ql430FailClosedShutdown": "HOLD_NO_SIGNED_SHUTDOWN_READBACK",
        "receiver": "OFF",
        "connection": "HOLD",
        "ownerAcceptance": "HOLD",
        "masterSync": "HOLD",
        "runtimeUptime": "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING",
    }
