"""Build 304: original-Windows-only durable, bounded source uptime evidence.

The existing FastAPI process owns this sampler: no Windows scheduled task,
remote polling target, credential, recipient or recovery action is created.
"""

import asyncio
import os
import sqlite3
import time
from datetime import UTC, datetime
from pathlib import Path

from rosevear_ai_hub.master_shell_uptime303 import (
    LOCAL_SERVICES,
    PROBE_SECONDS,
    LocalUptimeSampler303,
    Probe,
    loopback_tcp_probe,
)

WINDOW_MS = 7 * 24 * 60 * 60 * 1000
DAY_MS = 24 * 60 * 60 * 1000
MAX_HISTORY = 7 * 1440
AUTOMATION_HOST_FLAG = "ROSEVEAR_REQUIRE_REE_AUTOMATION_HOST"
ID_BY_PORT = {port: name for name, port in LOCAL_SERVICES}


def storage_location304(local_app_data: str | None) -> Path | None:
    """Windows private app data only, never a project or network share fallback."""
    if not local_app_data:
        return None
    root = Path(local_app_data)
    if not root.is_absolute() or str(root).startswith(("\\\\", "//")):
        return None
    return root / "RosevearAIHub" / "MasterShell" / "uptime304.sqlite3"


class DurableUptimeLedger304:
    """At most seven days of one row/minute; no machine paths in API output."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def record(self, captured_ms: int, states: dict[str, bool]) -> bool:
        if (
            captured_ms < 0
            or set(states) != set(ID_BY_PORT.values())
            or not all(type(value) is bool for value in states.values())
        ):
            return False
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA busy_timeout=2000")
                db.execute("BEGIN IMMEDIATE")
                db.execute("""CREATE TABLE IF NOT EXISTS master_uptime304 (
                    minute_bucket INTEGER PRIMARY KEY,
                    captured_ms INTEGER NOT NULL,
                    hub_api INTEGER NOT NULL CHECK (hub_api IN (0,1)),
                    hub_web INTEGER NOT NULL CHECK (hub_web IN (0,1)),
                    caddy_proxy INTEGER NOT NULL CHECK (caddy_proxy IN (0,1))
                )""")
                db.execute(
                    "INSERT OR IGNORE INTO master_uptime304 VALUES (?,?,?,?,?)",
                    (
                        captured_ms // 60000,
                        captured_ms,
                        int(states["hub_api"]),
                        int(states["hub_web"]),
                        int(states["caddy_proxy"]),
                    ),
                )
                db.execute(
                    "DELETE FROM master_uptime304 WHERE captured_ms < ?",
                    (captured_ms - WINDOW_MS,),
                )
                db.execute(
                    """DELETE FROM master_uptime304 WHERE minute_bucket NOT IN (
                    SELECT minute_bucket FROM master_uptime304
                    ORDER BY minute_bucket DESC LIMIT ?
                )""",
                    (MAX_HISTORY,),
                )
            return True
        except (OSError, sqlite3.Error):
            return False

    def summary(self, now_ms: int) -> dict[str, object] | None:
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                rows = db.execute(
                    """SELECT captured_ms,hub_api,hub_web,caddy_proxy
                    FROM master_uptime304 WHERE captured_ms >= ? AND captured_ms <= ?
                    ORDER BY minute_bucket DESC LIMIT ?""",
                    (now_ms - WINDOW_MS, now_ms + 5000, MAX_HISTORY),
                ).fetchall()
        except (OSError, sqlite3.Error):
            return None
        latest = rows[0][0] if rows else None
        fresh = latest is not None and -5000 <= now_ms - latest <= 2 * PROBE_SECONDS * 1000 + 10000
        consecutive = rows[:3] if fresh else []
        services = []
        conditions = []
        for index, (service, _) in enumerate(LOCAL_SERVICES, start=1):
            count = sum(int(row[index] == 1) for row in rows)
            services.append(
                {
                    "id": service,
                    "check": "LOOPBACK_TCP_ONLY",
                    "reachableSamples": count,
                    "sampleCount": len(rows),
                    "observedAvailabilityPercent": round(100 * count / len(rows), 1)
                    if rows
                    else None,
                    "latestState": (
                        "NOT_OBSERVED"
                        if not rows
                        else "STALE"
                        if not fresh
                        else "TCP_REACHABLE"
                        if rows[0][index] == 1
                        else "TCP_UNREACHABLE"
                    ),
                }
            )
            if len(consecutive) == 3 and all(row[index] == 0 for row in consecutive):
                conditions.append(
                    {
                        "service": service,
                        "condition": "THREE_CONSECUTIVE_TCP_FAILURES",
                        "disposition": "OFFLINE_COMMS_REVIEW_CANDIDATE_HOLD",
                    }
                )
        return {
            "sampleCount": len(rows),
            "lastSampleAtUtc": (
                datetime.fromtimestamp(latest / 1000, UTC)
                .isoformat(timespec="seconds")
                .replace("+00:00", "Z")
                if latest is not None
                else None
            ),
            "fresh": bool(fresh),
            "services": services,
            "incidentCandidates": conditions,
        }

    def observed_daily_trend306(self, now_ms: int) -> list[dict[str, object]] | None:
        """Read the existing ledger; missing minutes are unknown, never uptime.

        Keep the previous seven UTC calendar days, including today's partial
        day, and return only actual observed minute buckets. This performs no
        migrations, writes, scheduler changes or external health probes.
        """
        if type(now_ms) is not int or now_ms < 0:
            return None
        first_day = now_ms // DAY_MS - 6
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA query_only=ON")
                rows = db.execute(
                    """SELECT captured_ms,hub_api,hub_web,caddy_proxy
                    FROM master_uptime304
                    WHERE captured_ms >= ? AND captured_ms <= ?
                    ORDER BY minute_bucket ASC LIMIT ?""",
                    (first_day * DAY_MS, now_ms + 5000, MAX_HISTORY),
                ).fetchall()
        except (OSError, sqlite3.Error):
            return None
        by_day: dict[int, dict[str, object]] = {}
        for stamp, api, web, proxy in rows:
            day = stamp // DAY_MS
            if day < first_day or day > now_ms // DAY_MS:
                continue
            if day not in by_day:
                by_day[day] = {
                    "dayUtc": datetime.fromtimestamp(day * DAY_MS / 1000, UTC).date().isoformat(),
                    "observedMinutes": 0,
                    "reachableMinutes": {"hub_api": 0, "hub_web": 0, "caddy_proxy": 0},
                }
            bucket = by_day[day]
            bucket["observedMinutes"] += 1
            for name, state in zip(
                ("hub_api", "hub_web", "caddy_proxy"), (api, web, proxy), strict=True
            ):
                if state == 1:
                    bucket["reachableMinutes"][name] += 1
        return [by_day[key] for key in sorted(by_day)]


class PersistentReeMonitor304(LocalUptimeSampler303):
    """Extends Build 303 without changing existing opt-in loopback behavior."""

    def __init__(
        self,
        *,
        durable_path: Path | None = None,
        host_policy_enabled: bool | None = None,
        wallclock_ms=None,
        probe: Probe = loopback_tcp_probe,
        **kwargs,
    ) -> None:
        super().__init__(probe=probe, **kwargs)
        self.enforcement = (
            host_policy_enabled
            if host_policy_enabled is not None
            else os.getenv(AUTOMATION_HOST_FLAG) == "1"
        )
        self.persist_eligible = self.eligible and self.enforcement
        self.wallclock_ms = wallclock_ms or (lambda: int(time.time() * 1000))
        location = (
            durable_path
            if durable_path is not None
            else storage_location304(os.getenv("LOCALAPPDATA"))
        )
        self.ledger = (
            DurableUptimeLedger304(location) if location and self.persist_eligible else None
        )
        self.last_persist_ok = False

    async def sample_once(self) -> None:
        await super().sample_once()
        if not self.ledger or not self.samples:
            return
        _, _, states = self.samples[-1]
        self.last_persist_ok = await asyncio.to_thread(
            self.ledger.record, self.wallclock_ms(), states
        )

    def persistent_snapshot304(self) -> dict[str, object]:
        summary = self.ledger.summary(self.wallclock_ms()) if self.ledger else None
        state = (
            "HOLD_NOT_ORIGINAL_REE_HOST"
            if not self.eligible
            else "HOLD_AUTOMATION_HOST_POLICY_NOT_ENFORCED"
            if not self.enforcement
            else "HOLD_DURABLE_STORAGE_NOT_CONFIGURED"
            if not self.ledger
            else "HOLD_DURABLE_STORAGE_UNAVAILABLE"
            if summary is None
            else "OBSERVING_REE_LOCAL"
            if summary["fresh"] and self.last_persist_ok
            else "STALE_OR_NOT_YET_OBSERVED"
        )
        return {
            "schema": "rosevear.ai-hub.ree-durable-uptime.v1",
            "sourceId": "rosevear-ai-hub",
            "sourceRole": "SOURCE",
            "hostPolicy": "REE_ORIGINAL_WINDOWS_ONLY",
            "automationHostEnforced": self.persist_eligible,
            "collectionState": state,
            "historyDurability": "SQLITE_7_DAYS_BOUNDED" if summary else "NOT_VERIFIED",
            "sampleIntervalSeconds": PROBE_SECONDS,
            "historyWindowDays": 7,
            "historyMaxSamples": MAX_HISTORY,
            "sampleCount": summary["sampleCount"] if summary else 0,
            "lastSampleAtUtc": summary["lastSampleAtUtc"] if summary else None,
            "services": summary["services"] if summary else [],
            "incidentCandidates": summary["incidentCandidates"] if summary else [],
            "observationScope": "LOOPBACK_TCP_NOT_END_TO_END_UPTIME",
            "remoteCommands": 0,
            "newWindowsScheduledTasks": 0,
            "signedTelemetryAccepted": False,
            "commsHandoffAccepted": False,
            "masterConnections": {"ai-data-platform": "HOLD", "rosevear-comms-hub": "HOLD"},
            "connection": "HOLD",
        }
