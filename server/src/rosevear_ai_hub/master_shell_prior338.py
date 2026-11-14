"""Build 338: independently re-verify protected QL-446 reopened incident ancestry.

A status badge or receipt digest alone cannot satisfy this gate. Historical
signed evidence is never a current receiver-state assertion.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_escalation337 import (
    ACTION, CLASS_DIVERGENCE, CLASS_REOPEN, ESCALATION, HORIZONS,
    MASTER_REOPEN, OFFICER_ACTION, OFFICER_SEVERITY, OWNER_REOPEN, ROLES,
    ProtectedEscalationJournal337, verify446,
)
from rosevear_ai_hub.master_shell_prior337 import verify_prior_stability337


def verify_prior_escalation338(
    monitor: Any,
    *,
    prior445: dict[str, Any],
    result446: dict[str, Any],
    request446: dict[str, Any],
    journal446: ProtectedEscalationJournal337,
    pins446: dict[str, tuple[bytes, str]],
    signed446: dict[str, Any],
    masters446: dict[str, Any],
    owners446: dict[str, Any],
    officer446: dict[str, Any],
) -> tuple[str, dict[str, Any]] | None:
    """Require exact signed original-host/independent QL-446 ESCALATION."""
    if not (
        isinstance(prior445, dict)
        and isinstance(result446, dict)
        and result446.get("accepted") is True
        and result446.get("state") == ESCALATION
        and result446.get("connection") == "HOLD"
        and result446.get("activationAuthorized") is False
        and result446.get("physicalReceiverCurrentlyOff") is False
        and result446.get("incidentClosed") is False
        and result446.get("recurrenceSuspected") is True
        and result446.get("incidentReopeningEvidenceAdmitted") is True
        and result446.get("masterCount") == 3
        and result446.get("originalHost") == "DESKTOP-AE894KC"
        and isinstance(request446, dict)
        and request446.get("action") == ACTION
        and isinstance(journal446, ProtectedEscalationJournal337)
        and isinstance(pins446, dict)
        and set(pins446) == set(ROLES)
        and isinstance(signed446, dict)
        and set(signed446) == {
            "commsSource", "hostSHORT", "hostMEDIUM", "hostLONG",
            "observerShort", "observerMedium", "observerLong",
        }
        and isinstance(masters446, dict)
        and set(masters446) == set(MASTERS)
        and isinstance(owners446, dict)
        and set(owners446) == {"owner", "ownerReviewer"}
    ):
        return None
    previous = verify_prior_stability337(monitor, **prior445)
    if previous is None:
        return None
    prior_digest, link = previous
    incident = link["incident"]
    request_digest = _digest(request446)
    pending = journal446.read(monitor, incident, "PENDING")
    terminal = journal446.read(monitor, incident, "ESCALATION")
    conflicting = journal446.read(monitor, incident, "WATCH")
    if not (
        pending
        and terminal
        and conflicting is None
        and pending.get("requestDigest") == request_digest
        and pending.get("evidenceDigest") == prior_digest
        and terminal.get("requestDigest") == request_digest
        and result446.get("pendingReceiptDigest") == pending["receiptDigest"]
        and result446.get("finalReceiptDigest") == terminal["receiptDigest"]
        and result446.get("originalIncidentId") == incident
        and request446.get("originalIncidentId") == incident
        and request446.get("challengeId") == link["challengeId"]
        and request446.get("leaseId") == link["leaseId"]
        and request446.get("priorQl445Digest") == prior_digest
        and request446.get("ql445ReceiptDigest") == link["ql445ReceiptDigest"]
        and request446.get("previousObserverDigest") == link["previousObserverDigest"]
        and request446.get("previousClassification") == link["ql445Classification"]
        and isinstance(request446.get("challengeNonce"), str)
        and isinstance(request446.get("watchId"), str)
        and len(request446["challengeNonce"]) >= 12
        and len(request446["watchId"]) >= 12
        and len({
            request446["challengeNonce"], request446["watchId"],
            link["previousNonce"], link["previousWatchId"],
        }) == 4
    ):
        return None
    source = verify446("commsSource", signed446["commsSource"], pins446)
    if not (
        source
        and source.get("requestDigest") == request_digest
        and source.get("originalIncidentId") == incident
        and source.get("priorQl445Digest") == prior_digest
        and source.get("ql445ReceiptDigest") == link["ql445ReceiptDigest"]
        and source.get("previousObserverDigest") == link["previousObserverDigest"]
        and source.get("priorClassification") == link["ql445Classification"]
        and source.get("assertedState") == "QL445_HISTORICAL_EVIDENCE_ONLY_HOLD"
        and type(source.get("observedAtMs")) is int
        and source["observedAtMs"] >= link["previousObservedAtMs"]
    ):
        return None
    host_digests, observer_digests = [], []
    previous_host_digest = None
    previous_observer_digest = link["previousObserverDigest"]
    previous_sequence = link["previousSequence"]
    previous_time = link["previousObservedAtMs"]
    first_host_time = None
    any_on, divergence = False, False
    last_observed_time = previous_time
    for index, horizon in enumerate(HORIZONS, start=1):
        role = {"SHORT": "observerShort", "MEDIUM": "observerMedium",
                "LONG": "observerLong"}[horizon]
        host = verify446("host", signed446["host" + horizon], pins446)
        witness = verify446(role, signed446[role], pins446)
        if not (host and witness):
            return None
        if not (
            host.get("requestDigest") == request_digest
            and host.get("sourceDigest") == _digest(source)
            and host.get("originalIncidentId") == incident
            and host.get("hostMachineId") == "DESKTOP-AE894KC"
            and host.get("challengeId") == link["challengeId"]
            and host.get("leaseId") == link["leaseId"]
            and host.get("challengeNonce") == request446["challengeNonce"]
            and host.get("watchId") == request446["watchId"]
            and host.get("horizon") == horizon
            and host.get("previousHostDigest") == previous_host_digest
            and host.get("previousObserverDigest") == previous_observer_digest
            and host.get("watchdogArmed") is True
            and host.get("receiverState") in ("OFF", "ON")
            and type(host.get("sequence")) is int
            and host["sequence"] > previous_sequence
            and type(host.get("observedAtMs")) is int
            and host["observedAtMs"] > previous_time
            and witness.get("requestDigest") == request_digest
            and witness.get("originalIncidentId") == incident
            and witness.get("challengeId") == link["challengeId"]
            and witness.get("leaseId") == link["leaseId"]
            and witness.get("challengeNonce") == request446["challengeNonce"]
            and witness.get("watchId") == request446["watchId"]
            and witness.get("horizon") == horizon
            and witness.get("hostProbeDigest") == _digest(host)
            and witness.get("previousObserverDigest") == previous_observer_digest
            and witness.get("receiverState") in ("OFF", "ON")
            and type(witness.get("sequence")) is int
            and witness["sequence"] > host["sequence"]
            and type(witness.get("observedAtMs")) is int
            and witness["observedAtMs"] >= host["observedAtMs"]
        ):
            return None
        if index == 1:
            first_host_time = host["observedAtMs"]
        elif host["observedAtMs"] - first_host_time < (4_000 if index == 2 else 10_000):
            return None
        any_on |= host["receiverState"] == "ON" or witness["receiverState"] == "ON"
        divergence |= host["receiverState"] != witness["receiverState"]
        host_digests.append(_digest(host))
        observer_digests.append(_digest(witness))
        previous_host_digest = _digest(host)
        previous_observer_digest = _digest(witness)
        previous_sequence = witness["sequence"]
        previous_time = witness["observedAtMs"]
        last_observed_time = previous_time
    classification = CLASS_DIVERGENCE if divergence else CLASS_REOPEN
    if not (link["priorRecurrenceOpen"] or any_on or divergence):
        return None
    watch_digest = _digest({
        "prior": prior_digest, "source": _digest(source),
        "hostDigests": host_digests, "observerDigests": observer_digests,
        "classification": classification,
    })
    officer = verify446("escalationOfficer", officer446, pins446)
    if not (
        result446.get("classification") == classification
        and result446.get("threeHorizonWatchDigest") == watch_digest
        and officer
        and isinstance(officer.get("caseId"), str)
        and len(officer["caseId"]) >= 12
        and officer.get("requestDigest") == request_digest
        and officer.get("originalIncidentId") == incident
        and officer.get("priorQl445Digest") == prior_digest
        and officer.get("ql445ReceiptDigest") == link["ql445ReceiptDigest"]
        and officer.get("commsSourceDigest") == _digest(source)
        and officer.get("threeHorizonWatchDigest") == watch_digest
        and officer.get("classification") == classification
        and officer.get("severity") == OFFICER_SEVERITY
        and officer.get("decision") == OFFICER_ACTION
        and type(officer.get("reviewedAtMs")) is int
        and officer["reviewedAtMs"] >= last_observed_time
        and result446.get("officerDigest") == _digest(officer)
    ):
        return None
    reports = []
    for master in MASTERS:
        body = verify446(master, masters446[master], pins446)
        if not (
            body and body.get("masterId") == master
            and body.get("requestDigest") == request_digest
            and body.get("originalIncidentId") == incident
            and body.get("priorQl445Digest") == prior_digest
            and body.get("ql445ReceiptDigest") == link["ql445ReceiptDigest"]
            and body.get("threeHorizonWatchDigest") == watch_digest
            and body.get("escalationDigest") == _digest(officer)
            and body.get("classification") == classification
            and body.get("decision") == MASTER_REOPEN
            and type(body.get("reviewedAtMs")) is int
            and body["reviewedAtMs"] >= last_observed_time
        ):
            return None
        reports.append(body)
    if result446.get("threeMasterDigest") != _digest(reports):
        return None
    owners = []
    for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        body = verify446(role, owners446[role], pins446)
        if not (
            body and body.get("ownerId") == owner_id
            and body.get("requestDigest") == request_digest
            and body.get("originalIncidentId") == incident
            and body.get("priorQl445Digest") == prior_digest
            and body.get("ql445ReceiptDigest") == link["ql445ReceiptDigest"]
            and body.get("threeHorizonWatchDigest") == watch_digest
            and body.get("threeMasterDigest") == _digest(reports)
            and body.get("escalationDigest") == _digest(officer)
            and body.get("classification") == classification
            and body.get("decision") == OWNER_REOPEN
            and type(body.get("reviewedAtMs")) is int
            and body["reviewedAtMs"] >= max(x["reviewedAtMs"] for x in reports)
        ):
            return None
        owners.append(body)
    evidence = _digest({
        "prior": prior_digest, "source": source,
        "hostProbes": [verify446("host", signed446["host" + h], pins446) for h in HORIZONS],
        "observerProbes": [
            verify446({"SHORT": "observerShort", "MEDIUM": "observerMedium",
                       "LONG": "observerLong"}[h], signed446[
                {"SHORT": "observerShort", "MEDIUM": "observerMedium",
                 "LONG": "observerLong"}[h]], pins446) for h in HORIZONS
        ],
        "watchDigest": watch_digest, "officer": _digest(officer),
        "masters": reports, "owners": owners,
        "classification": classification,
    })
    if terminal.get("evidenceDigest") != evidence:
        return None
    return _digest({
        "previous": prior_digest, "pending": pending,
        "terminal": terminal, "signedEvidence": evidence,
    }), {
        "incident": incident,
        "caseId": officer["caseId"],
        "ql446ReceiptDigest": terminal["receiptDigest"],
        "ql446Classification": classification,
        "previousObserverDigest": previous_observer_digest,
        "previousObservedAtMs": last_observed_time,
        "previousSequence": previous_sequence,
        "previousNonce": request446["challengeNonce"],
        "previousWatchId": request446["watchId"],
        "ownerIds": link["ownerIds"],
        "challengeId": link["challengeId"],
        "leaseId": link["leaseId"],
    }
