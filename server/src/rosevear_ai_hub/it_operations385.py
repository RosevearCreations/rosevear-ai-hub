"""Build385: owner-only original-host IT diagnostics and private service desk.

Read-only runtime observations and a local, append-only, structured ticket ledger.
No cross-tenant data, arbitrary process commands, Internet probes, network scans,
worker activation, automatic restarts, asserted external SLA, or live peer proof.
"""

from __future__ import annotations

import sqlite3
import uuid
from contextlib import closing
from pathlib import Path
from typing import Any

import psutil

from rosevear_ai_hub.resource_budget import collect_resource_snapshot
from rosevear_ai_hub.seven_app_stats365 import APPS, HEX64
from rosevear_ai_hub.sysop_history366 import _safe_path

SCHEMA385 = "rosevear.hub.it-operations385.v1"
TICKET_SCHEMA385 = "rosevear.hub.service-desk385.v1"
MAX_TICKETS385 = 500
MAX_EVENTS385 = 3000
TARGET_HOURS385 = frozenset((4, 24, 72, 168))
CATEGORIES385 = frozenset(("incident", "complaint", "support", "maintenance"))
SUMMARIES385 = frozenset(
    (
        "SERVICE_UNAVAILABLE",
        "LATENCY_SLOW",
        "PROCESS_RESTART_REPORTED",
        "LAN_ISSUE_REPORTED",
        "SUPPORT_REQUEST",
        "COMPLAINT",
        "RECOVERY_EVIDENCE_REVIEW",
        "OTHER",
    )
)
EVIDENCE385 = frozenset(
    (
        "OWNER_REPORT_UNVERIFIED",
        "LOCAL_RUNTIME_SAMPLE_UNSIGNED",
        "SOURCE_RECEIPT_REFERENCE_UNATTESTED",
    )
)
STATES385 = frozenset(("open", "investigating", "waiting", "resolved"))
TRANSITIONS385 = {
    "open": frozenset(("investigating", "waiting", "resolved")),
    "investigating": frozenset(("waiting", "resolved")),
    "waiting": frozenset(("investigating", "resolved")),
    "resolved": frozenset(("open",)),
}
PROCESS_NAMES385 = (
    "caddy.exe",
    "ollama.exe",
    "go2rtc.exe",
    "node.exe",
    "tailscale-ipn.exe",
)
DDL385 = """
CREATE TABLE IF NOT EXISTS tickets385 (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  category TEXT NOT NULL,
  summary_code TEXT NOT NULL,
  opened_ms INTEGER NOT NULL,
  target_ms INTEGER NOT NULL,
  updated_ms INTEGER NOT NULL,
  closed_ms INTEGER,
  status TEXT NOT NULL,
  revision INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS ticket_events385 (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL REFERENCES tickets385(id),
  revision INTEGER NOT NULL,
  occurred_ms INTEGER NOT NULL,
  owner_user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  evidence_kind TEXT NOT NULL,
  evidence_sha256 TEXT,
  UNIQUE(ticket_id, revision)
);
CREATE INDEX IF NOT EXISTS ix_ticket_events385
  ON ticket_events385(ticket_id, revision);
"""


def original_host385(*, machine_name: str, windows_host: bool) -> bool:
    from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST

    return bool(windows_host and machine_name.upper() == ORIGINAL_HOST)


def _process_counts385(now_sec: float) -> list[dict[str, Any]]:
    buckets: dict[str, list[float]] = {name: [] for name in PROCESS_NAMES385}
    try:
        iterator = psutil.process_iter(attrs=("name", "create_time"))
        for process in iterator:
            try:
                name = str(process.info.get("name") or "").lower()
                started = process.info.get("create_time")
                if name in buckets and type(started) in (int, float):
                    if 0 <= now_sec - started <= 3650 * 86400:
                        buckets[name].append(now_sec - started)
            except (psutil.NoSuchProcess, psutil.AccessDenied, ValueError, TypeError):
                continue
    except (OSError, psutil.Error):
        pass
    return [
        {
            "processName": name,
            "observedNameCount": len(buckets[name]),
            "oldestObservedUptimeSeconds": (int(max(buckets[name])) if buckets[name] else None),
            "identityAndRoleVerified": False,
            "restartCountMeasured": None,
            "state": (
                "NAME_PRESENT_ROLE_UNVERIFIED"
                if buckets[name]
                else "NAME_NOT_OBSERVED_OR_ACCESS_DENIED"
            ),
        }
        for name in PROCESS_NAMES385
    ]


def runtime_snapshot385(*, now_ms: int, original_host: bool) -> dict[str, Any]:
    result: dict[str, Any] = {
        "schema": SCHEMA385,
        "sourceBuild": 385,
        "status": "HOLD_NOT_ORIGINAL_WINDOWS_HOST",
        "sampledAtMs": now_ms,
        "provenance": "LOCAL_OS_READ_ONLY_UNSIGNED",
        "osBootTimeMs": None,
        "osBootIndependentlyWitnessed": False,
        "hubApiUptimeSeconds": None,
        "hubApiRoleVerified": False,
        "restartHistoryIndependentlyVerified": False,
        "processNames": [],
        "lan": {
            "interfaceCount": None,
            "reportedUpCount": None,
            "totalBytesSentSinceOsCountersReset": None,
            "totalBytesReceivedSinceOsCountersReset": None,
            "internetReachabilityVerified": False,
            "gatewayReachabilityVerified": False,
            "lanHealthyIndependentlyVerified": False,
        },
        "resourceBudget": None,
        "alerts": [],
        "liveThreeMasterDeliveryVerified": False,
        "automaticRepairAuthorized": False,
        "webCanRestartServices": False,
    }
    if not original_host:
        return result
    try:
        current = psutil.Process()
        now_sec = now_ms / 1000
        created = current.create_time()
        boot = psutil.boot_time()
        resource = collect_resource_snapshot()
        stats = psutil.net_if_stats()
        counters = psutil.net_io_counters(pernic=False)
        alerts = [
            {"code": name.upper(), "severity": "REVIEW", "evidence": "LOCAL_RESOURCE_GUIDELINE"}
            for name in resource["signals"]
        ]
        if not stats:
            alerts.append(
                {
                    "code": "INTERFACE_COUNTERS_NOT_AVAILABLE",
                    "severity": "UNKNOWN",
                    "evidence": "NO_NETWORK_PROBE",
                }
            )
        return {
            **result,
            "status": "LOCAL_RUNTIME_DIAGNOSTICS_ONLY",
            "osBootTimeMs": int(boot * 1000),
            "hubApiUptimeSeconds": max(0, int(now_sec - created)),
            "hubApiRoleVerified": True,
            "processNames": _process_counts385(now_sec),
            "lan": {
                "interfaceCount": len(stats),
                "reportedUpCount": sum(bool(s.isup) for s in stats.values()),
                "totalBytesSentSinceOsCountersReset": (
                    int(counters.bytes_sent) if counters else None
                ),
                "totalBytesReceivedSinceOsCountersReset": (
                    int(counters.bytes_recv) if counters else None
                ),
                "internetReachabilityVerified": False,
                "gatewayReachabilityVerified": False,
                "lanHealthyIndependentlyVerified": False,
            },
            "resourceBudget": resource,
            "alerts": alerts,
        }
    except (OSError, psutil.Error, ValueError, TypeError, KeyError):
        return {**result, "status": "HOLD_RUNTIME_SAMPLE_UNAVAILABLE"}


def _validate385(
    *,
    app_id: str,
    category: str,
    summary_code: str,
    target_hours: int,
    evidence_kind: str,
    evidence_sha256: str | None,
    owner_user_id: int,
) -> None:
    if (
        app_id not in APPS
        or category not in CATEGORIES385
        or summary_code not in SUMMARIES385
        or type(target_hours) is not int
        or target_hours not in TARGET_HOURS385
        or evidence_kind not in EVIDENCE385
        or (
            evidence_sha256 is not None
            and (type(evidence_sha256) is not str or HEX64.fullmatch(evidence_sha256) is None)
        )
        or type(owner_user_id) is not int
        or owner_user_id <= 0
    ):
        raise ValueError("HOLD_IT385_INVALID_TICKET_SCOPE_OR_EVIDENCE")


def _open_write385(path: Path) -> sqlite3.Connection:
    safe = _safe_path(path, create=True)
    connection = sqlite3.connect(str(safe), timeout=5, isolation_level=None)
    connection.execute("PRAGMA busy_timeout=5000")
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA synchronous=FULL")
    connection.execute("PRAGMA foreign_keys=ON")
    connection.executescript(DDL385)
    connection.execute("BEGIN IMMEDIATE")
    return connection


def create_ticket385(
    path: Path,
    *,
    app_id: str,
    category: str,
    summary_code: str,
    target_hours: int,
    evidence_kind: str,
    evidence_sha256: str | None,
    owner_user_id: int,
    now_ms: int,
    original_host: bool,
) -> dict[str, Any]:
    if not original_host:
        raise ValueError("HOLD_NOT_ORIGINAL_WINDOWS_HOST")
    _validate385(
        app_id=app_id,
        category=category,
        summary_code=summary_code,
        target_hours=target_hours,
        evidence_kind=evidence_kind,
        evidence_sha256=evidence_sha256,
        owner_user_id=owner_user_id,
    )
    ticket_id = uuid.uuid4().hex
    with closing(_open_write385(path)) as db:
        try:
            count = db.execute("SELECT COUNT(*) FROM tickets385").fetchone()[0]
            if count >= MAX_TICKETS385:
                raise ValueError("HOLD_TICKET_CAPACITY_REVIEW_REQUIRED")
            db.execute(
                """INSERT INTO tickets385(id,app_id,category,summary_code,opened_ms,
                     target_ms,updated_ms,closed_ms,status,revision)
                   VALUES(?,?,?,?,?,?,?,NULL,'open',1)""",
                (
                    ticket_id,
                    app_id,
                    category,
                    summary_code,
                    now_ms,
                    now_ms + target_hours * 3600_000,
                    now_ms,
                ),
            )
            db.execute(
                """INSERT INTO ticket_events385
                   (ticket_id,revision,occurred_ms,owner_user_id,action,
                    evidence_kind,evidence_sha256)
                   VALUES(?,1,?,?,?, ?,?)""",
                (ticket_id, now_ms, owner_user_id, "created", evidence_kind, evidence_sha256),
            )
            db.execute("COMMIT")
        except Exception:
            db.execute("ROLLBACK")
            raise
    return {
        "ticketId": ticket_id,
        "revision": 1,
        "status": "open",
        "eventKind": "OWNER_STRUCTURED_REPORT_NOT_PROVIDER_SLA_PROOF",
    }


def transition_ticket385(
    path: Path,
    *,
    ticket_id: str,
    expected_revision: int,
    status: str,
    evidence_kind: str,
    evidence_sha256: str | None,
    owner_user_id: int,
    now_ms: int,
    original_host: bool,
) -> dict[str, Any]:
    if not original_host:
        raise ValueError("HOLD_NOT_ORIGINAL_WINDOWS_HOST")
    _validate385(
        app_id="rosevear-ai-hub",
        category="incident",
        summary_code="SUPPORT_REQUEST",
        target_hours=24,
        evidence_kind=evidence_kind,
        evidence_sha256=evidence_sha256,
        owner_user_id=owner_user_id,
    )
    if (
        type(ticket_id) is not str
        or len(ticket_id) != 32
        or any(ch not in "0123456789abcdef" for ch in ticket_id)
        or type(expected_revision) is not int
        or expected_revision < 1
        or status not in STATES385
    ):
        raise ValueError("HOLD_INVALID_TICKET_TRANSITION")
    with closing(_open_write385(path)) as db:
        try:
            row = db.execute(
                "SELECT status,revision,opened_ms FROM tickets385 WHERE id=?",
                (ticket_id,),
            ).fetchone()
            if row is None:
                raise ValueError("HOLD_TICKET_NOT_FOUND")
            old_state, revision, opened_ms = row
            if expected_revision != revision or status not in TRANSITIONS385[old_state]:
                raise ValueError("HOLD_STALE_REVISION_OR_DISALLOWED_TRANSITION")
            if now_ms < opened_ms:
                raise ValueError("HOLD_INVALID_EVENT_TIME")
            count = db.execute("SELECT COUNT(*) FROM ticket_events385").fetchone()[0]
            if count >= MAX_EVENTS385:
                raise ValueError("HOLD_EVENT_CAPACITY_REVIEW_REQUIRED")
            revision += 1
            db.execute(
                """UPDATE tickets385 SET status=?,revision=?,updated_ms=?,closed_ms=?
                   WHERE id=?""",
                (status, revision, now_ms, now_ms if status == "resolved" else None, ticket_id),
            )
            db.execute(
                """INSERT INTO ticket_events385
                   (ticket_id,revision,occurred_ms,owner_user_id,action,
                    evidence_kind,evidence_sha256)
                   VALUES(?,?,?,?,?,?,?)""",
                (
                    ticket_id,
                    revision,
                    now_ms,
                    owner_user_id,
                    "owner_transition_" + status,
                    evidence_kind,
                    evidence_sha256,
                ),
            )
            db.execute("COMMIT")
        except Exception:
            db.execute("ROLLBACK")
            raise
    return {
        "ticketId": ticket_id,
        "revision": revision,
        "status": status,
        "eventKind": "OWNER_TRANSITION_NOT_INDEPENDENT_RESOLUTION_PROOF",
    }


def service_desk_snapshot385(
    path: Path | None,
    *,
    now_ms: int,
    original_host: bool,
) -> dict[str, Any]:
    result = {
        "schema": TICKET_SCHEMA385,
        "status": "HOLD_NOT_ORIGINAL_WINDOWS_HOST_OR_UNCONFIGURED",
        "tickets": [],
        "ticketCount": 0,
        "openOrPendingCount": 0,
        "targetOverdueCount": 0,
        "slaCertifiedCount": 0,
        "providerComplaintResolutionVerified": False,
        "serviceActuationAuthorized": False,
        "note": "Targets are owner-selected planning goals, not verified provider SLAs.",
    }
    if not original_host or path is None:
        return result
    if not path.exists():
        try:
            _safe_path(path, create=True)
            return {**result, "status": "PRIVATE_IT385_EMPTY_CREATE_ALLOWED"}
        except ValueError:
            return {**result, "status": "HOLD_PRIVATE_TICKET_JOURNAL_INVALID_OR_MISSING"}
    try:
        safe = _safe_path(path, create=False)
        with closing(sqlite3.connect(f"{safe.as_uri()}?mode=ro", uri=True, timeout=3)) as db:
            db.row_factory = sqlite3.Row
            rows = db.execute(
                """SELECT id,app_id,category,summary_code,opened_ms,target_ms,
                          updated_ms,closed_ms,status,revision FROM tickets385
                   ORDER BY opened_ms DESC LIMIT ?""",
                (MAX_TICKETS385,),
            ).fetchall()
            events = db.execute(
                """SELECT ticket_id,revision,occurred_ms,owner_user_id,
                          action,evidence_kind,evidence_sha256
                   FROM ticket_events385 ORDER BY seq DESC LIMIT ?""",
                (MAX_EVENTS385,),
            ).fetchall()
        if len(rows) > MAX_TICKETS385 or len(events) > MAX_EVENTS385:
            raise ValueError("HOLD_TICKET_SIZE")
        grouped: dict[str, list[dict[str, Any]]] = {}
        for e in events:
            if (
                e["evidence_kind"] not in EVIDENCE385
                or type(e["revision"]) is not int
                or e["revision"] < 1
                or type(e["owner_user_id"]) is not int
                or e["owner_user_id"] <= 0
                or type(e["occurred_ms"]) is not int
                or e["occurred_ms"] > now_ms + 2000
                or (
                    e["evidence_sha256"] is not None
                    and HEX64.fullmatch(e["evidence_sha256"]) is None
                )
            ):
                raise ValueError("HOLD_TICKET_EVENT_TAMPER")
            grouped.setdefault(e["ticket_id"], []).append(
                {
                    "revision": e["revision"],
                    "occurredAtMs": e["occurred_ms"],
                    "action": e["action"],
                    "evidenceKind": e["evidence_kind"],
                    "evidenceHashPresent": e["evidence_sha256"] is not None,
                    "authority": "OWNER_REPORT_ONLY",
                }
            )
        tickets = []
        for row in rows:
            if (
                row["app_id"] not in APPS
                or row["category"] not in CATEGORIES385
                or row["summary_code"] not in SUMMARIES385
                or row["status"] not in STATES385
                or type(row["revision"]) is not int
                or row["revision"] < 1
                or type(row["opened_ms"]) is not int
                or type(row["target_ms"]) is not int
                or row["target_ms"] <= row["opened_ms"]
                or type(row["updated_ms"]) is not int
                or row["updated_ms"] > now_ms + 2000
                or len(grouped.get(row["id"], [])) != row["revision"]
            ):
                raise ValueError("HOLD_TICKET_LEDGER_TAMPER")
            overdue = row["status"] != "resolved" and now_ms > row["target_ms"]
            tickets.append(
                {
                    "id": row["id"],
                    "appId": row["app_id"],
                    "category": row["category"],
                    "summaryCode": row["summary_code"],
                    "openedAtMs": row["opened_ms"],
                    "targetAtMs": row["target_ms"],
                    "updatedAtMs": row["updated_ms"],
                    "closedAtMs": row["closed_ms"],
                    "status": row["status"],
                    "revision": row["revision"],
                    "ownerTargetOverdue": overdue,
                    "slaVerified": False,
                    "events": grouped.get(row["id"], [])[:24],
                }
            )
        return {
            **result,
            "status": "PRIVATE_OWNER_TICKETS_NOT_PROVIDER_SLA",
            "tickets": tickets,
            "ticketCount": len(tickets),
            "openOrPendingCount": sum(t["status"] != "resolved" for t in tickets),
            "targetOverdueCount": sum(t["ownerTargetOverdue"] for t in tickets),
        }
    except (sqlite3.Error, OSError, ValueError, TypeError, KeyError):
        return {**result, "status": "HOLD_PRIVATE_TICKET_JOURNAL_INVALID_OR_MISSING"}
