"""Build 365 synthetic signed telemetry regressions, not real host measurements."""

import hashlib

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi.testclient import TestClient

from rosevear_ai_hub.api.server_shell365 import local_statistics365, router
from rosevear_ai_hub.main import app
from rosevear_ai_hub.seven_app_stats365 import (
    APPS,
    SCHEMA,
    canonical,
    seven_app_summary365,
    verify_peer365,
)

NOW = 1_800_000_000_000
COMMIT = "a" * 40


def sample(app_id="yw", *, kind="HEARTBEAT"):
    private = Ed25519PrivateKey.generate()
    public = private.public_key().public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
    pin = hashlib.sha256(
        private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).hexdigest()
    payload = {
        "schema": SCHEMA,
        "protocolVersion": "1.1",
        "appId": app_id,
        "sourceCommit": COMMIT,
        "eventId": "synthetic-event-123456",
        "nonce": "a" * 32,
        "issuedAtMs": NOW - 1000,
        "expiresAtMs": NOW + 60000,
        "state": "UNKNOWN",
        "metricsWindowSeconds": 60,
        "metrics": {
            "requests": 20,
            "serverErrors": 0,
            "jobsCompleted": 3,
            "jobsFailed": 1,
            "queueDepth": None,
            "latencyP95Ms": 250,
            "activeSessions": None,
        },
        "sysop": {
            "eventKind": kind,
            "observedAtMs": NOW - 1500,
            "processUptimeSec": 240,
            "restartCount": 1,
            "lastRestartAtMs": NOW - 250000,
            "bootTimeMs": NOW - 500000 if app_id == "rosevear-ai-hub" else None,
            "rebootIsIndependentlyWitnessed": False,
        },
        "dataClass": "NON_SENSITIVE_AGGREGATE",
        "tenantId": None,
        "authorizesAction": False,
    }
    envelope = {"payload": payload, "signature": private.sign(canonical(payload)).hex()}
    return envelope, public, pin


def test_all_seven_signed_sources_pass_only_source_claim_gate():
    for source in APPS:
        envelope, pem, pin = sample(source)
        result = verify_peer365(envelope, pem, pin, source, COMMIT, NOW)
        assert result["accepted"]
        assert result["reason"] == "SIGNED_AGGREGATE_SOURCE_ONLY"
        assert result["metrics"]["requests"] == 20
        assert result["metrics"]["queueDepth"] is None
        assert result["liveAuthenticatedTransportVerified"] is False
        assert result["physicalRebootIndependentlyWitnessed"] is False
        assert "nonce" not in result and "eventId" not in result


def test_wrong_identity_privacy_unbounded_stale_and_forged_stats_hold():
    envelope, pem, pin = sample("rosiedazzlers")
    bad = [
        {"payload": {**envelope["payload"], "appId": "yw"}, "signature": envelope["signature"]},
        {
            "payload": {**envelope["payload"], "tenantId": "customer-123"},
            "signature": envelope["signature"],
        },
        {
            "payload": {**envelope["payload"], "authorizesAction": True},
            "signature": envelope["signature"],
        },
        {
            "payload": {
                **envelope["payload"],
                "metrics": {**envelope["payload"]["metrics"], "requests": -5},
            },
            "signature": envelope["signature"],
        },
        {
            "payload": {
                **envelope["payload"],
                "metrics": {**envelope["payload"]["metrics"], "email": "private"},
            },
            "signature": envelope["signature"],
        },
        {
            "payload": {
                **envelope["payload"],
                "sysop": {**envelope["payload"]["sysop"], "eventKind": ["HEARTBEAT"]},
            },
            "signature": envelope["signature"],
        },
        {"payload": envelope["payload"], "signature": "b" * 128},
    ]
    for record in bad:
        assert not verify_peer365(record, pem, pin, "rosiedazzlers", COMMIT, NOW)["accepted"]
    assert not verify_peer365(envelope, pem, pin, "rosiedazzlers", COMMIT, NOW + 120000)["accepted"]
    assert not verify_peer365(envelope, pem, "c" * 64, "rosiedazzlers", COMMIT, NOW)["accepted"]
    assert not verify_peer365(envelope, pem, pin, "rosiedazzlers", "b" * 40, NOW)["accepted"]


def test_only_original_hub_may_report_windows_boot_observation():
    envelope, pem, pin = sample("rosevear-ai-hub", kind="HOST_BOOT_OBSERVED")
    assert verify_peer365(envelope, pem, pin, "rosevear-ai-hub", COMMIT, NOW)["accepted"]
    spoof, pem2, pin2 = sample("yw")
    spoof["payload"]["sysop"]["bootTimeMs"] = NOW - 500000
    assert not verify_peer365(spoof, pem2, pin2, "yw", COMMIT, NOW)["accepted"]


def test_unenrolled_seven_app_feed_cannot_claim_connection_or_restart_authority():
    records, keys, pins, commits = {}, {}, {}, {}
    report = seven_app_summary365(records, keys, pins, commits, now_ms=NOW, original_host=True)
    assert len(report["apps"]) == 7
    assert report["acceptedSignedSourceSnapshots"] == 0
    assert report["verifiedLiveConnections"] == 0
    assert report["liveSevenAppStatisticsVerified"] is False
    assert report["originalHostAutonomousBootVerified"] is False
    assert report["commsPrivateReceiverAuthorized"] is False
    assert report["webMutationAvailable"] is False
    assert all(item["connected"] is False for item in report["apps"])

    envelope, pem, pin = sample("yw")
    report = seven_app_summary365(
        {"yw": envelope},
        {"yw": pem},
        {"yw": pin},
        {"yw": COMMIT},
        now_ms=NOW,
        original_host=True,
    )
    assert report["acceptedSignedSourceSnapshots"] == 1
    assert report["verifiedLiveConnections"] == 0
    offhost = seven_app_summary365(
        {"yw": envelope},
        {"yw": pem},
        {"yw": pin},
        {"yw": COMMIT},
        now_ms=NOW,
        original_host=False,
    )
    assert offhost["acceptedSignedSourceSnapshots"] == 0
    assert all(item["reason"] == "HOLD_NOT_ORIGINAL_WINDOWS_HOST" for item in offhost["apps"])


def test_owner_endpoint_has_no_browser_misuse_or_direct_device_actions():
    client = TestClient(app)
    url = "/api/v1/system/sysop-statistics-365"
    assert all(route.methods == {"GET"} for route in router.routes)
    assert client.get(url).status_code in (401, 403)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(url).status_code in (401, 403, 405)
    offhost = local_statistics365(machine_name="NOT_ORIGINAL", windows_host=False, now_ms=NOW)
    assert offhost["verifiedLiveConnections"] == 0
