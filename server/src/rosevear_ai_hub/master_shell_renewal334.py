"""Build 334 / QL-443: protected evidence admission and fresh OFF renewal.

No physical receiver actuator, connectivity enablement, or live signature
enrollment. Historical protected receipts are NEVER current physical OFF.
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
from rosevear_ai_hub.master_shell_prior334 import verify_prior_shutdown334
from rosevear_ai_hub.master_shell_shutdown333 import EXPIRED

ACTION = "PROTECTED_QL443_SHUTDOWN_CUSTODY_ADMISSION_AND_FRESH_OFF_ONLY"
ADMITTED = "DURABLE_QL443_SIGNED_SHUTDOWN_EVIDENCE_ADMITTED"
EXCEPTION = "DURABLE_QL443_EXPIRED_LEASE_EXCEPTION_HANDOFF_OPEN"
ROLES = ("commsSource", "aiPlatform", "independentOff", "owner", "ownerReviewer", *MASTERS)
MASTER_ADMIT = "ADMIT_SIGNED_SHUTDOWN_EVIDENCE_ONLY_NO_ACTIVATION"
MASTER_LATE = "KEEP_EXPIRED_LEASE_EXCEPTION_OPEN_NO_ACTIVATION"
OWNER_ADMIT = "ADMIT_SIGNED_SHUTDOWN_EVIDENCE_ONLY_NO_CONNECT"
OWNER_LATE = "ACKNOWLEDGE_EXPIRED_LEASE_EXCEPTION_KEEP_OPEN"


class ProtectedRenewalJournal334(ProtectedWitnessJournal333):
    """Separate absolute private one-use PENDING to ADMITTED or EXCEPTION."""

    def __init__(self, directory: Any):
        super().__init__(directory)
        self.stages = ("PENDING", "ADMITTED", "EXCEPTION")
        self.terminal_stages = ("ADMITTED", "EXCEPTION")


def verify443(
    role: str, envelope: Any, pins: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if role not in pins or not isinstance(envelope, dict):
        return None
    payload = envelope.get("payload")
    if not isinstance(payload, dict):
        return None
    schema = f"rosevear.ai-hub.ql443.{role}.v1"
    return payload if _native(envelope, set(payload), schema, *pins[role]) == payload else None


def hold334(reason: str) -> dict[str, Any]:
    return {
        **hold_decision333(reason),
        "state": reason,
        "sourceBuild": 334,
        "leaseDisposition": "UNVERIFIED",
        "custodyAccepted": False,
        "historicalEvidenceOnly": True,
        "incidentClosed": False,
        "freshPhysicalOffProven": False,
    }


def review_renewal334(
    monitor: Any,
    prior442: dict[str, Any],
    request: dict[str, Any],
    journal: ProtectedRenewalJournal334,
    pins: dict[str, tuple[bytes, str]],
    *,
    read_comms_source: Any,
    read_ai_platform: Any,
    read_fresh_independent_off: Any,
    master_reports: dict[str, Any],
    dual_owners: dict[str, Any],
    now_ms: int,
    final_now_ms: int,
) -> dict[str, Any]:
    """Read and admit independently signed sources, never turn hardware ON/OFF."""
    def fail(reason: str) -> dict[str, Any]:
        return hold334(reason)

    if not (
        _on_ree(monitor)
        and isinstance(prior442, dict)
        and isinstance(request, dict)
        and isinstance(journal, ProtectedRenewalJournal334)
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
        and len({pin[0] for pin in pins.values()}) == len(pins)
        and len({pin[1] for pin in pins.values()}) == len(pins)
        and type(now_ms) is int
        and type(final_now_ms) is int
        and 0 <= final_now_ms - now_ms <= 120_000
        and all(callable(fn) for fn in (
            read_comms_source, read_ai_platform, read_fresh_independent_off
        ))
    ):
        return fail("HOLD_QL443_PROTECTED_HOST_SIGNERS_OR_CLOCK_INVALID")
    try:
        previous = verify_prior_shutdown334(monitor, **prior442)
        if not previous:
            return fail("HOLD_QL443_EXACT_SIGNED_QL431_TO_442_ANCESTRY_REQUIRED")
        prior_digest, link = previous
        incident = link["incident"]
        req_digest = _digest(request)
        nonce = request.get("renewalNonce")
        if not (
            request.get("action") == ACTION
            and request.get("originalIncidentId") == incident
            and request.get("challengeId") == link["challengeId"]
            and request.get("leaseId") == link["leaseId"]
            and request.get("leaseExpiresAtMs") == link["leaseExpiresAtMs"]
            and request.get("ql442FinalReceiptDigest") == link["finalReceiptDigest"]
            and request.get("priorQl442Digest") == prior_digest
            and request.get("historicalIndependentOffDigest") == link["historicalOffDigest"]
            and isinstance(nonce, str)
            and len(nonce) >= 12
            and len(
                {nonce, link["originalShutdownNonce"], link["challengeId"], link["leaseId"]}
            ) == 4
            and now_ms >= link["historicalOffAtMs"]
        ):
            return fail("HOLD_QL443_EXACT_PRIOR_CUSTODY_AND_FRESH_NONCE_REQUIRED")
        pending = journal.claim(monitor, incident, "PENDING", req_digest, prior_digest)
        if not pending:
            return fail("HOLD_QL443_PROTECTED_PENDING_REPLAY_OR_UNDURABLE")
        source = verify443(
            "commsSource",
            read_comms_source(request=request, pendingDigest=pending["receiptDigest"]),
            pins,
        )
        if not (
            source
            and source.get("requestDigest") == req_digest
            and source.get("priorQl442Digest") == prior_digest
            and source.get("ql442FinalReceiptDigest") == link["finalReceiptDigest"]
            and source.get("historicalIndependentOffDigest") == link["historicalOffDigest"]
            and source.get("originalIncidentId") == incident
            and source.get("assertedState") == "QL442_SIGNED_SHUTDOWN_EVIDENCE_NOT_LIVE_OFF"
            and type(source.get("observedAtMs")) is int
            and link["historicalOffAtMs"] <= source["observedAtMs"] <= now_ms
            and now_ms - source["observedAtMs"] <= 120_000
        ):
            return fail("HOLD_QL443_ORIGINAL_SIGNED_COMMS_SOURCE_INVALID")
        platform = verify443(
            "aiPlatform",
            read_ai_platform(request=request, commsSourceDigest=_digest(source)),
            pins,
        )
        expected_platform = (
            "EXPIRED_LEASE_EXCEPTION_HANDOFF_REQUIRED"
            if link["leaseDisposition"] == EXPIRED
            else "SIGNED_OFF_PILOT_CLOSURE_READY_FOR_DURABLE_ADMISSION"
        )
        if not (
            platform
            and platform.get("requestDigest") == req_digest
            and platform.get("priorQl442Digest") == prior_digest
            and platform.get("ql442FinalReceiptDigest") == link["finalReceiptDigest"]
            and platform.get("commsSourceDigest") == _digest(source)
            and platform.get("historicalHostDigest") == link["historicalHostDigest"]
            and platform.get("historicalOffDigest") == link["historicalOffDigest"]
            and platform.get("leaseDisposition") == link["leaseDisposition"]
            and platform.get("classification") == expected_platform
            and type(platform.get("reviewedAtMs")) is int
            and source["observedAtMs"] <= platform["reviewedAtMs"] <= now_ms
        ):
            return fail("HOLD_QL443_INDEPENDENT_SIGNED_AI_PLATFORM_CLOSURE_INVALID")
        fresh = verify443(
            "independentOff",
            read_fresh_independent_off(request=request, aiPlatformDigest=_digest(platform)),
            pins,
        )
        if not (
            fresh
            and fresh.get("requestDigest") == req_digest
            and fresh.get("originalIncidentId") == incident
            and fresh.get("challengeId") == link["challengeId"]
            and fresh.get("leaseId") == link["leaseId"]
            and fresh.get("renewalNonce") == nonce
            and fresh.get("aiPlatformDigest") == _digest(platform)
            and fresh.get("historicalHostDigest") == link["historicalHostDigest"]
            and fresh.get("historicalOffDigest") == link["historicalOffDigest"]
            and fresh.get("receiverState") == "OFF"
            and type(fresh.get("offSequence")) is int
            and fresh["offSequence"] > link["historicalOffSequence"]
            and type(fresh.get("observedAtMs")) is int
            and link["historicalOffAtMs"] < fresh["observedAtMs"] <= now_ms
            and now_ms - fresh["observedAtMs"] <= 120_000
        ):
            return fail("HOLD_QL443_FRESH_INDEPENDENT_OFF_STALE_OR_REPLAYED")
        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL443_EXACT_THREE_SIGNED_MASTERS_REQUIRED")
        reports = []
        expected_master = MASTER_LATE if link["leaseDisposition"] == EXPIRED else MASTER_ADMIT
        for master in MASTERS:
            body = verify443(master, master_reports[master], pins)
            if not (
                body
                and body.get("masterId") == master
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("aiPlatformDigest") == _digest(platform)
                and body.get("freshIndependentOffDigest") == _digest(fresh)
                and body.get("leaseDisposition") == link["leaseDisposition"]
                and body.get("decision") == expected_master
                and type(body.get("reviewedAtMs")) is int
                and fresh["observedAtMs"] <= body["reviewedAtMs"] <= now_ms
            ):
                return fail("HOLD_QL443_THREE_MASTER_FRESH_OFF_DIVERGENCE")
            reports.append(body)
        if not isinstance(dual_owners, dict) or set(dual_owners) != {
            "owner", "ownerReviewer"
        }:
            return fail("HOLD_QL443_TWO_DISTINCT_OWNERS_REQUIRED")
        owners = []
        expected_owner = OWNER_LATE if link["leaseDisposition"] == EXPIRED else OWNER_ADMIT
        for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
            body = verify443(role, dual_owners[role], pins)
            if not (
                body
                and body.get("ownerId") == owner_id
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("aiPlatformDigest") == _digest(platform)
                and body.get("freshIndependentOffDigest") == _digest(fresh)
                and body.get("threeMasterDigest") == _digest(reports)
                and body.get("decision") == expected_owner
                and type(body.get("reviewedAtMs")) is int
                and max(r["reviewedAtMs"] for r in reports) <= body["reviewedAtMs"] <= final_now_ms
            ):
                return fail("HOLD_QL443_DUAL_OWNER_ADMISSION_NOT_AUTHENTIC")
            owners.append(body)
        refreshed = verify_prior_shutdown334(monitor, **prior442)
        if not refreshed or refreshed[0] != prior_digest:
            return fail("HOLD_QL443_PROTECTED_PREDECESSOR_DRIFT")
        if journal.read(monitor, incident, "PENDING") != pending:
            return fail("HOLD_QL443_PENDING_CUSTODY_DRIFT")
        evidence = _digest({
            "prior": prior_digest, "source": source, "platform": platform,
            "freshOff": fresh, "masters": reports, "owners": owners,
            "disposition": link["leaseDisposition"],
        })
        late = link["leaseDisposition"] == EXPIRED
        stage = "EXCEPTION" if late else "ADMITTED"
        terminal = journal.claim(monitor, incident, stage, req_digest, evidence)
        if not terminal:
            return fail("HOLD_QL443_TERMINAL_CUSTODY_NOT_DURABLE")
        return {
            **hold334(EXCEPTION if late else ADMITTED),
            "accepted": True,
            "state": EXCEPTION if late else ADMITTED,
            "originalIncidentId": incident,
            "leaseDisposition": link["leaseDisposition"],
            "leaseExceptionOpen": late,
            "custodyAccepted": True,
            "masterCount": 3,
            "historicalOffDigest": link["historicalOffDigest"],
            "freshIndependentOffDigest": _digest(fresh),
            "aiPlatformDigest": _digest(platform),
            "threeMasterDigest": _digest(reports),
            "pendingReceiptDigest": pending["receiptDigest"],
            "finalReceiptDigest": terminal["receiptDigest"],
            "nextAction": "LIVE_EXTERNAL_OFF_AND_ORIGINAL_HOST_ENROLLMENT_REQUIRED",
        }
    except (KeyError, TypeError, ValueError, OSError):
        return fail("HOLD_QL443_INCOMPLETE_OR_TAMPERED_SIGNED_CUSTODY")


def read_private_renewal334(
    monitor: Any, journal: ProtectedRenewalJournal334, incident: str
) -> dict[str, Any]:
    status = hold334("QL443_PRIVATE_CUSTODY_REQUIRES_FRESH_EXTERNAL_OFF")
    try:
        admitted = journal.read(monitor, incident, "ADMITTED")
        expired = journal.read(monitor, incident, "EXCEPTION")
        pending = journal.read(monitor, incident, "PENDING")
        if admitted and expired:
            status["state"] = "HOLD_QL443_CONFLICTING_TERMINAL_CUSTODY"
        elif pending and admitted and admitted["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL443_HISTORICAL_EVIDENCE_ADMITTED_NOT_LIVE_OFF"
            status["historicalReceiptDigest"] = admitted["receiptDigest"]
        elif pending and expired and expired["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL443_EXPIRED_LEASE_EXCEPTION_STILL_OPEN"
            status["historicalReceiptDigest"] = expired["receiptDigest"]
        elif pending:
            status["state"] = "QL443_PENDING_CONSUMED_NO_REPLAY"
    except (ValueError, OSError):
        status["state"] = "HOLD_QL443_PROTECTED_CUSTODY_UNREADABLE"
    return status
