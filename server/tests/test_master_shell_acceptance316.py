"""Build 316 fail-closed QL-425 signed health and recovery tests."""

import base64
import hashlib

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance315 import ProtectedAuthorityJournal315
from rosevear_ai_hub.master_shell_acceptance316 import (
    COMMS_RUNTIME_MAIN,
    CONTROLLER380_MAIN,
    HEARTBEAT_SCHEMA,
    OFF_SCHEMA,
    OWNER_SCHEMA,
    PILOT_SCHEMA,
    SOURCE315_MAIN,
    ProtectedPilotContinuityJournal316,
    attest_isolated_original_pilot316,
    reconcile_master_evidence316,
    review_fail_closed_recovery316,
    verify_three_master_health316,
)

NOW = 1794480000000
EPISODE = "episode316Source"
CORRELATION = "correlation316Source"
CEREMONY = "ceremony316Isolated"


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


def fixture(monkeypatch, tmp_path):
    original_host(monkeypatch)
    journal315 = ProtectedAuthorityJournal315(tmp_path / "prior315.sqlite3")
    journal316 = ProtectedPilotContinuityJournal316(tmp_path / "health316.sqlite3")
    assert journal315.claim(Ree(), EPISODE, CORRELATION, "ENROLL", "a" * 64, "0" * 64)
    assert journal315.claim(
        Ree(), EPISODE, CORRELATION, "RECEIVER_WITNESS", "b" * 64, "a" * 64
    )
    assert journal315.claim(
        Ree(), EPISODE, CORRELATION, "OWNER_GATE", "c" * 64, "b" * 64
    )
    gate = {
        "accepted": True,
        "state": "THREE_MASTER_SUPERVISED_PILOT_READY_NOT_EXECUTED",
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "readinessDigest": "c" * 64,
        "ownerAcceptance": "HOLD",
        "connection": "HOLD",
    }
    accepted = {
        "state": "VERIFIED_THREE_MASTER_ISOLATED_PILOT_ACCEPTANCE",
        "connection": "VERIFIED_CONNECTED_PILOT",
        "receiver": "ISOLATED_ONE_TEST_ON",
        "ownerAcceptance": "DUAL_SIGNED_FOR_ISOLATED_PILOT",
        "masterCount": 3,
        "sourceId": "rosevear-ai-hub",
        "sourceRevision": SOURCE315_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
        "episodeId": EPISODE,
        "ceremonyId": CEREMONY,
    }
    key = signer()
    payload = {
        "schema": PILOT_SCHEMA,
        "hostId": "DESKTOP-AE894KC",
        "sourceId": "rosevear-ai-hub",
        "sourceRevision": SOURCE315_MAIN,
        "commsRevision": COMMS_RUNTIME_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "ceremonyId": CEREMONY,
        "readinessDigest": "c" * 64,
        "ql424AcceptanceSha256": "d" * 64,
        "issuedAt": _utc(NOW - 1000),
        "pilotMode": "ISOLATED_ONE_TEST",
    }
    kwargs = {
        "prior_journal": journal315,
        "source_der": key[1],
        "source_pin": key[2],
        "attest_original_installed_process": lambda **_: True,
        "attest_independent_ql424_signed_acceptance": lambda **_: True,
        "attest_receiver_isolated_state": lambda **_: True,
        "now_ms": NOW,
    }
    return journal316, gate, accepted, key, payload, kwargs


def test_authenticated_original_host_ql424_chain_and_rejection(monkeypatch, tmp_path):
    journal, gate, accepted, key, payload, kw = fixture(monkeypatch, tmp_path)
    assert not attest_isolated_original_pilot316(
        Ree(), gate, accepted, signed(signer()[0], payload), **kw
    )["accepted"]
    assert not attest_isolated_original_pilot316(
        Ree(), gate, accepted, signed(key[0], payload),
        **{**kw, "attest_receiver_isolated_state": None},
    )["accepted"]
    assert not attest_isolated_original_pilot316(
        Ree(), gate, {**accepted, "receiver": "OFF"},
        signed(key[0], payload), **kw
    )["accepted"]
    assert not attest_isolated_original_pilot316(
        Ree(), gate, accepted,
        signed(key[0], {**payload, "issuedAt": _utc(NOW - 301000)}), **kw
    )["accepted"]
    result = attest_isolated_original_pilot316(
        Ree(), gate, accepted, signed(key[0], payload), **kw
    )
    assert result["accepted"] is True
    assert result["connection"] == "HOLD"


def test_ql425_native_signatures_sequence_and_verified_owner_recovery(monkeypatch, tmp_path):
    journal, gate, accepted, key, payload, kw = fixture(monkeypatch, tmp_path)
    pilot = attest_isolated_original_pilot316(
        Ree(), gate, accepted, signed(key[0], payload), **kw
    )
    masters = {
        master: signer()
        for master in ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")
    }
    heartbeats = {}
    for master in masters:
        body = {
            "schema": HEARTBEAT_SCHEMA,
            "masterId": master,
            "ceremonyId": CEREMONY,
            "sourceId": "rosevear-ai-hub",
            "episodeId": EPISODE,
            "sourceRevision": SOURCE315_MAIN,
            "controllerRevision": CONTROLLER380_MAIN,
            "status": "ISOLATED_PILOT_HEALTHY",
            "observedAt": _utc(NOW - 1000),
            "sequence": 1,
        }
        heartbeats[master] = signed(masters[master][0], body)
    mk = {
        "journal": journal,
        "master_keys": {k: masters[k][1] for k in masters},
        "master_pins": {k: masters[k][2] for k in masters},
        "attest_independent_ql425_health_readback": lambda **_: True,
        "attest_protected_receiver_state": lambda **_: True,
        "now_ms": NOW,
    }
    assert not verify_three_master_health316(
        Ree(), pilot, {**heartbeats, "ai-data-platform": heartbeats["rosevear-comms-hub"]},
        **mk,
    )["accepted"]
    assert not verify_three_master_health316(
        Ree(), pilot,
        {
            **heartbeats,
            "rosevear-ai-hub": signed(
                masters["rosevear-ai-hub"][0],
                {
                    **heartbeats["rosevear-ai-hub"]["payload"],
                    "observedAt": _utc(NOW - 61000),
                },
            ),
        },
        **mk,
    )["accepted"]
    assert not verify_three_master_health316(
        Ree(), pilot, heartbeats,
        **{**mk, "attest_protected_receiver_state": None},
    )["accepted"]
    health = verify_three_master_health316(Ree(), pilot, heartbeats, **mk)
    assert health["accepted"] is True
    assert health["connection"] == "HOLD"
    assert health["runtimeUptime"] == "SINGLE_SIGNED_SNAPSHOT_NOT_CONTINUOUS_UPTIME"
    assert not verify_three_master_health316(
        Ree(), pilot, heartbeats, **mk
    )["accepted"]

    receiver = signer()
    operator = {role: signer() for role in ("owner", "reviewer")}
    off = {
        "schema": OFF_SCHEMA,
        "receiverId": "rosevear-comms-hub",
        "ceremonyId": CEREMONY,
        "episodeId": EPISODE,
        "sourceRevision": SOURCE315_MAIN,
        "commsRevision": COMMS_RUNTIME_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
        "healthDigest": health["healthDigest"],
        "receiverState": "OFF",
        "rollbackState": "QL425_FAIL_CLOSED_DISABLED",
        "issuedAt": _utc(NOW - 500),
    }
    signed_off = signed(receiver[0], off)
    off_digest = hashlib.sha256(_serialize(off)).hexdigest()
    reviews = {}
    for role in operator:
        decision = {
            "schema": OWNER_SCHEMA,
            "role": role,
            "operatorId": f"{role}Operator316",
            "ceremonyId": CEREMONY,
            "episodeId": EPISODE,
            "sourceRevision": SOURCE315_MAIN,
            "commsRevision": COMMS_RUNTIME_MAIN,
            "controllerRevision": CONTROLLER380_MAIN,
            "healthDigest": health["healthDigest"],
            "receiverOffSha256": off_digest,
            "decision": "MAINTAIN_HOLD_MANUAL_RECOVERY",
            "issuedAt": _utc(NOW - 200),
            "connection": "HOLD",
            "ownerAcceptance": "HOLD",
        }
        reviews[role] = signed(operator[role][0], decision)
    rk = {
        "journal": journal,
        "receiver_der": receiver[1],
        "receiver_pin": receiver[2],
        "operator_keys": {r: operator[r][1] for r in operator},
        "operator_pins": {r: operator[r][2] for r in operator},
        "attest_ql425_disable_execution": lambda **_: True,
        "attest_independent_receiver_off_readback": lambda **_: True,
        "attest_owner_incident_authorization": lambda **_: True,
        "now_ms": NOW,
    }
    missing = review_fail_closed_recovery316(
        Ree(), health, signed_off, reviews,
        **{**rk, "attest_independent_receiver_off_readback": None},
    )
    assert not missing["accepted"]
    assert missing["receiver"] == "UNKNOWN_MANUAL_RECOVERY_REQUIRED"
    wrong = review_fail_closed_recovery316(
        Ree(), health, signed(receiver[0], {**off, "receiverState": "ON"}),
        reviews, **rk,
    )
    assert not wrong["accepted"]
    assert wrong["receiver"] == "UNKNOWN_MANUAL_RECOVERY_REQUIRED"
    bad_reviews = {
        **reviews,
        "reviewer": signed(
            operator["reviewer"][0],
            {**reviews["reviewer"]["payload"], "decision": "RESTART"},
        ),
    }
    assert not review_fail_closed_recovery316(
        Ree(), health, signed_off, bad_reviews, **rk
    )["accepted"]
    result = review_fail_closed_recovery316(
        Ree(), health, signed_off, reviews, **rk
    )
    assert result["accepted"] is True
    assert result["receiver"] == "OFF"
    assert result["connection"] == "HOLD"
    assert result["ownerAcceptance"] == "HOLD"
    assert result["recovery"] == "MANUAL_SUPERVISED_NEW_CEREMONY_REQUIRED"
    assert not review_fail_closed_recovery316(
        Ree(), health, signed_off, reviews, **rk
    )["accepted"]


def test_316_owner_status_is_no_store_and_fail_closed():
    assert TestClient(app).get(
        "/api/v1/system/master-shell-316-acceptance"
    ).status_code in (401, 403)
    state = reconcile_master_evidence316(Ree())
    assert state["sourceBuild"] == 316
    assert state["receiver"] == "OFF"
    assert state["connection"] == "HOLD"
    assert state["masterSync"] == "HOLD"
    assert state["ownerAcceptance"] == "HOLD"
