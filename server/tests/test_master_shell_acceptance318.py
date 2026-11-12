"""Build 318 QL-427 signed witness, receiver OFF and closure regression."""

import base64
import hashlib

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance316 import CONTROLLER380_MAIN, SOURCE315_MAIN
from rosevear_ai_hub.master_shell_acceptance317 import (
    ProtectedCheckpointJournal317,
)
from rosevear_ai_hub.master_shell_acceptance318 import (
    COMMS427_MAIN,
    SOURCE317_MAIN,
    ProtectedRecoveryJournal318,
    close_ql427_three_master_recovery318,
    reconcile_master_evidence318,
    revalidate_ql427_isolation318,
    verify_ql427_external_witness318,
)

NOW = 1794480000000
EPISODE = "episode318Recovery"
CEREMONY = "ceremony318Recovery"
INCIDENT = "incident318Recovery"
MASTERS = ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")


class Ree:
    persist_eligible = True

    def persistent_snapshot304(self):
        return {"collectionState": "OBSERVING_REE_LOCAL", "sampleCount": 3}


def source_host(monkeypatch):
    for module in ("master_shell_acceptance306", "master_shell_acceptance308"):
        monkeypatch.setattr(f"rosevear_ai_hub.{module}.platform.system", lambda: "Windows")
        monkeypatch.setattr(
            f"rosevear_ai_hub.{module}.socket.gethostname", lambda: "DESKTOP-AE894KC"
        )


def signer():
    key = Ed25519PrivateKey.generate()
    der = key.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return key, der, hashlib.sha256(der).hexdigest()


def signed(key, payload):
    return {
        "payload": payload,
        "signature": base64.b64encode(key.sign(_serialize(payload))).decode(),
    }


def setup(monkeypatch, tmp_path):
    source_host(monkeypatch)
    old = ProtectedCheckpointJournal317(tmp_path / "prior317.db")
    journal = ProtectedRecoveryJournal318(tmp_path / "recovery318.db")
    prev = "0" * 64
    for stage, digest in (("CHECKPOINT", "a" * 64),
                          ("ROLLBACK", "b" * 64),
                          ("OWNER_AUDIT", "c" * 64)):
        assert old.claim(Ree(), EPISODE, CEREMONY, stage, digest, prev)
        prev = digest
    audit = {
        "accepted": True,
        "state": "DURABLE_INDEPENDENT_OWNER_INCIDENT_AUDIT_CLOSED_RECOVERY_HOLD",
        "episodeId": EPISODE, "ceremonyId": CEREMONY, "incidentId": INCIDENT,
        "auditDigest": "c" * 64, "receiver": "OFF", "connection": "HOLD",
    }
    scope = {
        "ceremonyId": CEREMONY, "sourceId": "rosevear-ai-hub",
        "episodeId": EPISODE, "sourceRevision": SOURCE315_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
    }
    export = {
        "schema": "rosevear.ql427.checkpoint-witness-export.v1",
        "scope": scope, "checkpointIndex": 3, "checkpointDigest": "d" * 64,
        "incidentId": INCIDENT, "ownerAckEvidenceDigest": "e" * 64,
        "rollbackCheckpointDigest": "f" * 64, "preparedAt": _utc(NOW - 5000),
    }
    witness = signer()
    payload = {
        "schema": "rosevear.ql427.independent-checkpoint-witness.v1",
        "scope": scope, "checkpointIndex": 3, "checkpointDigest": "d" * 64,
        "incidentId": INCIDENT, "exportDigest": hashlib.sha256(_serialize(export)).hexdigest(),
        "witnessId": "independentReviewer318", "witnessedAt": _utc(NOW - 4000),
    }
    kw = {
        "prior": old, "journal": journal, "witness_der": witness[1],
        "witness_pin": witness[2], "attest_reopened_owner_ack": lambda **_: True,
        "attest_external_witness_custody": lambda **_: True, "now_ms": NOW,
    }
    return journal, audit, export, witness, payload, kw


def test_witness_cannot_be_claimed_without_original_and_external_custody(monkeypatch, tmp_path):
    journal, audit, export, witness, payload, kw = setup(monkeypatch, tmp_path)
    bad = verify_ql427_external_witness318(
        Ree(), audit, export, signed(signer()[0], payload), **kw
    )
    assert bad["connection"] == "HOLD"
    assert not bad.get("accepted")
    assert not verify_ql427_external_witness318(
        Ree(), audit, export, signed(witness[0], payload),
        **{**kw, "attest_external_witness_custody": None},
    ).get("accepted")
    assert not verify_ql427_external_witness318(
        Ree(), audit, {**export, "checkpointDigest": "9" * 64},
        signed(witness[0], payload), **kw
    ).get("accepted")
    good = verify_ql427_external_witness318(
        Ree(), audit, export, signed(witness[0], payload), **kw
    )
    assert good["accepted"] is True
    assert good["connection"] == "HOLD"
    assert good["receiver"] == "OFF_NOT_FRESHLY_VERIFIED"
    assert journal.exact(Ree(), EPISODE, CEREMONY, "WITNESS", good["witnessDigest"])
    assert not verify_ql427_external_witness318(
        Ree(), audit, export, signed(witness[0], payload), **kw
    ).get("accepted")


def test_stale_on_or_forged_receiver_isolation_fails_closed(monkeypatch, tmp_path):
    journal, audit, export, witness, payload, kw = setup(monkeypatch, tmp_path)
    witnessed = verify_ql427_external_witness318(
        Ree(), audit, export, signed(witness[0], payload), **kw
    )
    receiver = signer()
    off = {
        "schema": "rosevear.ql427.post-rollback-isolation.v1",
        "scope": export["scope"], "incidentId": INCIDENT, "checkpointDigest": "d" * 64,
        "witnessDigest": witnessed["witnessDigest"], "checkId": "isolationCheck318",
        "receiverState": "OFF", "observedAt": _utc(NOW - 3000),
    }
    rk = {
        "journal": journal, "receiver_der": receiver[1], "receiver_pin": receiver[2],
        "attest_independent_receiver_off": lambda **_: True,
        "attest_ql427_post_rollback_readback": lambda **_: True, "now_ms": NOW,
    }
    for attempt in (
        signed(signer()[0], off),
        signed(receiver[0], {**off, "receiverState": "ON"}),
        signed(receiver[0], {**off, "observedAt": _utc(NOW - 125000)}),
        signed(receiver[0], {**off, "witnessDigest": "f" * 64}),
    ):
        invalid = revalidate_ql427_isolation318(Ree(), witnessed, attempt, **rk)
        assert invalid["receiver"] == "UNKNOWN_MANUAL_RECOVERY_REQUIRED"
    assert not revalidate_ql427_isolation318(
        Ree(), witnessed, signed(receiver[0], off),
        **{**rk, "attest_ql427_post_rollback_readback": None},
    ).get("accepted")
    isolated = revalidate_ql427_isolation318(Ree(), witnessed, signed(receiver[0], off), **rk)
    assert isolated["accepted"] is True
    assert isolated["receiver"] == "OFF"
    assert not revalidate_ql427_isolation318(
        Ree(), witnessed, signed(receiver[0], off), **rk
    ).get("accepted")


def test_three_master_closure_never_reenables_receiver(monkeypatch, tmp_path):
    journal, audit, export, witness, payload, kw = setup(monkeypatch, tmp_path)
    witnessed = verify_ql427_external_witness318(
        Ree(), audit, export, signed(witness[0], payload), **kw
    )
    receiver = signer()
    off = {
        "schema": "rosevear.ql427.post-rollback-isolation.v1",
        "scope": export["scope"], "incidentId": INCIDENT, "checkpointDigest": "d" * 64,
        "witnessDigest": witnessed["witnessDigest"], "checkId": "isolationCheck318",
        "receiverState": "OFF", "observedAt": _utc(NOW - 3000),
    }
    isolated = revalidate_ql427_isolation318(
        Ree(), witnessed, signed(receiver[0], off),
        journal=journal, receiver_der=receiver[1], receiver_pin=receiver[2],
        attest_independent_receiver_off=lambda **_: True,
        attest_ql427_post_rollback_readback=lambda **_: True, now_ms=NOW,
    )
    masters = {m: signer() for m in MASTERS}
    reports = {}
    for m in MASTERS:
        p = {
            "schema": "rosevear.ql427.master-recovery-closure.v1",
            "masterId": m, "scope": export["scope"], "incidentId": INCIDENT,
            "checkpointDigest": "d" * 64, "witnessDigest": witnessed["witnessDigest"],
            "isolationDigest": isolated["isolationDigest"],
            "status": "CONFIRMED_ISOLATED_RECOVERY_CLOSED",
            "observedAt": _utc(NOW - 2000),
        }
        reports[m] = signed(masters[m][0], p)
    owner, reviewer = signer(), signer()
    report_digest = hashlib.sha256(_serialize([reports[m]["payload"] for m in MASTERS])).hexdigest()
    accepted = {
        "schema": "rosevear.ql427.owner-recovery-closure.v1",
        "scope": export["scope"], "incidentId": INCIDENT, "checkpointDigest": "d" * 64,
        "witnessDigest": witnessed["witnessDigest"],
        "isolationDigest": isolated["isolationDigest"], "reportsDigest": report_digest,
        "action": "ACCEPT_RECOVERY_CLOSURE_KEEP_RECEIVER_OFF",
        "closedAt": _utc(NOW - 1000), "ownerId": "ownerOriginal318",
        "reviewerId": "reviewerIndependent318",
    }
    reviews = {
        "payload": accepted,
        "ownerSignature": base64.b64encode(owner[0].sign(_serialize(accepted))).decode(),
        "reviewerSignature": base64.b64encode(reviewer[0].sign(_serialize(accepted))).decode(),
    }
    comms = {
        "state": "DURABLE_THREE_MASTER_RECOVERY_CLOSURE_RECORDED",
        "incidentId": INCIDENT, "checkpointDigest": "d" * 64, "masterCount": 3,
        "receiver": "OFF_VERIFIED_SIGNED_READBACK", "connection": "HOLD",
        "recoveryClosureDigest": "9" * 64,
    }
    ck = {
        "journal": journal, "master_keys": {m: masters[m][1] for m in MASTERS},
        "master_pins": {m: masters[m][2] for m in MASTERS},
        "owner_der": owner[1], "owner_pin": owner[2],
        "reviewer_der": reviewer[1], "reviewer_pin": reviewer[2],
        "attest_reopened_comms_closure": lambda **_: True,
        "attest_independent_closure_anchor": lambda **_: True, "now_ms": NOW,
    }
    assert not close_ql427_three_master_recovery318(
        Ree(), isolated, reports, reviews, comms,
        **{**ck, "attest_independent_closure_anchor": None},
    ).get("accepted")
    assert not close_ql427_three_master_recovery318(
        Ree(), isolated, {**reports, "ai-data-platform": reports["rosevear-comms-hub"]},
        reviews, comms, **ck
    ).get("accepted")
    result = close_ql427_three_master_recovery318(
        Ree(), isolated, reports, reviews, comms, **ck
    )
    assert result["accepted"] is True
    assert result["receiver"] == "OFF"
    assert result["connection"] == "HOLD"
    assert result["ownerAcceptance"] == "HOLD"
    assert result["masterSync"] == "HOLD"
    assert result["recovery"] == "NEW_SUPERVISED_QL424_CEREMONY_REQUIRED"
    assert not close_ql427_three_master_recovery318(
        Ree(), isolated, reports, reviews, comms, **ck
    ).get("accepted")


def test_owner_readback_is_protected_source_status_not_live_activation():
    assert TestClient(app).get("/api/v1/system/master-shell-318-acceptance").status_code in (
        401, 403,
    )
    status = reconcile_master_evidence318(Ree())
    assert status["sourceBuild"] == 318
    assert status["source317MainAtReconciliation"] == SOURCE317_MAIN
    assert status["commsQl427MainAtReconciliation"] == COMMS427_MAIN
    assert status["receiver"] == "OFF"
    assert status["connection"] == "HOLD"
    assert status["masterSync"] == "HOLD"
