"""Build 326 — QL-435 signed isolated ON pilot evidence; never a receiver enable API.

A protected original-host caller must supply real pinned signer custody and
an independently enforced <=15-second fail-closed shutdown. This module only
reads independently signed observations. Failed post-PENDING checks require
manual supervised receiver isolation and never assert OFF or CONNECTED.
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
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _id
from rosevear_ai_hub.master_shell_acceptance321 import ProtectedPilotJournal321, _dual
from rosevear_ai_hub.master_shell_acceptance322 import ProtectedContinuityJournal322, _accepted
from rosevear_ai_hub.master_shell_acceptance323 import ProtectedRecoveryReviewJournal323
from rosevear_ai_hub.master_shell_acceptance324 import (
    ProtectedNewCeremonyJournal324,
    _match,
    _signed,
)
from rosevear_ai_hub.master_shell_acceptance325 import (
    ProtectedReadinessJournal325,
    reconcile_master_evidence325,
)
from rosevear_ai_hub.master_shell_acceptance325 import _prior as _prior325
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE325_MAIN = "453b00a404d2392dac22ded18ee3f9f77a2466c4"
COMMS435_MAIN = "c2ec4dba1f403b5d837d45f758cee6dba83f50fd"
MAX_LEASE_MS = 15_000
REQUEST_ACTION = "ONE_ISOLATED_PILOT_ON_CHALLENGE_WITH_FAIL_CLOSED_SHUTDOWN_NO_CONNECTED"
PRE_PERMIT_ACTION = "PERMIT_ONE_ISOLATED_ON_CHALLENGE_ONLY_NO_GENERAL_CONNECTED"
OWNER_ACTION = "RECOGNIZE_SINGLE_PILOT_ON_EVIDENCE_ONLY_MANDATORY_OFF_RECHECK"
REQUEST = "rosevear.ai-hub.ql435.isolated-pilot-enrollment-request.v1"
ENROLLMENT = "rosevear.ai-hub.ql435.original-host-fresh-ceremony-enrollment.v1"
PRE_OFF = "rosevear.ai-hub.ql435.independent-pre-on-off.v1"
PRE_PERMIT = "rosevear.ai-hub.ql435.owner-single-test-prepermit.v1"
HOST_ON = "rosevear.ai-hub.ql435.original-host-on-challenge.v1"
INDEPENDENT_ON = "rosevear.ai-hub.ql435.independent-on-challenge-witness.v1"
MASTER = "rosevear.ai-hub.ql435.master-isolated-pilot-decision.v1"
OWNER = "rosevear.ai-hub.ql435.dual-owner-isolated-pilot-decision.v1"


class ProtectedIsolatedPilotJournal326:
    """One-use PENDING then ACCEPTED SQLite FULL sync on original host only.

    The PENDING row is never cleared if the process fails after preauthorization.
    A crash, partial incident, corrupt row or repeated ceremony requires fresh
    supervised isolation and a separate new ceremony, not a retry.
    """

    def __init__(self, path: Path):
        self.path = path

    @staticmethod
    def _read(db: sqlite3.Connection, ceremony: str, stage: str):
        row = db.execute(
            "SELECT request_digest,evidence_digest,receipt_digest "
            "FROM pilot326 WHERE ceremony_id=? AND stage=?",
            (ceremony, stage),
        ).fetchone()
        if row is None:
            return None
        request_digest, evidence_digest, receipt_digest = row
        if not all(_sha(x) for x in row):
            raise ValueError("QL435_PILOT_RECEIPT_INVALID")
        if (
            _digest(
                {
                    "ceremonyId": ceremony,
                    "stage": stage,
                    "requestDigest": request_digest,
                    "evidenceDigest": evidence_digest,
                }
            )
            != receipt_digest
        ):
            raise ValueError("QL435_PILOT_RECEIPT_TAMPERED")
        return {
            "requestDigest": request_digest,
            "evidenceDigest": evidence_digest,
            "receiptDigest": receipt_digest,
        }

    def read(self, monitor: PersistentReeMonitor304, ceremony: str, stage: str):
        if not (
            _on_ree(monitor)
            and _id(ceremony)
            and stage in ("PENDING", "ACCEPTED")
            and self.path.is_file()
        ):
            return None
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                return self._read(db, ceremony, stage)
        except (OSError, sqlite3.Error, ValueError, TypeError):
            raise ValueError("QL435_PILOT_RECEIPT_UNREADABLE") from None

    def claim_once(
        self,
        monitor: PersistentReeMonitor304,
        ceremony: str,
        stage: str,
        request_digest: str,
        evidence_digest: str,
    ):
        if not (
            _on_ree(monitor)
            and _id(ceremony)
            and stage in ("PENDING", "ACCEPTED")
            and _sha(request_digest)
            and _sha(evidence_digest)
            and self.path.is_absolute()
        ):
            return None
        receipt_digest = _digest(
            {
                "ceremonyId": ceremony,
                "stage": stage,
                "requestDigest": request_digest,
                "evidenceDigest": evidence_digest,
            }
        )
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            if self.path.parent.is_symlink() or self.path.is_symlink():
                return None
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    "CREATE TABLE IF NOT EXISTS pilot326 ("
                    "ceremony_id TEXT NOT NULL,stage TEXT NOT NULL,"
                    "request_digest TEXT NOT NULL,evidence_digest TEXT NOT NULL,"
                    "receipt_digest TEXT NOT NULL,PRIMARY KEY(ceremony_id,stage))"
                )
                if stage == "PENDING":
                    exists = db.execute(
                        "SELECT COUNT(*) FROM pilot326 WHERE ceremony_id=?", (ceremony,)
                    ).fetchone()[0]
                    if exists:
                        return None
                else:
                    pending = self._read(db, ceremony, "PENDING")
                    if pending is None or pending["requestDigest"] != request_digest:
                        return None
                    if self._read(db, ceremony, "ACCEPTED") is not None:
                        return None
                db.execute(
                    "INSERT INTO pilot326 VALUES (?,?,?,?,?)",
                    (ceremony, stage, request_digest, evidence_digest, receipt_digest),
                )
            reread = self.read(monitor, ceremony, stage)
            return reread if reread and reread["receiptDigest"] == receipt_digest else None
        except (OSError, sqlite3.Error, ValueError, TypeError):
            return None


def _pins(keys: Any) -> bool:
    roles = ("host", "pre_off", "on_witness", "owner", "reviewer", *MASTERS)
    return (
        isinstance(keys, dict)
        and set(keys) == set(roles)
        and all(
            isinstance(keys[k], tuple) and len(keys[k]) == 2 and _public_ed25519(*keys[k])
            for k in roles
        )
        and len({keys[k][1] for k in roles}) == len(roles)
    )


def _prior(
    monitor: PersistentReeMonitor304,
    scope: Any,
    ql432_decision: Any,
    ql433_precheck: Any,
    ql434_readiness: Any,
    incident_journal: ProtectedContinuityJournal322,
    review_journal: ProtectedRecoveryReviewJournal323,
    precheck_journal: ProtectedNewCeremonyJournal324,
    readiness_journal: ProtectedReadinessJournal325,
):
    if not (
        isinstance(ql434_readiness, dict)
        and ql434_readiness.get("accepted") is True
        and ql434_readiness.get("state") == "DURABLE_QL434_SIGNED_NEW_CEREMONY_READINESS_HANDOFF"
        and ql434_readiness.get("connection") == "HOLD"
        and ql434_readiness.get("receiver") == "OFF_VERIFIED_SIGNED_READBACK"
        and ql434_readiness.get("activationAuthorized") is False
        and ql434_readiness.get("ownerAcceptance") == "DUAL_SIGNED_READINESS_ONLY"
        and ql434_readiness.get("slaveGate") == "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
        and ql434_readiness.get("masterCount") == 3
        and ql434_readiness.get("permittedNextAction")
        == "NEW_QL429_QL430_FRESH_SIGNED_ENROLLMENT_NOT_ACTIVATED"
        and ql434_readiness.get("incidentId") == ql433_precheck.get("incidentId")
        and ql434_readiness.get("nextCeremonyId") == ql433_precheck.get("nextCeremonyId")
        and ql434_readiness.get("nextEpisodeId") == ql433_precheck.get("nextEpisodeId")
        and ql434_readiness["nextCeremonyId"] != scope["ceremonyId"]
        and ql434_readiness["nextEpisodeId"] != scope["episodeId"]
        and _id(ql434_readiness.get("authorityId"))
        and _sha(ql434_readiness.get("handoffWitnessDigest"))
        and _sha(ql434_readiness.get("readinessReceiptDigest"))
        and isinstance(readiness_journal, ProtectedReadinessJournal325)
    ):
        return None
    previous = _prior325(
        monitor,
        scope,
        ql432_decision,
        ql433_precheck,
        incident_journal,
        review_journal,
        precheck_journal,
    )
    if not previous:
        return None
    try:
        readiness = readiness_journal.read(monitor, ql434_readiness["incidentId"])
    except ValueError:
        return None
    if not readiness or readiness["receiptDigest"] != ql434_readiness["readinessReceiptDigest"]:
        return None
    return {"chain": previous, "readiness": readiness}


def _signed_after(envelope, fields, schema, key, now, earliest, timestamp):
    return _signed(envelope, fields, schema, key, now, earliest, timestamp)


def run_ql435_isolated_pilot_evidence326(
    monitor: PersistentReeMonitor304,
    pilot_acceptance: Any,
    ql432_decision: Any,
    ql433_precheck: Any,
    ql434_readiness: Any,
    challenge_id: str,
    challenge_nonce: str,
    lease_expires_at: str,
    pre_permit: Any,
    master_reports: Any,
    owner_decision: Any,
    *,
    pilot_journal: ProtectedPilotJournal321,
    incident_journal: ProtectedContinuityJournal322,
    review_journal: ProtectedRecoveryReviewJournal323,
    precheck_journal: ProtectedNewCeremonyJournal324,
    readiness_journal: ProtectedReadinessJournal325,
    isolated_journal: ProtectedIsolatedPilotJournal326,
    keys: dict[str, tuple[bytes, str]],
    read_host_enrollment: Callable[..., Any] | None,
    read_independent_pre_off: Callable[..., Any] | None,
    read_host_on_evidence: Callable[..., Any] | None,
    read_independent_on_evidence: Callable[..., Any] | None,
    attest_operator: Callable[..., bool] | None,
    attest_signed_ql434: Callable[..., bool] | None,
    attest_hard_shutdown_armed: Callable[..., bool] | None,
    attest_challenge_fresh: Callable[..., bool] | None,
    attest_owner_custody: Callable[..., bool] | None,
    now_ms: int | None = None,
):
    """Evidence intake only. Never calls any receiver enable/disable adapter."""

    def hold(reason: str, post_pending: bool = False):
        return {
            **_hold(reason),
            "receiver": (
                "UNKNOWN_OR_ON_SUPERVISED_FAIL_CLOSED_SHUTDOWN_REQUIRED"
                if post_pending
                else "OFF_NOT_ACTIVATED_BY_QL435"
            ),
            "connection": "HOLD",
            "activationAuthorized": False,
            "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
            "manualReceiverIsolationRequired": post_pending,
        }

    now = int(time.time() * 1000) if now_ms is None else now_ms
    expiry = _timestamp(lease_expires_at)
    scope = _accepted(monitor, pilot_acceptance, pilot_journal)
    if not (
        scope
        and type(now) is int
        and _id(challenge_id)
        and _id(challenge_nonce)
        and challenge_id != challenge_nonce
        and expiry is not None
        and 0 < expiry - now <= MAX_LEASE_MS
        and _utc(expiry) == lease_expires_at
        and isinstance(isolated_journal, ProtectedIsolatedPilotJournal326)
        and _pins(keys)
        and all(
            callable(x)
            for x in (
                read_host_enrollment,
                read_independent_pre_off,
                read_host_on_evidence,
                read_independent_on_evidence,
            )
        )
    ):
        return hold("HOLD_QL435_ORIGINAL_HOST_AUTHORITY_FRESH_LEASE_OR_PINS_MISSING")
    prior = _prior(
        monitor,
        scope,
        ql432_decision,
        ql433_precheck,
        ql434_readiness,
        incident_journal,
        review_journal,
        precheck_journal,
        readiness_journal,
    )
    if not prior:
        return hold("HOLD_QL435_EXACT_QL431_TO_QL434_PRIVATE_CUSTODY_INVALID")
    ceremony = ql434_readiness["nextCeremonyId"]
    episode = ql434_readiness["nextEpisodeId"]
    if challenge_id in (ceremony, episode, ql434_readiness["authorityId"]) or challenge_nonce in (
        ceremony,
        episode,
        ql434_readiness["authorityId"],
    ):
        return hold("HOLD_QL435_REUSED_CHALLENGE_OR_AUTHORITY")
    try:
        if isolated_journal.read(monitor, ceremony, "PENDING") or isolated_journal.read(
            monitor, ceremony, "ACCEPTED"
        ):
            return hold("HOLD_QL435_ISOLATED_CEREMONY_PREVIOUSLY_CONSUMED")
    except ValueError:
        return hold("HOLD_QL435_PILOT_LEDGER_UNREADABLE")
    request = {
        "schema": REQUEST,
        "scope": scope,
        "incidentId": ql434_readiness["incidentId"],
        "nextCeremonyId": ceremony,
        "nextEpisodeId": episode,
        "sourceRevision": scope["sourceRevision"],
        "controllerRevision": scope["controllerRevision"],
        "originalHostId": "DESKTOP-AE894KC",
        "authorityId": ql434_readiness["authorityId"],
        "ql431CheckpointDigest": prior["chain"]["checkpoint"]["recordDigest"],
        "ql432OwnerReceiptDigest": prior["chain"]["review"]["receiptDigest"],
        "ql433PrecheckReceiptDigest": prior["chain"]["precheck"]["receiptDigest"],
        "ql434ReadinessReceiptDigest": prior["readiness"]["receiptDigest"],
        "ql434HandoffWitnessDigest": ql434_readiness["handoffWitnessDigest"],
        "source325Main": SOURCE325_MAIN,
        "challengeId": challenge_id,
        "challengeNonce": challenge_nonce,
        "leaseExpiresAt": lease_expires_at,
        "requestedAction": REQUEST_ACTION,
    }
    request_digest = _digest(request)
    callback_evidence = {
        "original_host": "DESKTOP-AE894KC",
        "original_incident": request["incidentId"],
        "new_ceremony": ceremony,
        "new_episode": episode,
        "authority_id": request["authorityId"],
        "challenge_id": challenge_id,
        "challenge_nonce": challenge_nonce,
        "lease_expires_at": lease_expires_at,
        "request_digest": request_digest,
    }
    if not all(
        (
            _callback(attest_operator, **callback_evidence),
            _callback(attest_signed_ql434, **callback_evidence),
            _callback(attest_hard_shutdown_armed, **callback_evidence),
            _callback(attest_challenge_fresh, **callback_evidence),
            _callback(attest_owner_custody, **callback_evidence),
        )
    ):
        return hold("HOLD_QL435_PROTECTED_LEASE_OR_INDEPENDENT_AUTHORITY_UNVERIFIED")
    try:
        enrollment_env = read_host_enrollment(request=request, request_digest=request_digest)
    except Exception:
        return hold("HOLD_QL435_ORIGINAL_HOST_OFF_ENROLLMENT_UNAVAILABLE")
    enrollment = _signed_after(
        enrollment_env,
        {
            "requestDigest",
            "scope",
            "incidentId",
            "challengeId",
            "challengeNonce",
            "nextCeremonyId",
            "nextEpisodeId",
            "hostMachineId",
            "receiverState",
            "failClosedShutdownArmed",
            "leaseExpiresAt",
            "enrollmentStatus",
            "enrolledAt",
        },
        ENROLLMENT,
        keys["host"],
        now,
        now - 60_000,
        "enrolledAt",
    )
    if (
        not _match(
            enrollment,
            {
                "requestDigest": request_digest,
                "scope": scope,
                "incidentId": request["incidentId"],
                "challengeId": challenge_id,
                "challengeNonce": challenge_nonce,
                "nextCeremonyId": ceremony,
                "nextEpisodeId": episode,
                "hostMachineId": "DESKTOP-AE894KC",
                "receiverState": "OFF",
                "failClosedShutdownArmed": True,
                "leaseExpiresAt": lease_expires_at,
                "enrollmentStatus": "FRESH_ISOLATED_ONE_TEST_ENROLLMENT_NOT_ENABLED",
            },
        )
        or _timestamp(enrollment["enrolledAt"]) >= expiry
    ):
        return hold("HOLD_QL435_HOST_SIGNED_OFF_ENROLLMENT_OR_HARD_SHUTDOWN_INVALID")
    try:
        pre_off_env = read_independent_pre_off(
            request=request,
            host_enrollment_digest=_digest(enrollment),
        )
    except Exception:
        return hold("HOLD_QL435_INDEPENDENT_PRE_CHALLENGE_OFF_UNAVAILABLE")
    pre_off = _signed_after(
        pre_off_env,
        {
            "challengeId",
            "challengeNonce",
            "hostEnrollmentDigest",
            "leaseExpiresAt",
            "receiverState",
            "observedAt",
        },
        PRE_OFF,
        keys["pre_off"],
        now,
        _timestamp(enrollment["enrolledAt"]),
        "observedAt",
    )
    if (
        not _match(
            pre_off,
            {
                "challengeId": challenge_id,
                "challengeNonce": challenge_nonce,
                "hostEnrollmentDigest": _digest(enrollment),
                "leaseExpiresAt": lease_expires_at,
                "receiverState": "OFF",
            },
        )
        or _timestamp(pre_off["observedAt"]) >= expiry
    ):
        return hold("HOLD_QL435_INDEPENDENT_PRE_ON_OFF_INVALID")
    pre_authorized = _dual(
        pre_permit,
        {
            "schema",
            "requestDigest",
            "hostEnrollmentDigest",
            "preOffDigest",
            "challengeId",
            "challengeNonce",
            "nextCeremonyId",
            "nextEpisodeId",
            "leaseExpiresAt",
            "action",
            "ownerId",
            "reviewerId",
            "approvedAt",
        },
        PRE_PERMIT,
        PRE_PERMIT_ACTION,
        *keys["owner"],
        *keys["reviewer"],
        now,
        _timestamp(pre_off["observedAt"]),
        "approvedAt",
    )
    if (
        not _match(
            pre_authorized,
            {
                "requestDigest": request_digest,
                "hostEnrollmentDigest": _digest(enrollment),
                "preOffDigest": _digest(pre_off),
                "challengeId": challenge_id,
                "challengeNonce": challenge_nonce,
                "nextCeremonyId": ceremony,
                "nextEpisodeId": episode,
                "leaseExpiresAt": lease_expires_at,
            },
        )
        or _timestamp(pre_authorized["approvedAt"]) >= expiry
    ):
        return hold("HOLD_QL435_DUAL_SIGNED_SINGLE_PILOT_PREPERMIT_INVALID")
    current = _prior(
        monitor,
        scope,
        ql432_decision,
        ql433_precheck,
        ql434_readiness,
        incident_journal,
        review_journal,
        precheck_journal,
        readiness_journal,
    )
    if current != prior:
        return hold("HOLD_QL435_PRIOR_CUSTODY_DRIFT_BEFORE_PENDING")
    pending = isolated_journal.claim_once(
        monitor,
        ceremony,
        "PENDING",
        request_digest,
        _digest(
            {
                "enrollmentDigest": _digest(enrollment),
                "preOffDigest": _digest(pre_off),
                "prePermitDigest": _digest(pre_authorized),
            }
        ),
    )
    if pending is None:
        return hold("HOLD_QL435_PENDING_NOT_DURABLE_OR_CEREMONY_REPLAYED")
    # After the durable PENDING marker, never infer OFF on failure, timeout or
    # process interruption; the host-side hard shutdown must be independently
    # enforced and fresh OFF evidence must follow in a different ceremony.
    try:
        on_env = read_host_on_evidence(
            request=request,
            pre_permit_digest=_digest(pre_authorized),
            pending_receipt_digest=pending["receiptDigest"],
        )
    except Exception:
        return hold("HOLD_QL435_HOST_ON_EVIDENCE_UNAVAILABLE_SHUTDOWN_REQUIRED", True)
    host_on = _signed_after(
        on_env,
        {
            "requestDigest",
            "challengeId",
            "challengeNonce",
            "prePermitDigest",
            "hostMachineId",
            "nextCeremonyId",
            "nextEpisodeId",
            "leaseExpiresAt",
            "receiverState",
            "isolatedMode",
            "failClosedShutdownArmed",
            "observedAt",
        },
        HOST_ON,
        keys["host"],
        now,
        _timestamp(pre_authorized["approvedAt"]),
        "observedAt",
    )
    if (
        not _match(
            host_on,
            {
                "requestDigest": request_digest,
                "challengeId": challenge_id,
                "challengeNonce": challenge_nonce,
                "prePermitDigest": _digest(pre_authorized),
                "hostMachineId": "DESKTOP-AE894KC",
                "nextCeremonyId": ceremony,
                "nextEpisodeId": episode,
                "leaseExpiresAt": lease_expires_at,
                "receiverState": "ISOLATED_ONE_TEST_ON",
                "isolatedMode": True,
                "failClosedShutdownArmed": True,
            },
        )
        or _timestamp(host_on["observedAt"]) >= expiry
    ):
        return hold("HOLD_QL435_SIGNED_HOST_ON_CHALLENGE_INVALID_SHUTDOWN_REQUIRED", True)
    try:
        witnessed_env = read_independent_on_evidence(
            request=request,
            host_on_digest=_digest(host_on),
        )
    except Exception:
        return hold("HOLD_QL435_INDEPENDENT_ON_WITNESS_UNAVAILABLE_SHUTDOWN_REQUIRED", True)
    witness = _signed_after(
        witnessed_env,
        {
            "challengeId",
            "challengeNonce",
            "hostOnDigest",
            "nextCeremonyId",
            "nextEpisodeId",
            "leaseExpiresAt",
            "receiverState",
            "observation",
            "observedAt",
        },
        INDEPENDENT_ON,
        keys["on_witness"],
        now,
        _timestamp(host_on["observedAt"]),
        "observedAt",
    )
    if (
        not _match(
            witness,
            {
                "challengeId": challenge_id,
                "challengeNonce": challenge_nonce,
                "hostOnDigest": _digest(host_on),
                "nextCeremonyId": ceremony,
                "nextEpisodeId": episode,
                "leaseExpiresAt": lease_expires_at,
                "receiverState": "ISOLATED_ONE_TEST_ON",
                "observation": "INDEPENDENT_SINGLE_NONCE_BOUND_PILOT_ON_SEEN",
            },
        )
        or _timestamp(witness["observedAt"]) >= expiry
    ):
        return hold("HOLD_QL435_INDEPENDENT_ON_WITNESS_INVALID_SHUTDOWN_REQUIRED", True)
    if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
        return hold("HOLD_QL435_THREE_SIGNED_MASTER_REPORTS_MISSING_SHUTDOWN_REQUIRED", True)
    masters = []
    for master in MASTERS:
        m = _signed_after(
            master_reports[master],
            {
                "masterId",
                "requestDigest",
                "challengeId",
                "challengeNonce",
                "independentOnWitnessDigest",
                "nextCeremonyId",
                "nextEpisodeId",
                "leaseExpiresAt",
                "status",
                "observedAt",
            },
            MASTER,
            keys[master],
            now,
            _timestamp(witness["observedAt"]),
            "observedAt",
        )
        if (
            not _match(
                m,
                {
                    "masterId": master,
                    "requestDigest": request_digest,
                    "challengeId": challenge_id,
                    "challengeNonce": challenge_nonce,
                    "independentOnWitnessDigest": _digest(witness),
                    "nextCeremonyId": ceremony,
                    "nextEpisodeId": episode,
                    "leaseExpiresAt": lease_expires_at,
                    "status": "SIGNED_ISOLATED_ON_EVIDENCE_REVIEW_ONLY_NO_GENERAL_CONNECTED",
                },
            )
            or _timestamp(m["observedAt"]) >= expiry
        ):
            return hold("HOLD_QL435_THREE_MASTER_SIGNED_DECISION_INVALID_SHUTDOWN_REQUIRED", True)
        masters.append(m)
    owner = _dual(
        owner_decision,
        {
            "schema",
            "requestDigest",
            "challengeId",
            "challengeNonce",
            "independentOnWitnessDigest",
            "mastersDigest",
            "nextCeremonyId",
            "nextEpisodeId",
            "leaseExpiresAt",
            "action",
            "ownerId",
            "reviewerId",
            "decidedAt",
        },
        OWNER,
        OWNER_ACTION,
        *keys["owner"],
        *keys["reviewer"],
        now,
        max(_timestamp(m["observedAt"]) for m in masters),
        "decidedAt",
    )
    if (
        not _match(
            owner,
            {
                "requestDigest": request_digest,
                "challengeId": challenge_id,
                "challengeNonce": challenge_nonce,
                "independentOnWitnessDigest": _digest(witness),
                "mastersDigest": _digest(masters),
                "nextCeremonyId": ceremony,
                "nextEpisodeId": episode,
                "leaseExpiresAt": lease_expires_at,
            },
        )
        or _timestamp(owner["decidedAt"]) >= expiry
    ):
        return hold("HOLD_QL435_DUAL_OWNER_ON_REVIEW_INVALID_SHUTDOWN_REQUIRED", True)
    current = _prior(
        monitor,
        scope,
        ql432_decision,
        ql433_precheck,
        ql434_readiness,
        incident_journal,
        review_journal,
        precheck_journal,
        readiness_journal,
    )
    try:
        reread_pending = isolated_journal.read(monitor, ceremony, "PENDING")
    except ValueError:
        reread_pending = None
    if current != prior or reread_pending != pending:
        return hold("HOLD_QL435_PRIOR_OR_PENDING_CUSTODY_DRIFT_SHUTDOWN_REQUIRED", True)
    accepted = isolated_journal.claim_once(
        monitor,
        ceremony,
        "ACCEPTED",
        request_digest,
        _digest(
            {
                "pendingReceiptDigest": pending["receiptDigest"],
                "hostOnDigest": _digest(host_on),
                "independentOnWitnessDigest": _digest(witness),
                "mastersDigest": _digest(masters),
                "ownerDecisionDigest": _digest(owner),
            }
        ),
    )
    if accepted is None:
        return hold("HOLD_QL435_ACCEPTED_ON_EVIDENCE_NOT_DURABLE_SHUTDOWN_REQUIRED", True)
    return {
        **hold("ISOLATED_ON_EVIDENCE_RECORDED_MANDATORY_OFF_RECHECK", True),
        "accepted": True,
        "state": "DURABLE_QL435_ISOLATED_PILOT_ON_EVIDENCE_DECISION",
        "receiver": "ISOLATED_ONE_TEST_ON_SIGNED_WITNESS_ONLY",
        "ownerAcceptance": "DUAL_SIGNED_SINGLE_PILOT_EVIDENCE_REVIEW",
        "incidentId": request["incidentId"],
        "nextCeremonyId": ceremony,
        "nextEpisodeId": episode,
        "challengeId": challenge_id,
        "challengeNonce": challenge_nonce,
        "leaseExpiresAt": lease_expires_at,
        "masterCount": 3,
        "pendingReceiptDigest": pending["receiptDigest"],
        "acceptedReceiptDigest": accepted["receiptDigest"],
        "independentOnWitnessDigest": _digest(witness),
        "permittedNextAction": (
            "SUPERVISED_FAIL_CLOSED_OFF_AND_SIGNED_RUNTIME_CONTINUITY_RECHECK_ONLY"
        ),
        "connection": "HOLD",
        "activationAuthorized": False,
        "manualReceiverIsolationRequired": True,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }


def reconcile_master_evidence326(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Never infer physical pilot ON, OFF, uptime or CONNECTED from source CI."""
    return {
        **reconcile_master_evidence325(monitor),
        "schema": "rosevear.ai-hub.master360-ql435-isolated-pilot326.v1",
        "sourceBuild": 326,
        "source325MainAtReconciliation": SOURCE325_MAIN,
        "commsQl435ContractAtReconciliation": COMMS435_MAIN,
        "ql435Ql431To434ExactCustody": "HOLD_NO_PROTECTED_ORIGINAL_HOST_READBACK",
        "ql435NewCeremonyEnrollment": "HOLD_NO_SIGNED_FRESH_HOST_OFF_ENROLLMENT",
        "ql435BoundedLease": "HOLD_NO_REAL_HARD_15_SECOND_SHUTDOWN",
        "ql435IndependentPreOnOff": "HOLD_NO_SIGNED_SEPARATE_PRE_ON_OFF",
        "ql435DualOwnerPrePermit": "HOLD_NO_SIGNED_SINGLE_PILOT_PREPERMIT",
        "ql435OneUsePending": "HOLD_NO_DURABLE_PRE_CHALLENGE_PENDING",
        "ql435OriginalHostOnChallenge": "HOLD_NO_FRESH_HOST_SIGNED_ISOLATED_ON",
        "ql435IndependentOnWitness": "HOLD_NO_INDEPENDENT_SIGNED_ISOLATED_ON",
        "ql435ThreeMasterPilotReview": "HOLD_NO_THREE_SIGNED_PILOT_REPORTS",
        "ql435DualOwnerPilotDecision": "HOLD_NO_DUAL_SIGNED_EVIDENCE_ONLY_DECISION",
        "ql435OneUseAccepted": "HOLD_NO_DURABLE_ACCEPTED_ON_EVIDENCE",
        "ql435MandatoryPostPilotOff": "HOLD_NO_SUPERVISED_POST_PILOT_ISOLATION",
        "activationAuthorized": False,
        "receiver": "OFF_NOT_ACTIVATED_BY_QL435",
        "connection": "HOLD",
        "ownerAcceptance": "HOLD",
        "masterSync": "HOLD",
        "runtimeUptime": "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING",
    }
