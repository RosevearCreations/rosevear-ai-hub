"""Build 336 / QL-445 signed post-closure OFF stability and ON recurrence audit.

Historical evidence-only analysis. Does not command or attest live hardware.
"""

from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_decision333 import (
    ProtectedWitnessJournal333,
    hold_decision333,
)
from rosevear_ai_hub.master_shell_prior336 import verify_prior_continuity336

ACTION = "QL445_SIGNED_POSTCLOSURE_OFF_STABILITY_OR_ON_RECURRENCE_EVIDENCE"
STABLE = "DURABLE_QL445_POSTCLOSURE_OFF_STABILITY_EVIDENCE_ADMITTED"
RECURRENCE = "DURABLE_QL445_SIGNED_ON_RECURRENCE_INCIDENT_OPEN"
CLASS_STABLE = "RECONCILED_HISTORICAL_OFF_STABILITY_ONLY"
CLASS_RECURRENCE = "SIGNED_ON_RECURRENCE_REOPEN"
MASTER_STABLE = "ACCEPT_OFF_STABILITY_EVIDENCE_ONLY_NO_CONNECT"
MASTER_RECURRENCE = "REOPEN_POSTCLOSURE_RECEIVER_INCIDENT_KEEP_HOLD"
OWNER_STABLE = "ACKNOWLEDGE_HISTORICAL_OFF_STABILITY_KEEP_HOLD"
OWNER_RECURRENCE = "ACKNOWLEDGE_SIGNED_ON_RECURRENCE_REOPEN_KEEP_HOLD"
ROLES = (
    "commsSource",
    "host",
    "observerOne",
    "observerTwo",
    "owner",
    "ownerReviewer",
    *MASTERS,
)


class ProtectedStabilityJournal336(ProtectedWitnessJournal333):
    """One-use private PENDING -> exactly one STABLE or RECURRENCE record."""

    def __init__(self, directory: Path):
        super().__init__(directory)
        self.stages = ("PENDING", "STABLE", "RECURRENCE")
        self.terminal_stages = ("STABLE", "RECURRENCE")


def verify445(
    role: str, envelope: Any, pins: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if role not in pins or not isinstance(envelope, dict):
        return None
    payload = envelope.get("payload")
    if not isinstance(payload, dict):
        return None
    schema = f"rosevear.ai-hub.ql445.{role}.v1"
    return payload if _native(envelope, set(payload), schema, *pins[role]) == payload else None


def hold336(reason: str, suspected: bool = False) -> dict[str, Any]:
    return {
        **hold_decision333(reason),
        "sourceBuild": 336,
        "state": reason,
        "historicalEvidenceOnly": True,
        "incidentClosed": False,
        "incidentEvidenceClosed": False,
        "freshPhysicalOffProven": False,
        "recurrenceSuspected": suspected,
        "signedOnRecurrenceAccepted": False,
    }


def review_stability336(
    monitor: Any,
    prior444: dict[str, Any],
    request: dict[str, Any],
    journal: ProtectedStabilityJournal336,
    pins: dict[str, tuple[bytes, str]],
    *,
    read_comms_source: Any,
    read_host_one: Any,
    read_observer_one: Any,
    read_host_two: Any,
    read_observer_two: Any,
    master_reports: dict[str, Any],
    dual_owners: dict[str, Any],
    now_ms: int,
    final_now_ms: int,
) -> dict[str, Any]:
    """Verify original signed source, two host and two independent observations."""

    def fail(reason: str, suspected: bool = False) -> dict[str, Any]:
        return hold336(reason, suspected)

    if not (
        _on_ree(monitor)
        and isinstance(prior444, dict)
        and isinstance(request, dict)
        and isinstance(journal, ProtectedStabilityJournal336)
        and isinstance(pins, dict)
        and set(pins) == set(ROLES)
        and all(
            isinstance(v, tuple)
            and len(v) == 2
            and isinstance(v[0], bytes)
            and isinstance(v[1], str)
            and _public_ed25519(*v)
            for v in pins.values()
        )
        and len({v[0] for v in pins.values()}) == len(ROLES)
        and len({v[1] for v in pins.values()}) == len(ROLES)
        and type(now_ms) is int
        and type(final_now_ms) is int
        and 0 <= final_now_ms - now_ms <= 120_000
        and all(
            callable(fn)
            for fn in (
                read_comms_source,
                read_host_one,
                read_observer_one,
                read_host_two,
                read_observer_two,
            )
        )
    ):
        return fail("HOLD_QL445_ORIGINAL_HOST_PINS_OR_CLOCK_INVALID")
    try:
        prior = verify_prior_continuity336(monitor, **prior444)
        if not prior:
            return fail("HOLD_QL445_PROTECTED_QL431_TO_444_ANCESTRY_INVALID")
        prior_digest, link = prior
        incident = link["incident"]
        req_digest = _digest(request)
        nonce, watch = request.get("watchNonce"), request.get("watchId")
        if not (
            request.get("action") == ACTION
            and request.get("originalIncidentId") == incident
            and request.get("challengeId") == link["challengeId"]
            and request.get("leaseId") == link["leaseId"]
            and request.get("priorQl444Digest") == prior_digest
            and request.get("ql444ClosureReceiptDigest") == link["ql444ClosureReceiptDigest"]
            and request.get("ql444RemediationReceiptDigest")
            == link["ql444RemediationReceiptDigest"]
            and request.get("previousIndependentOffDigest") == link["previousOffDigest"]
            and isinstance(nonce, str)
            and len(nonce) >= 12
            and isinstance(watch, str)
            and len(watch) >= 12
            and len({nonce, watch, link["previousNonce"], link["previousWatchId"]}) == 4
            and now_ms > link["previousOffAtMs"]
        ):
            return fail("HOLD_QL445_FRESH_WATCH_AND_EXACT_CLOSURE_BINDING_REQUIRED")
        pending = journal.claim(monitor, incident, "PENDING", req_digest, prior_digest)
        if not pending:
            return fail("HOLD_QL445_ONE_USE_PENDING_REPLAY_OR_UNDURABLE")
        source = verify445(
            "commsSource",
            read_comms_source(request=request, pendingDigest=pending["receiptDigest"]),
            pins,
        )
        if not (
            source
            and source.get("requestDigest") == req_digest
            and source.get("originalIncidentId") == incident
            and source.get("priorQl444Digest") == prior_digest
            and source.get("ql444ClosureReceiptDigest") == link["ql444ClosureReceiptDigest"]
            and source.get("previousIndependentOffDigest") == link["previousOffDigest"]
            and source.get("assertedState") == "HISTORICAL_QL444_CLOSURE_ONLY_HOLD"
            and type(source.get("observedAtMs")) is int
            and link["previousOffAtMs"] <= source["observedAtMs"] <= now_ms
            and now_ms - source["observedAtMs"] <= 120_000
        ):
            return fail("HOLD_QL445_SIGNED_ORIGINAL_COMMS_SOURCE_INVALID")
        observed = []
        prior_sequence = link["previousOffSequence"]
        prior_time = link["previousOffAtMs"]
        prior_observer_digest = link["previousOffDigest"]
        prior_host_digest = None
        for index, (read_host, read_observer, role) in enumerate(
            (
                (read_host_one, read_observer_one, "observerOne"),
                (read_host_two, read_observer_two, "observerTwo"),
            ),
            start=1,
        ):
            host = verify445(
                "host",
                read_host(
                    request=request,
                    sourceDigest=_digest(source),
                    previousObserverDigest=prior_observer_digest,
                    sampleIndex=index,
                ),
                pins,
            )
            if not (
                host
                and host.get("requestDigest") == req_digest
                and host.get("sourceDigest") == _digest(source)
                and host.get("hostMachineId") == "DESKTOP-AE894KC"
                and host.get("originalIncidentId") == incident
                and host.get("challengeId") == link["challengeId"]
                and host.get("leaseId") == link["leaseId"]
                and host.get("watchNonce") == nonce
                and host.get("watchId") == watch
                and host.get("sampleIndex") == index
                and host.get("previousObserverDigest") == prior_observer_digest
                and host.get("previousHostDigest") == prior_host_digest
                and host.get("watchdogArmed") is True
                and host.get("receiverState") in ("ON", "OFF")
                and type(host.get("sequence")) is int
                and host["sequence"] > prior_sequence
                and type(host.get("observedAtMs")) is int
                and host["observedAtMs"] > prior_time
                and host["observedAtMs"] <= now_ms
                and now_ms - host["observedAtMs"] <= 120_000
                and (index == 1 or host["observedAtMs"] - prior_time >= 1_000)
            ):
                return fail("HOLD_QL445_ORIGINAL_HOST_PROBE_INVALID")
            observer = verify445(
                role,
                read_observer(
                    request=request,
                    hostDigest=_digest(host),
                    previousObserverDigest=prior_observer_digest,
                    sampleIndex=index,
                ),
                pins,
            )
            if not (
                observer
                and observer.get("requestDigest") == req_digest
                and observer.get("originalIncidentId") == incident
                and observer.get("challengeId") == link["challengeId"]
                and observer.get("leaseId") == link["leaseId"]
                and observer.get("watchNonce") == nonce
                and observer.get("watchId") == watch
                and observer.get("sampleIndex") == index
                and observer.get("hostProbeDigest") == _digest(host)
                and observer.get("previousObserverDigest") == prior_observer_digest
                and observer.get("receiverState") in ("ON", "OFF")
                and type(observer.get("sequence")) is int
                and observer["sequence"] > host["sequence"]
                and type(observer.get("observedAtMs")) is int
                and host["observedAtMs"] <= observer["observedAtMs"] <= now_ms
                and now_ms - observer["observedAtMs"] <= 120_000
            ):
                return fail("HOLD_QL445_INDEPENDENT_OBSERVER_MISSING_STALE_OR_FORGED")
            if host["receiverState"] != observer["receiverState"]:
                return fail("HOLD_QL445_SIGNED_STATE_DIVERGENCE_RECURRENCE_RISK", True)
            observed.append((host, observer))
            prior_sequence = observer["sequence"]
            prior_time = observer["observedAtMs"]
            prior_observer_digest = _digest(observer)
            prior_host_digest = _digest(host)
        recurrence = any(host["receiverState"] == "ON" for host, _ in observed)
        classification = CLASS_RECURRENCE if recurrence else CLASS_STABLE
        master_decision = MASTER_RECURRENCE if recurrence else MASTER_STABLE
        owner_decision = OWNER_RECURRENCE if recurrence else OWNER_STABLE
        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL445_EXACT_THREE_MASTER_REVIEWS_REQUIRED")
        reports = []
        host_digests = [_digest(host) for host, _ in observed]
        observer_digests = [_digest(observer) for _, observer in observed]
        for master in MASTERS:
            body = verify445(master, master_reports[master], pins)
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
                and body.get("decision") == master_decision
                and type(body.get("reviewedAtMs")) is int
                and observed[1][1]["observedAtMs"] <= body["reviewedAtMs"] <= now_ms
            ):
                return fail("HOLD_QL445_THREE_MASTER_VETO_OR_CLASSIFICATION_DRIFT")
            reports.append(body)
        if not isinstance(dual_owners, dict) or set(dual_owners) != {"owner", "ownerReviewer"}:
            return fail("HOLD_QL445_TWO_ORIGINAL_OWNERS_REQUIRED")
        owners = []
        for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
            body = verify445(role, dual_owners[role], pins)
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
                and body.get("decision") == owner_decision
                and type(body.get("reviewedAtMs")) is int
                and max(report["reviewedAtMs"] for report in reports)
                <= body["reviewedAtMs"]
                <= final_now_ms
            ):
                return fail("HOLD_QL445_DUAL_OWNER_REVIEW_INVALID")
            owners.append(body)
        if verify_prior_continuity336(monitor, **prior444) != prior:
            return fail("HOLD_QL445_PROTECTED_QL444_ANCESTRY_DRIFT")
        if journal.read(monitor, incident, "PENDING") != pending:
            return fail("HOLD_QL445_PENDING_CUSTODY_CHANGED")
        if any(
            journal.read(monitor, incident, stage) is not None
            for stage in ("STABLE", "RECURRENCE")
        ):
            return fail("HOLD_QL445_TERMINAL_REPLAY")
        evidence = _digest(
            {
                "prior": prior_digest,
                "source": source,
                "hostProbes": [host for host, _ in observed],
                "independentObservations": [observer for _, observer in observed],
                "masters": reports,
                "owners": owners,
                "classification": classification,
            }
        )
        stage = "RECURRENCE" if recurrence else "STABLE"
        terminal = journal.claim(monitor, incident, stage, req_digest, evidence)
        if not terminal:
            return fail("HOLD_QL445_TERMINAL_NOT_DURABLE")
        return {
            **hold336(RECURRENCE if recurrence else STABLE, recurrence),
            "accepted": True,
            "state": RECURRENCE if recurrence else STABLE,
            "originalIncidentId": incident,
            "historicalEvidenceAdmitted": True,
            "classification": classification,
            "recurrenceSuspected": recurrence,
            "signedOnRecurrenceAccepted": recurrence,
            "incidentEvidenceClosed": not recurrence,
            "masterCount": 3,
            "ql444ClosureReceiptDigest": link["ql444ClosureReceiptDigest"],
            "hostProbeDigests": host_digests,
            "observerDigests": observer_digests,
            "threeMasterDigest": _digest(reports),
            "pendingReceiptDigest": pending["receiptDigest"],
            "finalReceiptDigest": terminal["receiptDigest"],
            "nextAction": "ORIGINAL_HOST_INDEPENDENT_LIVE_READBACK_REQUIRED",
        }
    except (KeyError, TypeError, ValueError, OSError):
        return fail("HOLD_QL445_MALFORMED_OR_TAMPERED_SIGNED_CUSTODY")


def read_private_stability336(
    monitor: Any, journal: ProtectedStabilityJournal336, incident: str
) -> dict[str, Any]:
    status = hold336("QL445_PRIVATE_HISTORICAL_CUSTODY_REQUIRES_FRESH_LIVE_OFF")
    try:
        pending = journal.read(monitor, incident, "PENDING")
        stable = journal.read(monitor, incident, "STABLE")
        recurrence = journal.read(monitor, incident, "RECURRENCE")
        if stable and recurrence:
            status["state"] = "HOLD_QL445_CONFLICTING_TERMINAL_CUSTODY"
            status["recurrenceSuspected"] = True
        elif pending and stable and stable["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL445_HISTORICAL_SIGNED_OFF_STABILITY_NOT_LIVE_OFF"
            status["historicalReceiptDigest"] = stable["receiptDigest"]
        elif pending and recurrence and recurrence["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL445_SIGNED_ON_RECURRENCE_OPEN_HOLD"
            status["historicalReceiptDigest"] = recurrence["receiptDigest"]
            status["recurrenceSuspected"] = True
        elif pending:
            status["state"] = "QL445_PENDING_NON_REPLAYABLE_HOLD"
    except (ValueError, OSError):
        status["state"] = "HOLD_QL445_PROTECTED_RECEIPT_UNREADABLE"
    return status
