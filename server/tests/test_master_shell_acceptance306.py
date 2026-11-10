"""Build 306 protected original-host evidence boundaries and observed trends."""

import base64
import hashlib
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import COMMS_SCHEMA, _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance306 import (
    AIHUB305_MAIN,
    REVIEW_SCHEMA,
    ProtectedSourceImportLedger306,
    import_protected_source_one_test306,
    reconcile_three_master_uptime306,
    review_original_owner_release306,
)
from rosevear_ai_hub.master_shell_monitor304 import DAY_MS, DurableUptimeLedger304

NOW = 1794324000000


class Monitor:
    persist_eligible = True
    ledger = None

    def persistent_snapshot304(self):
        return {"collectionState": "OBSERVING_REE_LOCAL", "sampleCount": 4}


def signer():
    private = Ed25519PrivateKey.generate()
    der = private.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return private, der, hashlib.sha256(der).hexdigest()


def signed(private, payload):
    return {
        "payload": payload,
        "signature": base64.b64encode(private.sign(_serialize(payload))).decode(),
    }


def enable_ree(monkeypatch):
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance306.platform.system", lambda: "Windows"
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance306.socket.gethostname",
        lambda: "DESKTOP-AE894KC",
    )


def test_signed_original_field_review_needs_independent_pin_owner_and_pointer(monkeypatch):
    private, der, pin = signer()
    review = {
        "schema": REVIEW_SCHEMA,
        "sourceId": "rosevear-ai-hub",
        "originalHost": "DESKTOP-AE894KC",
        "reviewerHost": "TEMPLAR",
        "sourceRevision": AIHUB305_MAIN,
        "observedAt": _utc(NOW),
        "releasePointerSha": AIHUB305_MAIN,
        "loadedProcessSha": AIHUB305_MAIN,
        "launcherPid": 3401,
        "processPid": 3402,
        "processEvidenceSha256": "b" * 64,
        "ownerConsentReference": "reeApproved306Review",
    }
    proof = signed(private, review)
    opts = dict(
        reviewer_public_der=der,
        independent_reviewer_pin=pin,
        owner_authorize=lambda **_: True,
        now_ms=NOW,
    )
    assert not review_original_owner_release306(Path.cwd(), Monitor(), proof, **opts)["accepted"]
    enable_ree(monkeypatch)
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance306.safe_document",
        lambda _: {"sha": AIHUB305_MAIN},
    )
    approved = review_original_owner_release306(Path.cwd(), Monitor(), proof, **opts)
    assert approved["accepted"] is True
    assert approved["connection"] == "HOLD"
    assert approved["verificationScope"] == "INDEPENDENT_REVIEWER_WITNESSED_PROCESS_FIELD_EVIDENCE"
    assert not review_original_owner_release306(
        Path.cwd(), Monitor(), proof, **{**opts, "owner_authorize": lambda **_: False}
    )["accepted"]
    assert not review_original_owner_release306(
        Path.cwd(), Monitor(), proof, **{**opts, "independent_reviewer_pin": "e" * 64}
    )["accepted"]
    assert not review_original_owner_release306(
        Path.cwd(), Monitor(), proof, **{**opts, "now_ms": NOW + 31 * 60_000}
    )["accepted"]
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance306.safe_document",
        lambda _: {"sha": "b" * 40},
    )
    assert not review_original_owner_release306(Path.cwd(), Monitor(), proof, **opts)["accepted"]


def test_one_test_import_is_source_signed_replay_gated_and_never_comms_ack(monkeypatch):
    private, der, pin = signer()
    payload = {
        "schema": COMMS_SCHEMA,
        "sourceId": "rosevear-ai-hub",
        "hostId": "DESKTOP-AE894KC",
        "sourceRevision": AIHUB305_MAIN,
        "capturedAt": _utc(NOW),
        "episodeId": "one306SupervisedTest",
        "samples": [
            {
                "observationId": f"observed306-{i:03d}",
                "service": "hub_api_8765",
                "observedAt": _utc(NOW - i * 1000),
                "reachable": True,
                "latencyMs": 12.5,
            }
            for i in range(2)
        ],
    }
    envelope = signed(private, payload)
    opts = dict(
        source_public_der=der,
        independent_source_pin=pin,
        owner_authorize=lambda **_: True,
        claim_imported_episode=lambda **_: True,
        now_ms=NOW,
    )
    assert not import_protected_source_one_test306(Monitor(), envelope, **opts)["accepted"]
    enable_ree(monkeypatch)
    result = import_protected_source_one_test306(Monitor(), envelope, **opts)
    assert result["state"] == "SOURCE_SIGNED_ONE_TEST_IMPORTED_COMMS_ACK_HOLD"
    assert result["accepted"] and result["connection"] == "HOLD"
    assert result["receiver"] == "OFF" and not result["transportSent"]
    assert result["commsReceiverSignedAck"] == "HOLD_NOT_PROVIDED_BY_QL412"
    assert not import_protected_source_one_test306(
        Monitor(), envelope, **{**opts, "claim_imported_episode": lambda **_: False}
    )["accepted"]
    assert not import_protected_source_one_test306(
        Monitor(), envelope, **{**opts, "owner_authorize": lambda **_: False}
    )["accepted"]
    assert not import_protected_source_one_test306(
        Monitor(), envelope, **{**opts, "independent_source_pin": "f" * 64}
    )["accepted"]
    assert not import_protected_source_one_test306(
        Monitor(), envelope, **{**opts, "now_ms": NOW + 6 * 60_000}
    )["accepted"]
    changed = signed(private, {**payload, "hostId": "TEMPLAR"})
    assert not import_protected_source_one_test306(Monitor(), changed, **opts)["accepted"]
    corrupt = {"payload": payload, "signature": envelope["signature"][:-2] + "AA"}
    assert not import_protected_source_one_test306(Monitor(), corrupt, **opts)["accepted"]


def test_readonly_seven_day_trend_does_not_impute_missing_time(tmp_path):
    ledger = DurableUptimeLedger304(tmp_path / "uptime.sqlite3")
    base = NOW // DAY_MS * DAY_MS
    assert ledger.record(base - DAY_MS * 8, {"hub_api": True, "hub_web": True, "caddy_proxy": True})
    assert ledger.record(base - DAY_MS, {"hub_api": True, "hub_web": False, "caddy_proxy": True})
    assert ledger.record(base, {"hub_api": False, "hub_web": True, "caddy_proxy": False})
    days = ledger.observed_daily_trend306(NOW)
    assert len(days) == 2
    assert all(day["observedMinutes"] == 1 for day in days)
    assert days[0]["reachableMinutes"] == {"hub_api": 1, "hub_web": 0, "caddy_proxy": 1}
    assert days[1]["reachableMinutes"] == {"hub_api": 0, "hub_web": 1, "caddy_proxy": 0}
    assert ledger.observed_daily_trend306(-1) is None


def test_protected_import_claim_is_durable_and_rejects_replay(monkeypatch, tmp_path):
    ledger = ProtectedSourceImportLedger306(tmp_path / "protected-intake.sqlite3")
    opts = dict(
        source_id="rosevear-ai-hub",
        episode_id="supervisedEpisode306",
        envelope_sha256="a" * 64,
    )
    assert ledger.claim(**opts) is False  # Linux/cloud executor is not Ree's host.
    enable_ree(monkeypatch)
    assert ledger.claim(**opts) is True
    assert ProtectedSourceImportLedger306(ledger.path).claim(**opts) is False
    assert ledger.claim(**{**opts, "source_id": "TEMPLAR"}) is False
    assert ledger.claim(**{**opts, "episode_id": "bad"}) is False


def test_three_master_view_missing_source_is_hold_and_endpoint_owner_only():
    status = reconcile_three_master_uptime306(Monitor())
    assert status["observedLocalTrend"] == []
    assert status["connection"] == "HOLD"
    assert status["newWindowsScheduledTasks"] == 0
    assert [row["id"] for row in status["masterSources"]] == [
        "rosevear-ai-hub",
        "ai-data-platform",
        "rosevear-comms-hub",
    ]
    assert TestClient(app).get("/api/v1/system/master-shell-306-acceptance").status_code == 401
