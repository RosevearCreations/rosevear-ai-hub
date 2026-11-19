"""Build367 synthetic contracts; no real network, tokens, host or Master acknowledgments."""

from __future__ import annotations

import hashlib
import json
import sqlite3

import httpx
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi.testclient import TestClient

from rosevear_ai_hub.api.live_sources367 import local_live367, router
from rosevear_ai_hub.live_sources367 import (
    PATH,
    record_transport_receipt367,
    safe_peer_url367,
    summary367,
    validate_get367,
)
from rosevear_ai_hub.main import app
from rosevear_ai_hub.seven_app_stats365 import APPS, SCHEMA, canonical

NOW = 1_800_000_000_000
COMMIT = "a" * 40


def source(app_id="ai-data-platform", *, event="event-for-build-367-source"):
    private = Ed25519PrivateKey.generate()
    pem = private.public_key().public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
    pin = hashlib.sha256(
        private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).hexdigest()
    payload = {
        "schema": SCHEMA,
        "protocolVersion": "1.1",
        "appId": app_id,
        "sourceCommit": COMMIT,
        "eventId": event,
        "nonce": "b" * 32,
        "issuedAtMs": NOW - 1000,
        "expiresAtMs": NOW + 20000,
        "state": "UNKNOWN",
        "metricsWindowSeconds": 60,
        "metrics": {
            "requests": 10,
            "serverErrors": None,
            "jobsCompleted": 2,
            "jobsFailed": 0,
            "queueDepth": None,
            "latencyP95Ms": 42,
            "activeSessions": None,
        },
        "sysop": {
            "eventKind": "HEARTBEAT",
            "observedAtMs": NOW - 1100,
            "processUptimeSec": 600,
            "restartCount": None,
            "lastRestartAtMs": None,
            "bootTimeMs": None,
            "rebootIsIndependentlyWitnessed": False,
        },
        "dataClass": "NON_SENSITIVE_AGGREGATE",
        "tenantId": None,
        "authorizesAction": False,
    }
    envelope = {"payload": payload, "signature": private.sign(canonical(payload)).hex()}
    return envelope, pem, pin


def test_private_network_only_and_exact_hardcoded_read_path():
    for ip in ("192.168.68.110", "10.0.0.4", "100.100.1.23", "172.16.0.2"):
        assert safe_peer_url367(f"https://{ip}:8443{PATH}").startswith("https://")
    for url in (
        "http://192.168.68.110" + PATH,
        "https://example.org" + PATH,
        "https://127.0.0.1" + PATH,
        "https://169.254.169.254" + PATH,
        "https://192.168.68.110:8443/internal/admin",
        "https://192.168.68.110:8443" + PATH + "?token=abc",
        "https://user:password@192.168.68.110" + PATH,
        "https://192.168.68.110:8080" + PATH,
    ):
        with pytest.raises(ValueError, match="HOLD_SYSOP367_"):
            safe_peer_url367(url)


def test_signed_live_get_validation_and_no_network_side_effect():
    envelope, pem, pin = source()
    response = httpx.Response(
        200,
        headers={"content-type": "application/json"},
        content=json.dumps(envelope).encode("utf-8"),
    )
    assert (
        validate_get367(
            response,
            app_id="ai-data-platform",
            public_key=pem,
            pin=pin,
            expected_commit=COMMIT,
            now_ms=NOW,
        )["payload"]["appId"]
        == "ai-data-platform"
    )
    with pytest.raises(ValueError, match="HOLD_WRONG_SCOPE_STALE_OR_PRIVACY"):
        validate_get367(
            response,
            app_id="ai-data-platform",
            public_key=pem,
            pin=pin,
            expected_commit=COMMIT,
            now_ms=NOW + 100000,
        )
    with pytest.raises(ValueError, match="HOLD_FORGED_STATISTICS"):
        bad = json.loads(json.dumps(envelope))
        bad["payload"]["metrics"]["requests"] = 999999
        validate_get367(
            httpx.Response(
                200, headers={"content-type": "application/json"}, content=json.dumps(bad).encode()
            ),
            app_id="ai-data-platform",
            public_key=pem,
            pin=pin,
            expected_commit=COMMIT,
            now_ms=NOW,
        )
    for response in (
        httpx.Response(302, headers={"location": "https://example.org/"}),
        httpx.Response(200, headers={"content-type": "text/html"}, text="<b>not json</b>"),
        httpx.Response(200, headers={"content-type": "application/json"}, content=b"x" * 20000),
    ):
        with pytest.raises(ValueError, match="HOLD_SYSOP367_"):
            validate_get367(
                response,
                app_id="ai-data-platform",
                public_key=pem,
                pin=pin,
                expected_commit=COMMIT,
                now_ms=NOW,
            )


def test_durable_signed_receipts_replay_and_readback_remain_master_hold(tmp_path):
    db = tmp_path / "private-journal.db"
    env, pem, pin = source()
    kwargs = {
        "journal": db,
        "app_id": "ai-data-platform",
        "envelope": env,
        "public_key": pem,
        "pin": pin,
        "expected_commit": COMMIT,
        "now_ms": NOW,
    }
    with pytest.raises(ValueError, match="HOLD_SYSOP367_TLS_NOT_AUTHENTICATED"):
        record_transport_receipt367(**kwargs, transport_authenticated=False)
    assert not db.exists()
    result = record_transport_receipt367(**kwargs, transport_authenticated=True)
    assert result["result"] == "AUTHENTICATED_TLS_SIGNED_SOURCE_RECEIPT_STORED"
    assert result["threeMasterDeliveryAckProven"] is False
    with pytest.raises(ValueError, match="HOLD_SYSOP366_DUPLICATE"):
        record_transport_receipt367(**kwargs, transport_authenticated=True)
    state = summary367(db, now_ms=NOW, original_host=True)
    assert state["status"] == "LOCAL_TLS_SIGNED_SOURCE_RECEIPTS_ONLY"
    assert state["verifiedTlsSignedReceiptCount"] == 1
    assert state["sources"][0]["freshTlsSignedSourceOnly"] is True
    assert state["verifiedThreeMasterDeliveryAcks"] == 0
    assert state["threeMasterRuntimeGreen"] is False
    assert state["allSevenLiveConnected"] is False
    assert state["physicalBootIndependentlyWitnessed"] is False
    with sqlite3.connect(db) as conn:
        fields = [x[1] for x in conn.execute("PRAGMA table_info(verified_tls_sources367)")]
        assert "token" not in fields and "source_url" not in fields and "signature" not in fields
    assert summary367(db, now_ms=NOW, original_host=False)["verifiedTlsSignedReceiptCount"] == 0


def test_read_api_is_owner_only_seven_sources_and_no_control_actions():
    result = local_live367(
        machine_name="NOT-REE-SERVER",
        windows_host=False,
        now_ms=NOW,
    )
    assert result["verifiedTlsSignedReceiptCount"] == 0
    assert [s["appId"] for s in result["sources"]] == list(APPS)
    assert result["status"] == "HOLD_NOT_ORIGINAL_HOST_OR_UNCONFIGURED"
    assert all(route.methods == {"GET"} for route in router.routes)
    client = TestClient(app)
    path = "/api/v1/system/sysop-live-367"
    assert client.get(path).status_code in (401, 403)
    for verb in ("post", "put", "patch", "delete"):
        assert getattr(client, verb)(path).status_code in (401, 403, 405)
    assert summary367(None, now_ms=NOW, original_host=True)["threeMasterRuntimeGreen"] is False
