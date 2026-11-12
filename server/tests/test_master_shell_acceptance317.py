"""Build 317 signed QL-426 durable custody and independent owner audit."""

import base64
import hashlib

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance316 import (
    CONTROLLER380_MAIN,
    SOURCE315_MAIN,
    ProtectedPilotContinuityJournal316,
)
from rosevear_ai_hub.master_shell_acceptance317 import (
    ACK_SCHEMA,
    CHECKPOINT_SCHEMA,
    COMMS426_MAIN,
    MASTER_SCHEMA,
    SOURCE316_MAIN,
    ProtectedCheckpointJournal317,
    audit_independent_owner_incident317,
    reconcile_master_evidence317,
    reconcile_ql426_signed_rollback317,
    witness_durable_ql426_checkpoint317,
)

NOW = 1794480000000
EPISODE = "episode317Source"
CEREMONY = "ceremony317Source"
INCIDENT = "incident317Source"


class Ree:
    persist_eligible = True

    def persistent_snapshot304(self):
        return {"collectionState": "OBSERVING_REE_LOCAL", "sampleCount": 3}


def original_host(monkeypatch):
    for module in ("master_shell_acceptance306", "master_shell_acceptance308"):
        monkeypatch.setattr(f"rosevear_ai_hub.{module}.platform.system", lambda: "Windows")
        monkeypatch.setattr(
            f"rosevear_ai_hub.{module}.socket.gethostname", lambda: "DESKTOP-AE894KC"
        )


def signer():
    key = Ed25519PrivateKey.generate()
    der = key.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return key, der, hashlib.sha256(der).hexdigest()


def signed(key, payload):
    return {
        "payload": payload,
        "signature": base64.b64encode(key.sign(_serialize(payload))).decode(),
    }


def setup(monkeypatch, tmp_path):
    original_host(monkeypatch)
    journal316 = ProtectedPilotContinuityJournal316(tmp_path / "health316.sqlite3")
    journal317 = ProtectedCheckpointJournal317(tmp_path / "checkpoints317.sqlite3")
    assert journal316.accept_snapshot(
        Ree(), ceremony=CEREMONY, episode=EPISODE,
        sequences={m: 1 for m in ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")},
        digest="a" * 64,
    )
    health = {
        "accepted": True,
        "state": "THREE_MASTER_SIGNED_QL425_HEALTH_SNAPSHOT_NOT_UPTIME",
        "connection": "HOLD",
        "ceremonyId": CEREMONY,
        "episodeId": EPISODE,
        "healthDigest": "a" * 64,
    }
    original = signer()
    body = {
        "schema": CHECKPOINT_SCHEMA,
        "hostId": "DESKTOP-AE894KC",
        "sourceId": "rosevear-ai-hub",
        "sourceRevision": SOURCE316_MAIN,
        "ql426CommsRevision": COMMS426_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
        "episodeId": EPISODE,
        "ceremonyId": CEREMONY,
        "healthDigest": "a" * 64,
        "ql426CheckpointDigest": "b" * 64,
        "ql426Index": 1,
        "ql426EvidenceDigest": "c" * 64,
        "issuedAt": _utc(NOW - 1000),
        "connection": "HOLD",
    }
    kw = {
        "old_journal": journal316,
        "journal": journal317,
        "original_host_der": original[1],
        "original_host_pin": original[2],
        "attest_ql426_reopened_checkpoint": lambda **_: True,
        "attest_original_installed_host": lambda **_: True,
        "attest_external_head_custody": lambda **_: True,
        "now_ms": NOW,
    }
    return journal317, health, original, body, kw


def test_original_host_checkpoint_requires_real_external_custody(monkeypatch, tmp_path):
    journal, health, original, body, kw = setup(monkeypatch, tmp_path)
    assert not witness_durable_ql426_checkpoint317(
        Ree(), health, signed(signer()[0], body), **kw
    )["accepted"]
    assert not witness_durable_ql426_checkpoint317(
        Ree(), health, signed(original[0], body),
        **{**kw, "attest_external_head_custody": None},
    )["accepted"]
    assert not witness_durable_ql426_checkpoint317(
        Ree(), health, signed(original[0], {**body, "sourceRevision": "stale"}), **kw
    )["accepted"]
    good = witness_durable_ql426_checkpoint317(
        Ree(), health, signed(original[0], body), **kw
    )
    assert good["accepted"] is True
    assert good["connection"] == "HOLD"
    assert journal.exact(Ree(), EPISODE, CEREMONY, "CHECKPOINT", good["checkpointDigest"])
    assert not witness_durable_ql426_checkpoint317(
        Ree(), health, signed(original[0], body), **kw
    )["accepted"]


def test_signed_rollback_and_three_master_owner_closure(monkeypatch, tmp_path):
    journal, health, original, body, kw = setup(monkeypatch, tmp_path)
    checkpoint = witness_durable_ql426_checkpoint317(
        Ree(), health, signed(original[0], body), **kw
    )
    receiver = signer()
    off = {
        "schema": "rosevear.ql426.receiver-rollback-readback.v1",
        "ceremonyId": CEREMONY,
        "sourceId": "rosevear-ai-hub",
        "episodeId": EPISODE,
        "sourceRevision": SOURCE315_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
        "incidentId": INCIDENT,
        "receiverState": "OFF",
        "observedAt": _utc(NOW - 1000),
    }
    rollback = {
        "state": "DURABLE_VERIFIED_ROLLBACK_INCIDENT",
        "incidentId": INCIDENT,
        "rollbackCheckpointDigest": "d" * 64,
        "scope": {
            "ceremonyId": CEREMONY,
            "sourceId": "rosevear-ai-hub",
            "episodeId": EPISODE,
            "sourceRevision": SOURCE315_MAIN,
            "controllerRevision": CONTROLLER380_MAIN,
        },
    }
    rk = {
        "journal": journal,
        "receiver_der": receiver[1],
        "receiver_pin": receiver[2],
        "attest_reopened_ql426_rollback": lambda **_: True,
        "attest_independent_receiver_disabled": lambda **_: True,
        "now_ms": NOW,
    }
    missing = reconcile_ql426_signed_rollback317(
        Ree(), checkpoint, rollback, signed(receiver[0], off),
        **{**rk, "attest_independent_receiver_disabled": None},
    )
    assert not missing["accepted"]
    assert missing["receiver"] == "UNKNOWN_MANUAL_RECOVERY_REQUIRED"
    wrong = reconcile_ql426_signed_rollback317(
        Ree(), checkpoint, rollback, signed(receiver[0], {**off, "receiverState": "ON"}),
        **rk,
    )
    assert not wrong["accepted"]
    accepted = reconcile_ql426_signed_rollback317(
        Ree(), checkpoint, rollback, signed(receiver[0], off), **rk
    )
    assert accepted["accepted"] is True
    assert accepted["receiver"] == "OFF"
    assert not reconcile_ql426_signed_rollback317(
        Ree(), checkpoint, rollback, signed(receiver[0], off), **rk
    )["accepted"]
    roles = {k: signer() for k in ("owner", "reviewer")}
    masters = {
        k: signer()
        for k in ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")
    }
    ack = {
        "schema": ACK_SCHEMA,
        "incidentId": INCIDENT,
        "ceremonyId": CEREMONY,
        "sourceId": "rosevear-ai-hub",
        "episodeId": EPISODE,
        "sourceRevision": SOURCE315_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
        "rollbackCheckpointDigest": accepted["commsRollbackDigest"],
        "action": "ACKNOWLEDGE_VERIFIED_ISOLATED_ROLLBACK",
        "acceptedAt": _utc(NOW - 1000),
        "ownerId": "OwnerOriginal317",
        "reviewerId": "ReviewerIndep317",
    }
    owner_ack = {
        "state": "DURABLE_DUAL_SIGNED_OWNER_INCIDENT_ACK",
        "incidentId": INCIDENT,
        "ackCheckpointDigest": "e" * 64,
        "signedEnvelope": {
            "payload": ack,
            "ownerSignature": base64.b64encode(
                roles["owner"][0].sign(_serialize(ack))
            ).decode(),
            "reviewerSignature": base64.b64encode(
                roles["reviewer"][0].sign(_serialize(ack))
            ).decode(),
        },
    }
    reports = {}
    for master in masters:
        p = {
            "schema": MASTER_SCHEMA,
            "masterId": master,
            "episodeId": EPISODE,
            "ceremonyId": CEREMONY,
            "incidentId": INCIDENT,
            "sourceRevision": SOURCE316_MAIN,
            "commsRevision": COMMS426_MAIN,
            "controllerRevision": CONTROLLER380_MAIN,
            "rollbackDigest": accepted["rollbackDigest"],
            "commsOwnerAckDigest": owner_ack["ackCheckpointDigest"],
            "decision": "RECOVERY_HOLD_VERIFIED",
            "issuedAt": _utc(NOW - 1000),
            "connection": "HOLD",
        }
        reports[master] = signed(masters[master][0], p)
    akw = {
        "journal": journal,
        "owner_der": roles["owner"][1],
        "owner_pin": roles["owner"][2],
        "reviewer_der": roles["reviewer"][1],
        "reviewer_pin": roles["reviewer"][2],
        "master_keys": {k: masters[k][1] for k in masters},
        "master_pins": {k: masters[k][2] for k in masters},
        "attest_ql426_durable_owner_ack": lambda **_: True,
        "attest_three_master_independent_recovery": lambda **_: True,
        "now_ms": NOW,
    }
    forged = {
        **owner_ack,
        "signedEnvelope": {
            **owner_ack["signedEnvelope"],
            "reviewerSignature": base64.b64encode(
                signer()[0].sign(_serialize(ack))
            ).decode(),
        },
    }
    assert not audit_independent_owner_incident317(
        Ree(), accepted, forged, reports, **akw
    )["accepted"]
    assert not audit_independent_owner_incident317(
        Ree(), accepted, owner_ack,
        {**reports, "ai-data-platform": reports["rosevear-comms-hub"]},
        **akw,
    )["accepted"]
    assert not audit_independent_owner_incident317(
        Ree(), accepted, owner_ack, reports,
        **{**akw, "attest_ql426_durable_owner_ack": None},
    )["accepted"]
    result = audit_independent_owner_incident317(
        Ree(), accepted, owner_ack, reports, **akw
    )
    assert result["accepted"] is True
    assert result["receiver"] == "OFF"
    assert result["connection"] == "HOLD"
    assert result["ownerAcceptance"] == "HOLD"
    assert result["recovery"] == "NEW_SUPERVISED_QL424_CEREMONY_REQUIRED"
    assert not audit_independent_owner_incident317(
        Ree(), accepted, owner_ack, reports, **akw
    )["accepted"]


def test_private_owner_status_never_claims_live_pilot_from_code():
    assert TestClient(app).get(
        "/api/v1/system/master-shell-317-acceptance"
    ).status_code in (401, 403)
    state = reconcile_master_evidence317(Ree())
    assert state["sourceBuild"] == 317
    assert state["receiver"] == "OFF"
    assert state["connection"] == "HOLD"
    assert state["ownerAcceptance"] == "HOLD"
    assert state["masterSync"] == "HOLD"
