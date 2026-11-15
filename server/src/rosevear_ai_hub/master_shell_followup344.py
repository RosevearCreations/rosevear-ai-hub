"""QL-453 signed owner follow-up, expiring independent OFF readback and Master drift.

Historical original-host custody only. Valid evidence is NOT proof that the
receiver is OFF now. No transport, hardware access, event publishing or closure.
"""

from typing import Any

from rosevear_ai_hub.cross_app_security344 import CONTRACT_DIGEST, ORDER
from rosevear_ai_hub.master_shell_acceptance308 import _on_ree
from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest, _native
from rosevear_ai_hub.master_shell_reconciliation343 import reconcile_ql451_outcome343

ACTION = "QL453_ORIGINAL_HOST_SIGNED_FOLLOWUP_AND_HANDOFF_DRIFT_REVIEW"
MAX_FRESH_OFF_AGE_MS = 45_000
ROLES = ("host", "observer", "owner", *MASTERS)
REVIEW_EXCEPTION = "EXCEPTION_OPEN_REMEDIATION"
REVIEW_CONTINUITY = "CONTINUITY_REVIEW_OPEN_HOLD"
MASTER_VETO = "SIGNED_MASTER_OPEN_HOLD_NO_ACTIVATION"
STATUS = "QL453_SIGNED_HISTORICAL_FOLLOWUP_NO_CURRENT_OFF_OR_CLOSURE"


def hold344(reason: str, *, escalation: bool = True) -> dict[str, Any]:
    return {
        "accepted": False,
        "state": reason,
        "sourceBuild": 344,
        "originalHost": "DESKTOP-AE894KC",
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "connection": "HOLD",
        "incidentStatus": "OPEN",
        "incidentClosed": False,
        "activationAuthorized": False,
        "closureAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "manualIsolationAndIndependentOffRequired": True,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "independentOffHistoricallyReviewed": False,
        "masterHandoffVerified": False,
        "crossAppConnectivityVerified": False,
        "escalationRequired": escalation,
        "nextMaster": "rosevear-comms-hub",
    }


def verify453(
    role: str, envelope: Any, pins: dict[str, tuple[bytes, str]]
) -> dict[str, Any] | None:
    if not (
        role in pins and isinstance(envelope, dict) and isinstance(envelope.get("payload"), dict)
    ):
        return None
    payload = envelope["payload"]
    return (
        payload
        if _native(envelope, set(payload), f"rosevear.ai-hub.ql453.{role}.v1", *pins[role])
        == payload
        else None
    )


def audit_signed_followup344(
    monitor: Any,
    *,
    original343: dict[str, Any],
    request: dict[str, Any],
    signed_host: Any,
    signed_observer: Any,
    signed_owner: Any,
    signed_masters: dict[str, Any],
    pins: dict[str, tuple[bytes, str]],
    now_ms: int,
) -> dict[str, Any]:
    """Fail closed on stale, divergent, replayed or mismatched signed evidence."""
    if not (
        _on_ree(monitor)
        and isinstance(original343, dict)
        and isinstance(request, dict)
        and set(request)
        == {
            "action",
            "incidentId",
            "historicalReceiptDigest",
            "historicalEvidenceDigest",
            "followupId",
            "challengeNonce",
        }
        and isinstance(signed_masters, dict)
        and set(signed_masters) == set(MASTERS)
        and isinstance(pins, dict)
        and set(pins) == set(ROLES)
        and all(isinstance(p, tuple) and len(p) == 2 and _public_ed25519(*p) for p in pins.values())
        and len({p[0] for p in pins.values()}) == len(ROLES)
        and len({p[1] for p in pins.values()}) == len(ROLES)
        and type(now_ms) is int
        and now_ms >= 0
    ):
        return hold344("HOLD_QL453_UNTRUSTED_ORIGINAL_HOST_OR_SIGNERS")
    try:
        history = reconcile_ql451_outcome343(monitor, **original343)
        incident = history.get("originalIncidentId")
        receipt = history.get("historicalReceiptDigest")
        evidence = history.get("historicalEvidenceDigest")
        if not (
            history.get("accepted") is True
            and history.get("historicalQl451Verified") is True
            and history.get("threeMasterGovernanceVerified") is True
            and history.get("connection") == "HOLD"
            and history.get("incidentStatus") == "OPEN"
            and history.get("incidentClosed") is False
            and history.get("closureAuthorized") is False
            and history.get("activationAuthorized") is False
            and history.get("physicalReceiverCurrentlyOff") is False
            and request["action"] == ACTION
            and request["incidentId"] == incident
            and request["historicalReceiptDigest"] == receipt
            and request["historicalEvidenceDigest"] == evidence
            and all(
                isinstance(request[k], str)
                and len(request[k]) >= 12
                and len(request[k]) <= 128
                and request[k].isascii()
                for k in ("followupId", "challengeNonce")
            )
            and request["followupId"] != request["challengeNonce"]
        ):
            return hold344("HOLD_QL453_SIGNED_HISTORICAL_PREDECESSOR_CHANGED")
        req_digest = _digest(request)
        host = verify453("host", signed_host, pins)
        observer = verify453("observer", signed_observer, pins)
        if not (host and observer):
            return hold344("HOLD_QL453_HOST_OR_INDEPENDENT_WITNESS_SIGNATURE")
        if not (
            host.get("requestDigest") == req_digest
            and host.get("incidentId") == incident
            and host.get("historicalReceiptDigest") == receipt
            and host.get("hostMachineId") == "DESKTOP-AE894KC"
            and host.get("receiverState") in ("OFF", "ON")
            and all(
                type(host.get(k)) is bool
                for k in ("isolationLock", "leaseRevoked", "watchdogArmed")
            )
            and type(host.get("sequence")) is int
            and host["sequence"] > 0
            and type(host.get("observedAtMs")) is int
            and observer.get("requestDigest") == req_digest
            and observer.get("incidentId") == incident
            and observer.get("historicalReceiptDigest") == receipt
            and observer.get("signedHostDigest") == _digest(host)
            and observer.get("receiverState") in ("OFF", "ON")
            and type(observer.get("isolationConfirmed")) is bool
            and type(observer.get("sequence")) is int
            and observer["sequence"] > host["sequence"]
            and type(observer.get("observedAtMs")) is int
            and observer["observedAtMs"] >= host["observedAtMs"]
        ):
            return hold344("HOLD_QL453_READBACK_SEQUENCE_OR_SOURCE_MISMATCH")
        if not (
            0 <= now_ms - observer["observedAtMs"] <= MAX_FRESH_OFF_AGE_MS
            and 0 <= now_ms - host["observedAtMs"] <= MAX_FRESH_OFF_AGE_MS
        ):
            return hold344("HOLD_QL453_INDEPENDENT_OFF_READBACK_EXPIRED_ESCALATE")
        if not (
            host["receiverState"] == observer["receiverState"] == "OFF"
            and host["isolationLock"]
            and host["leaseRevoked"]
            and host["watchdogArmed"]
            and observer["isolationConfirmed"]
        ):
            return hold344("HOLD_QL453_ON_DIVERGENCE_OR_ISOLATION_EXCEPTION")
        owner = verify453("owner", signed_owner, pins)
        owner_decision = (
            REVIEW_EXCEPTION if history.get("unresolvedException") is True else REVIEW_CONTINUITY
        )
        if not (
            owner
            and owner.get("requestDigest") == req_digest
            and owner.get("incidentId") == incident
            and owner.get("historicalReceiptDigest") == receipt
            and owner.get("signedHostDigest") == _digest(host)
            and owner.get("signedObserverDigest") == _digest(observer)
            and owner.get("followupId") == request["followupId"]
            and owner.get("challengeNonce") == request["challengeNonce"]
            and owner.get("reviewDecision") == owner_decision
            and owner.get("closureAuthorized") is False
            and owner.get("activationAuthorized") is False
            and isinstance(owner.get("ownerId"), str)
            and len(owner["ownerId"]) >= 4
            and type(owner.get("reviewedAtMs")) is int
            and observer["observedAtMs"] <= owner["reviewedAtMs"] <= now_ms
        ):
            return hold344("HOLD_QL453_SIGNED_OWNER_FOLLOWUP_VETO")
        readback_digest = _digest(
            {
                "historicalEvidenceDigest": evidence,
                "requestDigest": req_digest,
                "hostDigest": _digest(host),
                "observerDigest": _digest(observer),
                "ownerDigest": _digest(owner),
            }
        )
        previous_master_digest = None
        last_reviewed = owner["reviewedAtMs"]
        for master in MASTERS:
            vote = verify453(master, signed_masters[master], pins)
            if not (
                vote
                and vote.get("masterId") == master
                and vote.get("incidentId") == incident
                and vote.get("requestDigest") == req_digest
                and vote.get("historicalReceiptDigest") == receipt
                and vote.get("readbackDigest") == readback_digest
                and vote.get("contractDigest") == CONTRACT_DIGEST
                and vote.get("previousMasterDigest") == previous_master_digest
                and vote.get("decision") == MASTER_VETO
                and vote.get("incidentStatus") == "OPEN_HOLD"
                and vote.get("connection") == "HOLD"
                and vote.get("closureAuthorized") is False
                and vote.get("activationAuthorized") is False
                and type(vote.get("reviewedAtMs")) is int
                and last_reviewed <= vote["reviewedAtMs"] <= now_ms
            ):
                return hold344("HOLD_QL453_THREE_MASTER_HOP_DRIFT_ESCALATE")
            previous_master_digest = _digest(vote)
            last_reviewed = vote["reviewedAtMs"]
        if not (now_ms - owner["reviewedAtMs"] <= MAX_FRESH_OFF_AGE_MS):
            return hold344("HOLD_QL453_OWNER_REVIEW_EXPIRED_ESCALATE")
        if not (0 <= now_ms - last_reviewed <= MAX_FRESH_OFF_AGE_MS):
            return hold344("HOLD_QL453_MASTER_VOTE_EXPIRED_ESCALATE")
        return {
            **hold344(STATUS, escalation=history.get("unresolvedException") is True),
            "accepted": True,
            "independentOffHistoricallyReviewed": True,
            "masterHandoffVerified": True,
            "signedFollowupDigest": readback_digest,
            "lastMasterDigest": previous_master_digest,
            "originalIncidentId": incident,
            "observedAtMs": observer["observedAtMs"],
            "reviewDecision": owner_decision,
            "threeMasterCount": 3,
            "handoffOrder": ORDER,
            "securityContractDigest": CONTRACT_DIGEST,
            "nextAction": (
                "SIGNED_EXCEPTION_FOLLOWUP_REQUIRES_SUPERVISED_CORRECTION"
                if history.get("unresolvedException") is True
                else "NEW_INDEPENDENT_PHYSICAL_OFF_AND_OWNER_CLOSURE_CEREMONY_REQUIRED"
            ),
        }
    except (KeyError, TypeError, ValueError, OSError):
        return hold344("HOLD_QL453_TAMPERED_OR_INCOMPLETE_SIGNED_FOLLOWUP")
