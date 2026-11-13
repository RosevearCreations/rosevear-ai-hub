"""QL-443: independently revalidate full protected QL-442 closure ancestry.

Historical signed OFF evidence is NOT a claim of present physical OFF.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_decision333 import ProtectedWitnessJournal333
from rosevear_ai_hub.master_shell_prior333 import verify_prior_witness333
from rosevear_ai_hub.master_shell_shutdown333 import (
    ACTION,
    CLOSED,
    EXCEPTION,
    EXPIRED,
    MASTER_LATE,
    MASTER_ON_TIME,
    ON_TIME,
    OWNER_LATE,
    OWNER_ON_TIME,
    ROLES,
    verify442,
)


def verify_prior_shutdown334(
    monitor: Any,
    *,
    prior441: dict[str, Any],
    result442: dict[str, Any],
    request442: dict[str, Any],
    journal442: ProtectedWitnessJournal333,
    pins442: dict[str, tuple[bytes, str]],
    signed442: dict[str, Any],
    masters442: dict[str, Any],
    owners442: dict[str, Any],
) -> tuple[str, dict[str, Any]] | None:
    """Require original QL-441 ancestry, QL-442 signatures and fsynced receipts."""
    if not (
        isinstance(result442, dict)
        and result442.get("accepted") is True
        and result442.get("connection") == "HOLD"
        and result442.get("activationAuthorized") is False
        and result442.get("incidentClosed") is False
        and result442.get("shutdownEvidenceAccepted") is True
        and isinstance(request442, dict)
        and request442.get("action") == ACTION
        and isinstance(journal442, ProtectedWitnessJournal333)
        and isinstance(pins442, dict)
        and set(pins442) == set(ROLES)
        and all(
            isinstance(pin, tuple)
            and len(pin) == 2
            and isinstance(pin[0], bytes)
            and isinstance(pin[1], str)
            and _public_ed25519(*pin)
            for pin in pins442.values()
        )
        and len({pin[0] for pin in pins442.values()}) == len(pins442)
        and len({pin[1] for pin in pins442.values()}) == len(pins442)
        and isinstance(signed442, dict)
        and set(signed442) == {"commsSource", "host", "receiver"}
        and isinstance(masters442, dict)
        and set(masters442) == set(MASTERS)
        and isinstance(owners442, dict)
        and set(owners442) == {"owner", "ownerReviewer"}
    ):
        return None
    previous = verify_prior_witness333(monitor, **prior441)
    if not previous:
        return None
    prior_digest, link = previous
    incident = link["incident"]
    req_digest = _digest(request442)
    pending = journal442.read(monitor, incident, "PENDING")
    expired = result442.get("leaseDisposition") == EXPIRED
    stage = "EXCEPTION" if expired else "CLOSED"
    terminal = journal442.read(monitor, incident, stage)
    opposite = journal442.read(monitor, incident, "CLOSED" if expired else "EXCEPTION")
    if not (
        result442.get("state") == (EXCEPTION if expired else CLOSED)
        and result442.get("leaseDisposition") in (EXPIRED, ON_TIME)
        and result442.get("leaseExceptionOpen") is expired
        and pending
        and terminal
        and opposite is None
        and pending["requestDigest"] == req_digest
        and pending["evidenceDigest"] == prior_digest
        and terminal["requestDigest"] == req_digest
        and result442.get("originalIncidentId") == incident
        and result442.get("pendingReceiptDigest") == pending["receiptDigest"]
        and result442.get("finalReceiptDigest") == terminal["receiptDigest"]
        and request442.get("originalIncidentId") == incident
        and request442.get("challengeId") == link["challengeId"]
        and request442.get("leaseId") == link["leaseId"]
        and request442.get("leaseExpiresAtMs") == link["leaseExpiresAtMs"]
        and request442.get("ql441DecisionReceiptDigest") == link["decisionReceiptDigest"]
        and request442.get("independentOnDigest") == link["independentOnDigest"]
        and isinstance(request442.get("shutdownNonce"), str)
        and len(request442["shutdownNonce"]) >= 12
    ):
        return None

    source = verify442("commsSource", signed442["commsSource"], pins442)
    host = verify442("host", signed442["host"], pins442)
    off = verify442("receiver", signed442["receiver"], pins442)
    if not (source and host and off):
        return None
    if not (
        source.get("requestDigest") == req_digest
        and source.get("priorQl441Digest") == prior_digest
        and source.get("originalIncidentId") == incident
        and source.get("ql441DecisionReceiptDigest") == link["decisionReceiptDigest"]
        and source.get("assertedState")
        == "QL441_SIGNED_DECISION_EXISTS_NO_CURRENT_RECEIVER_ASSUMPTION"
        and type(source.get("observedAtMs")) is int
        and source["observedAtMs"] >= link["independentOnAtMs"]
        and host.get("requestDigest") == req_digest
        and host.get("commsSourceDigest") == _digest(source)
        and host.get("hostMachineId") == "DESKTOP-AE894KC"
        and host.get("originalIncidentId") == incident
        and host.get("challengeId") == link["challengeId"]
        and host.get("leaseId") == link["leaseId"]
        and host.get("shutdownNonce") == request442["shutdownNonce"]
        and host.get("ql441DecisionReceiptDigest") == link["decisionReceiptDigest"]
        and host.get("priorIndependentOnDigest") == link["independentOnDigest"]
        and host.get("watchdogArmed") is True
        and host.get("receiverState") == "OFF"
        and type(host.get("shutdownSequence")) is int
        and host["shutdownSequence"] >= link["independentOnSequence"]
        and type(host.get("shutdownAtMs")) is int
        and host["shutdownAtMs"] >= link["independentOnAtMs"]
        and off.get("requestDigest") == req_digest
        and off.get("originalIncidentId") == incident
        and off.get("challengeId") == link["challengeId"]
        and off.get("leaseId") == link["leaseId"]
        and off.get("shutdownNonce") == request442["shutdownNonce"]
        and off.get("signedHostShutdownDigest") == _digest(host)
        and off.get("receiverState") == "OFF"
        and type(off.get("offSequence")) is int
        and off["offSequence"] >= host["shutdownSequence"]
        and type(off.get("observedAtMs")) is int
        and off["observedAtMs"] >= host["shutdownAtMs"]
    ):
        return None
    calculated_late = (
        host["shutdownAtMs"] > link["leaseExpiresAtMs"]
        or off["observedAtMs"] > link["leaseExpiresAtMs"]
    )
    if calculated_late != expired:
        return None
    reports = []
    for master in MASTERS:
        body = verify442(master, masters442[master], pins442)
        if not (
            body
            and body.get("masterId") == master
            and body.get("requestDigest") == req_digest
            and body.get("originalIncidentId") == incident
            and body.get("hostShutdownDigest") == _digest(host)
            and body.get("independentOffDigest") == _digest(off)
            and body.get("leaseDisposition") == (EXPIRED if expired else ON_TIME)
            and body.get("decision") == (MASTER_LATE if expired else MASTER_ON_TIME)
            and type(body.get("reviewedAtMs")) is int
            and body["reviewedAtMs"] >= off["observedAtMs"]
        ):
            return None
        reports.append(body)
    if result442.get("mastersDigest") != _digest(reports):
        return None
    owners = []
    for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        body = verify442(role, owners442[role], pins442)
        if not (
            body
            and body.get("ownerId") == owner_id
            and body.get("requestDigest") == req_digest
            and body.get("originalIncidentId") == incident
            and body.get("independentOffDigest") == _digest(off)
            and body.get("masterReportsDigest") == _digest(reports)
            and body.get("decision") == (OWNER_LATE if expired else OWNER_ON_TIME)
            and type(body.get("reviewedAtMs")) is int
            and body["reviewedAtMs"] >= max(m["reviewedAtMs"] for m in reports)
        ):
            return None
        owners.append(body)
    evidence = _digest(
        {
            "prior": prior_digest,
            "commsSource": source,
            "host": host,
            "independentOff": off,
            "masters": reports,
            "owners": owners,
            "disposition": EXPIRED if expired else ON_TIME,
        }
    )
    if not (
        terminal["evidenceDigest"] == evidence
        and result442.get("hostShutdownDigest") == _digest(host)
        and result442.get("independentOffDigest") == _digest(off)
        and result442.get("priorIndependentOnDigest") == link["independentOnDigest"]
    ):
        return None
    custody_digest = _digest(
        {
            "prior": prior_digest,
            "pending": pending,
            "terminal": terminal,
            "signedEvidence": evidence,
        }
    )
    return custody_digest, {
        "incident": incident,
        "challengeId": link["challengeId"],
        "leaseId": link["leaseId"],
        "leaseExpiresAtMs": link["leaseExpiresAtMs"],
        "leaseDisposition": EXPIRED if expired else ON_TIME,
        "historicalHostDigest": _digest(host),
        "historicalOffDigest": _digest(off),
        "historicalOffAtMs": off["observedAtMs"],
        "historicalOffSequence": off["offSequence"],
        "finalReceiptDigest": terminal["receiptDigest"],
        "ownerIds": link["ownerIds"],
        "originalShutdownNonce": request442["shutdownNonce"],
    }
