"""Build 325: QL-434 original-host signed readiness handoff; no receiver activation.

Private original-host caller only. External issuer, independent witness, original
Windows host, receiver and owners must be separately enrolled and verified.
All operational status remains OFF/HOLD; browser fields have no authority.
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
from rosevear_ai_hub.master_shell_acceptance322 import (
    ProtectedContinuityJournal322,
    _accepted,
)
from rosevear_ai_hub.master_shell_acceptance323 import ProtectedRecoveryReviewJournal323
from rosevear_ai_hub.master_shell_acceptance324 import (
    ProtectedNewCeremonyJournal324,
    _match,
    _ql432_decision_ok,
    _signed,
    reconcile_master_evidence324,
)
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

SOURCE324_MAIN = "1fd1f527f8c181f4077b353e34b0bcdf9c801e31"
COMMS434_MAIN = "f87dd73c608bb9615d1928c1070a3dd1d777ffaf"
PREPARE_ACTION = "PREPARE_NEW_SUPERVISED_QL429_QL430_CEREMONY_NO_RECEIVER_ACTIVATION"
OWNER_ACTION = "AUTHORIZE_NEW_CEREMONY_READINESS_ONLY_RECEIVER_OFF_NO_ACTIVATION"
EXPORT = "rosevear.ai-hub.ql434.new-ceremony-authority-export.v1"
ISSUER = "rosevear.ai-hub.ql434.independent-authority-handoff.v1"
WITNESS = "rosevear.ai-hub.ql434.independent-authority-witness.v1"
HOST = "rosevear.ai-hub.ql434.original-host-new-ceremony-readiness.v1"
RECEIVER = "rosevear.ai-hub.ql434.independent-receiver-off.v1"
MASTER = "rosevear.ai-hub.ql434.master-reentry-readiness.v1"
OWNER = "rosevear.ai-hub.ql434.dual-owner-new-ceremony-readiness.v1"


class ProtectedReadinessJournal325:
    """Original-host one-use journal; never a substitute for external custody."""

    def __init__(self, path: Path):
        self.path = path

    @staticmethod
    def _read(db: sqlite3.Connection, incident: str):
        row = db.execute(
            "SELECT export_digest, evidence_digest, receipt_digest "
            "FROM readiness325 WHERE incident_id=?",
            (incident,),
        ).fetchone()
        if row is None:
            return None
        export_digest, evidence_digest, receipt_digest = row
        if not all(_sha(x) for x in row):
            raise ValueError("QL434_READINESS_RECEIPT_INVALID")
        expected = _digest(
            {
                "incidentId": incident,
                "exportDigest": export_digest,
                "evidenceDigest": evidence_digest,
            }
        )
        if expected != receipt_digest:
            raise ValueError("QL434_READINESS_RECEIPT_TAMPERED")
        return {
            "exportDigest": export_digest,
            "evidenceDigest": evidence_digest,
            "receiptDigest": receipt_digest,
        }

    def read(self, monitor: PersistentReeMonitor304, incident: str):
        if not (_on_ree(monitor) and _id(incident) and self.path.is_file()):
            return None
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                return self._read(db, incident)
        except (OSError, sqlite3.Error, ValueError, TypeError):
            raise ValueError("QL434_READINESS_RECEIPT_UNREADABLE") from None

    def claim_once(
        self,
        monitor: PersistentReeMonitor304,
        incident: str,
        export_digest: str,
        evidence_digest: str,
    ):
        if not (
            _on_ree(monitor)
            and _id(incident)
            and _sha(export_digest)
            and _sha(evidence_digest)
            and self.path.is_absolute()
        ):
            return None
        receipt_digest = _digest(
            {
                "incidentId": incident,
                "exportDigest": export_digest,
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
                    "CREATE TABLE IF NOT EXISTS readiness325 ("
                    "incident_id TEXT PRIMARY KEY, export_digest TEXT NOT NULL,"
                    "evidence_digest TEXT NOT NULL, receipt_digest TEXT NOT NULL)"
                )
                if self._read(db, incident) is not None:
                    return None
                db.execute(
                    "INSERT INTO readiness325 VALUES (?,?,?,?)",
                    (incident, export_digest, evidence_digest, receipt_digest),
                )
            saved = self.read(monitor, incident)
            return saved if saved and saved["receiptDigest"] == receipt_digest else None
        except (OSError, sqlite3.Error, ValueError, TypeError):
            return None


def _pins(keys: Any) -> bool:
    roles = ("issuer", "witness", "host", "receiver", "owner", "reviewer", *MASTERS)
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
    decision: Any,
    precheck: Any,
    incident_journal: ProtectedContinuityJournal322,
    review_journal: ProtectedRecoveryReviewJournal323,
    precheck_journal: ProtectedNewCeremonyJournal324,
):
    if not (
        isinstance(precheck, dict)
        and precheck.get("accepted") is True
        and precheck.get("state") == "DURABLE_QL433_NEW_CEREMONY_PRECHECK_ONLY"
        and precheck.get("receiver") == "OFF_VERIFIED_SIGNED_READBACK"
        and precheck.get("connection") == "HOLD"
        and precheck.get("ownerAcceptance") == "DUAL_SIGNED_NEW_CEREMONY_PRECHECK_ONLY"
        and precheck.get("slaveGate") == "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
        and precheck.get("nextStep") == "NEW_QL429_QL430_OWNER_SUPERVISED_CEREMONY_ONLY"
        and _id(precheck.get("incidentId"))
        and _id(precheck.get("nextCeremonyId"))
        and _id(precheck.get("nextEpisodeId"))
        and precheck["nextCeremonyId"] not in (scope["ceremonyId"], scope["episodeId"])
        and precheck["nextEpisodeId"] not in (scope["ceremonyId"], scope["episodeId"])
        and precheck["nextCeremonyId"] != precheck["nextEpisodeId"]
        and all(
            _sha(precheck.get(field))
            for field in (
                "exportDigest",
                "externalAnchorDigest",
                "independentReadbackDigest",
                "precheckReceiptDigest",
            )
        )
    ):
        return None
    try:
        checkpoint = incident_journal.read(monitor, scope)
        review = review_journal.read(monitor, precheck["incidentId"])
        previous = precheck_journal.read(monitor, precheck["incidentId"])
    except (ValueError, KeyError):
        return None
    if not (
        _ql432_decision_ok(decision, review, checkpoint)
        and decision["incidentId"] == precheck["incidentId"]
        and previous
        and previous["receiptDigest"] == precheck["precheckReceiptDigest"]
        and previous["exportDigest"] == precheck["exportDigest"]
    ):
        return None
    return {"checkpoint": checkpoint, "review": review, "precheck": previous}


def run_ql434_signed_readiness325(
    monitor: PersistentReeMonitor304,
    pilot_acceptance: Any,
    ql432_decision: Any,
    ql433_precheck: Any,
    authority_id: str,
    challenge_nonce: str,
    master_reports: Any,
    owner_review: Any,
    *,
    pilot_journal: ProtectedPilotJournal321,
    incident_journal: ProtectedContinuityJournal322,
    review_journal: ProtectedRecoveryReviewJournal323,
    precheck_journal: ProtectedNewCeremonyJournal324,
    readiness_journal: ProtectedReadinessJournal325,
    keys: dict[str, tuple[bytes, str]],
    read_authority_handoff: Callable[..., Any] | None,
    read_original_host_readiness: Callable[..., Any] | None,
    read_independent_receiver_off: Callable[..., Any] | None,
    attest_operator: Callable[..., bool] | None,
    attest_signed_ql433_precheck: Callable[..., bool] | None,
    attest_new_authority: Callable[..., bool] | None,
    attest_fresh_nonce: Callable[..., bool] | None,
    attest_external_custody: Callable[..., bool] | None,
    attest_owner_custody: Callable[..., bool] | None,
    now_ms: int | None = None,
) -> dict[str, Any]:
    """Accept only independently signed OFF/readiness, never activate a receiver."""

    def hold(reason: str) -> dict[str, Any]:
        return {
            **_hold(reason),
            "receiver": "OFF_PENDING_ORIGINAL_HOST_READINESS_REVALIDATION",
            "connection": "HOLD",
            "activationAuthorized": False,
            "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        }

    now = int(time.time() * 1000) if now_ms is None else now_ms
    scope = _accepted(monitor, pilot_acceptance, pilot_journal)
    if not (
        scope
        and type(now) is int
        and _id(authority_id)
        and _id(challenge_nonce)
        and authority_id != challenge_nonce
        and isinstance(incident_journal, ProtectedContinuityJournal322)
        and isinstance(review_journal, ProtectedRecoveryReviewJournal323)
        and isinstance(precheck_journal, ProtectedNewCeremonyJournal324)
        and isinstance(readiness_journal, ProtectedReadinessJournal325)
        and _pins(keys)
        and all(
            callable(x)
            for x in (
                read_authority_handoff,
                read_original_host_readiness,
                read_independent_receiver_off,
            )
        )
    ):
        return hold("HOLD_QL434_PROTECTED_ORIGINAL_HOST_AUTHORITY_OR_SIGNER_PINS_MISSING")
    prior = _prior(
        monitor,
        scope,
        ql432_decision,
        ql433_precheck,
        incident_journal,
        review_journal,
        precheck_journal,
    )
    if prior is None:
        return hold("HOLD_QL434_QL431_432_433_PRIOR_SIGNED_CHAIN_INVALID")
    incident = ql433_precheck["incidentId"]
    try:
        if readiness_journal.read(monitor, incident) is not None:
            return hold("HOLD_QL434_INCIDENT_READINESS_ALREADY_CONSUMED")
    except ValueError:
        return hold("HOLD_QL434_LOCAL_RECEIPT_UNREADABLE")
    export = {
        "schema": EXPORT,
        "scope": scope,
        "incidentId": incident,
        "ql431CheckpointIndex": prior["checkpoint"]["index"],
        "ql431CheckpointDigest": prior["checkpoint"]["recordDigest"],
        "ql432OwnerReceiptDigest": prior["review"]["receiptDigest"],
        "ql433PrecheckReceiptDigest": prior["precheck"]["receiptDigest"],
        "ql433DecisionAnchorDigest": ql433_precheck["externalAnchorDigest"],
        "ql433IndependentReadbackDigest": ql433_precheck["independentReadbackDigest"],
        "nextCeremonyId": ql433_precheck["nextCeremonyId"],
        "nextEpisodeId": ql433_precheck["nextEpisodeId"],
        "hostMachineId": "DESKTOP-AE894KC",
        "sourceRevision": scope["sourceRevision"],
        "controllerRevision": scope["controllerRevision"],
        "source324Main": SOURCE324_MAIN,
        "authorityId": authority_id,
        "challengeNonce": challenge_nonce,
        "action": PREPARE_ACTION,
        "preparedAt": _utc(now),
    }
    export_digest = _digest(export)
    evidence = {
        "original_host": "DESKTOP-AE894KC",
        "incident_id": incident,
        "ql431_checkpoint_digest": export["ql431CheckpointDigest"],
        "ql432_receipt_digest": export["ql432OwnerReceiptDigest"],
        "ql433_receipt_digest": export["ql433PrecheckReceiptDigest"],
        "next_ceremony_id": export["nextCeremonyId"],
        "next_episode_id": export["nextEpisodeId"],
        "source_revision": export["sourceRevision"],
        "controller_revision": export["controllerRevision"],
        "authority_id": authority_id,
        "challenge_nonce": challenge_nonce,
        "export_digest": export_digest,
    }
    if not all(
        (
            _callback(attest_operator, **evidence),
            _callback(attest_signed_ql433_precheck, **evidence),
            _callback(attest_new_authority, **evidence),
            _callback(attest_fresh_nonce, **evidence),
            _callback(attest_external_custody, **evidence),
            _callback(attest_owner_custody, **evidence),
        )
    ):
        return hold("HOLD_QL434_NEW_AUTHORITY_OR_PRIOR_SIGNED_CUSTODY_UNVERIFIED")
    try:
        handoff = read_authority_handoff(export_record=export, export_digest=export_digest)
    except Exception:
        return hold("HOLD_QL434_INDEPENDENT_AUTHORITY_HANDOFF_UNAVAILABLE")
    if not isinstance(handoff, dict) or set(handoff) != {"issuer", "witness"}:
        return hold("HOLD_QL434_DISTINCT_SIGNED_ISSUER_AND_WITNESS_REQUIRED")
    i = _signed(
        handoff["issuer"],
        {
            "authorityId",
            "challengeNonce",
            "exportDigest",
            "scope",
            "incidentId",
            "ql433PrecheckReceiptDigest",
            "nextCeremonyId",
            "nextEpisodeId",
            "status",
            "issuedAt",
        },
        ISSUER,
        keys["issuer"],
        now,
        now - 60_000,
        "issuedAt",
    )
    if not _match(
        i,
        {
            "authorityId": authority_id,
            "challengeNonce": challenge_nonce,
            "exportDigest": export_digest,
            "scope": scope,
            "incidentId": incident,
            "ql433PrecheckReceiptDigest": prior["precheck"]["receiptDigest"],
            "nextCeremonyId": export["nextCeremonyId"],
            "nextEpisodeId": export["nextEpisodeId"],
            "status": "NEW_CEREMONY_READINESS_HANDOFF_NOT_ACTIVATION",
        },
    ):
        return hold("HOLD_QL434_ISSUER_SIGNED_SCOPE_OR_AUTHORITY_INVALID")
    w = _signed(
        handoff["witness"],
        {
            "authorityId",
            "challengeNonce",
            "exportDigest",
            "issuerDigest",
            "nextCeremonyId",
            "nextEpisodeId",
            "status",
            "witnessedAt",
        },
        WITNESS,
        keys["witness"],
        now,
        _timestamp(i["issuedAt"]),
        "witnessedAt",
    )
    if not _match(
        w,
        {
            "authorityId": authority_id,
            "challengeNonce": challenge_nonce,
            "exportDigest": export_digest,
            "issuerDigest": _digest(i),
            "nextCeremonyId": export["nextCeremonyId"],
            "nextEpisodeId": export["nextEpisodeId"],
            "status": "INDEPENDENT_HANDOFF_READBACK_NO_ACTIVATION",
        },
    ):
        return hold("HOLD_QL434_INDEPENDENT_AUTHORITY_WITNESS_INVALID")
    try:
        host_env = read_original_host_readiness(
            export_record=export,
            handoff_witness_digest=_digest(w),
        )
    except Exception:
        return hold("HOLD_QL434_ORIGINAL_HOST_READINESS_UNAVAILABLE")
    h = _signed(
        host_env,
        {
            "hostMachineId",
            "scope",
            "incidentId",
            "authorityId",
            "challengeNonce",
            "nextCeremonyId",
            "nextEpisodeId",
            "sourceRevision",
            "controllerRevision",
            "handoffWitnessDigest",
            "receiverState",
            "readiness",
            "observedAt",
        },
        HOST,
        keys["host"],
        now,
        _timestamp(w["witnessedAt"]),
        "observedAt",
    )
    if not _match(
        h,
        {
            "hostMachineId": "DESKTOP-AE894KC",
            "scope": scope,
            "incidentId": incident,
            "authorityId": authority_id,
            "challengeNonce": challenge_nonce,
            "nextCeremonyId": export["nextCeremonyId"],
            "nextEpisodeId": export["nextEpisodeId"],
            "sourceRevision": export["sourceRevision"],
            "controllerRevision": export["controllerRevision"],
            "handoffWitnessDigest": _digest(w),
            "receiverState": "OFF",
            "readiness": "HOST_READY_FOR_SEPARATE_NEW_SUPERVISED_CEREMONY_ONLY",
        },
    ):
        return hold("HOLD_QL434_ORIGINAL_HOST_SIGNED_OFF_READINESS_INVALID")
    try:
        off_env = read_independent_receiver_off(
            export_record=export,
            host_readiness_digest=_digest(h),
            handoff_witness_digest=_digest(w),
        )
    except Exception:
        return hold("HOLD_QL434_INDEPENDENT_RECEIVER_OFF_UNAVAILABLE")
    off = _signed(
        off_env,
        {
            "scope",
            "incidentId",
            "authorityId",
            "challengeNonce",
            "hostReadinessDigest",
            "handoffWitnessDigest",
            "receiverState",
            "observedAt",
        },
        RECEIVER,
        keys["receiver"],
        now,
        _timestamp(h["observedAt"]),
        "observedAt",
    )
    if not _match(
        off,
        {
            "scope": scope,
            "incidentId": incident,
            "authorityId": authority_id,
            "challengeNonce": challenge_nonce,
            "hostReadinessDigest": _digest(h),
            "handoffWitnessDigest": _digest(w),
            "receiverState": "OFF",
        },
    ):
        return hold("HOLD_QL434_SIGNED_INDEPENDENT_RECEIVER_OFF_INVALID")
    if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
        return hold("HOLD_QL434_THREE_SIGNED_MASTERS_REQUIRED")
    masters = []
    for master in MASTERS:
        p = _signed(
            master_reports[master],
            {
                "masterId",
                "scope",
                "incidentId",
                "authorityId",
                "ql433PrecheckReceiptDigest",
                "handoffWitnessDigest",
                "receiverOffDigest",
                "nextCeremonyId",
                "nextEpisodeId",
                "status",
                "observedAt",
            },
            MASTER,
            keys[master],
            now,
            _timestamp(off["observedAt"]),
            "observedAt",
        )
        if not _match(
            p,
            {
                "masterId": master,
                "scope": scope,
                "incidentId": incident,
                "authorityId": authority_id,
                "ql433PrecheckReceiptDigest": prior["precheck"]["receiptDigest"],
                "handoffWitnessDigest": _digest(w),
                "receiverOffDigest": _digest(off),
                "nextCeremonyId": export["nextCeremonyId"],
                "nextEpisodeId": export["nextEpisodeId"],
                "status": "NEW_CEREMONY_PREPARATION_ONLY_NOT_ACTIVATED",
            },
        ):
            return hold("HOLD_QL434_SIGNED_MASTER_READINESS_DISPOSITION_INVALID")
        masters.append(p)
    owner = _dual(
        owner_review,
        {
            "schema",
            "scope",
            "incidentId",
            "authorityId",
            "challengeNonce",
            "ql433PrecheckReceiptDigest",
            "handoffWitnessDigest",
            "receiverOffDigest",
            "mastersDigest",
            "nextCeremonyId",
            "nextEpisodeId",
            "ownerId",
            "reviewerId",
            "action",
            "authorizedAt",
        },
        OWNER,
        OWNER_ACTION,
        *keys["owner"],
        *keys["reviewer"],
        now,
        max(_timestamp(p["observedAt"]) for p in masters),
        "authorizedAt",
    )
    if not _match(
        owner,
        {
            "scope": scope,
            "incidentId": incident,
            "authorityId": authority_id,
            "challengeNonce": challenge_nonce,
            "ql433PrecheckReceiptDigest": prior["precheck"]["receiptDigest"],
            "handoffWitnessDigest": _digest(w),
            "receiverOffDigest": _digest(off),
            "mastersDigest": _digest(masters),
            "nextCeremonyId": export["nextCeremonyId"],
            "nextEpisodeId": export["nextEpisodeId"],
        },
    ):
        return hold("HOLD_QL434_DUAL_SIGNED_OWNER_READINESS_ONLY_INVALID")
    current = _prior(
        monitor,
        scope,
        ql432_decision,
        ql433_precheck,
        incident_journal,
        review_journal,
        precheck_journal,
    )
    if current != prior:
        return hold("HOLD_QL434_PRIOR_QL431_432_433_CUSTODY_DRIFT")
    evidence_digest = _digest(
        {
            "issuerDigest": _digest(i),
            "witnessDigest": _digest(w),
            "hostDigest": _digest(h),
            "receiverOffDigest": _digest(off),
            "mastersDigest": _digest(masters),
            "ownerDigest": _digest(owner),
            "nextCeremonyId": export["nextCeremonyId"],
            "nextEpisodeId": export["nextEpisodeId"],
        }
    )
    recorded = readiness_journal.claim_once(monitor, incident, export_digest, evidence_digest)
    if recorded is None:
        return hold("HOLD_QL434_READINESS_RECEIPT_REPLAY_OR_UNDURABLE")
    return {
        **hold("NEW_QL429_QL430_SEPARATE_FRESH_AUTHORITY_REQUIRED"),
        "accepted": True,
        "state": "DURABLE_QL434_SIGNED_NEW_CEREMONY_READINESS_HANDOFF",
        "receiver": "OFF_VERIFIED_SIGNED_READBACK",
        "ownerAcceptance": "DUAL_SIGNED_READINESS_ONLY",
        "activationAuthorized": False,
        "incidentId": incident,
        "nextCeremonyId": export["nextCeremonyId"],
        "nextEpisodeId": export["nextEpisodeId"],
        "authorityId": authority_id,
        "handoffWitnessDigest": _digest(w),
        "readinessReceiptDigest": recorded["receiptDigest"],
        "masterCount": 3,
        "permittedNextAction": "NEW_QL429_QL430_FRESH_SIGNED_ENROLLMENT_NOT_ACTIVATED",
        "connection": "HOLD",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }


def reconcile_master_evidence325(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Source-only owner projection: no operational evidence was enrolled."""
    return {
        **reconcile_master_evidence324(monitor),
        "schema": "rosevear.ai-hub.master360-ql434-readiness325.v1",
        "sourceBuild": 325,
        "source324MainAtReconciliation": SOURCE324_MAIN,
        "commsQl434ContractAtReconciliation": COMMS434_MAIN,
        "ql434QL433OneUsePrecheck": "HOLD_NO_PROTECTED_SIGNED_QL433_PRECHECK",
        "ql434QL431432Chain": "HOLD_NO_ORIGINAL_HOST_QL431_QL432_CHAIN_REVALIDATION",
        "ql434IndependentIssuer": "HOLD_NO_NEW_INDEPENDENT_AUTHORITY_SIGNER",
        "ql434DistinctWitness": "HOLD_NO_SEPARATE_SIGNED_AUTHORITY_WITNESS",
        "ql434OriginalHostReadyOff": "HOLD_NO_FRESH_SIGNED_ORIGINAL_HOST_READINESS_OFF",
        "ql434IndependentReceiverOff": "HOLD_NO_FRESH_INDEPENDENT_SIGNED_RECEIVER_OFF",
        "ql434ThreeMasterReadiness": "HOLD_NO_THREE_SIGNED_READINESS_REPORTS",
        "ql434DualOwnerConsent": "HOLD_NO_DUAL_SIGNED_READINESS_ONLY_CONSENT",
        "ql434OneUseReceipt": "HOLD_NO_ONE_USE_PRIVATE_READINESS_RECORD",
        "ql434NewCeremonyEnrollment": "HOLD_NO_SEPARATE_SUPERVISED_NEW_CEREMONY",
        "activationAuthorized": False,
        "receiver": "OFF",
        "connection": "HOLD",
        "ownerAcceptance": "HOLD",
        "masterSync": "HOLD",
        "runtimeUptime": "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING",
    }
