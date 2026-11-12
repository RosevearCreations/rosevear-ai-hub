"""Build 312: fail-closed source-pilot, controller and three-Master tests."""

import base64
import hashlib

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance311 import CONTROLLER_SCHEMA311
from rosevear_ai_hub.master_shell_acceptance312 import (
    COMMS421_MAIN,
    CONTROLLER376_MAIN,
    HANDOFF_SCHEMA,
    NEGOTIATION_SCHEMA,
    SOURCE311_MAIN,
    ProtectedHandoffLedger312,
    certify_three_master_handoff312,
    negotiate_controller_schema312,
    reconcile_master_evidence312,
)

NOW = 1794480000000


class Ree:
    persist_eligible = True

    def persistent_snapshot304(self):
        return {"collectionState": "OBSERVING_REE_LOCAL", "sampleCount": 1}


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


def signed(key, body):
    return {
        "payload": body,
        "signature": base64.b64encode(key.sign(_serialize(body))).decode(),
    }


def agreement():
    return {
        "schema": NEGOTIATION_SCHEMA,
        "controller": "ai-data-platform",
        "controllerRevision": CONTROLLER376_MAIN,
        "sourceId": "rosevear-ai-hub",
        "sourceRevision": SOURCE311_MAIN,
        "commsRevision": COMMS421_MAIN,
        "controllerOwnerReviewSchema": CONTROLLER_SCHEMA311,
        "compatibility": "DEPLOYED_READ_ONLY_EXACT",
        "connection": "HOLD",
        "negotiatedAt": _utc(NOW - 1000),
    }


def test_controller_negotiation_requires_independent_proof(monkeypatch):
    original_host(monkeypatch)
    key, pub, pin = signer()
    body = agreement()
    kwargs = {
        "controller_public_der": pub,
        "independent_controller_pin": pin,
        "attest_deployed_schema": lambda **_: True,
        "owner_authorize": lambda **_: True,
        "now_ms": NOW,
    }
    assert not negotiate_controller_schema312(
        Ree(), signed(key, body), **{**kwargs, "attest_deployed_schema": None}
    )["accepted"]
    assert not negotiate_controller_schema312(Ree(), signed(signer()[0], body), **kwargs)[
        "accepted"
    ]
    assert not negotiate_controller_schema312(
        Ree(), signed(key, {**body, "sourceRevision": "stale"}), **kwargs
    )["accepted"]
    assert not negotiate_controller_schema312(
        Ree(), signed(key, {**body, "connection": "CONNECTED"}), **kwargs
    )["accepted"]
    assert not negotiate_controller_schema312(
        Ree(),
        signed(key, {**body, "negotiatedAt": _utc(NOW - 301000)}),
        **kwargs,
    )["accepted"]
    result = negotiate_controller_schema312(Ree(), signed(key, body), **kwargs)
    assert result["accepted"] is True
    assert result["connection"] == "HOLD"
    assert result["receiver"] == "OFF"


def test_three_master_exact_signatures_replay_and_owner_gate(monkeypatch, tmp_path):
    original_host(monkeypatch)
    from rosevear_ai_hub.master_shell_acceptance312 import MASTERS

    keys = {name: signer() for name in MASTERS}
    closure = "a" * 64
    receiver = "b" * 64
    pilot = {
        "accepted": True,
        "state": "ORIGINAL_HOST_PILOT_EVIDENCE_ADOPTED_NO_ACTIVATION",
        "connection": "HOLD",
        "sourceRevision": SOURCE311_MAIN,
        "episodeId": "episode312",
        "correlationId": "correlation312",
        "receiverAckSha256": receiver,
    }
    receipts = {}
    for idx, master in enumerate(MASTERS):
        body = {
            "schema": HANDOFF_SCHEMA,
            "master": master,
            "receiptId": f"receipt312{idx}",
            "sourceId": "rosevear-ai-hub",
            "hostId": "DESKTOP-AE894KC",
            "sourceRevision": SOURCE311_MAIN,
            "controllerRevision": CONTROLLER376_MAIN,
            "commsRevision": COMMS421_MAIN,
            "episodeId": "episode312",
            "correlationId": "correlation312",
            "closureSha256": closure,
            "receiverAckSha256": receiver,
            "issuedAt": _utc(NOW - 1000),
            "connection": "HOLD",
            "ownerAcceptance": "HOLD",
        }
        receipts[master] = signed(keys[master][0], body)
    kwargs = {
        "closure_digest": closure,
        "public_keys": {name: value[1] for name, value in keys.items()},
        "independent_pins": {name: value[2] for name, value in keys.items()},
        "ledger": ProtectedHandoffLedger312(tmp_path / "handoff312.sqlite3"),
        "attest_ql421_closure": lambda **_: True,
        "attest_durable_replay": lambda **_: True,
        "independent_owner_reviewer": lambda **_: True,
        "now_ms": NOW,
    }
    assert not certify_three_master_handoff312(
        Ree(), pilot, receipts, **{**kwargs, "attest_ql421_closure": None}
    )["accepted"]
    assert not certify_three_master_handoff312(
        Ree(), pilot, {**receipts, MASTERS[1]: receipts[MASTERS[0]]}, **kwargs
    )["accepted"]
    assert not certify_three_master_handoff312(
        Ree(), pilot, {k: v for k, v in receipts.items() if k != MASTERS[2]}, **kwargs
    )["accepted"]
    assert not certify_three_master_handoff312(
        Ree(), {**pilot, "connection": "CONNECTED"}, receipts, **kwargs
    )["accepted"]
    approved = certify_three_master_handoff312(Ree(), pilot, receipts, **kwargs)
    assert approved["accepted"] is True
    assert approved["connection"] == "HOLD"
    assert approved["ownerAcceptance"] == "HOLD"
    assert not certify_three_master_handoff312(Ree(), pilot, receipts, **kwargs)["accepted"]


def test_owner_status_is_no_store_and_does_not_open_connection():
    client = TestClient(app)
    response = client.get("/api/v1/system/master-shell-312-acceptance")
    assert response.status_code in (401, 403)
    status = reconcile_master_evidence312(Ree())
    assert status["sourceBuild"] == 312
    assert status["receiver"] == "OFF"
    assert status["connection"] == "HOLD"
    assert status["masterSync"] == "HOLD"
    assert len(status["handoffMasters"]) == 3
