"""Build 064 — read-only release incident triage and follow-up continuity.

Classify already-sanitized daily cohort counts. Optional operator review is local,
non-authoritative, and does not close a real failure or trigger machine actions.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from rosevear_ai_hub.release_health_cohorts import _safe_regular, parse_utc

CATEGORY_STATES = {
    "adoption_failure": ("FAILED",),
    "adoption_hold": ("HOLD",),
    "recovery_incident": ("ROLLED_BACK", "ROLLBACK_FAILED"),
}
REVIEW_STATES = {"open", "investigating", "operator_reported_resolved"}
MAX_RECORDS = 20


def classify_incidents(cohorts: dict, recovery: dict) -> dict:
    """Use only fixed counters; never infer incident identity from a log line."""
    buckets: list[dict] = []
    days = cohorts.get("days", [])
    for category, outcomes in CATEGORY_STATES.items():
        count, affected_days = 0, 0
        for day in days if isinstance(days, list) else []:
            values = day.get("counts", {}) if isinstance(day, dict) else {}
            if not isinstance(values, dict):
                continue
            hits = 0
            for key in outcomes:
                value = values.get(key)
                if type(value) is int and value >= 0:
                    hits += value
            count += hits
            affected_days += int(hits > 0)
        buckets.append({
            "category": category,
            "observed_events": count,
            "affected_days": affected_days,
            "recurring_across_days": affected_days >= 2,
        })
    partial = cohorts.get("state") != "available" or bool(cohorts.get("history_partial"))
    recovery_incomplete = recovery.get("status") != "operator_reported_complete"
    return {
        "scope": "bounded_local_history",
        "observation": "partial" if partial else "sampled",
        "groups": buckets,
        "recovery_follow_up": (
            "needs_operator_review" if recovery_incomplete else "operator_reported"
        ),
        "no_automatic_incident_closure": True,
        "explanation": (
            "Daily counts may include repeats of one incident. A complete operator report "
            "does not prove real device recovery; verify on Windows."
        ),
    }


def incident_reviews(root: Path, now: datetime | None = None) -> dict:
    """Read private, strictly typed review records without exposing notes/IDs."""
    empty = {
        "state": "not_recorded",
        "reviewed_records": 0,
        "open_records": 0,
        "investigating_records": 0,
        "operator_reported_resolved_records": 0,
        "latest_review_utc": None,
        "authoritative": False,
    }
    path = root / "logs" / "hub-deployment" / "release-incident-reviews.json"
    if not _safe_regular(path):
        return empty
    try:
        if path.stat().st_size > 12288:
            return {**empty, "state": "invalid"}
        content = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, UnicodeError, ValueError):
        return {**empty, "state": "invalid"}
    if not isinstance(content, dict) or content.get("schema_version") != 1:
        return {**empty, "state": "invalid"}
    entries = content.get("reviews")
    if not isinstance(entries, list) or len(entries) > MAX_RECORDS:
        return {**empty, "state": "invalid"}
    now = now or datetime.now(UTC)
    statuses: list[str] = []
    timestamps: list[datetime] = []
    seen: set[str] = set()
    for entry in entries:
        if not isinstance(entry, dict):
            return {**empty, "state": "invalid"}
        key = entry.get("reference")
        status = entry.get("status")
        category = entry.get("category")
        when = parse_utc(entry.get("reviewed_at_utc"))
        if (
            not isinstance(key, str)
            or len(key) > 48
            or not key.isascii()
            or not key.replace("-", "").isalnum()
            or key in seen
            or category not in CATEGORY_STATES
            or status not in REVIEW_STATES
            or when is None
            or not now - timedelta(days=90) <= when <= now + timedelta(minutes=5)
        ):
            return {**empty, "state": "invalid"}
        seen.add(key)
        statuses.append(status)
        timestamps.append(when)
    return {
        "state": "operator_reported" if entries else "empty",
        "reviewed_records": len(entries),
        "open_records": statuses.count("open"),
        "investigating_records": statuses.count("investigating"),
        "operator_reported_resolved_records": statuses.count("operator_reported_resolved"),
        "latest_review_utc": max(timestamps).isoformat() if timestamps else None,
        "authoritative": False,
    }
