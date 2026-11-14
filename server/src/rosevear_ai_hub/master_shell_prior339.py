"""Build 339: independently verify QL-447 signed custody before QL-448 admission.

Historical receipt digests and status badges alone are never authority to
close an incident, claim live OFF, or activate the receiver.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_incident338 import (
    ACTION,
    CLASS_EXCEPTION,
    CLASS_RECONFIRMED,
    DECISION_EXCEPTION,
    DECISION_RECONFIRMED,
    EXCEPTION,
    RECONFIRMED,
    ROLES,
    ProtectedIncidentJournal338,
    verify447,
)
from rosevear_ai_hub.master_shell_prior338 import verify_prior_escalation338


def verify_prior_incident339(
    monitor: Any,
    *,
    prior446: dict[str, Any],
    result447: dict[str, Any],
    request447: dict[str, Any],
    journal447: ProtectedIncidentJournal338,
    pins447: dict[str, tuple[bytes, str]],
    signed447: dict[str, Any],
    masters447: dict[str, Any],
    owners447: dict[str, Any],
) -> tuple[str, dict[str, Any]] | None:
    """Reverify QL-431–447 ancestry, signatures, content and exclusive receipts."""
    if not (
        isinstance(prior446, dict)
        and isinstance(result447, dict)
        and result447.get("accepted") is True
        and result447.get("state") in (EXCEPTION, RECONFIRMED)
        and result447.get("connection") == "HOLD"
        and result447.get("activationAuthorized") is False
        and result447.get("physicalReceiverCurrentlyOff") is False
        and result447.get("incidentClosed") is False
        and result447.get("incidentStatus") == "OPEN"
        and result447.get("correctiveFollowUpAdmitted") is True
        and result447.get("masterCount") == 3
        and isinstance(request447, dict)
        and request447.get("action") == ACTION
        and isinstance(journal447, ProtectedIncidentJournal338)
        and isinstance(pins447, dict)
        and set(pins447) == set(ROLES)
        and isinstance(signed447, dict)
        and set(signed447) == {"commsSource", "host", "observer"}
        and isinstance(masters447, dict)
        and set(masters447) == set(MASTERS)
        and isinstance(owners447, dict)
        and set(owners447) == {"owner", "ownerReviewer"}
    ):
        return None
    prior = verify_prior_escalation338(monitor, **prior446)
    if prior is None:
        return None
    prior_digest, link = prior
    incident = link["incident"]
    request_digest = _digest(request447)
    prior_exception = result447["state"] == EXCEPTION
    stage = "EXCEPTION" if prior_exception else "RECONFIRMED"
    expected_class = CLASS_EXCEPTION if prior_exception else CLASS_RECONFIRMED
    expected_decision = DECISION_EXCEPTION if prior_exception else DECISION_RECONFIRMED
    pending = journal447.read(monitor, incident, "PENDING")
    terminal = journal447.read(monitor, incident, stage)
    other = journal447.read(monitor, incident, "RECONFIRMED" if prior_exception else "EXCEPTION")
    if not (
        pending
        and terminal
        and other is None
        and pending.get("requestDigest") == request_digest
        and pending.get("evidenceDigest") == prior_digest
        and terminal.get("requestDigest") == request_digest
        and result447.get("pendingReceiptDigest") == pending["receiptDigest"]
        and result447.get("finalReceiptDigest") == terminal["receiptDigest"]
        and result447.get("originalIncidentId") == incident
        and result447.get("ql446CaseId") == link["caseId"]
        and result447.get("followUpId") == request447.get("followUpId")
        and result447.get("classification") == expected_class
        and result447.get("correctiveDecision") == expected_decision
        and result447.get("isolationExceptionSuspected") is prior_exception
        and request447.get("originalIncidentId") == incident
        and request447.get("ql446CaseId") == link["caseId"]
        and request447.get("priorQl446Digest") == prior_digest
        and request447.get("ql446EscalationReceiptDigest") == link["ql446ReceiptDigest"]
        and request447.get("priorClassification") == link["ql446Classification"]
        and request447.get("previousObserverDigest") == link["previousObserverDigest"]
        and request447.get("challengeId") == link["challengeId"]
        and request447.get("leaseId") == link["leaseId"]
        and isinstance(request447.get("challengeNonce"), str)
        and isinstance(request447.get("followUpId"), str)
        and len(request447["challengeNonce"]) >= 12
        and len(request447["followUpId"]) >= 12
        and len({
            request447["challengeNonce"],
            request447["followUpId"],
            link["previousNonce"],
            link["previousWatchId"],
        }) == 4
    ):
        return None
    source = verify447("commsSource", signed447["commsSource"], pins447)
    host = verify447("host", signed447["host"], pins447)
    witness = verify447("observer", signed447["observer"], pins447)
    if not (source and host and witness):
        return None
    if not (
        source.get("requestDigest") == request_digest
        and source.get("originalIncidentId") == incident
        and source.get("ql446CaseId") == link["caseId"]
        and source.get("priorQl446Digest") == prior_digest
        and source.get("ql446EscalationReceiptDigest") == link["ql446ReceiptDigest"]
        and source.get("priorClassification") == link["ql446Classification"]
        and source.get("incidentStatus") == "OPEN_HOLD"
        and type(source.get("observedAtMs")) is int
        and source["observedAtMs"] > link["previousObservedAtMs"]
        and host.get("requestDigest") == request_digest
        and host.get("originalIncidentId") == incident
        and host.get("ql446EscalationReceiptDigest") == link["ql446ReceiptDigest"]
        and host.get("ql446CaseId") == link["caseId"]
        and host.get("hostMachineId") == "DESKTOP-AE894KC"
        and host.get("challengeNonce") == request447["challengeNonce"]
        and host.get("followUpId") == request447["followUpId"]
        and host.get("sourceDigest") == _digest(source)
        and host.get("previousObserverDigest") == link["previousObserverDigest"]
        and host.get("receiverState") in ("OFF", "ON")
        and type(host.get("isolationLock")) is bool
        and type(host.get("leaseRevoked")) is bool
        and type(host.get("watchdogArmed")) is bool
        and type(host.get("sequence")) is int
        and host["sequence"] > link["previousSequence"]
        and type(host.get("observedAtMs")) is int
        and source["observedAtMs"] <= host["observedAtMs"]
        and witness.get("requestDigest") == request_digest
        and witness.get("originalIncidentId") == incident
        and witness.get("ql446EscalationReceiptDigest") == link["ql446ReceiptDigest"]
        and witness.get("ql446CaseId") == link["caseId"]
        and witness.get("challengeNonce") == request447["challengeNonce"]
        and witness.get("followUpId") == request447["followUpId"]
        and witness.get("signedHostDigest") == _digest(host)
        and witness.get("receiverState") in ("OFF", "ON")
        and type(witness.get("isolationConfirmed")) is bool
        and type(witness.get("sequence")) is int
        and witness["sequence"] > host["sequence"]
        and type(witness.get("observedAtMs")) is int
        and witness["observedAtMs"] >= host["observedAtMs"]
    ):
        return None
    reconfirmed = (
        host["receiverState"] == witness["receiverState"] == "OFF"
        and host["isolationLock"]
        and host["leaseRevoked"]
        and host["watchdogArmed"]
        and witness["isolationConfirmed"]
    )
    if reconfirmed is prior_exception:
        return None
    isolation_digest = _digest({
        "prior": prior_digest,
        "source": _digest(source),
        "host": _digest(host),
        "observer": _digest(witness),
        "classification": expected_class,
        "followUpId": request447["followUpId"],
    })
    if result447.get("isolationEvidenceDigest") != isolation_digest:
        return None
    reports = []
    for master in MASTERS:
        body = verify447(master, masters447[master], pins447)
        if not (
            body
            and body.get("masterId") == master
            and body.get("requestDigest") == request_digest
            and body.get("originalIncidentId") == incident
            and body.get("followUpId") == request447["followUpId"]
            and body.get("ql446EscalationReceiptDigest") == link["ql446ReceiptDigest"]
            and body.get("isolationEvidenceDigest") == isolation_digest
            and body.get("classification") == expected_class
            and body.get("correctiveDecision") == expected_decision
            and body.get("incidentStatus") == "OPEN_HOLD"
            and type(body.get("reviewedAtMs")) is int
            and body["reviewedAtMs"] >= witness["observedAtMs"]
        ):
            return None
        reports.append(body)
    if result447.get("threeMasterDigest") != _digest(reports):
        return None
    owners = []
    for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        body = verify447(role, owners447[role], pins447)
        if not (
            body
            and body.get("ownerId") == owner_id
            and body.get("requestDigest") == request_digest
            and body.get("originalIncidentId") == incident
            and body.get("followUpId") == request447["followUpId"]
            and body.get("ql446EscalationReceiptDigest") == link["ql446ReceiptDigest"]
            and body.get("isolationEvidenceDigest") == isolation_digest
            and body.get("threeMasterDigest") == _digest(reports)
            and body.get("classification") == expected_class
            and body.get("correctiveDecision") == expected_decision
            and body.get("incidentStatus") == "OPEN_HOLD"
            and type(body.get("reviewedAtMs")) is int
            and body["reviewedAtMs"] >= max(report["reviewedAtMs"] for report in reports)
        ):
            return None
        owners.append(body)
    evidence = _digest({
        "prior": prior_digest,
        "request": request_digest,
        "source": source,
        "host": host,
        "observer": witness,
        "masters": reports,
        "owners": owners,
        "classification": expected_class,
        "correctiveDecision": expected_decision,
    })
    if terminal.get("evidenceDigest") != evidence:
        return None
    return _digest({
        "previous": prior_digest,
        "pending": pending,
        "terminal": terminal,
        "signedEvidence": evidence,
    }), {
        "incident": incident,
        "ql446CaseId": link["caseId"],
        "ql447ReceiptDigest": terminal["receiptDigest"],
        "ql447Classification": expected_class,
        "priorExceptionOpen": prior_exception,
        "followUpId": request447["followUpId"],
        "previousNonce": request447["challengeNonce"],
        "previousObserverDigest": _digest(witness),
        "previousObservedAtMs": witness["observedAtMs"],
        "previousSequence": witness["sequence"],
        "ownerIds": link["ownerIds"],
    }
