"""Build 319 QL-428 off-host anchor and supervised no-activation regressions."""

import base64
import hashlib

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance316 import CONTROLLER380_MAIN, SOURCE315_MAIN
from rosevear_ai_hub.master_shell_acceptance318 import ProtectedRecoveryJournal318
from rosevear_ai_hub.master_shell_acceptance319 import (
    COMMS428_MAIN,
    SOURCE318_MAIN,
    ProtectedAnchorJournal319,
    decide_ql428_supervised_reentry319,
    prepare_ql428_external_anchor319,
    reconcile_master_evidence319,
    reconcile_ql428_external_custody319,
)

NOW = 1794480000000
EPISODE = "episode319Original"
CEREMONY = "ceremony319Original"
INCIDENT = "incident319Original"
MASTERS = ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")


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
    secret = Ed25519PrivateKey.generate()
    public_der = secret.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return secret, public_der, hashlib.sha256(public_der).hexdigest()


def signed(key, payload):
    return {
        "payload": payload,
        "signature": base64.b64encode(key.sign(_serialize(payload))).decode(),
    }


def setup(monkeypatch, tmp_path):
    original_host(monkeypatch)
    old = ProtectedRecoveryJournal318(tmp_path / "source318.db")
    journal = ProtectedAnchorJournal319(tmp_path / "anchor319.db")
    last = "0" * 64
    for stage, digest in (
        ("WITNESS", "a" * 64),
        ("ISOLATION", "b" * 64),
        ("RECOVERY_CLOSURE", "c" * 64),
    ):
        assert old.claim(Ree(), EPISODE, CEREMONY, stage, digest, last)
        last = digest
    closure = {
        "accepted": True,
        "state": "QL427_THREE_MASTER_RECOVERY_INCIDENT_CLOSED_HOLD",
        "incidentId": INCIDENT,
        "closureDigest": "c" * 64,
        "receiver": "OFF",
        "connection": "HOLD",
    }
    scope = {
        "ceremonyId": CEREMONY,
        "sourceId": "rosevear-ai-hub",
        "episodeId": EPISODE,
        "sourceRevision": SOURCE315_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
    }
    local = {
        "scope": scope,
        "incidentId": INCIDENT,
        "checkpointIndex": 3,
        "checkpointDigest": "d" * 64,
        "closureReceiptDigest": "e" * 64,
        "closurePayloadDigest": "f" * 64,
    }
    anchor_signer, reader_signer = signer(), signer()
    anchor_body = {
        "schema": "rosevear.ql428.external-closure-anchor.v1",
        **local,
        "anchorId": "originalAnchor319",
        "externalStoreId": "externalStore319",
        "anchorSequence": 4,
        "anchoredAt": _utc(NOW - 20000),
    }
    remote_changed = {"changed": False}

    def remote(**args):
        remote_changed["called"] = True
        readback = {
            "schema": "rosevear.ql428.external-anchor-readback.v1",
            "scope": scope,
            "anchorId": args["anchor_id"],
            "anchorDigest": hashlib.sha256(_serialize(anchor_body)).hexdigest(),
            "requestId": args["request_id"],
            "externalStoreId": "externalStore319",
            "remoteDurable": True,
            "remoteSequence": 5,
            "retrievedAt": _utc(NOW - 3000),
        }
        return {
            "anchor": signed(anchor_signer[0], anchor_body),
            "readback": signed(reader_signer[0], readback),
        }

    def read_local(**_):
        return {**local, "checkpointDigest": "9" * 64} if remote_changed["changed"] else local

    proposal = prepare_ql428_external_anchor319(
        Ree(),
        closure,
        scope,
        previous=old,
        read_local_custody=read_local,
        attest_ql427_closure=lambda **_: True,
        now_ms=NOW,
    )
    assert proposal["accepted"]
    kw = {
        "journal": journal,
        "anchor_id": "originalAnchor319",
        "store_id": "externalStore319",
        "anchor_reader": remote,
        "read_local_custody": read_local,
        "anchor_der": anchor_signer[1],
        "anchor_pin": anchor_signer[2],
        "readback_der": reader_signer[1],
        "readback_pin": reader_signer[2],
        "attest_external_store": lambda **_: True,
        "now_ms": NOW,
    }
    return journal, scope, proposal, kw, remote_changed, remote, anchor_signer, reader_signer


def test_external_anchor_and_nonce_are_independently_signed_and_one_use(monkeypatch, tmp_path):
    journal, scope, proposal, kw, flags, remote, anchor, reader = setup(monkeypatch, tmp_path)
    missing = reconcile_ql428_external_custody319(
        Ree(),
        proposal,
        stage="ANCHOR",
        request_id="challengeOne319",
        **{**kw, "attest_external_store": None},
    )
    assert not missing.get("accepted")
    wrong = reconcile_ql428_external_custody319(
        Ree(),
        proposal,
        stage="ANCHOR",
        request_id="challengeOne319",
        **{**kw, "readback_pin": signer()[2]},
    )
    assert not wrong.get("accepted")
    good = reconcile_ql428_external_custody319(
        Ree(), proposal, stage="ANCHOR", request_id="challengeOne319", **kw
    )
    assert good["accepted"] and good["connection"] == "HOLD"
    assert good["receiver"] == "OFF_NOT_FRESHLY_VERIFIED"
    assert journal.exact(Ree(), scope, "ANCHOR", good["proofDigest"])
    duplicate = reconcile_ql428_external_custody319(
        Ree(), good, stage="RECHECK", request_id="challengeOne319", **kw
    )
    assert not duplicate.get("accepted")
    recheck = reconcile_ql428_external_custody319(
        Ree(), good, stage="RECHECK", request_id="challengeTwo319", **kw
    )
    assert recheck["accepted"] and recheck["state"] == "QL428_FRESH_REENTRY_CUSTODY_RECHECKED"
    assert journal.exact(Ree(), scope, "RECHECK", recheck["proofDigest"])


def test_remote_custody_drift_and_fake_signed_readback_fail_closed(monkeypatch, tmp_path):
    _, _, proposal, kw, flags, remote, _, _ = setup(monkeypatch, tmp_path)

    def drift_remote(**args):
        result = remote(**args)
        flags["changed"] = True
        return result

    bad = reconcile_ql428_external_custody319(
        Ree(),
        proposal,
        stage="ANCHOR",
        request_id="challengeDrift319",
        **{**kw, "anchor_reader": drift_remote},
    )
    assert bad["connection"] == "HOLD"
    assert not bad.get("accepted")
    flags["changed"] = False

    def wrong_nonce(**args):
        result = remote(**args)
        result["readback"]["payload"]["requestId"] = "wrongChallenge319"
        return result

    rejected = reconcile_ql428_external_custody319(
        Ree(),
        proposal,
        stage="ANCHOR",
        request_id="challengeDrift319",
        **{**kw, "anchor_reader": wrong_nonce},
    )
    assert not rejected.get("accepted")


def test_owner_supervised_precheck_only_with_fresh_off_and_three_masters(monkeypatch, tmp_path):
    journal, scope, proposal, kw, _, _, _, _ = setup(monkeypatch, tmp_path)
    anchored = reconcile_ql428_external_custody319(
        Ree(), proposal, stage="ANCHOR", request_id="challengeOne319", **kw
    )
    custody = reconcile_ql428_external_custody319(
        Ree(), anchored, stage="RECHECK", request_id="challengeTwo319", **kw
    )
    receiver = signer()
    reentry = "reentryCeremony319"
    off = {
        "schema": "rosevear.ql428.pre-reentry-receiver-isolation.v1",
        "scope": scope,
        "incidentId": INCIDENT,
        "closureReceiptDigest": "e" * 64,
        "anchorDigest": custody["anchorDigest"],
        "reentryId": reentry,
        "receiverState": "OFF",
        "observedAt": _utc(NOW - 2000),
    }
    masters = {master: signer() for master in MASTERS}
    reports = {}
    for master in MASTERS:
        report = {
            "schema": "rosevear.ql428.master-supervised-reentry.v1",
            "masterId": master,
            "scope": scope,
            "incidentId": INCIDENT,
            "closureReceiptDigest": "e" * 64,
            "anchorDigest": custody["anchorDigest"],
            "offDigest": hashlib.sha256(_serialize(off)).hexdigest(),
            "reentryId": reentry,
            "status": "REENTRY_PRECHECK_ONLY_NEW_QL424_CEREMONY_REQUIRED",
            "observedAt": _utc(NOW - 1000),
        }
        reports[master] = signed(masters[master][0], report)
    digest = hashlib.sha256(_serialize([reports[m]["payload"] for m in MASTERS])).hexdigest()
    owner, reviewer = signer(), signer()
    owner_body = {
        "schema": "rosevear.ql428.owner-supervised-reentry.v1",
        "scope": scope,
        "incidentId": INCIDENT,
        "closureReceiptDigest": "e" * 64,
        "anchorDigest": custody["anchorDigest"],
        "offDigest": hashlib.sha256(_serialize(off)).hexdigest(),
        "reentryId": reentry,
        "reportsDigest": digest,
        "action": "PREPARE_NEW_SUPERVISED_CEREMONY_KEEP_RECEIVER_OFF",
        "ownerId": "ownerOriginal319",
        "reviewerId": "reviewerIndependent319",
        "decidedAt": _utc(NOW - 500),
    }
    owner_env = {
        "payload": owner_body,
        "ownerSignature": base64.b64encode(owner[0].sign(_serialize(owner_body))).decode(),
        "reviewerSignature": base64.b64encode(reviewer[0].sign(_serialize(owner_body))).decode(),
    }
    params = {
        "journal": journal,
        "receiver_der": receiver[1],
        "receiver_pin": receiver[2],
        "master_keys": {m: masters[m][1] for m in MASTERS},
        "master_pins": {m: masters[m][2] for m in MASTERS},
        "owner_der": owner[1],
        "owner_pin": owner[2],
        "reviewer_der": reviewer[1],
        "reviewer_pin": reviewer[2],
        "reentry_id": reentry,
        "read_local_custody": kw["read_local_custody"],
        "attest_receiver_isolated": lambda **_: True,
        "attest_independent_owner_authority": lambda **_: True,
        "attest_reopened_ql428_precheck": lambda **_: True,
        "now_ms": NOW,
    }
    forged = decide_ql428_supervised_reentry319(
        Ree(), custody, signed(signer()[0], off), reports, owner_env, **params
    )
    assert not forged.get("accepted")
    on = decide_ql428_supervised_reentry319(
        Ree(),
        custody,
        signed(receiver[0], {**off, "receiverState": "ON"}),
        reports,
        owner_env,
        **params,
    )
    assert on["receiver"] == "UNKNOWN_MANUAL_RECOVERY_REQUIRED"
    missing = decide_ql428_supervised_reentry319(
        Ree(),
        custody,
        signed(receiver[0], off),
        reports,
        owner_env,
        **{**params, "attest_independent_owner_authority": None},
    )
    assert not missing.get("accepted")
    wrong_master = decide_ql428_supervised_reentry319(
        Ree(),
        custody,
        signed(receiver[0], off),
        {**reports, "ai-data-platform": reports["rosevear-comms-hub"]},
        owner_env,
        **params,
    )
    assert not wrong_master.get("accepted")
    good = decide_ql428_supervised_reentry319(
        Ree(), custody, signed(receiver[0], off), reports, owner_env, **params
    )
    assert good["accepted"] and good["receiver"] == "OFF"
    assert good["connection"] == "HOLD" and good["masterSync"] == "HOLD"
    assert good["ownerAcceptance"] == "HOLD"
    assert good["recovery"] == "NEW_ORIGINAL_HOST_QL424_CEREMONY_REQUIRED"
    assert not decide_ql428_supervised_reentry319(
        Ree(), custody, signed(receiver[0], off), reports, owner_env, **params
    ).get("accepted")


def test_source_status_is_private_and_never_operational():
    assert TestClient(app).get("/api/v1/system/master-shell-319-acceptance").status_code in (
        401,
        403,
    )
    state = reconcile_master_evidence319(Ree())
    assert state["sourceBuild"] == 319
    assert state["source318MainAtReconciliation"] == SOURCE318_MAIN
    assert state["commsQl428MainAtReconciliation"] == COMMS428_MAIN
    assert state["connection"] == "HOLD" and state["receiver"] == "OFF"
    assert state["masterSync"] == "HOLD" and state["ownerAcceptance"] == "HOLD"
