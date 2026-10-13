"""Build 065: bounded incident follow-up routing and integration diagnostics.

Suggestions only; no probing, restarts, alerts, writes, or automatic closure.
Never include local addresses, credentials, raw exception strings or identifiers.
"""

from __future__ import annotations

CATEGORIES = ("adoption_failure", "adoption_hold", "recovery_incident")
ROUTES = {
    "adoption_failure": ("release_operator", "inspect_release_log_and_process_identity"),
    "adoption_hold": ("release_operator", "review_readiness_and_pending_approval"),
    "recovery_incident": ("recovery_operator", "verify_rollback_and_encrypted_backup"),
}
INTEGRATIONS = ("home_assistant", "mqtt", "ollama", "frigate", "go2rtc")
STATES = ("healthy", "degraded", "unavailable", "not_configured", "unknown")


def follow_up_routes(triage: dict, reviews: dict) -> dict:
    """Convert aggregated incident counts to safe, non-authoritative next steps."""
    rows = triage.get("groups", []) if isinstance(triage, dict) else []
    counts = {}
    if isinstance(rows, list):
        for row in rows[:20]:
            if not isinstance(row, dict):
                continue
            key, value = row.get("category"), row.get("observed_events")
            if key in CATEGORIES and type(value) is int and 0 <= value <= 100000:
                counts[key] = max(counts.get(key, 0), value)
    items = [
        {
            "category": category,
            "observed_events": counts.get(category, 0),
            "owner_role": ROUTES[category][0],
            "next_action": ROUTES[category][1],
            "requires_operator_confirmation": True,
        }
        for category in CATEGORIES
    ]
    partial = triage.get("observation") != "sampled" if isinstance(triage, dict) else True
    open_count = reviews.get("open_records", 0) if isinstance(reviews, dict) else 0
    investigating = reviews.get("investigating_records", 0) if isinstance(reviews, dict) else 0
    open_count = open_count if type(open_count) is int and 0 <= open_count <= 20 else 0
    investigating = investigating if type(investigating) is int and 0 <= investigating <= 20 else 0
    return {
        "scope": "local_advisory_only",
        "observation": "partial" if partial else "sampled",
        "routing": items,
        "pending_operator_reviews": open_count + investigating,
        "automatic_actions_permitted": False,
        "closure_verified": False,
    }


def integration_diagnostics(observations: dict | None = None) -> dict:
    """Allow only named integrations and fixed status values; do not echo input."""
    observations = observations if isinstance(observations, dict) else {}
    result = []
    for name in INTEGRATIONS:
        state = observations.get(name)
        if not isinstance(state, str) or state not in STATES:
            state = "unknown"
        result.append({
            "integration": name,
            "state": state,
            "next_action": (
                "none" if state == "healthy"
                else "review_local_configuration" if state == "not_configured"
                else "inspect_local_service_health"
            ),
            "live_probe_performed": False,
        })
    return {
        "scope": "operator_supplied_status_only",
        "integrations": result,
        "credentials_read": False,
        "live_probe_performed": False,
        "automatic_remediation": False,
    }
