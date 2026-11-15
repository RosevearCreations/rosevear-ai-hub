"""QL-452: independently reconcile protected QL-451 historical renewal outcomes.

This module is deliberately read-only. Signatures and fsynced one-use receipts
prove past custody, never present receiver OFF or incident closure authority.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior342 import verify_prior_stability342
from rosevear_ai_hub.master_shell_renewal342 import (
    ACTION,
    ANCHOR_DISPOSITION,
    BOUNDARY,
    CLASS_EXCEPTION,
    CLASS_RENEWED,
    DECISION_EXCEPTION,
    DECISION_RENEWED,
    EXCEPTION,
    HORIZONS,
    RENEWED,
    RESPONSE_COMPLETE,
    RESPONSE_CONTINUITY,
    ROLES,
    ProtectedRenewalJournal342,
    hold342,
    verify451,
)


def hold343(reason: str) -> dict[str, Any]:
    """Fail closed: no signed history or real-time host assertion by default."""
    return {
        **hold342(reason, True),
        "sourceBuild": 343,
        "historicalQl451Verified": False,
        "threeMasterGovernanceVerified": False,
        "followUpClosureVerified": False,
        "recurrencePreventionOutcome": "UNVERIFIED_ESCALATE_OWNER",
        "originalHost": "DESKTOP-AE894KC",
        "nextMasterHandoff": "rosevear-comms-hub",
    }


def reconcile_ql451_outcome343(
    monitor: Any,
    *,
    prior450: dict[str, Any],
    result451: dict[str, Any],
    request451: dict[str, Any],
    journal451: ProtectedRenewalJournal342,
    pins451: dict[str, tuple[bytes, str]],
    signed451: dict[str, Any],
    masters451: dict[str, Any],
    owners451: dict[str, Any],
) -> dict[str, Any]:
    """Recompute original signed evidence, exclusive receipt and the entire vote chain.

    A returned accepted=True means the *historical* protected QL-451 decision is
    internally authentic. It grants no action and does not assert present OFF.
    """
    if not (
        _on_ree(monitor)
        and isinstance(prior450, dict)
        and isinstance(result451, dict)
        and isinstance(request451, dict)
        and isinstance(journal451, ProtectedRenewalJournal342)
        and isinstance(pins451, dict)
        and set(pins451) == set(ROLES)
        and all(
            isinstance(p, tuple)
            and len(p) == 2
            and isinstance(p[0], bytes)
            and isinstance(p[1], str)
            and _public_ed25519(*p)
            for p in pins451.values()
        )
        and len({p[0] for p in pins451.values()}) == len(ROLES)
        and len({p[1] for p in pins451.values()}) == len(ROLES)
        and isinstance(signed451, dict)
        and set(signed451)
        == {
            "commsSource",
            "responseOfficer",
            "externalAnchor",
            "closureAuthority",
            *(f"host{h}" for h in HORIZONS),
            *(f"observer{h}" for h in HORIZONS),
        }
        and isinstance(masters451, dict)
        and set(masters451) == set(MASTERS)
        and isinstance(owners451, dict)
        and set(owners451) == {"owner", "ownerReviewer"}
    ):
        return hold343("HOLD_QL452_SIGNED_CUSTODY_OR_ORIGINAL_HOST_INVALID")

    try:
        prior = verify_prior_stability342(monitor, **prior450)
        if prior is None:
            return hold343("HOLD_QL452_ORIGINAL_QL450_CHAIN_NOT_VERIFIED")
        prior_digest, link = prior
        incident = link["incident"]
        req_digest = _digest(request451)
        classification = result451.get("classification")
        renewed = classification == CLASS_RENEWED
        terminal_stage = "RENEWED" if renewed else "EXCEPTION"
        pending = journal451.read(monitor, incident, "PENDING")
        terminal = journal451.read(monitor, incident, terminal_stage)
        conflict = journal451.read(
            monitor, incident, "EXCEPTION" if renewed else "RENEWED"
        )
        if not (
            result451.get("accepted") is True
            and result451.get("state") == (RENEWED if renewed else EXCEPTION)
            and classification in (CLASS_RENEWED, CLASS_EXCEPTION)
            and result451.get("reassessmentDecision")
            == (DECISION_RENEWED if renewed else DECISION_EXCEPTION)
            and result451.get("independentRenewalAdmitted") is True
            and result451.get("masterCount") == 3
            and result451.get("connection") == "HOLD"
            and result451.get("incidentStatus") == "OPEN"
            and result451.get("incidentClosed") is False
            and result451.get("activationAuthorized") is False
            and result451.get("closureAuthorized") is False
            and result451.get("physicalReceiverCurrentlyOff") is False
            and result451.get("historicalEvidenceOnly") is True
            and pending
            and terminal
            and conflict is None
            and pending["requestDigest"] == terminal["requestDigest"] == req_digest
            and pending["evidenceDigest"] == prior_digest
            and result451.get("pendingReceiptDigest") == pending["receiptDigest"]
            and result451.get("finalReceiptDigest") == terminal["receiptDigest"]
            and result451.get("originalIncidentId") == incident
            and result451.get("renewalId") == request451.get("renewalId")
            and request451.get("action") == ACTION
            and request451.get("originalIncidentId") == incident
            and request451.get("priorQl450Digest") == prior_digest
            and request451.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
            and request451.get("ql450StabilityDigest") == link["ql450StabilityDigest"]
            and request451.get("ql450BoundaryDigest") == link["ql450BoundaryDigest"]
            and request451.get("priorClassification") == link["priorClassification"]
            and request451.get("previousObserverDigest") == link["previousObserverDigest"]
            and isinstance(request451.get("renewalId"), str)
            and len(request451["renewalId"]) >= 12
            and isinstance(request451.get("challengeNonce"), str)
            and len(request451["challengeNonce"]) >= 12
            and len({
                request451["renewalId"],
                request451["challengeNonce"],
                link["ql450ReviewId"],
                link["ql450Nonce"],
            }) == 4
        ):
            return hold343("HOLD_QL452_RECEIPT_OR_PREDECESSOR_DIGEST_MISMATCH")

        source = verify451("commsSource", signed451["commsSource"], pins451)
        officer = verify451("responseOfficer", signed451["responseOfficer"], pins451)
        anchor = verify451("externalAnchor", signed451["externalAnchor"], pins451)
        if not (source and officer and anchor):
            return hold343("HOLD_QL452_INDEPENDENT_SOURCE_RESPONSE_ANCHOR_SIGNATURE")
        renewal_id = request451["renewalId"]
        nonce = request451["challengeNonce"]
        if not (
            source.get("requestDigest") == req_digest
            and source.get("originalIncidentId") == incident
            and source.get("priorQl450Digest") == prior_digest
            and source.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
            and source.get("ql450StabilityDigest") == link["ql450StabilityDigest"]
            and source.get("priorClassification") == link["priorClassification"]
            and source.get("incidentStatus") == "OPEN_HOLD"
            and type(source.get("observedAtMs")) is int
            and source["observedAtMs"] > link["previousObservedAtMs"]
            and officer.get("requestDigest") == req_digest
            and officer.get("originalIncidentId") == incident
            and officer.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
            and officer.get("sourceDigest") == _digest(source)
            and officer.get("renewalId") == renewal_id
            and officer.get("challengeNonce") == nonce
            and officer.get("responseDisposition")
            in (
                (RESPONSE_COMPLETE, "SIGNED_RESPONSE_UNRESOLVED_KEEP_HOLD")
                if link["priorExceptionOpen"] else (RESPONSE_CONTINUITY,)
            )
            and all(type(officer.get(k)) is bool for k in
                    ("isolationLock", "leaseRevoked", "watchdogArmed"))
            and type(officer.get("observedAtMs")) is int
            and source["observedAtMs"] < officer["observedAtMs"]
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
            and officer["observedAtMs"] < anchor["observedAtMs"]
        ):
            return hold343("HOLD_QL452_SOURCE_FOLLOWUP_OR_ANCHOR_MISMATCH")

        previous_host = None
        previous_observer = link["previousObserverDigest"]
        sequence = anchor["sequence"]
        observed_at = anchor["observedAtMs"]
        first_at = None
        observations = []
        for idx, horizon in enumerate(HORIZONS):
            host = verify451("host", signed451[f"host{horizon}"], pins451)
            witness = verify451("observer", signed451[f"observer{horizon}"], pins451)
            if not (host and witness):
                return hold343("HOLD_QL452_ORIGINAL_HOST_INDEPENDENT_OFF_SIGNATURE")
            if not (
                host.get("requestDigest") == req_digest
                and host.get("originalIncidentId") == incident
                and host.get("hostMachineId") == "DESKTOP-AE894KC"
                and host.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
                and host.get("renewalId") == renewal_id
                and host.get("challengeNonce") == nonce
                and host.get("responseDigest") == _digest(officer)
                and host.get("anchorDigest") == _digest(anchor)
                and host.get("horizon") == horizon
                and host.get("previousHostDigest") == previous_host
                and host.get("previousObserverDigest") == previous_observer
                and host.get("receiverState") in ("ON", "OFF")
                and all(type(host.get(k)) is bool for k in
                        ("isolationLock", "leaseRevoked", "watchdogArmed"))
                and type(host.get("sequence")) is int
                and host["sequence"] > sequence
                and type(host.get("observedAtMs")) is int
                and host["observedAtMs"] > observed_at
                and witness.get("requestDigest") == req_digest
                and witness.get("originalIncidentId") == incident
                and witness.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
                and witness.get("renewalId") == renewal_id
                and witness.get("challengeNonce") == nonce
                and witness.get("anchorDigest") == _digest(anchor)
                and witness.get("horizon") == horizon
                and witness.get("signedHostDigest") == _digest(host)
                and witness.get("previousObserverDigest") == previous_observer
                and witness.get("receiverState") in ("ON", "OFF")
                and type(witness.get("isolationConfirmed")) is bool
                and type(witness.get("sequence")) is int
                and witness["sequence"] > host["sequence"]
                and type(witness.get("observedAtMs")) is int
                and witness["observedAtMs"] >= host["observedAtMs"]
            ):
                return hold343("HOLD_QL452_HORIZON_OR_SEQUENCE_REPLAY")
            if idx == 0:
                first_at = host["observedAtMs"]
            elif host["observedAtMs"] - first_at < (10_000 if idx == 1 else 30_000):
                return hold343("HOLD_QL452_REQUIRED_10_30_SECOND_HORIZONS")
            observations.append((host, witness))
            previous_host = _digest(host)
            previous_observer = _digest(witness)
            sequence = witness["sequence"]
            observed_at = witness["observedAtMs"]

        historical_renewed = (
            officer["responseDisposition"] in (RESPONSE_COMPLETE, RESPONSE_CONTINUITY)
            and officer["isolationLock"] and officer["leaseRevoked"]
            and officer["watchdogArmed"]
            and all(
                h["receiverState"] == w["receiverState"] == "OFF"
                and h["isolationLock"] and h["leaseRevoked"] and h["watchdogArmed"]
                and w["isolationConfirmed"]
                for h, w in observations
            )
        )
        if historical_renewed != renewed:
            return hold343("HOLD_QL452_RENEWAL_EXCEPTION_MISCLASSIFICATION")
        evidence_digest = _digest({
            "prior": prior_digest,
            "source": _digest(source),
            "response": _digest(officer),
            "anchor": _digest(anchor),
            "hostDigests": [_digest(h) for h, _ in observations],
            "observerDigests": [_digest(w) for _, w in observations],
            "classification": classification,
            "renewalId": renewal_id,
        })
        boundary = verify451("closureAuthority", signed451["closureAuthority"], pins451)
        if not (
            boundary
            and result451.get("renewalEvidenceDigest") == evidence_digest
            and boundary.get("requestDigest") == req_digest
            and boundary.get("originalIncidentId") == incident
            and boundary.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
            and boundary.get("renewalId") == renewal_id
            and boundary.get("challengeNonce") == nonce
            and boundary.get("renewalEvidenceDigest") == evidence_digest
            and boundary.get("classification") == classification
            and boundary.get("boundaryDecision") == BOUNDARY
            and boundary.get("closureAuthorized") is False
            and boundary.get("activationAuthorized") is False
            and boundary.get("physicalReceiverCurrentlyOff") is False
            and boundary.get("incidentStatus") == "OPEN_HOLD"
            and type(boundary.get("reviewedAtMs")) is int
            and boundary["reviewedAtMs"] >= observed_at
            and result451.get("closureBoundaryDigest") == _digest(boundary)
        ):
            return hold343("HOLD_QL452_INDEPENDENT_CLOSURE_DENIAL_REQUIRED")
        reports = []
        for master in MASTERS:
            vote = verify451(master, masters451[master], pins451)
            if not (
                vote
                and vote.get("masterId") == master
                and vote.get("requestDigest") == req_digest
                and vote.get("originalIncidentId") == incident
                and vote.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
                and vote.get("renewalId") == renewal_id
                and vote.get("renewalEvidenceDigest") == evidence_digest
                and vote.get("closureBoundaryDigest") == _digest(boundary)
                and vote.get("classification") == classification
                and vote.get("reassessmentDecision")
                == (DECISION_RENEWED if renewed else DECISION_EXCEPTION)
                and vote.get("incidentStatus") == "OPEN_HOLD"
                and type(vote.get("reviewedAtMs")) is int
                and vote["reviewedAtMs"] >= boundary["reviewedAtMs"]
            ):
                return hold343("HOLD_QL452_THREE_MASTER_RECURRENCE_GOVERNANCE")
            reports.append(vote)
        reports_digest = _digest(reports)
        if result451.get("threeMasterDigest") != reports_digest:
            return hold343("HOLD_QL452_THREE_MASTER_DIGEST_MISMATCH")
        owners = []
        for role, identity in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
            owner = verify451(role, owners451[role], pins451)
            if not (
                owner
                and owner.get("ownerId") == identity
                and owner.get("requestDigest") == req_digest
                and owner.get("originalIncidentId") == incident
                and owner.get("ql450ReceiptDigest") == link["ql450ReceiptDigest"]
                and owner.get("renewalId") == renewal_id
                and owner.get("renewalEvidenceDigest") == evidence_digest
                and owner.get("closureBoundaryDigest") == _digest(boundary)
                and owner.get("threeMasterDigest") == reports_digest
                and owner.get("classification") == classification
                and owner.get("reassessmentDecision")
                == (DECISION_RENEWED if renewed else DECISION_EXCEPTION)
                and owner.get("incidentStatus") == "OPEN_HOLD"
                and owner.get("closureAuthorized") is False
                and type(owner.get("reviewedAtMs")) is int
                and owner["reviewedAtMs"] >= max(v["reviewedAtMs"] for v in reports)
            ):
                return hold343("HOLD_QL452_DUAL_ORIGINAL_OWNER_CLOSURE_BOUNDARY")
            owners.append(owner)
        signed_digest = _digest({
            "prior": prior_digest,
            "request": req_digest,
            "source": source,
            "officer": officer,
            "anchor": anchor,
            "hosts": [h for h, _ in observations],
            "observers": [w for _, w in observations],
            "boundary": boundary,
            "masters": reports,
            "owners": owners,
            "classification": classification,
            "reassessmentDecision": DECISION_RENEWED if renewed else DECISION_EXCEPTION,
        })
        if terminal["evidenceDigest"] != signed_digest:
            return hold343("HOLD_QL452_PROTECTED_TERMINAL_EVIDENCE_MISMATCH")
        # Historical reconciliation is NOT an independent physical check now.
        status = hold343("QL452_HISTORICAL_RENEWAL_RECONCILED_INCIDENT_OPEN_HOLD")
        status.update({
            "accepted": True,
            "historicalQl451Verified": True,
            "threeMasterGovernanceVerified": True,
            "unresolvedException": not renewed,
            "classification": classification,
            "originalIncidentId": incident,
            "historicalReceiptDigest": terminal["receiptDigest"],
            "historicalEvidenceDigest": signed_digest,
            "followUpClosureVerified": False,
            "recurrencePreventionOutcome": (
                "EXCEPTION_OPEN_CORRECTIVE_RESPONSE_AND_FRESH_OFF_FOLLOWUP_REQUIRED"
                if not renewed else
                "RENEWAL_HISTORY_RECONCILED_FRESH_OFF_AND_OWNER_REVIEW_REQUIRED"
            ),
            "originalHostFollowUp": "NOT_VERIFIED_CURRENT_PHYSICAL_OFF",
            "nextMasterHandoff": "rosevear-comms-hub",
        })
        return status
    except (KeyError, TypeError, ValueError, OSError):
        return hold343("HOLD_QL452_INCOMPLETE_TAMPERED_OR_UNREADABLE_EVIDENCE")
