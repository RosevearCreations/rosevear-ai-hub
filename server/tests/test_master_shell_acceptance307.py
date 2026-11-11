"""Build 307: independently pinned original-host receipt custody fail-closed."""

import base64
import hashlib
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import COMMS_SCHEMA, _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance306 import (
    REVIEW_SCHEMA,
    ProtectedSourceImportLedger306,
)
from rosevear_ai_hub.master_shell_acceptance307 import (
    AIHUB306_MAIN,
    COMMS_QL413_MAIN,
    QL413_SCHEMA,
    ProtectedChainLedger307,
    prepare_ai_data_uptime_exchange307,
    reconcile_master_evidence307,
    review_installed_306_on_ree307,
    verify_source_comms_chain307,
)

NOW = 1794324000000


class Monitor:
    persist_eligible = True

    class Ledger:
        def observed_daily_trend306(self, _):
            return [
                {
                    "dayUtc": "2026-11-10",
                    "observedMinutes": 3,
                    "reachableMinutes": {"hub_api": 2, "hub_web": 3, "caddy_proxy": 2},
                }
            ]

    ledger = Ledger()

    def persistent_snapshot304(self):
        return {"collectionState": "OBSERVING_REE_LOCAL", "sampleCount": 3}


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


def on_ree(monkeypatch):
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance307.platform.system", lambda: "Windows"
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance307.socket.gethostname", lambda: "DESKTOP-AE894KC"
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance306.platform.system", lambda: "Windows"
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance306.socket.gethostname", lambda: "DESKTOP-AE894KC"
    )


def field_review():
    return {
        "schema": REVIEW_SCHEMA,
        "sourceId": "rosevear-ai-hub",
        "originalHost": "DESKTOP-AE894KC",
        "reviewerHost": "TEMPLAR",
        "sourceRevision": AIHUB306_MAIN,
        "observedAt": _utc(NOW),
        "releasePointerSha": AIHUB306_MAIN,
        "loadedProcessSha": AIHUB306_MAIN,
        "launcherPid": 900,
        "processPid": 901,
        "processEvidenceSha256": "a" * 64,
        "ownerConsentReference": "reeBuild307Approval",
    }


def source_episode():
    return {
        "schema": COMMS_SCHEMA,
        "sourceId": "rosevear-ai-hub",
        "hostId": "DESKTOP-AE894KC",
        "sourceRevision": AIHUB306_MAIN,
        "capturedAt": _utc(NOW - 1000),
        "episodeId": "one307SourceEpisode",
        "samples": [
            {
                "observationId": f"source-307-{i}",
                "service": "hub_api_8765",
                "observedAt": _utc(NOW - 1200 - i * 100),
                "reachable": True,
                "latencyMs": 11.0,
            }
            for i in range(2)
        ],
    }


def comms_ack(source):
    return {
        "schema": "rosevear.comms.ql414.source-one-test-ack.v1",
        "sourceId": "rosevear-comms-hub",
        "hostId": "PROTECTED_MASTER_RUNTIME",
        "revision": COMMS_QL413_MAIN,
        "ackedAt": _utc(NOW),
        "ackId": "one307CommsAck",
        "episodeId": source["episodeId"],
        "sourceHost": "DESKTOP-AE894KC",
        "sourceRevision": AIHUB306_MAIN,
        "sourceEnvelopeSha256": hashlib.sha256(_serialize(source)).hexdigest(),
        "decision": "RECEIVED_FOR_INDEPENDENT_REVIEW",
    }


def test_field_review_needs_exact_installed_306_and_real_reviewer_pin(monkeypatch):
    reviewer, der, pin = signer()
    proof = signed(reviewer, field_review())
    opts = dict(
        reviewer_public_der=der,
        independent_reviewer_pin=pin,
        owner_authorize=lambda **_: True,
        now_ms=NOW,
    )
    assert review_installed_306_on_ree307(Path.cwd(), Monitor(), proof, **opts)["accepted"] is False
    on_ree(monkeypatch)
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance306.safe_document", lambda _: {"sha": AIHUB306_MAIN}
    )
    result = review_installed_306_on_ree307(Path.cwd(), Monitor(), proof, **opts)
    assert result["accepted"] and result["connection"] == "HOLD"
    assert result["sourceRevision"] == AIHUB306_MAIN
    assert not review_installed_306_on_ree307(
        Path.cwd(), Monitor(), proof, **{**opts, "independent_reviewer_pin": "a" * 64}
    )["accepted"]
    assert not review_installed_306_on_ree307(
        Path.cwd(), Monitor(), proof, **{**opts, "owner_authorize": lambda **_: False}
    )["accepted"]


def test_signed_source_comms_chain_binds_episode_revision_and_durable_import(monkeypatch, tmp_path):
    source_key, source_der, source_pin = signer()
    comms_key, comms_der, comms_pin = signer()
    source = source_episode()
    ack = comms_ack(source)
    source_proof, comms_proof = signed(source_key, source), signed(comms_key, ack)
    import_ledger = ProtectedSourceImportLedger306(tmp_path / "import.sqlite3")
    chain_ledger = ProtectedChainLedger307(tmp_path / "chain.sqlite3")
    opts = dict(
        source_public_der=source_der,
        independently_pinned_source_sha256=source_pin,
        comms_public_der=comms_der,
        independently_pinned_comms_sha256=comms_pin,
        source_import_claimed=import_ledger.was_claimed,
        owner_authorize=lambda **_: True,
        independent_reviewer_approve=lambda **_: True,
        claim_chain=chain_ledger.claim,
        now_ms=NOW,
    )
    assert not verify_source_comms_chain307(source_proof, comms_proof, **opts)["accepted"]
    on_ree(monkeypatch)
    source_digest = hashlib.sha256(_serialize(source)).hexdigest()
    assert not verify_source_comms_chain307(source_proof, comms_proof, **opts)["accepted"]
    assert import_ledger.claim(
        source_id="rosevear-ai-hub", episode_id=source["episodeId"], envelope_sha256=source_digest
    )
    assert import_ledger.was_claimed(
        source_id="rosevear-ai-hub", episode_id=source["episodeId"], envelope_sha256=source_digest
    )
    assert not import_ledger.was_claimed(
        source_id="rosevear-ai-hub", episode_id=source["episodeId"], envelope_sha256="b" * 64
    )
    bad = signed(comms_key, {**ack, "sourceEnvelopeSha256": "0" * 64})
    assert not verify_source_comms_chain307(source_proof, bad, **opts)["accepted"]
    assert not verify_source_comms_chain307(
        source_proof, comms_proof, **{**opts, "independently_pinned_comms_sha256": "a" * 64}
    )["accepted"]
    assert not verify_source_comms_chain307(
        source_proof, comms_proof, **{**opts, "owner_authorize": lambda **_: False}
    )["accepted"]
    assert not verify_source_comms_chain307(
        source_proof, comms_proof, **{**opts, "independent_reviewer_approve": lambda **_: False}
    )["accepted"]
    result = verify_source_comms_chain307(source_proof, comms_proof, **opts)
    assert result["accepted"] and result["connection"] == "HOLD"
    assert result["transportSent"] is False and result["receiver"] == "OFF"
    assert not verify_source_comms_chain307(source_proof, comms_proof, **opts)["accepted"]
    assert not ProtectedChainLedger307(chain_ledger.path).claim(
        episode_id=source["episodeId"],
        source_digest=source_digest,
        comms_digest=hashlib.sha256(_serialize(ack)).hexdigest(),
    )


def test_reject_stale_replay_and_wrong_host_ack(monkeypatch, tmp_path):
    on_ree(monkeypatch)
    source_key, source_der, source_pin = signer()
    comms_key, comms_der, comms_pin = signer()
    source = source_episode()
    ack = comms_ack(source)
    opts = dict(
        source_public_der=source_der,
        independently_pinned_source_sha256=source_pin,
        comms_public_der=comms_der,
        independently_pinned_comms_sha256=comms_pin,
        source_import_claimed=lambda **_: True,
        owner_authorize=lambda **_: True,
        independent_reviewer_approve=lambda **_: True,
        claim_chain=ProtectedChainLedger307(tmp_path / "chain.sqlite3").claim,
        now_ms=NOW + 6 * 60_000,
    )
    assert not verify_source_comms_chain307(
        signed(source_key, source), signed(comms_key, ack), **opts
    )["accepted"]
    assert not verify_source_comms_chain307(
        signed(source_key, source),
        signed(comms_key, {**ack, "hostId": "TEMPLAR"}),
        **{**opts, "now_ms": NOW},
    )["accepted"]
    assert not verify_source_comms_chain307(
        signed(source_key, source),
        signed(comms_key, {**ack, "revision": "b" * 40}),
        **{**opts, "now_ms": NOW},
    )["accepted"]


def test_ai_data_exchange_matches_ql413_and_is_never_transmitted(monkeypatch):
    private, der, pin = signer()
    reviewer_private, reviewer_der, reviewer_pin = signer()
    review = signed(reviewer_private, field_review())
    opts = dict(
        reviewer_public_der=reviewer_der,
        independent_reviewer_pin=reviewer_pin,
        release_owner_authorize=lambda **_: True,
        receipt_id="original307OneReceipt",
        original_host_sign=lambda *, payload: signed(private, payload)["signature"],
        source_public_der=der,
        independently_pinned_source_sha256=pin,
        owner_authorize=lambda **_: True,
        now_ms=NOW,
    )
    assert not prepare_ai_data_uptime_exchange307(Path.cwd(), Monitor(), review, **opts)["accepted"]
    on_ree(monkeypatch)
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance306.safe_document", lambda _: {"sha": AIHUB306_MAIN}
    )
    result = prepare_ai_data_uptime_exchange307(Path.cwd(), Monitor(), review, **opts)
    assert result["accepted"] and result["connection"] == "HOLD"
    payload = result["signedReceipt"]["payload"]
    assert list(payload) == [
        "schema",
        "sourceId",
        "hostId",
        "revision",
        "issuedAt",
        "receiptId",
        "evidence",
    ]
    assert payload["schema"] == QL413_SCHEMA and payload["revision"] == AIHUB306_MAIN
    assert payload["evidence"] == {
        "installedRelease": "VERIFIED",
        "persistentHistory": "VERIFIED",
        "signedTelemetry": "HOLD",
        "replayProtection": "HOLD",
        "incidentAcceptance": "HOLD",
    }
    assert not result["transportSent"] and not result["aiDataAcknowledged"]
    assert not prepare_ai_data_uptime_exchange307(
        Path.cwd(), Monitor(), review, **{**opts, "owner_authorize": lambda **_: False}
    )["accepted"]
    assert not prepare_ai_data_uptime_exchange307(
        Path.cwd(), Monitor(), review, **{**opts, "independently_pinned_source_sha256": "a" * 64}
    )["accepted"]
    assert not prepare_ai_data_uptime_exchange307(
        Path.cwd(), Monitor(), review, **{**opts, "independent_reviewer_pin": "a" * 64}
    )["accepted"]


def test_read_only_307_api_fail_closed_without_original_host_runtime():
    with TestClient(app) as client:
        result = client.get("/api/v1/system/master-shell-307-acceptance")
    assert result.status_code == 401  # The route remains behind the existing owner auth.
    body = reconcile_master_evidence307(Monitor())
    assert body["sourceBuild"] == 307 and body["expectedInstalledRevision306"] == AIHUB306_MAIN
    assert body["connection"] == "HOLD" and body["receiver"] == "OFF"
    assert body["sourceCommsOneReceiptChain"].startswith("HOLD_")
    assert body["aiDataUptimeExchange"].startswith("HOLD_")
    assert body["observedLocalTrend"] == []
    assert (
        reconcile_master_evidence307(Monitor())["slaveGate"] == "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
    )
