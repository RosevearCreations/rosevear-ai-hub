"""QL-446 signed synthetic 3-horizon OFF watch and recurrence reopening."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_escalation337 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior337 import verify_prior_stability337
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_stability336_signed import fixture as fixture445


def fixture(monkeypatch, tmp_path, *, prior_recurrence=False, new_on=False, divergence=False):
    old = fixture445(
        monkeypatch,
        tmp_path / "ql445",
        recurring=prior_recurrence,
    )
    old_result = old["run"]()
    assert old_result["accepted"] is True, old_result
    prior = {
        "prior444": old["prior"],
        "result445": old_result,
        "request445": old["request"],
        "journal445": old["journal"],
        "pins445": old["pins"],
        "signed445": {
            "commsSource": old["evidence"]["commsSource"],
            "hostOne": old["evidence"]["host1"],
            "hostTwo": old["evidence"]["host2"],
            "observerOne": old["evidence"]["observerOne"],
            "observerTwo": old["evidence"]["observerTwo"],
        },
        "masters445": old["masters"],
        "owners445": old["owners"],
    }
    verified = verify_prior_stability337(Ree(), **prior)
    assert verified is not None
    prior_digest, link = verified
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    request = {
        "action": q.ACTION,
        "originalIncidentId": link["incident"],
        "challengeId": link["challengeId"],
        "leaseId": link["leaseId"],
        "priorQl445Digest": prior_digest,
        "ql445ReceiptDigest": link["ql445ReceiptDigest"],
        "previousObserverDigest": link["previousObserverDigest"],
        "previousClassification": link["ql445Classification"],
        "challengeNonce": "QL446FreshIndependentChallenge",
        "watchId": "QL446ThreeDistinctHorizonWatch",
    }
    request_digest = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: pair[1:] for role, pair in keys.items()}
    source = {
        "schema": "rosevear.ai-hub.ql446.commsSource.v1",
        "requestDigest": request_digest,
        "originalIncidentId": link["incident"],
        "priorQl445Digest": prior_digest,
        "ql445ReceiptDigest": link["ql445ReceiptDigest"],
        "previousObserverDigest": link["previousObserverDigest"],
        "priorClassification": link["ql445Classification"],
        "assertedState": "QL445_HISTORICAL_EVIDENCE_ONLY_HOLD",
        "observedAtMs": 1_579_000,
    }
    evidence = {"commsSource": signed(keys["commsSource"], source)}
    last_observer = link["previousObserverDigest"]
    last_host = None
    seq = link["previousSequence"]
    host_digests, witness_digests = [], []
    host_times = (1_585_000, 1_590_000, 1_599_000)
    for horizon, moment in zip(q.HORIZONS, host_times, strict=True):
        state = "ON" if (new_on and horizon == "MEDIUM") else "OFF"
        host = {
            "schema": "rosevear.ai-hub.ql446.host.v1",
            "requestDigest": request_digest,
            "sourceDigest": _digest(source),
            "originalIncidentId": link["incident"],
            "hostMachineId": "DESKTOP-AE894KC",
            "challengeId": link["challengeId"],
            "leaseId": link["leaseId"],
            "challengeNonce": request["challengeNonce"],
            "watchId": request["watchId"],
            "horizon": horizon,
            "previousHostDigest": last_host,
            "previousObserverDigest": last_observer,
            "watchdogArmed": True,
            "receiverState": state,
            "sequence": seq + 1,
            "observedAtMs": moment,
        }
        role = {
            "SHORT": "observerShort",
            "MEDIUM": "observerMedium",
            "LONG": "observerLong",
        }[horizon]
        witness = {
            "schema": f"rosevear.ai-hub.ql446.{role}.v1",
            "requestDigest": request_digest,
            "originalIncidentId": link["incident"],
            "challengeId": link["challengeId"],
            "leaseId": link["leaseId"],
            "challengeNonce": request["challengeNonce"],
            "watchId": request["watchId"],
            "horizon": horizon,
            "hostProbeDigest": _digest(host),
            "previousObserverDigest": last_observer,
            "receiverState": "ON" if (divergence and horizon == "LONG") else state,
            "sequence": host["sequence"] + 1,
            "observedAtMs": moment + 500,
        }
        evidence["host" + horizon] = signed(keys["host"], host)
        evidence[role] = signed(keys[role], witness)
        host_digests.append(_digest(host))
        witness_digests.append(_digest(witness))
        last_host = _digest(host)
        last_observer = _digest(witness)
        seq = witness["sequence"]
    reopening = prior_recurrence or new_on or divergence
    classification = (
        q.CLASS_DIVERGENCE if divergence else q.CLASS_REOPEN if reopening else q.CLASS_WATCH
    )
    watch_digest = _digest(
        {
            "prior": prior_digest,
            "source": _digest(source),
            "hostDigests": host_digests,
            "observerDigests": witness_digests,
            "classification": classification,
        }
    )
    officer = None
    officer_digest = None
    if reopening:
        officer = signed(
            keys["escalationOfficer"],
            {
                "schema": "rosevear.ai-hub.ql446.escalationOfficer.v1",
                "requestDigest": request_digest,
                "originalIncidentId": link["incident"],
                "caseId": "ql446ProtectedFreshIncidentCaseId",
                "priorQl445Digest": prior_digest,
                "ql445ReceiptDigest": link["ql445ReceiptDigest"],
                "commsSourceDigest": _digest(source),
                "threeHorizonWatchDigest": watch_digest,
                "classification": classification,
                "severity": q.OFFICER_SEVERITY,
                "decision": q.OFFICER_ACTION,
                "reviewedAtMs": 1_601_000,
            },
        )
        officer_digest = _digest(officer["payload"])
    masters = {}
    for master in q.MASTERS:
        masters[master] = signed(
            keys[master],
            {
                "schema": f"rosevear.ai-hub.ql446.{master}.v1",
                "masterId": master,
                "requestDigest": request_digest,
                "originalIncidentId": link["incident"],
                "priorQl445Digest": prior_digest,
                "ql445ReceiptDigest": link["ql445ReceiptDigest"],
                "threeHorizonWatchDigest": watch_digest,
                "escalationDigest": officer_digest,
                "classification": classification,
                "decision": q.MASTER_REOPEN if reopening else q.MASTER_WATCH,
                "reviewedAtMs": 1_603_000,
            },
        )
    reports_digest = _digest([masters[m]["payload"] for m in q.MASTERS])
    owners = {}
    for role, identity in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        owners[role] = signed(
            keys[role],
            {
                "schema": f"rosevear.ai-hub.ql446.{role}.v1",
                "ownerId": identity,
                "requestDigest": request_digest,
                "originalIncidentId": link["incident"],
                "priorQl445Digest": prior_digest,
                "ql445ReceiptDigest": link["ql445ReceiptDigest"],
                "threeHorizonWatchDigest": watch_digest,
                "threeMasterDigest": reports_digest,
                "escalationDigest": officer_digest,
                "classification": classification,
                "decision": q.OWNER_REOPEN if reopening else q.OWNER_WATCH,
                "reviewedAtMs": 1_606_000,
            },
        )
    adapters = {role: (lambda role=role, **_: deepcopy(evidence[role])) for role in evidence}
    journal = q.ProtectedEscalationJournal337(tmp_path / "private-ql446")

    def read_host(*, horizon, **_):
        return deepcopy(evidence["host" + horizon])

    def read_observer(*, horizon, **_):
        role = {
            "SHORT": "observerShort",
            "MEDIUM": "observerMedium",
            "LONG": "observerLong",
        }[horizon]
        return deepcopy(evidence[role])

    def run():
        return q.review_escalation337(
            Ree(),
            prior,
            request,
            journal,
            pins,
            read_comms_source=adapters["commsSource"],
            read_host=read_host,
            read_observer=read_observer,
            escalation_officer=officer,
            master_reports=masters,
            dual_owners=owners,
            now_ms=1_609_000,
            final_now_ms=1_613_000,
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
        "officer": officer,
        "journal": journal,
        "incident": link["incident"],
    }


@pytest.mark.parametrize(
    ("prior_recurrence", "new_on", "divergence"),
    [(False, False, False), (True, False, False), (False, True, False), (False, False, True)],
)
def test_historical_watch_vs_protected_recurrence(
    monkeypatch, tmp_path, prior_recurrence, new_on, divergence
):
    case = fixture(
        monkeypatch,
        tmp_path,
        prior_recurrence=prior_recurrence,
        new_on=new_on,
        divergence=divergence,
    )
    result = case["run"]()
    opening = prior_recurrence or new_on or divergence
    assert result["accepted"] is True, result
    assert result["state"] == (q.ESCALATION if opening else q.WATCH)
    assert result["recurrenceSuspected"] is opening
    assert result["incidentReopeningEvidenceAdmitted"] is opening
    assert result["classification"] == (
        q.CLASS_DIVERGENCE if divergence else q.CLASS_REOPEN if opening else q.CLASS_WATCH
    )
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert result["physicalReceiverCurrentlyOff"] is False
    assert result["incidentClosed"] is False
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["journal"].read(Ree(), case["incident"], "ESCALATION" if opening else "WATCH")
    assert not case["journal"].read(Ree(), case["incident"], "WATCH" if opening else "ESCALATION")
    assert case["run"]()["accepted"] is False
    cold = q.read_private_escalation337(Ree(), case["journal"], case["incident"])
    assert cold["connection"] == "HOLD"
    assert cold["recurrenceSuspected"] is opening


@pytest.mark.parametrize(
    ("role", "field", "value"),
    [
        ("commsSource", "ql445ReceiptDigest", "a" * 64),
        ("commsSource", "assertedState", "CONNECTED"),
        ("hostSHORT", "hostMachineId", "TEMPLAR"),
        ("hostMEDIUM", "watchdogArmed", False),
        ("hostLONG", "horizon", "MEDIUM"),
        ("hostSHORT", "previousObserverDigest", "0" * 64),
        ("hostMEDIUM", "observedAtMs", 1_588_500),
        ("hostLONG", "observedAtMs", 1_594_000),
        ("hostLONG", "sequence", 1),
        ("observerShort", "hostProbeDigest", "0" * 64),
        ("observerMedium", "previousObserverDigest", "0" * 64),
        ("observerLong", "watchId", "staleWatch"),
        ("observerLong", "observedAtMs", 1_500_000),
    ],
)
def test_tampered_probes_fail_closed(monkeypatch, tmp_path, role, field, value):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"][role]["payload"][field] = value
    result = case["run"]()
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"
    assert case["journal"].read(Ree(), case["incident"], "WATCH") is None


def test_prior_recurrence_cannot_be_downgraded_to_watch(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path, prior_recurrence=True)
    assert case["run"]()["state"] == q.ESCALATION
    assert case["run"]()["accepted"] is False


def test_missing_or_forged_escalation_officer_rejects(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path, new_on=True)
    case["officer"]["payload"]["severity"] = "LOW"
    result = case["run"]()
    assert result["accepted"] is False
    assert result["recurrenceSuspected"] is True
    case = fixture(monkeypatch, tmp_path / "new", divergence=True)
    case["officer"]["payload"]["decision"] = "CONNECTED"
    assert case["run"]()["accepted"] is False


def test_three_master_veto_and_owner_collision(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["masters"]["rosevear-comms-hub"]["payload"]["decision"] = "CONNECTED"
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "owner", new_on=True)
    case["owners"]["ownerReviewer"]["payload"]["ownerId"] = "COLLIDING"
    assert case["run"]()["accepted"] is False


def test_changed_prior_and_one_use_pending_fail(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["prior"]["result445"]["finalReceiptDigest"] = "0" * 64
    assert case["run"]()["accepted"] is False
    assert not case["journal"].directory.exists()
    case = fixture(monkeypatch, tmp_path / "interrupted")
    case["adapters"]["commsSource"] = lambda **_: None
    assert case["run"]()["accepted"] is False
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["run"]()["accepted"] is False


def test_private_symlink_and_mutually_exclusive_terminal(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    outside = tmp_path / "outside"
    outside.mkdir()
    case["journal"].directory.symlink_to(outside, target_is_directory=True)
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "pass")
    assert case["run"]()["accepted"] is True
    assert (
        case["journal"].claim(
            Ree(), case["incident"], "ESCALATION", _digest(case["request"]), "b" * 64
        )
        is None
    )
