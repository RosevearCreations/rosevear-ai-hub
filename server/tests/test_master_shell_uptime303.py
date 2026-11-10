"""Build 303: original-Windows-only sampler and fail-closed status contract."""

import asyncio

from fastapi.testclient import TestClient

from rosevear_ai_hub.automation_runtime import AutomationEventRuntime
from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_uptime303 import (
    MAX_SAMPLES,
    ORIGINAL_HOST,
    LocalUptimeSampler303,
    authorized_local_host,
)


def test_ree_windows_host_and_explicit_enable_are_both_required():
    assert authorized_local_host(system="Windows", hostname=ORIGINAL_HOST, enabled=True)
    assert not authorized_local_host(system="Windows", hostname="TEMPLAR", enabled=True)
    assert not authorized_local_host(system="Linux", hostname=ORIGINAL_HOST, enabled=True)
    assert not authorized_local_host(system="Windows", hostname=ORIGINAL_HOST, enabled=False)
    denied = LocalUptimeSampler303(system="Linux", hostname=ORIGINAL_HOST, enabled=True)
    asyncio.run(denied.sample_once())
    assert denied.snapshot()["sampleCount"] == 0
    assert denied.snapshot()["collectionState"] == "HOLD_NOT_ENABLED_OR_WRONG_HOST"


def test_bounded_local_samples_express_tcp_reachability_without_connection_proof():
    observed = []
    monotonic = [100.0]

    async def fake_probe(port: int) -> bool:
        observed.append(port)
        return port == 8765

    sampler = LocalUptimeSampler303(
        system="Windows",
        hostname=ORIGINAL_HOST,
        enabled=True,
        probe=fake_probe,
        monotonic=lambda: monotonic[0],
    )
    asyncio.run(sampler.sample_once())
    snap = sampler.snapshot()
    assert observed == [8765, 5173, 8443]
    assert snap["collectionState"] == "MONITORING_LOCAL"
    assert snap["connection"] == "HOLD"
    assert snap["authenticatedShellTransport"] == "DISABLED"
    assert snap["automatedExternalActions"] == 0
    assert snap["services"][0]["state"] == "TCP_REACHABLE"
    assert snap["services"][1]["state"] == "TCP_UNREACHABLE"
    assert snap["historyDurability"] == "MEMORY_ONLY_RESET_ON_RESTART"
    monotonic[0] += 140
    assert sampler.snapshot()["services"][0]["state"] == "STALE"


def test_memory_history_is_bounded_after_more_than_one_day():
    async def fake_probe(_port: int) -> bool:
        return True

    sampler = LocalUptimeSampler303(
        system="Windows",
        hostname=ORIGINAL_HOST,
        enabled=True,
        probe=fake_probe,
    )

    async def samples():
        for _ in range(MAX_SAMPLES + 2):
            await sampler.sample_once()

    asyncio.run(samples())
    assert sampler.snapshot()["sampleCount"] == MAX_SAMPLES


def test_local_sampler_endpoint_is_not_a_public_health_or_shell_bypass():
    client = TestClient(app)
    response = client.get("/api/v1/system/master-shell-local-uptime")
    assert response.status_code == 401


def test_owner_opt_in_holds_legacy_event_worker_off_ree_host(monkeypatch):
    monkeypatch.setenv("ROSEVEAR_REQUIRE_REE_AUTOMATION_HOST", "1")
    monkeypatch.setattr("rosevear_ai_hub.automation_runtime.platform.system", lambda: "Linux")
    monkeypatch.setattr("rosevear_ai_hub.automation_runtime.socket.gethostname", lambda: "TEMPLAR")
    runtime = AutomationEventRuntime()
    asyncio.run(runtime.start())
    assert runtime.snapshot()["running"] is False
