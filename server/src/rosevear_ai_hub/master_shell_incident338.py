"""Build 338 QL-447 original-host recurrence intake and isolation continuity.

A successful record is *historical* evidence. All outcomes keep the receiver
UNKNOWN, connection HOLD, activation forbidden and the incident OPEN.
"""

from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_decision333 import ProtectedWitnessJournal333, hold_decision333
from rosevear_ai_hub.master_shell_prior338 import verify_prior_escalation338

ACTION = "QL447_SIGNED_ORIGINAL_HOST_RECURRENCE_ISOLATION_FOLLOWUP"
RECONFIRMED = "DURABLE_QL447_ISOLATION_RECONFIRMATION_EVIDENCE_ONLY"
EXCEPTION = "DURABLE_QL447_ISOLATION_EXCEPTION_CORRECTIVE_FOLLOWUP_OPEN"
CLASS_RECONFIRMED = "SIGNED_HISTORICAL_ISOLATION_RECONFIRMED_INCIDENT_OPEN"
CLASS_EXCEPTION = "SIGNED_ISOLATION_RECONFIRMATION_EXCEPTION_INCIDENT_OPEN"
DECISION_RECONFIRMED = "CONTINUE_MANUAL_ISOLATION_MONITORING_KEEP_INCIDENT_OPEN"
DECISION_EXCEPTION = "ESCALATE_ISOLATION_FAILURE_FOR_SUPERVISED_CORRECTION_KEEP_OPEN"
ROLES = ("commsSource", "host", "observer", "owner", "ownerReviewer", *MASTERS)


class ProtectedIncidentJournal338(ProtectedWitnessJournal333):
    """Exclusive, fsynced PENDING -> RECONFIRMED/EXCEPTION, never auto-retry."""

    def __init__(self, directory: Path):
        super().__init__(directory)
        self.stages = ("PENDING", "RECONFIRMED", "EXCEPTION")
        self.terminal_stages = ("RECONFIRMED", "EXCEPTION")


def verify447(
    role: str, envelope: Any, pins: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if role not in pins or not isinstance(envelope, dict):
        return None
    payload = envelope.get("payload")
    if not isinstance(payload, dict):
        return None
    schema = f"rosevear.ai-hub.ql447.{role}.v1"
    return payload if _native(envelope, set(payload), schema, *pins[role]) == payload else None


def hold338(reason: str, exception: bool = False) -> dict[str, Any]:
    return {
        **hold_decision333(reason),
        "sourceBuild": 338,
        "state": reason,
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "historicalEvidenceOnly": True,
        "incidentStatus": "OPEN",
        "incidentClosed": False,
        "freshPhysicalOffProven": False,
        "isolationExceptionSuspected": exception,
        "correctiveFollowUpAdmitted": False,
    }


def review_incident338(
    monitor: Any,
    prior446: dict[str, Any],
    request: dict[str, Any],
    journal: ProtectedIncidentJournal338,
    pins: dict[str, tuple[bytes, str]],
    *,
    read_comms_source: Any,
    read_host: Any,
    read_observer: Any,
    master_reports: dict[str, Any],
    dual_owners: dict[str, Any],
    now_ms: int,
    final_now_ms: int,
) -> dict[str, Any]:
    """Signed original-host read-only adapters; no physical receiver channel."""

    def fail(reason: str, exception: bool = False) -> dict[str, Any]:
        return hold338(reason, exception)

    if not (
        _on_ree(monitor)
        and isinstance(prior446, dict)
        and isinstance(request, dict)
        and isinstance(journal, ProtectedIncidentJournal338)
        and isinstance(pins, dict)
        and set(pins) == set(ROLES)
        and all(
            isinstance(pin, tuple) and len(pin) == 2
            and isinstance(pin[0], bytes) and isinstance(pin[1], str)
            and _public_ed25519(*pin) for pin in pins.values()
        )
        and len({pin[0] for pin in pins.values()}) == len(ROLES)
        and len({pin[1] for pin in pins.values()}) == len(ROLES)
        and type(now_ms) is int and type(final_now_ms) is int
        and 0 <= final_now_ms - now_ms <= 60_000
        and callable(read_comms_source) and callable(read_host) and callable(read_observer)
    ):
        return fail("HOLD_QL447_ORIGINAL_HOST_SESSION_PINS_OR_CLOCK_UNTRUSTED")
    try:
        verified = verify_prior_escalation338(monitor, **prior446)
        if verified is None:
            return fail("HOLD_QL447_EXACT_SIGNED_REOPENED_QL446_CASE_REQUIRED")
        prior_digest, link = verified
        incident = link["incident"]
        nonce, follow_up = request.get("challengeNonce"), request.get("followUpId")
        req_digest = _digest(request)
        if not (
            request.get("action") == ACTION
            and request.get("originalIncidentId") == incident
            and request.get("ql446CaseId") == link["caseId"]
            and request.get("priorQl446Digest") == prior_digest
            and request.get("ql446EscalationReceiptDigest") == link["ql446ReceiptDigest"]
            and request.get("priorClassification") == link["ql446Classification"]
            and request.get("previousObserverDigest") == link["previousObserverDigest"]
            and request.get("challengeId") == link["challengeId"]
            and request.get("leaseId") == link["leaseId"]
            and isinstance(nonce, str) and len(nonce) >= 12
            and isinstance(follow_up, str) and len(follow_up) >= 12
            and len({nonce, follow_up, link["previousNonce"], link["previousWatchId"]}) == 4
            and now_ms > link["previousObservedAtMs"]
        ):
            return fail("HOLD_QL447_FRESH_SCOPED_CHALLENGE_REQUIRED")
        pending = journal.claim(monitor, incident, "PENDING", req_digest, prior_digest)
        if not pending:
            return fail("HOLD_QL447_PRIVATE_PENDING_ALREADY_CONSUMED_OR_UNDURABLE")
        source = verify447(
            "commsSource",
            read_comms_source(request=request, pendingDigest=pending["receiptDigest"]), pins,
        )
        if not (
            source
            and source.get("requestDigest") == req_digest
            and source.get("originalIncidentId") == incident
            and source.get("ql446CaseId") == link["caseId"]
            and source.get("priorQl446Digest") == prior_digest
            and source.get("ql446EscalationReceiptDigest") == link["ql446ReceiptDigest"]
            and source.get("priorClassification") == link["ql446Classification"]
            and source.get("incidentStatus") == "OPEN_HOLD"
            and type(source.get("observedAtMs")) is int
            and link["previousObservedAtMs"] < source["observedAtMs"] <= now_ms
            and now_ms - source["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL447_ORIGINAL_SIGNED_OPEN_INCIDENT_INVALID")
        host = verify447(
            "host", read_host(request=request, sourceDigest=_digest(source)), pins,
        )
        if not (
            host and host.get("requestDigest") == req_digest
            and host.get("originalIncidentId") == incident
            and host.get("ql446EscalationReceiptDigest") == link["ql446ReceiptDigest"]
            and host.get("ql446CaseId") == link["caseId"]
            and host.get("hostMachineId") == "DESKTOP-AE894KC"
            and host.get("challengeNonce") == nonce
            and host.get("followUpId") == follow_up
            and host.get("sourceDigest") == _digest(source)
            and host.get("previousObserverDigest") == link["previousObserverDigest"]
            and host.get("receiverState") in ("OFF", "ON")
            and type(host.get("isolationLock")) is bool
            and type(host.get("leaseRevoked")) is bool
            and type(host.get("watchdogArmed")) is bool
            and type(host.get("sequence")) is int
            and host["sequence"] > link["previousSequence"]
            and type(host.get("observedAtMs")) is int
            and source["observedAtMs"] <= host["observedAtMs"] <= now_ms
            and host["observedAtMs"] > link["previousObservedAtMs"]
            and now_ms - host["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL447_SIGNED_ORIGINAL_HOST_ISOLATION_INVALID")
        witness = verify447(
            "observer", read_observer(request=request, hostDigest=_digest(host)), pins,
        )
        if not (
            witness and witness.get("requestDigest") == req_digest
            and witness.get("originalIncidentId") == incident
            and witness.get("ql446EscalationReceiptDigest") == link["ql446ReceiptDigest"]
            and witness.get("ql446CaseId") == link["caseId"]
            and witness.get("challengeNonce") == nonce
            and witness.get("followUpId") == follow_up
            and witness.get("signedHostDigest") == _digest(host)
            and witness.get("receiverState") in ("OFF", "ON")
            and type(witness.get("isolationConfirmed")) is bool
            and type(witness.get("sequence")) is int
            and witness["sequence"] > host["sequence"]
            and type(witness.get("observedAtMs")) is int
            and host["observedAtMs"] <= witness["observedAtMs"] <= now_ms
            and now_ms - witness["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL447_SIGNED_INDEPENDENT_RECEIVER_INVALID")
        reconfirmed = (
            host["receiverState"] == witness["receiverState"] == "OFF"
            and host["isolationLock"] and host["leaseRevoked"]
            and host["watchdogArmed"] and witness["isolationConfirmed"]
        )
        classification = CLASS_RECONFIRMED if reconfirmed else CLASS_EXCEPTION
        decision = DECISION_RECONFIRMED if reconfirmed else DECISION_EXCEPTION
        evidence_digest = _digest({
            "prior": prior_digest, "source": _digest(source),
            "host": _digest(host), "observer": _digest(witness),
            "classification": classification, "followUpId": follow_up,
        })
        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL447_THREE_MASTERS_REQUIRED", not reconfirmed)
        reports = []
        for master in MASTERS:
            body = verify447(master, master_reports[master], pins)
            if not (
                body and body.get("masterId") == master
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("followUpId") == follow_up
                and body.get("ql446EscalationReceiptDigest") == link["ql446ReceiptDigest"]
                and body.get("isolationEvidenceDigest") == evidence_digest
                and body.get("classification") == classification
                and body.get("correctiveDecision") == decision
                and body.get("incidentStatus") == "OPEN_HOLD"
                and type(body.get("reviewedAtMs")) is int
                and witness["observedAtMs"] <= body["reviewedAtMs"] <= now_ms
            ):
                return fail("HOLD_QL447_THREE_MASTER_CORRECTIVE_VETO", not reconfirmed)
            reports.append(body)
        master_digest = _digest(reports)
        if not isinstance(dual_owners, dict) or set(dual_owners) != {"owner", "ownerReviewer"}:
            return fail("HOLD_QL447_TWO_INDEPENDENT_OWNER_SIGNATURES_REQUIRED", not reconfirmed)
        owners = []
        for role, identity in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
            body = verify447(role, dual_owners[role], pins)
            if not (
                body and body.get("ownerId") == identity
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("followUpId") == follow_up
                and body.get("ql446EscalationReceiptDigest") == link["ql446ReceiptDigest"]
                and body.get("isolationEvidenceDigest") == evidence_digest
                and body.get("threeMasterDigest") == master_digest
                and body.get("classification") == classification
                and body.get("correctiveDecision") == decision
                and body.get("incidentStatus") == "OPEN_HOLD"
                and type(body.get("reviewedAtMs")) is int
                and max(report["reviewedAtMs"] for report in reports) <= body["reviewedAtMs"]
                <= final_now_ms
            ):
                return fail("HOLD_QL447_DUAL_OWNER_CORRECTIVE_VETO", not reconfirmed)
            owners.append(body)
        if verify_prior_escalation338(monitor, **prior446) != verified:
            return fail("HOLD_QL447_PROTECTED_REOPENED_INCIDENT_DRIFT", not reconfirmed)
        if journal.read(monitor, incident, "PENDING") != pending:
            return fail("HOLD_QL447_PENDING_PRIVATE_CUSTODY_DRIFT", not reconfirmed)
        if any(journal.read(monitor, incident, stage) is not None
               for stage in ("RECONFIRMED", "EXCEPTION")):
            return fail("HOLD_QL447_CONFLICTING_TERMINAL_CUSTODY", not reconfirmed)
        if final_now_ms - source["observedAtMs"] > 60_000 or (
            final_now_ms - witness["observedAtMs"] > 60_000
        ):
            return fail("HOLD_QL447_EXPIRED_SIGNED_ORIGINAL_EVIDENCE", not reconfirmed)
        evidence = _digest({
            "prior": prior_digest, "request": req_digest,
            "source": source, "host": host, "observer": witness,
            "masters": reports, "owners": owners,
            "classification": classification, "correctiveDecision": decision,
        })
        stage = "RECONFIRMED" if reconfirmed else "EXCEPTION"
        terminal = journal.claim(monitor, incident, stage, req_digest, evidence)
        if not terminal:
            return fail("HOLD_QL447_DURABLE_FOLLOWUP_COMMIT_FAILED", not reconfirmed)
        return {
            **hold338(RECONFIRMED if reconfirmed else EXCEPTION, not reconfirmed),
            "accepted": True,
            "originalIncidentId": incident,
            "ql446CaseId": link["caseId"],
            "followUpId": follow_up,
            "classification": classification,
            "correctiveDecision": decision,
            "correctiveFollowUpAdmitted": True,
            "masterCount": 3,
            "isolationEvidenceDigest": evidence_digest,
            "threeMasterDigest": master_digest,
            "pendingReceiptDigest": pending["receiptDigest"],
            "finalReceiptDigest": terminal["receiptDigest"],
            "nextAction": (
                "CONTINUE_MANUAL_ISOLATION_INDEPENDENT_RECHECK"
                if reconfirmed else "SUPERVISED_ISOLATION_EXCEPTION_REMEDIATION"
            ),
        }
    except (KeyError, TypeError, ValueError, OSError):
        return fail("HOLD_QL447_UNTRUSTED_OR_INCOMPLETE_SIGNED_CUSTODY")


def read_private_incident338(
    monitor: Any, journal: ProtectedIncidentJournal338, incident: str
) -> dict[str, Any]:
    status = hold338("QL447_PRIVATE_CUSTODY_NOT_CURRENT_RECEIVER_STATE")
    try:
        pending = journal.read(monitor, incident, "PENDING")
        reconfirmed = journal.read(monitor, incident, "RECONFIRMED")
        exception = journal.read(monitor, incident, "EXCEPTION")
        if reconfirmed and exception:
            status["state"] = "HOLD_QL447_CONFLICTING_TERMINAL_CUSTODY"
            status["isolationExceptionSuspected"] = True
        elif pending and reconfirmed and reconfirmed["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL447_HISTORICAL_ISOLATION_ONLY_INCIDENT_STILL_OPEN"
            status["historicalReceiptDigest"] = reconfirmed["receiptDigest"]
        elif pending and exception and exception["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL447_SIGNED_ISOLATION_EXCEPTION_STILL_OPEN"
            status["historicalReceiptDigest"] = exception["receiptDigest"]
            status["isolationExceptionSuspected"] = True
        elif pending:
            status["state"] = "HOLD_QL447_PENDING_SUPERVISED_RECOVERY_REQUIRED"
    except (OSError, ValueError):
        status["state"] = "HOLD_QL447_PRIVATE_CUSTODY_UNREADABLE"
    return status
