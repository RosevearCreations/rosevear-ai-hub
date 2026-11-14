"""Synthetic QL-445 signed post-closure OFF stability and ON recurrence cases."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_stability336 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior336 import verify_prior_continuity336
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_continuity335_signed import fixture as fixture444


def fixture(monkeypatch, tmp_path, *, late=False, recurring=False):
    old = fixture444(monkeypatch, tmp_path / "ql444-input", late=late)
    result = old["run"]()
    assert result["accepted"] is True, result
    prior = {
        "prior443": old["prior"],
        "result444": result,
        "request444": old["request"],
        "journal444": old["journal"],
        "pins444": old["pins"],
        "signed444": old["evidence"],
        "remediation444": old["remediation"],
        "masters444": old["masters"],
        "owners444": old["owners"],
    }
    verified = verify_prior_continuity336(Ree(), **prior)
    assert verified is not None
    prior_digest, link = verified
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    request = {
        "action": q.ACTION,
        "originalIncidentId": link["incident"],
        "challengeId": link["challengeId"],
        "leaseId": link["leaseId"],
        "priorQl444Digest": prior_digest,
        "ql444ClosureReceiptDigest": link["ql444ClosureReceiptDigest"],
        "ql444RemediationReceiptDigest": link["ql444RemediationReceiptDigest"],
        "previousIndependentOffDigest": link["previousOffDigest"],
        "watchNonce": "ql445DistinctPostClosureNonce",
        "watchId": "ql445FreshIndependentWatchOne",
    }
    request_digest = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: key[1:] for role, key in keys.items()}
    source = {
        "schema": "rosevear.ai-hub.ql445.commsSource.v1",
        "requestDigest": request_digest,
        "originalIncidentId": link["incident"],
        "priorQl444Digest": prior_digest,
        "ql444ClosureReceiptDigest": link["ql444ClosureReceiptDigest"],
        "previousIndependentOffDigest": link["previousOffDigest"],
        "assertedState": "HISTORICAL_QL444_CLOSURE_ONLY_HOLD",
        "observedAtMs": 1_520_000,
    }
    states = ("OFF", "ON" if recurring else "OFF")
    evidence = {"commsSource": signed(keys["commsSource"], source)}
    previous_observer_digest = link["previousOffDigest"]
    previous_host_digest = None
    sequence = link["previousOffSequence"]
    host_digests = []
    observer_digests = []
    for index, state in enumerate(states, start=1):
        host_time = 1_530_000 + (index - 1) * 4_000
        host = {
            "schema": "rosevear.ai-hub.ql445.host.v1",
            "requestDigest": request_digest,
            "sourceDigest": _digest(source),
            "hostMachineId": "DESKTOP-AE894KC",
            "originalIncidentId": link["incident"],
            "challengeId": link["challengeId"],
            "leaseId": link["leaseId"],
            "watchNonce": request["watchNonce"],
            "watchId": request["watchId"],
            "sampleIndex": index,
            "previousObserverDigest": previous_observer_digest,
            "previousHostDigest": previous_host_digest,
            "watchdogArmed": True,
            "receiverState": state,
            "sequence": sequence + 1,
            "observedAtMs": host_time,
        }
        observer = {
            "schema": f"rosevear.ai-hub.ql445.observer{'One' if index == 1 else 'Two'}.v1",
            "requestDigest": request_digest,
            "originalIncidentId": link["incident"],
            "challengeId": link["challengeId"],
            "leaseId": link["leaseId"],
            "watchNonce": request["watchNonce"],
            "watchId": request["watchId"],
            "sampleIndex": index,
            "hostProbeDigest": _digest(host),
            "previousObserverDigest": previous_observer_digest,
            "receiverState": state,
            "sequence": host["sequence"] + 1,
            "observedAtMs": host_time + 1_000,
        }
        role = "observerOne" if index == 1 else "observerTwo"
        evidence[f"host{index}"] = signed(keys["host"], host)
        evidence[role] = signed(keys[role], observer)
        host_digests.append(_digest(host))
        observer_digests.append(_digest(observer))
        previous_host_digest = _digest(host)
        previous_observer_digest = _digest(observer)
        sequence = observer["sequence"]
    classification = q.CLASS_RECURRENCE if recurring else q.CLASS_STABLE
    masters = {}
    for master in q.MASTERS:
        masters[master] = signed(
            keys[master],
            {
                "schema": f"rosevear.ai-hub.ql445.{master}.v1",
                "masterId": master,
                "requestDigest": request_digest,
                "originalIncidentId": link["incident"],
                "priorQl444Digest": prior_digest,
                "ql444ClosureReceiptDigest": link["ql444ClosureReceiptDigest"],
                "hostProbeDigests": host_digests,
                "observerDigests": observer_digests,
                "classification": classification,
                "decision": q.MASTER_RECURRENCE if recurring else q.MASTER_STABLE,
                "reviewedAtMs": 1_542_000,
            },
        )
    master_digest = _digest([masters[m]["payload"] for m in q.MASTERS])
    owners = {}
    for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        owners[role] = signed(
            keys[role],
            {
                "schema": f"rosevear.ai-hub.ql445.{role}.v1",
                "ownerId": owner_id,
                "requestDigest": request_digest,
                "originalIncidentId": link["incident"],
                "priorQl444Digest": prior_digest,
                "ql444ClosureReceiptDigest": link["ql444ClosureReceiptDigest"],
                "threeMasterDigest": master_digest,
                "lastObserverDigest": observer_digests[1],
                "classification": classification,
                "decision": q.OWNER_RECURRENCE if recurring else q.OWNER_STABLE,
                "reviewedAtMs": 1_550_000,
            },
        )
    adapters = {
        role: (lambda role=role, **_: deepcopy(evidence[role])) for role in evidence
    }
    journal = q.ProtectedStabilityJournal336(tmp_path / "private-ql445")

    def run():
        return q.review_stability336(
            Ree(),
            prior,
            request,
            journal,
            pins,
            read_comms_source=adapters["commsSource"],
            read_host_one=adapters["host1"],
            read_observer_one=adapters["observerOne"],
            read_host_two=adapters["host2"],
            read_observer_two=adapters["observerTwo"],
            master_reports=masters,
            dual_owners=owners,
            now_ms=1_560_000,
            final_now_ms=1_565_000,
        )

    return {
        "run": run,
        "prior": prior,
        "request": request,
        "keys": keys,
        "pins": pins,
        "evidence": evidence,
        "adapters": adapters,
        "masters": masters,
        "owners": owners,
        "journal": journal,
        "incident": link["incident"],
        "link": link,
    }


@pytest.mark.parametrize(
    ("late", "recurring"), [(False, False), (True, False), (False, True), (True, True)]
)
def test_signed_stable_or_on_recurrence_fail_closed_operationally(
    monkeypatch, tmp_path, late, recurring
):
    case = fixture(monkeypatch, tmp_path, late=late, recurring=recurring)
    outcome = case["run"]()
    assert outcome["accepted"] is True, outcome
    assert outcome["state"] == (q.RECURRENCE if recurring else q.STABLE)
    assert outcome["classification"] == (q.CLASS_RECURRENCE if recurring else q.CLASS_STABLE)
    assert outcome["recurrenceSuspected"] is recurring
    assert outcome["signedOnRecurrenceAccepted"] is recurring
    assert outcome["connection"] == "HOLD"
    assert outcome["activationAuthorized"] is False
    assert outcome["physicalReceiverCurrentlyOff"] is False
    assert outcome["incidentClosed"] is False
    assert outcome["masterCount"] == 3
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    terminal = "RECURRENCE" if recurring else "STABLE"
    other = "STABLE" if recurring else "RECURRENCE"
    assert case["journal"].read(Ree(), case["incident"], terminal)
    assert case["journal"].read(Ree(), case["incident"], other) is None
    assert case["run"]()["accepted"] is False
    reboot = q.read_private_stability336(Ree(), case["journal"], case["incident"])
    assert reboot["connection"] == "HOLD"
    assert reboot["physicalReceiverCurrentlyOff"] is False
    assert reboot["recurrenceSuspected"] is recurring


@pytest.mark.parametrize(
    ("role", "field", "bad"),
    [
        ("commsSource", "ql444ClosureReceiptDigest", "0" * 64),
        ("commsSource", "assertedState", "CONNECTED"),
        ("host1", "hostMachineId", "TEMPLAR"),
        ("host1", "watchdogArmed", False),
        ("host1", "receiverState", "CONNECTED"),
        ("host1", "sequence", 1),
        ("host1", "previousObserverDigest", "0" * 64),
        ("host2", "sampleIndex", 1),
        ("host2", "observedAtMs", 1_531_100),
        ("observerOne", "receiverState", "ON"),
        ("observerOne", "hostProbeDigest", "0" * 64),
        ("observerTwo", "previousObserverDigest", "0" * 64),
        ("observerTwo", "sequence", 1),
        ("observerTwo", "watchNonce", "ql444ReplayNonce"),
    ],
)
def test_forged_witness_payloads_fail_closed(monkeypatch, tmp_path, role, field, bad):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"][role]["payload"][field] = bad
    result = case["run"]()
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"
    assert case["journal"].read(Ree(), case["incident"], "STABLE") is None


def test_genuine_signed_source_disagreement_flags_recurrence_risk(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    body = deepcopy(case["evidence"]["observerOne"]["payload"])
    body["receiverState"] = "ON"
    case["evidence"]["observerOne"] = signed(case["keys"]["observerOne"], body)
    result = case["run"]()
    assert result["accepted"] is False
    assert result["recurrenceSuspected"] is True
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False


def test_missing_master_owner_collision_and_veto_fail(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    del case["masters"]["rosevear-comms-hub"]
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "owner")
    case["owners"]["ownerReviewer"]["payload"]["ownerId"] = case["link"]["ownerIds"][0]
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "veto")
    body = case["masters"]["rosevear-ai-hub"]["payload"]
    body["decision"] = q.MASTER_RECURRENCE
    case["masters"]["rosevear-ai-hub"] = signed(case["keys"]["rosevear-ai-hub"], body)
    assert case["run"]()["accepted"] is False


def test_prior_custody_tamper_and_interrupted_pending_not_replayed(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["prior"]["result444"]["finalReceiptDigest"] = "f" * 64
    assert case["run"]()["accepted"] is False
    assert not case["journal"].directory.exists()
    case = fixture(monkeypatch, tmp_path / "interrupted")
    case["adapters"]["commsSource"] = lambda **_: None
    assert case["run"]()["accepted"] is False
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["run"]()["accepted"] is False


def test_symlink_and_terminal_replay_rejected(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    external = tmp_path / "external"
    external.mkdir()
    case["journal"].directory.symlink_to(external, target_is_directory=True)
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "accepted", recurring=True)
    assert case["run"]()["accepted"] is True
    assert case["journal"].claim(
        Ree(), case["incident"], "STABLE", _digest(case["request"]), "a" * 64
    ) is None
