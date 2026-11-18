"""Build 366 regression: signed aggregate persistence, replay, privacy and owner-only GET.

Synthetic keys and made-up metrics are test fixtures, never production field proof.
"""
import hashlib
import json
import sqlite3

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi.testclient import TestClient

from rosevear_ai_hub.api.sysop_history366 import local_history366, router
from rosevear_ai_hub.main import app
from rosevear_ai_hub.seven_app_stats365 import APPS, SCHEMA, canonical
from rosevear_ai_hub.sysop_history366 import append_verified366, summary366

NOW = 1_800_000_000_000
COMMIT = "a" * 40


def packet(app_id="rosevear-ai-hub", *, nonce="a" * 32, event_id="realistic-unique-event-366"):
    private = Ed25519PrivateKey.generate()
    pub = private.public_key().public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
    pin = hashlib.sha256(
        private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).hexdigest()
    payload = {
        "schema": SCHEMA,
        "protocolVersion": "1.1",
        "appId": app_id,
        "sourceCommit": COMMIT,
        "eventId": event_id,
        "nonce": nonce,
        "issuedAtMs": NOW - 1000,
        "expiresAtMs": NOW + 60000,
        "state": "UNKNOWN",
        "metricsWindowSeconds": 60,
        "metrics": {
            "requests": 12,
            "serverErrors": 1,
            "jobsCompleted": 2,
            "jobsFailed": 0,
            "queueDepth": None,
            "latencyP95Ms": 110,
            "activeSessions": None,
        },
        "sysop": {
            "eventKind": "HOST_BOOT_OBSERVED" if app_id == "rosevear-ai-hub" else "HEARTBEAT",
            "observedAtMs": NOW - 1200,
            "processUptimeSec": 1234,
            "restartCount": 2,
            "lastRestartAtMs": NOW - 10000,
            "bootTimeMs": NOW - 30000 if app_id == "rosevear-ai-hub" else None,
            "rebootIsIndependentlyWitnessed": False,
        },
        "dataClass": "NON_SENSITIVE_AGGREGATE",
        "tenantId": None,
        "authorizesAction": False,
    }
    return {"payload": payload, "signature": private.sign(canonical(payload)).hex()}, pub, pin


def intake(path, item, pem, pin, app_id="rosevear-ai-hub", *, now_ms=NOW):
    return append_verified366(
        path,
        app_id=app_id,
        signed_envelope=item,
        public_key_pem=pem,
        trusted_pin=pin,
        expected_commit=COMMIT,
        now_ms=now_ms,
    )


def test_single_real_signature_persists_only_private_sanitized_aggregates(tmp_path):
    path = tmp_path / "owner-private.db"
    item, pem, pin = packet()
    result = intake(path, item, pem, pin)
    assert result["status"] == "PERSISTED_SIGNED_SOURCE_CLAIM_ONLY"
    assert result["storedAggregateCount"] == 1
    assert result["liveAuthenticatedTransportVerified"] is False
    summary = summary366(path, now_ms=NOW, original_host=True)
    assert summary["journalStatus"] == "LOCAL_SIGNED_CLAIM_HISTORY_ONLY"
    assert summary["historyCount"] == 1
    assert summary["events"][0]["eventKind"] == "HOST_BOOT_OBSERVED"
    assert summary["physicalRebootIndependentlyWitnessed"] is False
    assert summary["liveConnectedSourceCount"] == 0
    assert summary["sources"][1]["recordCount"] == 1
    with sqlite3.connect(path) as db:
        columns = [r[1] for r in db.execute("PRAGMA table_info(observations)")]
        assert "signature" not in columns
        assert "raw_payload" not in columns
        assert "customerId" not in columns
        stored = db.execute("SELECT metrics_json FROM observations").fetchone()[0]
        assert set(json.loads(stored)) == set(item["payload"]["metrics"])


def test_replay_id_nonce_and_bad_signature_fail_without_second_row(tmp_path):
    path = tmp_path / "protected.db"
    item, pem, pin = packet()
    intake(path, item, pem, pin)
    with pytest.raises(ValueError, match="HOLD_SYSOP366_DUPLICATE_EVENT_OR_NONCE"):
        intake(path, item, pem, pin)
    item2, pem2, pin2 = packet(event_id="different-event-366")
    item2["payload"]["nonce"] = item["payload"]["nonce"]
    # Signing after mutation ensures duplicate nonce, not signature tamper, is the failure.
    key = Ed25519PrivateKey.generate()
    pem2 = key.public_key().public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
    pin2 = hashlib.sha256(
        key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).hexdigest()
    item2["signature"] = key.sign(canonical(item2["payload"])).hex()
    with pytest.raises(ValueError, match="HOLD_SYSOP366_DUPLICATE_EVENT_OR_NONCE"):
        intake(path, item2, pem2, pin2)
    fake, fpem, fpin = packet(event_id="untrusted-event-366")
    fake["payload"]["metrics"]["requests"] = 999
    with pytest.raises(ValueError, match="HOLD_FORGED_STATISTICS"):
        intake(path, fake, fpem, fpin)
    assert summary366(path, now_ms=NOW, original_host=True)["historyCount"] == 1


def test_seven_app_rollup_and_off_host_hold(tmp_path):
    path = tmp_path / "seven.db"
    for index, name in enumerate(APPS):
        item, pem, pin = packet(
            name,
            nonce=f"{index + 1:032x}",
            event_id=f"event-source-{index}-unique-366",
        )
        intake(path, item, pem, pin, name)
    report = summary366(path, now_ms=NOW, original_host=True)
    assert report["historyCount"] == 7
    assert all(x["recordCount"] == 1 for x in report["sources"])
    assert len(report["events"]) == 7
    assert not report["liveAuthenticatedTransportVerified"]
    assert summary366(path, now_ms=NOW, original_host=False)["historyCount"] == 0


def test_invalid_path_and_expiry_cannot_append(tmp_path):
    item, pem, pin = packet()
    with pytest.raises(ValueError, match="HOLD_WRONG_SCOPE_STALE_OR_PRIVACY"):
        intake(tmp_path / "stale.db", item, pem, pin, now_ms=NOW + 90001)
    path = tmp_path / "journal.db"
    path.symlink_to(tmp_path / "not-our-target")
    with pytest.raises(ValueError, match="HOLD_SYSOP366_UNSAFE_LEDGER_PATH"):
        intake(path, item, pem, pin)
    assert summary366(tmp_path / "missing.db", now_ms=NOW, original_host=True)[
        "journalStatus"
    ] == "HOLD_PRIVATE_LEDGER_INVALID_OR_MISSING"


def test_owner_only_no_browser_mutation_no_field_green():
    client = TestClient(app)
    url = "/api/v1/system/sysop-history-366"
    assert all(route.methods == {"GET"} for route in router.routes)
    assert client.get(url).status_code in (401, 403)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(url).status_code in (401, 403, 405)
    report = local_history366(machine_name="OTHER-PC", windows_host=False, now_ms=NOW)
    assert report["journalStatus"] == "HOLD_NOT_ORIGINAL_HOST_OR_UNCONFIGURED"
    assert not report["threeMasterRuntimeGreen"]
    assert not report["commsPrivateReceiverAuthorized"]
