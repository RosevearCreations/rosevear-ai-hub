"""Build 063: bounded, privacy-preserving local release cohorts and operator evidence.

Reads fixed local files only. A self-attestation is not independent device proof.
No backups, migrations, scheduler or process operations are performed.
"""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

LOG_BYTES = 131072
WINDOW_DAYS = 7
MAX_LINES = 512
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
SCHEMA_RE = re.compile(r"^\d{4}$")
LINE_RE = re.compile(
    r"^(\S{20,40}) (CURRENT|READY|HOLD|ADOPTED|FAILED|ROLLED_BACK|ROLLBACK_FAILED) "
)
OUTCOMES = ("CURRENT", "READY", "HOLD", "ADOPTED", "FAILED", "ROLLED_BACK", "ROLLBACK_FAILED")
STEPS = (
    "baseline_runtime_health",
    "rollback_runtime_health",
    "authenticated_browser_acceptance",
    "readoption_runtime_health",
    "recovery_task_interoperability",
    "restorable_encrypted_backup",
)


def parse_utc(value: Any) -> datetime | None:
    if not isinstance(value, str) or len(value) > 40:
        return None
    try:
        stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return stamp.astimezone(UTC) if stamp.tzinfo is not None else None


def _safe_regular(path: Path) -> bool:
    """Refuse symlinked log path or parent; never follow another directory."""
    no_links = all(not item.is_symlink() for item in (path, path.parent, path.parent.parent))
    return no_links and path.is_file()


def classify_log(root: Path, now: datetime | None = None) -> dict:
    """Count only recognized states by UTC day, never log descriptions or secrets."""
    now = now or datetime.now(UTC)
    path = root / "logs" / "hub-release-adoption.log"
    empty: dict = {
        "scope": "last_7_days",
        "state": "unavailable",
        "days": [],
        "events_counted": 0,
        "unparsed_lines": 0,
        "history_partial": False,
        "grouped_by": "utc_day_not_release_sha",
    }
    if not _safe_regular(path):
        return empty
    try:
        length = path.stat().st_size
        with path.open("rb") as stream:
            if length > LOG_BYTES:
                stream.seek(-LOG_BYTES, 2)
            data = stream.read(LOG_BYTES)
    except OSError:
        return empty
    partial = length > LOG_BYTES
    # Drop a leading torn line if we had to read from the middle of the file.
    if partial:
        data = data.partition(b"\n")[2]
    lines = data.splitlines()
    if len(lines) > MAX_LINES:
        lines = lines[-MAX_LINES:]
        partial = True
    cutoff = now - timedelta(days=WINDOW_DAYS)
    buckets: dict[str, dict[str, int]] = {}
    unparsed = 0
    for raw in lines:
        # Do not forward anything from the raw line, including exception text.
        try:
            candidate = raw.decode("utf-8")
        except UnicodeError:
            unparsed += 1
            continue
        match = LINE_RE.match(candidate)
        if match is None:
            unparsed += 1
            continue
        stamp = parse_utc(match.group(1))
        if stamp is None:
            unparsed += 1
            continue
        if stamp < cutoff or stamp > now + timedelta(minutes=5):
            continue
        day = stamp.date().isoformat()
        bucket = buckets.setdefault(day, {key: 0 for key in OUTCOMES})
        bucket[match.group(2)] += 1
    groups = [{"utc_day": key, "counts": buckets[key]} for key in sorted(buckets, reverse=True)]
    return {
        "scope": "last_7_days",
        "state": "partial" if partial or unparsed else "available",
        "days": groups,
        "events_counted": sum(sum(bucket.values()) for bucket in buckets.values()),
        "unparsed_lines": unparsed,
        "history_partial": partial,
        "grouped_by": "utc_day_not_release_sha",
    }


def operator_evidence(root: Path, now: datetime | None = None) -> dict:
    """Bound and validate an optional *operator-entered* acceptance file.

    Even a complete, current record is merely operator-reported. Never use
    it to automatically enable updates or label an exercise 'verified'.
    """
    empty = {
        "status": "not_recorded",
        "observed_utc": None,
        "distinct_same_schema_releases": False,
        "reported_steps": 0,
        "required_steps": len(STEPS),
        "source": "operator_self_attestation_only",
        "machine_verified": False,
    }
    now = now or datetime.now(UTC)
    path = root / "logs" / "hub-deployment" / "supervised-recovery-evidence.json"
    if not _safe_regular(path):
        return empty
    try:
        if path.stat().st_size > 8192:
            return {**empty, "status": "invalid"}
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError, UnicodeError):
        return {**empty, "status": "invalid"}
    if not isinstance(payload, dict) or payload.get("schema_version") != 1:
        return {**empty, "status": "invalid"}
    a = payload.get("baseline_sha")
    b = payload.get("candidate_sha")
    revision = payload.get("schema_revision")
    when = parse_utc(payload.get("observed_at_utc"))
    checklist = payload.get("steps")
    identifiers_ok = (
        isinstance(a, str)
        and isinstance(b, str)
        and SHA_RE.fullmatch(a) is not None
        and SHA_RE.fullmatch(b) is not None
        and a != b
        and isinstance(revision, str)
        and SCHEMA_RE.fullmatch(revision) is not None
        and payload.get("recovery_mode") == "same_schema_rollback_readopt"
    )
    if not identifiers_ok or when is None or not isinstance(checklist, dict):
        return {**empty, "status": "invalid"}
    valid_steps = all(type(checklist.get(key)) is bool for key in STEPS)
    if not valid_steps or type(payload.get("operator_attested")) is not bool:
        return {**empty, "status": "invalid"}
    count = sum(checklist[key] for key in STEPS)
    age_ok = now - timedelta(days=30) <= when <= now + timedelta(minutes=5)
    complete = bool(payload["operator_attested"]) and count == len(STEPS)
    return {
        "status": (
            "stale"
            if not age_ok
            else "operator_reported_complete"
            if complete
            else "operator_reported_incomplete"
        ),
        "observed_utc": when.isoformat(),
        "distinct_same_schema_releases": True,
        "reported_steps": count,
        "required_steps": len(STEPS),
        "source": "operator_self_attestation_only",
        "machine_verified": False,
    }
