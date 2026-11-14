"""Build 339 QL-448: independently signed corrective and 30s OFF continuity.

Only historical custody is admitted. Incident stays OPEN, connection HOLD,
receiver currently OFF unproven and activation permanently disabled.
"""

from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_decision333 import ProtectedWitnessJournal333, hold_decision333
from rosevear_ai_hub.master_shell_prior339 import verify_prior_incident339

ACTION = "QL448_SIGNED_CORRECTIVE_LONG_HORIZON_CUSTODY"
REVIEWED = "DURABLE_QL448_CORRECTIVE_OR_CONTINUITY_EVIDENCE_REVIEWED"
EXCEPTION = "DURABLE_QL448_ISOLATION_EXCEPTION_CORRECTIVE_REVIEW_OPEN"
CLASS_CORRECTED = "SIGNED_CORRECTIVE_PRECONDITIONS_EVIDENCED_INCIDENT_OPEN"
CLASS_CONTINUITY = "SIGNED_LONG_HORIZON_HISTORICAL_CONTINUITY_INCIDENT_OPEN"
CLASS_EXCEPTION = "SIGNED_LONG_HORIZON_ISOLATION_EXCEPTION_OPEN"
OFFICER_COMPLETE = "SIGNED_CORRECTIVE_ACTION_COMPLETE_UNDER_HOLD"
OFFICER_INCOMPLETE = "SIGNED_CORRECTIVE_ACTION_INCOMPLETE_KEEP_HOLD"
OFFICER_CONTINUITY = "NO_EXCEPTION_SIGNED_CONTINUITY_RECHECK"
DECISION_REVIEWED = "ACCEPT_HISTORICAL_PRECONDITIONS_KEEP_INCIDENT_OPEN_HOLD"
DECISION_EXCEPTION = "ESCALATE_UNRESOLVED_ISOLATION_CORRECTION_KEEP_OPEN_HOLD"
HORIZONS = ("SHORT", "MEDIUM", "LONG")
ROLES = (
    "commsSource",
    "correctiveOfficer",
    "host",
    "observer",
    "owner",
    "ownerReviewer",
    *MASTERS,
)


class ProtectedRemediationJournal339(ProtectedWitnessJournal333):
    """Fsynced private PENDING then exactly one REVIEWED or EXCEPTION."""

    def __init__(self, directory: Path):
        super().__init__(directory)
        self.stages = ("PENDING", "REVIEWED", "EXCEPTION")
        self.terminal_stages = ("REVIEWED", "EXCEPTION")


def verify448(
    role: str, envelope: Any, pins: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if role not in pins or not isinstance(envelope, dict):
        return None
    payload = envelope.get("payload")
    if not isinstance(payload, dict):
        return None
    schema = f"rosevear.ai-hub.ql448.{role}.v1"
    return payload if _native(envelope, set(payload), schema, *pins[role]) == payload else None


def hold339(reason: str, exception: bool = False) -> dict[str, Any]:
    return {
        **hold_decision333(reason),
        "sourceBuild": 339,
        "state": reason,
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "incidentStatus": "OPEN",
        "incidentClosed": False,
        "historicalEvidenceOnly": True,
        "freshPhysicalOffProven": False,
        "exceptionClosurePreconditionsEvidenced": False,
        "correctiveReviewAdmitted": False,
        "unresolvedException": exception,
    }


def review_remediation339(
    monitor: Any,
    prior447: dict[str, Any],
    request: dict[str, Any],
    journal: ProtectedRemediationJournal339,
    pins: dict[str, tuple[bytes, str]],
    *,
    read_comms_source: Any,
    read_corrective_officer: Any,
    read_host: Any,
    read_observer: Any,
    master_reports: dict[str, Any],
    dual_owners: dict[str, Any],
    now_ms: int,
    final_now_ms: int,
) -> dict[str, Any]:
    """External Ed25519 evidence consumers only, never a receiver actuator."""

    def fail(reason: str, exception: bool = False) -> dict[str, Any]:
        return hold339(reason, exception)

    if not (
        _on_ree(monitor)
        and isinstance(prior447, dict)
        and isinstance(request, dict)
        and isinstance(journal, ProtectedRemediationJournal339)
        and isinstance(pins, dict)
        and set(pins) == set(ROLES)
        and all(
            isinstance(pin, tuple)
            and len(pin) == 2
            and isinstance(pin[0], bytes)
            and isinstance(pin[1], str)
            and _public_ed25519(*pin)
            for pin in pins.values()
        )
        and len({pin[0] for pin in pins.values()}) == len(ROLES)
        and len({pin[1] for pin in pins.values()}) == len(ROLES)
        and type(now_ms) is int
        and type(final_now_ms) is int
        and 0 <= final_now_ms - now_ms <= 60_000
        and callable(read_comms_source)
        and callable(read_corrective_officer)
        and callable(read_host)
        and callable(read_observer)
    ):
        return fail("HOLD_QL448_ORIGINAL_HOST_PINS_OR_CLOCK_UNTRUSTED")
    try:
        verified = verify_prior_incident339(monitor, **prior447)
        if verified is None:
            return fail("HOLD_QL448_SIGNED_QL447_OPEN_CUSTODY_REQUIRED")
        prior_digest, link = verified
        incident = link["incident"]
        req_digest = _digest(request)
        nonce = request.get("challengeNonce")
        remediation_id = request.get("remediationId")
        if not (
            request.get("action") == ACTION
            and request.get("originalIncidentId") == incident
            and request.get("priorQl447Digest") == prior_digest
            and request.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
            and request.get("ql447FollowUpId") == link["followUpId"]
            and request.get("priorClassification") == link["ql447Classification"]
            and request.get("previousObserverDigest") == link["previousObserverDigest"]
            and isinstance(nonce, str)
            and len(nonce) >= 12
            and isinstance(remediation_id, str)
            and len(remediation_id) >= 12
            and len({nonce, remediation_id, link["previousNonce"], link["followUpId"]}) == 4
            and now_ms > link["previousObservedAtMs"]
        ):
            return fail("HOLD_QL448_FRESH_CHALLENGE_AND_Ql447_RECEIPT_REQUIRED")
        pending = journal.claim(monitor, incident, "PENDING", req_digest, prior_digest)
        if not pending:
            return fail("HOLD_QL448_PRIVATE_PENDING_CONSUMED_OR_UNDURABLE")
        source = verify448(
            "commsSource",
            read_comms_source(request=request, pendingDigest=pending["receiptDigest"]),
            pins,
        )
        if not (
            source
            and source.get("requestDigest") == req_digest
            and source.get("originalIncidentId") == incident
            and source.get("priorQl447Digest") == prior_digest
            and source.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
            and source.get("ql447Classification") == link["ql447Classification"]
            and source.get("incidentStatus") == "OPEN_HOLD"
            and type(source.get("observedAtMs")) is int
            and link["previousObservedAtMs"] < source["observedAtMs"] <= now_ms
            and now_ms - source["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL448_SIGNED_OPEN_COMMS_SOURCE_INVALID")
        officer = verify448(
            "correctiveOfficer",
            read_corrective_officer(request=request, sourceDigest=_digest(source)),
            pins,
        )
        dispositions = (
            (OFFICER_COMPLETE, OFFICER_INCOMPLETE)
            if link["priorExceptionOpen"]
            else (OFFICER_CONTINUITY,)
        )
        if not (
            officer
            and officer.get("requestDigest") == req_digest
            and officer.get("originalIncidentId") == incident
            and officer.get("remediationId") == remediation_id
            and officer.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
            and officer.get("priorQl447Digest") == prior_digest
            and officer.get("sourceDigest") == _digest(source)
            and officer.get("disposition") in dispositions
            and type(officer.get("isolationLock")) is bool
            and type(officer.get("leaseRevoked")) is bool
            and type(officer.get("watchdogArmed")) is bool
            and type(officer.get("observedAtMs")) is int
            and source["observedAtMs"] <= officer["observedAtMs"] <= now_ms
            and now_ms - officer["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL448_INDEPENDENT_SIGNED_REMEDIATION_INVALID")
        observations = []
        previous_observer_digest = link["previousObserverDigest"]
        previous_host_digest = None
        previous_sequence = link["previousSequence"]
        previous_time = link["previousObservedAtMs"]
        first_host_time = None
        for index, horizon in enumerate(HORIZONS, start=1):
            host = verify448(
                "host",
                read_host(
                    request=request,
                    horizon=horizon,
                    officerDigest=_digest(officer),
                    previousObserverDigest=previous_observer_digest,
                ),
                pins,
            )
            if not (
                host
                and host.get("requestDigest") == req_digest
                and host.get("originalIncidentId") == incident
                and host.get("originalHostId") == "DESKTOP-AE894KC"
                and host.get("challengeNonce") == nonce
                and host.get("remediationId") == remediation_id
                and host.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
                and host.get("officerDigest") == _digest(officer)
                and host.get("horizon") == horizon
                and host.get("previousHostDigest") == previous_host_digest
                and host.get("previousObserverDigest") == previous_observer_digest
                and host.get("receiverState") in ("OFF", "ON")
                and type(host.get("isolationLock")) is bool
                and type(host.get("leaseRevoked")) is bool
                and type(host.get("watchdogArmed")) is bool
                and type(host.get("sequence")) is int
                and host["sequence"] > previous_sequence
                and type(host.get("observedAtMs")) is int
                and max(previous_time, officer["observedAtMs"]) < host["observedAtMs"] <= now_ms
                and now_ms - host["observedAtMs"] <= 60_000
            ):
                return fail("HOLD_QL448_SIGNED_ORIGINAL_HOST_HORIZON_INVALID")
            if index == 1:
                first_host_time = host["observedAtMs"]
            elif host["observedAtMs"] - first_host_time < (10_000 if index == 2 else 30_000):
                return fail("HOLD_QL448_MINIMUM_TEN_THIRTY_SECOND_HORIZON_VIOLATION")
            observer = verify448(
                "observer",
                read_observer(
                    request=request,
                    horizon=horizon,
                    hostDigest=_digest(host),
                    previousObserverDigest=previous_observer_digest,
                ),
                pins,
            )
            if not (
                observer
                and observer.get("requestDigest") == req_digest
                and observer.get("originalIncidentId") == incident
                and observer.get("challengeNonce") == nonce
                and observer.get("remediationId") == remediation_id
                and observer.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
                and observer.get("horizon") == horizon
                and observer.get("signedHostDigest") == _digest(host)
                and observer.get("previousObserverDigest") == previous_observer_digest
                and observer.get("receiverState") in ("OFF", "ON")
                and type(observer.get("isolationConfirmed")) is bool
                and type(observer.get("sequence")) is int
                and observer["sequence"] > host["sequence"]
                and type(observer.get("observedAtMs")) is int
                and host["observedAtMs"] <= observer["observedAtMs"] <= now_ms
                and now_ms - observer["observedAtMs"] <= 60_000
            ):
                return fail("HOLD_QL448_SIGNED_INDEPENDENT_HORIZON_INVALID")
            observations.append((host, observer))
            previous_observer_digest = _digest(observer)
            previous_host_digest = _digest(host)
            previous_sequence = observer["sequence"]
            previous_time = observer["observedAtMs"]
        all_off = all(
            host["receiverState"] == observer["receiverState"] == "OFF"
            and host["isolationLock"]
            and host["leaseRevoked"]
            and host["watchdogArmed"]
            and observer["isolationConfirmed"]
            for host, observer in observations
        )
        officer_clear = (
            officer["isolationLock"] and officer["leaseRevoked"] and officer["watchdogArmed"]
        )
        closure_preconditions = (
            link["priorExceptionOpen"]
            and officer["disposition"] == OFFICER_COMPLETE
            and officer_clear
            and all_off
        )
        continuity = (
            not link["priorExceptionOpen"]
            and officer["disposition"] == OFFICER_CONTINUITY
            and officer_clear
            and all_off
        )
        reviewed = closure_preconditions or continuity
        classification = (
            CLASS_CORRECTED
            if closure_preconditions
            else CLASS_CONTINUITY
            if continuity
            else CLASS_EXCEPTION
        )
        decision = DECISION_REVIEWED if reviewed else DECISION_EXCEPTION
        horizon_digest = _digest(
            {
                "prior": prior_digest,
                "source": _digest(source),
                "officer": _digest(officer),
                "hostDigests": [_digest(host) for host, _ in observations],
                "observerDigests": [_digest(observer) for _, observer in observations],
                "classification": classification,
                "remediationId": remediation_id,
            }
        )
        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL448_THREE_MASTER_SIGNED_REVIEWS_REQUIRED", not reviewed)
        reports = []
        for master in MASTERS:
            vote = verify448(master, master_reports[master], pins)
            if not (
                vote
                and vote.get("masterId") == master
                and vote.get("requestDigest") == req_digest
                and vote.get("originalIncidentId") == incident
                and vote.get("remediationId") == remediation_id
                and vote.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
                and vote.get("horizonEvidenceDigest") == horizon_digest
                and vote.get("classification") == classification
                and vote.get("correctiveDecision") == decision
                and vote.get("incidentStatus") == "OPEN_HOLD"
                and type(vote.get("reviewedAtMs")) is int
                and observations[-1][1]["observedAtMs"] <= vote["reviewedAtMs"] <= now_ms
            ):
                return fail("HOLD_QL448_THREE_MASTER_CORRECTIVE_VETO", not reviewed)
            reports.append(vote)
        reports_digest = _digest(reports)
        if not isinstance(dual_owners, dict) or set(dual_owners) != {"owner", "ownerReviewer"}:
            return fail("HOLD_QL448_DISTINCT_DUAL_OWNER_VOTES_REQUIRED", not reviewed)
        owners = []
        for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
            body = verify448(role, dual_owners[role], pins)
            if not (
                body
                and body.get("ownerId") == owner_id
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("remediationId") == remediation_id
                and body.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
                and body.get("horizonEvidenceDigest") == horizon_digest
                and body.get("threeMasterDigest") == reports_digest
                and body.get("classification") == classification
                and body.get("correctiveDecision") == decision
                and body.get("incidentStatus") == "OPEN_HOLD"
                and type(body.get("reviewedAtMs")) is int
                and max(report["reviewedAtMs"] for report in reports)
                <= body["reviewedAtMs"]
                <= final_now_ms
            ):
                return fail("HOLD_QL448_DUAL_OWNER_CORRECTIVE_VETO", not reviewed)
            owners.append(body)
        if verify_prior_incident339(monitor, **prior447) != verified:
            return fail("HOLD_QL448_ORIGINAL_QL447_CUSTODY_DRIFT", not reviewed)
        if journal.read(monitor, incident, "PENDING") != pending or any(
            journal.read(monitor, incident, stage) is not None
            for stage in ("REVIEWED", "EXCEPTION")
        ):
            return fail("HOLD_QL448_PENDING_OR_TERMINAL_CUSTODY_DRIFT", not reviewed)
        if (
            final_now_ms - source["observedAtMs"] > 60_000
            or final_now_ms - officer["observedAtMs"] > 60_000
            or final_now_ms - observations[0][0]["observedAtMs"] > 60_000
            or final_now_ms - observations[-1][1]["observedAtMs"] > 60_000
        ):
            return fail("HOLD_QL448_EVIDENCE_EXPIRED_BEFORE_COMMIT", not reviewed)
        evidence_digest = _digest(
            {
                "prior": prior_digest,
                "request": req_digest,
                "source": source,
                "officer": officer,
                "host": [h for h, _ in observations],
                "observers": [o for _, o in observations],
                "masters": reports,
                "owners": owners,
                "horizonDigest": horizon_digest,
                "classification": classification,
                "correctiveDecision": decision,
            }
        )
        stage = "REVIEWED" if reviewed else "EXCEPTION"
        terminal = journal.claim(monitor, incident, stage, req_digest, evidence_digest)
        if not terminal:
            return fail("HOLD_QL448_PRIVATE_TERMINAL_COMMIT_FAILED", not reviewed)
        return {
            **hold339(REVIEWED if reviewed else EXCEPTION, not reviewed),
            "accepted": True,
            "originalIncidentId": incident,
            "remediationId": remediation_id,
            "classification": classification,
            "correctiveDecision": decision,
            "exceptionClosurePreconditionsEvidenced": closure_preconditions,
            "correctiveReviewAdmitted": True,
            "masterCount": 3,
            "horizonEvidenceDigest": horizon_digest,
            "threeMasterDigest": reports_digest,
            "pendingReceiptDigest": pending["receiptDigest"],
            "finalReceiptDigest": terminal["receiptDigest"],
            "nextAction": (
                "FRESH_SUPERVISED_INDEPENDENT_RECEIVER_READBACK_REQUIRED"
                if reviewed
                else "CORRECTIVE_ISOLATION_EXCEPTION_REMAINS_OPEN"
            ),
        }
    except (KeyError, TypeError, ValueError, OSError):
        return fail("HOLD_QL448_INVALID_OR_INCOMPLETE_SIGNED_CUSTODY")


def read_private_remediation339(
    monitor: Any, journal: ProtectedRemediationJournal339, incident: str
) -> dict[str, Any]:
    status = hold339("QL448_PRIVATE_HISTORICAL_EVIDENCE_NOT_LIVE_RECEIVER_STATE")
    try:
        pending = journal.read(monitor, incident, "PENDING")
        reviewed = journal.read(monitor, incident, "REVIEWED")
        exception = journal.read(monitor, incident, "EXCEPTION")
        if reviewed and exception:
            status["state"] = "HOLD_QL448_CONFLICTING_PROTECTED_TERMINALS"
            status["unresolvedException"] = True
        elif pending and reviewed and reviewed["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL448_HISTORICAL_CORRECTIVE_PRECONDITIONS_INCIDENT_OPEN"
            status["historicalReceiptDigest"] = reviewed["receiptDigest"]
        elif pending and exception and exception["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL448_SIGNED_EXCEPTION_UNRESOLVED_INCIDENT_OPEN"
            status["historicalReceiptDigest"] = exception["receiptDigest"]
            status["unresolvedException"] = True
        elif pending:
            status["state"] = "HOLD_QL448_PENDING_REQUIRES_SUPERVISED_RECOVERY"
    except (OSError, ValueError):
        status["state"] = "HOLD_QL448_PRIVATE_CUSTODY_UNREADABLE"
    return status
