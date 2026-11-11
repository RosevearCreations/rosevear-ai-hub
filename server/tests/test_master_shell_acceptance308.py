"""Build 308: real Comms QL-414 wire schema, not Build 307's proposal."""

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
from rosevear_ai_hub.master_shell_acceptance307 import ProtectedChainLedger307
from rosevear_ai_hub.master_shell_acceptance308 import (
    ACK_SCHEMA,
    AIHUB307_MAIN,
    OPERATION,
    prepare_ql414_one_test_request308,
    reconcile_master_evidence308,
    review_installed_307_on_ree308,
    review_three_master_receipts308,
    verify_ql414_receiver_ack308,
)

NOW = 1794324000000
CORRELATION = "master360One308Correlation"


class Monitor:
    persist_eligible = True

    def persistent_snapshot304(self):
        return {"collectionState": "OBSERVING_REE_LOCAL", "sampleCount": 3}

    class Ledger:
        def observed_daily_trend306(self, _):
            return [{"dayUtc": "2026-11-10", "observedMinutes": 3,
                     "reachableMinutes": {"hub_api": 3}}]

    ledger = Ledger()


def keys():
    private = Ed25519PrivateKey.generate()
    public = private.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return private, public, hashlib.sha256(public).hexdigest()


def sign(private, payload):
    return {"payload": payload,
            "signature": base64.b64encode(private.sign(_serialize(payload))).decode()}


def on_ree(monkeypatch):
    for module in ("master_shell_acceptance306", "master_shell_acceptance307",
                   "master_shell_acceptance308"):
        monkeypatch.setattr(f"rosevear_ai_hub.{module}.platform.system", lambda: "Windows")
        monkeypatch.setattr(f"rosevear_ai_hub.{module}.socket.gethostname",
                            lambda: "DESKTOP-AE894KC")
    monkeypatch.setattr("rosevear_ai_hub.master_shell_acceptance306.safe_document",
                        lambda _: {"sha": AIHUB307_MAIN})


def field():
    return {
        "schema": REVIEW_SCHEMA, "sourceId": "rosevear-ai-hub",
        "originalHost": "DESKTOP-AE894KC", "reviewerHost": "TEMPLAR",
        "sourceRevision": AIHUB307_MAIN, "observedAt": _utc(NOW),
        "releasePointerSha": AIHUB307_MAIN, "loadedProcessSha": AIHUB307_MAIN,
        "launcherPid": 900, "processPid": 901,
        "processEvidenceSha256": "a" * 64,
        "ownerConsentReference": "reeBuild308Approval",
    }


def source():
    return {
        "schema": COMMS_SCHEMA, "sourceId": "rosevear-ai-hub",
        "hostId": "DESKTOP-AE894KC", "sourceRevision": AIHUB307_MAIN,
        "capturedAt": _utc(NOW - 2000), "episodeId": "one308ReeEpisode",
        "samples": [
            {"observationId": f"one308Sample{i}", "service": "hub_api_8765",
             "observedAt": _utc(NOW - 3000 - i * 100),
             "reachable": True, "latencyMs": 3.5}
            for i in range(2)
        ],
    }


def actual_comms_ack(src, receiver_key_id="commsReceiver308Test"):
    return {
        "schema": ACK_SCHEMA, "operation": OPERATION,
        "sourceId": "rosevear-ai-hub", "hostId": "DESKTOP-AE894KC",
        "sourceRevision": AIHUB307_MAIN, "sourceEpisodeId": src["episodeId"],
        "correlationId": CORRELATION, "receivedAt": _utc(NOW),
        "receiverKeyId": receiver_key_id,
        "sourcePayloadSha256": hashlib.sha256(_serialize(src)).hexdigest(),
        "decision": "METADATA_VERIFIED_FOR_OWNER_REVIEW", "connection": "HOLD",
    }


def test_installed_307_needs_original_host_and_independent_reviewer(monkeypatch):
    reviewer, der, pin = keys()
    proof = sign(reviewer, field())
    opts = dict(reviewer_public_der=der, independent_reviewer_pin=pin,
                owner_authorize=lambda **_: True, now_ms=NOW)
    assert not review_installed_307_on_ree308(Path.cwd(), Monitor(), proof, **opts)["accepted"]
    on_ree(monkeypatch)
    assert review_installed_307_on_ree308(Path.cwd(), Monitor(), proof, **opts)["accepted"]
    assert not review_installed_307_on_ree308(
        Path.cwd(), Monitor(), proof, **{**opts, "independent_reviewer_pin": "b"*64}
    )["accepted"]
    assert not review_installed_307_on_ree308(
        Path.cwd(), Monitor(), proof, **{**opts, "owner_authorize": lambda **_: False}
    )["accepted"]


def test_source_request_is_real_ql414_format_and_not_transmitted(monkeypatch, tmp_path):
    on_ree(monkeypatch)
    reviewer, rder, rpin = keys()
    sender, sder, spin = keys()
    src = source()
    signed_src = sign(sender, src)
    imported = ProtectedSourceImportLedger306(tmp_path / "prior-import.sqlite3")
    opts = dict(
        reviewer_public_der=rder, independent_reviewer_pin=rpin,
        release_owner_authorize=lambda **_: True,
        source_public_der=sder, independently_pinned_source_sha256=spin,
        source_import_claimed=imported.was_claimed,
        owner_authorize_one_test=lambda **_: True,
        independent_reviewer_approve=lambda **_: True,
        correlation_id=CORRELATION, now_ms=NOW,
    )
    review = sign(reviewer, field())
    assert not prepare_ql414_one_test_request308(
        Path.cwd(), Monitor(), review, signed_src, **opts
    )["accepted"]
    assert imported.claim(source_id="rosevear-ai-hub", episode_id=src["episodeId"],
                          envelope_sha256=hashlib.sha256(_serialize(src)).hexdigest())
    accepted = prepare_ql414_one_test_request308(
        Path.cwd(), Monitor(), review, signed_src, **opts
    )
    assert accepted["accepted"] and not accepted["transportSent"]
    assert set(accepted["request"]) == {"operation", "correlationId", "envelope"}
    assert accepted["request"]["operation"] == "MASTER360_ONE_TEST_READ_ONLY"
    assert accepted["request"]["envelope"] == signed_src
    assert not prepare_ql414_one_test_request308(
        Path.cwd(), Monitor(), review, signed_src,
        **{**opts, "correlation_id": "bad"}
    )["accepted"]


def test_authentic_ql414_ack_chain_and_replay_fail_closed(monkeypatch, tmp_path):
    on_ree(monkeypatch)
    sender, sder, spin = keys()
    receiver, rder, rpin = keys()
    src = source()
    ack = actual_comms_ack(src)
    envelope, signed_ack = sign(sender, src), sign(receiver, ack)
    imports = ProtectedSourceImportLedger306(tmp_path / "import.sqlite3")
    chains = ProtectedChainLedger307(tmp_path / "chain.sqlite3")
    opts = dict(
        source_public_der=sder, independently_pinned_source_sha256=spin,
        receiver_public_der=rder, independently_pinned_receiver_sha256=rpin,
        expected_receiver_key_id="commsReceiver308Test", correlation_id=CORRELATION,
        source_import_claimed=imports.was_claimed,
        protected_transport_attest=lambda **_: True,
        owner_authorize=lambda **_: True,
        independent_reviewer_approve=lambda **_: True,
        claim_chain=chains.claim, now_ms=NOW,
    )
    assert not verify_ql414_receiver_ack308(Monitor(), envelope, signed_ack, **opts)["accepted"]
    assert imports.claim(source_id="rosevear-ai-hub", episode_id=src["episodeId"],
                         envelope_sha256=hashlib.sha256(_serialize(src)).hexdigest())
    assert not verify_ql414_receiver_ack308(
        Monitor(), envelope, sign(receiver, {**ack, "sourcePayloadSha256": "b"*64}), **opts
    )["accepted"]
    assert not verify_ql414_receiver_ack308(
        Monitor(), envelope,
        sign(receiver, {**ack, "correlationId": "unexpected308Correlation"}), **opts
    )["accepted"]
    assert not verify_ql414_receiver_ack308(
        Monitor(), envelope, signed_ack,
        **{**opts, "independently_pinned_receiver_sha256": "a"*64}
    )["accepted"]
    assert not verify_ql414_receiver_ack308(
        Monitor(), envelope, signed_ack,
        **{**opts, "protected_transport_attest": lambda **_: False}
    )["accepted"]
    valid = verify_ql414_receiver_ack308(Monitor(), envelope, signed_ack, **opts)
    assert valid["accepted"] and valid["connection"] == "HOLD"
    assert valid["aiDataAccepted"] is False and valid["receiver"] == "OFF"
    assert not verify_ql414_receiver_ack308(Monitor(), envelope, signed_ack, **opts)["accepted"]


def test_legacy_proposed_ack_stale_revision_and_mocked_replay_are_rejected(monkeypatch, tmp_path):
    on_ree(monkeypatch)
    sender, sder, spin = keys()
    receiver, rder, rpin = keys()
    src = source()
    old_ack = {**actual_comms_ack(src), "schema": "rosevear.comms.ql414.source-one-test-ack.v1"}
    opts = dict(
        source_public_der=sder, independently_pinned_source_sha256=spin,
        receiver_public_der=rder, independently_pinned_receiver_sha256=rpin,
        expected_receiver_key_id="commsReceiver308Test", correlation_id=CORRELATION,
        source_import_claimed=lambda **_: True,
        protected_transport_attest=lambda **_: True,
        owner_authorize=lambda **_: True, independent_reviewer_approve=lambda **_: True,
        claim_chain=ProtectedChainLedger307(tmp_path / "chain.sqlite3").claim, now_ms=NOW,
    )
    assert not verify_ql414_receiver_ack308(Monitor(), sign(sender, src),
                                           sign(receiver, old_ack), **opts)["accepted"]
    stale = sign(sender, {**src, "sourceRevision": "a"*40})
    assert not verify_ql414_receiver_ack308(
        Monitor(), stale, sign(receiver, actual_comms_ack(src)), **opts
    )["accepted"]


def test_owner_only_status_reports_runtime_hold():
    state = reconcile_master_evidence308(Monitor())
    assert state["sourceBuild"] == 308 and state["connection"] == "HOLD"
    assert state["ql414ActualAckSchema"] == ACK_SCHEMA
    assert state["newWindowsScheduledTasks"] == 0
    with TestClient(app) as client:
        response = client.get("/api/v1/system/master-shell-308-acceptance")
    assert response.status_code == 401


def test_three_master_receipts_require_distinct_signers_and_runtime_review(monkeypatch):
    on_ree(monkeypatch)
    identities = ("ai-data-platform", "rosevear-comms-hub", "rosevear-ai-hub")
    revisions = (
        "ff7ac9aea87e6d2e1d9ebc8d29b2fd784f901f01",
        "8c2d488582801e8abc5ca718b4719c615863274c",
        AIHUB307_MAIN,
    )
    pubs, hashes, receipts = {}, {}, []
    for i, (source_id, revision) in enumerate(zip(identities, revisions, strict=True)):
        private, der, pin = keys()
        pubs[source_id] = der
        hashes[source_id] = pin
        receipts.append(sign(private, {
            "schema": "rosevear.master360.protected-receipt.v1",
            "sourceId": source_id,
            "hostId": "DESKTOP-AE894KC" if source_id == "rosevear-ai-hub"
            else "PROTECTED_MASTER_RUNTIME",
            "revision": revision,
            "issuedAt": _utc(NOW),
            "receiptId": f"master308Receipt{i}",
            "evidence": {
                "installedRelease": "VERIFIED", "persistentHistory": "VERIFIED",
                "signedTelemetry": "VERIFIED", "replayProtection": "VERIFIED",
                "incidentAcceptance": "VERIFIED",
            },
        }))
    claims = set()

    def atomic_claim(*, replay_keys, batch_sha256):
        if any(key in claims for key in replay_keys) or len(batch_sha256) != 64:
            return False
        claims.update(replay_keys)
        return True

    opts = dict(
        pinned_public_der=pubs, independent_pins_sha256=hashes,
        owner_authorize=lambda **_: True,
        independent_reviewer_approve=lambda **_: True,
        atomic_claim_batch=atomic_claim,
        now_ms=NOW,
    )
    result = review_three_master_receipts308(Monitor(), receipts, **opts)
    assert result["accepted"] and result["receiptCount"] == 3
    assert result["allClaimedEvidenceVerified"] is True
    assert result["connection"] == "HOLD" and result["masterSync"] == "HOLD"
    assert not review_three_master_receipts308(Monitor(), receipts, **opts)["accepted"]
    assert not review_three_master_receipts308(
        Monitor(), receipts[:2] + receipts[:1], **opts
    )["accepted"]
    assert not review_three_master_receipts308(
        Monitor(), receipts,
        **{**opts, "independent_pins_sha256": {**hashes, "ai-data-platform": "0"*64}}
    )["accepted"]
