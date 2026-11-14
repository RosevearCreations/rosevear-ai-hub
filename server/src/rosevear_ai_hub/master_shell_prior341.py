"""Build 341: reverify protected signed QL-449 historical review ancestry.

A displayed green badge or protected receipt hash alone is not proof: QL-431–449
signatures, exclusive ledgers and original owner votes are checked again.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_disposition340 import (
    ACTION, ANCHOR_DISPOSITION, CLASS_REVIEW, DECISION_REVIEW, REVIEW, ROLES,
    ProtectedDispositionJournal340, verify449,
)
from rosevear_ai_hub.master_shell_prior340 import verify_prior_remediation340


def verify_prior_disposition341(
    monitor: Any,
    *,
    prior448: dict[str, Any],
    result449: dict[str, Any],
    request449: dict[str, Any],
    journal449: ProtectedDispositionJournal340,
    pins449: dict[str, tuple[bytes, str]],
    signed449: dict[str, Any],
    masters449: dict[str, Any],
    owners449: dict[str, Any],
) -> tuple[str, dict[str, Any]] | None:
    """Admit QL-449 historic REVIEW only, never a recurrence exception."""
    if not (
        isinstance(prior448, dict)
        and isinstance(result449, dict)
        and result449.get("accepted") is True
        and result449.get("state") == REVIEW
        and result449.get("classification") == CLASS_REVIEW
        and result449.get("disposition") == DECISION_REVIEW
        and result449.get("independentAnchoredReviewAdmitted") is True
        and result449.get("masterCount") == 3
        and result449.get("connection") == "HOLD"
        and result449.get("activationAuthorized") is False
        and result449.get("physicalReceiverCurrentlyOff") is False
        and result449.get("incidentClosed") is False
        and result449.get("incidentStatus") == "OPEN"
        and isinstance(request449, dict)
        and request449.get("action") == ACTION
        and isinstance(journal449, ProtectedDispositionJournal340)
        and isinstance(pins449, dict)
        and set(pins449) == set(ROLES)
        and len({pin[0] for pin in pins449.values()}) == len(ROLES)
        and len({pin[1] for pin in pins449.values()}) == len(ROLES)
        and isinstance(signed449, dict)
        and set(signed449) == {"commsSource", "externalAnchor", "host", "observer"}
        and isinstance(masters449, dict)
        and set(masters449) == set(MASTERS)
        and isinstance(owners449, dict)
        and set(owners449) == {"owner", "ownerReviewer"}
    ):
        return None
    prior = verify_prior_remediation340(monitor, **prior448)
    if prior is None:
        return None
    prior_digest, link = prior
    incident = link["incident"]
    req_digest = _digest(request449)
    ceremony = request449.get("ceremonyId")
    nonce = request449.get("challengeNonce")
    pending = journal449.read(monitor, incident, "PENDING")
    terminal = journal449.read(monitor, incident, "REVIEW")
    exception = journal449.read(monitor, incident, "EXCEPTION")
    if not (
        pending and terminal and exception is None
        and pending.get("requestDigest") == req_digest
        and pending.get("evidenceDigest") == prior_digest
        and terminal.get("requestDigest") == req_digest
        and result449.get("pendingReceiptDigest") == pending["receiptDigest"]
        and result449.get("finalReceiptDigest") == terminal["receiptDigest"]
        and result449.get("originalIncidentId") == incident
        and result449.get("ceremonyId") == ceremony
        and request449.get("originalIncidentId") == incident
        and request449.get("priorQl448Digest") == prior_digest
        and request449.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
        and request449.get("ql448HorizonDigest") == link["ql448HorizonDigest"]
        and request449.get("ql448RemediationId") == link["ql448RemediationId"]
        and request449.get("previousObserverDigest") == link["previousObserverDigest"]
        and isinstance(ceremony, str) and len(ceremony) >= 12
        and isinstance(nonce, str) and len(nonce) >= 12
        and len({ceremony, nonce, link["ql448Nonce"], link["ql448RemediationId"]}) == 4
    ):
        return None
    source = verify449("commsSource", signed449["commsSource"], pins449)
    anchor = verify449("externalAnchor", signed449["externalAnchor"], pins449)
    host = verify449("host", signed449["host"], pins449)
    observer = verify449("observer", signed449["observer"], pins449)
    if not (source and anchor and host and observer):
        return None
    if not (
        source.get("requestDigest") == req_digest
        and source.get("originalIncidentId") == incident
        and source.get("priorQl448Digest") == prior_digest
        and source.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
        and source.get("ql448HorizonDigest") == link["ql448HorizonDigest"]
        and source.get("incidentStatus") == "OPEN_HOLD"
        and type(source.get("observedAtMs")) is int
        and source["observedAtMs"] > link["previousObservedAtMs"]
        and anchor.get("requestDigest") == req_digest
        and anchor.get("originalIncidentId") == incident
        and anchor.get("priorQl448Digest") == prior_digest
        and anchor.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
        and anchor.get("ql448HorizonDigest") == link["ql448HorizonDigest"]
        and anchor.get("sourceDigest") == _digest(source)
        and anchor.get("ceremonyId") == ceremony
        and anchor.get("challengeNonce") == nonce
        and isinstance(anchor.get("anchorId"), str) and len(anchor["anchorId"]) >= 12
        and len({anchor["anchorId"], ceremony, nonce}) == 3
        and anchor.get("disposition") == ANCHOR_DISPOSITION
        and type(anchor.get("sequence")) is int
        and anchor["sequence"] > link["previousSequence"]
        and type(anchor.get("observedAtMs")) is int
        and anchor["observedAtMs"] > source["observedAtMs"]
        and host.get("requestDigest") == req_digest
        and host.get("originalIncidentId") == incident
        and host.get("hostMachineId") == "DESKTOP-AE894KC"
        and host.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
        and host.get("ceremonyId") == ceremony
        and host.get("challengeNonce") == nonce
        and host.get("anchorDigest") == _digest(anchor)
        and host.get("previousObserverDigest") == link["previousObserverDigest"]
        and host.get("receiverState") == "OFF"
        and host.get("isolationLock") is True
        and host.get("leaseRevoked") is True
        and host.get("watchdogArmed") is True
        and type(host.get("sequence")) is int
        and host["sequence"] > anchor["sequence"]
        and type(host.get("observedAtMs")) is int
        and host["observedAtMs"] > anchor["observedAtMs"]
        and observer.get("requestDigest") == req_digest
        and observer.get("originalIncidentId") == incident
        and observer.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
        and observer.get("ceremonyId") == ceremony
        and observer.get("challengeNonce") == nonce
        and observer.get("anchorDigest") == _digest(anchor)
        and observer.get("signedHostDigest") == _digest(host)
        and observer.get("receiverState") == "OFF"
        and observer.get("isolationConfirmed") is True
        and type(observer.get("sequence")) is int
        and observer["sequence"] > host["sequence"]
        and type(observer.get("observedAtMs")) is int
        and observer["observedAtMs"] >= host["observedAtMs"]
    ):
        return None
    anchored_digest = _digest({
        "prior": prior_digest, "source": _digest(source),
        "anchor": _digest(anchor), "host": _digest(host),
        "observer": _digest(observer), "classification": CLASS_REVIEW,
        "ceremonyId": ceremony,
    })
    if result449.get("anchoredEvidenceDigest") != anchored_digest:
        return None
    reports = []
    for master in MASTERS:
        vote = verify449(master, masters449[master], pins449)
        if not (
            vote and vote.get("masterId") == master
            and vote.get("requestDigest") == req_digest
            and vote.get("originalIncidentId") == incident
            and vote.get("ceremonyId") == ceremony
            and vote.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
            and vote.get("anchoredEvidenceDigest") == anchored_digest
            and vote.get("classification") == CLASS_REVIEW
            and vote.get("disposition") == DECISION_REVIEW
            and vote.get("incidentStatus") == "OPEN_HOLD"
            and type(vote.get("reviewedAtMs")) is int
            and vote["reviewedAtMs"] >= observer["observedAtMs"]
        ):
            return None
        reports.append(vote)
    if result449.get("threeMasterDigest") != _digest(reports):
        return None
    owners = []
    for role, identity in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        body = verify449(role, owners449[role], pins449)
        if not (
            body and body.get("ownerId") == identity
            and body.get("requestDigest") == req_digest
            and body.get("originalIncidentId") == incident
            and body.get("ceremonyId") == ceremony
            and body.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
            and body.get("anchoredEvidenceDigest") == anchored_digest
            and body.get("threeMasterDigest") == _digest(reports)
            and body.get("classification") == CLASS_REVIEW
            and body.get("disposition") == DECISION_REVIEW
            and body.get("incidentStatus") == "OPEN_HOLD"
            and type(body.get("reviewedAtMs")) is int
            and body["reviewedAtMs"] >= max(v["reviewedAtMs"] for v in reports)
        ):
            return None
        owners.append(body)
    signed_evidence = _digest({
        "prior": prior_digest, "request": req_digest,
        "source": source, "anchor": anchor,
        "host": host, "observer": observer,
        "masters": reports, "owners": owners,
        "classification": CLASS_REVIEW, "disposition": DECISION_REVIEW,
    })
    if terminal.get("evidenceDigest") != signed_evidence:
        return None
    return _digest({
        "previous": prior_digest, "pending": pending,
        "terminal": terminal, "signedEvidence": signed_evidence,
    }), {
        "incident": incident,
        "ql449ReceiptDigest": terminal["receiptDigest"],
        "ql449AnchoredDigest": anchored_digest,
        "ql449CeremonyId": ceremony,
        "ql449Nonce": nonce,
        "ql449AnchorId": anchor["anchorId"],
        "previousObserverDigest": _digest(observer),
        "previousObservedAtMs": observer["observedAtMs"],
        "previousSequence": observer["sequence"],
        "ownerIds": link["ownerIds"],
    }
