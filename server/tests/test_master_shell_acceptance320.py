"""Build 320 — protected QL-429 signer enrollment, random challenge, OFF witness."""

import base64
import hashlib

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance316 import CONTROLLER380_MAIN, SOURCE315_MAIN
from rosevear_ai_hub.master_shell_acceptance319 import ProtectedAnchorJournal319
from rosevear_ai_hub.master_shell_acceptance320 import (
    COMMS429_CONTRACT,
    SOURCE319_MAIN,
    ProtectedEnrollmentJournal320,
    enroll_ql429_external_pins320,
    issue_ql429_original_challenge320,
    reconcile_master_evidence320,
    verify_ql429_original_host_off320,
    witness_ql429_three_master_pilot320,
)

NOW = 1794480000000
SCOPE = {
    "ceremonyId": "ceremony320Original",
    "sourceId": "rosevear-ai-hub",
    "episodeId": "episode320Original",
    "sourceRevision": SOURCE315_MAIN,
    "controllerRevision": CONTROLLER380_MAIN,
}
INCIDENT = "incident320Original"
STORE = "externalStore320"
ANCHOR = "independentAnchor320"
REENTRY = "reentry320Original"
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
    der = secret.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return secret, der, hashlib.sha256(der).hexdigest(), base64.b64encode(der).decode()


def signed(key, payload):
    return {
        "payload": payload,
        "signature": base64.b64encode(key.sign(_serialize(payload))).decode(),
    }


def owner_signed(body, owner, reviewer):
    return {
        "payload": body,
        "ownerSignature": signed(owner[0], body)["signature"],
        "reviewerSignature": signed(reviewer[0], body)["signature"],
    }


def bootstrap(monkeypatch, tmp_path):
    original_host(monkeypatch)
    journal = ProtectedEnrollmentJournal320(tmp_path / "enroll320.db")
    anchor_journal = ProtectedAnchorJournal319(tmp_path / "anchor319.db")
    pin_keys = {k: signer() for k in ("anchor", "reader", "originalHost", *MASTERS)}
    owner, reviewer = signer(), signer()
    enrollment = {
        "schema": "rosevear.ql429.external-anchor-enrollment.v1",
        "externalStoreId": STORE,
        "anchorId": ANCHOR,
        "originalHostMachineId": "DESKTOP-AE894KC",
        "pins": {
            "anchor": pin_keys["anchor"][3],
            "reader": pin_keys["reader"][3],
            "originalHost": pin_keys["originalHost"][3],
            "masters": {m: pin_keys[m][3] for m in MASTERS},
        },
        "ownerId": "ownerOriginal320",
        "reviewerId": "reviewerExternal320",
        "createdAt": _utc(NOW - 10000),
    }
    enrolled_digest = hashlib.sha256(_serialize(enrollment)).hexdigest()
    approval = owner_signed(
        {
            "schema": "rosevear.ql429.enrollment-owner-approval.v1",
            "enrollmentDigest": enrolled_digest,
            "action": "ENROLL_OFF_HOST_PUBLIC_PINS_NO_RECEIVER_ACTIVATION",
            "signedAt": _utc(NOW - 9000),
        },
        owner,
        reviewer,
    )
    proofs = {}
    for role in ("anchor", "reader", "originalHost"):
        proofs[role] = signed(
            pin_keys[role][0],
            {
                "schema": "rosevear.ql429.pin-possession.v1",
                "enrollmentDigest": enrolled_digest,
                "role": role,
                "observedAt": _utc(NOW - 8000),
            },
        )
    enrollment_kwargs = {
        "journal": journal,
        "owner_der": owner[1],
        "owner_pin": owner[2],
        "reviewer_der": reviewer[1],
        "reviewer_pin": reviewer[2],
        "attest_owner_custody": lambda **_: True,
        "attest_reviewer_custody": lambda **_: True,
        "attest_external_store": lambda **_: True,
        "attest_original_host": lambda **_: True,
        "now_ms": NOW,
    }
    local = {
        "scope": SCOPE,
        "incidentId": INCIDENT,
        "checkpointIndex": 3,
        "checkpointDigest": "d" * 64,
        "closureReceiptDigest": "e" * 64,
        "closurePayloadDigest": "f" * 64,
    }
    precheck = {
        "accepted": True,
        "state": "QL428_SUPERVISED_REENTRY_PRECHECK_ONLY",
        "reentryId": REENTRY,
        "precheckDigest": "c" * 64,
        "connection": "HOLD",
        "receiver": "OFF",
    }
    for stage, digest, previous, nonce in (
        ("ANCHOR", "a" * 64, "0" * 64, "nonceEnroll320"),
        ("RECHECK", "b" * 64, "a" * 64, "nonceRecheck320"),
        ("PRECHECK", "c" * 64, "b" * 64, REENTRY),
    ):
        assert anchor_journal.claim(
            Ree(),
            SCOPE,
            stage,
            digest,
            previous,
            nonce=nonce,
            store_id=STORE,
            anchor_id=ANCHOR,
            sequence=3,
        )
    anchor_body = {
        "schema": "rosevear.ql428.external-closure-anchor.v1",
        **local,
        "anchorId": ANCHOR,
        "externalStoreId": STORE,
        "anchorSequence": 5,
        "anchoredAt": _utc(NOW - 22000),
    }
    changed = {"drift": False}

    def read_local(**_):
        return {**local, "checkpointDigest": "0" * 64} if changed["drift"] else local

    def read_remote(**args):
        p = {
            "schema": "rosevear.ql428.external-anchor-readback.v1",
            "scope": SCOPE,
            "anchorId": ANCHOR,
            "anchorDigest": hashlib.sha256(_serialize(anchor_body)).hexdigest(),
            "requestId": args["request_id"],
            "externalStoreId": STORE,
            "remoteDurable": True,
            "remoteSequence": 6,
            "retrievedAt": _utc(NOW - 3000),
        }
        return {
            "anchor": signed(pin_keys["anchor"][0], anchor_body),
            "readback": signed(pin_keys["reader"][0], p),
        }

    challenge_kwargs = {
        "old_journal": anchor_journal,
        "journal": journal,
        "external_store_id": STORE,
        "scope": SCOPE,
        "reentry_id": REENTRY,
        "request_id": "freshRemoteRequest320",
        "comms_precheck_digest": "9" * 64,
        "read_remote": read_remote,
        "read_local": read_local,
        "attest_external_store": lambda **_: True,
        "attest_reopened_ql428_precheck": lambda **_: True,
        "now_ms": NOW,
    }
    return {
        "journal": journal,
        "keys": pin_keys,
        "owner": owner,
        "reviewer": reviewer,
        "enrollment": enrollment,
        "approval": approval,
        "proofs": proofs,
        "enrollment_kwargs": enrollment_kwargs,
        "precheck": precheck,
        "challenge_kwargs": challenge_kwargs,
        "changed": changed,
        "read_remote": read_remote,
    }


def enroll(case):
    return enroll_ql429_external_pins320(
        Ree(),
        case["enrollment"],
        case["approval"],
        case["proofs"],
        **case["enrollment_kwargs"],
    )


def issue(case):
    return issue_ql429_original_challenge320(
        Ree(),
        case["precheck"],
        **case["challenge_kwargs"],
    )


def respond(case, challenge, *, secret=None, state="OFF", host="DESKTOP-AE894KC"):
    body = {
        "schema": "rosevear.ql429.original-host-fresh-response.v1",
        "scope": SCOPE,
        "incidentId": INCIDENT,
        "externalStoreId": STORE,
        "reentryId": REENTRY,
        "challengeDigest": challenge["challengeDigest"],
        "challengeId": challenge["challenge"]["challengeId"],
        "hostMachineId": host,
        "receiverState": state,
        "nextCeremonyId": "newCeremony320Original",
        "respondedAt": _utc(NOW - 2000),
    }
    return signed(secret or case["keys"]["originalHost"][0], body)


def test_enrollment_requires_dual_signatures_custody_and_device_proofs(monkeypatch, tmp_path):
    case = bootstrap(monkeypatch, tmp_path)
    invalid = enroll_ql429_external_pins320(
        Ree(),
        case["enrollment"],
        case["approval"],
        case["proofs"],
        **{**case["enrollment_kwargs"], "attest_original_host": None},
    )
    assert not invalid.get("accepted")
    forged = dict(case["proofs"])
    forged["anchor"] = signed(signer()[0], case["proofs"]["anchor"]["payload"])
    assert not enroll_ql429_external_pins320(
        Ree(),
        case["enrollment"],
        case["approval"],
        forged,
        **case["enrollment_kwargs"],
    ).get("accepted")
    good = enroll(case)
    assert good["accepted"] and good["connection"] == "HOLD"
    assert good["receiver"] == "OFF_NOT_FRESHLY_VERIFIED"
    assert case["journal"].read(Ree(), "enrollment", STORE)
    assert not enroll(case).get("accepted")


def test_challenge_requires_fresh_remote_and_durable_precheck(monkeypatch, tmp_path):
    case = bootstrap(monkeypatch, tmp_path)
    assert not issue(case).get("accepted")
    assert enroll(case)["accepted"]
    denied = issue_ql429_original_challenge320(
        Ree(),
        case["precheck"],
        **{**case["challenge_kwargs"], "attest_reopened_ql428_precheck": None},
    )
    assert not denied.get("accepted")
    case["changed"]["drift"] = True
    assert not issue(case).get("accepted")
    case["changed"]["drift"] = False
    challenge = issue(case)
    assert challenge["accepted"] and challenge["connection"] == "HOLD"
    assert len(challenge["challenge"]["challengeId"]) == 48
    assert not issue(case).get("accepted")
    assert case["journal"].read(Ree(), "challenge", REENTRY)


def test_original_host_must_sign_fresh_off_on_correct_machine(monkeypatch, tmp_path):
    case = bootstrap(monkeypatch, tmp_path)
    assert enroll(case)["accepted"]
    challenge = issue(case)
    kw = {"journal": case["journal"], "attest_original_host_off": lambda **_: True, "now_ms": NOW}
    for candidate in (
        respond(case, challenge, secret=signer()[0]),
        respond(case, challenge, state="ON"),
        respond(case, challenge, host="TEMPLAR"),
    ):
        bad = verify_ql429_original_host_off320(Ree(), STORE, REENTRY, candidate, **kw)
        assert not bad.get("accepted") and bad["connection"] == "HOLD"
    assert not verify_ql429_original_host_off320(
        Ree(),
        STORE,
        REENTRY,
        respond(case, challenge),
        **{**kw, "attest_original_host_off": None},
    ).get("accepted")
    good = verify_ql429_original_host_off320(Ree(), STORE, REENTRY, respond(case, challenge), **kw)
    assert good["accepted"] and good["receiver"] == "OFF"
    assert not verify_ql429_original_host_off320(
        Ree(),
        STORE,
        REENTRY,
        respond(case, challenge),
        **{**kw, "now_ms": NOW + 65000},
    ).get("accepted")


def test_three_master_dual_owner_witness_is_one_use_never_activation(monkeypatch, tmp_path):
    case = bootstrap(monkeypatch, tmp_path)
    assert enroll(case)["accepted"]
    challenge = issue(case)
    response = respond(case, challenge)
    host = verify_ql429_original_host_off320(
        Ree(),
        STORE,
        REENTRY,
        response,
        journal=case["journal"],
        attest_original_host_off=lambda **_: True,
        now_ms=NOW,
    )
    assert host["accepted"]
    reports = {}
    for master in MASTERS:
        body = {
            "schema": "rosevear.ql429.master-pilot-reentry-witness.v1",
            "masterId": master,
            "scope": SCOPE,
            "incidentId": INCIDENT,
            "externalStoreId": STORE,
            "closureReceiptDigest": "e" * 64,
            "reentryId": REENTRY,
            "challengeDigest": host["challengeDigest"],
            "hostResponseDigest": host["hostResponseDigest"],
            "nextCeremonyId": host["nextCeremonyId"],
            "status": "WITNESSED_NEW_SUPERVISED_PILOT_PRECHECK_ONLY",
            "witnessedAt": _utc(NOW - 1000),
        }
        reports[master] = signed(case["keys"][master][0], body)
    report_digest = hashlib.sha256(_serialize([reports[m]["payload"] for m in MASTERS])).hexdigest()
    decision = {
        "schema": "rosevear.ql429.owner-three-master-pilot-witness.v1",
        "scope": SCOPE,
        "incidentId": INCIDENT,
        "externalStoreId": STORE,
        "reentryId": REENTRY,
        "closureReceiptDigest": "e" * 64,
        "challengeDigest": host["challengeDigest"],
        "hostResponseDigest": host["hostResponseDigest"],
        "nextCeremonyId": host["nextCeremonyId"],
        "mastersDigest": report_digest,
        "action": "ACCEPT_SIGNED_PRECHECK_ONLY_REQUIRE_NEW_QL424_CEREMONY_KEEP_OFF",
        "ownerId": "ownerOriginal320",
        "reviewerId": "reviewerExternal320",
        "approvedAt": _utc(NOW - 500),
    }
    approval = owner_signed(decision, case["owner"], case["reviewer"])
    params = {
        "journal": case["journal"],
        "owner_der": case["owner"][1],
        "owner_pin": case["owner"][2],
        "reviewer_der": case["reviewer"][1],
        "reviewer_pin": case["reviewer"][2],
        "attest_original_host_off": lambda **_: True,
        "attest_master_witness_custody": lambda **_: True,
        "attest_owner_decision": lambda **_: True,
        "attest_external_witness_storage": lambda **_: True,
        "now_ms": NOW,
    }
    invalid_report = {**reports, "ai-data-platform": reports["rosevear-comms-hub"]}
    assert not witness_ql429_three_master_pilot320(
        Ree(), STORE, REENTRY, response, invalid_report, approval, **params
    ).get("accepted")
    invalid_action = owner_signed(
        {**decision, "action": "ACTIVATE_RECEIVER"}, case["owner"], case["reviewer"]
    )
    assert not witness_ql429_three_master_pilot320(
        Ree(), STORE, REENTRY, response, reports, invalid_action, **params
    ).get("accepted")
    assert not witness_ql429_three_master_pilot320(
        Ree(),
        STORE,
        REENTRY,
        response,
        reports,
        approval,
        **{**params, "attest_external_witness_storage": None},
    ).get("accepted")
    good = witness_ql429_three_master_pilot320(
        Ree(), STORE, REENTRY, response, reports, approval, **params
    )
    assert good["accepted"] and good["masterCount"] == 3
    assert good["receiver"] == "OFF" and good["connection"] == "HOLD"
    assert good["ownerAcceptance"] == "HOLD" and good["masterSync"] == "HOLD"
    assert case["journal"].read(Ree(), "witness", REENTRY)
    assert not witness_ql429_three_master_pilot320(
        Ree(), STORE, REENTRY, response, reports, approval, **params
    ).get("accepted")


def test_read_only_ql429_owner_status_is_not_live_proof():
    assert TestClient(app).get("/api/v1/system/master-shell-320-acceptance").status_code in (
        401,
        403,
    )
    status = reconcile_master_evidence320(Ree())
    assert status["sourceBuild"] == 320
    assert status["source319MainAtReconciliation"] == SOURCE319_MAIN
    assert status["commsQl429ContractAtReconciliation"] == COMMS429_CONTRACT
    assert status["connection"] == "HOLD" and status["receiver"] == "OFF"
    assert status["ownerAcceptance"] == "HOLD" and status["masterSync"] == "HOLD"
