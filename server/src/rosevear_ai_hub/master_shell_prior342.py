"""Build 342: independently revalidate original QL450 signed protected custody.

STABLE and EXCEPTION are both historical OPEN/HOLD; neither establishes live OFF.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior341 import verify_prior_disposition341
from rosevear_ai_hub.master_shell_stability341 import (
    ACTION,
    CLASS_EXCEPTION,
    CLASS_STABLE,
    DECISION_EXCEPTION,
    DECISION_STABLE,
    EXCEPTION,
    HORIZONS,
    ROLES,
    STABLE,
    ProtectedStabilityJournal341,
    verify450,
)


def verify_prior_stability342(
    monitor: Any,
    *,
    prior449: dict[str, Any],
    result450: dict[str, Any],
    request450: dict[str, Any],
    journal450: ProtectedStabilityJournal341,
    pins450: dict[str, tuple[bytes, str]],
    signed450: dict[str, Any],
    masters450: dict[str, Any],
    owners450: dict[str, Any],
) -> tuple[str, dict[str, Any]] | None:
    if not (
        isinstance(prior449, dict)
        and isinstance(result450, dict)
        and result450.get("accepted") is True
        and result450.get("state") in (STABLE, EXCEPTION)
        and result450.get("independentStabilityReviewAdmitted") is True
        and result450.get("masterCount") == 3
        and result450.get("connection") == "HOLD"
        and result450.get("activationAuthorized") is False
        and result450.get("closureAuthorized") is False
        and result450.get("physicalReceiverCurrentlyOff") is False
        and result450.get("incidentClosed") is False
        and result450.get("incidentStatus") == "OPEN"
        and isinstance(request450, dict)
        and request450.get("action") == ACTION
        and isinstance(journal450, ProtectedStabilityJournal341)
        and isinstance(pins450, dict)
        and set(pins450) == set(ROLES)
        and len({pin[0] for pin in pins450.values()}) == len(ROLES)
        and len({pin[1] for pin in pins450.values()}) == len(ROLES)
        and isinstance(signed450, dict)
        and set(signed450)
        == {
            "commsSource",
            "externalAnchor",
            "closureAuthority",
            "hostSHORT",
            "observerSHORT",
            "hostMEDIUM",
            "observerMEDIUM",
            "hostLONG",
            "observerLONG",
        }
        and isinstance(masters450, dict)
        and set(masters450) == set(MASTERS)
        and isinstance(owners450, dict)
        and set(owners450) == {"owner", "ownerReviewer"}
    ):
        return None
    prior = verify_prior_disposition341(monitor, **prior449)
    if prior is None:
        return None
    old_digest, link = prior
    incident = link["incident"]
    req_digest = _digest(request450)
    stage = "STABLE" if result450["state"] == STABLE else "EXCEPTION"
    pending = journal450.read(monitor, incident, "PENDING")
    terminal = journal450.read(monitor, incident, stage)
    conflict = journal450.read(monitor, incident, "EXCEPTION" if stage == "STABLE" else "STABLE")
    if not (
        pending
        and terminal
        and conflict is None
        and pending.get("requestDigest") == req_digest
        and pending.get("evidenceDigest") == old_digest
        and terminal.get("requestDigest") == req_digest
        and result450.get("pendingReceiptDigest") == pending["receiptDigest"]
        and result450.get("finalReceiptDigest") == terminal["receiptDigest"]
        and result450.get("originalIncidentId") == incident
        and result450.get("reviewId") == request450.get("reviewId")
        and request450.get("originalIncidentId") == incident
        and request450.get("priorQl449Digest") == old_digest
        and request450.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
        and request450.get("ql449AnchoredDigest") == link["ql449AnchoredDigest"]
        and request450.get("ql449CeremonyId") == link["ql449CeremonyId"]
        and request450.get("previousObserverDigest") == link["previousObserverDigest"]
        and isinstance(request450.get("reviewId"), str)
        and len(request450["reviewId"]) >= 12
        and isinstance(request450.get("challengeNonce"), str)
        and len(request450["challengeNonce"]) >= 12
        and len(
            {
                request450["reviewId"],
                request450["challengeNonce"],
                link["ql449Nonce"],
                link["ql449CeremonyId"],
            }
        )
        == 4
    ):
        return None
    source = verify450("commsSource", signed450["commsSource"], pins450)
    anchor = verify450("externalAnchor", signed450["externalAnchor"], pins450)
    boundary = verify450("closureAuthority", signed450["closureAuthority"], pins450)
    if not (source and anchor and boundary):
        return None
    if not (
        source.get("requestDigest") == req_digest
        and source.get("originalIncidentId") == incident
        and source.get("priorQl449Digest") == old_digest
        and source.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
        and source.get("ql449AnchoredDigest") == link["ql449AnchoredDigest"]
        and source.get("incidentStatus") == "OPEN_HOLD"
        and type(source.get("observedAtMs")) is int
        and source["observedAtMs"] > link["previousObservedAtMs"]
        and anchor.get("requestDigest") == req_digest
        and anchor.get("originalIncidentId") == incident
        and anchor.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
        and anchor.get("ql449AnchoredDigest") == link["ql449AnchoredDigest"]
        and anchor.get("sourceDigest") == _digest(source)
        and anchor.get("reviewId") == request450["reviewId"]
        and anchor.get("challengeNonce") == request450["challengeNonce"]
        and anchor.get("originalAnchorId") == link["ql449AnchorId"]
        and anchor.get("disposition") == "ORIGINAL_ANCHOR_HISTORY_ONLY_NO_CLOSURE"
        and type(anchor.get("sequence")) is int
        and anchor["sequence"] > link["previousSequence"]
        and type(anchor.get("observedAtMs")) is int
        and anchor["observedAtMs"] > source["observedAtMs"]
    ):
        return None
    previous_observer = link["previousObserverDigest"]
    previous_host = None
    seq = anchor["sequence"]
    time = anchor["observedAtMs"]
    first_time = None
    observations = []
    for index, horizon in enumerate(HORIZONS, 1):
        host = verify450("host", signed450["host" + horizon], pins450)
        witness = verify450("observer", signed450["observer" + horizon], pins450)
        if not (host and witness):
            return None
        if not (
            host.get("requestDigest") == req_digest
            and host.get("originalIncidentId") == incident
            and host.get("hostMachineId") == "DESKTOP-AE894KC"
            and host.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
            and host.get("reviewId") == request450["reviewId"]
            and host.get("challengeNonce") == request450["challengeNonce"]
            and host.get("anchorDigest") == _digest(anchor)
            and host.get("horizon") == horizon
            and host.get("previousHostDigest") == previous_host
            and host.get("previousObserverDigest") == previous_observer
            and host.get("receiverState") in ("ON", "OFF")
            and type(host.get("isolationLock")) is bool
            and type(host.get("leaseRevoked")) is bool
            and type(host.get("watchdogArmed")) is bool
            and type(host.get("sequence")) is int
            and host["sequence"] > seq
            and type(host.get("observedAtMs")) is int
            and host["observedAtMs"] > time
            and witness.get("requestDigest") == req_digest
            and witness.get("originalIncidentId") == incident
            and witness.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
            and witness.get("reviewId") == request450["reviewId"]
            and witness.get("challengeNonce") == request450["challengeNonce"]
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
            return None
        if index == 1:
            first_time = host["observedAtMs"]
        elif host["observedAtMs"] - first_time < (10_000 if index == 2 else 30_000):
            return None
        observations.append((host, witness))
        previous_host = _digest(host)
        previous_observer = _digest(witness)
        seq = witness["sequence"]
        time = witness["observedAtMs"]
    stable = all(
        h["receiverState"] == w["receiverState"] == "OFF"
        and h["isolationLock"]
        and h["leaseRevoked"]
        and h["watchdogArmed"]
        and w["isolationConfirmed"]
        for h, w in observations
    )
    classification = CLASS_STABLE if stable else CLASS_EXCEPTION
    decision = DECISION_STABLE if stable else DECISION_EXCEPTION
    if not (
        result450.get("classification") == classification
        and result450.get("recurrenceDecision") == decision
        and stage == ("STABLE" if stable else "EXCEPTION")
    ):
        return None
    stability_digest = _digest(
        {
            "prior": old_digest,
            "source": _digest(source),
            "anchor": _digest(anchor),
            "hostDigests": [_digest(h) for h, _ in observations],
            "observerDigests": [_digest(w) for _, w in observations],
            "classification": classification,
            "reviewId": request450["reviewId"],
        }
    )
    if not (
        result450.get("stabilityEvidenceDigest") == stability_digest
        and boundary.get("requestDigest") == req_digest
        and boundary.get("originalIncidentId") == incident
        and boundary.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
        and boundary.get("reviewId") == request450["reviewId"]
        and boundary.get("challengeNonce") == request450["challengeNonce"]
        and boundary.get("stabilityEvidenceDigest") == stability_digest
        and boundary.get("classification") == classification
        and boundary.get("boundaryDecision")
        == "SEPARATE_OWNER_CEREMONY_REQUIRED_NO_AUTOMATIC_CLOSURE"
        and boundary.get("closureAuthorized") is False
        and boundary.get("activationAuthorized") is False
        and boundary.get("physicalReceiverCurrentlyOff") is False
        and boundary.get("incidentStatus") == "OPEN_HOLD"
        and type(boundary.get("reviewedAtMs")) is int
        and boundary["reviewedAtMs"] >= time
        and result450.get("closureBoundaryDigest") == _digest(boundary)
    ):
        return None
    reports = []
    for master in MASTERS:
        vote = verify450(master, masters450[master], pins450)
        if not (
            vote
            and vote.get("masterId") == master
            and vote.get("requestDigest") == req_digest
            and vote.get("originalIncidentId") == incident
            and vote.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
            and vote.get("reviewId") == request450["reviewId"]
            and vote.get("stabilityEvidenceDigest") == stability_digest
            and vote.get("closureBoundaryDigest") == _digest(boundary)
            and vote.get("classification") == classification
            and vote.get("recurrenceDecision") == decision
            and vote.get("incidentStatus") == "OPEN_HOLD"
            and type(vote.get("reviewedAtMs")) is int
            and vote["reviewedAtMs"] >= boundary["reviewedAtMs"]
        ):
            return None
        reports.append(vote)
    reports_digest = _digest(reports)
    if result450.get("threeMasterDigest") != reports_digest:
        return None
    owners = []
    for role, identity in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        body = verify450(role, owners450[role], pins450)
        if not (
            body
            and body.get("ownerId") == identity
            and body.get("requestDigest") == req_digest
            and body.get("originalIncidentId") == incident
            and body.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
            and body.get("reviewId") == request450["reviewId"]
            and body.get("stabilityEvidenceDigest") == stability_digest
            and body.get("closureBoundaryDigest") == _digest(boundary)
            and body.get("threeMasterDigest") == reports_digest
            and body.get("classification") == classification
            and body.get("recurrenceDecision") == decision
            and body.get("incidentStatus") == "OPEN_HOLD"
            and body.get("closureAuthorized") is False
            and type(body.get("reviewedAtMs")) is int
            and body["reviewedAtMs"] >= max(v["reviewedAtMs"] for v in reports)
        ):
            return None
        owners.append(body)
    full_evidence_digest = _digest(
        {
            "prior": old_digest,
            "request": req_digest,
            "source": source,
            "anchor": anchor,
            "hosts": [h for h, _ in observations],
            "observers": [w for _, w in observations],
            "boundary": boundary,
            "masters": reports,
            "owners": owners,
            "classification": classification,
            "recurrenceDecision": decision,
        }
    )
    if terminal.get("evidenceDigest") != full_evidence_digest:
        return None
    return _digest(
        {
            "prior": old_digest,
            "pending": pending,
            "terminal": terminal,
            "signedEvidence": full_evidence_digest,
        }
    ), {
        "incident": incident,
        "ql450ReceiptDigest": terminal["receiptDigest"],
        "ql450StabilityDigest": stability_digest,
        "ql450BoundaryDigest": _digest(boundary),
        "priorClassification": classification,
        "priorExceptionOpen": not stable,
        "ql450ReviewId": request450["reviewId"],
        "ql450Nonce": request450["challengeNonce"],
        "previousObserverDigest": previous_observer,
        "previousSequence": seq,
        "previousObservedAtMs": time,
        "ownerIds": link["ownerIds"],
    }
