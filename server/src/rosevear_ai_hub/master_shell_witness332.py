"""Build 332 / QL-441: safe, unsigned inspection of isolated ON evidence.

This module is a *non-authoritative diagnostic guard*. It cannot validate Ed25519
signatures, authenticate DESKTOP-AE894KC or issue a GO decision. Production
acceptance requires separate protected and pinned signed-evidence verification.
Never use this as a receiver control endpoint.
"""

from collections.abc import Mapping

MASTERS = ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")
GO = "GO_WITNESS_ACCEPTANCE_ONLY_NO_CONNECT"
NO_GO = "NO_GO_SHUTDOWN_REQUIRED"
ALLOWED = frozenset((GO, NO_GO))
OWNER_ON_ACTION = "AUTHORIZE_BOUNDED_ISOLATED_ON_OBSERVATION_ONLY_NO_CONNECT"
OWNER_GO = "DUAL_OWNER_GO_ACCEPT_WITNESSED_ON_AND_REQUIRE_SHUTDOWN"
OWNER_NO_GO = "DUAL_OWNER_NO_GO_REQUIRE_IMMEDIATE_SHUTDOWN"
QL440_STATUS = "DURABLE_QL440_NEW_CEREMONY_AUTHORIZATION_PREREQUISITES_ACCEPTED"


def hold_ql441(reason: str, *, shutdown_required: bool = True) -> dict:
    """Never infer a safe physical state from a receipt or an unsigned sample."""
    return {
        "accepted": False,
        "reason": reason,
        "decision": "UNVERIFIED_HOLD",
        "connection": "HOLD",
        "activationAuthorized": False,
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "manualReceiverIsolationRequired": True,
        "independentFreshOffRequired": shutdown_required,
        "receiver": "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION",
    }


def read_private_ql441_decision() -> dict:
    """A durable decision on disk is not proof of current ON or OFF."""
    return hold_ql441("QL441_PRIVATE_DECISION_FRESH_OFF_AND_LEASE_CLOSEOUT_REQUIRED")


def inspect_ql441_unsigned(
    prior: Mapping | None,
    challenge: Mapping | None,
    source_owner: Mapping | None,
    master_owner: Mapping | None,
    host_consumption: Mapping | None,
    host_on: Mapping | None,
    independent_on: Mapping | None,
    master_decisions: Mapping | None,
    final_owner_review: Mapping | None,
    now_ms: int,
) -> dict:
    """Reject unsafe claims before *separate* signature and durable custody checks.

    Even fully shape-matching synthetic data remains HOLD. This function must
    never be used to issue GO, mark ON confirmed, or bypass QL-440 protected
    PENDING/ISSUED and QL-441 PENDING/DECISION verification.
    """
    if not isinstance(prior, Mapping) or prior.get("status") != QL440_STATUS:
        return hold_ql441("HOLD_QL440_PROTECTED_ISSUANCE_NOT_VERIFIED")
    if prior.get("connection") != "HOLD" or prior.get("activationAuthorized") is not False:
        return hold_ql441("HOLD_QL440_UNSAFE_PRIOR_STATE")
    if not isinstance(challenge, Mapping):
        return hold_ql441("HOLD_QL441_CHALLENGE_MISSING")
    for name in ("challengeId", "nonce", "leaseId", "ceremonyId", "episodeId"):
        if not isinstance(challenge.get(name), str) or not challenge[name].strip():
            return hold_ql441("HOLD_QL441_CHALLENGE_BINDING_MISSING")
    if challenge["nonce"] == prior.get("ceremonyNonce"):
        return hold_ql441("HOLD_QL441_REPLAYED_NONCE")
    if challenge.get("ceremonyId") != prior.get("ceremonyId") or challenge.get(
        "episodeId"
    ) != prior.get("episodeId"):
        return hold_ql441("HOLD_QL441_PREDECESSOR_DRIFT")
    start = challenge.get("issuedAtMs")
    expires = challenge.get("leaseExpiresAtMs")
    if (
        type(now_ms) is not int
        or type(start) is not int
        or type(expires) is not int
        or expires <= start
        or expires - start > 120_000
        or now_ms < start
        or now_ms >= expires
    ):
        return hold_ql441("HOLD_QL441_LEASE_NOT_CURRENT_OR_TOO_LONG")
    for owner in (source_owner, master_owner):
        if not isinstance(owner, Mapping):
            return hold_ql441("HOLD_QL441_TWO_OWNER_APPROVALS_MISSING")
        if (
            owner.get("action") != OWNER_ON_ACTION
            or owner.get("challengeId") != challenge["challengeId"]
            or owner.get("nonce") != challenge["nonce"]
        ):
            return hold_ql441("HOLD_QL441_OWNER_APPROVAL_INVALID")
    if (
        not source_owner.get("ownerId")
        or not master_owner.get("ownerId")
        or source_owner["ownerId"] == master_owner["ownerId"]
    ):
        return hold_ql441("HOLD_QL441_OWNER_IDENTITIES_NOT_DISTINCT")
    if not isinstance(host_consumption, Mapping):
        return hold_ql441("HOLD_QL441_SIGNED_CONSUMPTION_MISSING")
    if (
        host_consumption.get("hostMachineId") != "DESKTOP-AE894KC"
        or host_consumption.get("watchdogArmed") is not True
        or host_consumption.get("challengeId") != challenge["challengeId"]
        or host_consumption.get("nonce") != challenge["nonce"]
    ):
        return hold_ql441("HOLD_QL441_ORIGINAL_HOST_CONSUMPTION_INVALID")
    if not isinstance(host_on, Mapping) or not isinstance(independent_on, Mapping):
        return hold_ql441("HOLD_QL441_INDEPENDENT_ON_WITNESS_MISSING")
    host_seq = host_on.get("sequence")
    receiver_seq = independent_on.get("sequence")
    if (
        host_on.get("receiverState") != "ON"
        or host_on.get("watchdogArmed") is not True
        or independent_on.get("receiverState") != "ON"
        or type(host_seq) is not int
        or type(receiver_seq) is not int
        or host_seq <= 0
        or receiver_seq < host_seq
        or independent_on.get("hostOnDigest") != host_on.get("signedDigest")
        or not isinstance(host_on.get("signedDigest"), str)
    ):
        return hold_ql441("HOLD_QL441_INDEPENDENT_ON_BINDING_INVALID")
    if not isinstance(master_decisions, Mapping) or set(master_decisions) != set(MASTERS):
        return hold_ql441("HOLD_QL441_THREE_MASTER_DECISIONS_REQUIRED")
    decisions = []
    for master in MASTERS:
        report = master_decisions[master]
        if (
            not isinstance(report, Mapping)
            or report.get("masterId") != master
            or report.get("decision") not in ALLOWED
            or report.get("challengeId") != challenge["challengeId"]
            or report.get("independentOnDigest") != independent_on.get("signedDigest")
        ):
            return hold_ql441("HOLD_QL441_MASTER_REPORT_INVALID")
        decisions.append(report["decision"])
    expected = OWNER_NO_GO if NO_GO in decisions else OWNER_GO
    if (
        not isinstance(final_owner_review, Mapping)
        or final_owner_review.get("action") != expected
        or final_owner_review.get("challengeId") != challenge["challengeId"]
    ):
        return hold_ql441("HOLD_QL441_FINAL_OWNER_REVIEW_INVALID")
    # This only infers the *requested* disposition, not trusted signed evidence.
    return hold_ql441("HOLD_QL441_SIGNATURES_AND_ONE_USE_CUSTODY_NOT_VERIFIED")
