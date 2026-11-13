"""Build 333 / QL-442: signed isolated shutdown evidence, never physical OFF control.

No actuators, no CONNECTED/activation endpoints, and no live-signature enrollment.
Valid synthetic evidence admits a *historical code-level* closure or an OPEN
expired-lease exception; neither proves the receiver is presently OFF.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_decision333 import (
    ProtectedWitnessJournal333,
    hold_decision333,
)
from rosevear_ai_hub.master_shell_prior333 import verify_prior_witness333

ACTION = "SIGNED_ISOLATED_RECEIVER_SHUTDOWN_OFF_ATTESTATION_ONLY_NO_CONNECT"
ON_TIME = "ON_TIME"
EXPIRED = "EXPIRED_EXCEPTION"
MASTER_ON_TIME = "SIGNED_OFF_CLOSEOUT_REVIEW"
MASTER_LATE = "SIGNED_LATE_OFF_KEEP_EXCEPTION_OPEN"
OWNER_ON_TIME = "CLOSE_ISOLATED_PILOT_EVIDENCE_ONLY_NO_ACTIVATION"
OWNER_LATE = "ACKNOWLEDGE_LEASE_EXCEPTION_KEEP_OPEN"
CLOSED = "DURABLE_QL442_SIGNED_SHUTDOWN_EVIDENCE_CLOSEOUT_HOLD"
EXCEPTION = "DURABLE_QL442_EXPIRED_LEASE_EXCEPTION_OPEN_HOLD"
ROLES = ("commsSource", "host", "receiver", "owner", "ownerReviewer", *MASTERS)


def verify442(
    role: str, envelope: Any, pins: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if role not in pins or not isinstance(envelope, dict):
        return None
    payload = envelope.get("payload")
    if not isinstance(payload, dict):
        return None
    schema = f"rosevear.ai-hub.ql442.{role}.v1"
    return payload if _native(envelope, set(payload), schema, *pins[role]) == payload else None


def review_signed_shutdown333(
    monitor: Any,
    prior441: dict[str, Any],
    request: dict[str, Any],
    journal: ProtectedWitnessJournal333,
    pins: dict[str, tuple[bytes, str]],
    *,
    read_comms_source: Any,
    read_host_shutdown: Any,
    read_independent_off: Any,
    master_reports: dict[str, Any],
    dual_owners: dict[str, Any],
    now_ms: int,
    final_now_ms: int,
) -> dict[str, Any]:
    """Original-host read-only signed closeout; never issues shutdown commands."""
    def fail(reason: str) -> dict[str, Any]:
        return hold_decision333(reason)

    if not (
        _on_ree(monitor)
        and isinstance(prior441, dict)
        and isinstance(request, dict)
        and isinstance(journal, ProtectedWitnessJournal333)
        and isinstance(pins, dict)
        and set(pins) == set(ROLES)
        and all(
            isinstance(key, tuple)
            and len(key) == 2
            and isinstance(key[0], bytes)
            and isinstance(key[1], str)
            and _public_ed25519(*key)
            for key in pins.values()
        )
        and len({key[0] for key in pins.values()}) == len(pins)
        and len({key[1] for key in pins.values()}) == len(pins)
        and type(now_ms) is int
        and type(final_now_ms) is int
        and 0 <= final_now_ms - now_ms <= 120_000
        and all(
            callable(fn)
            for fn in (read_comms_source, read_host_shutdown, read_independent_off)
        )
    ):
        return fail("HOLD_QL442_PROTECTED_HOST_SIGNERS_OR_CLOCK_INVALID")
    try:
        previous = verify_prior_witness333(monitor, **prior441)
    except (KeyError, TypeError, ValueError, OSError):
        previous = None
    if not previous:
        return fail("HOLD_QL442_EXACT_SIGNED_QL431_TO_441_CUSTODY_REQUIRED")
    prior_digest, link = previous
    incident = link["incident"]
    req_digest = _digest(request)
    nonce = request.get("shutdownNonce")
    if not (
        request.get("action") == ACTION
        and request.get("originalIncidentId") == incident
        and request.get("challengeId") == link["challengeId"]
        and request.get("leaseId") == link["leaseId"]
        and request.get("leaseExpiresAtMs") == link["leaseExpiresAtMs"]
        and request.get("ql441DecisionReceiptDigest") == link["decisionReceiptDigest"]
        and request.get("independentOnDigest") == link["independentOnDigest"]
        and isinstance(nonce, str)
        and len(nonce) >= 12
        and len({nonce, link["challengeId"], link["leaseId"]}) == 3
        and final_now_ms >= link["independentOnAtMs"]
    ):
        return fail("HOLD_QL442_EXACT_QL441_LEASE_AND_SHUTDOWN_NONCE_REQUIRED")
    pending = journal.claim(monitor, incident, "PENDING", req_digest, prior_digest)
    if not pending:
        return fail("HOLD_QL442_ONE_USE_PENDING_UNDURABLE_OR_REPLAY")
    try:
        source_envelope = read_comms_source(
            request=request, priorDigest=prior_digest, pendingDigest=pending["receiptDigest"]
        )
        source = verify442("commsSource", source_envelope, pins)
        if not (
            source
            and source.get("requestDigest") == req_digest
            and source.get("priorQl441Digest") == prior_digest
            and source.get("originalIncidentId") == incident
            and source.get("ql441DecisionReceiptDigest") == link["decisionReceiptDigest"]
            and source.get("assertedState")
            == "QL441_SIGNED_DECISION_EXISTS_NO_CURRENT_RECEIVER_ASSUMPTION"
            and type(source.get("observedAtMs")) is int
            and link["independentOnAtMs"] <= source["observedAtMs"] <= now_ms
            and now_ms - source["observedAtMs"] <= 120_000
        ):
            return fail("HOLD_QL442_ORIGINAL_COMMS_SOURCE_PROOF_INVALID")

        host_envelope = read_host_shutdown(
            request=request, commsSourceDigest=_digest(source)
        )
        host = verify442("host", host_envelope, pins)
        if not (
            host
            and host.get("requestDigest") == req_digest
            and host.get("commsSourceDigest") == _digest(source)
            and host.get("hostMachineId") == "DESKTOP-AE894KC"
            and host.get("originalIncidentId") == incident
            and host.get("challengeId") == link["challengeId"]
            and host.get("leaseId") == link["leaseId"]
            and host.get("shutdownNonce") == nonce
            and host.get("ql441DecisionReceiptDigest") == link["decisionReceiptDigest"]
            and host.get("priorIndependentOnDigest") == link["independentOnDigest"]
            and host.get("watchdogArmed") is True
            and host.get("receiverState") == "OFF"
            and type(host.get("shutdownSequence")) is int
            and host["shutdownSequence"] >= link["independentOnSequence"]
            and type(host.get("shutdownAtMs")) is int
            and link["independentOnAtMs"] <= host["shutdownAtMs"] <= now_ms
            and now_ms - host["shutdownAtMs"] <= 120_000
        ):
            return fail("HOLD_QL442_ORIGINAL_HOST_SIGNED_OFF_INVALID")
        off_envelope = read_independent_off(
            request=request, signedHostDigest=_digest(host)
        )
        off = verify442("receiver", off_envelope, pins)
        if not (
            off
            and off.get("requestDigest") == req_digest
            and off.get("originalIncidentId") == incident
            and off.get("challengeId") == link["challengeId"]
            and off.get("leaseId") == link["leaseId"]
            and off.get("shutdownNonce") == nonce
            and off.get("signedHostShutdownDigest") == _digest(host)
            and off.get("receiverState") == "OFF"
            and type(off.get("offSequence")) is int
            and off["offSequence"] >= host["shutdownSequence"]
            and type(off.get("observedAtMs")) is int
            and host["shutdownAtMs"] <= off["observedAtMs"] <= now_ms
            and now_ms - off["observedAtMs"] <= 120_000
        ):
            return fail("HOLD_QL442_INDEPENDENT_PINNED_OFF_OR_SEQUENCE_INVALID")
        expired = (
            host["shutdownAtMs"] > link["leaseExpiresAtMs"]
            or off["observedAtMs"] > link["leaseExpiresAtMs"]
        )
        classification = EXPIRED if expired else ON_TIME
        expected_master = MASTER_LATE if expired else MASTER_ON_TIME
        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL442_THREE_DISTINCT_MASTER_REVIEWS_REQUIRED")
        reports = []
        for master in MASTERS:
            body = verify442(master, master_reports[master], pins)
            if not (
                body
                and body.get("masterId") == master
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("hostShutdownDigest") == _digest(host)
                and body.get("independentOffDigest") == _digest(off)
                and body.get("leaseDisposition") == classification
                and body.get("decision") == expected_master
                and type(body.get("reviewedAtMs")) is int
                and off["observedAtMs"] <= body["reviewedAtMs"] <= now_ms
            ):
                return fail("HOLD_QL442_THREE_MASTER_SIGNED_CLOSEOUT_INVALID")
            reports.append(body)
        masters_digest = _digest(reports)
        expected_owner = OWNER_LATE if expired else OWNER_ON_TIME
        if not isinstance(dual_owners, dict) or set(dual_owners) != {
            "owner", "ownerReviewer"
        }:
            return fail("HOLD_QL442_DUAL_SIGNED_OWNER_REVIEW_REQUIRED")
        owners = []
        for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
            body = verify442(role, dual_owners[role], pins)
            if not (
                body
                and body.get("ownerId") == owner_id
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("independentOffDigest") == _digest(off)
                and body.get("masterReportsDigest") == masters_digest
                and body.get("decision") == expected_owner
                and type(body.get("reviewedAtMs")) is int
                and max(r["reviewedAtMs"] for r in reports)
                <= body["reviewedAtMs"] <= final_now_ms
            ):
                return fail("HOLD_QL442_TWO_OWNER_CLOSEOUT_SIGNATURES_INVALID")
            owners.append(body)
        refreshed = verify_prior_witness333(monitor, **prior441)
        if not refreshed or refreshed[0] != prior_digest:
            return fail("HOLD_QL442_PRIOR_SIGNED_CUSTODY_DRIFT")
        if journal.read(monitor, incident, "PENDING") != pending:
            return fail("HOLD_QL442_PRIVATE_PENDING_DRIFT")
        evidence = _digest({
            "prior": prior_digest, "commsSource": source, "host": host,
            "independentOff": off, "masters": reports, "owners": owners,
            "disposition": classification,
        })
        final_stage = "EXCEPTION" if expired else "CLOSED"
        final_receipt = journal.claim(monitor, incident, final_stage, req_digest, evidence)
        if not final_receipt:
            return fail("HOLD_QL442_FINAL_ONE_USE_CUSTODY_INVALID")
        result = {
            **hold_decision333(EXCEPTION if expired else CLOSED),
            "accepted": True, "state": EXCEPTION if expired else CLOSED,
            "originalIncidentId": incident,
            "leaseDisposition": classification,
            "leaseExceptionOpen": expired,
            "incidentClosed": False,  # Historical evidence cannot close a physical pilot.
            "shutdownEvidenceAccepted": True,
            "masterCount": 3,
            "priorIndependentOnDigest": link["independentOnDigest"],
            "hostShutdownDigest": _digest(host),
            "independentOffDigest": _digest(off),
            "mastersDigest": masters_digest,
            "pendingReceiptDigest": pending["receiptDigest"],
            "finalReceiptDigest": final_receipt["receiptDigest"],
            "nextAction": "FRESH_INDEPENDENT_OFF_AND_PROTECTED_CUSTODY_REVIEW_REQUIRED",
        }
        return result
    except (KeyError, TypeError, ValueError, OSError):
        return fail("HOLD_QL442_INCOMPLETE_OR_MALFORMED_SIGNED_SHUTDOWN")
