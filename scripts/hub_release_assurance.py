"""Read-only Build 061 Windows release acceptance report.

No service stop, migration, secret reading, network access, scheduler changes,
restore, or dependency installation. A report is not a live rollback drill.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from pathlib import Path

from hub_release_manager import Refusal, database_revision, verify_backup

SHA = re.compile(r"^[0-9a-f]{40}$")
PASS = "PASS"
HOLD = "HOLD"
UNVERIFIED = "UNVERIFIED"


def safe_json(path: Path) -> dict:
    """Never follow a link or emit untrusted file contents."""
    if path.is_symlink() or not path.is_file():
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError, UnicodeError):
        return {}
    return value if isinstance(value, dict) else {}


def sha(value: object) -> str | None:
    return value if isinstance(value, str) and SHA.fullmatch(value) else None


def assess(
    active: dict,
    journal: dict,
    candidate: dict,
    previous: dict,
    actual_schema: str | None,
    backup_provisioned: bool,
    backup_verified: bool,
) -> dict:
    """Classify trusted metadata without claiming operator or device acceptance."""
    current = sha(active.get("sha"))
    prior = sha(journal.get("previous"))
    phase = journal.get("phase")
    release_ok = (
        bool(current)
        and candidate.get("sha") == current
        and candidate.get("tests_passed") is True
        and bool(candidate.get("schema_revision"))
    )
    schema_ok = release_ok and actual_schema == candidate.get("schema_revision")
    journal_ok = (
        phase == "committed"
        and journal.get("candidate") == current
        and bool(prior)
        and prior != current
    )
    rollback_eligible = (
        journal_ok
        and previous.get("sha") == prior
        and previous.get("tests_passed") is True
        and previous.get("schema_revision") == candidate.get("schema_revision")
    )
    checks = {
        "managed_release_pointer": PASS if current else HOLD,
        "retained_release_metadata": PASS if release_ok else HOLD,
        "live_schema_alignment": PASS if schema_ok else HOLD,
        "recovery_journal": PASS if journal_ok else HOLD,
        "distinct_same_schema_fallback": PASS if rollback_eligible else HOLD,
        "private_backup_key_present": PASS if backup_provisioned else HOLD,
        "fresh_archive_hash_and_prior_restore_evidence": PASS if backup_verified else HOLD,
        "real_runtime_and_browser_acceptance": UNVERIFIED,
        "live_failover_and_readoption_rehearsal": UNVERIFIED,
        "separate_machine_disaster_recovery": UNVERIFIED,
        "windows_scheduled_task_configuration": UNVERIFIED,
    }
    return {
        "status": "REVIEW_REQUIRED",
        "checks": checks,
        "managed_release": current,
        "previous_release": prior if journal_ok else None,
        "database_revision": actual_schema
        if isinstance(actual_schema, str) and re.fullmatch(r"\d{4}", actual_schema)
        else None,
        "explanation": (
            "Only local metadata and prior backup evidence were inspected. "
            "PASS does not replace current device/backup verification or a real rollback drill."
        ),
        "operations_performed": "none",
    }


def collect(root: Path) -> dict:
    """Read only explicit Hub-controlled paths; never enumerate private data."""
    root = root.resolve()
    deployment = root / "logs" / "hub-deployment"
    active = safe_json(deployment / "active.json")
    journal = safe_json(deployment / "activation.json")
    candidate_sha = sha(active.get("sha"))
    previous_sha = sha(journal.get("previous"))

    def release_record(value: str | None) -> dict:
        if not value:
            return {}
        releases = deployment / "releases"
        slot = releases / value
        # Protect against symlinked slots, even if they have the right name.
        if releases.is_symlink() or slot.is_symlink():
            return {}
        if slot.resolve().parent != releases.resolve():
            return {}
        return safe_json(slot / "release.json")

    private = root / "logs" / "private-recovery"
    key = private / "backup-key.dpapi"
    backup_provisioned = (
        private.is_dir() and not private.is_symlink() and key.is_file() and not key.is_symlink()
    )
    backup_verified = False
    if private.is_dir() and not private.is_symlink():
        evidence = sorted(private.glob("hub-*-verified.json"), reverse=True)
        for path in evidence[:5]:
            if path.is_symlink():
                continue
            try:
                verify_backup(path)
                backup_verified = True
                break
            except (OSError, KeyError, TypeError, ValueError, RuntimeError, Refusal):
                pass
    try:
        actual_schema = database_revision(root)
    except (OSError, ValueError, RuntimeError, KeyError, Refusal, sqlite3.Error):
        actual_schema = None
    return assess(
        active,
        journal,
        release_record(candidate_sha),
        release_record(previous_sha),
        actual_schema,
        backup_provisioned,
        backup_verified,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", required=True, type=Path)
    args = parser.parse_args()
    report = collect(args.repo_root)
    print(json.dumps(report, indent=2, sort_keys=True))
    # Never represent a static metadata-only report as a live readiness approval.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
