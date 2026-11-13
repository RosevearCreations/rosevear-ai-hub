"""QL-440 narrow authorization boundary, independent of receiver control.

This early guard is not a complete QL-440 issuance implementation.
Signature verification, protected source custody and original-host operation
remain mandatory upstream; passing this guard NEVER grants activation.
"""

from collections.abc import Mapping

MASTERS_440 = ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")
READINESS_439 = "DURABLE_QL439_NEW_CEREMONY_REENTRY_READINESS_ONLY"
CHALLENGE_ONLY = "NEW_CEREMONY_CHALLENGE_ONLY_NO_RECEIVER_ON"
MASTER_DECISION = "PREREQUISITES_ACCEPTED_NEW_CEREMONY_CHALLENGE_ONLY_NO_ON"
OWNER_DECISION = "ISSUE_FRESH_CEREMONY_CHALLENGE_AUTHORITY_ONLY_NO_ON"
ISSUER_DECISION = "FRESH_QL429_QL430_CEREMONY_CHALLENGE_ONLY_NO_RECEIVER_ON"
ISSUANCE_440 = "DURABLE_QL440_NEW_CEREMONY_AUTHORIZATION_PREREQUISITES_ACCEPTED"


def hold_ql440(reason: str) -> dict:
    """No caller can turn a guard failure into runtime ON."""
    return {
        "accepted": False,
        "reason": reason,
        "ceremonyAuthorizationIssued": False,
        "receiver": "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION",
        "connection": "HOLD",
        "activationAuthorized": False,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }


def receipt_only_ql440() -> dict:
    """An existing private issuance receipt never proves live OFF."""
    return hold_ql440("QL440_DURABLE_PRIVATE_ISSUANCE_NEW_OFF_AND_OWNER_CHALLENGE_REQUIRED")


def check_ql440_prerequisite_shape(
    readiness: Mapping | None,
    request: Mapping | None,
    host: Mapping | None,
    observer: Mapping | None,
    masters: Mapping | None,
    owners: Mapping | None,
    issuer: Mapping | None,
) -> dict:
    """Check claims' cross-field binding only, without trusting any signatures.

    This may be used *after* separate cryptographic verification; it must never
    be called to issue an authorization on its own.
    """
    if not isinstance(readiness, Mapping) or readiness.get("status") != READINESS_439:
        return hold_ql440("HOLD_QL439_READINESS_NOT_EXTERNALLY_VERIFIED")
    if readiness.get("connection") != "HOLD" or readiness.get("activationAuthorized") is not False:
        return hold_ql440("HOLD_QL439_UNSAFE_STATE")
    if not isinstance(request, Mapping) or request.get("action") != CHALLENGE_ONLY:
        return hold_ql440("HOLD_QL440_CHALLENGE_ONLY_ACTION_REQUIRED")
    if not isinstance(request.get("nonce"), str) or len(request["nonce"]) < 16:
        return hold_ql440("HOLD_QL440_FRESH_NONCE_REQUIRED")
    if request["nonce"] == readiness.get("renewalNonce"):
        return hold_ql440("HOLD_QL440_REPLAYED_RENEWAL_NONCE")
    for name in ("incidentId", "ceremonyId", "episodeId"):
        if not isinstance(request.get(name), str) or not request[name]:
            return hold_ql440("HOLD_QL440_MISSING_REQUEST_BINDING")
        if request[name] != readiness.get(name):
            return hold_ql440("HOLD_QL440_PRIOR_READINESS_DRIFT")
    for name in ("pendingReceiptDigest", "readinessReceiptDigest", "renewedAnchorDigest", "independentReaderDigest"):
        value = request.get(name)
        if not isinstance(value, str) or len(value) != 64:
            return hold_ql440("HOLD_QL440_INVALID_PRIOR_DIGEST")
        if value != readiness.get(name):
            return hold_ql440("HOLD_QL440_PRIOR_CUSTODY_DRIFT")
        try:
            int(value, 16)
        except ValueError:
            return hold_ql440("HOLD_QL440_INVALID_PRIOR_DIGEST")
    if not isinstance(host, Mapping) or host.get("hostMachineId") != "DESKTOP-AE894KC":
        return hold_ql440("HOLD_QL440_ORIGINAL_HOST_INVALID")
    if host.get("receiverState") != "OFF" or host.get("failClosedShutdownArmed") is not True:
        return hold_ql440("HOLD_QL440_HOST_OFF_OR_WATCHDOG_INVALID")
    host_sequence = host.get("offContinuitySequence")
    if type(host_sequence) is not int or host_sequence < 1:
        return hold_ql440("HOLD_QL440_HOST_SEQUENCE_INVALID")
    if host.get("nonce") != request["nonce"]:
        return hold_ql440("HOLD_QL440_HOST_NONCE_MISMATCH")
    if not isinstance(observer, Mapping) or observer.get("receiverState") != "OFF":
        return hold_ql440("HOLD_QL440_INDEPENDENT_OFF_MISSING")
    sequence = observer.get("offContinuitySequence")
    if type(sequence) is not int or sequence < host_sequence:
        return hold_ql440("HOLD_QL440_INDEPENDENT_OFF_SEQUENCE_INVALID")
    if observer.get("nonce") != request["nonce"] or observer.get("hostOffDigest") != host.get("signedDigest"):
        return hold_ql440("HOLD_QL440_INDEPENDENT_OFF_BINDING_INVALID")
    if not isinstance(masters, Mapping) or set(masters) != set(MASTERS_440):
        return hold_ql440("HOLD_QL440_THREE_MASTER_REPORTS_MISSING")
    for master_id in MASTERS_440:
        report = masters[master_id]
        if (
            not isinstance(report, Mapping)
            or report.get("masterId") != master_id
            or report.get("decision") != MASTER_DECISION
            or report.get("nonce") != request["nonce"]
            or report.get("receiverOffDigest") != observer.get("signedDigest")
        ):
            return hold_ql440("HOLD_QL440_MASTER_PREREQUISITE_INVALID")
    if not isinstance(owners, Mapping) or owners.get("decision") != OWNER_DECISION:
        return hold_ql440("HOLD_QL440_DUAL_OWNER_DECISION_INVALID")
    if owners.get("ownerId") == owners.get("reviewerId") or not owners.get("ownerId") or not owners.get("reviewerId"):
        return hold_ql440("HOLD_QL440_OWNER_REVIEWER_NOT_DISTINCT")
    if owners.get("nonce") != request["nonce"]:
        return hold_ql440("HOLD_QL440_OWNER_BINDING_INVALID")
    if not isinstance(issuer, Mapping) or issuer.get("action") != ISSUER_DECISION:
        return hold_ql440("HOLD_QL440_NARROW_ISSUER_ACTION_REQUIRED")
    if issuer.get("hostMachineId") != "DESKTOP-AE894KC" or issuer.get("nonce") != request["nonce"]:
        return hold_ql440("HOLD_QL440_ISSUER_BOUNDARY_INVALID")
    # Shape checks are not signature checks. Never return acceptance here.
    return hold_ql440("HOLD_QL440_SIGNATURES_AND_ONE_USE_CUSTODY_NOT_YET_VERIFIED")
