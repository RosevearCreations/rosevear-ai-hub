"""Build 064 privacy-safe, fail-closed release incident continuity tests."""

import json
from datetime import UTC, datetime, timedelta

from rosevear_ai_hub.release_incident_triage import classify_incidents, incident_reviews

NOW = datetime(2026, 10, 13, 20, tzinfo=UTC)


def test_repeat_days_not_confused_with_distinct_incidents():
    cohorts = {
        "state": "available",
        "history_partial": False,
        "days": [
            {"counts": {"FAILED": 2, "HOLD": 1, "ROLLED_BACK": 1}},
            {"counts": {"FAILED": 1, "HOLD": 0, "ROLLED_BACK": 0}},
        ],
    }
    result = classify_incidents(cohorts, {"status": "not_recorded"})
    groups = {g["category"]: g for g in result["groups"]}
    assert groups["adoption_failure"]["observed_events"] == 3
    assert groups["adoption_failure"]["recurring_across_days"] is True
    assert groups["adoption_hold"]["recurring_across_days"] is False
    assert result["no_automatic_incident_closure"] is True
    assert result["recovery_follow_up"] == "needs_operator_review"


def test_missing_or_partial_history_never_reports_certainty():
    report = classify_incidents({"state": "unavailable", "days": []}, {})
    assert report["observation"] == "partial"
    assert report["groups"][0]["observed_events"] == 0
    assert "may include repeats" in report["explanation"]


def test_no_private_notes_or_references_are_returned(tmp_path):
    folder = tmp_path / "logs" / "hub-deployment"
    folder.mkdir(parents=True)
    (folder / "release-incident-reviews.json").write_text(json.dumps({
        "schema_version": 1,
        "reviews": [
            {
                "reference": "review-1",
                "category": "adoption_failure",
                "status": "investigating",
                "reviewed_at_utc": NOW.isoformat(),
                "notes": "password=SECRET and private home IP 192.168.2.1",
            }
        ],
    }))
    before = list(tmp_path.rglob("*"))
    result = incident_reviews(tmp_path, NOW)
    assert result["state"] == "operator_reported"
    assert result["investigating_records"] == 1
    assert result["authoritative"] is False
    assert "SECRET" not in json.dumps(result)
    assert "192.168" not in json.dumps(result)
    assert list(tmp_path.rglob("*")) == before


def test_invalid_or_stale_review_is_rejected(tmp_path):
    folder = tmp_path / "logs" / "hub-deployment"
    folder.mkdir(parents=True)
    path = folder / "release-incident-reviews.json"
    path.write_text("{unreadable")
    assert incident_reviews(tmp_path, NOW)["state"] == "invalid"
    record = {
        "reference": "review-1",
        "category": "adoption_failure",
        "status": "open",
        "reviewed_at_utc": (NOW - timedelta(days=91)).isoformat(),
    }
    path.write_text(json.dumps({"schema_version": 1, "reviews": [record]}))
    assert incident_reviews(tmp_path, NOW)["state"] == "invalid"
    record["reviewed_at_utc"] = NOW.isoformat()
    path.write_text(json.dumps({"schema_version": 1, "reviews": [record, record]}))
    assert incident_reviews(tmp_path, NOW)["state"] == "invalid"


def test_absent_review_is_read_only(tmp_path):
    before = list(tmp_path.rglob("*"))
    assert incident_reviews(tmp_path)["state"] == "not_recorded"
    assert list(tmp_path.rglob("*")) == before
