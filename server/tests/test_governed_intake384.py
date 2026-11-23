"""Build384: source-scoped analytics, private collection proof and tenant denial."""

import hashlib

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi.testclient import TestClient

from rosevear_ai_hub.governed_intake384 import governed_snapshot384
from rosevear_ai_hub.live_sources367 import record_transport_receipt367
from rosevear_ai_hub.main import app
from rosevear_ai_hub.seven_app_stats365 import APPS, SCHEMA, canonical

NOW384 = 1_800_000_000_000


def _packet384(app_id: str, index: int):
    private = Ed25519PrivateKey.generate()
    public = private.public_key().public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
    pin = hashlib.sha256(
        private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).hexdigest()
    payload = {
        "schema": SCHEMA,
        "protocolVersion": "1.1",
        "appId": app_id,
        "sourceCommit": "a" * 40,
        "eventId": "source-event-384-" + str(index).zfill(24),
        "nonce": format(index + 1, "032x"),
        "issuedAtMs": NOW384 - 2000,
        "expiresAtMs": NOW384 + 60_000,
        "state": "DEGRADED" if index == 1 else "HEALTHY",
        "metricsWindowSeconds": 60,
        "metrics": {
            "requests": 10,
            "serverErrors": 2 if index == 1 else 0,
            "jobsCompleted": None,
            "jobsFailed": None,
            "queueDepth": index,
            "latencyP95Ms": 125,
            "activeSessions": None,
        },
        "sysop": {
            "eventKind": "HEARTBEAT",
            "observedAtMs": NOW384 - 3000,
            "processUptimeSec": 900,
            "restartCount": None,
            "lastRestartAtMs": None,
            "bootTimeMs": None,
            "rebootIsIndependentlyWitnessed": False,
        },
        "dataClass": "NON_SENSITIVE_AGGREGATE",
        "tenantId": None,
        "authorizesAction": False,
    }
    packet = {"payload": payload, "signature": private.sign(canonical(payload)).hex()}
    return packet, public, pin


def test_governance_never_fabricates_missing_sources(tmp_path):
    path = tmp_path / "governance.sqlite"
    denied = governed_snapshot384(path, now_ms=NOW384, original_host=False)
    assert denied["freshSignedReceipts"] == 0
    for i, app_id in enumerate(APPS):
        packet, public, pin = _packet384(app_id, i)
        record_transport_receipt367(
            path,
            app_id=app_id,
            envelope=packet,
            public_key=public,
            pin=pin,
            expected_commit="a" * 40,
            now_ms=NOW384,
            transport_authenticated=True,
        )
        current = governed_snapshot384(path, now_ms=NOW384, original_host=True)
        assert current["freshSignedReceipts"] == i + 1
        assert current["allSevenLiveConnected"] is False
        assert current["commsPrivateReceiverAuthorized"] is False
        assert current["threeMasterDeliveryAckProven"] is False
        assert current["tenantDataExposed"] is False
        assert current["mutationAvailable"] is False
    assert current["allSevenSourceReceiptsFresh"] is True
    assert current["historicalCorrelatedReceipts"] == 7
    assert current["sources"][1]["reportedErrorFraction"] == 0.2
    assert current["sources"][1]["authority"] == "master-original-host"
    assert all(s["latestMetrics"]["activeSessions"] is None for s in current["sources"])
    stale = governed_snapshot384(path, now_ms=NOW384 + 100_000, original_host=True)
    assert stale["freshSignedReceipts"] == 0
    assert stale["allSevenLiveConnected"] is False


def test_invalid_tenant_and_replay_never_enter_governed_journal(tmp_path):
    path = tmp_path / "governance.sqlite"
    packet, public, pin = _packet384("yw", 5)
    packet["payload"]["tenantId"] = "another-business-tenant"
    with pytest.raises(ValueError):
        record_transport_receipt367(
            path, app_id="yw", envelope=packet, public_key=public, pin=pin,
            expected_commit="a" * 40, now_ms=NOW384, transport_authenticated=True,
        )
    packet, public, pin = _packet384("yw", 5)
    with pytest.raises(ValueError):
        record_transport_receipt367(
            path, app_id="yw", envelope=packet, public_key=public, pin=pin,
            expected_commit="a" * 40, now_ms=NOW384, transport_authenticated=False,
        )
    record_transport_receipt367(
        path, app_id="yw", envelope=packet, public_key=public, pin=pin,
        expected_commit="a" * 40, now_ms=NOW384, transport_authenticated=True,
    )
    with pytest.raises(ValueError):
        record_transport_receipt367(
            path, app_id="yw", envelope=packet, public_key=public, pin=pin,
            expected_commit="a" * 40, now_ms=NOW384, transport_authenticated=True,
        )


def test_owner_only_endpoints_and_no_mutation():
    with TestClient(app) as client:
        for suffix in ("governance-384", "weather-station-384"):
            url = "/api/v1/system/" + suffix
            assert client.get(url).status_code in (401, 403)
            for method in ("post", "put", "delete"):
                assert getattr(client, method)(url).status_code in (401, 403, 405)
