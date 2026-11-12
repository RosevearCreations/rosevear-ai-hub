"""Build 314 original-host signed receipt, replay and owner rejection cases."""

import base64
import hashlib

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance313 import ProtectedPilotJournal313
from rosevear_ai_hub.master_shell_acceptance314 import (
    COMMS423_MAIN,
    CONTROLLER379_MAIN,
    FIELD_SCHEMA,
    RESTORE_SCHEMA,
    REVIEW_SCHEMA,
    SOURCE313_MAIN,
    ProtectedFieldJournal314,
    recheck_owner_decision314,
    reconcile_master_evidence314,
    reconcile_original_field314,
    reconcile_ql423_restoration314,
)

NOW = 1794480000000
EPISODE = "realEpisode314"
CORRELATION = "realCorrelation314"


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
    pub = key.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return key, pub, hashlib.sha256(pub).hexdigest()


def signed(key, body):
    return {
        "payload": body,
        "signature": base64.b64encode(key.sign(_serialize(body))).decode(),
    }


def setup(monkeypatch, tmp_path):
    original_host(monkeypatch)
    prior = ProtectedPilotJournal313(tmp_path / "pilot313.sqlite3")
    field = ProtectedFieldJournal314(tmp_path / "field314.sqlite3")
    source = signer()
    pilot = {
        "accepted": True,
        "state": "ORIGINAL_SIGNED_PILOT_IMPORTED_NO_ACTIVATION",
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "pilotReceiptSha256": "a" * 64,
        "connection": "HOLD",
    }
    closure = {
        "accepted": True,
        "state": "QL421_CLOSURE_REVIEW_WITNESSED_NOT_ACCEPTED",
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "commsReviewSha256": "b" * 64,
        "connection": "HOLD",
    }
    owner = {
        "accepted": True,
        "state": "SIGNED_OWNER_REVIEW_CONTINUITY_NO_ACTIVATION",
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "controllerReviewSha256": "c" * 64,
        "ownerAcceptance": "HOLD",
        "connection": "HOLD",
    }
    from rosevear_ai_hub.master_shell_acceptance313 import ZERO

    assert prior.claim(
        Ree(),
        episode=EPISODE,
        correlation=CORRELATION,
        stage="PILOT",
        digest=pilot["pilotReceiptSha256"],
        previous_digest=ZERO,
    )
    assert prior.claim(
        Ree(),
        episode=EPISODE,
        correlation=CORRELATION,
        stage="QL421_CLOSURE",
        digest=closure["commsReviewSha256"],
        previous_digest=pilot["pilotReceiptSha256"],
    )
    assert prior.claim(
        Ree(),
        episode=EPISODE,
        correlation=CORRELATION,
        stage="CONTROLLER",
        digest=owner["controllerReviewSha256"],
        previous_digest=closure["commsReviewSha256"],
    )
    body = {
        "schema": FIELD_SCHEMA,
        "sourceId": "rosevear-ai-hub",
        "hostId": "DESKTOP-AE894KC",
        "sourceRevision": SOURCE313_MAIN,
        "commsRevision": COMMS423_MAIN,
        "controllerRevision": CONTROLLER379_MAIN,
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "pilotReceiptSha256": pilot["pilotReceiptSha256"],
        "commsReviewSha256": closure["commsReviewSha256"],
        "controllerReviewSha256": owner["controllerReviewSha256"],
        "ql423CustodySha256": "d" * 64,
        "ql423ReceiverAckSha256": "e" * 64,
        "issuedAt": _utc(NOW - 1000),
        "connection": "HOLD",
    }
    kw = {
        "old_journal": prior,
        "journal": field,
        "public_der": source[1],
        "independent_pin": source[2],
        "attest_original_process": lambda **_: True,
        "attest_ql423_custody": lambda **_: True,
        "attest_reopened_source": lambda **_: True,
        "now_ms": NOW,
    }
    return source, prior, field, pilot, closure, owner, body, kw


def test_signed_original_host_requires_persistent_prior_chain(monkeypatch, tmp_path):
    key, prior, journal, pilot, closure, owner, body, kw = setup(monkeypatch, tmp_path)
    assert not reconcile_original_field314(
        Ree(), pilot, closure, owner, signed(signer()[0], body), **kw
    )["accepted"]
    assert not reconcile_original_field314(
        Ree(),
        pilot,
        closure,
        owner,
        signed(key[0], body),
        **{**kw, "attest_ql423_custody": None},
    )["accepted"]
    assert not reconcile_original_field314(
        Ree(), pilot, closure, owner, signed(key[0], {**body, "sourceRevision": "stale"}), **kw
    )["accepted"]
    assert not reconcile_original_field314(
        Ree(), pilot, closure, owner, signed(key[0], {**body, "issuedAt": _utc(NOW - 301000)}), **kw
    )["accepted"]
    assert not reconcile_original_field314(
        Ree(), pilot, closure, owner, signed(key[0], {**body, "connection": "CONNECTED"}), **kw
    )["accepted"]
    first = reconcile_original_field314(Ree(), pilot, closure, owner, signed(key[0], body), **kw)
    assert first["accepted"] is True
    assert first["connection"] == "HOLD"
    assert journal.exact(Ree(), EPISODE, CORRELATION, "FIELD", first["fieldDigest"])
    assert not reconcile_original_field314(
        Ree(), pilot, closure, owner, signed(key[0], body), **kw
    )["accepted"]


def test_three_master_replay_and_distinct_signed_owner_review(monkeypatch, tmp_path):
    key, prior, journal, pilot, closure, owner, body, kw = setup(monkeypatch, tmp_path)
    original = reconcile_original_field314(Ree(), pilot, closure, owner, signed(key[0], body), **kw)
    masters = ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")
    keys = {m: signer() for m in masters}
    ql422 = "f" * 64
    receipts = {}
    for index, master in enumerate(masters):
        receipt = {
            "schema": RESTORE_SCHEMA,
            "master": master,
            "sourceRevision": SOURCE313_MAIN,
            "commsRevision": COMMS423_MAIN,
            "controllerRevision": CONTROLLER379_MAIN,
            "episodeId": EPISODE,
            "correlationId": CORRELATION,
            "fieldDigest": original["fieldDigest"],
            "custodyDigest": original["custodyDigest"],
            "receiverDigest": original["receiverDigest"],
            "ql422TerminalSha256": ql422,
            "checkpointId": f"master314{index}",
            "issuedAt": _utc(NOW - 1000),
            "connection": "HOLD",
        }
        receipts[master] = signed(keys[master][0], receipt)
    rkw = {
        "journal": journal,
        "master_public_keys": {m: keys[m][1] for m in masters},
        "master_pins": {m: keys[m][2] for m in masters},
        "ql422_terminal_digest": ql422,
        "attest_ql423_reopened_store": lambda **_: True,
        "attest_real_restart": lambda **_: True,
        "now_ms": NOW,
    }
    assert not reconcile_ql423_restoration314(
        Ree(),
        original,
        receipts,
        **{**rkw, "attest_real_restart": None},
    )["accepted"]
    assert not reconcile_ql423_restoration314(
        Ree(), original, {**receipts, masters[2]: receipts[masters[1]]}, **rkw
    )["accepted"]
    restored = reconcile_ql423_restoration314(Ree(), original, receipts, **rkw)
    assert restored["accepted"] is True
    assert restored["connection"] == "HOLD"
    assert not reconcile_ql423_restoration314(Ree(), original, receipts, **rkw)["accepted"]
    reviewers = {role: signer() for role in ("owner", "reviewer")}
    decisions = {}
    for role in reviewers:
        data = {
            "schema": REVIEW_SCHEMA,
            "role": role,
            "sourceRevision": SOURCE313_MAIN,
            "commsRevision": COMMS423_MAIN,
            "controllerRevision": CONTROLLER379_MAIN,
            "episodeId": EPISODE,
            "correlationId": CORRELATION,
            "fieldDigest": restored["fieldDigest"],
            "restorationDigest": restored["restorationDigest"],
            "ql422TerminalSha256": restored["ql422TerminalSha256"],
            "previousControllerReviewSha256": restored["controllerReviewSha256"],
            "decision": "REQUEST_ACTIVATION_REVIEW",
            "issuedAt": _utc(NOW - 1000),
            "ownerAcceptance": "HOLD",
            "connection": "HOLD",
        }
        decisions[role] = signed(reviewers[role][0], data)
    okw = {
        "journal": journal,
        "public_keys": {k: reviewers[k][1] for k in reviewers},
        "independent_pins": {k: reviewers[k][2] for k in reviewers},
        "attest_independent_owner_review": lambda **_: True,
        "attest_controller_owner_ledger": lambda **_: True,
        "now_ms": NOW,
    }
    assert not recheck_owner_decision314(
        Ree(),
        restored,
        decisions,
        **{**okw, "attest_controller_owner_ledger": None},
    )["accepted"]
    altered = {
        **decisions,
        "reviewer": signed(
            reviewers["reviewer"][0],
            {**decisions["reviewer"]["payload"], "decision": "MAINTAIN_HOLD"},
        ),
    }
    assert not recheck_owner_decision314(Ree(), restored, altered, **okw)["accepted"]
    approved = recheck_owner_decision314(Ree(), restored, decisions, **okw)
    assert approved["accepted"] is True
    assert approved["state"] == "READY_FOR_SEPARATE_SUPERVISED_ACTIVATION_NOT_EXECUTED"
    assert approved["receiver"] == "OFF"
    assert approved["ownerAcceptance"] == "HOLD"
    assert approved["connection"] == "HOLD"
    assert not recheck_owner_decision314(Ree(), restored, decisions, **okw)["accepted"]


def test_owner_view_never_promotes_runtime_without_independent_evidence():
    client = TestClient(app)
    assert client.get("/api/v1/system/master-shell-314-acceptance").status_code in (
        401,
        403,
    )
    state = reconcile_master_evidence314(Ree())
    assert state["sourceBuild"] == 314
    assert state["receiver"] == "OFF"
    assert state["connection"] == "HOLD"
    assert state["ownerAcceptance"] == "HOLD"
    assert state["masterSync"] == "HOLD"
