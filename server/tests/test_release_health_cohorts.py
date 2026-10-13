"""Build 063: never confuse fixed log cohorts with physical recovery proof."""

from datetime import UTC, datetime, timedelta
import json

from rosevear_ai_hub.release_health_cohorts import classify_log, operator_evidence

A = "a" * 40
B = "b" * 40
NOW = datetime(2026, 10, 13, 20, 0, tzinfo=UTC)


def evidence_payload(**changes):
    data = {
        "schema_version": 1,
        "baseline_sha": A,
        "candidate_sha": B,
        "schema_revision": "0018",
        "recovery_mode": "same_schema_rollback_readopt",
        "observed_at_utc": NOW.isoformat(),
        "operator_attested": True,
        "steps": {
            "baseline_runtime_health": True,
            "rollback_runtime_health": True,
            "authenticated_browser_acceptance": True,
            "readoption_runtime_health": True,
            "recovery_task_interoperability": True,
            "restorable_encrypted_backup": True,
        },
    }
    data.update(changes)
    return data


def save_evidence(tmp_path, data):
    folder = tmp_path / "logs" / "hub-deployment"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "supervised-recovery-evidence.json").write_text(json.dumps(data))


def test_missing_files_are_read_only_and_unverified(tmp_path):
    before = list(tmp_path.rglob("*"))
    assert classify_log(tmp_path, NOW)["state"] == "unavailable"
    assert operator_evidence(tmp_path, NOW)["status"] == "not_recorded"
    assert list(tmp_path.rglob("*")) == before


def test_cohorts_keep_only_day_outcome_counts_and_not_private_text(tmp_path):
    logs = tmp_path / "logs"
    logs.mkdir()
    (logs / "hub-release-adoption.log").write_text(
        "2026-10-13T19:20:00+00:00 FAILED staging: password=secret details\n"
        "2026-10-13T19:21:00+00:00 HOLD preflight: bearer=private\n"
        "2026-10-12T09:10:00+00:00 ADOPTED activation: good\n"
        "2026-09-21T09:10:00+00:00 FAILED stale: old\n"
        "garbage line contains private host.example\n"
    )
    report = classify_log(tmp_path, NOW)
    assert report["state"] == "partial"
    assert report["events_counted"] == 3
    assert report["unparsed_lines"] == 1
    assert report["days"][0]["counts"]["FAILED"] == 1
    assert "secret" not in json.dumps(report)
    assert "host.example" not in json.dumps(report)


def test_symlink_log_refused(tmp_path):
    logs = tmp_path / "logs"
    logs.mkdir()
    private = tmp_path / "private.log"
    private.write_text("2026-10-13T19:00:00+00:00 ADOPTED x: private\n")
    (logs / "hub-release-adoption.log").symlink_to(private)
    assert classify_log(tmp_path, NOW)["state"] == "unavailable"


def test_large_log_does_not_trust_its_history_as_complete(tmp_path):
    logs = tmp_path / "logs"
    logs.mkdir()
    (logs / "hub-release-adoption.log").write_bytes(
        b"2026-10-13T19:00:00+00:00 ADOPTED stage: x\n" * 4000
    )
    report = classify_log(tmp_path, NOW)
    assert report["history_partial"] is True
    assert report["events_counted"] <= 512


def test_reported_recovery_is_not_machine_verified(tmp_path):
    save_evidence(tmp_path, evidence_payload())
    report = operator_evidence(tmp_path, NOW)
    assert report["status"] == "operator_reported_complete"
    assert report["machine_verified"] is False
    assert report["reported_steps"] == 6
    assert "baseline_sha" not in report
    assert "candidate_sha" not in report


def test_same_sha_stale_missing_flag_and_nonboolean_are_not_accepted(tmp_path):
    save_evidence(tmp_path, evidence_payload(candidate_sha=A))
    assert operator_evidence(tmp_path, NOW)["status"] == "invalid"
    save_evidence(tmp_path, evidence_payload(observed_at_utc=(NOW - timedelta(days=31)).isoformat()))
    assert operator_evidence(tmp_path, NOW)["status"] == "stale"
    save_evidence(tmp_path, evidence_payload(operator_attested=False))
    assert operator_evidence(tmp_path, NOW)["status"] == "operator_reported_incomplete"
    wrong = evidence_payload()
    wrong["steps"]["authenticated_browser_acceptance"] = "true"
    save_evidence(tmp_path, wrong)
    assert operator_evidence(tmp_path, NOW)["status"] == "invalid"
    save_evidence(tmp_path, evidence_payload(schema_revision="0018;DROP TABLE"))
    assert operator_evidence(tmp_path, NOW)["status"] == "invalid"


def test_rejected_oversized_and_linked_attestation(tmp_path):
    save_evidence(tmp_path, evidence_payload())
    path = tmp_path / "logs" / "hub-deployment" / "supervised-recovery-evidence.json"
    path.write_text("X" * 9000)
    assert operator_evidence(tmp_path, NOW)["status"] == "invalid"
    path.unlink()
    other = tmp_path / "private.json"
    other.write_text(json.dumps(evidence_payload()))
    path.symlink_to(other)
    assert operator_evidence(tmp_path, NOW)["status"] == "not_recorded"
