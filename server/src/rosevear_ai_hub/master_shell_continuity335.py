"""Build 335 / QL-444: protected two-sample signed OFF continuity and evidence closure.

A code-level incident closure is historical custody, never proof that a physical
receiver is presently OFF or permission to connect or operate hardware.
"""

from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_decision333 import (
    ProtectedWitnessJournal333,
    _sha,
    hold_decision333,
)
from rosevear_ai_hub.master_shell_prior335 import verify_prior_renewal335
from rosevear_ai_hub.master_shell_shutdown333 import EXPIRED

ACTION = "QL444_SIGNED_OFF_CONTINUITY_REMEDIATION_EVIDENCE_ONLY"
CLOSED = "DURABLE_QL444_WITNESSED_OFF_INCIDENT_EVIDENCE_CLOSED"
REMEDIATED = "DURABLE_QL444_REMEDIATED_LEASE_EXCEPTION_EVIDENCE_CLOSED"
ROLES = (
    "commsSource",
    "host",
    "sampleOne",
    "sampleTwo",
    "remediationOwner",
    "remediationReviewer",
    "owner",
    "ownerReviewer",
    *MASTERS,
)
MASTER_DECISION = "APPROVE_QL444_INCIDENT_EVIDENCE_ONLY_HOLD"
OWNER_CLOSE = "CLOSE_QL444_WITNESSED_EVIDENCE_ONLY_NO_CONNECT"
OWNER_REMEDIATED = "CLOSE_QL444_REMEDIATED_EVIDENCE_ONLY_KEEP_HOLD"
REMEDIATION_DECISION = "REMEDIATE_LEASE_EXCEPTION_EVIDENCE_ONLY_KEEP_HOLD"


class ProtectedContinuityJournal335(ProtectedWitnessJournal333):
    """Protected PENDING / optional REMEDIATION / CLOSED, all one-use."""

    def __init__(self, directory: Path):
        super().__init__(directory)
        self.stages = ("PENDING", "REMEDIATION", "CLOSED")
        self.terminal_stages = ("CLOSED",)

    def claim(
        self,
        monitor: Any,
        incident: str,
        stage: str,
        request_digest: str,
        evidence_digest: str,
    ) -> dict[str, str] | None:
        if stage == "REMEDIATION" and (
            self._path(incident, "REMEDIATION").exists()
            or self._path(incident, "REMEDIATION").is_symlink()
        ):
            return None
        return super().claim(monitor, incident, stage, request_digest, evidence_digest)


def verify444(
    role: str, envelope: Any, pins: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if role not in pins or not isinstance(envelope, dict):
        return None
    payload = envelope.get("payload")
    if not isinstance(payload, dict):
        return None
    schema = f"rosevear.ai-hub.ql444.{role}.v1"
    return payload if _native(envelope, set(payload), schema, *pins[role]) == payload else None


def hold335(reason: str) -> dict[str, Any]:
    return {
        **hold_decision333(reason),
        "sourceBuild": 335,
        "state": reason,
        "incidentClosed": False,
        "incidentEvidenceClosed": False,
        "freshPhysicalOffProven": False,
        "leaseExceptionRemediated": False,
        "historicalEvidenceOnly": True,
    }


def review_continuity335(
    monitor: Any,
    prior443: dict[str, Any],
    request: dict[str, Any],
    journal: ProtectedContinuityJournal335,
    pins: dict[str, tuple[bytes, str]],
    *,
    read_comms_source: Any,
    read_host_continuity: Any,
    read_sample_one: Any,
    read_sample_two: Any,
    remediation_owners: dict[str, Any] | None,
    master_reports: dict[str, Any],
    final_owners: dict[str, Any],
    now_ms: int,
    final_now_ms: int,
) -> dict[str, Any]:
    """Consume independent signed observations only; no receiver control."""

    def fail(reason: str) -> dict[str, Any]:
        return hold335(reason)

    if not (
        _on_ree(monitor)
        and isinstance(prior443, dict)
        and isinstance(request, dict)
        and isinstance(journal, ProtectedContinuityJournal335)
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
        and all(
            callable(fn)
            for fn in (
                read_comms_source,
                read_host_continuity,
                read_sample_one,
                read_sample_two,
            )
        )
    ):
        return fail("HOLD_QL444_ORIGINAL_HOST_PINS_OR_CLOCK_INVALID")
    try:
        previous = verify_prior_renewal335(monitor, **prior443)
        if not previous:
            return fail("HOLD_QL444_EXACT_PROTECTED_QL431_TO_443_CUSTODY_REQUIRED")
        previous_digest, link = previous
        incident = link["incident"]
        req_digest = _digest(request)
        nonce = request.get("continuityNonce")
        watch = request.get("watchId")
        if not (
            request.get("action") == ACTION
            and request.get("originalIncidentId") == incident
            and request.get("challengeId") == link["challengeId"]
            and request.get("leaseId") == link["leaseId"]
            and request.get("priorQl443Digest") == previous_digest
            and request.get("ql443FinalReceiptDigest") == link["finalReceiptDigest"]
            and request.get("previousIndependentOffDigest") == link["previousOffDigest"]
            and isinstance(nonce, str)
            and len(nonce) >= 12
            and isinstance(watch, str)
            and len(watch) >= 12
            and len({nonce, watch, link["renewalNonce"], link["challengeId"]}) == 4
            and now_ms > link["previousOffAtMs"]
        ):
            return fail("HOLD_QL444_NEW_WATCH_AND_NONCE_BINDING_REQUIRED")
        pending = journal.claim(monitor, incident, "PENDING", req_digest, previous_digest)
        if not pending:
            return fail("HOLD_QL444_ONE_USE_PENDING_NOT_DURABLE_OR_REPLAY")
        source = verify444(
            "commsSource",
            read_comms_source(request=request, pendingDigest=pending["receiptDigest"]),
            pins,
        )
        if not (
            source
            and source.get("requestDigest") == req_digest
            and source.get("originalIncidentId") == incident
            and source.get("priorQl443Digest") == previous_digest
            and source.get("ql443FinalReceiptDigest") == link["finalReceiptDigest"]
            and source.get("previousIndependentOffDigest") == link["previousOffDigest"]
            and source.get("leaseDisposition") == link["leaseDisposition"]
            and source.get("assertedState") == "HISTORICAL_QL443_EVIDENCE_ONLY_HOLD"
            and type(source.get("observedAtMs")) is int
            and link["previousOffAtMs"] <= source["observedAtMs"] <= now_ms
            and now_ms - source["observedAtMs"] <= 120_000
        ):
            return fail("HOLD_QL444_SIGNED_ORIGINAL_COMMS_CUSTODY_INVALID")
        host = verify444(
            "host",
            read_host_continuity(request=request, sourceDigest=_digest(source)),
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
            and host.get("continuityNonce") == nonce
            and host.get("watchId") == watch
            and host.get("previousIndependentOffDigest") == link["previousOffDigest"]
            and host.get("watchdogArmed") is True
            and host.get("receiverState") == "OFF"
            and type(host.get("sequence")) is int
            and host["sequence"] > link["previousOffSequence"]
            and type(host.get("observedAtMs")) is int
            and link["previousOffAtMs"] < host["observedAtMs"] <= now_ms
            and now_ms - host["observedAtMs"] <= 120_000
        ):
            return fail("HOLD_QL444_ORIGINAL_HOST_OFF_WATCHDOG_OR_SEQUENCE_INVALID")

        first = verify444(
            "sampleOne",
            read_sample_one(request=request, hostDigest=_digest(host)),
            pins,
        )
        if not (
            first
            and first.get("requestDigest") == req_digest
            and first.get("originalIncidentId") == incident
            and first.get("challengeId") == link["challengeId"]
            and first.get("leaseId") == link["leaseId"]
            and first.get("continuityNonce") == nonce
            and first.get("watchId") == watch
            and first.get("priorQl443Digest") == previous_digest
            and first.get("hostContinuityDigest") == _digest(host)
            and first.get("receiverState") == "OFF"
            and type(first.get("sequence")) is int
            and first["sequence"] > host["sequence"]
            and type(first.get("observedAtMs")) is int
            and host["observedAtMs"] <= first["observedAtMs"] <= now_ms
            and now_ms - first["observedAtMs"] <= 120_000
        ):
            return fail("HOLD_QL444_FIRST_INDEPENDENT_OFF_INVALID")

        second = verify444(
            "sampleTwo",
            read_sample_two(request=request, previousSampleDigest=_digest(first)),
            pins,
        )
        if not (
            second
            and second.get("requestDigest") == req_digest
            and second.get("originalIncidentId") == incident
            and second.get("challengeId") == link["challengeId"]
            and second.get("leaseId") == link["leaseId"]
            and second.get("continuityNonce") == nonce
            and second.get("watchId") == watch
            and second.get("priorQl443Digest") == previous_digest
            and second.get("hostContinuityDigest") == _digest(host)
            and second.get("previousSampleDigest") == _digest(first)
            and second.get("receiverState") == "OFF"
            and type(second.get("sequence")) is int
            and second["sequence"] > first["sequence"]
            and type(second.get("observedAtMs")) is int
            and 1_000 <= second["observedAtMs"] - first["observedAtMs"] <= 120_000
            and second["observedAtMs"] <= now_ms
            and now_ms - second["observedAtMs"] <= 120_000
        ):
            return fail("HOLD_QL444_SECOND_INDEPENDENT_OFF_REPLAY_OR_DRIFT")

        late = link["leaseDisposition"] == EXPIRED
        if not late and remediation_owners is not None:
            return fail("HOLD_QL444_UNEXPECTED_REMEDIATION_FOR_ON_TIME_LEASE")
        remediation_receipt = None
        remediation_digest = None
        if late:
            if not (
                isinstance(remediation_owners, dict)
                and set(remediation_owners) == {"remediationOwner", "remediationReviewer"}
            ):
                return fail("HOLD_QL444_TWO_SIGNED_REMEDIATION_OWNERS_REQUIRED")
            rem_reports = []
            for role, owner_id in zip(
                ("remediationOwner", "remediationReviewer"), link["ownerIds"], strict=True
            ):
                body = verify444(role, remediation_owners[role], pins)
                if not (
                    body
                    and body.get("ownerId") == owner_id
                    and body.get("requestDigest") == req_digest
                    and body.get("originalIncidentId") == incident
                    and body.get("ql443ExceptionReceiptDigest") == link["finalReceiptDigest"]
                    and body.get("secondOffDigest") == _digest(second)
                    and body.get("action") == REMEDIATION_DECISION
                    and isinstance(body.get("remediationId"), str)
                    and len(body["remediationId"]) >= 12
                    and isinstance(body.get("causeCode"), str)
                    and bool(body["causeCode"])
                    and _sha(body.get("correctiveEvidenceSha256"))
                    and type(body.get("reviewedAtMs")) is int
                    and second["observedAtMs"] <= body["reviewedAtMs"] <= now_ms
                ):
                    return fail("HOLD_QL444_SIGNED_REMEDIATION_EVIDENCE_INVALID")
                rem_reports.append(body)
            if not (
                rem_reports[0]["remediationId"] == rem_reports[1]["remediationId"]
                and rem_reports[0]["causeCode"] == rem_reports[1]["causeCode"]
                and rem_reports[0]["correctiveEvidenceSha256"]
                == rem_reports[1]["correctiveEvidenceSha256"]
            ):
                return fail("HOLD_QL444_REMEDIATION_OWNER_DISAGREEMENT")
            remediation_digest = _digest(rem_reports)
            remediation_receipt = journal.claim(
                monitor, incident, "REMEDIATION", req_digest, remediation_digest
            )
            if not remediation_receipt:
                return fail("HOLD_QL444_REMEDIATION_CUSTODY_NOT_DURABLE")
        if not isinstance(master_reports, dict) or set(master_reports) != set(MASTERS):
            return fail("HOLD_QL444_EXACT_THREE_MASTER_REVIEWS_REQUIRED")
        reports = []
        rem_receipt_digest = remediation_receipt["receiptDigest"] if remediation_receipt else None
        for master in MASTERS:
            body = verify444(master, master_reports[master], pins)
            if not (
                body
                and body.get("masterId") == master
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("priorQl443Digest") == previous_digest
                and body.get("secondOffDigest") == _digest(second)
                and body.get("remediationReceiptDigest") == rem_receipt_digest
                and body.get("leaseDisposition") == link["leaseDisposition"]
                and body.get("decision") == MASTER_DECISION
                and type(body.get("reviewedAtMs")) is int
                and second["observedAtMs"] <= body["reviewedAtMs"] <= now_ms
            ):
                return fail("HOLD_QL444_THREE_MASTER_CLOSURE_VETO_OR_DRIFT")
            reports.append(body)

        if not isinstance(final_owners, dict) or set(final_owners) != {"owner", "ownerReviewer"}:
            return fail("HOLD_QL444_TWO_ORIGINAL_CLOSURE_OWNERS_REQUIRED")
        owners = []
        for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
            body = verify444(role, final_owners[role], pins)
            if not (
                body
                and body.get("ownerId") == owner_id
                and body.get("requestDigest") == req_digest
                and body.get("originalIncidentId") == incident
                and body.get("priorQl443Digest") == previous_digest
                and body.get("commsSourceDigest") == _digest(source)
                and body.get("secondOffDigest") == _digest(second)
                and body.get("threeMasterDigest") == _digest(reports)
                and body.get("remediationReceiptDigest") == rem_receipt_digest
                and body.get("decision") == (OWNER_REMEDIATED if late else OWNER_CLOSE)
                and type(body.get("reviewedAtMs")) is int
                and max(report["reviewedAtMs"] for report in reports)
                <= body["reviewedAtMs"]
                <= final_now_ms
            ):
                return fail("HOLD_QL444_DUAL_OWNER_CLOSURE_SCOPE_INVALID")
            owners.append(body)

        prior_again = verify_prior_renewal335(monitor, **prior443)
        if not prior_again or prior_again[0] != previous_digest:
            return fail("HOLD_QL444_PRIOR_PROTECTED_CUSTODY_DRIFT")
        if journal.read(monitor, incident, "PENDING") != pending:
            return fail("HOLD_QL444_PENDING_CHANGED_BEFORE_CLOSURE")
        if late and journal.read(monitor, incident, "REMEDIATION") != remediation_receipt:
            return fail("HOLD_QL444_REMEDIATION_CHANGED_BEFORE_CLOSURE")
        if journal.read(monitor, incident, "CLOSED") is not None:
            return fail("HOLD_QL444_ALREADY_CLOSED_REPLAY")
        evidence = _digest(
            {
                "prior": previous_digest,
                "source": source,
                "host": host,
                "sampleOne": first,
                "sampleTwo": second,
                "remediation": remediation_digest,
                "remediationReceipt": remediation_receipt,
                "masters": reports,
                "owners": owners,
                "leaseDisposition": link["leaseDisposition"],
            }
        )
        terminal = journal.claim(monitor, incident, "CLOSED", req_digest, evidence)
        if not terminal:
            return fail("HOLD_QL444_FINAL_CLOSED_CUSTODY_NOT_DURABLE")
        return {
            **hold335(REMEDIATED if late else CLOSED),
            "accepted": True,
            "state": REMEDIATED if late else CLOSED,
            "originalIncidentId": incident,
            "incidentEvidenceClosed": True,
            "leaseDisposition": link["leaseDisposition"],
            "leaseExceptionRemediated": late,
            "previousOffDigest": link["previousOffDigest"],
            "firstOffDigest": _digest(first),
            "secondOffDigest": _digest(second),
            "remediationReceiptDigest": rem_receipt_digest,
            "threeMasterDigest": _digest(reports),
            "pendingReceiptDigest": pending["receiptDigest"],
            "finalReceiptDigest": terminal["receiptDigest"],
            "masterCount": 3,
            "nextAction": "INDEPENDENT_LIVE_OFF_REVALIDATION_AND_OWNER_REVIEW_REQUIRED",
        }
    except (KeyError, TypeError, ValueError, OSError):
        return fail("HOLD_QL444_MALFORMED_OR_INCOMPLETE_SIGNED_CUSTODY")


def read_private_continuity335(
    monitor: Any, journal: ProtectedContinuityJournal335, incident: str
) -> dict[str, Any]:
    status = hold335("QL444_PRIVATE_HISTORICAL_CUSTODY_REQUIRES_FRESH_OFF")
    try:
        pending = journal.read(monitor, incident, "PENDING")
        remediation = journal.read(monitor, incident, "REMEDIATION")
        closed = journal.read(monitor, incident, "CLOSED")
        if not pending:
            status["state"] = "HOLD_QL444_NO_PROTECTED_PENDING"
        elif closed and closed["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL444_HISTORICAL_EVIDENCE_CLOSED_NOT_LIVE_RECEIVER_OFF"
            status["historicalReceiptDigest"] = closed["receiptDigest"]
            status["remediationReceiptDigest"] = (
                remediation["receiptDigest"] if remediation else None
            )
        elif remediation and remediation["requestDigest"] == pending["requestDigest"]:
            status["state"] = "QL444_REMEDIATION_PENDING_OWNER_CLOSURE_HOLD"
            status["remediationReceiptDigest"] = remediation["receiptDigest"]
        else:
            status["state"] = "QL444_ONE_USE_PENDING_NOT_REPLAYABLE"
    except (ValueError, OSError):
        status["state"] = "HOLD_QL444_PRIVATE_RECEIPT_UNREADABLE"
    return status
