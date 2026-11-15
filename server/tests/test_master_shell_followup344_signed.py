"""Synthetic Ed25519 regression cases for QL-453 source-only continuity."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_followup344 as q
from rosevear_ai_hub.cross_app_security344 import CONTRACT_DIGEST
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_reconciliation343 import reconcile_ql451_outcome343
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_reconciliation343_signed import review


def case(monkeypatch, tmp_path, *, unresolved=False, receiver="OFF", drift=False):
    previous = review(monkeypatch, tmp_path / "old", host_on=unresolved)
    history = reconcile_ql451_outcome343(Ree(), **previous)
    assert history["accepted"] is True, history
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    request = {
        "action": q.ACTION,
        "incidentId": history["originalIncidentId"],
        "historicalReceiptDigest": history["historicalReceiptDigest"],
        "historicalEvidenceDigest": history["historicalEvidenceDigest"],
        "followupId": "QL453UniqueFollowupCase2026",
        "challengeNonce": "QL453UniqueIndependentNonce2026",
    }
    rd = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: key[1:] for role, key in keys.items()}
    host = {
        "schema": "rosevear.ai-hub.ql453.host.v1",
        "requestDigest": rd,
        "incidentId": request["incidentId"],
        "historicalReceiptDigest": request["historicalReceiptDigest"],
        "hostMachineId": "DESKTOP-AE894KC",
        "receiverState": receiver,
        "isolationLock": True,
        "leaseRevoked": True,
        "watchdogArmed": True,
        "sequence": 42,
        "observedAtMs": 2_200_000,
    }
    observer = {
        "schema": "rosevear.ai-hub.ql453.observer.v1",
        "requestDigest": rd,
        "incidentId": request["incidentId"],
        "historicalReceiptDigest": request["historicalReceiptDigest"],
        "signedHostDigest": _digest(host),
        "receiverState": receiver,
        "isolationConfirmed": True,
        "sequence": 43,
        "observedAtMs": 2_201_000,
    }
    owner = {
        "schema": "rosevear.ai-hub.ql453.owner.v1",
        "requestDigest": rd,
        "incidentId": request["incidentId"],
        "historicalReceiptDigest": request["historicalReceiptDigest"],
        "signedHostDigest": _digest(host),
        "signedObserverDigest": _digest(observer),
        "followupId": request["followupId"],
        "challengeNonce": request["challengeNonce"],
        "reviewDecision": (
            q.REVIEW_EXCEPTION if history["unresolvedException"] else q.REVIEW_CONTINUITY
        ),
        "closureAuthorized": False,
        "activationAuthorized": False,
        "ownerId": "OriginalOwnerRee",
        "reviewedAtMs": 2_202_000,
    }
    signed_masters = {}
    readback = _digest({
        "historicalEvidenceDigest": history["historicalEvidenceDigest"],
        "requestDigest": rd,
        "hostDigest": _digest(host),
        "observerDigest": _digest(observer),
        "ownerDigest": _digest(owner),
    })
    last = None
    for i, master in enumerate(q.MASTERS):
        vote = {
            "schema": f"rosevear.ai-hub.ql453.{master}.v1",
            "masterId": master,
            "incidentId": request["incidentId"],
            "requestDigest": rd,
            "historicalReceiptDigest": request["historicalReceiptDigest"],
            "readbackDigest": readback,
            "contractDigest": "0" * 64 if drift and i == 1 else CONTRACT_DIGEST,
            "previousMasterDigest": last,
            "decision": q.MASTER_VETO,
            "incidentStatus": "OPEN_HOLD",
            "connection": "HOLD",
            "closureAuthorized": False,
            "activationAuthorized": False,
            "reviewedAtMs": 2_203_000 + i * 100,
        }
        signed_masters[master] = signed(keys[master], vote)
        last = _digest(vote)
    args = {
        "original343": previous,
        "request": request,
        "signed_host": signed(keys["host"], host),
        "signed_observer": signed(keys["observer"], observer),
        "signed_owner": signed(keys["owner"], owner),
        "signed_masters": signed_masters,
        "pins": pins,
        "now_ms": 2_210_000,
    }
    return args


@pytest.mark.parametrize("unresolved", [False, True])
def test_signed_owner_and_three_master_historical_review_still_hold(
    monkeypatch, tmp_path, unresolved
):
    args = case(monkeypatch, tmp_path, unresolved=unresolved)
    result = q.audit_signed_followup344(Ree(), **args)
    assert result["accepted"] is True, result
    assert result["independentOffHistoricallyReviewed"] is True
    assert result["threeMasterCount"] == 3
    assert result["masterHandoffVerified"] is True
    assert result["escalationRequired"] is unresolved
    assert result["connection"] == "HOLD"
    assert result["incidentStatus"] == "OPEN"
    assert result["incidentClosed"] is False
    assert result["physicalReceiverCurrentlyOff"] is False
    assert result["closureAuthorized"] is False
    assert result["activationAuthorized"] is False
    assert result["crossAppConnectivityVerified"] is False


def test_expired_and_future_off_readbacks_trigger_escalation(monkeypatch, tmp_path):
    args = case(monkeypatch, tmp_path)
    args["now_ms"] = 2_290_000
    result = q.audit_signed_followup344(Ree(), **args)
    assert result["accepted"] is False
    assert "EXPIRED" in result["state"]
    assert result["escalationRequired"] is True

    args = case(monkeypatch, tmp_path / "future")
    args["now_ms"] = 2_190_000
    assert q.audit_signed_followup344(Ree(), **args)["accepted"] is False


def test_signed_on_readback_is_not_off(monkeypatch, tmp_path):
    args = case(monkeypatch, tmp_path, receiver="ON")
    result = q.audit_signed_followup344(Ree(), **args)
    assert result["accepted"] is False
    assert result["physicalReceiverCurrentlyOff"] is False
    assert result["escalationRequired"] is True


def test_signed_master_drift_veto_and_stale_owner(monkeypatch, tmp_path):
    args = case(monkeypatch, tmp_path, drift=True)
    result = q.audit_signed_followup344(Ree(), **args)
    assert result["accepted"] is False
    assert "DRIFT" in result["state"]

    args = case(monkeypatch, tmp_path / "owner")
    args["signed_owner"] = deepcopy(args["signed_owner"])
    args["signed_owner"]["payload"]["closureAuthorized"] = True
    assert q.audit_signed_followup344(Ree(), **args)["accepted"] is False


def test_predecessor_custody_and_pin_tamper_fail(monkeypatch, tmp_path):
    args = case(monkeypatch, tmp_path)
    args["original343"]["result451"]["finalReceiptDigest"] = "0" * 64
    assert q.audit_signed_followup344(Ree(), **args)["accepted"] is False

    args = case(monkeypatch, tmp_path / "keys")
    args["pins"]["observer"] = args["pins"]["host"]
    assert q.audit_signed_followup344(Ree(), **args)["accepted"] is False
