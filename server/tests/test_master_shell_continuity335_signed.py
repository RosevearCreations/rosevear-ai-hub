"""Build 335 QL-444 synthetic signed continuity, remediation and fail-closed tests."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_continuity335 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior335 import verify_prior_renewal335
from rosevear_ai_hub.master_shell_shutdown333 import EXPIRED
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_renewal334_signed import fixture as fixture443


def fixture(monkeypatch, tmp_path, late=False):
    old = fixture443(monkeypatch, tmp_path / "previous", late=late)
    result443 = old["run"]()
    assert result443["accepted"], result443
    prior = {
        "prior442": old["prior"],
        "result443": result443,
        "request443": old["request"],
        "journal443": old["journal"],
        "pins443": old["pins"],
        "signed443": old["evidence"],
        "masters443": old["masters"],
        "owners443": old["owners"],
    }
    verified = verify_prior_renewal335(Ree(), **prior)
    assert verified is not None
    previous_digest, link = verified
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    request = {
        "action": q.ACTION,
        "originalIncidentId": link["incident"],
        "challengeId": link["challengeId"],
        "leaseId": link["leaseId"],
        "priorQl443Digest": previous_digest,
        "ql443FinalReceiptDigest": link["finalReceiptDigest"],
        "previousIndependentOffDigest": link["previousOffDigest"],
        "continuityNonce": "ql444IndependentNewContinuityNonce",
        "watchId": "ql444DistinctWatchIdOne",
    }
    request_digest = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: value[1:] for role, value in keys.items()}
    source = {
        "schema": "rosevear.ai-hub.ql444.commsSource.v1",
        "requestDigest": request_digest,
        "originalIncidentId": link["incident"],
        "priorQl443Digest": previous_digest,
        "ql443FinalReceiptDigest": link["finalReceiptDigest"],
        "previousIndependentOffDigest": link["previousOffDigest"],
        "leaseDisposition": link["leaseDisposition"],
        "assertedState": "HISTORICAL_QL443_EVIDENCE_ONLY_HOLD",
        "observedAtMs": 1_468_000,
    }
    host = {
        "schema": "rosevear.ai-hub.ql444.host.v1",
        "requestDigest": request_digest,
        "sourceDigest": _digest(source),
        "hostMachineId": "DESKTOP-AE894KC",
        "originalIncidentId": link["incident"],
        "challengeId": link["challengeId"],
        "leaseId": link["leaseId"],
        "continuityNonce": request["continuityNonce"],
        "watchId": request["watchId"],
        "previousIndependentOffDigest": link["previousOffDigest"],
        "watchdogArmed": True,
        "receiverState": "OFF",
        "sequence": link["previousOffSequence"] + 1,
        "observedAtMs": 1_474_000,
    }
    sample_one = {
        "schema": "rosevear.ai-hub.ql444.sampleOne.v1",
        "requestDigest": request_digest,
        "originalIncidentId": link["incident"],
        "challengeId": link["challengeId"],
        "leaseId": link["leaseId"],
        "continuityNonce": request["continuityNonce"],
        "watchId": request["watchId"],
        "priorQl443Digest": previous_digest,
        "hostContinuityDigest": _digest(host),
        "receiverState": "OFF",
        "sequence": host["sequence"] + 1,
        "observedAtMs": 1_479_000,
    }
    sample_two = {
        "schema": "rosevear.ai-hub.ql444.sampleTwo.v1",
        "requestDigest": request_digest,
        "originalIncidentId": link["incident"],
        "challengeId": link["challengeId"],
        "leaseId": link["leaseId"],
        "continuityNonce": request["continuityNonce"],
        "watchId": request["watchId"],
        "priorQl443Digest": previous_digest,
        "hostContinuityDigest": _digest(host),
        "previousSampleDigest": _digest(sample_one),
        "receiverState": "OFF",
        "sequence": sample_one["sequence"] + 1,
        "observedAtMs": 1_482_000,
    }
    remediation = None
    remediation_receipt_digest = None
    if late:
        remediation = {}
        for role, owner_id in zip(
            ("remediationOwner", "remediationReviewer"), link["ownerIds"], strict=True
        ):
            remediation[role] = signed(
                keys[role],
                {
                    "schema": f"rosevear.ai-hub.ql444.{role}.v1",
                    "ownerId": owner_id,
                    "requestDigest": request_digest,
                    "originalIncidentId": link["incident"],
                    "ql443ExceptionReceiptDigest": link["finalReceiptDigest"],
                    "secondOffDigest": _digest(sample_two),
                    "action": q.REMEDIATION_DECISION,
                    "remediationId": "ql444FreshRemediationRecordOne",
                    "causeCode": "LEASE_EXPIRED_OFF_OBSERVATION",
                    "correctiveEvidenceSha256": "a" * 64,
                    "reviewedAtMs": 1_485_000,
                },
            )
        rem_digest = _digest(
            [remediation[role]["payload"] for role in ("remediationOwner", "remediationReviewer")]
        )
        remediation_receipt_digest = _digest(
            {
                "incident": link["incident"],
                "stage": "REMEDIATION",
                "requestDigest": request_digest,
                "evidenceDigest": rem_digest,
            }
        )
    masters = {}
    for master in q.MASTERS:
        masters[master] = signed(
            keys[master],
            {
                "schema": f"rosevear.ai-hub.ql444.{master}.v1",
                "masterId": master,
                "requestDigest": request_digest,
                "originalIncidentId": link["incident"],
                "priorQl443Digest": previous_digest,
                "secondOffDigest": _digest(sample_two),
                "remediationReceiptDigest": remediation_receipt_digest,
                "leaseDisposition": link["leaseDisposition"],
                "decision": q.MASTER_DECISION,
                "reviewedAtMs": 1_487_000,
            },
        )
    master_digest = _digest([masters[master]["payload"] for master in q.MASTERS])
    owners = {}
    for role, owner_id in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        owners[role] = signed(
            keys[role],
            {
                "schema": f"rosevear.ai-hub.ql444.{role}.v1",
                "ownerId": owner_id,
                "requestDigest": request_digest,
                "originalIncidentId": link["incident"],
                "priorQl443Digest": previous_digest,
                "commsSourceDigest": _digest(source),
                "secondOffDigest": _digest(sample_two),
                "threeMasterDigest": master_digest,
                "remediationReceiptDigest": remediation_receipt_digest,
                "decision": q.OWNER_REMEDIATED if late else q.OWNER_CLOSE,
                "reviewedAtMs": 1_490_000,
            },
        )
    evidence = {
        "commsSource": signed(keys["commsSource"], source),
        "host": signed(keys["host"], host),
        "sampleOne": signed(keys["sampleOne"], sample_one),
        "sampleTwo": signed(keys["sampleTwo"], sample_two),
    }
    adapters = {
        role: (lambda role=role, **_: deepcopy(evidence[role])) for role in evidence
    }
    journal = q.ProtectedContinuityJournal335(tmp_path / "ql444-private")

    def run():
        return q.review_continuity335(
            Ree(),
            prior,
            request,
            journal,
            pins,
            read_comms_source=adapters["commsSource"],
            read_host_continuity=adapters["host"],
            read_sample_one=adapters["sampleOne"],
            read_sample_two=adapters["sampleTwo"],
            remediation_owners=remediation,
            master_reports=masters,
            final_owners=owners,
            now_ms=1_495_000,
            final_now_ms=1_500_000,
        )

    return {
        "run": run,
        "prior": prior,
        "request": request,
        "keys": keys,
        "pins": pins,
        "evidence": evidence,
        "adapters": adapters,
        "remediation": remediation,
        "masters": masters,
        "owners": owners,
        "journal": journal,
        "incident": link["incident"],
        "link": link,
    }


@pytest.mark.parametrize("late", [False, True])
def test_two_signed_off_samples_close_evidence_only(monkeypatch, tmp_path, late):
    case = fixture(monkeypatch, tmp_path, late)
    outcome = case["run"]()
    assert outcome["accepted"] is True, outcome
    assert outcome["state"] == (q.REMEDIATED if late else q.CLOSED)
    assert outcome["leaseDisposition"] == (EXPIRED if late else "ON_TIME")
    assert outcome["leaseExceptionRemediated"] is late
    assert outcome["incidentEvidenceClosed"] is True
    assert outcome["incidentClosed"] is False
    assert outcome["physicalReceiverCurrentlyOff"] is False
    assert outcome["freshPhysicalOffProven"] is False
    assert outcome["activationAuthorized"] is False
    assert outcome["connection"] == "HOLD"
    assert outcome["masterCount"] == 3
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["journal"].read(Ree(), case["incident"], "CLOSED")
    assert bool(case["journal"].read(Ree(), case["incident"], "REMEDIATION")) is late
    assert case["run"]()["accepted"] is False
    reboot = q.read_private_continuity335(Ree(), case["journal"], case["incident"])
    assert reboot["connection"] == "HOLD"
    assert reboot["incidentClosed"] is False
    assert "NOT_LIVE" in reboot["state"]


@pytest.mark.parametrize(
    ("role", "field", "value"),
    [
        ("commsSource", "assertedState", "CONNECTED"),
        ("commsSource", "ql443FinalReceiptDigest", "0" * 64),
        ("host", "hostMachineId", "TEMPLAR"),
        ("host", "receiverState", "ON"),
        ("host", "watchdogArmed", False),
        ("host", "sequence", 1),
        ("sampleOne", "receiverState", "ON"),
        ("sampleOne", "continuityNonce", "replayedNonce"),
        ("sampleOne", "sequence", 1),
        ("sampleTwo", "receiverState", "ON"),
        ("sampleTwo", "watchId", "wrongWatchId"),
        ("sampleTwo", "previousSampleDigest", "0" * 64),
        ("sampleTwo", "observedAtMs", 1_479_000),
        ("sampleTwo", "sequence", 1),
    ],
)
def test_forged_source_host_or_off_samples_fail_closed(
    monkeypatch, tmp_path, role, field, value
):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"][role]["payload"][field] = value
    result = case["run"]()
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"
    assert case["journal"].read(Ree(), case["incident"], "CLOSED") is None


def test_missing_master_and_owner_impersonation_fail(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    del case["masters"]["rosevear-comms-hub"]
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "owner")
    case["owners"]["ownerReviewer"]["payload"]["ownerId"] = case["link"]["ownerIds"][0]
    assert case["run"]()["accepted"] is False


def test_expired_lease_requires_separate_remediation_custody(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path, late=True)
    case["remediation"]["remediationReviewer"]["payload"]["causeCode"] = "WRONG_CAUSE"
    assert case["run"]()["accepted"] is False
    assert case["journal"].read(Ree(), case["incident"], "CLOSED") is None
    case = fixture(monkeypatch, tmp_path / "missing", late=True)
    case["remediation"].pop("remediationReviewer")
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "tamper", late=True)
    case["masters"]["rosevear-ai-hub"]["payload"]["remediationReceiptDigest"] = None
    assert case["run"]()["accepted"] is False
    assert case["journal"].read(Ree(), case["incident"], "REMEDIATION")


def test_predecessor_drift_and_interrupted_one_use_pending(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["prior"]["result443"]["finalReceiptDigest"] = "f" * 64
    assert case["run"]()["accepted"] is False
    assert not case["journal"].directory.exists()
    case = fixture(monkeypatch, tmp_path / "interrupted")
    case["adapters"]["commsSource"] = lambda **_: None
    assert case["run"]()["accepted"] is False
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["run"]()["accepted"] is False


def test_symlink_and_duplicate_remediation_are_rejected(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    external = tmp_path / "untrusted"
    external.mkdir()
    case["journal"].directory.symlink_to(external, target_is_directory=True)
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "late", late=True)
    outcome = case["run"]()
    assert outcome["accepted"] is True
    assert (
        case["journal"].claim(
            Ree(), case["incident"], "REMEDIATION", _digest(case["request"]), "a" * 64
        )
        is None
    )
