"""QL-451 signed recurrence response and original-host OFF renewal (history-only).

Independent corrective officer, anchor, host/observer, closure boundary and three
Masters/two owners; no device command or incident-closure authority.
"""

from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_decision333 import ProtectedWitnessJournal333, hold_decision333
from rosevear_ai_hub.master_shell_prior342 import verify_prior_stability342

ACTION = "QL451_INDEPENDENT_RECURRENCE_RESPONSE_OFF_RENEWAL"
RENEWED = "DURABLE_QL451_HISTORICAL_OFF_RENEWAL_INCIDENT_OPEN"
EXCEPTION = "DURABLE_QL451_SIGNED_RECURRENCE_EXCEPTION_INCIDENT_OPEN"
CLASS_RENEWED = "SIGNED_HISTORICAL_OFF_RENEWAL_ONLY"
CLASS_EXCEPTION = "SIGNED_RECURRENCE_RESPONSE_EXCEPTION_KEEP_OPEN"
RESPONSE_COMPLETE = "SIGNED_RESPONSE_COMPLETED_UNDER_HOLD"
RESPONSE_UNRESOLVED = "SIGNED_RESPONSE_UNRESOLVED_KEEP_HOLD"
RESPONSE_CONTINUITY = "NO_NEW_RECURRENCE_SIGNED_RENEWAL"
ANCHOR_DISPOSITION = "HISTORICAL_RESPONSE_ONLY_NO_INCIDENT_CLOSURE"
BOUNDARY = "OWNER_GATED_REASSESSMENT_ONLY_SEPARATE_CLOSURE_CEREMONY"
DECISION_RENEWED = "SIGNED_RENEWAL_PRECONDITIONS_KEEP_INCIDENT_OPEN_HOLD"
DECISION_EXCEPTION = "SIGNED_RECURRENCE_REASSESSMENT_EXCEPTION_KEEP_OPEN_HOLD"
HORIZONS = ("SHORT", "MEDIUM", "LONG")
ROLES = (
    "commsSource", "responseOfficer", "externalAnchor", "host",
    "observer", "closureAuthority", "owner", "ownerReviewer", *MASTERS,
)


class ProtectedRenewalJournal342(ProtectedWitnessJournal333):
    """Exclusive one-use fsynced PENDING then RENEWED or EXCEPTION."""

    def __init__(self, directory: Path):
        super().__init__(directory)
        self.stages = ("PENDING", "RENEWED", "EXCEPTION")
        self.terminal_stages = ("RENEWED", "EXCEPTION")


def verify451(
    role: str, envelope: Any, pins: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if role not in pins or not isinstance(envelope, dict):
        return None
    payload = envelope.get("payload")
    if not isinstance(payload, dict):
        return None
    schema = f"rosevear.ai-hub.ql451.{role}.v1"
    return payload if _native(envelope, set(payload), schema, *pins[role]) == payload else None


def hold342(reason: str, exception: bool = False) -> dict[str, Any]:
    return {
        **hold_decision333(reason),
        "sourceBuild": 342, "state": reason,
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "connection": "HOLD",
        "incidentStatus": "OPEN", "incidentClosed": False,
        "closureAuthorized": False, "activationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "historicalEvidenceOnly": True,
        "responsePreconditionsEvidenced": False,
        "independentRenewalAdmitted": False,
        "unresolvedException": exception,
    }


def review_renewal342(
    monitor: Any,
    prior450: dict[str, Any],
    request: dict[str, Any],
    journal: ProtectedRenewalJournal342,
    pins: dict[str, tuple[bytes, str]],
    *,
    read_comms_source: Any,
    read_response_officer: Any,
    read_external_anchor: Any,
    read_host: Any,
    read_observer: Any,
    read_closure_authority: Any,
    master_reports: dict[str, Any],
    dual_owners: dict[str, Any],
    now_ms: int,
    final_now_ms: int,
) -> dict[str, Any]:
    """Validate source and protected ledgers; never operate original equipment."""

    def fail(reason: str, exception: bool = False) -> dict[str, Any]:
        return hold342(reason, exception)

    if not (
        _on_ree(monitor)
        and isinstance(prior450, dict)
        and isinstance(request, dict)
        and isinstance(journal, ProtectedRenewalJournal342)
        and isinstance(pins, dict) and set(pins) == set(ROLES)
        and all(
            isinstance(pin, tuple) and len(pin) == 2
            and isinstance(pin[0], bytes) and isinstance(pin[1], str)
            and _public_ed25519(*pin) for pin in pins.values()
        )
        and len({pin[0] for pin in pins.values()}) == len(ROLES)
        and len({pin[1] for pin in pins.values()}) == len(ROLES)
        and all(callable(fn) for fn in (
            read_comms_source, read_response_officer, read_external_anchor,
            read_host, read_observer, read_closure_authority,
        ))
        and type(now_ms) is int and type(final_now_ms) is int
        and 0 <= final_now_ms - now_ms <= 60_000
    ):
        return fail("HOLD_QL451_ORIGINAL_SESSION_SIGNERS_OR_CLOCK_INVALID")
    try:
        checked = verify_prior_stability342(monitor, **prior450)
        if checked is None:
            return fail("HOLD_QL451_EXACT_ORIGINAL_SIGNED_QL450_REQUIRED")
        prior_digest, link = checked
        incident = link["incident"]
        renewal_id, nonce = request.get("renewalId"), request.get("challengeNonce")
        req_digest = _digest(request)
        if not (
            request.get("action") == ACTION
            and request.get("originalIncidentId") == incident
            and request.get("priorQl450Digest") == prior_digest
            and request.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
            and request.get("ql450StabilityDigest") == link["ql450StabilityDigest"]
            and request.get("ql450BoundaryDigest") == link["ql450BoundaryDigest"]
            and request.get("priorClassification") == link["priorClassification"]
            and request.get("previousObserverDigest") == link["previousObserverDigest"]
            and isinstance(renewal_id, str) and len(renewal_id) >= 12
            and isinstance(nonce, str) and len(nonce) >= 12
            and len({
                renewal_id, nonce, link["ql450ReviewId"], link["ql450Nonce"],
            }) == 4
            and now_ms > link["previousObservedAtMs"]
        ):
            return fail("HOLD_QL451_FRESH_SCOPED_RENEWAL_ID_REQUIRED")
        pending = journal.claim(monitor, incident, "PENDING", req_digest, prior_digest)
        if not pending:
            return fail("HOLD_QL451_PRIVATE_PENDING_REPLAY_OR_UNDURABLE")
        source = verify451(
            "commsSource",
            read_comms_source(request=request, pendingDigest=pending["receiptDigest"]),
            pins,
        )
        if not (
            source
            and source.get("requestDigest") == req_digest
            and source.get("originalIncidentId") == incident
            and source.get("priorQl450Digest") == prior_digest
            and source.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
            and source.get("ql450StabilityDigest") == link["ql450StabilityDigest"]
            and source.get("priorClassification") == link["priorClassification"]
            and source.get("incidentStatus") == "OPEN_HOLD"
            and type(source.get("observedAtMs")) is int
            and link["previousObservedAtMs"] < source["observedAtMs"] <= now_ms
            and now_ms - source["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL451_ORIGINAL_COMMS_OPEN_CASE_INVALID")
        officer = verify451(
            "responseOfficer",
            read_response_officer(request=request, sourceDigest=_digest(source)),
            pins,
        )
        if not (
            officer
            and officer.get("requestDigest") == req_digest
            and officer.get("originalIncidentId") == incident
            and officer.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
            and officer.get("sourceDigest") == _digest(source)
            and officer.get("renewalId") == renewal_id
            and officer.get("challengeNonce") == nonce
            and officer.get("responseDisposition") in (
                (RESPONSE_COMPLETE, RESPONSE_UNRESOLVED)
                if link["priorExceptionOpen"] else (RESPONSE_CONTINUITY,)
            )
            and type(officer.get("isolationLock")) is bool
            and type(officer.get("leaseRevoked")) is bool
            and type(officer.get("watchdogArmed")) is bool
            and type(officer.get("observedAtMs")) is int
            and source["observedAtMs"] < officer["observedAtMs"] <= now_ms
            and now_ms - officer["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL451_INDEPENDENT_RESPONSE_OFFICER_INVALID")
        anchor = verify451(
            "externalAnchor",
            read_external_anchor(request=request, responseDigest=_digest(officer)),
            pins,
        )
        if not (
            anchor
            and anchor.get("requestDigest") == req_digest
            and anchor.get("originalIncidentId") == incident
            and anchor.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
            and anchor.get("sourceDigest") == _digest(source)
            and anchor.get("responseDigest") == _digest(officer)
            and anchor.get("renewalId") == renewal_id
            and anchor.get("challengeNonce") == nonce
            and anchor.get("disposition") == ANCHOR_DISPOSITION
            and isinstance(anchor.get("anchorId"), str)
            and len(anchor["anchorId"]) >= 12
            and anchor["anchorId"] not in (renewal_id, nonce)
            and type(anchor.get("sequence")) is int
            and anchor["sequence"] > link["previousSequence"]
            and type(anchor.get("observedAtMs")) is int
            and officer["observedAtMs"] < anchor["observedAtMs"] <= now_ms
            and now_ms - anchor["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL451_INDEPENDENT_RESPONSE_ANCHOR_INVALID")
        observations = []
        last_witness = link["previousObserverDigest"]
        last_host = None
        last_seq = anchor["sequence"]
        last_time = anchor["observedAtMs"]
        first_time = None
        for index, horizon in enumerate(HORIZONS, start=1):
            host = verify451(
                "host",
                read_host(
                    request=request, horizon=horizon,
                    anchorDigest=_digest(anchor),
                    previousObserverDigest=last_witness,
                ), pins,
            )
            if not (
                host
                and host.get("requestDigest") == req_digest
                and host.get("originalIncidentId") == incident
                and host.get("hostMachineId") == "DESKTOP-AE894KC"
                and host.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
                and host.get("renewalId") == renewal_id
                and host.get("challengeNonce") == nonce
                and host.get("responseDigest") == _digest(officer)
                and host.get("anchorDigest") == _digest(anchor)
                and host.get("horizon") == horizon
                and host.get("previousHostDigest") == last_host
                and host.get("previousObserverDigest") == last_witness
                and host.get("receiverState") in ("OFF", "ON")
                and type(host.get("isolationLock")) is bool
                and type(host.get("leaseRevoked")) is bool
                and type(host.get("watchdogArmed")) is bool
                and type(host.get("sequence")) is int
                and host["sequence"] > last_seq
                and type(host.get("observedAtMs")) is int
                and last_time < host["observedAtMs"] <= now_ms
                and now_ms - host["observedAtMs"] <= 60_000
            ):
                return fail("HOLD_QL451_ORIGINAL_HOST_HORIZON_INVALID")
            if index == 1:
                first_time = host["observedAtMs"]
            elif host["observedAtMs"] - first_time < (
                10_000 if index == 2 else 30_000
            ):
                return fail("HOLD_QL451_MINIMUM_10_30_SECOND_HORIZON")
            observer = verify451(
                "observer",
                read_observer(
                    request=request, horizon=horizon,
                    hostDigest=_digest(host),
                    previousObserverDigest=last_witness,
                ), pins,
            )
            if not (
                observer
                and observer.get("requestDigest") == req_digest
                and observer.get("originalIncidentId") == incident
                and observer.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
                and observer.get("renewalId") == renewal_id
                and observer.get("challengeNonce") == nonce
                and observer.get("anchorDigest") == _digest(anchor)
                and observer.get("horizon") == horizon
                and observer.get("signedHostDigest") == _digest(host)
                and observer.get("previousObserverDigest") == last_witness
                and observer.get("receiverState") in ("OFF", "ON")
                and type(observer.get("isolationConfirmed")) is bool
                and type(observer.get("sequence")) is int
                and observer["sequence"] > host["sequence"]
                and type(observer.get("observedAtMs")) is int
                and host["observedAtMs"] <= observer["observedAtMs"] <= now_ms
                and now_ms - observer["observedAtMs"] <= 60_000
            ):
                return fail("HOLD_QL451_INDEPENDENT_WITNESS_HORIZON_INVALID")
            observations.append((host, observer))
            last_host = _digest(host)
            last_witness = _digest(observer)
            last_seq = observer["sequence"]
            last_time = observer["observedAtMs"]
        response_complete = (
            officer["responseDisposition"] in (
                RESPONSE_COMPLETE, RESPONSE_CONTINUITY
            )
            and officer["isolationLock"] and officer["leaseRevoked"]
            and officer["watchdogArmed"]
        )
        renewed = response_complete and all(
            h["receiverState"] == w["receiverState"] == "OFF"
            and h["isolationLock"] and h["leaseRevoked"]
            and h["watchdogArmed"] and w["isolationConfirmed"]
            for h, w in observations
        )
        classification = CLASS_RENEWED if renewed else CLASS_EXCEPTION
        decision = DECISION_RENEWED if renewed else DECISION_EXCEPTION
        renewal_digest = _digest({
            "prior": prior_digest, "source": _digest(source),
            "response": _digest(officer), "anchor": _digest(anchor),
            "hostDigests": [_digest(h) for h, _ in observations],
            "observerDigests": [_digest(w) for _, w in observations],
            "classification": classification, "renewalId": renewal_id,
        })
        boundary = verify451(
            "closureAuthority",
            read_closure_authority(
                request=request, renewalDigest=renewal_digest,
                classification=classification,
            ), pins,
        )
        if not (
            boundary
            and boundary.get("requestDigest") == req_digest
            and boundary.get("originalIncidentId") == incident
            and boundary.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
            and boundary.get("renewalId") == renewal_id
            and boundary.get("challengeNonce") == nonce
            and boundary.get("renewalEvidenceDigest") == renewal_digest
            and boundary.get("classification") == classification
            and boundary.get("boundaryDecision") == BOUNDARY
            and boundary.get("closureAuthorized") is False
            and boundary.get("activationAuthorized") is False
            and boundary.get("physicalReceiverCurrentlyOff") is False
            and boundary.get("incidentStatus") == "OPEN_HOLD"
            and type(boundary.get("reviewedAtMs")) is int
            and last_time <= boundary["reviewedAtMs"] <= now_ms
        ):
            return fail("HOLD_QL451_INDEPENDENT_CLOSURE_AUTHORITY_VETO", not renewed)
        boundary_digest = _digest(boundary)
        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL451_THREE_MASTER_VOTES_REQUIRED", not renewed)
        reports = []
        for master in MASTERS:
            vote = verify451(master, master_reports[master], pins)
            if not (
                vote
                and vote.get("masterId") == master
                and vote.get("requestDigest") == req_digest
                and vote.get("originalIncidentId") == incident
                and vote.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
                and vote.get("renewalId") == renewal_id
                and vote.get("renewalEvidenceDigest") == renewal_digest
                and vote.get("closureBoundaryDigest") == boundary_digest
                and vote.get("classification") == classification
                and vote.get("reassessmentDecision") == decision
                and vote.get("incidentStatus") == "OPEN_HOLD"
                and type(vote.get("reviewedAtMs")) is int
                and boundary["reviewedAtMs"] <= vote["reviewedAtMs"] <= now_ms
            ):
                return fail("HOLD_QL451_THREE_MASTER_REASSESSMENT_VETO", not renewed)
            reports.append(vote)
        report_digest = _digest(reports)
        if not isinstance(dual_owners, dict) or set(dual_owners) != {
            "owner", "ownerReviewer"
        }:
            return fail("HOLD_QL451_TWO_ORIGINAL_OWNER_VOTES_REQUIRED", not renewed)
        owners = []
        for role, identity in zip(
            ("owner", "ownerReviewer"), link["ownerIds"], strict=True
        ):
            body = verify451(role, dual_owners[role], pins)
            if not (
                body
                and body.get("ownerId") == identity
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
                and body.get("renewalId") == renewal_id
                and body.get("renewalEvidenceDigest") == renewal_digest
                and body.get("closureBoundaryDigest") == boundary_digest
                and body.get("threeMasterDigest") == report_digest
                and body.get("classification") == classification
                and body.get("reassessmentDecision") == decision
                and body.get("incidentStatus") == "OPEN_HOLD"
                and body.get("closureAuthorized") is False
                and type(body.get("reviewedAtMs")) is int
                and max(report["reviewedAtMs"] for report in reports)
                <= body["reviewedAtMs"] <= final_now_ms
            ):
                return fail("HOLD_QL451_DUAL_OWNER_CLOSURE_VETO", not renewed)
            owners.append(body)
        if verify_prior_stability342(monitor, **prior450) != checked:
            return fail("HOLD_QL451_PREDECESSOR_PRIVATE_CUSTODY_CHANGED", not renewed)
        if journal.read(monitor, incident, "PENDING") != pending or any(
            journal.read(monitor, incident, state) is not None
            for state in ("RENEWED", "EXCEPTION")
        ):
            return fail("HOLD_QL451_PENDING_OR_TERMINAL_CONFLICT", not renewed)
        if any(
            final_now_ms - t > 60_000
            for t in (
                source["observedAtMs"], officer["observedAtMs"],
                anchor["observedAtMs"], observations[0][0]["observedAtMs"],
                last_time, boundary["reviewedAtMs"],
            )
        ):
            return fail("HOLD_QL451_SIGNED_EVIDENCE_EXPIRED", not renewed)
        signed_evidence_digest = _digest({
            "prior": prior_digest, "request": req_digest,
            "source": source, "officer": officer, "anchor": anchor,
            "hosts": [h for h, _ in observations],
            "observers": [w for _, w in observations],
            "boundary": boundary, "masters": reports, "owners": owners,
            "classification": classification, "reassessmentDecision": decision,
        })
        terminal = journal.claim(
            monitor, incident, "RENEWED" if renewed else "EXCEPTION",
            req_digest, signed_evidence_digest,
        )
        if not terminal:
            return fail("HOLD_QL451_PROTECTED_TERMINAL_NOT_DURABLE", not renewed)
        return {
            **hold342(RENEWED if renewed else EXCEPTION, not renewed),
            "accepted": True, "originalIncidentId": incident,
            "renewalId": renewal_id, "classification": classification,
            "reassessmentDecision": decision,
            "responsePreconditionsEvidenced": (
                renewed and link["priorExceptionOpen"]
            ),
            "independentRenewalAdmitted": True, "masterCount": 3,
            "renewalEvidenceDigest": renewal_digest,
            "closureBoundaryDigest": boundary_digest,
            "threeMasterDigest": report_digest,
            "pendingReceiptDigest": pending["receiptDigest"],
            "finalReceiptDigest": terminal["receiptDigest"],
            "nextAction": (
                "SEPARATE_PHYSICAL_OWNER_SUPERVISED_CLOSURE_CEREMONY_REQUIRED"
                if renewed else "SUPERVISED_RECURRENCE_RESPONSE_CORRECTION_REQUIRED"
            ),
        }
    except (KeyError, TypeError, ValueError, OSError):
        return fail("HOLD_QL451_UNTRUSTED_OR_INCOMPLETE_SIGNED_EVIDENCE")


def read_private_renewal342(
    monitor: Any, journal: ProtectedRenewalJournal342, incident: str
) -> dict[str, Any]:
    status = hold342("QL451_HISTORICAL_RENEWAL_NOT_CURRENT_PHYSICAL_OFF")
    try:
        pending = journal.read(monitor, incident, "PENDING")
        renewed = journal.read(monitor, incident, "RENEWED")
        exception = journal.read(monitor, incident, "EXCEPTION")
        if renewed and exception:
            status["state"] = "HOLD_QL451_CONFLICTING_TERMINAL"
            status["unresolvedException"] = True
        elif pending and renewed and renewed["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL451_HISTORICAL_RENEWAL_INCIDENT_OPEN"
            status["historicalReceiptDigest"] = renewed["receiptDigest"]
        elif pending and exception and exception["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL451_SIGNED_RECURRENCE_EXCEPTION_INCIDENT_OPEN"
            status["historicalReceiptDigest"] = exception["receiptDigest"]
            status["unresolvedException"] = True
        elif pending:
            status["state"] = "HOLD_QL451_INTERRUPTED_PENDING_SUPERVISED_RECOVERY"
    except (OSError, ValueError):
        status["state"] = "HOLD_QL451_PRIVATE_CUSTODY_UNREADABLE"
    return status
