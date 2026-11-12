"""Build 311 synthetic signers and private callbacks are not deployed trust."""

import base64
import hashlib

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import COMMS_SCHEMA, _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance308 import ACK_SCHEMA, OPERATION
from rosevear_ai_hub.master_shell_acceptance310 import (
    ProtectedOneTestExportAudit310,
    SOURCE309,
)
from rosevear_ai_hub.master_shell_acceptance311 import (
    COMMS420_MAIN,
    CONTROLLER376_MAIN,
    CONTROLLER_SCHEMA311,
    SOURCE310_MAIN,
    ProtectedExportClosureLedger311,
    close_witnessed_export311,
    reconcile_controller_contract311,
    reconcile_master_evidence311,
    review_master_discrepancy311,
)

NOW = 1794420000000
EPISODE = "oneTest311Episode"
CORR = "oneTest311Correlation"
RECEIVER_KEY = "oneTest311ReceiverKey"


class Monitor:
    persist_eligible = True

    def persistent_snapshot304(self):
        return {"collectionState": "OBSERVING_REE_LOCAL", "sampleCount": 3}


def simulate_ree(monkeypatch):
    for module in ("master_shell_acceptance306", "master_shell_acceptance308"):
        monkeypatch.setattr(
            f"rosevear_ai_hub.{module}.platform.system",
            lambda: "Windows",
        )
        monkeypatch.setattr(
            f"rosevear_ai_hub.{module}.socket.gethostname",
            lambda: "DESKTOP-AE894KC",
        )


def signer():
    key = Ed25519PrivateKey.generate()
    public = key.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return key, public, hashlib.sha256(public).hexdigest()


def signed(key, payload):
    return {
        "payload": payload,
        "signature": base64.b64encode(key.sign(_serialize(payload))).decode(),
    }


def source_body():
    return {
        "schema": COMMS_SCHEMA,
        "sourceId": "rosevear-ai-hub",
        "hostId": "DESKTOP-AE894KC",
        "sourceRevision": SOURCE309,
        "capturedAt": _utc(NOW - 2_000),
        "episodeId": EPISODE,
        "samples": [
            {
                "observationId": "oneTest311sampleA",
                "service": "hub_api_8765",
                "observedAt": _utc(NOW - 3_000),
                "reachable": True,
                "latencyMs": 3.5,
            },
            {
                "observationId": "oneTest311sampleB",
                "service": "hub_api_8765",
                "observedAt": _utc(NOW - 2_500),
                "reachable": False,
                "latencyMs": 5.2,
            },
        ],
    }


def ack_body(source_digest):
    return {
        "schema": ACK_SCHEMA,
        "operation": OPERATION,
        "sourceId": "rosevear-ai-hub",
        "hostId": "DESKTOP-AE894KC",
        "sourceRevision": SOURCE309,
        "sourceEpisodeId": EPISODE,
        "correlationId": CORR,
        "receivedAt": _utc(NOW - 1_000),
        "receiverKeyId": RECEIVER_KEY,
        "sourcePayloadSha256": source_digest,
        "decision": "METADATA_VERIFIED_FOR_OWNER_REVIEW",
        "connection": "HOLD",
    }


def fixture(monkeypatch, tmp_path):
    simulate_ree(monkeypatch)
    src_key, src_pub, src_pin = signer()
    rec_key, rec_pub, rec_pin = signer()
    source = signed(src_key, source_body())
    src_digest = hashlib.sha256(_serialize(source["payload"])).hexdigest()
    receiver = signed(rec_key, ack_body(src_digest))
    transport_digest = "a" * 64
    timeline_digest = "b" * 64
    export_audit = ProtectedOneTestExportAudit310(tmp_path / "export310.sqlite3")
    ledger = ProtectedExportClosureLedger311(tmp_path / "closure311.sqlite3")
    monitor = Monitor()
    assert export_audit.claim_prepared(
        monitor,
        episode=EPISODE,
        correlation=CORR,
        source_digest=src_digest,
        field_review_digest="c" * 64,
    )
    assert export_audit.attest_transport(
        monitor,
        episode=EPISODE,
        correlation=CORR,
        source_digest=src_digest,
        transport_digest=transport_digest,
    )
    export = {
        "state": "EXTERNAL_ONE_TEST_TRANSPORT_WITNESSED_ACK_UNVERIFIED",
        "accepted": True,
        "connection": "HOLD",
        "sourceRevision": SOURCE309,
        "episodeId": EPISODE,
        "correlationId": CORR,
        "sourcePayloadSha256": src_digest,
        "transportReceiptSha256": transport_digest,
    }
    claims = set()

    def claim_chain(**kwargs):
        episode = kwargs["episode_id"]
        if episode in claims:
            return False
        claims.add(episode)
        return True

    kwargs = {
        "export_audit": export_audit,
        "closure_ledger": ledger,
        "source_public_der": src_pub,
        "independent_source_pin": src_pin,
        "receiver_public_der": rec_pub,
        "independent_receiver_pin": rec_pin,
        "expected_receiver_key_id": RECEIVER_KEY,
        "timeline_digest": timeline_digest,
        "independently_attest_comms_timeline": lambda **_: True,
        "source_import_claimed": lambda **_: True,
        "protected_transport_attest": lambda **_: True,
        "owner_authorize": lambda **_: True,
        "reviewer_approve": lambda **_: True,
        "claim_chain": claim_chain,
        "now_ms": NOW,
    }
    return monitor, export, source, receiver, kwargs, ledger


def test_witnessed_export_closure_requires_real_signatures_and_replay(monkeypatch, tmp_path):
    monitor, export, source, receiver, kwargs, ledger = fixture(monkeypatch, tmp_path)
    wrong = signed(signer()[0], receiver["payload"])
    assert not close_witnessed_export311(
        monitor, export, source, wrong, **kwargs
    )["accepted"]
    assert not close_witnessed_export311(
        monitor, export, source, receiver,
        **{**kwargs, "independently_attest_comms_timeline": lambda **_: False},
    )["accepted"]
    result = close_witnessed_export311(
        monitor, export, source, receiver, **kwargs
    )
    assert result["accepted"] is True
    assert result["state"] == "ONE_TEST_EXPORT_CUSTODY_CLOSED_NOT_CONNECTED"
    assert result["receiverAckVerified"] is True
    assert result["connection"] == "HOLD"
    assert ledger.exact(
        monitor,
        episode=EPISODE,
        correlation=CORR,
        source_digest=result["sourcePayloadSha256"],
        transport_digest=result["transportReceiptSha256"],
        receiver_digest=result["receiverAckSha256"],
        timeline_digest=result["ql420TimelineSha256"],
    )
    assert not close_witnessed_export311(
        monitor, export, source, receiver, **kwargs
    )["accepted"]
    assert not ledger.claim(
        monitor,
        episode=EPISODE,
        correlation=CORR,
        source_digest=result["sourcePayloadSha256"],
        transport_digest=result["transportReceiptSha256"],
        receiver_digest=result["receiverAckSha256"],
        timeline_digest=result["ql420TimelineSha256"],
    )


def test_controller_custody_reconciles_without_connecting(monkeypatch, tmp_path):
    monitor, export, source, receiver, kwargs, ledger = fixture(monkeypatch, tmp_path)
    closed = close_witnessed_export311(monitor, export, source, receiver, **kwargs)
    assert closed["accepted"] is True
    controller_key, controller_pub, controller_pin = signer()
    body = {
        "schema": CONTROLLER_SCHEMA311,
        "controller": "ai-data-platform",
        "controllerRevision": CONTROLLER376_MAIN,
        "commsRevision": COMMS420_MAIN,
        "sourceId": "rosevear-ai-hub",
        "sourceProductionRevision": SOURCE310_MAIN,
        "sourceExportRevision": SOURCE309,
        "hostId": "DESKTOP-AE894KC",
        "episodeId": EPISODE,
        "correlationId": CORR,
        "sourcePayloadSha256": closed["sourcePayloadSha256"],
        "transportReceiptSha256": closed["transportReceiptSha256"],
        "receiverAckSha256": closed["receiverAckSha256"],
        "ql420TimelineSha256": closed["ql420TimelineSha256"],
        "decision": "OWNER_REVIEWED_NO_ACTIVATION",
        "connection": "HOLD",
        "mastersSynced": False,
        "decidedAt": _utc(NOW),
    }
    options = {
        "closure_ledger": ledger,
        "controller_public_der": controller_pub,
        "independent_controller_pin": controller_pin,
        "attest_controller_ledger": lambda **_: True,
        "owner_review_authorize": lambda **_: True,
        "now_ms": NOW,
    }
    assert not reconcile_controller_contract311(
        monitor, closed, signed(controller_key, {**body, "connection": "CONNECTED"}),
        **options,
    )["accepted"]
    assert not reconcile_controller_contract311(
        monitor, closed, signed(controller_key, body),
        **{**options, "owner_review_authorize": lambda **_: False},
    )["accepted"]
    assert not reconcile_controller_contract311(
        monitor, closed, signed(controller_key, body),
        **{**options, "independent_controller_pin": "f" * 64},
    )["accepted"]
    result = reconcile_controller_contract311(
        monitor, closed, signed(controller_key, body), **options
    )
    assert result["accepted"] is True
    assert result["connection"] == "HOLD"
    assert result["mastersSynced"] is False
    assert result["receiver"] == "OFF"
    assert not reconcile_controller_contract311(
        monitor, closed, signed(controller_key, body),
        **{**options, "now_ms": NOW + 301_000},
    )["accepted"]


def test_no_untrusted_escalation_or_notification(monkeypatch):
    monitor = Monitor()
    assert not review_master_discrepancy311(
        monitor,
        issue="COMMS_SIGNED_ACK",
        observed_at_ms=NOW - 900_000,
        now_ms=NOW,
        independent_case_witness=lambda **_: True,
    )["accepted"]
    simulate_ree(monkeypatch)
    assert not review_master_discrepancy311(
        monitor,
        issue="COMMS_SIGNED_ACK",
        observed_at_ms=NOW - 900_000,
        now_ms=NOW,
        independent_case_witness=lambda **_: False,
    )["accepted"]
    result = review_master_discrepancy311(
        monitor,
        issue="COMMS_SIGNED_ACK",
        observed_at_ms=NOW - 900_001,
        now_ms=NOW,
        independent_case_witness=lambda **_: True,
    )
    assert result["accepted"] is True
    assert result["severity"] == "CRITICAL"
    assert result["slaMinutes"] == 15
    assert result["slaState"] == "OVERDUE"
    assert result["notification"] == "NOT_SENT"
    assert result["connection"] == "HOLD"
    assert not review_master_discrepancy311(
        monitor,
        issue="UNKNOWN",
        observed_at_ms=NOW,
        now_ms=NOW,
        independent_case_witness=lambda **_: True,
    )["accepted"]


def test_owner_dashboard_never_claims_authority():
    snapshot = reconcile_master_evidence311(Monitor())
    assert snapshot["sourceBuild"] == 311
    assert snapshot["controllerContract"] == "PROPOSED_PRIVATE_SCHEMA_NOT_DEPLOYED"
    assert snapshot["connection"] == snapshot["masterSync"] == "HOLD"
    assert all(x["notification"] == "NOT_SENT" for x in snapshot["discrepancies"])
    assert TestClient(app).get("/api/v1/system/master-shell-311-acceptance").status_code == 401
