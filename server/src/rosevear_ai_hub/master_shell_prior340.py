"""Build 340: verify original QL-448 signed corrective preconditions and custody.

A ledger hash/status badge is insufficient: reverify original QL-431–448
signatures, entire three-horizon witness chain and exclusive private receipts.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior339 import verify_prior_incident339
from rosevear_ai_hub.master_shell_remediation339 import (
    ACTION,
    CLASS_CORRECTED,
    DECISION_REVIEWED,
    HORIZONS,
    OFFICER_COMPLETE,
    REVIEWED,
    ROLES,
    ProtectedRemediationJournal339,
    verify448,
)


def verify_prior_remediation340(
    monitor: Any,
    *,
    prior447: dict[str, Any],
    result448: dict[str, Any],
    request448: dict[str, Any],
    journal448: ProtectedRemediationJournal339,
    pins448: dict[str, tuple[bytes, str]],
    signed448: dict[str, Any],
    masters448: dict[str, Any],
    owners448: dict[str, Any],
) -> tuple[str, dict[str, Any]] | None:
    """Only signed *corrected prior exception*, never stable continuity or closure."""
    if not (
        isinstance(prior447, dict)
        and isinstance(result448, dict)
        and result448.get("accepted") is True
        and result448.get("state") == REVIEWED
        and result448.get("classification") == CLASS_CORRECTED
        and result448.get("correctiveDecision") == DECISION_REVIEWED
        and result448.get("exceptionClosurePreconditionsEvidenced") is True
        and result448.get("correctiveReviewAdmitted") is True
        and result448.get("masterCount") == 3
        and result448.get("connection") == "HOLD"
        and result448.get("activationAuthorized") is False
        and result448.get("physicalReceiverCurrentlyOff") is False
        and result448.get("incidentClosed") is False
        and result448.get("incidentStatus") == "OPEN"
        and isinstance(request448, dict)
        and request448.get("action") == ACTION
        and isinstance(journal448, ProtectedRemediationJournal339)
        and isinstance(pins448, dict)
        and set(pins448) == set(ROLES)
        and len({pin[0] for pin in pins448.values()}) == len(ROLES)
        and len({pin[1] for pin in pins448.values()}) == len(ROLES)
        and isinstance(signed448, dict)
        and set(signed448) == {
            "commsSource", "correctiveOfficer",
            "hostSHORT", "observerSHORT",
            "hostMEDIUM", "observerMEDIUM",
            "hostLONG", "observerLONG",
        }
        and isinstance(masters448, dict)
        and set(masters448) == set(MASTERS)
        and isinstance(owners448, dict)
        and set(owners448) == {"owner", "ownerReviewer"}
    ):
        return None
    prior = verify_prior_incident339(monitor, **prior447)
    if prior is None:
        return None
    prior_digest, link = prior
    if link["priorExceptionOpen"] is not True:
        return None
    incident = link["incident"]
    req_digest = _digest(request448)
    remediation_id, nonce = request448.get("remediationId"), request448.get("challengeNonce")
    pending = journal448.read(monitor, incident, "PENDING")
    terminal = journal448.read(monitor, incident, "REVIEWED")
    conflict = journal448.read(monitor, incident, "EXCEPTION")
    if not (
        pending and terminal and conflict is None
        and pending.get("requestDigest") == req_digest
        and pending.get("evidenceDigest") == prior_digest
        and terminal.get("requestDigest") == req_digest
        and result448.get("pendingReceiptDigest") == pending["receiptDigest"]
        and result448.get("finalReceiptDigest") == terminal["receiptDigest"]
        and result448.get("originalIncidentId") == incident
        and result448.get("remediationId") == remediation_id
        and request448.get("originalIncidentId") == incident
        and request448.get("priorQl447Digest") == prior_digest
        and request448.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
        and request448.get("ql447FollowUpId") == link["followUpId"]
        and request448.get("priorClassification") == link["ql447Classification"]
        and request448.get("previousObserverDigest") == link["previousObserverDigest"]
        and isinstance(remediation_id, str) and len(remediation_id) >= 12
        and isinstance(nonce, str) and len(nonce) >= 12
        and len({remediation_id, nonce, link["previousNonce"], link["followUpId"]}) == 4
    ):
        return None
    source = verify448("commsSource", signed448["commsSource"], pins448)
    officer = verify448("correctiveOfficer", signed448["correctiveOfficer"], pins448)
    if not (
        source and officer
        and source.get("requestDigest") == req_digest
        and source.get("originalIncidentId") == incident
        and source.get("priorQl447Digest") == prior_digest
        and source.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
        and source.get("ql447Classification") == link["ql447Classification"]
        and source.get("incidentStatus") == "OPEN_HOLD"
        and type(source.get("observedAtMs")) is int
        and source["observedAtMs"] > link["previousObservedAtMs"]
        and officer.get("requestDigest") == req_digest
        and officer.get("originalIncidentId") == incident
        and officer.get("remediationId") == remediation_id
        and officer.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
        and officer.get("priorQl447Digest") == prior_digest
        and officer.get("sourceDigest") == _digest(source)
        and officer.get("disposition") == OFFICER_COMPLETE
        and officer.get("isolationLock") is True
        and officer.get("leaseRevoked") is True
        and officer.get("watchdogArmed") is True
        and type(officer.get("observedAtMs")) is int
        and officer["observedAtMs"] >= source["observedAtMs"]
    ):
        return None
    observations = []
    last_witness_digest = link["previousObserverDigest"]
    last_host_digest = None
    last_sequence = link["previousSequence"]
    last_time = link["previousObservedAtMs"]
    first_time = None
    for index, horizon in enumerate(HORIZONS, start=1):
        host = verify448("host", signed448["host" + horizon], pins448)
        observer = verify448("observer", signed448["observer" + horizon], pins448)
        if not (host and observer):
            return None
        if not (
            host.get("requestDigest") == req_digest
            and host.get("originalIncidentId") == incident
            and host.get("originalHostId") == "DESKTOP-AE894KC"
            and host.get("challengeNonce") == nonce
            and host.get("remediationId") == remediation_id
            and host.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
            and host.get("officerDigest") == _digest(officer)
            and host.get("horizon") == horizon
            and host.get("previousHostDigest") == last_host_digest
            and host.get("previousObserverDigest") == last_witness_digest
            and host.get("receiverState") == "OFF"
            and host.get("isolationLock") is True
            and host.get("leaseRevoked") is True
            and host.get("watchdogArmed") is True
            and type(host.get("sequence")) is int
            and host["sequence"] > last_sequence
            and type(host.get("observedAtMs")) is int
            and host["observedAtMs"] > max(officer["observedAtMs"], last_time)
            and observer.get("requestDigest") == req_digest
            and observer.get("originalIncidentId") == incident
            and observer.get("challengeNonce") == nonce
            and observer.get("remediationId") == remediation_id
            and observer.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
            and observer.get("horizon") == horizon
            and observer.get("signedHostDigest") == _digest(host)
            and observer.get("previousObserverDigest") == last_witness_digest
            and observer.get("receiverState") == "OFF"
            and observer.get("isolationConfirmed") is True
            and type(observer.get("sequence")) is int
            and observer["sequence"] > host["sequence"]
            and type(observer.get("observedAtMs")) is int
            and observer["observedAtMs"] >= host["observedAtMs"]
        ):
            return None
        if index == 1:
            first_time = host["observedAtMs"]
        elif host["observedAtMs"] - first_time < (10_000 if index == 2 else 30_000):
            return None
        observations.append((host, observer))
        last_witness_digest = _digest(observer)
        last_host_digest = _digest(host)
        last_sequence = observer["sequence"]
        last_time = observer["observedAtMs"]
    horizon_digest = _digest({
        "prior": prior_digest,
        "source": _digest(source),
        "officer": _digest(officer),
        "hostDigests": [_digest(h) for h, _ in observations],
        "observerDigests": [_digest(o) for _, o in observations],
        "classification": CLASS_CORRECTED,
        "remediationId": remediation_id,
    })
    if result448.get("horizonEvidenceDigest") != horizon_digest:
        return None
    reports = []
    for master in MASTERS:
        vote = verify448(master, masters448[master], pins448)
        if not (
            vote and vote.get("masterId") == master
            and vote.get("requestDigest") == req_digest
            and vote.get("originalIncidentId") == incident
            and vote.get("remediationId") == remediation_id
            and vote.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
            and vote.get("horizonEvidenceDigest") == horizon_digest
            and vote.get("classification") == CLASS_CORRECTED
            and vote.get("correctiveDecision") == DECISION_REVIEWED
            and vote.get("incidentStatus") == "OPEN_HOLD"
            and type(vote.get("reviewedAtMs")) is int
            and vote["reviewedAtMs"] >= last_time
        ):
            return None
        reports.append(vote)
    if result448.get("threeMasterDigest") != _digest(reports):
        return None
    owners = []
    for role, identity in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        body = verify448(role, owners448[role], pins448)
        if not (
            body and body.get("ownerId") == identity
            and body.get("requestDigest") == req_digest
            and body.get("originalIncidentId") == incident
            and body.get("remediationId") == remediation_id
            and body.get("ql447ReceiptDigest") == link["ql447ReceiptDigest"]
            and body.get("horizonEvidenceDigest") == horizon_digest
            and body.get("threeMasterDigest") == _digest(reports)
            and body.get("classification") == CLASS_CORRECTED
            and body.get("correctiveDecision") == DECISION_REVIEWED
            and body.get("incidentStatus") == "OPEN_HOLD"
            and type(body.get("reviewedAtMs")) is int
            and body["reviewedAtMs"] >= max(v["reviewedAtMs"] for v in reports)
        ):
            return None
        owners.append(body)
    evidence = _digest({
        "prior": prior_digest,
        "request": req_digest,
        "source": source,
        "officer": officer,
        "host": [h for h, _ in observations],
        "observers": [o for _, o in observations],
        "masters": reports,
        "owners": owners,
        "horizonDigest": horizon_digest,
        "classification": CLASS_CORRECTED,
        "correctiveDecision": DECISION_REVIEWED,
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
        "ql448ReceiptDigest": terminal["receiptDigest"],
        "ql448HorizonDigest": horizon_digest,
        "ql448RemediationId": remediation_id,
        "ql448Nonce": nonce,
        "previousObserverDigest": last_witness_digest,
        "previousObservedAtMs": last_time,
        "previousSequence": last_sequence,
        "ownerIds": link["ownerIds"],
    }
