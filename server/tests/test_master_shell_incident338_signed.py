"""Build 338 QL-447 signed original-host incident continuity regressions.

Synthetic test signers are never enrolled hardware keys or physical OFF proof.
"""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_incident338 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior338 import verify_prior_escalation338
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_escalation337_signed import fixture as fixture446


def fixture(monkeypatch, tmp_path, *, prior_on=True, host_on=False, divergence=False,
            lease_revoked=True, locked=True, watchdog=True, observer_isolation=True):
    old = fixture446(monkeypatch, tmp_path / "ql446", new_on=prior_on)
    result = old["run"]()
    assert result["accepted"] is True, result
    prior = {
        "prior445": old["prior"], "result446": result, "request446": old["request"],
        "journal446": old["journal"], "pins446": old["pins"],
        "signed446": {
            "commsSource": old["evidence"]["commsSource"],
            "hostSHORT": old["evidence"]["hostSHORT"],
            "hostMEDIUM": old["evidence"]["hostMEDIUM"],
            "hostLONG": old["evidence"]["hostLONG"],
            "observerShort": old["evidence"]["observerShort"],
            "observerMedium": old["evidence"]["observerMedium"],
            "observerLong": old["evidence"]["observerLong"],
        },
        "masters446": old["masters"], "owners446": old["owners"], "officer446": old["officer"],
    }
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    verified = verify_prior_escalation338(Ree(), **prior)
    if not prior_on:
        assert verified is None
        return {"prior": prior, "journal": q.ProtectedIncidentJournal338(tmp_path / "private-ql447")}
    assert verified is not None
    prior_digest, link = verified
    request = {
        "action": q.ACTION, "originalIncidentId": link["incident"],
        "ql446CaseId": link["caseId"], "priorQl446Digest": prior_digest,
        "ql446EscalationReceiptDigest": link["ql446ReceiptDigest"],
        "priorClassification": link["ql446Classification"],
        "previousObserverDigest": link["previousObserverDigest"],
        "challengeId": link["challengeId"], "leaseId": link["leaseId"],
        "challengeNonce": "QL447FreshScopedIncidentNonce",
        "followUpId": "QL447FreshCorrectiveFollowUpId",
    }
    rd = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: key[1:] for role, key in keys.items()}
    source = {
        "schema": "rosevear.ai-hub.ql447.commsSource.v1",
        "requestDigest": rd,
        "originalIncidentId": link["incident"], "ql446CaseId": link["caseId"],
        "priorQl446Digest": prior_digest,
        "ql446EscalationReceiptDigest": link["ql446ReceiptDigest"],
        "priorClassification": link["ql446Classification"],
        "incidentStatus": "OPEN_HOLD", "observedAtMs": 1_620_000,
    }
    host = {
        "schema": "rosevear.ai-hub.ql447.host.v1",
        "requestDigest": rd, "originalIncidentId": link["incident"],
        "ql446EscalationReceiptDigest": link["ql446ReceiptDigest"],
        "ql446CaseId": link["caseId"], "hostMachineId": "DESKTOP-AE894KC",
        "challengeNonce": request["challengeNonce"], "followUpId": request["followUpId"],
        "sourceDigest": _digest(source), "previousObserverDigest": link["previousObserverDigest"],
        "receiverState": "ON" if host_on else "OFF",
        "isolationLock": locked, "leaseRevoked": lease_revoked,
        "watchdogArmed": watchdog, "sequence": link["previousSequence"] + 1,
        "observedAtMs": 1_622_000,
    }
    observer = {
        "schema": "rosevear.ai-hub.ql447.observer.v1",
        "requestDigest": rd, "originalIncidentId": link["incident"],
        "ql446EscalationReceiptDigest": link["ql446ReceiptDigest"],
        "ql446CaseId": link["caseId"],
        "challengeNonce": request["challengeNonce"], "followUpId": request["followUpId"],
        "signedHostDigest": _digest(host),
        "receiverState": "ON" if divergence else host["receiverState"],
        "isolationConfirmed": observer_isolation,
        "sequence": host["sequence"] + 1, "observedAtMs": 1_622_500,
    }
    evidence = {
        "commsSource": signed(keys["commsSource"], source),
        "host": signed(keys["host"], host),
        "observer": signed(keys["observer"], observer),
    }
    confirmed = not (
        host_on or divergence or not lease_revoked or not locked or
        not watchdog or not observer_isolation
    )
    classification = q.CLASS_RECONFIRMED if confirmed else q.CLASS_EXCEPTION
    decision = q.DECISION_RECONFIRMED if confirmed else q.DECISION_EXCEPTION
    digest = _digest({
        "prior": prior_digest, "source": _digest(source),
        "host": _digest(host), "observer": _digest(observer),
        "classification": classification, "followUpId": request["followUpId"],
    })
    masters = {}
    for master in q.MASTERS:
        masters[master] = signed(keys[master], {
            "schema": f"rosevear.ai-hub.ql447.{master}.v1",
            "masterId": master, "requestDigest": rd,
            "originalIncidentId": link["incident"], "followUpId": request["followUpId"],
            "ql446EscalationReceiptDigest": link["ql446ReceiptDigest"],
            "isolationEvidenceDigest": digest, "classification": classification,
            "correctiveDecision": decision, "incidentStatus": "OPEN_HOLD",
            "reviewedAtMs": 1_625_000,
        })
    report_digest = _digest([masters[m]["payload"] for m in q.MASTERS])
    owners = {}
    for role, identity in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        owners[role] = signed(keys[role], {
            "schema": f"rosevear.ai-hub.ql447.{role}.v1",
            "ownerId": identity, "requestDigest": rd,
            "originalIncidentId": link["incident"], "followUpId": request["followUpId"],
            "ql446EscalationReceiptDigest": link["ql446ReceiptDigest"],
            "isolationEvidenceDigest": digest, "threeMasterDigest": report_digest,
            "classification": classification, "correctiveDecision": decision,
            "incidentStatus": "OPEN_HOLD", "reviewedAtMs": 1_628_000,
        })
    journal = q.ProtectedIncidentJournal338(tmp_path / "private-ql447")

    def run():
        return q.review_incident338(
            Ree(), prior, request, journal, pins,
            read_comms_source=lambda **_: deepcopy(evidence["commsSource"]),
            read_host=lambda **_: deepcopy(evidence["host"]),
            read_observer=lambda **_: deepcopy(evidence["observer"]),
            master_reports=masters, dual_owners=owners,
            now_ms=1_630_000, final_now_ms=1_633_000,
        )

    return {
        "run": run, "prior": prior, "request": request, "pins": pins,
        "keys": keys, "evidence": evidence, "masters": masters,
        "owners": owners, "journal": journal, "incident": link["incident"],
    }


@pytest.mark.parametrize("options", [
    {}, {"host_on": True}, {"divergence": True}, {"lease_revoked": False},
    {"locked": False}, {"watchdog": False}, {"observer_isolation": False},
])
def test_signed_isolation_vs_corrective_exception(monkeypatch, tmp_path, options):
    case = fixture(monkeypatch, tmp_path, **options)
    result = case["run"]()
    exception = bool(options)
    assert result["accepted"] is True, result
    assert result["state"] == (q.EXCEPTION if exception else q.RECONFIRMED)
    assert result["classification"] == (
        q.CLASS_EXCEPTION if exception else q.CLASS_RECONFIRMED
    )
    assert result["correctiveFollowUpAdmitted"] is True
    assert result["isolationExceptionSuspected"] is exception
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert result["physicalReceiverCurrentlyOff"] is False
    assert result["incidentStatus"] == "OPEN"
    assert result["incidentClosed"] is False
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["journal"].read(
        Ree(), case["incident"], "EXCEPTION" if exception else "RECONFIRMED"
    )
    assert case["run"]()["accepted"] is False
    assert q.read_private_incident338(Ree(), case["journal"], case["incident"])["connection"] == "HOLD"


def test_ql446_stable_cannot_enter_reopened_incident(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path, prior_on=False)
    assert case["journal"].directory.exists() is False
    assert verify_prior_escalation338(Ree(), **case["prior"]) is None


@pytest.mark.parametrize(("role", "field", "value"), [
    ("commsSource", "incidentStatus", "CLOSED"),
    ("commsSource", "priorClassification", "STABLE"),
    ("host", "hostMachineId", "TEMPLAR"),
    ("host", "challengeNonce", "REUSED"),
    ("host", "sourceDigest", "0" * 64),
    ("host", "observedAtMs", 1_500_000),
    ("host", "sequence", 1),
    ("observer", "signedHostDigest", "0" * 64),
    ("observer", "sequence", 1),
    ("observer", "observedAtMs", 1_500_000),
    ("observer", "isolationConfirmed", "yes"),
])
def test_tampered_or_stale_original_evidence_fails_closed(
    monkeypatch, tmp_path, role, field, value
):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"][role]["payload"][field] = value
    result = case["run"]()
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"
    assert case["journal"].read(Ree(), case["incident"], "RECONFIRMED") is None


def test_prior_receipt_replacement_and_three_master_veto(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["prior"]["result446"]["finalReceiptDigest"] = "0" * 64
    assert case["run"]()["accepted"] is False
    assert not case["journal"].directory.exists()
    case = fixture(monkeypatch, tmp_path / "veto")
    case["masters"]["rosevear-comms-hub"]["payload"]["correctiveDecision"] = "CONNECTED"
    assert case["run"]()["accepted"] is False


def test_dual_owner_veto_and_duplicate_pins(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["owners"]["ownerReviewer"]["payload"]["ownerId"] = "WRONG"
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "pins")
    case["pins"]["ownerReviewer"] = case["pins"]["owner"]
    assert case["run"]()["accepted"] is False


def test_interrupted_pending_is_nonreplayable(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"]["commsSource"] = None
    assert case["run"]()["accepted"] is False
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "symlink")
    outside = tmp_path / "outside"
    outside.mkdir()
    case["journal"].directory.symlink_to(outside, target_is_directory=True)
    assert case["run"]()["accepted"] is False


def test_conflicting_terminal_receipt_is_refused(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    assert case["run"]()["accepted"] is True
    assert case["journal"].claim(
        Ree(), case["incident"], "EXCEPTION", _digest(case["request"]), "a" * 64
    ) is None
