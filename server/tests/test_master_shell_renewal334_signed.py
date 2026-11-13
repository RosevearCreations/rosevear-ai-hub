"""Synthetic QL-443 protected admission, stale-signature and replay coverage."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_renewal334 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior334 import verify_prior_shutdown334
from rosevear_ai_hub.master_shell_shutdown333 import EXPIRED
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_shutdown333_signed import fixture as fixture442


def fixture(monkeypatch, tmp_path, late=False):
    old = fixture442(monkeypatch, tmp_path / "ql442-input", late=late)
    closed = old["run"]()
    assert closed["accepted"], closed
    prior = {
        "prior441": old["prior"],
        "result442": closed,
        "request442": old["request"],
        "journal442": old["journal"],
        "pins442": old["pins"],
        "signed442": old["evidence"],
        "masters442": old["masters"],
        "owners442": old["owners"],
    }
    original = verify_prior_shutdown334(Ree(), **prior)
    assert original is not None
    prior_digest, link = original
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    request = {
        "action": q.ACTION,
        "renewalNonce": "ql443IndependentFreshNonce334",
        "originalIncidentId": link["incident"],
        "challengeId": link["challengeId"],
        "leaseId": link["leaseId"],
        "leaseExpiresAtMs": link["leaseExpiresAtMs"],
        "ql442FinalReceiptDigest": link["finalReceiptDigest"],
        "priorQl442Digest": prior_digest,
        "historicalIndependentOffDigest": link["historicalOffDigest"],
    }
    req_digest = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: key[1:] for role, key in keys.items()}
    source = {
        "schema": "rosevear.ai-hub.ql443.commsSource.v1",
        "requestDigest": req_digest,
        "priorQl442Digest": prior_digest,
        "ql442FinalReceiptDigest": link["finalReceiptDigest"],
        "historicalIndependentOffDigest": link["historicalOffDigest"],
        "originalIncidentId": link["incident"],
        "assertedState": "QL442_SIGNED_SHUTDOWN_EVIDENCE_NOT_LIVE_OFF",
        "observedAtMs": 1_430_000,
    }
    platform = {
        "schema": "rosevear.ai-hub.ql443.aiPlatform.v1",
        "requestDigest": req_digest,
        "priorQl442Digest": prior_digest,
        "ql442FinalReceiptDigest": link["finalReceiptDigest"],
        "commsSourceDigest": _digest(source),
        "historicalHostDigest": link["historicalHostDigest"],
        "historicalOffDigest": link["historicalOffDigest"],
        "leaseDisposition": link["leaseDisposition"],
        "classification": (
            "EXPIRED_LEASE_EXCEPTION_HANDOFF_REQUIRED"
            if late
            else "SIGNED_OFF_PILOT_CLOSURE_READY_FOR_DURABLE_ADMISSION"
        ),
        "reviewedAtMs": 1_432_000,
    }
    fresh = {
        "schema": "rosevear.ai-hub.ql443.independentOff.v1",
        "requestDigest": req_digest,
        "originalIncidentId": link["incident"],
        "challengeId": link["challengeId"],
        "leaseId": link["leaseId"],
        "renewalNonce": request["renewalNonce"],
        "aiPlatformDigest": _digest(platform),
        "historicalHostDigest": link["historicalHostDigest"],
        "historicalOffDigest": link["historicalOffDigest"],
        "receiverState": "OFF",
        "offSequence": link["historicalOffSequence"] + 1,
        "observedAtMs": 1_434_000,
    }
    reports = {}
    for master in q.MASTERS:
        reports[master] = signed(
            keys[master],
            {
                "schema": f"rosevear.ai-hub.ql443.{master}.v1",
                "masterId": master,
                "requestDigest": req_digest,
                "originalIncidentId": link["incident"],
                "aiPlatformDigest": _digest(platform),
                "freshIndependentOffDigest": _digest(fresh),
                "leaseDisposition": link["leaseDisposition"],
                "decision": q.MASTER_LATE if late else q.MASTER_ADMIT,
                "reviewedAtMs": 1_438_000,
            },
        )
    masters_digest = _digest([reports[m]["payload"] for m in q.MASTERS])
    owners = {}
    for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        owners[role] = signed(
            keys[role],
            {
                "schema": f"rosevear.ai-hub.ql443.{role}.v1",
                "ownerId": owner_id,
                "requestDigest": req_digest,
                "originalIncidentId": link["incident"],
                "aiPlatformDigest": _digest(platform),
                "freshIndependentOffDigest": _digest(fresh),
                "threeMasterDigest": masters_digest,
                "decision": q.OWNER_LATE if late else q.OWNER_ADMIT,
                "reviewedAtMs": 1_442_000,
            },
        )
    evidence = {
        "commsSource": signed(keys["commsSource"], source),
        "aiPlatform": signed(keys["aiPlatform"], platform),
        "independentOff": signed(keys["independentOff"], fresh),
    }
    adapters = {role: (lambda role=role, **_: deepcopy(evidence[role])) for role in evidence}
    journal = q.ProtectedRenewalJournal334(tmp_path / "private-ql443")

    def run():
        return q.review_renewal334(
            Ree(),
            prior,
            request,
            journal,
            pins,
            read_comms_source=adapters["commsSource"],
            read_ai_platform=adapters["aiPlatform"],
            read_fresh_independent_off=adapters["independentOff"],
            master_reports=reports,
            dual_owners=owners,
            now_ms=1_450_000,
            final_now_ms=1_455_000,
        )

    return {
        "run": run,
        "prior": prior,
        "request": request,
        "evidence": evidence,
        "keys": keys,
        "pins": pins,
        "adapters": adapters,
        "masters": reports,
        "owners": owners,
        "journal": journal,
        "incident": link["incident"],
        "link": link,
    }


@pytest.mark.parametrize("late", [False, True])
def test_signed_on_time_admitted_or_late_exception_open(monkeypatch, tmp_path, late):
    case = fixture(monkeypatch, tmp_path, late=late)
    status = case["run"]()
    assert status["accepted"] is True, status
    assert status["state"] == (q.EXCEPTION if late else q.ADMITTED)
    assert status["leaseDisposition"] == (EXPIRED if late else "ON_TIME")
    assert status["leaseExceptionOpen"] is late
    assert status["custodyAccepted"] is True
    assert status["masterCount"] == 3
    assert status["physicalReceiverCurrentlyOff"] is False
    assert status["freshPhysicalOffProven"] is False
    assert status["incidentClosed"] is False
    assert status["connection"] == "HOLD"
    assert status["activationAuthorized"] is False
    stage = "EXCEPTION" if late else "ADMITTED"
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["journal"].read(Ree(), case["incident"], stage)
    assert case["run"]()["accepted"] is False  # one-use
    reboot = q.read_private_renewal334(Ree(), case["journal"], case["incident"])
    assert reboot["connection"] == "HOLD"
    assert reboot["freshPhysicalOffProven"] is False
    assert "HISTORICAL" in reboot["state"] or late


@pytest.mark.parametrize(
    ("role", "key", "bad"),
    [
        ("commsSource", "assertedState", "CONNECTED"),
        ("commsSource", "ql442FinalReceiptDigest", "0" * 64),
        ("aiPlatform", "classification", "CONNECTED"),
        ("aiPlatform", "leaseDisposition", "EXPIRED_EXCEPTION"),
        ("independentOff", "receiverState", "ON"),
        ("independentOff", "offSequence", 1),
        ("independentOff", "renewalNonce", "replayedHistoricalNonce"),
        ("independentOff", "historicalOffDigest", "0" * 64),
        ("independentOff", "observedAtMs", 1_335_000),
    ],
)
def test_tampered_or_forged_evidence_fails_closed(monkeypatch, tmp_path, role, key, bad):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"][role]["payload"][key] = bad
    result = case["run"]()
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"
    assert not case["journal"].read(Ree(), case["incident"], "ADMITTED")


def test_missing_master_colluding_owner_and_late_reclassification(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    del case["masters"]["rosevear-comms-hub"]
    assert not case["run"]()["accepted"]
    case = fixture(monkeypatch, tmp_path / "owners")
    case["owners"]["ownerReviewer"]["payload"]["ownerId"] = case["link"]["ownerIds"][0]
    assert not case["run"]()["accepted"]
    case = fixture(monkeypatch, tmp_path / "late", late=True)
    body = case["masters"]["rosevear-ai-hub"]["payload"]
    body["decision"] = q.MASTER_ADMIT
    case["masters"]["rosevear-ai-hub"] = signed(case["keys"]["rosevear-ai-hub"], body)
    assert not case["run"]()["accepted"]


def test_predecessor_drift_and_interrupted_pending_fail_closed(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["prior"]["result442"]["finalReceiptDigest"] = "f" * 64
    assert not case["run"]()["accepted"]
    assert not case["journal"].directory.exists()
    case = fixture(monkeypatch, tmp_path / "interrupt")
    case["adapters"]["commsSource"] = lambda **_: None
    assert not case["run"]()["accepted"]
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert not case["run"]()["accepted"]


def test_symlink_and_both_terminal_stages_rejected(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    target = tmp_path / "external"
    target.mkdir()
    case["journal"].directory.symlink_to(target, target_is_directory=True)
    assert not case["run"]()["accepted"]
    case = fixture(monkeypatch, tmp_path / "reboot")
    result = case["run"]()
    assert result["accepted"] is True
    assert (
        case["journal"].claim(
            Ree(),
            case["incident"],
            "EXCEPTION",
            _digest(case["request"]),
            "0" * 64,
        )
        is None
    )
