"""Build 366: private durable seven-app source-statistics journal and bounded Sysop history.

Opt-in CLI writes only after independently pinned Build 365 signature verification.
Local signed claims are NOT a live peer link, physical reboot or install authority.
"""
from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any

from rosevear_ai_hub.seven_app_stats365 import APPS, canonical, verify_peer365

SCHEMA = "rosevear.hub.sysop-history366.v1"
MAX_RECORDS = 2048
RETENTION_MS = 7 * 86_400_000
FIELDS = (
    "requests",
    "serverErrors",
    "jobsCompleted",
    "jobsFailed",
    "queueDepth",
    "latencyP95Ms",
    "activeSessions",
)
DDL = """
CREATE TABLE IF NOT EXISTS observations (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 app_id TEXT NOT NULL,
 event_id TEXT NOT NULL,
 nonce TEXT NOT NULL,
 source_commit TEXT NOT NULL,
 issued_ms INTEGER NOT NULL,
 observed_ms INTEGER NOT NULL,
 event_kind TEXT NOT NULL,
 state TEXT NOT NULL,
 metrics_json TEXT NOT NULL,
 process_uptime_sec INTEGER,
 restart_count INTEGER,
 boot_time_ms INTEGER,
 UNIQUE(app_id, event_id),
 UNIQUE(app_id, nonce)
)
"""


def _safe_path(path: Path, *, create: bool) -> Path:
    """Private existing directory outside checkout, no symlink traversal."""
    repo = Path(__file__).resolve().parents[3]
    target = path.resolve(strict=False)
    if not path.is_absolute() or target == repo or repo in target.parents:
        raise ValueError("HOLD_SYSOP366_LEDGER_OUTSIDE_REPOSITORY")
    if not path.parent.is_dir() or path.parent.is_symlink() or path.is_symlink():
        raise ValueError("HOLD_SYSOP366_UNSAFE_LEDGER_PATH")
    if path.exists() and not path.is_file():
        raise ValueError("HOLD_SYSOP366_NOT_A_FILE")
    if not create and not path.is_file():
        raise ValueError("HOLD_SYSOP366_LEDGER_NOT_PRESENT")
    return target


def _connect_write(path: Path) -> sqlite3.Connection:
    safe = _safe_path(path, create=True)
    connection = sqlite3.connect(str(safe), timeout=5)
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA synchronous=FULL")
    connection.execute("PRAGMA busy_timeout=5000")
    connection.execute(DDL)
    return connection


def append_verified366(
    path: Path,
    *,
    app_id: str,
    signed_envelope: Any,
    public_key_pem: bytes | None,
    trusted_pin: str,
    expected_commit: str,
    now_ms: int,
) -> dict[str, Any]:
    """Explicit local append only. Reject expired/forged/replayed private samples."""
    verified = verify_peer365(
        signed_envelope,
        public_key_pem,
        trusted_pin,
        app_id,
        expected_commit,
        now_ms,
    )
    if not verified["accepted"]:
        raise ValueError(verified["reason"])
    payload = signed_envelope["payload"]
    if not isinstance(payload.get("metrics"), dict):
        raise ValueError("HOLD_SYSOP366_BAD_METRICS")
    # An additional bounded, canonical record, never raw payload or signature.
    safe_metrics = {key: payload["metrics"][key] for key in FIELDS}
    if app_id not in APPS or payload["appId"] != app_id:
        raise ValueError("HOLD_SYSOP366_UNKNOWN_APP")
    row = (
        app_id,
        payload["eventId"],
        payload["nonce"],
        expected_commit,
        payload["issuedAtMs"],
        payload["sysop"]["observedAtMs"],
        payload["sysop"]["eventKind"],
        payload["state"],
        canonical(safe_metrics).decode("ascii"),
        payload["sysop"]["processUptimeSec"],
        payload["sysop"]["restartCount"],
        payload["sysop"]["bootTimeMs"],
    )
    with closing(_connect_write(path)) as db:
        with db:
            try:
                db.execute(
                    """INSERT INTO observations
                    (app_id,event_id,nonce,source_commit,issued_ms,observed_ms,
                     event_kind,state,metrics_json,process_uptime_sec,restart_count,boot_time_ms)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                    row,
                )
            except sqlite3.IntegrityError as error:
                raise ValueError("HOLD_SYSOP366_DUPLICATE_EVENT_OR_NONCE") from error
            db.execute("DELETE FROM observations WHERE issued_ms < ?", (now_ms - RETENTION_MS,))
            db.execute(
                """DELETE FROM observations WHERE id IN
                (SELECT id FROM observations ORDER BY id DESC LIMIT -1 OFFSET ?)""",
                (MAX_RECORDS,),
            )
            new_count = db.execute("SELECT COUNT(*) FROM observations").fetchone()[0]
    return {
        "status": "PERSISTED_SIGNED_SOURCE_CLAIM_ONLY",
        "appId": app_id,
        "storedAggregateCount": new_count,
        "liveAuthenticatedTransportVerified": False,
        "physicalRebootIndependentlyWitnessed": False,
        "serviceActionsAuthorized": False,
    }


def _read_rows(path: Path) -> list[sqlite3.Row]:
    safe = _safe_path(path, create=False)
    db = sqlite3.connect(f"{safe.as_uri()}?mode=ro", uri=True, timeout=3)
    try:
        db.row_factory = sqlite3.Row
        rows = db.execute(
            """SELECT app_id,event_id,source_commit,issued_ms,observed_ms,
                      event_kind,state,metrics_json,process_uptime_sec,
                      restart_count,boot_time_ms
               FROM observations ORDER BY id DESC LIMIT ?""",
            (MAX_RECORDS,),
        ).fetchall()
        return rows
    finally:
        db.close()


def summary366(path: Path | None, *, now_ms: int, original_host: bool) -> dict[str, Any]:
    result: dict[str, Any] = {
        "schema": SCHEMA,
        "sourceBuild": 366,
        "originalHost": "DESKTOP-AE894KC",
        "serverShell": "ai-data-platform",
        "journalStatus": "HOLD_NOT_ORIGINAL_HOST_OR_UNCONFIGURED",
        "historyCount": 0,
        "sources": [
            {
                "appId": name,
                "recordCount": 0,
                "lastClaimedAtMs": None,
                "freshSignedSourceOnly": False,
            }
            for name in APPS
        ],
        "events": [],
        "liveConnectedSourceCount": 0,
        "liveAuthenticatedTransportVerified": False,
        "physicalRebootIndependentlyWitnessed": False,
        "threeMasterRuntimeGreen": False,
        "commsPrivateReceiverAuthorized": False,
        "webMutationAvailable": False,
    }
    if not original_host or path is None:
        return result
    try:
        rows = _read_rows(path)
        if len(rows) > MAX_RECORDS:
            raise ValueError("HOLD_SYSOP366_OVERSIZED_LEDGER")
        clean = []
        ids: set[tuple[str, str]] = set()
        for row in rows:
            if (
                row["app_id"] not in APPS
                or type(row["event_id"]) is not str
                or (row["app_id"], row["event_id"]) in ids
                or type(row["issued_ms"]) is not int
                or type(row["observed_ms"]) is not int
                or row["issued_ms"] > now_ms + 2000
                or row["issued_ms"] < now_ms - RETENTION_MS
            ):
                raise ValueError("HOLD_SYSOP366_LEDGER_CONTENTS")
            metrics = json.loads(row["metrics_json"])
            if not isinstance(metrics, dict) or set(metrics) != set(FIELDS):
                raise ValueError("HOLD_SYSOP366_LEDGER_METRICS")
            ids.add((row["app_id"], row["event_id"]))
            clean.append({
                "appId": row["app_id"],
                "eventKind": row["event_kind"],
                "observedAtMs": row["observed_ms"],
                "claimedStatus": row["state"],
                "sourceCommit": row["source_commit"],
                "metrics": metrics,
                "processUptimeSec": row["process_uptime_sec"],
                "restartCount": row["restart_count"],
                "bootTimeMs": row["boot_time_ms"],
                "liveAuthenticatedTransportVerified": False,
                "physicalRebootIndependentlyWitnessed": False,
            })
        result["historyCount"] = len(clean)
        result["journalStatus"] = "LOCAL_SIGNED_CLAIM_HISTORY_ONLY"
        result["events"] = clean[:24]
        sources = []
        for name in APPS:
            events = [x for x in clean if x["appId"] == name]
            sources.append({
                "appId": name,
                "recordCount": len(events),
                "lastClaimedAtMs": events[0]["observedAtMs"] if events else None,
                "freshSignedSourceOnly": bool(
                    events and now_ms - events[0]["observedAtMs"] <= 90_000
                ),
            })
        result["sources"] = sources
    except (OSError, sqlite3.Error, ValueError, TypeError, KeyError):
        result["journalStatus"] = "HOLD_PRIVATE_LEDGER_INVALID_OR_MISSING"
    return result
