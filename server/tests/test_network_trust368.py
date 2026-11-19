"""Build 368 contract: no scan, owner-signed scopes, conflicts and role denials."""

import hashlib
import time

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.network_trust368 import bounded_private_network, scope_message
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AuditEvent, NetworkDevice368, NetworkObservation368


def prepared(tmp_path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'network368.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)

    def override():
        with sessions() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_session] = override
    client = TestClient(app)
    assert client.get("/api/v1/network-trust-368/state").status_code == 401
    assert (
        client.post(
            "/api/v1/auth/bootstrap", json={"username": "owner", "password": "owner-password-123"}
        ).status_code
        == 201
    )
    private = Ed25519PrivateKey.generate()
    public = private.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    raw = private.public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw
    )
    path = tmp_path / "owner.pub.pem"
    path.write_bytes(public)
    monkeypatch.setenv("ROSEVEAR_NETWORK368_OWNER_PUBLIC_KEY_PATH", str(path))
    monkeypatch.setenv("ROSEVEAR_NETWORK368_OWNER_PUBLIC_KEY_PIN", hashlib.sha256(raw).hexdigest())
    return client, sessions, private


def signed(
    private, *, cidr="192.168.18.0/24", label="Home LAN", revision=0, nonce="a" * 32, expiry_ms=None
):
    expiry_ms = expiry_ms or (int(time.time() * 1000) + 3600000)
    return {
        "cidr": cidr,
        "label": label,
        "expiry_ms": expiry_ms,
        "nonce": nonce,
        "signature": private.sign(scope_message(cidr, label, expiry_ms, nonce, revision)).hex(),
        "expected_revision": revision,
    }


def test_owner_signed_exact_private_bounded_scope_and_replay(tmp_path, monkeypatch):
    client, sessions, private = prepared(tmp_path, monkeypatch)
    path = "/api/v1/network-trust-368"
    assert client.get(path + "/state").json()["mode"] == "MANUAL_REVIEW_ONLY"
    assert client.get(path + "/state").json()["backgroundScanEnabled"] is False
    payload = signed(private)
    forged = {**payload, "label": "Forged"}
    assert client.put(path + "/scope", json=forged).status_code == 403
    assert client.put(path + "/scope", json=signed(private, cidr="8.8.8.0/24")).status_code == 422
    assert client.put(path + "/scope", json=signed(private, cidr="10.0.0.0/8")).status_code == 422
    assert (
        client.put(path + "/scope", json=signed(private, cidr="100.64.0.0/24")).status_code == 422
    )
    assert (
        client.put(path + "/scope", json=signed(private, cidr="192.168.18.1/24")).status_code == 422
    )
    assert client.put(path + "/scope", json=payload).status_code == 200
    assert client.put(path + "/scope", json=payload).status_code == 409
    assert (
        client.put(path + "/scope", json=signed(private, revision=1, nonce="b" * 32)).json()[
            "revision"
        ]
        == 2
    )
    assert len(client.get(path + "/state").json()["scopes"]) == 1
    with sessions() as db:
        assert db.scalars(
            select(AuditEvent).where(AuditEvent.event_type == "network368.scope.approved")
        ).all()
    assert bounded_private_network("10.0.0.0/24").num_addresses == 256


def test_manual_observations_history_collision_and_no_auto_trust(tmp_path, monkeypatch):
    client, sessions, private = prepared(tmp_path, monkeypatch)
    path = "/api/v1/network-trust-368"
    assert (
        client.post(
            path + "/observation",
            json={"source": "manual", "source_id": "Creality-Pending", "ip": "192.168.18.21"},
        ).status_code
        == 403
    )
    assert client.put(path + "/scope", json=signed(private)).status_code == 200
    assert (
        client.post(
            path + "/observation",
            json={"source": "manual", "source_id": "Device-A", "ip": "8.8.8.8"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            path + "/observation",
            json={"source": "manual", "source_id": "Device-A", "ip": "192.168.19.5"},
        ).status_code
        == 403
    )
    first = client.post(
        path + "/observation",
        json={
            "source": "manual",
            "source_id": "Device-A",
            "ip": "192.168.18.21",
            "lease_ref": "lease-1",
        },
    )
    assert first.status_code == 201
    assert first.json()["decision"] == "needs_review"
    assert not first.json()["riskFlags"]
    assert (
        client.put(
            path + "/decision",
            json={
                "device_id": first.json()["deviceId"],
                "decision": "trusted",
                "expected_revision": 1,
            },
        ).status_code
        == 200
    )
    second = client.post(
        path + "/observation",
        json={"source": "manual", "source_id": "Device-B", "ip": "192.168.18.21"},
    )
    assert second.status_code == 201
    assert "SHARED_IP_HISTORY_REVIEW" in second.json()["riskFlags"]
    assert (
        client.put(
            path + "/decision",
            json={
                "device_id": second.json()["deviceId"],
                "decision": "trusted",
                "expected_revision": 1,
            },
        ).status_code
        == 409
    )
    changed = client.post(
        path + "/observation",
        json={
            "source": "manual",
            "source_id": "Device-A",
            "ip": "192.168.18.22",
            "lease_ref": "lease-2",
        },
    )
    assert changed.status_code == 201
    assert changed.json()["decision"] == "needs_review"
    assert "IDENTITY_IP_CHANGED_REVIEW" in changed.json()["riskFlags"]
    data = client.get(path + "/state").json()
    first_device = next(item for item in data["devices"] if item["sourceId"] == "Device-A")
    assert [x["ip"] for x in first_device["history"]] == ["192.168.18.22", "192.168.18.21"]
    assert all(x["provenance"] == "OWNER_ENTERED_UNVERIFIED" for x in first_device["history"])
    with sessions() as db:
        assert len(db.scalars(select(NetworkDevice368)).all()) == 2
        assert len(db.scalars(select(NetworkObservation368)).all()) == 3


def test_roles_and_spoofed_inputs_fail_closed(tmp_path, monkeypatch):
    client, _, private = prepared(tmp_path, monkeypatch)
    prefix = "/api/v1/network-trust-368"
    assert client.put(prefix + "/scope", json=signed(private)).status_code == 200
    for bad in ("http://router", "token:secret", "camera/#", "someone@example"):
        assert (
            client.post(
                prefix + "/observation",
                json={"source": "manual", "source_id": bad, "ip": "192.168.18.13"},
            ).status_code
            == 422
        )
    assert (
        client.post(
            "/api/v1/auth/users",
            json={"username": "viewer", "password": "viewer-password-123", "role": "read_only"},
        ).status_code
        == 201
    )
    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login", json={"username": "viewer", "password": "viewer-password-123"}
        ).status_code
        == 200
    )
    assert client.get(prefix + "/state").status_code == 403
    assert (
        client.put(prefix + "/scope", json=signed(private, revision=1, nonce="c" * 32)).status_code
        == 403
    )
    assert (
        client.post(
            prefix + "/observation",
            json={"source": "manual", "source_id": "Device-A", "ip": "192.168.18.15"},
        ).status_code
        == 403
    )
    assert (
        client.put(
            prefix + "/decision",
            json={"device_id": 1, "decision": "trusted", "expected_revision": 1},
        ).status_code
        == 403
    )
