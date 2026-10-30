"""QL-243 fail-closed nonproduction health-only server boundary."""

import base64
import hashlib
import hmac
import socket
import sqlite3
import time
from pathlib import Path

from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app

client = TestClient(app)
SECRET = bytes(range(32))  # Synthetic test fixture only; never production credentials.
PATH = "/api/integration/v1/health"
CAPS = "/api/integration/v1/capabilities"


def _headers(
    path: str = PATH,
    *,
    nonce: str = "np-" + "0" * 32,
    stamp: int | None = None,
    source: str = "ai-data-platform",
    business: str = "rosevear-ai-hub",
    key_id: str = "np-hub-001",
    method: str = "GET",
) -> dict[str, str]:
    timestamp = str(stamp if stamp is not None else int(time.time() * 1000))
    values = (
        "rosevear.integration.v1",
        method,
        path,
        timestamp,
        nonce,
        source,
        "rosevear-ai-hub",
        business,
        "-",
        "nonproduction",
        hashlib.sha256(b"").hexdigest(),
        key_id,
    )
    signature = (
        base64.urlsafe_b64encode(
            hmac.new(SECRET, "\n".join(values).encode(), hashlib.sha256).digest()
        )
        .decode()
        .rstrip("=")
    )
    return {
        "X-Rosevear-Contract": values[0],
        "X-Rosevear-Environment": values[9],
        "X-Rosevear-Source": source,
        "X-Rosevear-Destination": values[6],
        "X-Rosevear-Business": business,
        "X-Rosevear-Tenant": "-",
        "X-Rosevear-Key-Id": key_id,
        "X-Rosevear-Timestamp": timestamp,
        "X-Rosevear-Nonce": nonce,
        "X-Rosevear-Signature": signature,
    }


def _configured(monkeypatch, tmp_path: Path) -> Path:
    ledger = tmp_path / "integration-test.sqlite3"
    monkeypatch.setenv("APP_ENV", "nonproduction")
    monkeypatch.setenv("ROSEVEAR_INTEGRATION_V1_ENABLED", "1")
    monkeypatch.setenv("ROSEVEAR_INTEGRATION_V1_KEY_ID", "np-hub-001")
    monkeypatch.setenv("ROSEVEAR_INTEGRATION_V1_HMAC_KEY_B64", base64.b64encode(SECRET).decode())
    monkeypatch.setenv("ROSEVEAR_INTEGRATION_V1_AUDIT_SQLITE", str(ledger))
    return ledger


def test_default_off_and_no_public_fallback(monkeypatch):
    monkeypatch.delenv("ROSEVEAR_INTEGRATION_V1_ENABLED", raising=False)
    assert client.get(PATH).status_code == 404
    assert client.get(CAPS).status_code == 404
    assert client.post(PATH).status_code in (404, 405)


def test_valid_signed_gets_are_held_redacted_and_replay_is_durable(monkeypatch, tmp_path):
    ledger = _configured(monkeypatch, tmp_path)
    response = client.get(PATH, headers=_headers())
    assert response.status_code == 200
    assert response.json() == {
        "source_system": "rosevear-ai-hub",
        "contract_version": "rosevear.integration.v1",
        "environment": "nonproduction",
        "tenant_id": None,
        "connection_status": "DISCONNECTED",
        "service_status": "UNVERIFIED",
    }
    assert response.headers["Cache-Control"] == "no-store"
    assert client.get(PATH, headers=_headers()).status_code == 409
    other = client.get(CAPS, headers=_headers(CAPS, nonce="np-" + "1" * 32))
    assert other.status_code == 200
    assert other.json()["capabilities"] == ["read_health", "read_capabilities"]
    assert other.json()["allowed_paths"] == [PATH, CAPS]
    assert other.json()["enabled_operations"] == []
    # A new TestClient instance shares the durable replay ledger, not process memory.
    assert (
        TestClient(app).get(CAPS, headers=_headers(CAPS, nonce="np-" + "1" * 32)).status_code == 409
    )
    with sqlite3.connect(ledger) as connection:
        assert connection.execute("SELECT COUNT(*) FROM integration_v1_nonces").fetchone()[0] == 2
        assert (
            connection.execute(
                "SELECT COUNT(*) FROM integration_v1_audit WHERE result='HOLD_ACCEPTED'"
            ).fetchone()[0]
            == 2
        )


def test_rejects_wrong_source_business_tenant_scope_method_time_signature_and_body(
    monkeypatch, tmp_path
):
    _configured(monkeypatch, tmp_path)
    assert client.get(PATH, headers=_headers(source="devilndove")).status_code == 403
    assert client.get(PATH, headers=_headers(business="devilndove")).status_code == 403
    wrong_tenant = {**_headers(), "X-Rosevear-Tenant": "other-campground"}
    assert client.get(PATH, headers=wrong_tenant).status_code == 403
    assert client.get(PATH, headers=_headers(), params={"include": "devices"}).status_code == 403
    assert (
        client.get(PATH, headers=_headers(stamp=int(time.time() * 1000) - 301_000)).status_code
        == 401
    )
    altered = {**_headers(), "X-Rosevear-Signature": "bad-signature"}
    assert client.get(PATH, headers=altered).status_code == 401
    assert client.post(PATH, headers=_headers(method="POST")).status_code in (403, 405)
    assert client.get("/api/integration/v1/commands", headers=_headers()).status_code == 403
    assert client.get(PATH, headers={**_headers(), "Content-Length": "6"}).status_code == 403


def test_revocation_rotation_and_missing_durable_storage_fail_closed(monkeypatch, tmp_path):
    _configured(monkeypatch, tmp_path)
    monkeypatch.setenv("ROSEVEAR_INTEGRATION_V1_KEY_REVOKED", "1")
    assert client.get(PATH, headers=_headers()).status_code == 401
    monkeypatch.setenv("ROSEVEAR_INTEGRATION_V1_KEY_REVOKED", "0")
    monkeypatch.setenv("ROSEVEAR_INTEGRATION_V1_KEY_ID", "np-hub-002")
    assert client.get(PATH, headers=_headers()).status_code == 401
    assert client.get(PATH, headers=_headers(key_id="np-hub-002")).status_code == 200
    monkeypatch.setenv("APP_ENV", "production")
    assert (
        client.get(PATH, headers=_headers(nonce="np-" + "2" * 32, key_id="np-hub-002")).status_code
        == 403
    )
    monkeypatch.setenv("APP_ENV", "nonproduction")
    monkeypatch.setenv(
        "ROSEVEAR_INTEGRATION_V1_AUDIT_SQLITE", str(tmp_path / "absent" / "file.sqlite3")
    )
    assert (
        client.get(PATH, headers=_headers(nonce="np-" + "3" * 32, key_id="np-hub-002")).status_code
        == 409
    )


def test_ql245_seven_denial_fixtures_are_only_local_tests(monkeypatch, tmp_path):
    """These HTTP and SQLite assertions are not original live gateway receipts."""
    ledger = _configured(monkeypatch, tmp_path)
    first = client.get(PATH, headers=_headers())
    assert first.status_code == 200
    denials = {
        "nonce_replay": client.get(PATH, headers=_headers()),
        "stale_request": client.get(
            PATH, headers=_headers(nonce="np-" + "1" * 32, stamp=int(time.time() * 1000) - 301_000)
        ),
        "wrong_business": client.get(PATH, headers=_headers(business="devilndove")),
        "wrong_tenant": client.get(
            PATH, headers={**_headers(), "X-Rosevear-Tenant": "another-household"}
        ),
    }
    monkeypatch.setenv("ROSEVEAR_INTEGRATION_V1_KEY_REVOKED", "1")
    denials["revoked_key"] = client.get(PATH, headers=_headers())
    monkeypatch.setenv("ROSEVEAR_INTEGRATION_V1_KEY_REVOKED", "0")
    denials["prohibited_write"] = client.post(
        "/api/integration/v1/events", headers=_headers(method="POST")
    )
    denials["prohibited_dispatch"] = client.post(
        "/api/integration/v1/dispatch", headers=_headers(method="POST")
    )
    assert list(denials) == [
        "nonce_replay",
        "stale_request",
        "wrong_business",
        "wrong_tenant",
        "revoked_key",
        "prohibited_write",
        "prohibited_dispatch",
    ]
    assert [response.status_code for response in denials.values()] == [
        409,
        401,
        403,
        403,
        401,
        403,
        403,
    ]
    with sqlite3.connect(ledger) as connection:
        rows = connection.execute(
            "SELECT result,reason FROM integration_v1_audit WHERE result='DENIED'"
        ).fetchall()
        assert len(rows) >= 7
        assert all(result == "DENIED" for result, _ in rows)


def test_ql261_synthetic_health_capabilities_never_contact_home_systems(monkeypatch, tmp_path):
    """In-process synthetic GET only: no LAN, Internet, devices, MQTT or home gateway IO."""

    def forbid_network(*_args, **_kwargs):
        raise AssertionError("QL-261 synthetic source contract attempted a network socket")

    monkeypatch.setattr(socket.socket, "connect", forbid_network)
    _configured(monkeypatch, tmp_path)
    health = client.get(PATH, headers=_headers(nonce="np-" + "a" * 32))
    capabilities = client.get(CAPS, headers=_headers(CAPS, nonce="np-" + "b" * 32))
    assert health.status_code == 200
    assert capabilities.status_code == 200
    assert health.json() == {
        "source_system": "rosevear-ai-hub",
        "contract_version": "rosevear.integration.v1",
        "environment": "nonproduction",
        "tenant_id": None,
        "connection_status": "DISCONNECTED",
        "service_status": "UNVERIFIED",
    }
    assert capabilities.json() == {
        "source_system": "rosevear-ai-hub",
        "contract_version": "rosevear.integration.v1",
        "environment": "nonproduction",
        "tenant_id": None,
        "connection_status": "DISCONNECTED",
        "capabilities": ["read_health", "read_capabilities"],
        "allowed_paths": [PATH, CAPS],
        "enabled_operations": [],
    }
    for response in (health, capabilities):
        assert response.headers["Cache-Control"] == "no-store"
        assert response.headers["Pragma"] == "no-cache"
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert all(
            secret not in response.text.lower()
            for secret in (
                "camera",
                "mqtt",
                "home_assistant",
                "vault",
                "ip_address",
                "hostname",
                "credential",
                "customer",
                "secret",
                "session",
                "device",
            )
        )
    assert client.post("/api/integration/v1/dispatch", headers=_headers()).status_code == 403
    monkeypatch.setenv("APP_ENV", "production")
    assert client.get(PATH, headers=_headers(nonce="np-" + "c" * 32)).status_code == 403
