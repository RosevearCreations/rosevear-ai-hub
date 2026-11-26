"""Advisory infrastructure health, derived from revalidated Build 390 receipts."""

import hashlib
import json
import sqlite3
from contextlib import closing
from pathlib import Path

from rosevear_ai_hub.runtime_drift390 import FRESH_MS, MASTERS390, safe_path390, snapshot390

MAX_ESCALATIONS = 10000

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
            observed is not None and (type(observed) is not int or not 0 <= observed <= now_ms)
        ):
            raise ValueError("HOLD_INVALID_OBSERVATION")
        remaining = max(0, FRESH_MS - (now_ms - observed)) if observed is not None else None
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


def _scope391(pins, targets):
    payload = json.dumps([pins, targets], sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()


def reconcile391(
    source_path: Path,
    queue_path: Path,
    *,
    pins: dict[str, str],
    targets: dict[str, str],
    now_ms: int,
    loaded_hub_sha: str | None,
) -> dict:
    """One bounded local evaluation. No network, command execution or delivery claim."""
    source_path = safe_path390(source_path)
    queue_path = safe_path390(queue_path)
    if source_path == queue_path:
        raise ValueError("HOLD_DISTINCT_ESCALATION_LEDGER_REQUIRED")
    source = snapshot390(
        source_path, pins=pins, targets=targets, now_ms=now_ms, loaded_hub_sha=loaded_hub_sha
    )
    report = forecast391(source, now_ms=now_ms)
    scope = _scope391(pins, targets)
    count = 0
    with closing(sqlite3.connect(queue_path, timeout=5)) as db, db:
        db.execute("BEGIN IMMEDIATE")
        db.execute(
            """CREATE TABLE IF NOT EXISTS escalation391 (
                id INTEGER PRIMARY KEY, scope TEXT NOT NULL, source TEXT NOT NULL,
                priority TEXT NOT NULL, status TEXT NOT NULL, sequence INTEGER,
                recorded INTEGER NOT NULL, UNIQUE(id))"""
        )
        for row, raw in zip(report["sources"], source["sources"], strict=True):
            last = db.execute(
                "SELECT priority,status,sequence FROM escalation391 "
                "WHERE scope=? AND source=? ORDER BY id DESC LIMIT 1",
                (scope, row["source"]),
            ).fetchone()
            # A stale stream cannot generate unbounded per-receipt escalation records.
            # Retain the first sequence at each state transition for audit.
            if last and last[:2] == (row["priority"], row["status"]):
                continue
            if (
                last
                and last[2] is not None
                and (raw["sequence"] is None or raw["sequence"] < last[2])
            ):
                raise ValueError("HOLD_ESCALATION_EVIDENCE_REGRESSED")
            if db.execute("SELECT COUNT(*) FROM escalation391").fetchone()[0] >= MAX_ESCALATIONS:
                raise ValueError("HOLD_ESCALATION_CAPACITY")
            db.execute(
                "INSERT INTO escalation391 (scope,source,priority,status,sequence,recorded) "
                "VALUES (?,?,?,?,?,?)",
                (scope, row["source"], row["priority"], row["status"], raw["sequence"], now_ms),
            )
            count += 1
    return {"recordedTransitions": count, "externalDeliveryVerified": False}


def read_queue391(queue_path: Path, *, pins: dict[str, str], targets: dict[str, str]) -> list[dict]:
    """Read limited advisory transition history; not signed field evidence."""
    queue_path = safe_path390(queue_path)
    if not queue_path.exists():
        return []
    with closing(sqlite3.connect(queue_path.as_uri() + "?mode=ro", uri=True, timeout=5)) as db:
        rows = db.execute(
            "SELECT id,source,priority,status,sequence,recorded FROM escalation391 "
            "WHERE scope=? ORDER BY id DESC LIMIT 100",
            (_scope391(pins, targets),),
        ).fetchall()
    return [
        {
            "id": event_id,
            "source": source,
            "priority": priority,
            "status": status,
            "sequence": sequence,
            "recordedAtMs": recorded,
        }
        for event_id, source, priority, status, sequence, recorded in rows
        if source in MASTERS390 and status in KNOWN
    ]
