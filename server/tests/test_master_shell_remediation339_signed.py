"""QL-448 synthetic original-host corrective, 30s horizon and HOLD regressions."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_remediation339 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior339 import verify_prior_incident339
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_incident338_signed import fixture as fixture447


def fixture(
    monkeypatch,
    tmp_path,
    *,
    prior_exception=True,
    disposition=None,
    host_on=False,
    divergence=False,
    lease_revoked=True,
    locked=True,
    watchdog=True,
    observer_isolation=True,
):
    old = fixture447(
        monkeypatch, tmp_path / "ql447", host_on=prior_exception
    )
    result = old["run"]()
    assert result["accepted"] is True, result
    prior = {
        "prior446": old["prior"],
        "result447": result,
        "request447": old["request"],
        "journal447": old["journal"],
        "pins447": old["pins"],
        "signed447": old["evidence"],
        "masters447": old["masters"],
        "owners447": old["owners"],
    }
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    verified = verify_prior_incident339(Ree(), **prior)
    assert verified is not None
    prior_digest, link = verified
    request = {
        "action": q.ACTION,
        "originalIncidentId": link["incident"],
        "priorQl447Digest": prior_digest,
        "ql447ReceiptDigest": link["ql447ReceiptDigest"],
        "ql447FollowUpId": link["followUpId"],
        "priorClassification": link["ql447Classification"],
        "previousObserverDigest": link["previousObserverDigest"],
        "challengeNonce": "QL448FreshOriginalHostLongHorizonNonce",
        "remediationId": "QL448IndependentRemediationCase",
    }
    rd = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: key[1:] for role, key in keys.items()}
    source = {
        "schema": "rosevear.ai-hub.ql448.commsSource.v1",
        "requestDigest": rd,
        "originalIncidentId": link["incident"],
        "priorQl447Digest": prior_digest,
        "ql447ReceiptDigest": link["ql447ReceiptDigest"],
        "ql447Classification": link["ql447Classification"],
        "incidentStatus": "OPEN_HOLD",
        "observedAtMs": 1_630_000,
    }
    if disposition is None:
        disposition = (
            q.OFFICER_COMPLETE if prior_exception else q.OFFICER_CONTINUITY
        )
    officer = {
        "schema": "rosevear.ai-hub.ql448.correctiveOfficer.v1",
        "requestDigest": rd,
        "originalIncidentId": link["incident"],
        "remediationId": request["remediationId"],
        "ql447ReceiptDigest": link["ql447ReceiptDigest"],
        "priorQl447Digest": prior_digest,
        "sourceDigest": _digest(source),
        "disposition": disposition,
        "isolationLock": locked,
        "leaseRevoked": lease_revoked,
        "watchdogArmed": watchdog,
        "observedAtMs": 1_631_000,
    }
    evidence = {
        "commsSource": signed(keys["commsSource"], source),
        "correctiveOfficer": signed(keys["correctiveOfficer"], officer),
    }
    last_observer = link["previousObserverDigest"]
    last_host = None
    seq = link["previousSequence"]
    times = (1_638_000, 1_650_000, 1_672_000)
    host_digests, observer_digests = [], []
    for horizon, moment in zip(q.HORIZONS, times, strict=True):
        state = "ON" if (host_on and horizon == "MEDIUM") else "OFF"
        host = {
            "schema": "rosevear.ai-hub.ql448.host.v1",
            "requestDigest": rd,
            "originalIncidentId": link["incident"],
            "originalHostId": "DESKTOP-AE894KC",
            "challengeNonce": request["challengeNonce"],
            "remediationId": request["remediationId"],
            "ql447ReceiptDigest": link["ql447ReceiptDigest"],
            "officerDigest": _digest(officer),
            "horizon": horizon,
            "previousHostDigest": last_host,
            "previousObserverDigest": last_observer,
            "receiverState": state,
            "isolationLock": locked,
            "leaseRevoked": lease_revoked,
            "watchdogArmed": watchdog,
            "sequence": seq + 1,
            "observedAtMs": moment,
        }
        observer = {
            "schema": "rosevear.ai-hub.ql448.observer.v1",
            "requestDigest": rd,
            "originalIncidentId": link["incident"],
            "challengeNonce": request["challengeNonce"],
            "remediationId": request["remediationId"],
            "ql447ReceiptDigest": link["ql447ReceiptDigest"],
            "horizon": horizon,
            "signedHostDigest": _digest(host),
            "previousObserverDigest": last_observer,
            "receiverState": "ON" if (divergence and horizon == "LONG") else state,
            "isolationConfirmed": observer_isolation,
            "sequence": host["sequence"] + 1,
            "observedAtMs": moment + 500,
        }
        evidence["host" + horizon] = signed(keys["host"], host)
        evidence["observer" + horizon] = signed(keys["observer"], observer)
        host_digests.append(_digest(host))
        observer_digests.append(_digest(observer))
        last_observer = _digest(observer)
        last_host = _digest(host)
        seq = observer["sequence"]
    all_off = not (
        host_on or divergence or not lease_revoked or not locked
        or not watchdog or not observer_isolation
    )
    clear = all_off and officer["disposition"] != q.OFFICER_INCOMPLETE
    corrected = prior_exception and clear
    continuity = not prior_exception and clear
    reviewed = corrected or continuity
    classification = (
        q.CLASS_CORRECTED if corrected else
        q.CLASS_CONTINUITY if continuity else q.CLASS_EXCEPTION
    )
    decision = q.DECISION_REVIEWED if reviewed else q.DECISION_EXCEPTION
    horizon_digest = _digest({
        "prior": prior_digest,
        "source": _digest(source),
        "officer": _digest(officer),
        "hostDigests": host_digests,
        "observerDigests": observer_digests,
        "classification": classification,
        "remediationId": request["remediationId"],
    })
    masters = {}
    for master in q.MASTERS:
        masters[master] = signed(keys[master], {
            "schema": f"rosevear.ai-hub.ql448.{master}.v1",
            "masterId": master,
            "requestDigest": rd,
            "originalIncidentId": link["incident"],
            "remediationId": request["remediationId"],
            "ql447ReceiptDigest": link["ql447ReceiptDigest"],
            "horizonEvidenceDigest": horizon_digest,
            "classification": classification,
            "correctiveDecision": decision,
            "incidentStatus": "OPEN_HOLD",
            "reviewedAtMs": 1_675_000,
        })
    master_digest = _digest([masters[m]["payload"] for m in q.MASTERS])
    owners = {}
    for role, owner_id in zip(
        ("owner", "ownerReviewer"), link["ownerIds"], strict=True
    ):
        owners[role] = signed(keys[role], {
            "schema": f"rosevear.ai-hub.ql448.{role}.v1",
            "ownerId": owner_id,
            "requestDigest": rd,
            "originalIncidentId": link["incident"],
            "remediationId": request["remediationId"],
            "ql447ReceiptDigest": link["ql447ReceiptDigest"],
            "horizonEvidenceDigest": horizon_digest,
            "threeMasterDigest": master_digest,
            "classification": classification,
            "correctiveDecision": decision,
            "incidentStatus": "OPEN_HOLD",
            "reviewedAtMs": 1_678_000,
        })
    journal = q.ProtectedRemediationJournal339(tmp_path / "private-ql448")

    def read_host(*, horizon, **_):
        return deepcopy(evidence["host" + horizon])

    def read_observer(*, horizon, **_):
        return deepcopy(evidence["observer" + horizon])

    def run():
        return q.review_remediation339(
            Ree(), prior, request, journal, pins,
            read_comms_source=lambda **_: deepcopy(evidence["commsSource"]),
            read_corrective_officer=lambda **_: deepcopy(evidence["correctiveOfficer"]),
            read_host=read_host,
            read_observer=read_observer,
            master_reports=masters,
            dual_owners=owners,
            now_ms=1_680_000,
            final_now_ms=1_684_000,
        )

    return {
        "run": run,
        "prior": prior,
        "request": request,
        "pins": pins,
        "keys": keys,
        "evidence": evidence,
        "masters": masters,
        "owners": owners,
        "journal": journal,
        "incident": link["incident"],
    }


@pytest.mark.parametrize(
    ("options", "classification"),
    [
        ({}, q.CLASS_CORRECTED),
        ({"prior_exception": False}, q.CLASS_CONTINUITY),
        ({"disposition": q.OFFICER_INCOMPLETE}, q.CLASS_EXCEPTION),
        ({"host_on": True}, q.CLASS_EXCEPTION),
        ({"divergence": True}, q.CLASS_EXCEPTION),
        ({"lease_revoked": False}, q.CLASS_EXCEPTION),
        ({"locked": False}, q.CLASS_EXCEPTION),
        ({"watchdog": False}, q.CLASS_EXCEPTION),
        ({"observer_isolation": False}, q.CLASS_EXCEPTION),
    ],
)
def test_repaired_exception_historical_continuity_and_signed_unresolved(
    monkeypatch, tmp_path, options, classification
):
    case = fixture(monkeypatch, tmp_path, **options)
    result = case["run"]()
    assert result["accepted"] is True, result
    assert result["classification"] == classification
    reviewed = classification != q.CLASS_EXCEPTION
    assert result["state"] == (q.REVIEWED if reviewed else q.EXCEPTION)
    assert result["exceptionClosurePreconditionsEvidenced"] is (
        classification == q.CLASS_CORRECTED
    )
    assert result["correctiveReviewAdmitted"] is True
    assert result["incidentStatus"] == "OPEN"
    assert result["incidentClosed"] is False
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert result["physicalReceiverCurrentlyOff"] is False
    assert case["run"]()["accepted"] is False
    assert case["journal"].read(
        Ree(), case["incident"], "REVIEWED" if reviewed else "EXCEPTION"
    )
    assert (
        q.read_private_remediation339(Ree(), case["journal"], case["incident"])[
            "connection"
        ]
        == "HOLD"
    )


@pytest.mark.parametrize(
    ("role", "field", "value"),
    [
        ("commsSource", "incidentStatus", "CLOSED"),
        ("commsSource", "ql447ReceiptDigest", "0" * 64),
        ("correctiveOfficer", "disposition", q.OFFICER_CONTINUITY),
        ("correctiveOfficer", "sourceDigest", "0" * 64),
        ("hostSHORT", "originalHostId", "TEMPLAR"),
        ("hostSHORT", "officerDigest", "0" * 64),
        ("hostMEDIUM", "observedAtMs", 1_646_000),
        ("hostLONG", "observedAtMs", 1_661_000),
        ("hostLONG", "sequence", 1),
        ("observerSHORT", "signedHostDigest", "0" * 64),
        ("observerMEDIUM", "previousObserverDigest", "0" * 64),
        ("observerLONG", "horizon", "SHORT"),
        ("observerLONG", "observedAtMs", 1_500_000),
        ("observerLONG", "isolationConfirmed", "yes"),
    ],
)
def test_tampering_wrong_horizon_signer_and_clock_fail_closed(
    monkeypatch, tmp_path, role, field, value
):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"][role]["payload"][field] = value
    result = case["run"]()
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"
    assert case["journal"].read(Ree(), case["incident"], "REVIEWED") is None


def test_ql447_custody_forgery_and_master_owner_veto(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["prior"]["result447"]["finalReceiptDigest"] = "0" * 64
    assert case["run"]()["accepted"] is False
    assert not case["journal"].directory.exists()
    case = fixture(monkeypatch, tmp_path / "master")
    case["masters"]["rosevear-comms-hub"]["payload"]["correctiveDecision"] = "CONNECTED"
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "owner")
    case["owners"]["ownerReviewer"]["payload"]["incidentStatus"] = "CLOSED"
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "pins")
    case["pins"]["correctiveOfficer"] = case["pins"]["commsSource"]
    assert case["run"]()["accepted"] is False


def test_one_use_pending_crash_replay_symlink_and_terminal_collision(
    monkeypatch, tmp_path
):
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
    case = fixture(monkeypatch, tmp_path / "terminal")
    assert case["run"]()["accepted"] is True
    assert (
        case["journal"].claim(
            Ree(), case["incident"], "EXCEPTION", _digest(case["request"]), "a" * 64
        )
        is None
    )
