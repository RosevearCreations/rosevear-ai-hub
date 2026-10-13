"""Build 061: metadata-only release acceptance is conservative and secret-free."""

import importlib.util
import json
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "scripts/hub_release_assurance.py"
sys.path.insert(0, str(SCRIPT.parent))
spec = importlib.util.spec_from_file_location("hub_release_assurance", SCRIPT)
assurance = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assurance)

A = "a" * 40
B = "b" * 40


def prepared():
    active = {"sha": B}
    journal = {"phase": "committed", "previous": A, "candidate": B}
    candidate = {"sha": B, "tests_passed": True, "schema_revision": "0018"}
    previous = {"sha": A, "tests_passed": True, "schema_revision": "0018"}
    return active, journal, candidate, previous


def test_perfect_metadata_never_claims_live_ready_or_rollback_proven():
    report = assurance.assess(*prepared(), "0018", True, True)
    assert report["status"] == "REVIEW_REQUIRED"
    assert report["checks"]["distinct_same_schema_fallback"] == "PASS"
    assert report["checks"]["live_failover_and_readoption_rehearsal"] == "UNVERIFIED"
    assert report["checks"]["windows_scheduled_task_configuration"] == "UNVERIFIED"
    assert report["operations_performed"] == "none"


def test_schema_mismatch_blocks_even_when_main_and_live_backend_would_match():
    report = assurance.assess(*prepared(), "0017", True, True)
    assert report["checks"]["live_schema_alignment"] == "HOLD"


def test_same_sha_does_not_count_as_distinct_rollback():
    active, journal, candidate, previous = prepared()
    journal["previous"] = B
    previous["sha"] = B
    report = assurance.assess(active, journal, candidate, previous, "0018", True, True)
    assert report["checks"]["distinct_same_schema_fallback"] == "HOLD"


def test_interrupted_journal_blocks_release_acceptance():
    active, journal, candidate, previous = prepared()
    journal["phase"] = "activating"
    report = assurance.assess(active, journal, candidate, previous, "0018", True, True)
    assert report["checks"]["recovery_journal"] == "HOLD"
    assert report["checks"]["distinct_same_schema_fallback"] == "HOLD"


def test_wrong_previous_schema_or_missing_backups_block():
    active, journal, candidate, previous = prepared()
    previous["schema_revision"] = "0017"
    report = assurance.assess(active, journal, candidate, previous, "0018", False, False)
    assert report["checks"]["distinct_same_schema_fallback"] == "HOLD"
    assert report["checks"]["private_backup_key_present"] == "HOLD"
    assert report["checks"]["fresh_archive_hash_and_prior_restore_evidence"] == "HOLD"


def test_bad_sha_and_arbitrary_metadata_are_rejected():
    active, journal, candidate, previous = prepared()
    active["sha"] = "../sneaky"
    report = assurance.assess(active, journal, candidate, previous, "0018", True, True)
    assert report["managed_release"] is None
    assert report["checks"]["retained_release_metadata"] == "HOLD"


def test_read_only_collect_never_creates_files_or_dirs(tmp_path):
    before = list(tmp_path.rglob("*"))
    report = assurance.collect(tmp_path)
    assert report["status"] == "REVIEW_REQUIRED"
    assert report["checks"]["managed_release_pointer"] == "HOLD"
    assert list(tmp_path.rglob("*")) == before


def test_collect_uses_only_valid_pointer_files_and_does_not_expose_private_values(
    tmp_path, monkeypatch
):
    home = tmp_path / "logs/hub-deployment"
    (home / "releases" / A).mkdir(parents=True)
    (home / "releases" / B).mkdir(parents=True)
    (home / "active.json").write_text(json.dumps({"sha": B, "secret": "SENSITIVE"}))
    (home / "activation.json").write_text(
        json.dumps({"phase": "committed", "previous": A, "candidate": B})
    )
    for slot in (A, B):
        (home / "releases" / slot / "release.json").write_text(
            json.dumps({"sha": slot, "tests_passed": True, "schema_revision": "0018"})
        )
    monkeypatch.setattr(assurance, "database_revision", lambda root: "0018")
    report = assurance.collect(tmp_path)
    assert report["checks"]["managed_release_pointer"] == "PASS"
    assert report["checks"]["distinct_same_schema_fallback"] == "PASS"
    assert "SENSITIVE" not in json.dumps(report)


def test_malformed_json_fails_closed(tmp_path):
    path = tmp_path / "active.json"
    path.write_text("{incomplete")
    assert assurance.safe_json(path) == {}
    assert assurance.sha("not_a_sha") is None
