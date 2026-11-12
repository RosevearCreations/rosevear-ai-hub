"""Build 322 — synthetic QL-431 signed health, fail-closed OFF and incident custody."""

import asyncio
import base64
import hashlib
import sqlite3

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance316 import CONTROLLER380_MAIN, SOURCE315_MAIN
from rosevear_ai_hub.master_shell_acceptance321 import ProtectedPilotJournal321
from rosevear_ai_hub.master_shell_acceptance322 import (
    COMMS431_CONTRACT,
    SOURCE321_MAIN,
    ProtectedContinuityJournal322,
    reconcile_master_evidence322,
    reconcile_ql431_incident322,
    run_ql431_post_reentry_health322,
)

NOW = 1794480000000
MASTERS = ("rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform")
SCOPE = {
    "ceremonyId": "originalIsolatedCeremony322",
    "sourceId": "rosevear-ai-hub",
    "episodeId": "originalIsolatedEpisode322",
    "sourceRevision": SOURCE315_MAIN,
    "controllerRevision": CONTROLLER380_MAIN,
}
ACCEPTED = "a" * 64
ATTEMPT = "b" * 64


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
    private = Ed25519PrivateKey.generate()
    der = private.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return private, der, hashlib.sha256(der).hexdigest()


def digest(p):
    return hashlib.sha256(_serialize(p)).hexdigest()


def signed(key, body):
    return {"payload": body, "signature": base64.b64encode(key[0].sign(_serialize(body))).decode()}


def dual(owner, reviewer, p):
    return {
        "payload": p,
        "ownerSignature": signed(owner, p)["signature"],
        "reviewerSignature": signed(reviewer, p)["signature"],
    }


def bootstrap(monkeypatch, tmp_path, mode="normal"):
    original_host(monkeypatch)
    pilot = ProtectedPilotJournal321(tmp_path / "pilot321.db")
    journal = ProtectedContinuityJournal322(tmp_path / "continuity322.db")
    assert pilot.claim(Ree(), SCOPE["ceremonyId"], "ATTEMPT", ATTEMPT, "0" * 64)
    assert pilot.claim(Ree(), SCOPE["ceremonyId"], "ACCEPTED", ACCEPTED, ATTEMPT)
    acceptance = {
        "accepted": True,
        "state": "DURABLE_VERIFIED_THREE_MASTER_REENTRY_ISOLATED_PILOT",
        "connection": "VERIFIED_CONNECTED_PILOT",
        "receiver": "ISOLATED_ONE_TEST_ON",
        "ownerAcceptance": "DUAL_SIGNED_FOR_ISOLATED_PILOT",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "masterCount": 3,
        "acceptedDigest": ACCEPTED,
        "ql429WitnessDigest": "c" * 64,
        "independentReceiverDigest": "d" * 64,
        **SCOPE,
    }
    keys = {m: signer() for m in MASTERS}
    receiver = signer()
    shutdown = signer()
    owner = signer()
    reviewer = signer()
    calls = {"disable": 0, "read_on": 0, "read_off": 0}

    class Adapter:
        async def disable_one_test(self, **kwargs):
            calls["disable"] += 1
            if mode == "shutdown_error":
                raise RuntimeError("failed shutdown")
            if mode == "disable_unconfirmed":
                return {"disabled": False}
            body = {
                "schema": "rosevear.ql431.signed-fail-closed-shutdown.v1",
                "scope": SCOPE,
                "observationId": kwargs["observation_id"],
                "incidentId": kwargs["incident_id"],
                "reason": kwargs["reason"],
                "receiverState": "OFF",
                "disabledAt": _utc(NOW),
            }
            signer_key = signer() if mode == "bad_shutdown_signature" else shutdown
            return {"disabled": True, "signedAck": signed(signer_key, body)}

    async def independent_read(**kwargs):
        state = kwargs["required_state"]
        if state == "ISOLATED_ONE_TEST_ON":
            calls["read_on"] += 1
            p = {
                "schema": "rosevear.ql431.independent-receiver-health.v1",
                "scope": SCOPE,
                "ql430AcceptedDigest": ACCEPTED,
                "observationId": kwargs["observation_id"],
                "incidentId": None,
                "shutdownAckDigest": None,
                "receiverState": "ISOLATED_ONE_TEST_ON",
                "observedAt": _utc(NOW),
            }
            if mode == "forged_on":
                return signed(signer(), p)
            return signed(receiver, p)
        calls["read_off"] += 1
        p = {
            "schema": "rosevear.ql431.independent-receiver-health.v1",
            "scope": SCOPE,
            "ql430AcceptedDigest": ACCEPTED,
            "observationId": kwargs["observation_id"],
            "incidentId": kwargs["incident_id"],
            "shutdownAckDigest": kwargs["shutdown_ack_digest"],
            "receiverState": "OFF",
            "observedAt": _utc(NOW),
        }
        if mode == "forged_off":
            return signed(signer(), p)
        return signed(receiver, p)

    params = {
        "pilot_journal": pilot,
        "journal": journal,
        "master_keys": {m: keys[m][1:] for m in MASTERS},
        "receiver_der": receiver[1],
        "receiver_pin": receiver[2],
        "shutdown_der": shutdown[1],
        "shutdown_pin": shutdown[2],
        "attest_original_operator": lambda **_: True,
        "attest_ql430_accepted_custody": lambda **_: True,
        "attest_independent_signers": lambda **_: True,
        "receiver_adapter": Adapter(),
        "read_independent_receiver": independent_read,
        "now_ms": NOW,
    }
    return {
        "acceptance": acceptance,
        "params": params,
        "journal": journal,
        "keys": keys,
        "receiver": receiver,
        "shutdown": shutdown,
        "owner": owner,
        "reviewer": reviewer,
        "calls": calls,
    }


def heartbeats(case, sequence=1, *, forged=False):
    out = {}
    for m in MASTERS:
        p = {
            "schema": "rosevear.ql431.master-post-reentry-health.v1",
            "masterId": m,
            "scope": SCOPE,
            "ql430AcceptedDigest": ACCEPTED,
            "status": "ISOLATED_PILOT_HEALTHY",
            "sequence": sequence,
            "observedAt": _utc(NOW),
        }
        out[m] = signed(signer() if forged and m == "ai-data-platform" else case["keys"][m], p)
    return out


def observe(case, observation, incident, reports=None, **changes):
    return asyncio.run(
        run_ql431_post_reentry_health322(
            Ree(),
            case["acceptance"],
            observation,
            incident,
            heartbeats(case) if reports is None else reports,
            **{**case["params"], **changes},
        )
    )


def incident_acceptance(case, incident):
    off = case["journal"].read(Ree(), SCOPE)
    assert off["entry"]["kind"] == "OFF"
    reports = {}
    for m in MASTERS:
        p = {
            "schema": "rosevear.ql431.master-incident-custody.v1",
            "masterId": m,
            "scope": SCOPE,
            "incidentId": incident,
            "shutdownRecordDigest": off["recordDigest"],
            "receiverOffDigest": off["entry"]["receiverOffDigest"],
            "status": "ISOLATED_RECEIVER_OFF_INCIDENT_HELD",
            "observedAt": _utc(NOW),
        }
        reports[m] = signed(case["keys"][m], p)
    owner_body = {
        "schema": "rosevear.ql431.owner-incident-reconciliation.v1",
        "scope": SCOPE,
        "incidentId": incident,
        "shutdownRecordDigest": off["recordDigest"],
        "reportsDigest": digest([reports[m]["payload"] for m in MASTERS]),
        "action": "ACKNOWLEDGE_FAIL_CLOSED_INCIDENT_KEEP_RECEIVER_OFF",
        "ownerId": "ownerOriginal322",
        "reviewerId": "reviewerExternal322",
        "acceptedAt": _utc(NOW),
    }
    approval = dual(case["owner"], case["reviewer"], owner_body)
    args = {
        "journal": case["journal"],
        "master_keys": case["params"]["master_keys"],
        "owner_der": case["owner"][1],
        "owner_pin": case["owner"][2],
        "reviewer_der": case["reviewer"][1],
        "reviewer_pin": case["reviewer"][2],
        "attest_operator": lambda **_: True,
        "attest_master_custody": lambda **_: True,
        "attest_owner_custody": lambda **_: True,
        "attest_external_custody": lambda **_: True,
        "now_ms": NOW,
    }
    return reports, approval, args


def test_two_fresh_monotonic_signed_health_snapshots_no_uptime_claim(monkeypatch, tmp_path):
    case = bootstrap(monkeypatch, tmp_path)
    a = observe(case, "healthObservation322A", "potentialIncident322A")
    assert a["accepted"] and a["connection"] == "VERIFIED_CONNECTED_PILOT"
    assert a["runtimeUptime"] == "SIGNED_SINGLE_CYCLE_NOT_MEASURED_UPTIME"
    assert a["sequences"] == {m: 1 for m in MASTERS}
    b = observe(
        case,
        "healthObservation322B",
        "potentialIncident322B",
        heartbeats(case, sequence=2),
    )
    assert b["accepted"] and b["checkpointIndex"] == 2
    assert case["calls"]["disable"] == 0
    assert case["journal"].read(Ree(), SCOPE)["entry"]["kind"] == "HEALTH"
    assert not observe(
        case,
        "healthObservation322B",
        "potentialIncident322C",
        heartbeats(case, sequence=3),
    ).get("accepted")


def test_forged_or_stale_heartbeat_requests_signed_shutdown_and_off(monkeypatch, tmp_path):
    case = bootstrap(monkeypatch, tmp_path)
    assert observe(case, "healthObservation322A", "potentialIncident322A")["accepted"]
    stale = observe(
        case,
        "healthObservation322C",
        "recoveryIncident322Original",
        heartbeats(case, sequence=1, forged=True),
    )
    assert stale["state"] == "DURABLE_SIGNED_FAIL_CLOSED_SHUTDOWN"
    assert stale["connection"] == "HOLD"
    assert stale["receiver"] == "OFF_VERIFIED_SIGNED_READBACK"
    assert case["calls"]["disable"] == 1
    assert case["journal"].read(Ree(), SCOPE)["entry"]["kind"] == "OFF"
    assert not observe(
        case,
        "healthObservation322D",
        "recoveryIncident322Next",
        heartbeats(case, sequence=3),
    ).get("accepted")
    assert case["calls"]["disable"] == 1


def test_missing_original_authority_rejects_without_touching_receiver(monkeypatch, tmp_path):
    case = bootstrap(monkeypatch, tmp_path)
    result = observe(
        case,
        "healthObservation322A",
        "potentialIncident322A",
        attest_original_operator=None,
    )
    assert result["connection"] == "HOLD"
    assert case["calls"] == {"disable": 0, "read_on": 0, "read_off": 0}


@pytest.mark.parametrize(
    "mode", ["forged_off", "bad_shutdown_signature", "shutdown_error", "disable_unconfirmed"]
)
def test_bad_shutdown_or_independent_off_fail_closed_unknown(monkeypatch, tmp_path, mode):
    case = bootstrap(monkeypatch, tmp_path, mode=mode)
    r = observe(
        case,
        "healthObservation322A",
        "recoveryIncident322Original",
        heartbeats(case, forged=True),
    )
    assert r["connection"] == "HOLD"
    assert r["receiver"] != "OFF_VERIFIED_SIGNED_READBACK"
    assert case["calls"]["disable"] == 1
    assert case["journal"].read(Ree(), SCOPE)["entry"]["kind"] == "PENDING"


def test_one_use_three_master_dual_owner_incident_reconciliation(monkeypatch, tmp_path):
    case = bootstrap(monkeypatch, tmp_path)
    incident = "recoveryIncident322Original"
    result = observe(
        case,
        "healthObservation322A",
        incident,
        heartbeats(case, forged=True),
    )
    assert result["state"] == "DURABLE_SIGNED_FAIL_CLOSED_SHUTDOWN"
    reports, approval, args = incident_acceptance(case, incident)
    wrong = {**reports, "ai-data-platform": reports["rosevear-comms-hub"]}
    assert not reconcile_ql431_incident322(Ree(), SCOPE, incident, wrong, approval, **args).get(
        "accepted"
    )
    altered = dual(
        case["owner"],
        case["reviewer"],
        {**approval["payload"], "action": "REACTIVATE_ALL"},
    )
    assert not reconcile_ql431_incident322(Ree(), SCOPE, incident, reports, altered, **args).get(
        "accepted"
    )
    assert not reconcile_ql431_incident322(
        Ree(),
        SCOPE,
        incident,
        reports,
        approval,
        **{**args, "attest_external_custody": None},
    ).get("accepted")
    good = reconcile_ql431_incident322(
        Ree(),
        SCOPE,
        incident,
        reports,
        approval,
        **args,
    )
    assert good["accepted"] and good["masterCount"] == 3
    assert good["connection"] == "HOLD"
    assert good["receiver"] == "OFF_VERIFIED_SIGNED_READBACK"
    assert case["journal"].read(Ree(), SCOPE)["entry"]["kind"] == "RECONCILED"
    assert not reconcile_ql431_incident322(
        Ree(),
        SCOPE,
        incident,
        reports,
        approval,
        **args,
    ).get("accepted")


def test_tampered_durable_chain_never_admits_new_health(monkeypatch, tmp_path):
    case = bootstrap(monkeypatch, tmp_path)
    assert observe(case, "healthObservation322A", "potentialIncident322A")["accepted"]
    with sqlite3.connect(case["journal"].path) as db:
        db.execute("UPDATE continuity322 SET record_digest=? WHERE idx=1", ("f" * 64,))
    with pytest.raises(ValueError):
        case["journal"].read(Ree(), SCOPE)
    result = observe(
        case,
        "healthObservation322B",
        "recoveryIncident322Original",
        heartbeats(case, sequence=2),
    )
    assert result["connection"] == "HOLD"
    assert case["calls"]["disable"] == 1
    assert result["receiver"] == "UNKNOWN_MANUAL_OPERATOR_RECOVERY_REQUIRED"


def test_read_only_source_status_rejects_claim_of_live_receivers():
    assert TestClient(app).get("/api/v1/system/master-shell-322-acceptance").status_code in (
        401,
        403,
    )
    status = reconcile_master_evidence322(Ree())
    assert status["sourceBuild"] == 322
    assert status["source321MainAtReconciliation"] == SOURCE321_MAIN
    assert status["commsQl431ContractAtReconciliation"] == COMMS431_CONTRACT
    assert status["connection"] == "HOLD"
    assert status["receiver"] == "OFF"
    assert status["ownerAcceptance"] == "HOLD"
    assert status["masterSync"] == "HOLD"
