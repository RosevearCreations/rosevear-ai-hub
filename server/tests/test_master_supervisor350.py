"""QL-459 signed local Windows services, recovery budget and read-only custody."""

import hashlib
import sqlite3
import subprocess
import types
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi.testclient import TestClient

import rosevear_ai_hub.master_supervisor350 as supervisor
from rosevear_ai_hub.api.server_shell350 import router
from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell349 import MASTER_MODULES, ORIGINAL_HOST, SCHEMA349
from rosevear_ai_hub.master_supervisor350 import (
    SERVICES350,
    CustodyJournal350,
    WindowsServices350,
    apply_local_action350,
    observe_local_modules350,
    verify_permit350,
)
from rosevear_ai_hub.service_identity347 import _canonical, _digest


def fixture(now: int = 1_800_000_000_000):
    signer = Ed25519PrivateKey.generate()
    pub = signer.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    pin = hashlib.sha256(pub).hexdigest()
    manifest = {
        "schema": SCHEMA349,
        "originalHost": ORIGINAL_HOST,
        "issuedAtMs": now - 1_000,
        "expiresAtMs": now + 2 * 86_400_000,
        "modules": [
            {"id": m, "desiredEnabled": True, "theme": "instrument"} for m in MASTER_MODULES
        ],
        "peers": [],
    }
    enrollment = {"accepted": True, "payload": manifest}
    return signer, pub, pin, enrollment


def signed_permit(signer, enrollment, module, action, now, *, nonce="A" * 24):
    payload = {
        "schema": supervisor.SCHEMA350,
        "originalHost": ORIGINAL_HOST,
        "manifestDigest": _digest(enrollment["payload"]),
        "moduleId": module,
        "serviceName": SERVICES350[module],
        "action": action,
        "nonce": nonce,
        "issuedAtMs": now - 1_000,
        "expiresAtMs": (now + 3_600_000 if action == "recover" else now + 10_000),
    }
    return {"payload": payload, "signature": signer.sign(_canonical(payload)).hex()}


def test_exact_signed_owner_permit_is_finite_and_scoped():
    now = 1_800_000_000_000
    signer, pub, pin, enrollment = fixture(now)
    token = signed_permit(signer, enrollment, "rosevear-ai-hub", "start", now)
    assert verify_permit350(
        enrollment=enrollment,
        permit=token,
        owner_public=pub,
        owner_pin=pin,
        now_ms=now,
        machine_name=ORIGINAL_HOST,
    )["accepted"]
    assert not verify_permit350(
        enrollment=enrollment,
        permit=token,
        owner_public=pub,
        owner_pin=pin,
        now_ms=now,
        machine_name="OTHER_HOST",
    )["accepted"]
    assert not verify_permit350(
        enrollment=enrollment,
        permit=token,
        owner_public=pub,
        owner_pin="0" * 64,
        now_ms=now,
        machine_name=ORIGINAL_HOST,
    )["accepted"]
    assert not verify_permit350(
        enrollment=enrollment,
        permit=token,
        owner_public=pub,
        owner_pin=pin,
        now_ms=now + 20_000,
        machine_name=ORIGINAL_HOST,
    )["accepted"]
    token["payload"]["serviceName"] = "Dangerous-Receiver-Relay"
    assert not verify_permit350(
        enrollment=enrollment,
        permit=token,
        owner_public=pub,
        owner_pin=pin,
        now_ms=now,
        machine_name=ORIGINAL_HOST,
    )["accepted"]


def test_module_signing_intent_not_local_scm_authority():
    now = 1_800_000_000_000
    signer, pub, pin, enrollment = fixture(now)
    enrollment["payload"]["modules"][0]["desiredEnabled"] = False
    token = signed_permit(signer, enrollment, MASTER_MODULES[0], "recover", now)
    assert (
        verify_permit350(
            enrollment=enrollment,
            permit=token,
            owner_public=pub,
            owner_pin=pin,
            now_ms=now,
            machine_name=ORIGINAL_HOST,
        )["accepted"]
        is False
    )
    stop = signed_permit(signer, enrollment, MASTER_MODULES[0], "stop", now)
    assert verify_permit350(
        enrollment=enrollment,
        permit=stop,
        owner_public=pub,
        owner_pin=pin,
        now_ms=now,
        machine_name=ORIGINAL_HOST,
    )["accepted"]


def test_durable_replay_cooldown_and_hourly_recovery_budget(tmp_path: Path):
    journal = CustodyJournal350(tmp_path / "owner.sqlite")
    assert journal.initialize()
    now = 1_800_000_000_000
    assert journal.reserve("A" * 24, "rosevear-ai-hub", "start", now) == "A" * 24
    assert journal.reserve("A" * 24, "rosevear-ai-hub", "start", now) is None
    assert journal.finish("A" * 24, "RUNNING")
    assert not journal.finish("A" * 24, "RUNNING")
    for index in range(3):
        at = now + index * 600_001
        assert (
            journal.reserve(
                "B" * 24,
                "rosevear-ai-hub",
                "recover",
                at,
            )
            is not None
        )
    assert (
        journal.reserve(
            "C" * 24,
            "rosevear-ai-hub",
            "recover",
            now + 3 * 600_001,
        )
        is None
    )
    assert (
        journal.reserve(
            "D" * 24,
            "rosevear-comms-hub",
            "recover",
            now + 600_001,
        )
        is not None
    )
    with sqlite3.connect(journal.path) as db:
        assert db.execute("SELECT COUNT(*) FROM actions350").fetchone()[0] == 5


class FakeWindowsServices(WindowsServices350):
    def __init__(self):
        self.states = {m: "STOPPED" for m in MASTER_MODULES}
        self.commands = []

    def inspect(self, module_id: str) -> str:
        return self.states[module_id]

    def change(self, module_id: str, action: str) -> str:
        self.commands.append((module_id, action))
        state = "RUNNING" if action == "start" else "STOPPED"
        self.states[module_id] = state
        return state


def _pretend_host(monkeypatch):
    monkeypatch.setattr(supervisor, "os", types.SimpleNamespace(name="nt"))
    monkeypatch.setattr(
        supervisor,
        "platform",
        types.SimpleNamespace(node=lambda: ORIGINAL_HOST),
    )


def test_real_scm_path_requires_independent_signed_local_action(monkeypatch, tmp_path: Path):
    now = 1_800_000_000_000
    signer, pub, pin, enrollment = fixture(now)
    journal = CustodyJournal350(tmp_path / "owner.sqlite")
    assert journal.initialize()
    manager = FakeWindowsServices()
    before = observe_local_modules350(
        enrollment,
        journal,
        manager,
        now,
        ORIGINAL_HOST,
    )
    assert not before["observed"]
    assert manager.commands == []
    _pretend_host(monkeypatch)
    assert observe_local_modules350(
        enrollment,
        journal,
        manager,
        now,
        ORIGINAL_HOST,
    )["observed"]
    assert manager.commands == []
    permit = signed_permit(signer, enrollment, "rosevear-ai-hub", "start", now)
    result = apply_local_action350(
        enrollment=enrollment,
        permit=permit,
        owner_public=pub,
        owner_pin=pin,
        journal=journal,
        controller=manager,
        now_ms=now,
        machine_name=ORIGINAL_HOST,
    )
    assert result["accepted"] and result["observedState"] == "RUNNING"
    assert manager.commands == [("rosevear-ai-hub", "start")]
    assert not apply_local_action350(
        enrollment=enrollment,
        permit=permit,
        owner_public=pub,
        owner_pin=pin,
        journal=journal,
        controller=manager,
        now_ms=now,
        machine_name=ORIGINAL_HOST,
    )["accepted"]
    observations = journal.recent(_digest(enrollment["payload"]), now)
    assert observations["rosevear-ai-hub"]["state"] == "RUNNING"
    assert journal.recent("0" * 64, now) == {}
    assert journal.recent(_digest(enrollment["payload"]), now + 200_000) == {}


def test_scm_parsing_fails_closed_without_real_windows(monkeypatch):
    manager = WindowsServices350()
    assert manager.inspect("physical-receiver") == "UNKNOWN"
    assert manager.change("physical-receiver", "start") == "UNVERIFIED"
    manager._sc = lambda verb, service: subprocess.CompletedProcess(
        [verb, service],
        0,
        "SERVICE_NAME: safe\n        STATE              : 4  RUNNING\n",
        "",
    )
    assert manager.inspect("rosevear-ai-hub") == "RUNNING"
    manager._sc = lambda verb, service: subprocess.CompletedProcess(
        [verb, service],
        0,
        "SERVICE_NAME: safe\n        STATE              : 1  STOPPED\n",
        "",
    )
    assert manager.inspect("rosevear-ai-hub") == "STOPPED"


def test_anonymous_api_and_mutation_denied():
    client = TestClient(app)
    path = "/api/v1/system/server-shell-350"
    assert all(route.methods == {"GET"} for route in router.routes)
    assert client.get(path).status_code in (401, 403)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(path).status_code in (401, 403, 405)
