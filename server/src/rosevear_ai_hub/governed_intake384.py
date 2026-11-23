"""Build 384: seven-application source-governed analytics from local receipts only.

Records were verified on ingestion by Builds 365-367. This view does NOT
re-verify remote signatures, fetch peers, certify a currently connected app,
transfer business record authority or expose tenant/customer identifiers.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

from rosevear_ai_hub.live_sources367 import summary367
from rosevear_ai_hub.seven_app_stats365 import APPS, EVENTS, HEX40, MAX_COUNTER
from rosevear_ai_hub.sysop_history366 import FIELDS, _safe_path, summary366

SCHEMA384 = "rosevear.hub.governed-intake384.v1"
FRESH_MS384 = 90_000
DAY_MS384 = 86_400_000
ROLES384 = {
    "ai-data-platform": "master-intelligence",
    "rosevear-ai-hub": "master-original-host",
    "rosevear-comms-hub": "master-communications",
    "yw": "subscription-saas-tenant-authority",
    "icamp": "subscription-saas-tenant-authority",
    "rosiedazzlers": "independent-business-authority",
    "devilndove": "independent-business-authority",
}


def _empty384() -> dict[str, Any]:
    return {
        "schema": SCHEMA384,
        "sourceBuild": 384,
        "status": "HOLD_NOT_ORIGINAL_HOST_OR_UNCONFIGURED",
        "sources": [
            {
                "appId": app,
                "authority": ROLES384[app],
                "status": "HOLD_NO_CORRELATED_TLS_SIGNED_RECEIPT",
                "historicalReceipts": 0,
                "samplesLast24Hours": 0,
                "latestClaimedState": None,
                "latestClaimedAtMs": None,
                "latestMetrics": None,
                "reportedErrorFraction": None,
                "freshSourceReceipt": False,
            }
            for app in APPS
        ],
        "historicalCorrelatedReceipts": 0,
        "freshSignedReceipts": 0,
        "allSevenSourceReceiptsFresh": False,
        "allSevenLiveConnected": False,
        "threeMasterDeliveryAckProven": False,
        "physicalOriginalHostWitnessed": False,
        "commsPrivateReceiverAuthorized": False,
        "mutationAvailable": False,
        "tenantDataExposed": False,
        "measurementBasis": "LOCAL_TLS_AND_ED25519_AT_INGESTION_ONLY",
    }


def _valid_row384(row: sqlite3.Row, now_ms: int) -> dict[str, Any]:
    """Fail whole readback on tamper/unknown source/metrics; never silently skip."""
    app, event_id, commit, issued, observed, state, event_kind, raw, received = row
    if not (
        app in APPS
        and type(event_id) is str
        and 16 <= len(event_id) <= 80
        and HEX40.fullmatch(commit or "") is not None
        and type(issued) is int
        and type(observed) is int
        and type(received) is int
        and 0 <= observed <= issued <= received <= now_ms + 2000
        and now_ms - received <= 7 * DAY_MS384
        and state in ("HEALTHY", "DEGRADED", "UNHEALTHY", "UNKNOWN")
        and event_kind in EVENTS
        and type(raw) is str
        and len(raw) <= 2048
    ):
        raise ValueError("HOLD_GOVERNANCE_CORRELATED_ROW")
    metrics = json.loads(raw)
    if not (
        type(metrics) is dict
        and set(metrics) == set(FIELDS)
        and all(
            val is None or (type(val) is int and 0 <= val <= MAX_COUNTER)
            for val in metrics.values()
        )
    ):
        raise ValueError("HOLD_GOVERNANCE_METRICS_TAMPER")
    requests = metrics["requests"]
    errors = metrics["serverErrors"]
    ratio = round(errors / requests, 4) if requests and errors is not None and errors <= requests else None
    return {
        "appId": app,
        "eventId": event_id,
        "sourceCommit": commit,
        "receivedAtMs": received,
        "observedAtMs": observed,
        "state": state,
        "metrics": metrics,
        "reportedErrorFraction": ratio,
    }


def governed_snapshot384(
    path: Path | None, *, now_ms: int, original_host: bool
) -> dict[str, Any]:
    """Owner-only, no network; double-check both journals before releasing aggregates."""
    result = _empty384()
    if not original_host or path is None or type(now_ms) is not int:
        return result
    if summary366(path, now_ms=now_ms, original_host=True)["journalStatus"] != (
        "LOCAL_SIGNED_CLAIM_HISTORY_ONLY"
    ):
        return {**result, "status": "HOLD_SIGNED_HISTORY_UNVERIFIED"}
    if summary367(path, now_ms=now_ms, original_host=True)["status"] != (
        "LOCAL_TLS_SIGNED_SOURCE_RECEIPTS_ONLY"
    ):
        return {**result, "status": "HOLD_TLS_RECEIPT_JOURNAL_UNVERIFIED"}
    try:
        safe = _safe_path(path, create=False)
        with closing(sqlite3.connect(f"{safe.as_uri()}?mode=ro", uri=True, timeout=3)) as db:
            rows = db.execute(
                """SELECT o.app_id, o.event_id, o.source_commit, o.issued_ms,
                          o.observed_ms, o.state, o.event_kind, o.metrics_json,
                          v.received_ms
                   FROM observations AS o JOIN verified_tls_sources367 AS v
                     ON v.app_id=o.app_id AND v.event_id=o.event_id
                    AND v.source_commit=o.source_commit
                   ORDER BY v.received_ms DESC, o.id DESC LIMIT 2048"""
            ).fetchall()
        seen: set[tuple[str, str]] = set()
        groups: dict[str, list[dict[str, Any]]] = {app: [] for app in APPS}
        for row in rows:
            item = _valid_row384(row, now_ms)
            identifier = (item["appId"], item["eventId"])
            if identifier in seen:
                raise ValueError("HOLD_DUPLICATE_REPLAY")
            seen.add(identifier)
            groups[item["appId"]].append(item)
        sources = []
        for app in APPS:
            records = groups[app]
            last = records[0] if records else None
            fresh = bool(last and 0 <= now_ms - last["receivedAtMs"] <= FRESH_MS384)
            sources.append(
                {
                    "appId": app,
                    "authority": ROLES384[app],
                    "status": (
                        "RECENT_AUTHENTICATED_SOURCE_RECEIPT_NOT_LIVE_CERTIFICATION"
                        if fresh
                        else "STALE_HISTORICAL_SOURCE_RECEIPT"
                        if last
                        else "HOLD_NO_CORRELATED_TLS_SIGNED_RECEIPT"
                    ),
                    "historicalReceipts": len(records),
                    "samplesLast24Hours": sum(
                        0 <= now_ms - x["receivedAtMs"] <= DAY_MS384 for x in records
                    ),
                    "latestClaimedState": last["state"] if last else None,
                    "latestClaimedAtMs": last["observedAtMs"] if last else None,
                    "latestMetrics": last["metrics"] if last else None,
                    "reportedErrorFraction": last["reportedErrorFraction"] if last else None,
                    "freshSourceReceipt": fresh,
                }
            )
        return {
            **result,
            "status": "GOVERNED_HISTORICAL_TLS_SIGNED_RECEIPTS_ONLY",
            "sources": sources,
            "historicalCorrelatedReceipts": len(rows),
            "freshSignedReceipts": sum(x["freshSourceReceipt"] for x in sources),
            "allSevenSourceReceiptsFresh": all(x["freshSourceReceipt"] for x in sources),
        }
    except (OSError, ValueError, sqlite3.Error, TypeError, KeyError, IndexError):
        return {**result, "status": "HOLD_GOVERNED_JOURNAL_INTEGRITY"}
