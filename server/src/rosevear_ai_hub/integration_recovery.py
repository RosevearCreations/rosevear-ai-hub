"""Build 066: safe, guided integration recovery and operator acceptance evidence.

Read a small, local, optional operator self-report; never probe network services,
accept operator notes, echo secrets, alter machine settings or certify recovery.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from rosevear_ai_hub.incident_follow_up import INTEGRATIONS
from rosevear_ai_hub.release_health_cohorts import _safe_regular, parse_utc

CHECKS = ("service_reachable", "authenticated_read", "expected_data_visible")
STATUSES = ("investigating", "blocked", "operator_reported_working")
MAX_BYTES = 8192
MAX_AGE = timedelta(days=14)
GUIDANCE = {
    "home_assistant": (
        "Confirm the Home Assistant virtual machine is powered on.",
        "Check the Hub's saved Home Assistant URL and token locally; do not share them.",
        "Refresh Home Assistant and confirm the expected entities are visible.",
    ),
    "mqtt": (
        "Confirm the MQTT broker or Home Assistant add-on is running.",
        "Check the Hub's broker host, port, TLS and credentials locally.",
        "Refresh the MQTT page and confirm its broker status is online.",
    ),
    "ollama": (
        "Confirm the local Ollama service is running on the intended machine.",
        "Check its local API reachability using the Hub's Ollama page.",
        "Confirm an expected installed model is listed and usable.",
    ),
    "frigate": (
        "Confirm the Frigate service is running and its local address is configured.",
        "Inspect the local Frigate connection without sharing camera credentials.",
        "Confirm expected camera events or a clear empty-event state in the Hub.",
    ),
    "go2rtc": (
        "Confirm at least one camera is registered in the Hub when cameras are expected.",
        "Check go2rtc transport health and saved stream configuration.",
        "Confirm a known stream is healthy before reporting working.",
    ),
}


def integration_acceptance(root: Path, now: datetime | None = None) -> dict:
    """Return only fixed-field, non-authoritative evidence and safe guidance."""
    now = now or datetime.now(UTC)
    path = root / "logs" / "hub-deployment" / "integration-acceptance.json"
    state = "not_recorded"
    entries: dict[str, dict] = {}
    if _safe_regular(path):
        try:
            if path.stat().st_size > MAX_BYTES:
                raise ValueError("too large")
            payload = json.loads(path.read_text(encoding="utf-8-sig"))
            if (
                not isinstance(payload, dict)
                or set(payload) != {"schema_version", "reviews"}
                or type(payload["schema_version"]) is not int
                or payload["schema_version"] != 1
            ):
                raise ValueError("invalid schema")
            reviews = payload["reviews"]
            if not isinstance(reviews, list) or len(reviews) > len(INTEGRATIONS):
                raise ValueError("invalid review count")
            for review in reviews:
                if not isinstance(review, dict) or set(review) != {
                    "integration",
                    "status",
                    "checks",
                    "observed_at_utc",
                }:
                    raise ValueError("invalid review fields")
                name = review["integration"]
                if not isinstance(name, str) or name not in INTEGRATIONS or name in entries:
                    raise ValueError("duplicate/unknown integration")
                status = review["status"]
                checks = review["checks"]
                stamp = parse_utc(review["observed_at_utc"])
                if (
                    not isinstance(status, str)
                    or status not in STATUSES
                    or not isinstance(checks, dict)
                    or set(checks) != set(CHECKS)
                    or not all(type(checks[check]) is bool for check in CHECKS)
                    or stamp is None
                    or stamp > now + timedelta(minutes=5)
                    or (status == "operator_reported_working" and not all(checks.values()))
                ):
                    raise ValueError("invalid acceptance")
                entries[name] = {
                    "status": "stale" if stamp < now - MAX_AGE else status,
                    "completed_checks": sum(checks.values()),
                    "last_review_utc": stamp.isoformat(),
                }
            state = "operator_reported" if reviews else "empty"
        except (OSError, UnicodeError, ValueError, TypeError):
            entries = {}
            state = "invalid"
    elif path.is_symlink():
        state = "invalid"

    rows = []
    for name in INTEGRATIONS:
        row = entries.get(name, {})
        rows.append(
            {
                "integration": name,
                "status": row.get("status", "not_recorded"),
                "completed_checks": row.get("completed_checks", 0),
                "required_checks": len(CHECKS),
                "last_review_utc": row.get("last_review_utc"),
                "steps": list(GUIDANCE[name]),
                "machine_verified": False,
            }
        )
    return {
        "scope": "operator_self_report",
        "ledger_state": state,
        "integrations": rows,
        "machine_verified": False,
        "automatic_recovery": False,
        "explanation": (
            "Operator reports are not live probes. Verify the actual Windows "
            "process, connectivity and expected data separately."
        ),
    }
