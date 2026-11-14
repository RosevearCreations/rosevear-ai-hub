"""Build 337 QL-446: signed multi-horizon recurrence safety evidence.

Historical admission only. No receiver actuation, connection or live OFF claim.
"""

from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_decision333 import ProtectedWitnessJournal333, hold_decision333
from rosevear_ai_hub.master_shell_prior337 import verify_prior_stability337

ACTION = "QL446_SIGNED_MULTI_HORIZON_PROTECTED_RECURRENCE_ESCALATION"
WATCH = "DURABLE_QL446_MULTI_HORIZON_OFF_EVIDENCE_ACCEPTED"
ESCALATION = "DURABLE_QL446_RECURRENCE_REOPENING_CASE_OPEN"
CLASS_WATCH = "RECONCILED_MULTI_HORIZON_OFF_HISTORICAL_ONLY"
CLASS_REOPEN = "SIGNED_RECURRENCE_ESCALATE_REOPEN"
CLASS_DIVERGENCE = "SIGNED_STATE_DIVERGENCE_SAFETY_ESCALATION"
OFFICER_ACTION = "OPEN_PROTECTED_INCIDENT_KEEP_OFF_ISOLATION"
OFFICER_SEVERITY = "RECEIVER_SAFETY_CRITICAL_RECHECK"
MASTER_WATCH = "ACCEPT_MULTI_HORIZON_OFF_EVIDENCE_KEEP_HOLD"
MASTER_REOPEN = "REOPEN_INCIDENT_KEEP_HOLD_REQUIRE_INDEPENDENT_ISOLATION"
OWNER_WATCH = "ACKNOWLEDGE_MULTI_HORIZON_OFF_EVIDENCE_HOLD"
OWNER_REOPEN = "ACKNOWLEDGE_PROTECTED_RECURRENCE_REOPEN_KEEP_HOLD"
HORIZONS = ("SHORT", "MEDIUM", "LONG")
ROLES = (
    "commsSource",
    "host",
    "observerShort",
    "observerMedium",
    "observerLong",
    "escalationOfficer",
    "owner",
    "ownerReviewer",
    *MASTERS,
)


class ProtectedEscalationJournal337(ProtectedWitnessJournal333):
    """Private fsynced PENDING then mutually exclusive WATCH or ESCALATION."""

    def __init__(self, directory: Path):
        super().__init__(directory)
        self.stages = ("PENDING", "WATCH", "ESCALATION")
        self.terminal_stages = ("WATCH", "ESCALATION")


def verify446(
    role: str, envelope: Any, pins: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if role not in pins or not isinstance(envelope, dict):
        return None
    payload = envelope.get("payload")
    if not isinstance(payload, dict):
        return None
    schema = f"rosevear.ai-hub.ql446.{role}.v1"
    return payload if _native(envelope, set(payload), schema, *pins[role]) == payload else None


def hold337(state: str, suspected: bool = False) -> dict[str, Any]:
    return {
        **hold_decision333(state),
        "sourceBuild": 337,
        "state": state,
        "historicalEvidenceOnly": True,
        "incidentClosed": False,
        "freshPhysicalOffProven": False,
        "recurrenceSuspected": suspected,
        "incidentReopeningEvidenceAdmitted": False,
    }


def review_escalation337(
    monitor: Any,
    prior445: dict[str, Any],
    request: dict[str, Any],
    journal: ProtectedEscalationJournal337,
    pins: dict[str, tuple[bytes, str]],
    *,
    read_comms_source: Any,
    read_host: Any,
    read_observer: Any,
    escalation_officer: dict[str, Any] | None,
    master_reports: dict[str, Any],
    dual_owners: dict[str, Any],
    now_ms: int,
    final_now_ms: int,
) -> dict[str, Any]:
    """Original-host custody only; signed escalation never activates a receiver."""

    def fail(state: str, suspected: bool = False) -> dict[str, Any]:
        return hold337(state, suspected)

    if not (
        _on_ree(monitor)
        and isinstance(prior445, dict)
        and isinstance(request, dict)
        and isinstance(journal, ProtectedEscalationJournal337)
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
        and callable(read_host)
        and callable(read_observer)
    ):
        return fail("HOLD_QL446_ORIGINAL_HOST_PINS_OR_CLOCK_NOT_TRUSTED")
    try:
        previous = verify_prior_stability337(monitor, **prior445)
        if not previous:
            return fail("HOLD_QL446_EXACT_SIGNED_QL431_TO_445_ANCESTRY_REQUIRED")
        previous_digest, link = previous
        incident = link["incident"]
        req_digest = _digest(request)
        nonce = request.get("challengeNonce")
        watch = request.get("watchId")
        if not (
            request.get("action") == ACTION
            and request.get("originalIncidentId") == incident
            and request.get("challengeId") == link["challengeId"]
            and request.get("leaseId") == link["leaseId"]
            and request.get("priorQl445Digest") == previous_digest
            and request.get("ql445ReceiptDigest") == link["ql445ReceiptDigest"]
            and request.get("previousObserverDigest") == link["previousObserverDigest"]
            and request.get("previousClassification") == link["ql445Classification"]
            and isinstance(nonce, str)
            and len(nonce) >= 12
            and isinstance(watch, str)
            and len(watch) >= 12
            and len({nonce, watch, link["previousNonce"], link["previousWatchId"]}) == 4
            and now_ms > link["previousObservedAtMs"]
        ):
            return fail("HOLD_QL446_FRESH_CHALLENGE_AND_PRIOR_RECEIPT_MISMATCH")
        pending = journal.claim(monitor, incident, "PENDING", req_digest, previous_digest)
        if not pending:
            return fail("HOLD_QL446_ONE_USE_PENDING_CONSUMED_OR_UNDURABLE")
        source = verify446(
            "commsSource",
            read_comms_source(request=request, pendingDigest=pending["receiptDigest"]),
            pins,
        )
        if not (
            source
            and source.get("requestDigest") == req_digest
            and source.get("originalIncidentId") == incident
            and source.get("priorQl445Digest") == previous_digest
            and source.get("ql445ReceiptDigest") == link["ql445ReceiptDigest"]
            and source.get("previousObserverDigest") == link["previousObserverDigest"]
            and source.get("priorClassification") == link["ql445Classification"]
            and source.get("assertedState") == "QL445_HISTORICAL_EVIDENCE_ONLY_HOLD"
            and type(source.get("observedAtMs")) is int
            and link["previousObservedAtMs"] <= source["observedAtMs"] <= now_ms
            and now_ms - source["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL446_ORIGINAL_SIGNED_COMMS_SOURCE_INVALID")
        observed = []
        previous_obs_digest = link["previousObserverDigest"]
        previous_host_digest = None
        previous_time = link["previousObservedAtMs"]
        previous_seq = link["previousSequence"]
        first_host_time = None
        for index, horizon in enumerate(HORIZONS, start=1):
            host = verify446(
                "host",
                read_host(
                    request=request,
                    horizon=horizon,
                    sourceDigest=_digest(source),
                    previousObserverDigest=previous_obs_digest,
                ),
                pins,
            )
            if not (
                host
                and host.get("requestDigest") == req_digest
                and host.get("sourceDigest") == _digest(source)
                and host.get("originalIncidentId") == incident
                and host.get("hostMachineId") == "DESKTOP-AE894KC"
                and host.get("challengeId") == link["challengeId"]
                and host.get("leaseId") == link["leaseId"]
                and host.get("challengeNonce") == nonce
                and host.get("watchId") == watch
                and host.get("horizon") == horizon
                and host.get("previousHostDigest") == previous_host_digest
                and host.get("previousObserverDigest") == previous_obs_digest
                and host.get("watchdogArmed") is True
                and host.get("receiverState") in ("OFF", "ON")
                and type(host.get("sequence")) is int
                and host["sequence"] > previous_seq
                and type(host.get("observedAtMs")) is int
                and previous_time < host["observedAtMs"] <= now_ms
                and now_ms - host["observedAtMs"] <= 60_000
            ):
                return fail("HOLD_QL446_SIGNED_ORIGINAL_HOST_HORIZON_INVALID")
            if index == 1:
                first_host_time = host["observedAtMs"]
            elif host["observedAtMs"] - first_host_time < (4_000 if index == 2 else 10_000):
                return fail("HOLD_QL446_MINIMUM_FOUR_TEN_SECOND_HORIZONS_NOT_MET")
            role = {
                "SHORT": "observerShort",
                "MEDIUM": "observerMedium",
                "LONG": "observerLong",
            }[horizon]
            witness = verify446(
                role,
                read_observer(
                    request=request,
                    horizon=horizon,
                    hostDigest=_digest(host),
                    previousObserverDigest=previous_obs_digest,
                ),
                pins,
            )
            if not (
                witness
                and witness.get("requestDigest") == req_digest
                and witness.get("originalIncidentId") == incident
                and witness.get("challengeId") == link["challengeId"]
                and witness.get("leaseId") == link["leaseId"]
                and witness.get("challengeNonce") == nonce
                and witness.get("watchId") == watch
                and witness.get("horizon") == horizon
                and witness.get("hostProbeDigest") == _digest(host)
                and witness.get("previousObserverDigest") == previous_obs_digest
                and witness.get("receiverState") in ("OFF", "ON")
                and type(witness.get("sequence")) is int
                and witness["sequence"] > host["sequence"]
                and type(witness.get("observedAtMs")) is int
                and host["observedAtMs"] <= witness["observedAtMs"] <= now_ms
                and now_ms - witness["observedAtMs"] <= 60_000
            ):
                return fail("HOLD_QL446_INDEPENDENT_SIGNED_HORIZON_INVALID")
            observed.append((host, witness))
            previous_seq = witness["sequence"]
            previous_time = witness["observedAtMs"]
            previous_obs_digest = _digest(witness)
            previous_host_digest = _digest(host)
        divergence = any(h["receiverState"] != w["receiverState"] for h, w in observed)
        any_on = any(state["receiverState"] == "ON" for pair in observed for state in pair)
        reopening = link["priorRecurrenceOpen"] or any_on or divergence
        classification = (
            CLASS_DIVERGENCE if divergence else CLASS_REOPEN if reopening else CLASS_WATCH
        )
        host_digests = [_digest(host) for host, _ in observed]
        observer_digests = [_digest(witness) for _, witness in observed]
        watch_digest = _digest(
            {
                "prior": previous_digest,
                "source": _digest(source),
                "hostDigests": host_digests,
                "observerDigests": observer_digests,
                "classification": classification,
            }
        )
        escalation_digest = None
        if reopening:
            officer = verify446("escalationOfficer", escalation_officer, pins)
            if not (
                officer
                and officer.get("requestDigest") == req_digest
                and officer.get("originalIncidentId") == incident
                and officer.get("caseId")
                and isinstance(officer["caseId"], str)
                and len(officer["caseId"]) >= 12
                and officer.get("priorQl445Digest") == previous_digest
                and officer.get("ql445ReceiptDigest") == link["ql445ReceiptDigest"]
                and officer.get("commsSourceDigest") == _digest(source)
                and officer.get("threeHorizonWatchDigest") == watch_digest
                and officer.get("classification") == classification
                and officer.get("severity") == OFFICER_SEVERITY
                and officer.get("decision") == OFFICER_ACTION
                and type(officer.get("reviewedAtMs")) is int
                and observed[2][1]["observedAtMs"] <= officer["reviewedAtMs"] <= now_ms
            ):
                return fail("HOLD_QL446_INDEPENDENT_SIGNED_ESCALATION_REQUIRED", True)
            escalation_digest = _digest(officer)
        elif escalation_officer is not None:
            return fail("HOLD_QL446_UNEXPECTED_ESCALATION_ON_STABLE_PATH")
        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL446_THREE_DISTINCT_MASTERS_REQUIRED", reopening)
        reports = []
        for master in MASTERS:
            body = verify446(master, master_reports[master], pins)
            if not (
                body
                and body.get("masterId") == master
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("priorQl445Digest") == previous_digest
                and body.get("ql445ReceiptDigest") == link["ql445ReceiptDigest"]
                and body.get("threeHorizonWatchDigest") == watch_digest
                and body.get("escalationDigest") == escalation_digest
                and body.get("classification") == classification
                and body.get("decision") == (MASTER_REOPEN if reopening else MASTER_WATCH)
                and type(body.get("reviewedAtMs")) is int
                and observed[2][1]["observedAtMs"] <= body["reviewedAtMs"] <= now_ms
            ):
                return fail("HOLD_QL446_THREE_MASTER_REOPENING_VETO", reopening)
            reports.append(body)
        if not isinstance(dual_owners, dict) or set(dual_owners) != {"owner", "ownerReviewer"}:
            return fail("HOLD_QL446_TWO_INDEPENDENT_OWNERS_REQUIRED", reopening)
        owners = []
        for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
            body = verify446(role, dual_owners[role], pins)
            if not (
                body
                and body.get("ownerId") == owner_id
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("priorQl445Digest") == previous_digest
                and body.get("ql445ReceiptDigest") == link["ql445ReceiptDigest"]
                and body.get("threeHorizonWatchDigest") == watch_digest
                and body.get("threeMasterDigest") == _digest(reports)
                and body.get("escalationDigest") == escalation_digest
                and body.get("classification") == classification
                and body.get("decision") == (OWNER_REOPEN if reopening else OWNER_WATCH)
                and type(body.get("reviewedAtMs")) is int
                and max(report["reviewedAtMs"] for report in reports)
                <= body["reviewedAtMs"]
                <= final_now_ms
            ):
                return fail("HOLD_QL446_DUAL_OWNER_ESCALATION_NOT_AUTHORIZED", reopening)
            owners.append(body)
        if verify_prior_stability337(monitor, **prior445) != previous:
            return fail("HOLD_QL446_PROTECTED_QL445_ANCESTRY_DRIFT", reopening)
        if journal.read(monitor, incident, "PENDING") != pending:
            return fail("HOLD_QL446_PENDING_CUSTODY_DRIFT", reopening)
        if any(
            journal.read(monitor, incident, stage) is not None for stage in ("WATCH", "ESCALATION")
        ):
            return fail("HOLD_QL446_TERMINAL_REPLAY", reopening)
        evidence_digest = _digest(
            {
                "prior": previous_digest,
                "source": source,
                "hostProbes": [h for h, _ in observed],
                "observerProbes": [w for _, w in observed],
                "watchDigest": watch_digest,
                "officer": escalation_digest,
                "masters": reports,
                "owners": owners,
                "classification": classification,
            }
        )
        stage = "ESCALATION" if reopening else "WATCH"
        terminal = journal.claim(monitor, incident, stage, req_digest, evidence_digest)
        if not terminal:
            return fail("HOLD_QL446_TERMINAL_CUSTODY_UNDURABLE", reopening)
        return {
            **hold337(ESCALATION if reopening else WATCH, reopening),
            "accepted": True,
            "state": ESCALATION if reopening else WATCH,
            "originalIncidentId": incident,
            "priorRecurrenceOpen": link["priorRecurrenceOpen"],
            "classification": classification,
            "recurrenceSuspected": reopening,
            "incidentReopeningEvidenceAdmitted": reopening,
            "originalHost": "DESKTOP-AE894KC",
            "threeHorizonWatchDigest": watch_digest,
            "officerDigest": escalation_digest,
            "threeMasterDigest": _digest(reports),
            "pendingReceiptDigest": pending["receiptDigest"],
            "finalReceiptDigest": terminal["receiptDigest"],
            "masterCount": 3,
            "nextAction": "MANUAL_RECEIVER_ISOLATION_AND_FRESH_SIGNED_EXTERNAL_READBACK",
        }
    except (KeyError, TypeError, ValueError, OSError):
        return fail("HOLD_QL446_UNTRUSTED_OR_INCOMPLETE_SIGNED_CUSTODY")


def read_private_escalation337(
    monitor: Any, journal: ProtectedEscalationJournal337, incident: str
) -> dict[str, Any]:
    status = hold337("QL446_PRIVATE_HISTORICAL_CUSTODY_NOT_LIVE_RECEIVER_STATE")
    try:
        pending = journal.read(monitor, incident, "PENDING")
        stable = journal.read(monitor, incident, "WATCH")
        incident_open = journal.read(monitor, incident, "ESCALATION")
        if stable and incident_open:
            status["state"] = "HOLD_QL446_CONFLICTING_TERMINAL_CUSTODY"
            status["recurrenceSuspected"] = True
        elif pending and stable and stable["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL446_HISTORICAL_MULTI_HORIZON_OFF_NOT_LIVE_STATE"
            status["historicalReceiptDigest"] = stable["receiptDigest"]
        elif (
            pending and incident_open and incident_open["requestDigest"] == pending["requestDigest"]
        ):
            status["state"] = "QL446_PROTECTED_RECURRENCE_CASE_OPEN_HOLD"
            status["historicalReceiptDigest"] = incident_open["receiptDigest"]
            status["recurrenceSuspected"] = True
        elif pending:
            status["state"] = "QL446_ONE_USE_PENDING_NOT_REPLAYABLE"
    except (ValueError, OSError):
        status["state"] = "HOLD_QL446_PROTECTED_CUSTODY_UNREADABLE"
    return status
