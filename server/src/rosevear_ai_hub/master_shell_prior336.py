"""QL-445 verifies exact QL-444 signed two-sample closure and durable ancestry.

Historical signed OFF observations never certify the present physical receiver.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance312 import MASTERS
from rosevear_ai_hub.master_shell_acceptance315 import _public_ed25519
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_continuity335 import (
    ACTION,
    CLOSED,
    MASTER_DECISION,
    OWNER_CLOSE,
    OWNER_REMEDIATED,
    REMEDIATED,
    REMEDIATION_DECISION,
    ROLES,
    ProtectedContinuityJournal335,
    verify444,
)
from rosevear_ai_hub.master_shell_decision333 import _sha
from rosevear_ai_hub.master_shell_prior335 import verify_prior_renewal335
from rosevear_ai_hub.master_shell_shutdown333 import EXPIRED


def verify_prior_continuity336(
    monitor: Any,
    *,
    prior443: dict[str, Any],
    result444: dict[str, Any],
    request444: dict[str, Any],
    journal444: ProtectedContinuityJournal335,
    pins444: dict[str, tuple[bytes, str]],
    signed444: dict[str, Any],
    remediation444: dict[str, Any] | None,
    masters444: dict[str, Any],
    owners444: dict[str, Any],
) -> tuple[str, dict[str, Any]] | None:
    """Replay entire QL-431–444 Ed25519 and private receipt chain."""
    if not (
        isinstance(prior443, dict)
        and isinstance(result444, dict)
        and result444.get("accepted") is True
        and result444.get("connection") == "HOLD"
        and result444.get("activationAuthorized") is False
        and result444.get("physicalReceiverCurrentlyOff") is False
        and result444.get("incidentClosed") is False
        and result444.get("incidentEvidenceClosed") is True
        and isinstance(request444, dict)
        and request444.get("action") == ACTION
        and isinstance(journal444, ProtectedContinuityJournal335)
        and isinstance(pins444, dict)
        and set(pins444) == set(ROLES)
        and all(
            isinstance(v, tuple)
            and len(v) == 2
            and isinstance(v[0], bytes)
            and isinstance(v[1], str)
            and _public_ed25519(*v)
            for v in pins444.values()
        )
        and len({v[0] for v in pins444.values()}) == len(ROLES)
        and len({v[1] for v in pins444.values()}) == len(ROLES)
        and isinstance(signed444, dict)
        and set(signed444) == {"commsSource", "host", "sampleOne", "sampleTwo"}
        and isinstance(masters444, dict)
        and set(masters444) == set(MASTERS)
        and isinstance(owners444, dict)
        and set(owners444) == {"owner", "ownerReviewer"}
    ):
        return None
    previous = verify_prior_renewal335(monitor, **prior443)
    if not previous:
        return None
    prior_digest, link = previous
    incident = link["incident"]
    req_digest = _digest(request444)
    late = link["leaseDisposition"] == EXPIRED
    pending = journal444.read(monitor, incident, "PENDING")
    terminal = journal444.read(monitor, incident, "CLOSED")
    remediation_receipt = journal444.read(monitor, incident, "REMEDIATION")
    if not (
        pending
        and terminal
        and (remediation_receipt is not None) is late
        and pending["requestDigest"] == req_digest
        and pending["evidenceDigest"] == prior_digest
        and terminal["requestDigest"] == req_digest
        and result444.get("state") == (REMEDIATED if late else CLOSED)
        and result444.get("leaseDisposition") == link["leaseDisposition"]
        and result444.get("leaseExceptionRemediated") is late
        and result444.get("masterCount") == 3
        and result444.get("originalIncidentId") == incident
        and result444.get("pendingReceiptDigest") == pending["receiptDigest"]
        and result444.get("finalReceiptDigest") == terminal["receiptDigest"]
        and result444.get("remediationReceiptDigest")
        == (remediation_receipt["receiptDigest"] if late else None)
        and request444.get("originalIncidentId") == incident
        and request444.get("challengeId") == link["challengeId"]
        and request444.get("leaseId") == link["leaseId"]
        and request444.get("priorQl443Digest") == prior_digest
        and request444.get("ql443FinalReceiptDigest") == link["finalReceiptDigest"]
        and request444.get("previousIndependentOffDigest") == link["previousOffDigest"]
        and isinstance(request444.get("continuityNonce"), str)
        and len(request444["continuityNonce"]) >= 12
        and isinstance(request444.get("watchId"), str)
        and len(request444["watchId"]) >= 12
        and len(
            {
                request444["continuityNonce"],
                request444["watchId"],
                link["renewalNonce"],
                link["challengeId"],
            }
        )
        == 4
    ):
        return None
    source = verify444("commsSource", signed444["commsSource"], pins444)
    host = verify444("host", signed444["host"], pins444)
    first = verify444("sampleOne", signed444["sampleOne"], pins444)
    second = verify444("sampleTwo", signed444["sampleTwo"], pins444)
    if not (source and host and first and second):
        return None
    nonce, watch = request444["continuityNonce"], request444["watchId"]
    if not (
        source.get("requestDigest") == req_digest
        and source.get("originalIncidentId") == incident
        and source.get("priorQl443Digest") == prior_digest
        and source.get("ql443FinalReceiptDigest") == link["finalReceiptDigest"]
        and source.get("previousIndependentOffDigest") == link["previousOffDigest"]
        and source.get("leaseDisposition") == link["leaseDisposition"]
        and source.get("assertedState") == "HISTORICAL_QL443_EVIDENCE_ONLY_HOLD"
        and type(source.get("observedAtMs")) is int
        and source["observedAtMs"] >= link["previousOffAtMs"]
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
        and host["observedAtMs"] > link["previousOffAtMs"]
        and first.get("requestDigest") == req_digest
        and first.get("originalIncidentId") == incident
        and first.get("challengeId") == link["challengeId"]
        and first.get("leaseId") == link["leaseId"]
        and first.get("continuityNonce") == nonce
        and first.get("watchId") == watch
        and first.get("priorQl443Digest") == prior_digest
        and first.get("hostContinuityDigest") == _digest(host)
        and first.get("receiverState") == "OFF"
        and type(first.get("sequence")) is int
        and first["sequence"] > host["sequence"]
        and type(first.get("observedAtMs")) is int
        and first["observedAtMs"] >= host["observedAtMs"]
        and second.get("requestDigest") == req_digest
        and second.get("originalIncidentId") == incident
        and second.get("challengeId") == link["challengeId"]
        and second.get("leaseId") == link["leaseId"]
        and second.get("continuityNonce") == nonce
        and second.get("watchId") == watch
        and second.get("priorQl443Digest") == prior_digest
        and second.get("hostContinuityDigest") == _digest(host)
        and second.get("previousSampleDigest") == _digest(first)
        and second.get("receiverState") == "OFF"
        and type(second.get("sequence")) is int
        and second["sequence"] > first["sequence"]
        and type(second.get("observedAtMs")) is int
        and 1_000 <= second["observedAtMs"] - first["observedAtMs"] <= 120_000
        and result444.get("previousOffDigest") == link["previousOffDigest"]
        and result444.get("firstOffDigest") == _digest(first)
        and result444.get("secondOffDigest") == _digest(second)
    ):
        return None
    remediation_digest = None
    if late:
        if not (
            isinstance(remediation444, dict)
            and set(remediation444) == {"remediationOwner", "remediationReviewer"}
        ):
            return None
        rem_reports = []
        for role, owner_id in zip(
            ("remediationOwner", "remediationReviewer"), link["ownerIds"], strict=True
        ):
            body = verify444(role, remediation444[role], pins444)
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
                and body["reviewedAtMs"] >= second["observedAtMs"]
            ):
                return None
            rem_reports.append(body)
        if not (
            rem_reports[0]["remediationId"] == rem_reports[1]["remediationId"]
            and rem_reports[0]["causeCode"] == rem_reports[1]["causeCode"]
            and rem_reports[0]["correctiveEvidenceSha256"]
            == rem_reports[1]["correctiveEvidenceSha256"]
        ):
            return None
        remediation_digest = _digest(rem_reports)
        if not (
            remediation_receipt["requestDigest"] == req_digest
            and remediation_receipt["evidenceDigest"] == remediation_digest
        ):
            return None
    elif remediation444 is not None:
        return None
    remediation_receipt_digest = remediation_receipt["receiptDigest"] if late else None
    reports = []
    for master in MASTERS:
        body = verify444(master, masters444[master], pins444)
        if not (
            body
            and body.get("masterId") == master
            and body.get("requestDigest") == req_digest
            and body.get("originalIncidentId") == incident
            and body.get("priorQl443Digest") == prior_digest
            and body.get("secondOffDigest") == _digest(second)
            and body.get("remediationReceiptDigest") == remediation_receipt_digest
            and body.get("leaseDisposition") == link["leaseDisposition"]
            and body.get("decision") == MASTER_DECISION
            and type(body.get("reviewedAtMs")) is int
            and body["reviewedAtMs"] >= second["observedAtMs"]
        ):
            return None
        reports.append(body)
    if result444.get("threeMasterDigest") != _digest(reports):
        return None
    owners = []
    for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        body = verify444(role, owners444[role], pins444)
        if not (
            body
            and body.get("ownerId") == owner_id
            and body.get("requestDigest") == req_digest
            and body.get("originalIncidentId") == incident
            and body.get("priorQl443Digest") == prior_digest
            and body.get("commsSourceDigest") == _digest(source)
            and body.get("secondOffDigest") == _digest(second)
            and body.get("threeMasterDigest") == _digest(reports)
            and body.get("remediationReceiptDigest") == remediation_receipt_digest
            and body.get("decision") == (OWNER_REMEDIATED if late else OWNER_CLOSE)
            and type(body.get("reviewedAtMs")) is int
            and body["reviewedAtMs"] >= max(report["reviewedAtMs"] for report in reports)
        ):
            return None
        owners.append(body)
    evidence = _digest(
        {
            "prior": prior_digest,
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
    if terminal["evidenceDigest"] != evidence:
        return None
    return (
        _digest(
            {
                "prior": prior_digest,
                "pending": pending,
                "remediation": remediation_receipt,
                "closed": terminal,
                "signedEvidence": evidence,
            }
        ),
        {
            "incident": incident,
            "challengeId": link["challengeId"],
            "leaseId": link["leaseId"],
            "leaseDisposition": link["leaseDisposition"],
            "ql444ClosureReceiptDigest": terminal["receiptDigest"],
            "ql444RemediationReceiptDigest": remediation_receipt_digest,
            "previousOffDigest": _digest(second),
            "previousOffAtMs": second["observedAtMs"],
            "previousOffSequence": second["sequence"],
            "previousWatchId": watch,
            "previousNonce": nonce,
            "ownerIds": link["ownerIds"],
        },
    )
