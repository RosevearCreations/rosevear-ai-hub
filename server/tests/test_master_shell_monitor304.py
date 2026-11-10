"""Durable original-host monitoring must never create autonomous authority."""

import asyncio

from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_monitor304 import (
    DurableUptimeLedger304,
    PersistentReeMonitor304,
    storage_location304,
)


def test_private_local_windows_storage_only(tmp_path):
    assert storage_location304(None) is None
    assert storage_location304("relative-directory") is None
    assert storage_location304("\\\\untrusted\\share") is None
    assert storage_location304(str(tmp_path)).name == "uptime304.sqlite3"


def test_host_gate_prevents_writes_and_keeps_connections_on_hold(tmp_path):
    async def probe(_port):
        return True

    for hostname, policy in (("TEMPLAR", True), ("DESKTOP-AE894KC", False)):
        path = tmp_path / f"{hostname}-{policy}" / "uptime304.sqlite3"
        monitor = PersistentReeMonitor304(
            system="Windows",
            hostname=hostname,
            enabled=True,
            host_policy_enabled=policy,
            durable_path=path,
            probe=probe,
        )
        asyncio.run(monitor.sample_once())
        assert not path.exists()
        snapshot = monitor.persistent_snapshot304()
        assert snapshot["collectionState"].startswith("HOLD_")
        assert snapshot["connection"] == "HOLD"
        assert snapshot["newWindowsScheduledTasks"] == 0


def test_durable_restart_minute_dedup_and_bounded_incident_history(tmp_path):
    path = tmp_path / "protected" / "uptime304.sqlite3"
    base = 1794324000000
    clock = [base]

    async def probe(port):
        return port != 5173

    opts = dict(
        system="Windows",
        hostname="DESKTOP-AE894KC",
        enabled=True,
        host_policy_enabled=True,
        durable_path=path,
        wallclock_ms=lambda: clock[0],
        probe=probe,
    )
    monitor = PersistentReeMonitor304(**opts)
    asyncio.run(monitor.sample_once())
    assert monitor.persistent_snapshot304()["sampleCount"] == 1
    asyncio.run(monitor.sample_once())
    assert monitor.persistent_snapshot304()["sampleCount"] == 1
    clock[0] += 60000
    asyncio.run(monitor.sample_once())
    clock[0] += 60000
    asyncio.run(monitor.sample_once())
    restarted = PersistentReeMonitor304(**opts)
    snapshot = restarted.persistent_snapshot304()
    assert snapshot["sampleCount"] == 3
    assert snapshot["historyDurability"] == "SQLITE_7_DAYS_BOUNDED"
    # A fresh process can read disk history but never assert this session is live.
    assert snapshot["collectionState"] == "STALE_OR_NOT_YET_OBSERVED"
    assert snapshot["incidentCandidates"] == [
        {
            "service": "hub_web",
            "condition": "THREE_CONSECUTIVE_TCP_FAILURES",
            "disposition": "OFFLINE_COMMS_REVIEW_CANDIDATE_HOLD",
        }
    ]
    asyncio.run(restarted.sample_once())
    assert restarted.persistent_snapshot304()["collectionState"] == "OBSERVING_REE_LOCAL"
    assert restarted.persistent_snapshot304()["connection"] == "HOLD"

    ledger = DurableUptimeLedger304(path)
    assert not ledger.record(clock[0], {"hub_api": True, "hub_web": True})
    clock[0] += 8 * 24 * 60 * 60 * 1000
    assert ledger.record(clock[0], {"hub_api": True, "hub_web": True, "caddy_proxy": True})
    assert ledger.summary(clock[0])["sampleCount"] == 1


def test_owner_endpoint_is_not_public():
    client = TestClient(app)
    assert client.get("/api/v1/system/master-shell-reconciliation").status_code == 401
