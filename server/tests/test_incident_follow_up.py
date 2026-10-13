"""Build 065 advisory-only follow-up and integration diagnostics tests."""

import json

from rosevear_ai_hub.incident_follow_up import (
    follow_up_routes,
    integration_diagnostics,
)


def test_follow_up_is_bounded_and_requires_operator():
    result = follow_up_routes(
        {
            "observation": "sampled",
            "groups": [
                {"category": "adoption_failure", "observed_events": 3},
                {"category": "recovery_incident", "observed_events": 1},
                {"category": "adoption_hold", "observed_events": -500},
            ],
        },
        {"open_records": 2, "investigating_records": 1},
    )
    assert result["pending_operator_reviews"] == 3
    assert result["routing"][0]["observed_events"] == 3
    assert result["routing"][1]["observed_events"] == 0
    assert result["automatic_actions_permitted"] is False
    assert result["closure_verified"] is False
    assert all(item["requires_operator_confirmation"] for item in result["routing"])


def test_unknown_evidence_does_not_prove_health():
    report = follow_up_routes({}, {})
    assert report["observation"] == "partial"
    assert report["pending_operator_reviews"] == 0
    assert not report["closure_verified"]
    diagnostics = integration_diagnostics()
    assert all(item["state"] == "unknown" for item in diagnostics["integrations"])
    assert not diagnostics["live_probe_performed"]


def test_diagnostics_do_not_leak_untrusted_values():
    private = "secret=token and 192.168.1.2"
    diagnostics = integration_diagnostics(
        {"mqtt": private, "ollama": "healthy", "password": private}
    )
    assert private not in json.dumps(diagnostics)
    assert diagnostics["integrations"][1]["state"] == "unknown"
    assert diagnostics["integrations"][2]["state"] == "healthy"
    assert diagnostics["credentials_read"] is False
    assert diagnostics["automatic_remediation"] is False
