"""Build 384: optional AcuRite-via-Weather Underground PWS read-only cache.

No API key in source, logs, browser, metrics or SQLite. Only a deliberately run
original-Windows-host CLI can request Weather Underground; normal UI GETs are
local SQLite cache reads and never consume a remote API call.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import sqlite3
from contextlib import closing
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from rosevear_ai_hub.sysop_history366 import _safe_path

WEATHER_SCHEMA384 = "rosevear.hub.wu-pws-weather384.v1"
PWS_URL384 = "https://api.weather.com/v2/pws/observations/current"
STATION_RE384 = re.compile(r"[A-Z0-9]{4,32}\Z")
API_KEY_RE384 = re.compile(r"[A-Za-z0-9]{20,128}\Z")
MIN_INTERVAL_MS384 = 300_000
DAILY_CALL_CAP384 = 1000
MAX_RESPONSE_BYTES384 = 16_384
WEATHER_FIELDS384 = {
    "temperatureC": ("temp", -70, 65),
    "windKmh": ("windSpeed", 0, 300),
    "windGustKmh": ("windGust", 0, 400),
    "pressureHpa": ("pressure", 700, 1150),
    "rainRateMmH": ("precipRate", 0, 1000),
    "dailyRainMm": ("precipTotal", 0, 3000),
}
DDL384 = """
CREATE TABLE IF NOT EXISTS wu_budget384 (
  id INTEGER PRIMARY KEY CHECK(id=1),
  utc_day TEXT NOT NULL,
  calls INTEGER NOT NULL,
  last_attempt_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS wu_cached384 (
  id INTEGER PRIMARY KEY CHECK(id=1),
  station_hash TEXT NOT NULL,
  observed_ms INTEGER NOT NULL,
  fetched_ms INTEGER NOT NULL,
  sanitized_json TEXT NOT NULL
);
"""


def _metric384(value: Any, low: float, high: float) -> float | None:
    if value is None:
        return None
    if type(value) not in (int, float) or not math.isfinite(value):
        raise ValueError("HOLD_WU_INVALID_NUMERIC_VALUE")
    if not low <= value <= high:
        raise ValueError("HOLD_WU_OUT_OF_RANGE")
    return round(float(value), 2)


def parse_observation384(
    raw: Any, *, station_id: str, now_ms: int
) -> dict[str, Any]:
    """Allowlist sanitized readings; never return station ID, coordinates or full JSON."""
    if not (
        STATION_RE384.fullmatch(station_id)
        and type(raw) is dict
        and type(raw.get("observations")) is list
        and len(raw["observations"]) == 1
        and type(raw["observations"][0]) is dict
    ):
        raise ValueError("HOLD_WU_NOT_OUR_STATION")
    item = raw["observations"][0]
    if item.get("stationID") != station_id:
        raise ValueError("HOLD_WU_WRONG_STATION")
    epoch = item.get("epoch")
    qc = item.get("qcStatus")
    metric = item.get("metric")
    if not (
        type(epoch) is int
        and 0 <= now_ms - epoch * 1000 <= 3_600_000
        and type(qc) is int
        and qc in (-1, 0, 1)
        and type(metric) is dict
    ):
        raise ValueError("HOLD_WU_STALE_OR_INVALID")
    if qc == 0:
        raise ValueError("HOLD_WU_QUALITY_CONTROL_FLAG")
    sanitized = {
        key: _metric384(metric.get(source), low, high)
        for key, (source, low, high) in WEATHER_FIELDS384.items()
    }
    sanitized["humidityPercent"] = _metric384(item.get("humidity"), 0, 100)
    sanitized["windDirectionDegrees"] = _metric384(item.get("winddir"), 0, 360)
    return {
        "observedAtMs": epoch * 1000,
        "quality": "PASSED_PROVIDER_QC" if qc == 1 else "PROVIDER_QC_NOT_PERFORMED",
        "values": sanitized,
    }


def _owner_key384(path_text: str) -> str:
    path = Path(path_text)
    repo = Path(__file__).resolve().parents[3]
    if not (
        path.is_absolute()
        and path.is_file()
        and not path.is_symlink()
        and not path.parent.is_symlink()
        and repo not in path.resolve().parents
        and 20 <= path.stat().st_size <= 130
    ):
        raise ValueError("HOLD_WU_PRIVATE_API_KEY")
    raw = path.read_text(encoding="ascii").strip()
    if not API_KEY_RE384.fullmatch(raw):
        raise ValueError("HOLD_WU_INVALID_API_KEY")
    return raw


def _reserve384(path: Path, *, now_ms: int) -> int:
    safe = _safe_path(path, create=True)
    day = datetime.fromtimestamp(now_ms / 1000, UTC).strftime("%Y-%m-%d")
    with closing(sqlite3.connect(str(safe), timeout=5, isolation_level=None)) as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("PRAGMA synchronous=FULL")
        db.executescript(DDL384)
        db.execute("BEGIN IMMEDIATE")
        try:
            row = db.execute(
                "SELECT utc_day,calls,last_attempt_ms FROM wu_budget384 WHERE id=1"
            ).fetchone()
            used = row[1] if row and row[0] == day else 0
            if row and now_ms - row[2] < MIN_INTERVAL_MS384:
                raise ValueError("HOLD_WU_FIVE_MINUTE_CACHE")
            if used >= DAILY_CALL_CAP384:
                raise ValueError("HOLD_WU_DAILY_API_BUDGET")
            db.execute(
                """INSERT INTO wu_budget384(id,utc_day,calls,last_attempt_ms)
                   VALUES(1,?,?,?)
                   ON CONFLICT(id) DO UPDATE SET utc_day=excluded.utc_day,
                     calls=excluded.calls,last_attempt_ms=excluded.last_attempt_ms""",
                (day, used + 1, now_ms),
            )
            db.execute("COMMIT")
            return used + 1
        except (OSError, ValueError, sqlite3.Error):
            db.execute("ROLLBACK")
            raise


def _fetch384(station_id: str, api_key: str) -> Any:
    """Single HTTPS GET; no retries, redirects, proxies, or raw URL/error logging."""
    try:
        with httpx.Client(timeout=5.0, follow_redirects=False, trust_env=False) as client:
            response = client.get(
                PWS_URL384,
                params={
                    "stationId": station_id,
                    "format": "json",
                    "units": "m",
                    "apiKey": api_key,
                },
                headers={"Accept": "application/json"},
            )
            if (
                response.status_code != 200
                or response.headers.get("content-type", "").split(";")[0] != "application/json"
                or len(response.content) > MAX_RESPONSE_BYTES384
            ):
                raise ValueError("HOLD_WU_REMOTE_RESPONSE")
            return response.json()
    except (httpx.HTTPError, json.JSONDecodeError):
        raise ValueError("HOLD_WU_NETWORK_OR_JSON") from None


def poll_once384(
    path: Path,
    *,
    station_id: str,
    key_path: str,
    now_ms: int,
    original_host: bool,
    fetcher: Any = None,
) -> dict[str, Any]:
    """One opt-in owner operation; consumed attempts count even on network failures."""
    if not original_host:
        raise ValueError("HOLD_WU_NOT_ORIGINAL_HOST")
    if not STATION_RE384.fullmatch(station_id):
        raise ValueError("HOLD_WU_INVALID_STATION_ID")
    key = _owner_key384(key_path)
    safe = _safe_path(path, create=True)
    used = _reserve384(safe, now_ms=now_ms)
    raw = (_fetch384 if fetcher is None else fetcher)(station_id, key)
    clean = parse_observation384(raw, station_id=station_id, now_ms=now_ms)
    with closing(sqlite3.connect(str(safe), timeout=5)) as db:
        with db:
            db.execute(
                """INSERT INTO wu_cached384
                   (id,station_hash,observed_ms,fetched_ms,sanitized_json)
                   VALUES(1,?,?,?,?)
                   ON CONFLICT(id) DO UPDATE SET station_hash=excluded.station_hash,
                     observed_ms=excluded.observed_ms,fetched_ms=excluded.fetched_ms,
                     sanitized_json=excluded.sanitized_json""",
                (
                    hashlib.sha256(station_id.encode("ascii")).hexdigest(),
                    clean["observedAtMs"],
                    now_ms,
                    json.dumps(clean, sort_keys=True, separators=(",", ":")),
                ),
            )
    return {
        "status": "SANITIZED_WU_OBSERVATION_CACHED",
        "callsUsedTodayByThisHub": used,
        "physicalWeatherStationIndependentlyVerified": False,
        "apiKeyExposed": False,
    }


def cached_weather384(
    path: Path | None, *, now_ms: int, original_host: bool
) -> dict[str, Any]:
    result = {
        "schema": WEATHER_SCHEMA384,
        "status": "HOLD_WU_NOT_CONFIGURED_OR_NOT_ORIGINAL_HOST",
        "observedAtMs": None,
        "ageSeconds": None,
        "quality": None,
        "values": None,
        "callsUsedTodayByThisHub": 0,
        "dailyCallCapThisHub": DAILY_CALL_CAP384,
        "recommendedRefreshMinutes": 5,
        "provider": "Weather Underground PWS",
        "source": "AcuRite via owner-enrolled WU account",
        "physicalWeatherStationIndependentlyVerified": False,
        "apiKeyExposed": False,
        "webCanTriggerRemoteFetch": False,
    }
    if not original_host or path is None:
        return result
    try:
        safe = _safe_path(path, create=False)
        with closing(sqlite3.connect(f"{safe.as_uri()}?mode=ro", uri=True, timeout=3)) as db:
            budget = db.execute(
                "SELECT utc_day,calls FROM wu_budget384 WHERE id=1"
            ).fetchone()
            row = db.execute(
                "SELECT observed_ms, fetched_ms, sanitized_json FROM wu_cached384 WHERE id=1"
            ).fetchone()
        day = datetime.fromtimestamp(now_ms / 1000, UTC).strftime("%Y-%m-%d")
        used = budget[1] if budget and budget[0] == day else 0
        if not row:
            return {
                **result,
                "status": "HOLD_NO_VALID_PWS_OBSERVATION",
                "callsUsedTodayByThisHub": used,
            }
        item = json.loads(row[2])
        age = now_ms - row[0]
        if not (
            type(item) is dict
            and set(item) == {"observedAtMs", "quality", "values"}
            and item["observedAtMs"] == row[0]
            and type(row[1]) is int
            and 0 <= now_ms - row[1] <= 7 * 86_400_000
            and type(age) is int
            and age >= 0
            and item["quality"] in ("PASSED_PROVIDER_QC", "PROVIDER_QC_NOT_PERFORMED")
            and type(item["values"]) is dict
            and set(item["values"]) == set(WEATHER_FIELDS384) | {
                "humidityPercent", "windDirectionDegrees"
            }
        ):
            raise ValueError("HOLD_WU_CACHE_INVALID")
        for key, (_field, low, high) in WEATHER_FIELDS384.items():
            _metric384(item["values"][key], low, high)
        _metric384(item["values"]["humidityPercent"], 0, 100)
        _metric384(item["values"]["windDirectionDegrees"], 0, 360)
        return {
            **result,
            "status": (
                "RECENT_CACHED_PROVIDER_OBSERVATION_NOT_SENSOR_ATTESTED"
                if age <= 1_200_000
                else "STALE_CACHED_PROVIDER_OBSERVATION"
            ),
            "observedAtMs": row[0],
            "ageSeconds": age // 1000,
            "quality": item["quality"],
            "values": item["values"],
            "callsUsedTodayByThisHub": used,
        }
    except (OSError, sqlite3.Error, ValueError, TypeError, KeyError, OverflowError):
        return {**result, "status": "HOLD_WU_CACHE_INVALID_OR_UNAVAILABLE"}
