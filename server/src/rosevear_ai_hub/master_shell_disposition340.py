"""Build 340 / QL-449 anchored corrective disposition (historical, fail closed).

No receiver actuator, authority escalation, incident closure or current OFF claim.
"""

from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_decision333 import ProtectedWitnessJournal333, hold_decision333
from rosevear_ai_hub.master_shell_prior340 import verify_prior_remediation340

ACTION = "QL449_SIGNED_ANCHORED_ORIGINAL_HOST_OFF_DISPOSITION"
REVIEW = "DURABLE_QL449_HISTORICAL_ANCHORED_OFF_REVIEW_INCIDENT_OPEN"
EXCEPTION = "DURABLE_QL449_OFF_REATTESTATION_EXCEPTION_INCIDENT_OPEN"
CLASS_REVIEW = "SIGNED_ANCHORED_HISTORICAL_OFF_REVIEW_ONLY"
CLASS_EXCEPTION = "SIGNED_OFF_REATTESTATION_EXCEPTION_INCIDENT_OPEN"
ANCHOR_DISPOSITION = "INDEPENDENT_ANCHOR_HISTORICAL_REVIEW_ONLY"
DECISION_REVIEW = "REVIEW_ANCHORED_HISTORICAL_OFF_KEEP_INCIDENT_OPEN_HOLD"
DECISION_EXCEPTION = "ESCALATE_REATTESTATION_EXCEPTION_KEEP_INCIDENT_OPEN_HOLD"
ROLES = (
    "commsSource",
    "externalAnchor",
    "host",
    "observer",
    "owner",
    "ownerReviewer",
    *MASTERS,
)


class ProtectedDispositionJournal340(ProtectedWitnessJournal333):
    """Exclusive, fsynced, 0700 PENDING -> REVIEW/EXCEPTION; no silent replay."""

    def __init__(self, directory: Path):
        super().__init__(directory)
        self.stages = ("PENDING", "REVIEW", "EXCEPTION")
        self.terminal_stages = ("REVIEW", "EXCEPTION")


def verify449(
    role: str, envelope: Any, pins: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if role not in pins or not isinstance(envelope, dict):
        return None
    payload = envelope.get("payload")
    if not isinstance(payload, dict):
        return None
    schema = f"rosevear.ai-hub.ql449.{role}.v1"
    return payload if _native(envelope, set(payload), schema, *pins[role]) == payload else None


def hold340(reason: str, exception: bool = False) -> dict[str, Any]:
    return {
        **hold_decision333(reason),
        "sourceBuild": 340,
        "state": reason,
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "incidentStatus": "OPEN",
        "incidentClosed": False,
        "historicalEvidenceOnly": True,
        "freshPhysicalOffProven": False,
        "independentAnchoredReviewAdmitted": False,
        "unresolvedException": exception,
    }


def review_disposition340(
    monitor: Any,
    prior448: dict[str, Any],
    request: dict[str, Any],
    journal: ProtectedDispositionJournal340,
    pins: dict[str, tuple[bytes, str]],
    *,
    read_comms_source: Any,
    read_external_anchor: Any,
    read_host: Any,
    read_observer: Any,
    master_reports: dict[str, Any],
    dual_owners: dict[str, Any],
    now_ms: int,
    final_now_ms: int,
) -> dict[str, Any]:
    """Verify original external signatures and protected source; never operate host."""

    def fail(reason: str, exception: bool = False) -> dict[str, Any]:
        return hold340(reason, exception)

    if not (
        _on_ree(monitor)
        and isinstance(prior448, dict)
        and isinstance(request, dict)
        and isinstance(journal, ProtectedDispositionJournal340)
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
        and callable(read_comms_source)
        and callable(read_external_anchor)
        and callable(read_host)
        and callable(read_observer)
        and type(now_ms) is int
        and type(final_now_ms) is int
        and 0 <= final_now_ms - now_ms <= 60_000
    ):
        return fail("HOLD_QL449_ORIGINAL_HOST_SESSION_PINS_OR_CLOCK_UNTRUSTED")
    try:
        verified = verify_prior_remediation340(monitor, **prior448)
        if verified is None:
            return fail("HOLD_QL449_EXACT_SIGNED_QL448_CORRECTION_REQUIRED")
        prior_digest, link = verified
        incident = link["incident"]
        ceremony, nonce = request.get("ceremonyId"), request.get("challengeNonce")
        req_digest = _digest(request)
        if not (
            request.get("action") == ACTION
            and request.get("originalIncidentId") == incident
            and request.get("priorQl448Digest") == prior_digest
            and request.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
            and request.get("ql448HorizonDigest") == link["ql448HorizonDigest"]
            and request.get("ql448RemediationId") == link["ql448RemediationId"]
            and request.get("previousObserverDigest") == link["previousObserverDigest"]
            and isinstance(ceremony, str)
            and len(ceremony) >= 12
            and isinstance(nonce, str)
            and len(nonce) >= 12
            and len({ceremony, nonce, link["ql448Nonce"], link["ql448RemediationId"]}) == 4
            and now_ms > link["previousObservedAtMs"]
        ):
            return fail("HOLD_QL449_NONREPLAYABLE_SCOPED_CEREMONY_REQUIRED")
        pending = journal.claim(monitor, incident, "PENDING", req_digest, prior_digest)
        if not pending:
            return fail("HOLD_QL449_PRIVATE_PENDING_CONSUMED_OR_UNDURABLE")
        source = verify449(
            "commsSource",
            read_comms_source(request=request, pendingDigest=pending["receiptDigest"]),
            pins,
        )
        if not (
            source
            and source.get("requestDigest") == req_digest
            and source.get("originalIncidentId") == incident
            and source.get("priorQl448Digest") == prior_digest
            and source.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
            and source.get("ql448HorizonDigest") == link["ql448HorizonDigest"]
            and source.get("incidentStatus") == "OPEN_HOLD"
            and type(source.get("observedAtMs")) is int
            and link["previousObservedAtMs"] < source["observedAtMs"] <= now_ms
            and now_ms - source["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL449_ORIGINAL_COMMS_SIGNED_OPEN_CUSTODY_INVALID")
        anchor = verify449(
            "externalAnchor",
            read_external_anchor(request=request, sourceDigest=_digest(source)),
            pins,
        )
        if not (
            anchor
            and anchor.get("requestDigest") == req_digest
            and anchor.get("originalIncidentId") == incident
            and anchor.get("priorQl448Digest") == prior_digest
            and anchor.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
            and anchor.get("ql448HorizonDigest") == link["ql448HorizonDigest"]
            and anchor.get("sourceDigest") == _digest(source)
            and anchor.get("ceremonyId") == ceremony
            and anchor.get("challengeNonce") == nonce
            and isinstance(anchor.get("anchorId"), str)
            and len(anchor["anchorId"]) >= 12
            and len({anchor["anchorId"], ceremony, nonce}) == 3
            and anchor.get("disposition") == ANCHOR_DISPOSITION
            and type(anchor.get("sequence")) is int
            and anchor["sequence"] > link["previousSequence"]
            and type(anchor.get("observedAtMs")) is int
            and source["observedAtMs"] < anchor["observedAtMs"] <= now_ms
            and now_ms - anchor["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL449_INDEPENDENT_EXTERNAL_ANCHOR_INVALID")
        host = verify449(
            "host",
            read_host(request=request, anchorDigest=_digest(anchor)),
            pins,
        )
        if not (
            host
            and host.get("requestDigest") == req_digest
            and host.get("originalIncidentId") == incident
            and host.get("hostMachineId") == "DESKTOP-AE894KC"
            and host.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
            and host.get("ceremonyId") == ceremony
            and host.get("challengeNonce") == nonce
            and host.get("anchorDigest") == _digest(anchor)
            and host.get("previousObserverDigest") == link["previousObserverDigest"]
            and host.get("receiverState") in ("OFF", "ON")
            and type(host.get("isolationLock")) is bool
            and type(host.get("leaseRevoked")) is bool
            and type(host.get("watchdogArmed")) is bool
            and type(host.get("sequence")) is int
            and host["sequence"] > anchor["sequence"]
            and type(host.get("observedAtMs")) is int
            and anchor["observedAtMs"] < host["observedAtMs"] <= now_ms
            and now_ms - host["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL449_FRESH_ORIGINAL_HOST_SIGNATURE_INVALID")
        witness = verify449(
            "observer",
            read_observer(request=request, hostDigest=_digest(host)),
            pins,
        )
        if not (
            witness
            and witness.get("requestDigest") == req_digest
            and witness.get("originalIncidentId") == incident
            and witness.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
            and witness.get("ceremonyId") == ceremony
            and witness.get("challengeNonce") == nonce
            and witness.get("anchorDigest") == _digest(anchor)
            and witness.get("signedHostDigest") == _digest(host)
            and witness.get("receiverState") in ("OFF", "ON")
            and type(witness.get("isolationConfirmed")) is bool
            and type(witness.get("sequence")) is int
            and witness["sequence"] > host["sequence"]
            and type(witness.get("observedAtMs")) is int
            and host["observedAtMs"] <= witness["observedAtMs"] <= now_ms
            and now_ms - witness["observedAtMs"] <= 60_000
        ):
            return fail("HOLD_QL449_INDEPENDENT_RECEIVER_READBACK_INVALID")
        historically_off = (
            host["receiverState"] == witness["receiverState"] == "OFF"
            and host["isolationLock"]
            and host["leaseRevoked"]
            and host["watchdogArmed"]
            and witness["isolationConfirmed"]
        )
        classification = CLASS_REVIEW if historically_off else CLASS_EXCEPTION
        decision = DECISION_REVIEW if historically_off else DECISION_EXCEPTION
        evidence_digest = _digest(
            {
                "prior": prior_digest,
                "source": _digest(source),
                "anchor": _digest(anchor),
                "host": _digest(host),
                "observer": _digest(witness),
                "classification": classification,
                "ceremonyId": ceremony,
            }
        )
        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL449_THREE_DISTINCT_MASTER_VOTES_REQUIRED", not historically_off)
        reports = []
        for master in MASTERS:
            vote = verify449(master, master_reports[master], pins)
            if not (
                vote
                and vote.get("masterId") == master
                and vote.get("requestDigest") == req_digest
                and vote.get("originalIncidentId") == incident
                and vote.get("ceremonyId") == ceremony
                and vote.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
                and vote.get("anchoredEvidenceDigest") == evidence_digest
                and vote.get("classification") == classification
                and vote.get("disposition") == decision
                and vote.get("incidentStatus") == "OPEN_HOLD"
                and type(vote.get("reviewedAtMs")) is int
                and witness["observedAtMs"] <= vote["reviewedAtMs"] <= now_ms
            ):
                return fail("HOLD_QL449_THREE_MASTER_DISPOSITION_VETO", not historically_off)
            reports.append(vote)
        reports_digest = _digest(reports)
        if not isinstance(dual_owners, dict) or set(dual_owners) != {"owner", "ownerReviewer"}:
            return fail("HOLD_QL449_TWO_INDEPENDENT_OWNER_VOTES_REQUIRED", not historically_off)
        owners = []
        for role, identity in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
            body = verify449(role, dual_owners[role], pins)
            if not (
                body
                and body.get("ownerId") == identity
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("ceremonyId") == ceremony
                and body.get("ql448ReceiptDigest") == link["ql448ReceiptDigest"]
                and body.get("anchoredEvidenceDigest") == evidence_digest
                and body.get("threeMasterDigest") == reports_digest
                and body.get("classification") == classification
                and body.get("disposition") == decision
                and body.get("incidentStatus") == "OPEN_HOLD"
                and type(body.get("reviewedAtMs")) is int
                and max(report["reviewedAtMs"] for report in reports)
                <= body["reviewedAtMs"]
                <= final_now_ms
            ):
                return fail("HOLD_QL449_DUAL_OWNER_REVIEW_VETO", not historically_off)
            owners.append(body)
        if verify_prior_remediation340(monitor, **prior448) != verified:
            return fail("HOLD_QL449_ORIGINAL_QL448_PROTECTED_CUSTODY_DRIFT", not historically_off)
        if journal.read(monitor, incident, "PENDING") != pending or any(
            journal.read(monitor, incident, stage) is not None for stage in ("REVIEW", "EXCEPTION")
        ):
            return fail("HOLD_QL449_PENDING_OR_CONFLICTING_TERMINAL", not historically_off)
        if (
            final_now_ms - source["observedAtMs"] > 60_000
            or final_now_ms - anchor["observedAtMs"] > 60_000
            or final_now_ms - host["observedAtMs"] > 60_000
            or final_now_ms - witness["observedAtMs"] > 60_000
        ):
            return fail("HOLD_QL449_ORIGINAL_SIGNED_EVIDENCE_EXPIRED", not historically_off)
        signed_evidence = _digest(
            {
                "prior": prior_digest,
                "request": req_digest,
                "source": source,
                "anchor": anchor,
                "host": host,
                "observer": witness,
                "masters": reports,
                "owners": owners,
                "classification": classification,
                "disposition": decision,
            }
        )
        terminal = journal.claim(
            monitor,
            incident,
            "REVIEW" if historically_off else "EXCEPTION",
            req_digest,
            signed_evidence,
        )
        if not terminal:
            return fail("HOLD_QL449_PRIVATE_TERMINAL_NOT_DURABLE", not historically_off)
        return {
            **hold340(REVIEW if historically_off else EXCEPTION, not historically_off),
            "accepted": True,
            "originalIncidentId": incident,
            "ceremonyId": ceremony,
            "classification": classification,
            "disposition": decision,
            "independentAnchoredReviewAdmitted": True,
            "masterCount": 3,
            "anchoredEvidenceDigest": evidence_digest,
            "threeMasterDigest": reports_digest,
            "pendingReceiptDigest": pending["receiptDigest"],
            "finalReceiptDigest": terminal["receiptDigest"],
            "nextAction": (
                "OWNER_GATED_INCIDENT_REVIEW_FRESH_OFF_STILL_REQUIRED"
                if historically_off
                else "SIGNED_OFF_REATTESTATION_EXCEPTION_OPEN"
            ),
        }
    except (KeyError, TypeError, ValueError, OSError):
        return fail("HOLD_QL449_UNTRUSTED_OR_INCOMPLETE_SIGNED_CUSTODY")


def read_private_disposition340(
    monitor: Any, journal: ProtectedDispositionJournal340, incident: str
) -> dict[str, Any]:
    status = hold340("QL449_PRIVATE_HISTORICAL_EVIDENCE_NOT_LIVE_RECEIVER_STATE")
    try:
        pending = journal.read(monitor, incident, "PENDING")
        reviewed = journal.read(monitor, incident, "REVIEW")
        exception = journal.read(monitor, incident, "EXCEPTION")
        if reviewed and exception:
            status["state"] = "HOLD_QL449_CONFLICTING_PROTECTED_TERMINALS"
            status["unresolvedException"] = True
        elif pending and reviewed and reviewed["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL449_HISTORICAL_ANCHORED_REVIEW_INCIDENT_STILL_OPEN"
            status["historicalReceiptDigest"] = reviewed["receiptDigest"]
        elif pending and exception and exception["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL449_SIGNED_REATTESTATION_EXCEPTION_STILL_OPEN"
            status["historicalReceiptDigest"] = exception["receiptDigest"]
            status["unresolvedException"] = True
        elif pending:
            status["state"] = "HOLD_QL449_INTERRUPTED_PENDING_REQUIRES_SUPERVISED_RECOVERY"
    except (OSError, ValueError):
        status["state"] = "HOLD_QL449_PRIVATE_CUSTODY_UNREADABLE"
    return status
