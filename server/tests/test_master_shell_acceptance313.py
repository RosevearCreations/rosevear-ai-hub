"""Build 313 private-only Ed25519, durable replay and owner continuity gates."""

import base64
import hashlib

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance313 import (
    CLOSURE_SCHEMA,
    COMMS422_MAIN,
    CONTROLLER378_MAIN,
    OWNER_SCHEMA,
    PILOT_SCHEMA,
    SOURCE312_MAIN,
    ProtectedPilotJournal313,
    import_signed_original_pilot313,
    read_ql421_closure313,
    reconcile_master_evidence313,
    review_controller_owner_continuity313,
)

NOW = 1794480000000
EPISODE = "episode313Signed"
CORRELATION = "correlation313Signed"


class Ree:
    persist_eligible = True

    def persistent_snapshot304(self):
        return {"collectionState": "OBSERVING_REE_LOCAL", "sampleCount": 3}


def original_host(monkeypatch):
    for module in ("master_shell_acceptance306", "master_shell_acceptance308"):
        monkeypatch.setattr(f"rosevear_ai_hub.{module}.platform.system", lambda: "Windows")
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


def fixture(monkeypatch, tmp_path):
    original_host(monkeypatch)
    keys = [signer() for _ in range(3)]
    journal = ProtectedPilotJournal313(tmp_path / "private-pilot313.sqlite3")
    pilot = {
        "accepted": True,
        "state": "ORIGINAL_HOST_PILOT_EVIDENCE_ADOPTED_NO_ACTIVATION",
        "sourceRevision": "41b3d69962dd22480badf26fc6a65dfb59f88ac9",
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "agreementSha256": "a" * 64,
        "receiverAckSha256": "b" * 64,
        "connection": "HOLD",
    }
    handoff = {
        "accepted": True,
        "state": "THREE_MASTER_HANDOFF_CUSTODY_WITNESSED_OWNER_DECISION_PENDING",
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "receiptSetSha256": "c" * 64,
        "closureSha256": "d" * 64,
        "ownerAcceptance": "HOLD",
        "connection": "HOLD",
    }
    source = {
        "schema": PILOT_SCHEMA,
        "sourceId": "rosevear-ai-hub",
        "hostId": "DESKTOP-AE894KC",
        "sourceRevision": SOURCE312_MAIN,
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "pilotCustodySha256": pilot["agreementSha256"],
        "threeMasterReceiptSetSha256": handoff["receiptSetSha256"],
        "receiverAckSha256": pilot["receiverAckSha256"],
        "ql421ClosureSha256": handoff["closureSha256"],
        "issuedAt": _utc(NOW - 1000),
        "connection": "HOLD",
    }
    return keys, journal, pilot, handoff, source


def test_private_pilot_signed_custody_replay_and_failure_modes(monkeypatch, tmp_path):
    keys, journal, pilot, handoff, source = fixture(monkeypatch, tmp_path)
    key, public, pin = keys[0]
    kwargs = {
        "journal": journal,
        "source_public_der": public,
        "independent_source_pin": pin,
        "attest_original_installed_release": lambda **_: True,
        "attest_durable_source_replay": lambda **_: True,
        "authorize_owner_import": lambda **_: True,
        "now_ms": NOW,
    }
    assert not import_signed_original_pilot313(
        Ree(), pilot, handoff, signed(signer()[0], source), **kwargs
    )["accepted"]
    assert not import_signed_original_pilot313(
        Ree(),
        pilot,
        handoff,
        signed(key, source),
        **{**kwargs, "attest_durable_source_replay": None},
    )["accepted"]
    assert not import_signed_original_pilot313(
        Ree(),
        pilot,
        handoff,
        signed(key, {**source, "connection": "CONNECTED"}),
        **kwargs,
    )["accepted"]
    assert not import_signed_original_pilot313(
        Ree(),
        pilot,
        handoff,
        signed(key, {**source, "issuedAt": _utc(NOW - 301000)}),
        **kwargs,
    )["accepted"]
    assert not import_signed_original_pilot313(
        Ree(),
        pilot,
        handoff,
        signed(key, {**source, "sourceRevision": "wrong"}),
        **kwargs,
    )["accepted"]
    result = import_signed_original_pilot313(
        Ree(),
        pilot,
        handoff,
        signed(key, source),
        **kwargs,
    )
    assert result["accepted"] is True
    assert result["connection"] == "HOLD"
    assert result["state"] == "ORIGINAL_SIGNED_PILOT_IMPORTED_NO_ACTIVATION"
    assert not import_signed_original_pilot313(
        Ree(),
        pilot,
        handoff,
        signed(key, source),
        **kwargs,
    )["accepted"]


def test_exact_comms_and_controller_owner_continuity(monkeypatch, tmp_path):
    keys, journal, pilot, handoff, source = fixture(monkeypatch, tmp_path)
    src_key, src_pub, src_pin = keys[0]
    comms_key, comms_pub, comms_pin = keys[1]
    ctl_key, ctl_pub, ctl_pin = keys[2]
    source_out = import_signed_original_pilot313(
        Ree(),
        pilot,
        handoff,
        signed(src_key, source),
        journal=journal,
        source_public_der=src_pub,
        independent_source_pin=src_pin,
        attest_original_installed_release=lambda **_: True,
        attest_durable_source_replay=lambda **_: True,
        authorize_owner_import=lambda **_: True,
        now_ms=NOW,
    )
    assert source_out["accepted"] is True
    comms = {
        "schema": CLOSURE_SCHEMA,
        "commsId": "rosevear-comms-hub",
        "commsRevision": COMMS422_MAIN,
        "sourceId": "rosevear-ai-hub",
        "sourceRevision": SOURCE312_MAIN,
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "pilotReceiptSha256": source_out["pilotReceiptSha256"],
        "ql421ClosureSha256": source_out["ql421ClosureSha256"],
        "ql421OwnerAuditSha256": "e" * 64,
        "ql422OperatorDecisionSha256": "f" * 64,
        "decision": "OWNER_REVIEW_ELIGIBLE_NOT_ACCEPTED",
        "connection": "HOLD",
        "ownerAcceptance": "HOLD",
        "issuedAt": _utc(NOW - 1000),
    }
    ckwargs = {
        "journal": journal,
        "comms_public_der": comms_pub,
        "independent_comms_pin": comms_pin,
        "attest_ql422_closure_ledger": lambda **_: True,
        "attest_independent_owner_audit": lambda **_: True,
        "now_ms": NOW,
    }
    assert not read_ql421_closure313(
        Ree(),
        source_out,
        signed(comms_key, comms),
        **{**ckwargs, "attest_ql422_closure_ledger": None},
    )["accepted"]
    assert not read_ql421_closure313(
        Ree(),
        source_out,
        signed(comms_key, {**comms, "commsRevision": "old"}),
        **ckwargs,
    )["accepted"]
    comms_out = read_ql421_closure313(
        Ree(),
        source_out,
        signed(comms_key, comms),
        **ckwargs,
    )
    assert comms_out["accepted"] is True
    assert comms_out["state"] == "QL421_CLOSURE_REVIEW_WITNESSED_NOT_ACCEPTED"
    controller = {
        "schema": OWNER_SCHEMA,
        "controller": "ai-data-platform",
        "controllerRevision": CONTROLLER378_MAIN,
        "sourceId": "rosevear-ai-hub",
        "sourceRevision": SOURCE312_MAIN,
        "commsRevision": COMMS422_MAIN,
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "pilotReceiptSha256": source_out["pilotReceiptSha256"],
        "commsReviewSha256": comms_out["commsReviewSha256"],
        "previousControllerReviewSha256": "1" * 64,
        "ql421OwnerAuditSha256": comms_out["ql421OwnerAuditSha256"],
        "decision": "OWNER_REVIEW_PENDING",
        "ownerAcceptance": "HOLD",
        "connection": "HOLD",
        "mastersSynced": False,
        "issuedAt": _utc(NOW - 1000),
    }
    kwargs = {
        "journal": journal,
        "controller_public_der": ctl_pub,
        "independent_controller_pin": ctl_pin,
        "attest_controller_ledger": lambda **_: True,
        "attest_owner_reviewer_separation": lambda **_: True,
        "now_ms": NOW,
    }
    assert not review_controller_owner_continuity313(
        Ree(),
        source_out,
        comms_out,
        signed(ctl_key, controller),
        **{**kwargs, "attest_owner_reviewer_separation": None},
    )["accepted"]
    assert not review_controller_owner_continuity313(
        Ree(),
        source_out,
        comms_out,
        signed(ctl_key, {**controller, "ownerAcceptance": "ACCEPTED"}),
        **kwargs,
    )["accepted"]
    accepted = review_controller_owner_continuity313(
        Ree(),
        source_out,
        comms_out,
        signed(ctl_key, controller),
        **kwargs,
    )
    assert accepted["accepted"] is True
    assert accepted["connection"] == "HOLD"
    assert accepted["ownerAcceptance"] == "HOLD"
    assert not review_controller_owner_continuity313(
        Ree(),
        source_out,
        comms_out,
        signed(ctl_key, controller),
        **kwargs,
    )["accepted"]


def test_no_public_receipt_ingestion_and_hold_owner_projection():
    response = TestClient(app).get("/api/v1/system/master-shell-313-acceptance")
    assert response.status_code in (401, 403)
    view = reconcile_master_evidence313(Ree())
    assert view["sourceBuild"] == 313
    assert view["receiver"] == "OFF"
    assert view["connection"] == "HOLD"
    assert view["ownerAcceptance"] == "HOLD"
    assert view["masterSync"] == "HOLD"
