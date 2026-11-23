"""Build384: station privacy, response allowlist and call-budget fail closed."""

import sqlite3

import pytest

from rosevear_ai_hub.weather_pws384 import (
    DAILY_CALL_CAP384,
    cached_weather384,
    parse_observation384,
    poll_once384,
)

NOW384 = 1_800_000_000_000
STATION384 = "IONTARIO123"


def raw384(*, offset_seconds=30, quality=1, station=STATION384):
    return {
        "observations": [
            {
                "stationID": station,
                "epoch": NOW384 // 1000 - offset_seconds,
                "qcStatus": quality,
                "lat": 42.8,
                "lon": -80.8,
                "neighborhood": "Sensitive Home Address",
                "humidity": 63,
                "winddir": 220,
                "metric": {
                    "temp": 3.5,
                    "windSpeed": 19.0,
                    "windGust": 28.2,
                    "pressure": 1016.0,
                    "precipRate": 0,
                    "precipTotal": 2.5,
                },
            }
        ]
    }


def test_weather_metric_sanitization_qc_and_staleness():
    safe = parse_observation384(raw384(), station_id=STATION384, now_ms=NOW384)
    assert safe["values"]["temperatureC"] == 3.5
    assert safe["values"]["windGustKmh"] == 28.2
    assert "lat" not in str(safe) and "Sensitive Home Address" not in str(safe)
    for bad in (
        raw384(station="ANOTHERSTATION"),
        raw384(offset_seconds=4000),
        raw384(quality=0),
    ):
        with pytest.raises(ValueError):
            parse_observation384(bad, station_id=STATION384, now_ms=NOW384)
    too_hot = raw384()
    too_hot["observations"][0]["metric"]["temp"] = 9999
    with pytest.raises(ValueError):
        parse_observation384(too_hot, station_id=STATION384, now_ms=NOW384)


def test_supervised_local_cached_weather_and_daily_limits(tmp_path):
    key_path = tmp_path / "pws-key.txt"
    key_path.write_text("A" * 32, encoding="ascii")
    journal = tmp_path / "wu.sqlite"
    assert cached_weather384(journal, now_ms=NOW384, original_host=False)["values"] is None
    first = poll_once384(
        journal, station_id=STATION384, key_path=str(key_path),
        now_ms=NOW384, original_host=True, fetcher=lambda station, key: raw384(),
    )
    assert first["callsUsedTodayByThisHub"] == 1
    cache = cached_weather384(journal, now_ms=NOW384, original_host=True)
    assert cache["status"] == "RECENT_CACHED_PROVIDER_OBSERVATION_NOT_SENSOR_ATTESTED"
    assert cache["values"]["humidityPercent"] == 63
    assert cache["physicalWeatherStationIndependentlyVerified"] is False
    assert "A" * 32 not in str(cache) and STATION384 not in str(cache)
    with pytest.raises(ValueError, match="HOLD_WU_FIVE_MINUTE_CACHE"):
        poll_once384(
            journal, station_id=STATION384, key_path=str(key_path),
            now_ms=NOW384 + 1000, original_host=True, fetcher=lambda station, key: raw384(),
        )
    older = cached_weather384(journal, now_ms=NOW384 + 1_800_000, original_host=True)
    assert older["status"] == "STALE_CACHED_PROVIDER_OBSERVATION"
    with sqlite3.connect(journal) as db:
        db.execute("UPDATE wu_budget384 SET calls=?, last_attempt_ms=?", (DAILY_CALL_CAP384, 0))
    with pytest.raises(ValueError, match="HOLD_WU_DAILY_API_BUDGET"):
        poll_once384(
            journal, station_id=STATION384, key_path=str(key_path),
            now_ms=NOW384 + 400_000, original_host=True,
            fetcher=lambda station, key: raw384(),
        )


def test_network_failure_spends_one_attempt_without_faking_new_reading(tmp_path):
    key_path = tmp_path / "pws-key.txt"
    key_path.write_text("B" * 32, encoding="ascii")
    journal = tmp_path / "wu.sqlite"

    def unreachable(_station, _key):
        raise ValueError("HOLD_WU_NETWORK_OR_JSON")

    with pytest.raises(ValueError):
        poll_once384(
            journal, station_id=STATION384, key_path=str(key_path),
            now_ms=NOW384, original_host=True, fetcher=unreachable,
        )
    result = cached_weather384(journal, now_ms=NOW384, original_host=True)
    assert result["callsUsedTodayByThisHub"] == 1
    assert result["values"] is None
