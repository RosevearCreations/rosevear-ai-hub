"""QL-444 exact protected QL-443 ancestry; never infer present receiver state."""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior334 import verify_prior_shutdown334
from rosevear_ai_hub.master_shell_renewal334 import (
    ACTION,
    ADMITTED,
    EXCEPTION,
    MASTER_ADMIT,
    MASTER_LATE,
    OWNER_ADMIT,
    OWNER_LATE,
    ProtectedRenewalJournal334,
    verify443,
)
from rosevear_ai_hub.master_shell_shutdown333 import EXPIRED


def verify_prior_renewal335(
    monitor: Any,
    *,
    prior442: dict[str, Any],
    result443: dict[str, Any],
    request443: dict[str, Any],
    journal443: ProtectedRenewalJournal334,
    pins443: dict[str, tuple[bytes, str]],
    signed443: dict[str, Any],
    masters443: dict[str, Any],
    owners443: dict[str, Any],
) -> tuple[str, dict[str, Any]] | None:
    """Full QL-431–443 signature/receipt revalidation, not a status badge."""
    if not (
        isinstance(prior442, dict)
        and isinstance(result443, dict)
        and result443.get("accepted") is True
        and result443.get("connection") == "HOLD"
        and result443.get("activationAuthorized") is False
        and result443.get("physicalReceiverCurrentlyOff") is False
        and result443.get("incidentClosed") is False
        and result443.get("custodyAccepted") is True
        and isinstance(request443, dict)
        and request443.get("action") == ACTION
        and isinstance(journal443, ProtectedRenewalJournal334)
        and isinstance(pins443, dict)
        and isinstance(signed443, dict)
        and set(signed443) == {"commsSource", "aiPlatform", "independentOff"}
        and isinstance(masters443, dict)
        and set(masters443) == set(MASTERS)
        and isinstance(owners443, dict)
        and set(owners443) == {"owner", "ownerReviewer"}
    ):
        return None
    prior = verify_prior_shutdown334(monitor, **prior442)
    if not prior:
        return None
    previous_digest, link = prior
    incident = link["incident"]
    req_digest = _digest(request443)
    late = link["leaseDisposition"] == EXPIRED
    stage = "EXCEPTION" if late else "ADMITTED"
    pending = journal443.read(monitor, incident, "PENDING")
    terminal = journal443.read(monitor, incident, stage)
    conflicting = journal443.read(monitor, incident, "ADMITTED" if late else "EXCEPTION")
    if not (
        pending
        and terminal
        and conflicting is None
        and pending["requestDigest"] == req_digest
        and pending["evidenceDigest"] == previous_digest
        and terminal["requestDigest"] == req_digest
        and result443.get("state") == (EXCEPTION if late else ADMITTED)
        and result443.get("leaseDisposition") == link["leaseDisposition"]
        and result443.get("leaseExceptionOpen") is late
        and result443.get("originalIncidentId") == incident
        and result443.get("pendingReceiptDigest") == pending["receiptDigest"]
        and result443.get("finalReceiptDigest") == terminal["receiptDigest"]
        and result443.get("masterCount") == 3
        and request443.get("originalIncidentId") == incident
        and request443.get("challengeId") == link["challengeId"]
        and request443.get("leaseId") == link["leaseId"]
        and request443.get("leaseExpiresAtMs") == link["leaseExpiresAtMs"]
        and request443.get("ql442FinalReceiptDigest") == link["finalReceiptDigest"]
        and request443.get("priorQl442Digest") == previous_digest
        and request443.get("historicalIndependentOffDigest") == link["historicalOffDigest"]
        and isinstance(request443.get("renewalNonce"), str)
        and len(request443["renewalNonce"]) >= 12
    ):
        return None
    source = verify443("commsSource", signed443["commsSource"], pins443)
    platform = verify443("aiPlatform", signed443["aiPlatform"], pins443)
    fresh = verify443("independentOff", signed443["independentOff"], pins443)
    if not (source and platform and fresh):
        return None
    classification = (
        "EXPIRED_LEASE_EXCEPTION_HANDOFF_REQUIRED"
        if late
        else "SIGNED_OFF_PILOT_CLOSURE_READY_FOR_DURABLE_ADMISSION"
    )
    if not (
        source.get("requestDigest") == req_digest
        and source.get("priorQl442Digest") == previous_digest
        and source.get("ql442FinalReceiptDigest") == link["finalReceiptDigest"]
        and source.get("historicalIndependentOffDigest") == link["historicalOffDigest"]
        and source.get("originalIncidentId") == incident
        and source.get("assertedState") == "QL442_SIGNED_SHUTDOWN_EVIDENCE_NOT_LIVE_OFF"
        and type(source.get("observedAtMs")) is int
        and source["observedAtMs"] >= link["historicalOffAtMs"]
        and platform.get("requestDigest") == req_digest
        and platform.get("priorQl442Digest") == previous_digest
        and platform.get("ql442FinalReceiptDigest") == link["finalReceiptDigest"]
        and platform.get("commsSourceDigest") == _digest(source)
        and platform.get("historicalHostDigest") == link["historicalHostDigest"]
        and platform.get("historicalOffDigest") == link["historicalOffDigest"]
        and platform.get("leaseDisposition") == link["leaseDisposition"]
        and platform.get("classification") == classification
        and type(platform.get("reviewedAtMs")) is int
        and source["observedAtMs"] <= platform["reviewedAtMs"]
        and fresh.get("requestDigest") == req_digest
        and fresh.get("originalIncidentId") == incident
        and fresh.get("challengeId") == link["challengeId"]
        and fresh.get("leaseId") == link["leaseId"]
        and fresh.get("renewalNonce") == request443["renewalNonce"]
        and fresh.get("aiPlatformDigest") == _digest(platform)
        and fresh.get("historicalHostDigest") == link["historicalHostDigest"]
        and fresh.get("historicalOffDigest") == link["historicalOffDigest"]
        and fresh.get("receiverState") == "OFF"
        and type(fresh.get("offSequence")) is int
        and fresh["offSequence"] > link["historicalOffSequence"]
        and type(fresh.get("observedAtMs")) is int
        and fresh["observedAtMs"] > link["historicalOffAtMs"]
        and fresh["observedAtMs"] >= platform["reviewedAtMs"]
    ):
        return None
    reports = []
    for master in MASTERS:
        report = verify443(master, masters443[master], pins443)
        if not (
            report
            and report.get("masterId") == master
            and report.get("requestDigest") == req_digest
            and report.get("originalIncidentId") == incident
            and report.get("aiPlatformDigest") == _digest(platform)
            and report.get("freshIndependentOffDigest") == _digest(fresh)
            and report.get("leaseDisposition") == link["leaseDisposition"]
            and report.get("decision") == (MASTER_LATE if late else MASTER_ADMIT)
            and type(report.get("reviewedAtMs")) is int
            and report["reviewedAtMs"] >= fresh["observedAtMs"]
        ):
            return None
        reports.append(report)
    if result443.get("threeMasterDigest") != _digest(reports):
        return None
    owners = []
    for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        owner = verify443(role, owners443[role], pins443)
        if not (
            owner
            and owner.get("ownerId") == owner_id
            and owner.get("requestDigest") == req_digest
            and owner.get("originalIncidentId") == incident
            and owner.get("aiPlatformDigest") == _digest(platform)
            and owner.get("freshIndependentOffDigest") == _digest(fresh)
            and owner.get("threeMasterDigest") == _digest(reports)
            and owner.get("decision") == (OWNER_LATE if late else OWNER_ADMIT)
            and type(owner.get("reviewedAtMs")) is int
            and owner["reviewedAtMs"] >= max(report["reviewedAtMs"] for report in reports)
        ):
            return None
        owners.append(owner)
    evidence_digest = _digest(
        {
            "prior": previous_digest,
            "source": source,
            "platform": platform,
            "freshOff": fresh,
            "masters": reports,
            "owners": owners,
            "disposition": link["leaseDisposition"],
        }
    )
    if not (
        terminal["evidenceDigest"] == evidence_digest
        and result443.get("freshIndependentOffDigest") == _digest(fresh)
        and result443.get("aiPlatformDigest") == _digest(platform)
        and result443.get("historicalOffDigest") == link["historicalOffDigest"]
    ):
        return None
    return (
        _digest(
            {
                "prior": previous_digest,
                "pending": pending,
                "terminal": terminal,
                "signedEvidence": evidence_digest,
            }
        ),
        {
            "incident": incident,
            "challengeId": link["challengeId"],
            "leaseId": link["leaseId"],
            "leaseDisposition": link["leaseDisposition"],
            "renewalNonce": request443["renewalNonce"],
            "ql442FinalReceiptDigest": link["finalReceiptDigest"],
            "finalReceiptDigest": terminal["receiptDigest"],
            "previousOffDigest": _digest(fresh),
            "previousOffAtMs": fresh["observedAtMs"],
            "previousOffSequence": fresh["offSequence"],
            "ownerIds": link["ownerIds"],
        },
    )
