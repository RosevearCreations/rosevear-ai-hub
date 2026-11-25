"""Advisory infrastructure health, derived from revalidated Build 390 receipts."""

from rosevear_ai_hub.runtime_drift390 import FRESH_MS, MASTERS390

WARNING_MS = 120000
CORRELATION_MS = 120000
OPEN = {
    "OPEN_DEPLOYMENT_DRIFT",
    "OPEN_REPORTED_UNHEALTHY",
    "HOLD_LOCAL_LOADED_SHA_MISMATCH",
}
KNOWN = OPEN | {
    "HOLD_NO_SIGNED_RUNTIME",
    "HOLD_STALE_RUNTIME",
    "HOLD_RECOVERY_CONFIRMATION",
    "ALIGNED_SOURCE_REPORTED",
    "RECOVERY_SOURCE_REPORTED",
}


def forecast391(report: dict, *, now_ms: int) -> dict:
    """Deterministic freshness forecasts, not learned failure probabilities."""
    rows = report.get("sources", [])
    if (
        len(rows) != 3
        or {row["source"] for row in rows} != set(MASTERS390)
        or report.get("independentThreeMasterAcceptance") is not False
        or report.get("remoteRecoveryExecuted") is not False
        or report.get("receiverActivationAuthorized") is not False
    ):
        raise ValueError("HOLD_UNVERIFIED_UPSTREAM_CONTRACT")
    forecasts = []
    active = []
    for row in rows:
        state = row["status"]
        observed = row["observedAtMs"]
        if state not in KNOWN or (
            observed is not None
            and (type(observed) is not int or not 0 <= observed <= now_ms)
        ):
            raise ValueError("HOLD_INVALID_OBSERVATION")
        remaining = (
            max(0, FRESH_MS - (now_ms - observed)) if observed is not None else None
        )
        if state in OPEN:
            level = "ESCALATE_REVIEW"
            if observed is not None and remaining:
                active.append((row["source"], observed))
        elif remaining is None or remaining == 0 or state == "HOLD_STALE_RUNTIME":
            level = "EVIDENCE_UNAVAILABLE"
        elif state == "HOLD_RECOVERY_CONFIRMATION":
            level = "VERIFY_RECOVERY"
        elif remaining <= WARNING_MS:
            level = "FRESHNESS_EXPIRING"
        else:
            level = "MONITOR"
        forecasts.append(
            {
                "source": row["source"],
                "status": state,
                "priority": level,
                "evidenceFreshnessRemainingMs": remaining,
                "recommendedAction": {
                    "ESCALATE_REVIEW": "REVIEW_APPROVED_RELEASE_AND_SIGNED_RUNTIME",
                    "EVIDENCE_UNAVAILABLE": "VERIFY_SOURCE_RECEIPT_DELIVERY",
                    "VERIFY_RECOVERY": "AWAIT_FRESH_SIGNED_RECOVERY_CONFIRMATION",
                    "FRESHNESS_EXPIRING": "CHECK_APPROVED_SOURCE_EMITTER",
                    "MONITOR": "CONTINUE_APPROVED_MONITORING",
                }[level],
            }
        )
    clusters = [
        [left[0], right[0]]
        for i, left in enumerate(active)
        for right in active[i + 1 :]
        if abs(left[1] - right[1]) <= CORRELATION_MS
    ]
    return {
        "schema": "rosevear.hub.runtime-resilience391.v1",
        "sources": forecasts,
        "temporalIncidentPairs": clusters,
        "sharedRootCauseVerified": False,
        "failureProbabilityEstimated": False,
        "independentOperationalResilienceVerified": False,
        "recoveryExecutionAuthorized": False,
        "receiverActivationAuthorized": False,
    }
