"""Build 370 signed, owner-only, no-actuation gateway tests."""

import hashlib
import json
import time

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.workshop_gateway370 import Payload370, canonical370
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AuditEvent, WorkshopGatewayReceipt370


def prepared(tmp_path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'gateway370.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)

    def override():
        with sessions() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_session] = override
    client = TestClient(app)
    private = Ed25519PrivateKey.generate()
    public = private.public_key()
    public_path = tmp_path / "source.pub.pem"
    public_path.write_bytes(public.public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo,
    ))
    pin = hashlib.sha256(public.public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw,
    )).hexdigest()
    monkeypatch.setenv("ROSEVEAR_WORKSHOP370_PUBLIC_KEY_PATH", str(public_path))
    monkeypatch.setenv("ROSEVEAR_WORKSHOP370_PUBLIC_KEY_PIN", pin)
    monkeypatch.setenv("ROSEVEAR_WORKSHOP370_COLLECTOR_ID", "printer-pc")
    return client, sessions, private


def signed(private, *, nonce="a" * 32, observed=None, devices=None):
    moment = observed or int(time.time() * 1000)
    payload = Payload370.model_validate({
        "schema": "rosevear.hub.workshop-gateway.v370",
        "collector_id": "printer-pc", "observed_at_ms": moment,
        "expires_at_ms": moment + 60000, "nonce": nonce,
        "mode": "READ_ONLY_LOCAL_WINDOWS_OBSERVATION",
        "commands_sent": 0, "physical_devices_verified": False,
        "devices": devices if devices is not None else [
            {"kind": "serial", "device_id": "COM7",
             "label": "Windows serial interface COM7",
             "presence": "enumerated", "proof": "windows_registry"},
            {"kind": "manual_note", "device_id": "cricut",
             "label": "Cricut Maker 3", "presence": "unverified", "proof": "owner_note"},
        ],
    })
    return {
        "payload": payload.model_dump(mode="json", exclude_unset=True),
        "signature": private.sign(canonical370(payload)).hex(),
    }


def test_signed_receipt_first_read_owner_only_and_replay(tmp_path, monkeypatch):
    client, sessions, private = prepared(tmp_path, monkeypatch)
    url = "/api/v1/workshop-gateway-370"
    assert client.get(url + "/status").status_code == 401
    assert client.post("/api/v1/auth/bootstrap", json={
        "username": "owner", "password": "owner-password-123",
    }).status_code == 201
    assert client.get(url + "/status").json()["state"] == "HOLD_NOT_ENROLLED"
    packet = signed(private)
    assert client.post(url + "/receipt", json=packet).status_code == 202
    assert client.post(url + "/receipt", json=packet).status_code == 409
    report = client.get(url + "/status").json()
    assert report["state"] == "SOURCE_RECEIVED"
    assert report["commandsSent"] == 0
    assert report["physicalDevicesVerified"] is False
    assert report["devices"][0]["device_id"] == "COM7"
    assert report["devices"][1]["presence"] == "unverified"
    with sessions() as db:
        assert len(db.scalars(select(WorkshopGatewayReceipt370)).all()) == 1
        assert db.scalars(select(AuditEvent).where(
            AuditEvent.event_type == "workshop370.signed_source_received",
        )).all()


def test_forged_stale_unpinned_and_false_machine_attestation(tmp_path, monkeypatch):
    client, _sessions, private = prepared(tmp_path, monkeypatch)
    url = "/api/v1/workshop-gateway-370/receipt"
    packet = signed(private)
    forged = json.loads(json.dumps(packet))
    forged["payload"]["devices"][0]["device_id"] = "COM9"
    assert client.post(url, json=forged).status_code == 403
    assert client.post(url, json=signed(
        private, observed=int(time.time() * 1000) - 180000,
    )).status_code == 403
    invalid = signed(private, nonce="b" * 32, devices=[{
        "kind": "manual_note", "device_id": "laser", "label": "Laser",
        "presence": "reported_printing", "proof": "owner_note",
    }])
    assert client.post(url, json=invalid).status_code == 403
    not_proven = signed(private, nonce="c" * 32, devices=[{
        "kind": "serial", "device_id": "COM7", "label": "Port COM7",
        "presence": "enumerated", "proof": "windows_registry", "nozzle_c": 210,
    }])
    assert client.post(url, json=not_proven).status_code == 403
    monkeypatch.setenv("ROSEVEAR_WORKSHOP370_PUBLIC_KEY_PIN", "f" * 64)
    assert client.post(url, json=packet).status_code == 403


def test_collector_private_https_and_no_physical_machine_assumptions():
    import importlib.util
    from pathlib import Path

    path = Path(__file__).parents[2] / "scripts" / "printer-pc-collector370.py"
    spec = importlib.util.spec_from_file_location("printer_pc_370", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    correct = "https://192.168.1.20:8443/api/v1/workshop-gateway-370/receipt"
    assert module.valid_private_url(correct) == correct
    for candidate in (
        "https://example.com:8443/api/v1/workshop-gateway-370/receipt",
        "http://192.168.1.20:8443/api/v1/workshop-gateway-370/receipt",
        "https://127.0.0.1:8443/api/v1/workshop-gateway-370/receipt",
        "https://192.168.1.20:8443/internal/controls",
    ):
        with pytest.raises(ValueError):
            module.valid_private_url(candidate)
    assert module.windows_registry_devices() == []
    assert module.optional_octoprint() is None
