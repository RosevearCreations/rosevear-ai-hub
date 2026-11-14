"""Build 337: verify protected, signed QL-445 STABLE/RECURRENCE ancestry."""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior336 import verify_prior_continuity336
from rosevear_ai_hub.master_shell_stability336 import (
    ACTION,
    CLASS_RECURRENCE,
    CLASS_STABLE,
    MASTER_RECURRENCE,
    MASTER_STABLE,
    OWNER_RECURRENCE,
    OWNER_STABLE,
    RECURRENCE,
    ROLES,
    STABLE,
    ProtectedStabilityJournal336,
    verify445,
)


def verify_prior_stability337(
    monitor: Any,
    *,
    prior444: dict[str, Any],
    result445: dict[str, Any],
    request445: dict[str, Any],
    journal445: ProtectedStabilityJournal336,
    pins445: dict[str, tuple[bytes, str]],
    signed445: dict[str, Any],
    masters445: dict[str, Any],
    owners445: dict[str, Any],
) -> tuple[str, dict[str, Any]] | None:
    """No trust in a prior status badge: verify all signatures, digests and receipts."""
    if not (
        isinstance(prior444, dict)
        and isinstance(result445, dict)
        and result445.get("accepted") is True
        and result445.get("connection") == "HOLD"
        and result445.get("activationAuthorized") is False
        and result445.get("physicalReceiverCurrentlyOff") is False
        and result445.get("incidentClosed") is False
        and result445.get("historicalEvidenceAdmitted") is True
        and result445.get("masterCount") == 3
        and isinstance(request445, dict)
        and request445.get("action") == ACTION
        and isinstance(journal445, ProtectedStabilityJournal336)
        and isinstance(pins445, dict)
        and set(pins445) == set(ROLES)
        and isinstance(signed445, dict)
        and set(signed445) == {"commsSource", "hostOne", "hostTwo", "observerOne", "observerTwo"}
        and isinstance(masters445, dict)
        and set(masters445) == set(MASTERS)
        and isinstance(owners445, dict)
        and set(owners445) == {"owner", "ownerReviewer"}
    ):
        return None
    verified = verify_prior_continuity336(monitor, **prior444)
    if not verified:
        return None
    prior_digest, link = verified
    incident = link["incident"]
    req_digest = _digest(request445)
    recurrence = result445.get("state") == RECURRENCE
    stage = "RECURRENCE" if recurrence else "STABLE"
    classification = CLASS_RECURRENCE if recurrence else CLASS_STABLE
    pending = journal445.read(monitor, incident, "PENDING")
    terminal = journal445.read(monitor, incident, stage)
    conflicting = journal445.read(monitor, incident, "STABLE" if recurrence else "RECURRENCE")
    if not (
        result445.get("state") in (RECURRENCE, STABLE)
        and result445.get("classification") == classification
        and result445.get("recurrenceSuspected") is recurrence
        and result445.get("signedOnRecurrenceAccepted") is recurrence
        and result445.get("incidentEvidenceClosed") is (not recurrence)
        and result445.get("originalIncidentId") == incident
        and result445.get("ql444ClosureReceiptDigest") == link["ql444ClosureReceiptDigest"]
        and pending
        and terminal
        and conflicting is None
        and pending.get("requestDigest") == req_digest
        and pending.get("evidenceDigest") == prior_digest
        and terminal.get("requestDigest") == req_digest
        and result445.get("pendingReceiptDigest") == pending["receiptDigest"]
        and result445.get("finalReceiptDigest") == terminal["receiptDigest"]
        and request445.get("originalIncidentId") == incident
        and request445.get("challengeId") == link["challengeId"]
        and request445.get("leaseId") == link["leaseId"]
        and request445.get("priorQl444Digest") == prior_digest
        and request445.get("ql444ClosureReceiptDigest") == link["ql444ClosureReceiptDigest"]
        and request445.get("ql444RemediationReceiptDigest") == link["ql444RemediationReceiptDigest"]
        and request445.get("previousIndependentOffDigest") == link["previousOffDigest"]
        and isinstance(request445.get("watchNonce"), str)
        and len(request445["watchNonce"]) >= 12
        and isinstance(request445.get("watchId"), str)
        and len(request445["watchId"]) >= 12
        and len(
            {
                request445["watchNonce"],
                request445["watchId"],
                link["previousNonce"],
                link["previousWatchId"],
            }
        )
        == 4
    ):
        return None
    source = verify445("commsSource", signed445["commsSource"], pins445)
    hosts = [verify445("host", signed445[key], pins445) for key in ("hostOne", "hostTwo")]
    observers = [
        verify445(role, signed445[role], pins445) for role in ("observerOne", "observerTwo")
    ]
    if not (source and all(hosts) and all(observers)):
        return None
    if not (
        source.get("requestDigest") == req_digest
        and source.get("originalIncidentId") == incident
        and source.get("priorQl444Digest") == prior_digest
        and source.get("ql444ClosureReceiptDigest") == link["ql444ClosureReceiptDigest"]
        and source.get("previousIndependentOffDigest") == link["previousOffDigest"]
        and source.get("assertedState") == "HISTORICAL_QL444_CLOSURE_ONLY_HOLD"
        and type(source.get("observedAtMs")) is int
        and source["observedAtMs"] >= link["previousOffAtMs"]
    ):
        return None
    last_digest = link["previousOffDigest"]
    last_seq = link["previousOffSequence"]
    last_time = link["previousOffAtMs"]
    last_host_digest = None
    for i, (host, observer) in enumerate(zip(hosts, observers, strict=True), start=1):
        if not (
            host.get("requestDigest") == req_digest
            and host.get("sourceDigest") == _digest(source)
            and host.get("hostMachineId") == "DESKTOP-AE894KC"
            and host.get("originalIncidentId") == incident
            and host.get("challengeId") == link["challengeId"]
            and host.get("leaseId") == link["leaseId"]
            and host.get("watchNonce") == request445["watchNonce"]
            and host.get("watchId") == request445["watchId"]
            and host.get("sampleIndex") == i
            and host.get("previousObserverDigest") == last_digest
            and host.get("previousHostDigest") == last_host_digest
            and host.get("watchdogArmed") is True
            and host.get("receiverState") in ("ON", "OFF")
            and type(host.get("sequence")) is int
            and host["sequence"] > last_seq
            and type(host.get("observedAtMs")) is int
            and host["observedAtMs"] > last_time
            and (i == 1 or host["observedAtMs"] - last_time >= 1_000)
            and observer.get("requestDigest") == req_digest
            and observer.get("originalIncidentId") == incident
            and observer.get("challengeId") == link["challengeId"]
            and observer.get("leaseId") == link["leaseId"]
            and observer.get("watchNonce") == request445["watchNonce"]
            and observer.get("watchId") == request445["watchId"]
            and observer.get("sampleIndex") == i
            and observer.get("hostProbeDigest") == _digest(host)
            and observer.get("previousObserverDigest") == last_digest
            and observer.get("receiverState") == host["receiverState"]
            and type(observer.get("sequence")) is int
            and observer["sequence"] > host["sequence"]
            and type(observer.get("observedAtMs")) is int
            and observer["observedAtMs"] >= host["observedAtMs"]
        ):
            return None
        last_digest = _digest(observer)
        last_host_digest = _digest(host)
        last_seq = observer["sequence"]
        last_time = observer["observedAtMs"]
    if any(host["receiverState"] == "ON" for host in hosts) is not recurrence:
        return None
    host_digests = [_digest(host) for host in hosts]
    observer_digests = [_digest(observer) for observer in observers]
    if result445.get("hostProbeDigests") != host_digests:
        return None
    if result445.get("observerDigests") != observer_digests:
        return None
    reports = []
    for master in MASTERS:
        body = verify445(master, masters445[master], pins445)
        if not (
            body
            and body.get("masterId") == master
            and body.get("requestDigest") == req_digest
            and body.get("originalIncidentId") == incident
            and body.get("priorQl444Digest") == prior_digest
            and body.get("ql444ClosureReceiptDigest") == link["ql444ClosureReceiptDigest"]
            and body.get("hostProbeDigests") == host_digests
            and body.get("observerDigests") == observer_digests
            and body.get("classification") == classification
            and body.get("decision") == (MASTER_RECURRENCE if recurrence else MASTER_STABLE)
            and type(body.get("reviewedAtMs")) is int
            and body["reviewedAtMs"] >= last_time
        ):
            return None
        reports.append(body)
    if result445.get("threeMasterDigest") != _digest(reports):
        return None
    owners = []
    for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        body = verify445(role, owners445[role], pins445)
        if not (
            body
            and body.get("ownerId") == owner_id
            and body.get("requestDigest") == req_digest
            and body.get("originalIncidentId") == incident
            and body.get("priorQl444Digest") == prior_digest
            and body.get("ql444ClosureReceiptDigest") == link["ql444ClosureReceiptDigest"]
            and body.get("threeMasterDigest") == _digest(reports)
            and body.get("lastObserverDigest") == observer_digests[1]
            and body.get("classification") == classification
            and body.get("decision") == (OWNER_RECURRENCE if recurrence else OWNER_STABLE)
            and type(body.get("reviewedAtMs")) is int
            and body["reviewedAtMs"] >= max(report["reviewedAtMs"] for report in reports)
        ):
            return None
        owners.append(body)
    evidence = _digest(
        {
            "prior": prior_digest,
            "source": source,
            "hostProbes": hosts,
            "independentObservations": observers,
            "masters": reports,
            "owners": owners,
            "classification": classification,
        }
    )
    if terminal.get("evidenceDigest") != evidence:
        return None
    return (
        _digest(
            {
                "previous": prior_digest,
                "pending": pending,
                "terminal": terminal,
                "signedEvidence": evidence,
            }
        ),
        {
            "incident": incident,
            "challengeId": link["challengeId"],
            "leaseId": link["leaseId"],
            "ql445ReceiptDigest": terminal["receiptDigest"],
            "ql445Classification": classification,
            "priorRecurrenceOpen": recurrence,
            "previousObserverDigest": observer_digests[1],
            "previousObservedAtMs": observers[1]["observedAtMs"],
            "previousSequence": observers[1]["sequence"],
            "previousWatchId": request445["watchId"],
            "previousNonce": request445["watchNonce"],
            "ownerIds": link["ownerIds"],
        },
    )
