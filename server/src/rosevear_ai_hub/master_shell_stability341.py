"""Build 341 / QL-450: original-host stability and closure-boundary custody.

Signed historical evidence only: no receiver controls, closure or current OFF.
"""

from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_decision333 import ProtectedWitnessJournal333, hold_decision333
from rosevear_ai_hub.master_shell_prior341 import verify_prior_disposition341

ACTION = "QL450_ORIGINAL_HOST_POST_DISPOSITION_STABILITY_BOUNDARY"
STABLE = "DURABLE_QL450_HISTORICAL_OFF_STABILITY_KEEP_INCIDENT_OPEN"
EXCEPTION = "DURABLE_QL450_RECURRENCE_EXCEPTION_KEEP_INCIDENT_OPEN"
CLASS_STABLE = "SIGNED_HISTORICAL_OFF_STABLE_REVIEW_NO_CLOSURE"
CLASS_EXCEPTION = "SIGNED_OFF_RECURRENCE_EXCEPTION_INCIDENT_OPEN"
ANCHOR_HISTORY = "ORIGINAL_ANCHOR_HISTORY_ONLY_NO_CLOSURE"
BOUNDARY = "SEPARATE_OWNER_CEREMONY_REQUIRED_NO_AUTOMATIC_CLOSURE"
DECISION_STABLE = "PREVENT_RECURRENCE_HISTORICAL_STABILITY_KEEP_OPEN_HOLD"
DECISION_EXCEPTION = "ESCALATE_SIGNED_RECURRENCE_KEEP_OPEN_HOLD"
HORIZONS = ("SHORT", "MEDIUM", "LONG")
ROLES = (
    "commsSource", "externalAnchor", "host", "observer",
    "closureAuthority", "owner", "ownerReviewer", *MASTERS,
)


class ProtectedStabilityJournal341(ProtectedWitnessJournal333):
    """Private 0600 PENDING then mutually exclusive 0600 STABLE / EXCEPTION."""

    def __init__(self, directory: Path):
        super().__init__(directory)
        self.stages = ("PENDING", "STABLE", "EXCEPTION")
        self.terminal_stages = ("STABLE", "EXCEPTION")


def verify450(
    role: str, envelope: Any, pins: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if role not in pins or not isinstance(envelope, dict):
        return None
    payload = envelope.get("payload")
    if not isinstance(payload, dict):
        return None
    schema = f"rosevear.ai-hub.ql450.{role}.v1"
    return payload if _native(envelope, set(payload), schema, *pins[role]) == payload else None


def hold341(reason: str, exception: bool = False) -> dict[str, Any]:
    return {
        **hold_decision333(reason),
        "sourceBuild": 341, "state": reason,
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "incidentStatus": "OPEN", "incidentClosed": False,
        "closureAuthorized": False, "activationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "historicalEvidenceOnly": True, "freshPhysicalOffProven": False,
        "independentStabilityReviewAdmitted": False,
        "unresolvedException": exception,
    }


def review_stability341(
    monitor: Any,
    prior449: dict[str, Any],
    request: dict[str, Any],
    journal: ProtectedStabilityJournal341,
    pins: dict[str, tuple[bytes, str]],
    *,
    read_comms_source: Any,
    read_external_anchor: Any,
    read_host: Any,
    read_observer: Any,
    read_closure_authority: Any,
    master_reports: dict[str, Any],
    dual_owners: dict[str, Any],
    now_ms: int,
    final_now_ms: int,
) -> dict[str, Any]:
    """Read and verify separate original signers; never actuate a receiver."""

    def fail(message: str, exception: bool = False) -> dict[str, Any]:
        return hold341(message, exception)

    if not (
        _on_ree(monitor)
        and isinstance(prior449, dict)
        and isinstance(request, dict)
        and isinstance(journal, ProtectedStabilityJournal341)
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
        and all(callable(fn) for fn in (
            read_comms_source, read_external_anchor, read_host,
            read_observer, read_closure_authority,
        ))
        and type(now_ms) is int
        and type(final_now_ms) is int
        and 0 <= final_now_ms - now_ms <= 60_000
    ):
        return fail("HOLD_QL450_ORIGINAL_HOST_PINS_CLOCK_OR_AUTHORITY_UNVERIFIED")
    try:
        verified = verify_prior_disposition341(monitor, **prior449)
        if verified is None:
            return fail("HOLD_QL450_SIGNED_QL449_STABLE_REVIEW_REQUIRED")
        prior_digest, link = verified
        incident = link["incident"]
        review_id = request.get("reviewId")
        nonce = request.get("challengeNonce")
        req_digest = _digest(request)
        if not (
            request.get("action") == ACTION
            and request.get("originalIncidentId") == incident
            and request.get("priorQl449Digest") == prior_digest
            and request.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
            and request.get("ql449AnchoredDigest") == link["ql449AnchoredDigest"]
            and request.get("ql449CeremonyId") == link["ql449CeremonyId"]
            and request.get("previousObserverDigest") == link["previousObserverDigest"]
            and isinstance(review_id, str) and len(review_id) >= 12
            and isinstance(nonce, str) and len(nonce) >= 12
            and len({review_id, nonce, link["ql449Nonce"],
                     link["ql449CeremonyId"], link["ql449AnchorId"]}) == 5
            and now_ms > link["previousObservedAtMs"]
        ):
            return fail("HOLD_QL450_FRESH_SCOPED_NONREPLAYABLE_REVIEW_REQUIRED")
        pending = journal.claim(monitor, incident, "PENDING", req_digest, prior_digest)
        if not pending:
            return fail("HOLD_QL450_PRIVATE_PENDING_CONSUMED_OR_UNDURABLE")
        source = verify450(
            "commsSource",
            read_comms_source(request=request, pendingDigest=pending["receiptDigest"]),
            pins,
        )
        if not (
            source
            and source.get("requestDigest") == req_digest
            and source.get("originalIncidentId") == incident
            and source.get("priorQl449Digest") == prior_digest
            and source.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
            and source.get("ql449AnchoredDigest") == link["ql449AnchoredDigest"]
            and source.get("incidentStatus") == "OPEN_HOLD"
            and type(source.get("observedAtMs")) is int
            and link["previousObservedAtMs"] < source["observedAtMs"] <= now_ms
            and now_ms - source["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL450_ORIGINAL_SIGNED_COMMS_OPEN_READBACK_INVALID")
        anchor = verify450(
            "externalAnchor",
            read_external_anchor(request=request, sourceDigest=_digest(source)),
            pins,
        )
        if not (
            anchor
            and anchor.get("requestDigest") == req_digest
            and anchor.get("originalIncidentId") == incident
            and anchor.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
            and anchor.get("ql449AnchoredDigest") == link["ql449AnchoredDigest"]
            and anchor.get("sourceDigest") == _digest(source)
            and anchor.get("reviewId") == review_id
            and anchor.get("challengeNonce") == nonce
            and anchor.get("originalAnchorId") == link["ql449AnchorId"]
            and anchor.get("disposition") == ANCHOR_HISTORY
            and type(anchor.get("sequence")) is int
            and anchor["sequence"] > link["previousSequence"]
            and type(anchor.get("observedAtMs")) is int
            and source["observedAtMs"] < anchor["observedAtMs"] <= now_ms
            and now_ms - anchor["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL450_ORIGINAL_INDEPENDENT_ANCHOR_INVALID")
        observations = []
        last_observer = link["previousObserverDigest"]
        last_host = None
        last_sequence = anchor["sequence"]
        last_observed = anchor["observedAtMs"]
        first_host_time = None
        for index, horizon in enumerate(HORIZONS, start=1):
            host = verify450(
                "host",
                read_host(
                    request=request, horizon=horizon,
                    anchorDigest=_digest(anchor),
                    previousObserverDigest=last_observer,
                ), pins,
            )
            if not (
                host
                and host.get("requestDigest") == req_digest
                and host.get("originalIncidentId") == incident
                and host.get("hostMachineId") == "DESKTOP-AE894KC"
                and host.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
                and host.get("reviewId") == review_id
                and host.get("challengeNonce") == nonce
                and host.get("anchorDigest") == _digest(anchor)
                and host.get("horizon") == horizon
                and host.get("previousHostDigest") == last_host
                and host.get("previousObserverDigest") == last_observer
                and host.get("receiverState") in ("ON", "OFF")
                and type(host.get("isolationLock")) is bool
                and type(host.get("leaseRevoked")) is bool
                and type(host.get("watchdogArmed")) is bool
                and type(host.get("sequence")) is int
                and host["sequence"] > last_sequence
                and type(host.get("observedAtMs")) is int
                and last_observed < host["observedAtMs"] <= now_ms
                and now_ms - host["observedAtMs"] <= 60_000
            ):
                return fail("HOLD_QL450_ORIGINAL_HOST_HORIZON_SIGNATURE_INVALID")
            if index == 1:
                first_host_time = host["observedAtMs"]
            elif host["observedAtMs"] - first_host_time < (
                10_000 if index == 2 else 30_000
            ):
                return fail("HOLD_QL450_MINIMUM_10_30_SECOND_HORIZON_INVALID")
            observer = verify450(
                "observer",
                read_observer(
                    request=request, horizon=horizon,
                    hostDigest=_digest(host),
                    previousObserverDigest=last_observer,
                ), pins,
            )
            if not (
                observer
                and observer.get("requestDigest") == req_digest
                and observer.get("originalIncidentId") == incident
                and observer.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
                and observer.get("reviewId") == review_id
                and observer.get("challengeNonce") == nonce
                and observer.get("anchorDigest") == _digest(anchor)
                and observer.get("horizon") == horizon
                and observer.get("signedHostDigest") == _digest(host)
                and observer.get("previousObserverDigest") == last_observer
                and observer.get("receiverState") in ("ON", "OFF")
                and type(observer.get("isolationConfirmed")) is bool
                and type(observer.get("sequence")) is int
                and observer["sequence"] > host["sequence"]
                and type(observer.get("observedAtMs")) is int
                and host["observedAtMs"] <= observer["observedAtMs"] <= now_ms
                and now_ms - observer["observedAtMs"] <= 60_000
            ):
                return fail("HOLD_QL450_INDEPENDENT_RECEIVER_HORIZON_INVALID")
            observations.append((host, observer))
            last_host = _digest(host)
            last_observer = _digest(observer)
            last_sequence = observer["sequence"]
            last_observed = observer["observedAtMs"]
        stable = all(
            h["receiverState"] == w["receiverState"] == "OFF"
            and h["isolationLock"] and h["leaseRevoked"]
            and h["watchdogArmed"] and w["isolationConfirmed"]
            for h, w in observations
        )
        classification = CLASS_STABLE if stable else CLASS_EXCEPTION
        decision = DECISION_STABLE if stable else DECISION_EXCEPTION
        stability_digest = _digest({
            "prior": prior_digest, "source": _digest(source),
            "anchor": _digest(anchor),
            "hostDigests": [_digest(h) for h, _ in observations],
            "observerDigests": [_digest(w) for _, w in observations],
            "classification": classification, "reviewId": review_id,
        })
        boundary = verify450(
            "closureAuthority",
            read_closure_authority(
                request=request, stabilityDigest=stability_digest,
                classification=classification,
            ), pins,
        )
        if not (
            boundary
            and boundary.get("requestDigest") == req_digest
            and boundary.get("originalIncidentId") == incident
            and boundary.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
            and boundary.get("reviewId") == review_id
            and boundary.get("challengeNonce") == nonce
            and boundary.get("stabilityEvidenceDigest") == stability_digest
            and boundary.get("classification") == classification
            and boundary.get("boundaryDecision") == BOUNDARY
            and boundary.get("closureAuthorized") is False
            and boundary.get("activationAuthorized") is False
            and boundary.get("physicalReceiverCurrentlyOff") is False
            and boundary.get("incidentStatus") == "OPEN_HOLD"
            and type(boundary.get("reviewedAtMs")) is int
            and last_observed <= boundary["reviewedAtMs"] <= now_ms
        ):
            return fail("HOLD_QL450_INDEPENDENT_CLOSURE_AUTHORITY_VETO", not stable)
        boundary_digest = _digest(boundary)
        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL450_THREE_DISTINCT_MASTER_VOTES_REQUIRED", not stable)
        reports = []
        for master in MASTERS:
            vote = verify450(master, master_reports[master], pins)
            if not (
                vote
                and vote.get("masterId") == master
                and vote.get("requestDigest") == req_digest
                and vote.get("originalIncidentId") == incident
                and vote.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
                and vote.get("reviewId") == review_id
                and vote.get("stabilityEvidenceDigest") == stability_digest
                and vote.get("closureBoundaryDigest") == boundary_digest
                and vote.get("classification") == classification
                and vote.get("recurrenceDecision") == decision
                and vote.get("incidentStatus") == "OPEN_HOLD"
                and type(vote.get("reviewedAtMs")) is int
                and boundary["reviewedAtMs"] <= vote["reviewedAtMs"] <= now_ms
            ):
                return fail("HOLD_QL450_THREE_MASTER_RECURRENCE_VETO", not stable)
            reports.append(vote)
        report_digest = _digest(reports)
        if not isinstance(dual_owners, dict) or set(dual_owners) != {
            "owner", "ownerReviewer"
        }:
            return fail("HOLD_QL450_DUAL_OWNER_VOTES_REQUIRED", not stable)
        owners = []
        for role, identity in zip(
            ("owner", "ownerReviewer"), link["ownerIds"], strict=True
        ):
            body = verify450(role, dual_owners[role], pins)
            if not (
                body
                and body.get("ownerId") == identity
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("ql449ReceiptDigest") == link["ql449ReceiptDigest"]
                and body.get("reviewId") == review_id
                and body.get("stabilityEvidenceDigest") == stability_digest
                and body.get("closureBoundaryDigest") == boundary_digest
                and body.get("threeMasterDigest") == report_digest
                and body.get("classification") == classification
                and body.get("recurrenceDecision") == decision
                and body.get("incidentStatus") == "OPEN_HOLD"
                and body.get("closureAuthorized") is False
                and type(body.get("reviewedAtMs")) is int
                and max(report["reviewedAtMs"] for report in reports)
                <= body["reviewedAtMs"] <= final_now_ms
            ):
                return fail("HOLD_QL450_DUAL_OWNER_CLOSURE_BOUNDARY_VETO", not stable)
            owners.append(body)
        if verify_prior_disposition341(monitor, **prior449) != verified:
            return fail("HOLD_QL450_ORIGINAL_QL449_CUSTODY_DRIFT", not stable)
        if journal.read(monitor, incident, "PENDING") != pending or any(
            journal.read(monitor, incident, stage) is not None
            for stage in ("STABLE", "EXCEPTION")
        ):
            return fail("HOLD_QL450_PENDING_OR_TERMINAL_CUSTODY_DRIFT", not stable)
        if (
            final_now_ms - source["observedAtMs"] > 60_000
            or final_now_ms - anchor["observedAtMs"] > 60_000
            or final_now_ms - observations[0][0]["observedAtMs"] > 60_000
            or final_now_ms - last_observed > 60_000
            or final_now_ms - boundary["reviewedAtMs"] > 60_000
        ):
            return fail("HOLD_QL450_FRESH_SIGNED_OBSERVATIONS_EXPIRED", not stable)
        evidence_digest = _digest({
            "prior": prior_digest, "request": req_digest,
            "source": source, "anchor": anchor,
            "hosts": [h for h, _ in observations],
            "observers": [w for _, w in observations],
            "boundary": boundary, "masters": reports, "owners": owners,
            "classification": classification, "recurrenceDecision": decision,
        })
        terminal = journal.claim(
            monitor, incident, "STABLE" if stable else "EXCEPTION",
            req_digest, evidence_digest,
        )
        if not terminal:
            return fail("HOLD_QL450_PRIVATE_TERMINAL_NOT_DURABLE", not stable)
        return {
            **hold341(STABLE if stable else EXCEPTION, not stable),
            "accepted": True, "originalIncidentId": incident,
            "reviewId": review_id, "classification": classification,
            "recurrenceDecision": decision,
            "independentStabilityReviewAdmitted": True,
            "masterCount": 3, "stabilityEvidenceDigest": stability_digest,
            "closureBoundaryDigest": boundary_digest,
            "threeMasterDigest": report_digest,
            "pendingReceiptDigest": pending["receiptDigest"],
            "finalReceiptDigest": terminal["receiptDigest"],
            "nextAction": (
                "SUPERVISED_FRESH_ORIGINAL_HOST_OFF_CEREMONY_REQUIRED"
                if stable else "SUPERVISED_RECURRENCE_EXCEPTION_CORRECTION_REQUIRED"
            ),
        }
    except (KeyError, TypeError, ValueError, OSError):
        return fail("HOLD_QL450_INVALID_OR_INCOMPLETE_SIGNED_EVIDENCE")


def read_private_stability341(
    monitor: Any, journal: ProtectedStabilityJournal341, incident: str
) -> dict[str, Any]:
    status = hold341("QL450_HISTORICAL_CUSTODY_NOT_CURRENT_RECEIVER_OFF")
    try:
        pending = journal.read(monitor, incident, "PENDING")
        stable = journal.read(monitor, incident, "STABLE")
        exception = journal.read(monitor, incident, "EXCEPTION")
        if stable and exception:
            status["state"] = "HOLD_QL450_CONFLICTING_TERMINALS"
            status["unresolvedException"] = True
        elif pending and stable and stable["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL450_HISTORICAL_SIGNED_STABILITY_INCIDENT_OPEN"
            status["historicalReceiptDigest"] = stable["receiptDigest"]
        elif pending and exception and exception["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL450_HISTORICAL_RECURRENCE_EXCEPTION_INCIDENT_OPEN"
            status["historicalReceiptDigest"] = exception["receiptDigest"]
            status["unresolvedException"] = True
        elif pending:
            status["state"] = "HOLD_QL450_INTERRUPTED_PENDING_NEEDS_SUPERVISED_RECOVERY"
    except (OSError, ValueError):
        status["state"] = "HOLD_QL450_PRIVATE_CUSTODY_UNREADABLE"
    return status
