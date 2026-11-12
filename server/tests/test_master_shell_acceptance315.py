"""Build 315 tests use generated keys and private temp ledgers only."""

import base64
import hashlib

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance314 import ProtectedFieldJournal314
from rosevear_ai_hub.master_shell_acceptance315 import (
    COMMS424_MAIN,
    CONTROLLER380_MAIN,
    ENROLL_SCHEMA,
    MASTER_SCHEMA,
    OWNER_SCHEMA,
    RECEIVER_SCHEMA,
    SOURCE314_MAIN,
    SOURCE_SCHEMA,
    ProtectedAuthorityJournal315,
    enroll_original_host_authority315,
    reconcile_master_evidence315,
    review_three_master_operational_gate315,
    verify_isolated_receiver_readiness315,
)

NOW = 1794480000000
EPISODE = "episode315Witness"
CORRELATION = "correlation315Witness"


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


def fixture(monkeypatch, tmp_path):
    original_host(monkeypatch)
    prior = ProtectedFieldJournal314(tmp_path / "private314.sqlite3")
    journal = ProtectedAuthorityJournal315(tmp_path / "private315.sqlite3")
    source, receiver = signer(), signer()
    operators = {role: signer() for role in ("owner", "reviewer")}
    old = {
        "accepted": True,
        "state": "THREE_MASTER_QL423_RESTORATION_WITNESSED_REVIEW_ONLY",
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "fieldDigest": "a" * 64,
        "restorationDigest": "b" * 64,
        "connection": "HOLD",
    }
    prior_owner = {
        "accepted": True,
        "state": "READY_FOR_SEPARATE_SUPERVISED_ACTIVATION_NOT_EXECUTED",
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "ownerDecisionSha256": "c" * 64,
        "ownerAcceptance": "HOLD",
        "connection": "HOLD",
    }
    assert prior.claim(Ree(), EPISODE, CORRELATION, "FIELD", "a" * 64, "0" * 64)
    assert prior.claim(Ree(), EPISODE, CORRELATION, "RESTORE", "b" * 64, "a" * 64)
    assert prior.claim(Ree(), EPISODE, CORRELATION, "REVIEW", "c" * 64, "b" * 64)
    certs = {}
    for role in operators:
        body = {
            "schema": ENROLL_SCHEMA,
            "role": role,
            "operatorId": f"{role}Original315",
            "hostId": "DESKTOP-AE894KC",
            "sourceId": "rosevear-ai-hub",
            "sourceRevision": SOURCE314_MAIN,
            "commsRevision": COMMS424_MAIN,
            "controllerRevision": CONTROLLER380_MAIN,
            "episodeId": EPISODE,
            "correlationId": CORRELATION,
            "sourcePublicSha256": source[2],
            "receiverPublicSha256": receiver[2],
            "priorOwnerDecisionSha256": "c" * 64,
            "fieldDigest": "a" * 64,
            "restorationDigest": "b" * 64,
            "enrollmentId": "enrollment315Original",
            "intent": "REQUEST_ISOLATED_PILOT_READINESS",
            "issuedAt": _utc(NOW - 1000),
            "connection": "HOLD",
        }
        certs[role] = signed(operators[role][0], body)
    kw = {
        "old_journal": prior,
        "journal": journal,
        "source_der": source[1],
        "receiver_der": receiver[1],
        "owner_keys": {k: operators[k][1] for k in operators},
        "owner_pins": {k: operators[k][2] for k in operators},
        "attest_source_host_key_custody": lambda **_: True,
        "attest_receiver_public_pin_custody": lambda **_: True,
        "attest_distinct_owner_authorization": lambda **_: True,
        "now_ms": NOW,
    }
    return prior_owner, old, journal, source, receiver, operators, certs, kw


def test_original_host_dual_signed_enrollment_and_fail_closed(monkeypatch, tmp_path):
    prior_owner, old, journal, source, receiver, operators, certs, kw = fixture(
        monkeypatch, tmp_path
    )
    assert not enroll_original_host_authority315(
        Ree(), prior_owner, old,
        {**certs, "reviewer": signed(signer()[0], certs["reviewer"]["payload"])},
        **kw,
    )["accepted"]
    assert not enroll_original_host_authority315(
        Ree(), prior_owner, old, certs,
        **{**kw, "attest_source_host_key_custody": None},
    )["accepted"]
    assert not enroll_original_host_authority315(
        Ree(), prior_owner, old, certs,
        **{**kw, "receiver_der": source[1]},
    )["accepted"]
    result = enroll_original_host_authority315(
        Ree(), prior_owner, old, certs, **kw,
    )
    assert result["accepted"] is True
    assert result["receiver"] == "OFF"
    assert result["connection"] == "HOLD"
    assert not enroll_original_host_authority315(
        Ree(), prior_owner, old, certs, **kw,
    )["accepted"]


def test_receiver_off_witness_and_three_master_owner_gate(monkeypatch, tmp_path):
    prior_owner, old, journal, source, receiver, operators, certs, kw = fixture(
        monkeypatch, tmp_path
    )
    enrollment = enroll_original_host_authority315(
        Ree(), prior_owner, old, certs, **kw,
    )
    original = {
        "schema": SOURCE_SCHEMA,
        "hostId": "DESKTOP-AE894KC",
        "sourceId": "rosevear-ai-hub",
        "sourceRevision": SOURCE314_MAIN,
        "commsRevision": COMMS424_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "enrollmentDigest": enrollment["enrollmentDigest"],
        "enrollmentId": enrollment["enrollmentId"],
        "receiverIntent": "ISOLATED_ONE_TEST_READY_NOT_EXECUTED",
        "issuedAt": _utc(NOW - 1000),
        "connection": "HOLD",
    }
    received = {
        "schema": RECEIVER_SCHEMA,
        "receiverId": "rosevear-comms-hub",
        "hostId": "DESKTOP-AE894KC",
        "sourceRevision": SOURCE314_MAIN,
        "commsRevision": COMMS424_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
        "episodeId": EPISODE,
        "correlationId": CORRELATION,
        "enrollmentDigest": enrollment["enrollmentDigest"],
        "enrollmentId": enrollment["enrollmentId"],
        "sourceTelemetrySha256": hashlib.sha256(_serialize(original)).hexdigest(),
        "receiverState": "OFF",
        "ceremonyState": "NOT_EXECUTED",
        "issuedAt": _utc(NOW - 1000),
        "connection": "HOLD",
    }
    wkw = {
        "journal": journal,
        "source_der": source[1],
        "receiver_der": receiver[1],
        "attest_ql424_preflight": lambda **_: True,
        "attest_receiver_disabled_readback": lambda **_: True,
        "attest_original_source_process": lambda **_: True,
        "now_ms": NOW,
    }
    assert not verify_isolated_receiver_readiness315(
        Ree(), enrollment, signed(source[0], original),
        signed(receiver[0], {**received, "receiverState": "ISOLATED_ONE_TEST_ON"}),
        **wkw,
    )["accepted"]
    assert not verify_isolated_receiver_readiness315(
        Ree(), enrollment, signed(source[0], original),
        signed(receiver[0], received),
        **{**wkw, "attest_receiver_disabled_readback": None},
    )["accepted"]
    witness = verify_isolated_receiver_readiness315(
        Ree(), enrollment, signed(source[0], original),
        signed(receiver[0], received), **wkw,
    )
    assert witness["accepted"] is True
    assert witness["receiver"] == "OFF"
    assert not verify_isolated_receiver_readiness315(
        Ree(), enrollment, signed(source[0], original),
        signed(receiver[0], received), **wkw,
    )["accepted"]
    masters = {
        master: signer()
        for master in ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")
    }
    receipts = {}
    for master in masters:
        body = {
            "schema": MASTER_SCHEMA,
            "master": master,
            "sourceRevision": SOURCE314_MAIN,
            "commsRevision": COMMS424_MAIN,
            "controllerRevision": CONTROLLER380_MAIN,
            "episodeId": EPISODE,
            "correlationId": CORRELATION,
            "enrollmentDigest": witness["enrollmentDigest"],
            "witnessDigest": witness["witnessDigest"],
            "ceremonyState": "NOT_EXECUTED",
            "decision": "READY_FOR_SUPERVISED_PILOT_REVIEW",
            "issuedAt": _utc(NOW - 1000),
            "connection": "HOLD",
        }
        receipts[master] = signed(masters[master][0], body)
    ordered = ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")
    master_digest = hashlib.sha256(
        _serialize([receipts[k]["payload"] for k in ordered])
    ).hexdigest()
    decisions = {}
    for role in operators:
        body = {
            "schema": OWNER_SCHEMA,
            "role": role,
            "operatorId": f"{role}Original315",
            "sourceRevision": SOURCE314_MAIN,
            "commsRevision": COMMS424_MAIN,
            "controllerRevision": CONTROLLER380_MAIN,
            "episodeId": EPISODE,
            "correlationId": CORRELATION,
            "witnessDigest": witness["witnessDigest"],
            "threeMasterSha256": master_digest,
            "decision": "AUTHORIZE_SUPERVISED_REVIEW_ONLY",
            "issuedAt": _utc(NOW - 1000),
            "ownerAcceptance": "HOLD",
            "connection": "HOLD",
        }
        decisions[role] = signed(operators[role][0], body)
    okw = {
        "journal": journal,
        "master_keys": {k: masters[k][1] for k in masters},
        "master_pins": {k: masters[k][2] for k in masters},
        "operator_keys": {k: operators[k][1] for k in operators},
        "operator_pins": {k: operators[k][2] for k in operators},
        "attest_independent_master_registry": lambda **_: True,
        "attest_ql424_owner_session": lambda **_: True,
        "attest_controller_connection_still_hold": lambda **_: True,
        "now_ms": NOW,
    }
    assert not review_three_master_operational_gate315(
        Ree(), witness, {**receipts, "ai-data-platform": receipts["rosevear-comms-hub"]},
        decisions, **okw,
    )["accepted"]
    assert not review_three_master_operational_gate315(
        Ree(), witness, receipts, decisions,
        **{**okw, "attest_independent_master_registry": None},
    )["accepted"]
    result = review_three_master_operational_gate315(
        Ree(), witness, receipts, decisions, **okw,
    )
    assert result["accepted"] is True
    assert result["state"] == "THREE_MASTER_SUPERVISED_PILOT_READY_NOT_EXECUTED"
    assert result["receiver"] == "OFF"
    assert result["ownerAcceptance"] == "HOLD"
    assert result["connection"] == "HOLD"
    assert not review_three_master_operational_gate315(
        Ree(), witness, receipts, decisions, **okw,
    )["accepted"]


def test_owner_only_view_stays_hold_without_field_runtime():
    assert TestClient(app).get("/api/v1/system/master-shell-315-acceptance").status_code in (
        401,
        403,
    )
    view = reconcile_master_evidence315(Ree())
    assert view["sourceBuild"] == 315
    assert view["receiver"] == "OFF"
    assert view["connection"] == "HOLD"
    assert view["ownerAcceptance"] == "HOLD"
    assert view["masterSync"] == "HOLD"
