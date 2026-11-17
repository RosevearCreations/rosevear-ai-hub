"""QL-460 fail-closed event ledger, local boot source, verified issue alerts and API."""

import hashlib
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import rosevear_ai_hub.master_bus351 as source
from rosevear_ai_hub.api.home_assistant import HomeAssistantRuntime
from rosevear_ai_hub.api.server_shell351 import (
    _home_url_allowed351,
    home_readonly_status351,
    router,
)
from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_bus351 import (
    BootWitness351,
    MasterEventBus351,
    publish_module_observations351,
)
from rosevear_ai_hub.master_shell349 import MASTER_MODULES
from rosevear_ai_hub.master_supervisor350 import CustodyJournal350
from rosevear_ai_hub.service_identity347 import _canonical, _digest


def _set_host(monkeypatch):
    monkeypatch.setattr(source, "_local_original_host", lambda: True)


def test_source_only_event_chain_and_issues(monkeypatch, tmp_path: Path):
    _set_host(monkeypatch)
    journal = MasterEventBus351(tmp_path / "bus.sqlite")
    assert journal.initialize()
    now = 1_800_000_000_000
    manifest = "a" * 64
    evidence = hashlib.sha256(_canonical(["svc", "STOPPED", now])).hexdigest()
    assert journal.append(
        source="rosevear-ai-hub", kind="module.observed", state="STOPPED",
        evidence_sha=evidence, observed_ms=now, manifest_sha=manifest,
    )
    assert not journal.append(
        source="rosevear-ai-hub", kind="module.observed", state="STOPPED",
        evidence_sha=evidence, observed_ms=now, manifest_sha=manifest,
    )
    assert not journal.append(
        source="physical-receiver", kind="module.observed", state="RUNNING",
        evidence_sha=evidence, observed_ms=now, manifest_sha=manifest,
    )
    result = journal.recent(manifest_sha=manifest, now_ms=now)
    assert result["integrity"] == "LOCAL_HASH_CHAIN_VALID"
    assert result["issues"][0]["source"] == "rosevear-ai-hub"
    assert result["issues"][0]["disposition"] == "OPEN_UNACKNOWLEDGED"
    assert result["outboundNotificationsSent"] is False
    assert journal.recent(manifest_sha=manifest, now_ms=now + 200_000)["issues"] == []
    with sqlite3.connect(journal.path) as db:
        db.execute("UPDATE master_events351 SET state = 'RUNNING'")
    assert journal.recent(manifest_sha=manifest, now_ms=now)["integrity"] == "HOLD"


def test_corrupt_earlier_event_holds_all_later_events(monkeypatch, tmp_path: Path):
    _set_host(monkeypatch)
    bus = MasterEventBus351(tmp_path / "bus.sqlite")
    assert bus.initialize()
    now = 1_800_000_000_000
    for n in range(2):
        assert bus.append(
            source=MASTER_MODULES[n], kind="module.observed",
            state="RUNNING", evidence_sha=("a" if n == 0 else "b") * 64,
            observed_ms=now + n, manifest_sha="d" * 64,
        )
    with sqlite3.connect(bus.path) as db:
        db.execute("UPDATE master_events351 SET evidence_sha = ? WHERE seq = 1", ("c" * 64,))
    assert bus.recent(manifest_sha="d" * 64, now_ms=now + 2)["events"] == []


def test_post_boot_witness_never_proves_task_autostart(monkeypatch, tmp_path: Path):
    _set_host(monkeypatch)
    boot = BootWitness351(tmp_path / "boot.sqlite")
    assert boot.initialize()
    now = 1_800_000_000_000
    values = {m: "RUNNING" for m in MASTER_MODULES}
    for boot_ms in (now - 2_000_000, now - 1_000):
        assert boot.record(
            boot_ms=boot_ms, observed_ms=now, manifest_sha="d" * 64, states=values,
        )
    result = boot.summary(manifest_sha="d" * 64, now_ms=now)
    assert result["distinctBoots"] == 2
    assert result["observation"] == "FRESH_LOCAL_POST_BOOT_SCM_WITNESS"
    assert result["taskAutostartVerified"] is False
    assert result["rebootPersistenceVerified"] is False
    assert boot.summary(manifest_sha="c" * 64, now_ms=now)["distinctBoots"] == 0
    assert boot.summary(manifest_sha="d" * 64, now_ms=now + 300_000)["distinctBoots"] == 0


def test_scoped_original_host_observations_feed_event_bus(monkeypatch, tmp_path: Path):
    _set_host(monkeypatch)
    now = 1_800_000_000_000
    payload = {"schema": "test"}
    enrollment = {"accepted": True, "payload": payload}
    digest = _digest(payload)
    custody = CustodyJournal350(tmp_path / "custody.sqlite")
    bus = MasterEventBus351(tmp_path / "bus.sqlite")
    boot = BootWitness351(tmp_path / "boot.sqlite")
    assert custody.initialize() and bus.initialize() and boot.initialize()
    assert not publish_module_observations351(
        enrollment=enrollment, custody=custody, bus=bus, boot=boot,
        boot_ms=now - 100_000, now_ms=now,
    )
    for name in MASTER_MODULES:
        assert custody.observe(name, digest, "STOPPED" if name == MASTER_MODULES[0] else "RUNNING", now)
    assert publish_module_observations351(
        enrollment=enrollment, custody=custody, bus=bus, boot=boot,
        boot_ms=now - 100_000, now_ms=now,
    )
    assert len(bus.recent(manifest_sha=digest, now_ms=now)["events"]) == 3
    assert len(bus.recent(manifest_sha=digest, now_ms=now)["issues"]) == 1


@pytest.mark.asyncio
async def test_home_assistant_get_health_only_no_actuators():
    class Healthy:
        async def health(self):
            return "API running."

    runtime = HomeAssistantRuntime(
        client=Healthy(), base_url="https://ha.example.test",
        url_configured=True, token_configured=True,
    )
    assert _home_url_allowed351("https://ha.example.test")
    assert not _home_url_allowed351("http://ha.example.test")
    assert _home_url_allowed351("http://127.0.0.1:8123")
    result = await home_readonly_status351(runtime, original_host_verified=True)
    assert result["state"] == "AVAILABLE"
    assert result["physicalDeviceControlAuthorized"] is False
    assert (await home_readonly_status351(
        runtime, original_host_verified=False,
    ))["state"] == "UNVERIFIED"


def test_owner_only_get_and_windows_installer_controls():
    client = TestClient(app)
    uri = "/api/v1/system/server-shell-351"
    assert all(route.methods == {"GET"} for route in router.routes)
    assert client.get(uri).status_code in (401, 403)
    for method in ("post", "put", "delete", "patch"):
        assert getattr(client, method)(uri).status_code in (401, 403, 405)
    root = Path(__file__).resolve().parents[2]
    installer = (root / "scripts" / "install-three-master-observer351.ps1").read_text()
    assert "New-ScheduledTaskTrigger -AtStartup" in installer
    assert "Disable-ScheduledTask" in installer
    assert "HOLD_ORIGINAL_HOST_REQUIRED" in installer
    assert "Assert-KnownTask" in installer
    assert "physicalReceiverAuthorized=$false" in installer
    assert "Start-Service" not in installer
    assert "Restart-Service" not in installer
    assert "Start-ScheduledTask" not in installer
