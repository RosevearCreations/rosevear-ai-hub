"""Build 321 protected QL-430 synthetic original-host one-TEST acceptance tests."""
import asyncio
import base64
import hashlib

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance316 import CONTROLLER380_MAIN, SOURCE315_MAIN
from rosevear_ai_hub.master_shell_acceptance320 import ProtectedEnrollmentJournal320
from rosevear_ai_hub.master_shell_acceptance321 import (
    COMMS430_CONTRACT, SOURCE320_MAIN, ProtectedPilotJournal321,
    reconcile_master_evidence321, run_ql430_supervised_pilot321,
)

NOW = 1794480000000
MASTERS = ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")
STORE, REENTRY = "externalStore321", "reentryOriginal321"
NEW_CEREMONY = "newOriginalCeremony321"
SOURCE_SCOPE = {
    "ceremonyId": "priorCeremonyOriginal321", "sourceId": "rosevear-ai-hub",
    "episodeId": "priorEpisodeOriginal321", "sourceRevision": SOURCE315_MAIN,
    "controllerRevision": CONTROLLER380_MAIN,
}
EPISODE = "newEpisodeOriginal321"
REPLAY = "b" * 64
INCIDENT = "incidentOriginal321"


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


def digest(payload):
    return hashlib.sha256(_serialize(payload)).hexdigest()


def signed(key, payload):
    return {"payload": payload, "signature": base64.b64encode(key.sign(_serialize(payload))).decode()}


def dual(body, owner, reviewer):
    return {
        "payload": body,
        "ownerSignature": signed(owner[0], body)["signature"],
        "reviewerSignature": signed(reviewer[0], body)["signature"],
    }


def setup(monkeypatch, tmp_path, mode="valid"):
    original_host(monkeypatch)
    enrollment_journal = ProtectedEnrollmentJournal320(tmp_path / "enroll321.sqlite")
    pilot_journal = ProtectedPilotJournal321(tmp_path / "pilot321.sqlite")
    keys = {r: signer() for r in ("anchor", "reader", "originalHost", *MASTERS)}
    owner, reviewer, original_receiver, independent_receiver = (
        signer(), signer(), signer(), signer()
    )
    enrollment = {
        "schema": "rosevear.ql429.external-anchor-enrollment.v1",
        "externalStoreId": STORE, "anchorId": "anchorOriginal321",
        "originalHostMachineId": "DESKTOP-AE894KC",
        "pins": {
            "anchor": keys["anchor"][3], "reader": keys["reader"][3],
            "originalHost": keys["originalHost"][3],
            "masters": {m: keys[m][3] for m in MASTERS},
        },
        "ownerId": "originalOwner321", "reviewerId": "independentReviewer321",
        "createdAt": _utc(NOW - 13000),
    }
    enrolled_digest = enrollment_journal.claim(Ree(), "enrollment", STORE, {
        "enrollment": enrollment, "ownerApprovalDigest": "a" * 64,
        "proofDigests": {"anchor": "c" * 64, "reader": "d" * 64, "originalHost": "e" * 64},
    })
    assert enrolled_digest
    challenge = {
        "schema": "rosevear.ql429.original-host-challenge.v1",
        "scope": SOURCE_SCOPE, "incidentId": INCIDENT, "externalStoreId": STORE,
        "anchorDigest": "d" * 64, "closureReceiptDigest": "e" * 64,
        "reentryId": REENTRY, "ql428PrecheckDigest": "f" * 64,
        "challengeId": "c" * 48,
        "issuedAt": _utc(NOW - 10000), "expiresAt": _utc(NOW + 50000),
    }
    assert enrollment_journal.claim(Ree(), "challenge", REENTRY, {
        "enrollmentDigest": enrolled_digest, "challenge": challenge,
        "sourcePrecheckDigest": "1" * 64, "remoteReadbackDigest": "2" * 64,
    }, nonce=challenge["challengeId"])
    response_body = {
        "schema": "rosevear.ql429.original-host-fresh-response.v1",
        "scope": SOURCE_SCOPE, "incidentId": INCIDENT,
        "externalStoreId": STORE, "reentryId": REENTRY,
        "challengeDigest": digest(challenge), "challengeId": challenge["challengeId"],
        "hostMachineId": "DESKTOP-AE894KC", "receiverState": "OFF",
        "nextCeremonyId": NEW_CEREMONY, "respondedAt": _utc(NOW - 5000),
    }
    response = signed(keys["originalHost"][0], response_body)
    witness_record = enrollment_journal.claim(Ree(), "witness", REENTRY, {
        "enrollmentDigest": enrolled_digest, "challengeDigest": digest(challenge),
        "hostResponseDigest": digest(response_body), "mastersDigest": "3" * 64,
        "ownerDecisionDigest": "4" * 64, "nextCeremonyId": NEW_CEREMONY,
    })
    assert witness_record
    activation_body = {
        "schema": "rosevear.ql424.supervised-receiver-ceremony.v1",
        "sourceId": "rosevear-ai-hub", "hostId": "DESKTOP-AE894KC",
        "episodeId": EPISODE, "sourceRevision": SOURCE315_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
        "custodyRecordDigest": REPLAY, "priorDecisionId": "priorDecisionOriginal321",
        "enrollmentId": "newSignerEnrollment321",
        "ceremonyId": NEW_CEREMONY, "mode": "ISOLATED_ONE_TEST",
        "issuedAt": _utc(NOW - 4000),
        "ownerId": "originalOwner321", "reviewerId": "independentReviewer321",
    }
    activation = dual(activation_body, owner, reviewer)
    authority = dual({
        "schema": "rosevear.ql430.supervised-reentry-authorization.v1",
        "externalStoreId": STORE, "reentryId": REENTRY,
        "ql429WitnessDigest": witness_record,
        "challengeDigest": digest(challenge),
        "nextCeremonyId": NEW_CEREMONY,
        "activationDigest": digest(activation_body),
        "action": "EXECUTE_NEW_SUPERVISED_QL424_ISOLATED_ONE_TEST",
        "ownerId": "originalOwner321", "reviewerId": "independentReviewer321",
        "authorizedAt": _utc(NOW - 3000),
    }, owner, reviewer)
    receiver_body = {
        "schema": "rosevear.ql424.protected-receiver-state.v1",
        "ceremonyId": NEW_CEREMONY, "sourceId": "rosevear-ai-hub",
        "episodeId": EPISODE, "sourceRevision": SOURCE315_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
        "receiverState": "ISOLATED_ONE_TEST_ON", "observedAt": _utc(NOW - 2000),
    }
    independent_body = {
        "schema": "rosevear.ql430.independent-receiver-runtime.v1",
        "ceremonyId": NEW_CEREMONY, "sourceId": "rosevear-ai-hub",
        "episodeId": EPISODE, "sourceRevision": SOURCE315_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
        "ql429WitnessDigest": witness_record, "challengeId": challenge["challengeId"],
        "receiverState": "ISOLATED_ONE_TEST_ON", "observedAt": _utc(NOW - 1000),
    }
    off_body = {
        **independent_body, "schema": "rosevear.ql430.independent-failclosed-off.v1",
        "receiverState": "OFF", "observedAt": _utc(NOW),
    }

    def three(schema, more, status):
        reports = {}
        for m in MASTERS:
            p = {
                "schema": schema, "masterId": m, "ceremonyId": NEW_CEREMONY,
                "sourceId": "rosevear-ai-hub", "episodeId": EPISODE,
                "sourceRevision": SOURCE315_MAIN,
                "controllerRevision": CONTROLLER380_MAIN,
                **more, "status": status, "observedAt": _utc(NOW),
            }
            reports[m] = signed(keys[m][0], p)
        return reports

    q424_reports = three("rosevear.ql424.master-operational-acceptance.v1", {
        "custodyRecordDigest": REPLAY, "receiverState": "ISOLATED_ONE_TEST_ON",
    }, "VERIFIED_LIVE_PILOT")
    q424_owner_body = {
        "schema": "rosevear.ql424.supervised-operational-acceptance.v1",
        "ceremonyId": NEW_CEREMONY, "sourceId": "rosevear-ai-hub",
        "episodeId": EPISODE, "sourceRevision": SOURCE315_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
        "custodyRecordDigest": REPLAY,
        "reportsDigest": digest([q424_reports[m]["payload"] for m in MASTERS]),
        "action": "ACCEPT_ISOLATED_OPERATIONAL_PILOT", "acceptedAt": _utc(NOW),
        "ownerId": "originalOwner321", "reviewerId": "independentReviewer321",
    }
    accepted_424 = digest({
        "ql424Masters": [q424_reports[m]["payload"] for m in MASTERS],
        "ql424Owner": q424_owner_body,
    })
    q430_reports = three("rosevear.ql430.master-runtime-acceptance.v1", {
        "ql429WitnessDigest": witness_record,
        "independentReceiverDigest": digest(independent_body),
        "ql424AcceptanceDigest": accepted_424,
    }, "VERIFIED_NEW_ISOLATED_ONE_TEST_RUNTIME")
    q430_owner_body = {
        "schema": "rosevear.ql430.owner-runtime-acceptance.v1",
        "ceremonyId": NEW_CEREMONY, "sourceId": "rosevear-ai-hub",
        "episodeId": EPISODE, "sourceRevision": SOURCE315_MAIN,
        "controllerRevision": CONTROLLER380_MAIN,
        "ql429WitnessDigest": witness_record,
        "independentReceiverDigest": digest(independent_body),
        "ql424AcceptanceDigest": accepted_424,
        "reportsDigest": digest([q430_reports[m]["payload"] for m in MASTERS]),
        "action": "ACCEPT_FRESH_ISOLATED_PILOT_ONLY_KEEP_SLAVE_GATE_HOLD",
        "ownerId": "originalOwner321", "reviewerId": "independentReviewer321",
        "acceptedAt": _utc(NOW),
    }
    evidence = {
        "ql424Reports": q424_reports, "ql424Owner": dual(q424_owner_body, owner, reviewer),
        "ql430Reports": q430_reports, "ql430Owner": dual(q430_owner_body, owner, reviewer),
    }
    calls = {"execute": 0, "disable": 0}

    class Receiver:
        async def disable_one_test(self, **_):
            calls["disable"] += 1
            if mode == "failed_shutdown":
                raise RuntimeError("original host receiver unavailable")
            return {"disabled": True}

    async def run_signed_ql424(**_):
        calls["execute"] += 1
        return {
            "state": "ISOLATED_RECEIVER_ACTIVATED_PENDING_THREE_MASTER_ACCEPTANCE",
            "ceremonyId": NEW_CEREMONY, "recordDigest": REPLAY,
            "receiverProof": signed(original_receiver[0], receiver_body),
        }

    async def read_independent_receiver(**kwargs):
        if kwargs["required_state"] == "OFF":
            return signed(independent_receiver[0], off_body)
        if mode == "forged_receiver":
            return signed(signer()[0], independent_body)
        return signed(independent_receiver[0], independent_body)

    def read_runtime_evidence(**_):
        return evidence

    params = {
        "enrollment_journal": enrollment_journal, "pilot_journal": pilot_journal,
        "ql423_replay_digest": REPLAY,
        "ql424_receiver_der": original_receiver[1],
        "ql424_receiver_pin": original_receiver[2],
        "independent_receiver_der": independent_receiver[1],
        "independent_receiver_pin": independent_receiver[2],
        "owner_der": owner[1], "owner_pin": owner[2],
        "reviewer_der": reviewer[1], "reviewer_pin": reviewer[2],
        "attest_original_host_off": lambda **_: True,
        "attest_ql429_signed_witness": lambda **_: True,
        "attest_ql423_replay": lambda **_: True,
        "attest_new_ql424_enrollment": lambda **_: True,
        "attest_operator_session": lambda **_: True,
        "attest_ql424_execution": lambda **_: True,
        "attest_independent_receiver": lambda **_: True,
        "attest_three_master_custody": lambda **_: True,
        "attest_owner_runtime": lambda **_: True,
        "attest_external_custody": lambda **_: True,
        "receiver_adapter": Receiver(), "run_signed_ql424": run_signed_ql424,
        "read_independent_receiver": read_independent_receiver,
        "read_runtime_evidence": read_runtime_evidence,
        "now_ms": NOW,
    }
    return {
        "params": params, "activation": activation,
        "authorization": authority, "host": response, "calls": calls,
        "journal": pilot_journal, "evidence": evidence,
        "original_receiver": original_receiver, "owner": owner,
        "reviewer": reviewer,
    }


def run(case, **overrides):
    return asyncio.run(run_ql430_supervised_pilot321(
        Ree(), STORE, REENTRY, case["host"], case["activation"],
        case["authorization"], **{**case["params"], **overrides},
    ))


def test_one_use_runtime_success_requires_two_receiver_signers_three_masters(monkeypatch, tmp_path):
    c = setup(monkeypatch, tmp_path)
    good = run(c)
    assert good["accepted"] is True
    assert good["connection"] == "VERIFIED_CONNECTED_PILOT"
    assert good["receiver"] == "ISOLATED_ONE_TEST_ON"
    assert good["masterCount"] == 3
    assert good["ownerAcceptance"] == "DUAL_SIGNED_FOR_ISOLATED_PILOT"
    assert good["slaveGate"] == "HOLD_NEXT_MASTER_INTEGRATION_STAGE"
    assert good["runtimeUptime"] == "SINGLE_SIGNED_RUNTIME_SNAPSHOT_NOT_CONTINUOUS_UPTIME"
    assert c["calls"] == {"execute": 1, "disable": 0}
    assert c["journal"].read(Ree(), NEW_CEREMONY, "ATTEMPT")
    assert c["journal"].read(Ree(), NEW_CEREMONY, "ACCEPTED")
    second = run(c)
    assert second["connection"] == "HOLD"
    assert c["calls"] == {"execute": 1, "disable": 0}


def test_missing_original_host_authority_cannot_enable(monkeypatch, tmp_path):
    c = setup(monkeypatch, tmp_path)
    denied = run(c, attest_operator_session=None)
    assert denied["connection"] == "HOLD"
    assert c["calls"] == {"execute": 0, "disable": 0}
    changed = {**c["activation"], "payload": {
        **c["activation"]["payload"], "episodeId": "wrongEpisode321"
    }}
    bad = asyncio.run(run_ql430_supervised_pilot321(
        Ree(), STORE, REENTRY, c["host"], changed, c["authorization"], **c["params"],
    ))
    assert bad["connection"] == "HOLD"
    assert c["calls"] == {"execute": 0, "disable": 0}


def test_forged_second_receiver_proof_forces_signed_off_rollback(monkeypatch, tmp_path):
    c = setup(monkeypatch, tmp_path, mode="forged_receiver")
    failed = run(c)
    assert failed["connection"] == "HOLD"
    assert failed["receiver"] == "OFF_VERIFIED_SIGNED_AFTER_ROLLBACK"
    assert c["calls"] == {"execute": 1, "disable": 1}
    assert c["journal"].read(Ree(), NEW_CEREMONY, "ATTEMPT")
    assert c["journal"].read(Ree(), NEW_CEREMONY, "ACCEPTED") is None
    assert run(c)["connection"] == "HOLD"
    assert c["calls"] == {"execute": 1, "disable": 1}


def test_missing_ql430_master_or_owner_failure_forces_rollback(monkeypatch, tmp_path):
    c = setup(monkeypatch, tmp_path)
    c["evidence"]["ql430Reports"].pop("ai-data-platform")
    failed = run(c)
    assert failed["connection"] == "HOLD"
    assert c["calls"]["disable"] == 1

    d = setup(monkeypatch, tmp_path / "new", mode="failed_shutdown")
    d["evidence"]["ql430Owner"]["payload"]["action"] = "ACTIVATE_ALL_RECEIVERS"
    unsafe = run(d)
    assert unsafe["connection"] == "HOLD"
    assert unsafe["receiver"] == "UNKNOWN_MANUAL_OPERATOR_RECOVERY_REQUIRED"
    assert d["calls"] == {"execute": 1, "disable": 1}


def test_owner_status_never_claims_live_runtime_or_connected():
    assert TestClient(app).get("/api/v1/system/master-shell-321-acceptance").status_code in (
        401, 403,
    )
    status = reconcile_master_evidence321(Ree())
    assert status["sourceBuild"] == 321
    assert status["source320MainAtReconciliation"] == SOURCE320_MAIN
    assert status["commsQl430ContractAtReconciliation"] == COMMS430_CONTRACT
    assert status["connection"] == "HOLD"
    assert status["receiver"] == "OFF"
    assert status["ownerAcceptance"] == "HOLD"
    assert status["masterSync"] == "HOLD"
