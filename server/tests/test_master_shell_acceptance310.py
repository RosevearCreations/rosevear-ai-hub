# fmt: off
# ruff: noqa: E501, I001
"""Build 310: synthetic private witnesses never substitute for Ree field evidence."""
import base64
import hashlib
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import COMMS_SCHEMA, _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance306 import REVIEW_SCHEMA
from rosevear_ai_hub.master_shell_acceptance310 import (
    AIDATA373, COMMS417, DECISION_SCHEMA, SOURCE309,
    ProtectedOneTestExportAudit310, attest_external_transport310,
    prepare_supervised_export310, reconcile_controller_owner_decision310,
    reconcile_master_evidence310, review_installed_309_on_ree310,
)

NOW = 1794420000000
CORR = "oneTest310Correlation"
EPISODE = "oneTest310Episode"


class Monitor:
    persist_eligible = True

    def persistent_snapshot304(self):
        return {"collectionState": "OBSERVING_REE_LOCAL", "sampleCount": 3}

    class Ledger:
        def observed_daily_trend306(self, _):
            return []

    ledger = Ledger()


def keys():
    private = Ed25519PrivateKey.generate()
    public = private.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return private, public, hashlib.sha256(public).hexdigest()


def signed(private, payload):
    return {"payload": payload, "signature": base64.b64encode(private.sign(_serialize(payload))).decode()}


def simulate_ree(monkeypatch):
    for mod in ("master_shell_acceptance306", "master_shell_acceptance307", "master_shell_acceptance308"):
        monkeypatch.setattr(f"rosevear_ai_hub.{mod}.platform.system", lambda: "Windows")
        monkeypatch.setattr(f"rosevear_ai_hub.{mod}.socket.gethostname", lambda: "DESKTOP-AE894KC")
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance306.safe_document",
        lambda _: {"sha": SOURCE309},
    )


def field():
    return {
        "schema": REVIEW_SCHEMA, "sourceId": "rosevear-ai-hub",
        "originalHost": "DESKTOP-AE894KC", "reviewerHost": "TEMPLAR",
        "sourceRevision": SOURCE309, "observedAt": _utc(NOW),
        "releasePointerSha": SOURCE309, "loadedProcessSha": SOURCE309,
        "launcherPid": 900, "processPid": 901,
        "processEvidenceSha256": "a" * 64, "ownerConsentReference": "oneTest310Consent",
    }


def source():
    return {
        "schema": COMMS_SCHEMA, "sourceId": "rosevear-ai-hub",
        "hostId": "DESKTOP-AE894KC", "sourceRevision": SOURCE309,
        "capturedAt": _utc(NOW - 500), "episodeId": EPISODE,
        "samples": [
            {"observationId": "oneTest310Sample1", "service": "hub_api_8765",
             "observedAt": _utc(NOW - 1500), "reachable": True, "latencyMs": 5.0},
            {"observationId": "oneTest310Sample2", "service": "hub_api_8765",
             "observedAt": _utc(NOW - 1200), "reachable": True, "latencyMs": 5.1},
        ],
    }


def test_export_requires_signed_field_and_private_import_and_replay(monkeypatch, tmp_path):
    reviewer, rpub, rpin = keys()
    sender, spub, spin = keys()
    proof, envelope = signed(reviewer, field()), signed(sender, source())
    audit = ProtectedOneTestExportAudit310(tmp_path / "protected.sqlite3")
    kwargs = dict(
        audit=audit, reviewer_public_der=rpub, independent_reviewer_pin=rpin,
        release_owner_authorize=lambda **_: True, source_public_der=spub,
        independently_pinned_source_sha256=spin,
        source_import_claimed=lambda **_: True,
        export_owner_authorize=lambda **_: True,
        independent_export_reviewer_approve=lambda **_: True,
        correlation_id=CORR, now_ms=NOW,
    )
    assert not review_installed_309_on_ree310(
        Path.cwd(), Monitor(), proof, reviewer_public_der=rpub,
        independent_reviewer_pin=rpin, owner_authorize=lambda **_: True, now_ms=NOW
    )["accepted"]
    assert not prepare_supervised_export310(Path.cwd(), Monitor(), proof, envelope, **kwargs)["accepted"]
    simulate_ree(monkeypatch)
    assert review_installed_309_on_ree310(
        Path.cwd(), Monitor(), proof, reviewer_public_der=rpub,
        independent_reviewer_pin=rpin, owner_authorize=lambda **_: True, now_ms=NOW
    )["accepted"]
    assert not prepare_supervised_export310(
        Path.cwd(), Monitor(), proof, envelope,
        **{**kwargs, "independent_export_reviewer_approve": lambda **_: False}
    )["accepted"]
    prepared = prepare_supervised_export310(Path.cwd(), Monitor(), proof, envelope, **kwargs)
    assert prepared["accepted"] and prepared["transportSent"] is False
    assert prepared["connection"] == "HOLD"
    assert not prepare_supervised_export310(Path.cwd(), Monitor(), proof, envelope, **kwargs)["accepted"]
    assert not prepare_supervised_export310(
        Path.cwd(), Monitor(), proof, signed(sender, {**source(), "sourceRevision": "b" * 40}),
        **kwargs
    )["accepted"]
    assert not prepare_supervised_export310(
        Path.cwd(), Monitor(), proof, envelope,
        **{**kwargs, "independently_pinned_source_sha256": "c" * 64}
    )["accepted"]


def test_external_transport_witness_does_not_imply_comms_ack(monkeypatch, tmp_path):
    simulate_ree(monkeypatch)
    audit = ProtectedOneTestExportAudit310(tmp_path / "audit.sqlite3")
    prepared = {
        "accepted": True, "state": "PREPARED_SUPERVISED_ONE_TEST_NOT_TRANSMITTED",
        "sourceRevision": SOURCE309, "transportSent": False, "connection": "HOLD",
        "episodeId": EPISODE, "correlationId": CORR, "sourcePayloadSha256": "a" * 64,
    }
    assert audit.claim_prepared(
        Monitor(), episode=EPISODE, correlation=CORR,
        source_digest="a" * 64, field_review_digest="b" * 64,
    )
    args = dict(
        audit=audit, protected_transport_witness=lambda **_: False,
        transport_receipt_digest="c" * 64,
    )
    assert not attest_external_transport310(Monitor(), prepared, **args)["accepted"]
    result = attest_external_transport310(
        Monitor(), prepared,
        **{**args, "protected_transport_witness": lambda **_: True},
    )
    assert result["accepted"] and result["receiverAckVerified"] is False
    assert result["connection"] == "HOLD"
    assert audit.exact_witness(
        Monitor(), episode=EPISODE, correlation=CORR,
        source_digest="a" * 64, transport_digest="c" * 64,
    )
    assert not attest_external_transport310(
        Monitor(), prepared,
        **{**args, "protected_transport_witness": lambda **_: True}
    )["accepted"]


def test_independent_controller_signature_and_owner_review_remain_hold(monkeypatch, tmp_path):
    simulate_ree(monkeypatch)
    audit = ProtectedOneTestExportAudit310(tmp_path / "audit.sqlite3")
    assert audit.claim_prepared(
        Monitor(), episode=EPISODE, correlation=CORR,
        source_digest="a" * 64, field_review_digest="b" * 64,
    )
    assert audit.attest_transport(
        Monitor(), episode=EPISODE, correlation=CORR,
        source_digest="a" * 64, transport_digest="c" * 64,
    )
    controller, pub, pin = keys()
    transport = {
        "accepted": True, "state": "EXTERNAL_ONE_TEST_TRANSPORT_WITNESSED_ACK_UNVERIFIED",
        "episodeId": EPISODE, "correlationId": CORR,
        "sourcePayloadSha256": "a" * 64,
        "transportReceiptSha256": "c" * 64, "connection": "HOLD",
    }
    decision = {
        "schema": DECISION_SCHEMA, "controller": "ai-data-platform",
        "controllerRevision": AIDATA373, "commsRevision": COMMS417,
        "sourceId": "rosevear-ai-hub", "sourceRevision": SOURCE309,
        "hostId": "DESKTOP-AE894KC", "episodeId": EPISODE,
        "correlationId": CORR, "sourcePayloadSha256": "a" * 64,
        "transportReceiptSha256": "c" * 64,
        "receiverAckSha256": "d" * 64, "ql416ReviewSha256": "e" * 64,
        "decision": "OWNER_REVIEWED_NO_ACTIVATION", "connection": "HOLD",
        "mastersSynced": False, "decidedAt": _utc(NOW),
    }
    kwargs = dict(
        audit=audit, controller_public_der=pub,
        independently_pinned_controller_sha256=pin,
        independently_attest_controller_ledger=lambda **_: True,
        owner_review_authorize=lambda **_: True, now_ms=NOW,
    )
    assert not reconcile_controller_owner_decision310(
        Monitor(), transport, signed(controller, {**decision, "connection": "CONNECTED"}), **kwargs
    )["accepted"]
    assert not reconcile_controller_owner_decision310(
        Monitor(), transport, signed(controller, decision),
        **{**kwargs, "independently_attest_controller_ledger": lambda **_: False}
    )["accepted"]
    result = reconcile_controller_owner_decision310(
        Monitor(), transport, signed(controller, decision), **kwargs,
    )
    assert result["accepted"] and result["connection"] == "HOLD"
    assert result["mastersSynced"] is False and result["receiverAckVerified"] is False
    assert not reconcile_controller_owner_decision310(
        Monitor(), transport, signed(controller, decision),
        **{**kwargs, "independently_pinned_controller_sha256": "f" * 64}
    )["accepted"]
    assert not reconcile_controller_owner_decision310(
        Monitor(), transport, signed(controller, decision),
        **{**kwargs, "now_ms": NOW + 6 * 60_000}
    )["accepted"]


def test_read_only_status_remains_fail_closed():
    state = reconcile_master_evidence310(Monitor())
    assert state["sourceBuild"] == 310
    assert state["connection"] == state["masterSync"] == "HOLD"
    assert state["originalHostAdoption"].startswith("HOLD")
    assert state["newWindowsScheduledTasks"] == 0
    assert TestClient(app).get("/api/v1/system/master-shell-310-acceptance").status_code == 401
