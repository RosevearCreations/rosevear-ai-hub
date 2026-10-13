"""Build 066: operator evidence remains private, bounded and non-authoritative."""

import json
from datetime import UTC, datetime, timedelta

from rosevear_ai_hub.integration_recovery import integration_acceptance
from rosevear_ai_hub.release_observability import collect_release_observability

NOW = datetime(2026, 10, 13, 22, tzinfo=UTC)
CHECKS = {
    "service_reachable": True,
    "authenticated_read": True,
    "expected_data_visible": True,
}


def _record(tmp_path, reviews):
    folder = tmp_path / "logs" / "hub-deployment"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / "integration-acceptance.json"
    path.write_text(json.dumps({"schema_version": 1, "reviews": reviews}), encoding="utf-8")
    return path


def _review(name="mqtt", status="operator_reported_working", **overrides):
    return {
        "integration": name,
        "status": status,
        "checks": {**CHECKS, **overrides},
        "observed_at_utc": NOW.isoformat(),
    }


def test_absent_evidence_is_unknown_and_never_machine_verified(tmp_path):
    before = list(tmp_path.rglob("*"))
    report = integration_acceptance(tmp_path, NOW)
    assert report["ledger_state"] == "not_recorded"
    assert len(report["integrations"]) == 5
    assert all(item["status"] == "not_recorded" for item in report["integrations"])
    assert all(item["steps"] for item in report["integrations"])
    assert report["automatic_recovery"] is False
    assert report["machine_verified"] is False
    assert list(tmp_path.rglob("*")) == before


def test_complete_self_report_is_not_live_acceptance(tmp_path):
    _record(tmp_path, [_review()])
    report = integration_acceptance(tmp_path, NOW)
    mqtt = next(x for x in report["integrations"] if x["integration"] == "mqtt")
    assert report["ledger_state"] == "operator_reported"
    assert mqtt["status"] == "operator_reported_working"
    assert mqtt["completed_checks"] == mqtt["required_checks"] == 3
    assert mqtt["machine_verified"] is False
    assert report["machine_verified"] is False


def test_incomplete_working_report_and_injected_notes_fail_closed(tmp_path):
    path = _record(tmp_path, [_review(expected_data_visible=False)])
    assert integration_acceptance(tmp_path, NOW)["ledger_state"] == "invalid"
    injected = _review()
    injected["notes"] = "secret=hidden private=192.168.1.10"
    path.write_text(json.dumps({"schema_version": 1, "reviews": [injected]}))
    report = integration_acceptance(tmp_path, NOW)
    assert report["ledger_state"] == "invalid"
    assert "secret" not in json.dumps(report)
    assert "192.168." not in json.dumps(report)


def test_old_and_duplicate_or_oversize_records(tmp_path):
    item = _review()
    item["observed_at_utc"] = (NOW - timedelta(days=15)).isoformat()
    path = _record(tmp_path, [item])
    assert integration_acceptance(tmp_path, NOW)["integrations"][1]["status"] == "stale"
    path.write_text(json.dumps({"schema_version": 1, "reviews": [item, item]}))
    assert integration_acceptance(tmp_path, NOW)["ledger_state"] == "invalid"
    path.write_text("x" * 8193)
    assert integration_acceptance(tmp_path, NOW)["ledger_state"] == "invalid"


def test_release_snapshot_safely_includes_acceptance(tmp_path, monkeypatch):
    _record(tmp_path, [_review(name="home_assistant", status="investigating")])
    monkeypatch.setattr(
        "rosevear_ai_hub.release_observability.task_evidence",
        lambda root: {
            "adoption_task": "unavailable",
            "recovery_task": "unavailable",
            "event_610": "unavailable",
        },
    )
    report = collect_release_observability(tmp_path)
    assert report["integration_recovery"]["integrations"][0]["status"] == "investigating"
    assert report["integration_recovery"]["machine_verified"] is False
    assert report["enrollment_ready"] is False


def test_refuses_symlinked_evidence(tmp_path):
    path = _record(tmp_path, [_review()])
    alternate = path.with_name("other.json")
    path.rename(alternate)
    path.symlink_to(alternate)
    result = integration_acceptance(tmp_path, NOW)
    assert result["ledger_state"] == "invalid"
