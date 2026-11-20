"""Build 371 source-receipt reconciliation with synthetic Windows USB reports."""

import hashlib
import json
import time
from datetime import UTC, datetime

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.workshop_enrollment371 import reconcile371
from rosevear_ai_hub.api.workshop_gateway370 import Payload370, canonical370
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import WorkshopGatewayReceipt370


def prepared(tmp_path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'printer371.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)

    def override():
        with sessions() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_session] = override
    private = Ed25519PrivateKey.generate()
    public = private.public_key()
    public_path = tmp_path / "source.pub.pem"
    public_path.write_bytes(
        public.public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
        )
    )
    raw = public.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    monkeypatch.setenv("ROSEVEAR_WORKSHOP370_PUBLIC_KEY_PATH", str(public_path))
    monkeypatch.setenv("ROSEVEAR_WORKSHOP370_PUBLIC_KEY_PIN", hashlib.sha256(raw).hexdigest())
    monkeypatch.setenv("ROSEVEAR_WORKSHOP370_COLLECTOR_ID", "printer-pc")
    client = TestClient(app)
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "owner-password-123"},
        ).status_code
        == 201
    )
    return client, sessions, private


def envelope(private, nonce, port="COM4", kind="usb_interface"):
    now = int(time.time() * 1000)
    identity = ("camera-" if kind == "camera_interface" else "usb-") + "a" * 20
    payload = Payload370.model_validate(
        {
            "schema": "rosevear.hub.workshop-gateway.v370",
            "collector_id": "printer-pc",
            "observed_at_ms": now,
            "expires_at_ms": now + 60000,
            "nonce": nonce,
            "mode": "READ_ONLY_LOCAL_WINDOWS_OBSERVATION",
            "commands_sent": 0,
            "physical_devices_verified": False,
            "devices": [
                {
                    "kind": kind,
                    "device_id": identity,
                    "label": "USB print controller",
                    "presence": "enumerated",
                    "proof": "windows_pnp_registry",
                    "port_name": port,
                }
            ],
        }
    )
    return {
        "payload": payload.model_dump(mode="json", exclude_unset=True),
        "signature": private.sign(canonical370(payload)).hex(),
    }


def test_owner_reconciliation_detects_replug_and_never_claims_physical_verification(
    tmp_path, monkeypatch
):
    client, _sessions, key = prepared(tmp_path, monkeypatch)
    base = "/api/v1/workshop-enrollment-371/reconciliation"
    assert client.get(base).json()["state"] == "HOLD_NO_SIGNED_RECEIPT"
    first = envelope(key, "a" * 32)
    assert client.post("/api/v1/workshop-gateway-370/receipt", json=first).status_code == 202
    assert client.get(base).json()["state"] == "HOLD_NEEDS_SECOND_RECEIPT"
    second = envelope(key, "b" * 32, "COM8")
    assert client.post("/api/v1/workshop-gateway-370/receipt", json=second).status_code == 202
    result = client.get(base).json()
    assert result["state"] == "SOURCE_REGISTRY_RECONCILED"
    assert result["gates"]["repeatReceipt"]
    assert result["gates"]["usbRegistryObserved"]
    assert not result["gates"]["physicalDeviceConfirmed"]
    assert not result["gates"]["cameraFeedVerified"]
    assert result["devices"][0]["transition"] == "com_port_changed"
    assert result["devices"][0]["previousPort"] == "COM4"
    assert result["devices"][0]["currentPort"] == "COM8"
    assert result["devices"][0]["physicallyVerified"] is False
    assert client.post("/api/v1/workshop-gateway-370/receipt", json=second).status_code == 409


def test_stale_status_keeps_missing_id_unverified(tmp_path, monkeypatch):
    _client, sessions, _key = prepared(tmp_path, monkeypatch)
    now = int(time.time() * 1000)
    with sessions() as db:
        db.add(
            WorkshopGatewayReceipt370(
                collector_id="printer-pc",
                nonce="c" * 32,
                observed_at_ms=now - 500_000,
                expires_at_ms=now - 400_000,
                received_at=datetime.now(UTC),
                payload_json=json.dumps(
                    {
                        "devices": [
                            {
                                "kind": "camera_interface",
                                "device_id": "camera-" + "b" * 20,
                                "label": "USB camera",
                                "presence": "enumerated",
                                "proof": "windows_pnp_registry",
                            }
                        ]
                    }
                ),
            )
        )
        db.commit()
        report = reconcile371(db, now)
    assert report["state"] == "HOLD_STALE_SOURCE"
    assert not report["sourceFresh"]
    assert report["devices"][0]["transition"] == "unverified_stale"


def test_forged_pnp_proof_is_rejected(tmp_path, monkeypatch):
    client, _sessions, key = prepared(tmp_path, monkeypatch)
    fake = envelope(key, "d" * 32)
    fake["payload"]["devices"][0]["proof"] = "owner_note"
    assert client.post("/api/v1/workshop-gateway-370/receipt", json=fake).status_code == 403
