"""QL-460: original-host durable Master event bus, boot witness and issue signals.

The ledger records locally observed source facts. Hash chaining detects accidental
corruption; it is not a third-party signature or independent physical-host witness.
No HTTP mutation endpoint or cross-app remote command is exposed.
"""

from __future__ import annotations

import hashlib
import os
import platform
import sqlite3
from pathlib import Path
from typing import Any

from rosevear_ai_hub.master_shell349 import MASTER_MODULES, ORIGINAL_HOST, SLAVE_SHELLS
from rosevear_ai_hub.master_supervisor350 import CustodyJournal350
from rosevear_ai_hub.service_identity347 import _canonical, _sha

EVENT_SCHEMA = "rosevear.hub.master-event351.v1"
SOURCES = (*MASTER_MODULES, *SLAVE_SHELLS, "home-assistant")
KINDS = ("module.observed", "slave.verified", "home.status")
STATES = (
    "RUNNING",
    "STOPPED",
    "TRANSITIONING",
    "UNKNOWN",
    "HEALTHY",
    "DEGRADED",
    "UNHEALTHY",
    "AVAILABLE",
    "UNAVAILABLE",
)
FRESH_MS = 120_000
MAX_EVENTS = 25
BOOT_SCHEMA = "rosevear.hub.original-host-boot351.v1"


def _local_original_host() -> bool:
    return os.name == "nt" and platform.node().upper() == ORIGINAL_HOST


class MasterEventBus351:
    def __init__(self, path: Path):
        self.path = path

    def initialize(self) -> bool:
        if self.path.is_symlink() or not self.path.parent.is_dir():
            return False
        try:
            with sqlite3.connect(self.path, timeout=3) as db:
                db.execute("PRAGMA journal_mode=WAL")
                db.execute("PRAGMA synchronous=FULL")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS master_events351 (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id TEXT NOT NULL UNIQUE,
                    source TEXT NOT NULL, kind TEXT NOT NULL,
                    state TEXT NOT NULL, evidence_sha TEXT NOT NULL,
                    observed_ms INTEGER NOT NULL, manifest_sha TEXT NOT NULL,
                    previous_sha TEXT NOT NULL, entry_sha TEXT NOT NULL)"""
                )
            return True
        except (OSError, sqlite3.Error):
            return False

    def append(
        self,
        *,
        source: str,
        kind: str,
        state: str,
        evidence_sha: str,
        observed_ms: int,
        manifest_sha: str,
    ) -> bool:
        """Only call after local SCM or independently verified source receipt."""
        if not (
            _local_original_host()
            and source in SOURCES
            and kind in KINDS
            and state in STATES
            and _sha(evidence_sha)
            and _sha(manifest_sha)
            and type(observed_ms) is int
            and observed_ms >= 0
            and self.path.is_file()
            and not self.path.is_symlink()
            and (
                (
                    kind == "module.observed"
                    and source in MASTER_MODULES
                    and state in ("RUNNING", "STOPPED", "TRANSITIONING", "UNKNOWN")
                )
                or (
                    kind == "slave.verified"
                    and source in SLAVE_SHELLS
                    and state in ("HEALTHY", "DEGRADED", "UNHEALTHY")
                )
                or (
                    kind == "home.status"
                    and source == "home-assistant"
                    and state in ("AVAILABLE", "UNAVAILABLE")
                )
            )
        ):
            return False
        event_id = hashlib.sha256(
            _canonical(
                [
                    EVENT_SCHEMA,
                    source,
                    kind,
                    state,
                    evidence_sha,
                    observed_ms,
                    manifest_sha,
                ]
            )
        ).hexdigest()
        try:
            with sqlite3.connect(self.path, timeout=3, isolation_level=None) as db:
                db.execute("PRAGMA synchronous=FULL")
                db.execute("BEGIN IMMEDIATE")
                row = db.execute(
                    "SELECT seq, entry_sha FROM master_events351 ORDER BY seq DESC LIMIT 1"
                ).fetchone()
                previous = row[1] if row else "0" * 64
                seq = row[0] + 1 if row else 1
                entry_sha = hashlib.sha256(
                    _canonical(
                        [
                            seq,
                            event_id,
                            source,
                            kind,
                            state,
                            evidence_sha,
                            observed_ms,
                            manifest_sha,
                            previous,
                        ]
                    )
                ).hexdigest()
                db.execute(
                    "INSERT INTO master_events351 VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (
                        seq,
                        event_id,
                        source,
                        kind,
                        state,
                        evidence_sha,
                        observed_ms,
                        manifest_sha,
                        previous,
                        entry_sha,
                    ),
                )
                db.execute("COMMIT")
            return True
        except (sqlite3.Error, OSError):
            return False

    def recent(self, *, manifest_sha: str, now_ms: int) -> dict[str, Any]:
        """Verify full hash chain before displaying even one local event."""
        hold = {"integrity": "HOLD", "events": [], "issues": []}
        if not (
            _sha(manifest_sha)
            and type(now_ms) is int
            and self.path.is_file()
            and not self.path.is_symlink()
        ):
            return hold
        try:
            with sqlite3.connect(
                f"file:{self.path}?mode=ro",
                uri=True,
                timeout=2,
            ) as db:
                rows = db.execute(
                    """SELECT seq, event_id, source, kind, state, evidence_sha,
                    observed_ms, manifest_sha, previous_sha, entry_sha
                    FROM master_events351 ORDER BY seq"""
                ).fetchall()
        except (sqlite3.Error, OSError):
            return hold
        previous = "0" * 64
        events: list[dict[str, Any]] = []
        for seq, event_id, source, kind, state, evidence, observed, digest, before, after in rows:
            expected_id = hashlib.sha256(
                _canonical(
                    [
                        EVENT_SCHEMA,
                        source,
                        kind,
                        state,
                        evidence,
                        observed,
                        digest,
                    ]
                )
            ).hexdigest()
            expected_sha = hashlib.sha256(
                _canonical(
                    [
                        seq,
                        event_id,
                        source,
                        kind,
                        state,
                        evidence,
                        observed,
                        digest,
                        before,
                    ]
                )
            ).hexdigest()
            if not (
                type(seq) is int
                and seq == len(events) + 1
                and event_id == expected_id
                and before == previous
                and after == expected_sha
                and source in SOURCES
                and kind in KINDS
                and state in STATES
                and _sha(evidence)
                and _sha(digest)
                and type(observed) is int
            ):
                return hold
            previous = after
            events.append(
                {
                    "seq": seq,
                    "source": source,
                    "kind": kind,
                    "state": state,
                    "evidenceDigest": evidence,
                    "observedAtMs": observed,
                    "manifestDigest": digest,
                }
            )
        fresh = [
            e
            for e in events
            if e["manifestDigest"] == manifest_sha and 0 <= now_ms - e["observedAtMs"] <= FRESH_MS
        ]
        latest: dict[tuple[str, str], dict[str, Any]] = {}
        for e in fresh:
            latest[(e["source"], e["kind"])] = e
        issues = []
        for e in latest.values():
            if (
                (e["kind"] == "module.observed" and e["state"] in ("STOPPED", "UNKNOWN"))
                or (e["kind"] == "slave.verified" and e["state"] in ("DEGRADED", "UNHEALTHY"))
                or (e["kind"] == "home.status" and e["state"] == "UNAVAILABLE")
            ):
                issues.append(
                    {
                        "source": e["source"],
                        "state": e["state"],
                        "severity": "WARNING"
                        if e["state"] in ("STOPPED", "DEGRADED")
                        else "CRITICAL",
                        "observedAtMs": e["observedAtMs"],
                        "evidenceDigest": e["evidenceDigest"],
                        "disposition": "OPEN_UNACKNOWLEDGED",
                    }
                )
        return {
            "integrity": "LOCAL_HASH_CHAIN_VALID",
            "events": fresh[-MAX_EVENTS:][::-1],
            "issues": sorted(issues, key=lambda x: x["observedAtMs"], reverse=True),
            "thirdPartyAttested": False,
            "outboundNotificationsSent": False,
        }


class BootWitness351:
    """Per-boot locally observed service state; never certifies Task Scheduler startup."""

    def __init__(self, path: Path):
        self.path = path

    def initialize(self) -> bool:
        if self.path.is_symlink() or not self.path.parent.is_dir():
            return False
        try:
            with sqlite3.connect(self.path, timeout=3) as db:
                db.execute("PRAGMA journal_mode=WAL")
                db.execute("PRAGMA synchronous=FULL")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS boot_observations351 (
                    boot_ms INTEGER NOT NULL, module_id TEXT NOT NULL,
                    observed_ms INTEGER NOT NULL, state TEXT NOT NULL,
                    manifest_sha TEXT NOT NULL,
                    PRIMARY KEY(boot_ms, module_id))"""
                )
            return True
        except (OSError, sqlite3.Error):
            return False

    def record(
        self,
        *,
        boot_ms: int,
        observed_ms: int,
        manifest_sha: str,
        states: dict[str, str],
    ) -> bool:
        if not (
            _local_original_host()
            and _sha(manifest_sha)
            and type(boot_ms) is int
            and type(observed_ms) is int
            and 0 <= observed_ms - boot_ms <= 365 * 86_400_000
            and type(states) is dict
            and set(states) == set(MASTER_MODULES)
            and all(
                s in ("RUNNING", "STOPPED", "TRANSITIONING", "UNKNOWN") for s in states.values()
            )
            and self.path.is_file()
            and not self.path.is_symlink()
        ):
            return False
        try:
            with sqlite3.connect(self.path, timeout=3) as db:
                db.execute("PRAGMA synchronous=FULL")
                for module, state in states.items():
                    db.execute(
                        """INSERT INTO boot_observations351 VALUES (?,?,?,?,?)
                        ON CONFLICT(boot_ms, module_id) DO UPDATE SET
                        observed_ms=excluded.observed_ms, state=excluded.state,
                        manifest_sha=excluded.manifest_sha""",
                        (boot_ms, module, observed_ms, state, manifest_sha),
                    )
            return True
        except (OSError, sqlite3.Error):
            return False

    def summary(self, *, manifest_sha: str, now_ms: int) -> dict[str, Any]:
        base = {
            "observation": "HOLD_NO_FRESH_ORIGINAL_HOST_BOOT_WITNESS",
            "distinctBoots": 0,
            "rebootPersistenceVerified": False,
            "taskAutostartVerified": False,
            "supervisorInstalledVerified": False,
        }
        if not (
            _sha(manifest_sha)
            and type(now_ms) is int
            and self.path.is_file()
            and not self.path.is_symlink()
        ):
            return base
        try:
            with sqlite3.connect(f"file:{self.path}?mode=ro", uri=True, timeout=2) as db:
                rows = db.execute(
                    """SELECT boot_ms, module_id, observed_ms, state FROM boot_observations351
                    WHERE manifest_sha = ?""",
                    (manifest_sha,),
                ).fetchall()
        except (OSError, sqlite3.Error):
            return base
        grouped: dict[int, dict[str, tuple[int, str]]] = {}
        for boot, module, observed, state in rows:
            if (
                type(boot) is int
                and type(observed) is int
                and boot <= observed <= now_ms
                and module in MASTER_MODULES
                and state in ("RUNNING", "STOPPED", "TRANSITIONING", "UNKNOWN")
            ):
                grouped.setdefault(boot, {})[module] = (observed, state)
        complete = {boot: v for boot, v in grouped.items() if set(v) == set(MASTER_MODULES)}
        current = max(complete) if complete else None
        if current is None or not all(
            0 <= now_ms - at <= FRESH_MS for at, _ in complete[current].values()
        ):
            return base
        return {
            **base,
            "observation": "FRESH_LOCAL_POST_BOOT_SCM_WITNESS",
            "distinctBoots": len(complete),
            "rebootPersistenceVerified": False,
            "taskAutostartVerified": False,
            "supervisorInstalledVerified": False,
        }


def publish_module_observations351(
    *,
    enrollment: dict[str, Any],
    custody: CustodyJournal350,
    bus: MasterEventBus351,
    boot: BootWitness351,
    boot_ms: int,
    now_ms: int,
) -> bool:
    """Original-host loop uses the existing SCM-vetted, fresh custody observations."""
    if not (_local_original_host() and enrollment.get("accepted") is True):
        return False
    from rosevear_ai_hub.service_identity347 import _digest

    digest = _digest(enrollment["payload"])
    values = custody.recent(digest, now_ms)
    if set(values) != set(MASTER_MODULES):
        return False
    states = {m: values[m]["state"] for m in MASTER_MODULES}
    if not boot.record(boot_ms=boot_ms, observed_ms=now_ms, manifest_sha=digest, states=states):
        return False
    accepted = True
    for module in MASTER_MODULES:
        state = states[module]
        evidence = hashlib.sha256(
            _canonical(
                [
                    module,
                    state,
                    values[module]["observedAtMs"],
                    digest,
                ]
            )
        ).hexdigest()
        # Duplicate polls are idempotent by evidence and exact observed timestamp.
        if not bus.append(
            source=module,
            kind="module.observed",
            state=state,
            evidence_sha=evidence,
            observed_ms=values[module]["observedAtMs"],
            manifest_sha=digest,
        ):
            # A duplicate is expected on retries; read-only chain remains authoritative.
            accepted = False
    return accepted
