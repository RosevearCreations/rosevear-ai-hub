"""Build 340 QL-449 signed anchored review/exception synthetic regressions.

Generated test signers do not represent physical source enrollment or live OFF.
"""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_disposition340 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior340 import verify_prior_remediation340
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_remediation339_signed import fixture as fixture448


def fixture(
    monkeypatch,
    tmp_path,
    *,
    prior_exception=True,
    host_on=False,
    divergence=False,
    locked=True,
    lease_revoked=True,
    watchdog=True,
    witness_isolation=True,
):
    old = fixture448(monkeypatch, tmp_path / "ql448", prior_exception=prior_exception)
    outcome = old["run"]()
    assert outcome["accepted"] is True, outcome
    prior = {
        "prior447": old["prior"],
        "result448": outcome,
        "request448": old["request"],
        "journal448": old["journal"],
        "pins448": old["pins"],
        "signed448": old["evidence"],
        "masters448": old["masters"],
        "owners448": old["owners"],
    }
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    verified = verify_prior_remediation340(Ree(), **prior)
    if not prior_exception:
        assert verified is None
        return {
            "prior": prior,
            "journal": q.ProtectedDispositionJournal340(tmp_path / "private-ql449"),
        }
    assert verified is not None, "expected original signed QL448 ancestry"
    prior_digest, link = verified
    request = {
        "action": q.ACTION,
        "originalIncidentId": link["incident"],
        "priorQl448Digest": prior_digest,
        "ql448ReceiptDigest": link["ql448ReceiptDigest"],
        "ql448HorizonDigest": link["ql448HorizonDigest"],
        "ql448RemediationId": link["ql448RemediationId"],
        "previousObserverDigest": link["previousObserverDigest"],
        "ceremonyId": "QL449NewIndependentDispositionCeremony",
        "challengeNonce": "QL449NewScopedOriginalHostNonce",
    }
    rd = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: key[1:] for role, key in keys.items()}
    source = {
        "schema": "rosevear.ai-hub.ql449.commsSource.v1",
        "requestDigest": rd,
        "originalIncidentId": link["incident"],
        "priorQl448Digest": prior_digest,
        "ql448ReceiptDigest": link["ql448ReceiptDigest"],
        "ql448HorizonDigest": link["ql448HorizonDigest"],
        "incidentStatus": "OPEN_HOLD",
        "observedAtMs": 1_700_000,
    }
    anchor = {
        "schema": "rosevear.ai-hub.ql449.externalAnchor.v1",
        "requestDigest": rd,
        "originalIncidentId": link["incident"],
        "priorQl448Digest": prior_digest,
        "ql448ReceiptDigest": link["ql448ReceiptDigest"],
        "ql448HorizonDigest": link["ql448HorizonDigest"],
        "sourceDigest": _digest(source),
        "ceremonyId": request["ceremonyId"],
        "challengeNonce": request["challengeNonce"],
        "anchorId": "QL449UniqueIndependentOriginalAnchor",
        "disposition": q.ANCHOR_DISPOSITION,
        "sequence": link["previousSequence"] + 1,
        "observedAtMs": 1_705_000,
    }
    host = {
        "schema": "rosevear.ai-hub.ql449.host.v1",
        "requestDigest": rd,
        "originalIncidentId": link["incident"],
        "hostMachineId": "DESKTOP-AE894KC",
        "ql448ReceiptDigest": link["ql448ReceiptDigest"],
        "ceremonyId": request["ceremonyId"],
        "challengeNonce": request["challengeNonce"],
        "anchorDigest": _digest(anchor),
        "previousObserverDigest": link["previousObserverDigest"],
        "receiverState": "ON" if host_on else "OFF",
        "isolationLock": locked,
        "leaseRevoked": lease_revoked,
        "watchdogArmed": watchdog,
        "sequence": anchor["sequence"] + 1,
        "observedAtMs": 1_710_000,
    }
    witness = {
        "schema": "rosevear.ai-hub.ql449.observer.v1",
        "requestDigest": rd,
        "originalIncidentId": link["incident"],
        "ql448ReceiptDigest": link["ql448ReceiptDigest"],
        "ceremonyId": request["ceremonyId"],
        "challengeNonce": request["challengeNonce"],
        "anchorDigest": _digest(anchor),
        "signedHostDigest": _digest(host),
        "receiverState": "ON" if divergence else host["receiverState"],
        "isolationConfirmed": witness_isolation,
        "sequence": host["sequence"] + 1,
        "observedAtMs": 1_711_000,
    }
    evidence = {
        "commsSource": signed(keys["commsSource"], source),
        "externalAnchor": signed(keys["externalAnchor"], anchor),
        "host": signed(keys["host"], host),
        "observer": signed(keys["observer"], witness),
    }
    historically_off = not any(
        (
            host_on,
            divergence,
            not locked,
            not lease_revoked,
            not watchdog,
            not witness_isolation,
        )
    )
    classification = q.CLASS_REVIEW if historically_off else q.CLASS_EXCEPTION
    decision = q.DECISION_REVIEW if historically_off else q.DECISION_EXCEPTION
    anchored_digest = _digest(
        {
            "prior": prior_digest,
            "source": _digest(source),
            "anchor": _digest(anchor),
            "host": _digest(host),
            "observer": _digest(witness),
            "classification": classification,
            "ceremonyId": request["ceremonyId"],
        }
    )
    masters = {}
    for master in q.MASTERS:
        masters[master] = signed(
            keys[master],
            {
                "schema": f"rosevear.ai-hub.ql449.{master}.v1",
                "masterId": master,
                "requestDigest": rd,
                "originalIncidentId": link["incident"],
                "ceremonyId": request["ceremonyId"],
                "ql448ReceiptDigest": link["ql448ReceiptDigest"],
                "anchoredEvidenceDigest": anchored_digest,
                "classification": classification,
                "disposition": decision,
                "incidentStatus": "OPEN_HOLD",
                "reviewedAtMs": 1_718_000,
            },
        )
    masters_digest = _digest([masters[k]["payload"] for k in q.MASTERS])
    owners = {}
    for role, identity in zip(("owner", "ownerReviewer"), link["ownerIds"], strict=True):
        owners[role] = signed(
            keys[role],
            {
                "schema": f"rosevear.ai-hub.ql449.{role}.v1",
                "ownerId": identity,
                "requestDigest": rd,
                "originalIncidentId": link["incident"],
                "ceremonyId": request["ceremonyId"],
                "ql448ReceiptDigest": link["ql448ReceiptDigest"],
                "anchoredEvidenceDigest": anchored_digest,
                "threeMasterDigest": masters_digest,
                "classification": classification,
                "disposition": decision,
                "incidentStatus": "OPEN_HOLD",
                "reviewedAtMs": 1_725_000,
            },
        )
    journal = q.ProtectedDispositionJournal340(tmp_path / "private-ql449")

    def run():
        return q.review_disposition340(
            Ree(),
            prior,
            request,
            journal,
            pins,
            read_comms_source=lambda **_: deepcopy(evidence["commsSource"]),
            read_external_anchor=lambda **_: deepcopy(evidence["externalAnchor"]),
            read_host=lambda **_: deepcopy(evidence["host"]),
            read_observer=lambda **_: deepcopy(evidence["observer"]),
            master_reports=masters,
            dual_owners=owners,
            now_ms=1_740_000,
            final_now_ms=1_745_000,
        )

    return {
        "run": run,
        "prior": prior,
        "request": request,
        "keys": keys,
        "pins": pins,
        "evidence": evidence,
        "masters": masters,
        "owners": owners,
        "journal": journal,
        "incident": link["incident"],
    }


@pytest.mark.parametrize(
    ("options", "classification"),
    [
        ({}, q.CLASS_REVIEW),
        ({"host_on": True}, q.CLASS_EXCEPTION),
        ({"divergence": True}, q.CLASS_EXCEPTION),
        ({"locked": False}, q.CLASS_EXCEPTION),
        ({"lease_revoked": False}, q.CLASS_EXCEPTION),
        ({"watchdog": False}, q.CLASS_EXCEPTION),
        ({"witness_isolation": False}, q.CLASS_EXCEPTION),
    ],
)
def test_historical_anchored_off_and_signed_exceptions(
    monkeypatch, tmp_path, options, classification
):
    case = fixture(monkeypatch, tmp_path, **options)
    result = case["run"]()
    reviewed = classification == q.CLASS_REVIEW
    assert result["accepted"] is True, result
    assert result["state"] == (q.REVIEW if reviewed else q.EXCEPTION)
    assert result["classification"] == classification
    assert result["independentAnchoredReviewAdmitted"] is True
    assert result["incidentStatus"] == "OPEN"
    assert result["incidentClosed"] is False
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert result["physicalReceiverCurrentlyOff"] is False
    assert result["freshPhysicalOffProven"] is False
    assert case["run"]()["accepted"] is False
    assert case["journal"].read(Ree(), case["incident"], "REVIEW" if reviewed else "EXCEPTION")
    assert (
        q.read_private_disposition340(Ree(), case["journal"], case["incident"])["connection"]
        == "HOLD"
    )


def test_ql448_historical_continuity_without_original_exception_rejected(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path, prior_exception=False)
    assert case["journal"].directory.exists() is False


@pytest.mark.parametrize(
    ("role", "field", "value"),
    [
        ("commsSource", "incidentStatus", "CLOSED"),
        ("commsSource", "ql448HorizonDigest", "0" * 64),
        ("externalAnchor", "sourceDigest", "0" * 64),
        ("externalAnchor", "disposition", "RECEIVER_CONNECTED"),
        ("externalAnchor", "anchorId", "short"),
        ("externalAnchor", "observedAtMs", 1_690_000),
        ("externalAnchor", "sequence", 1),
        ("host", "hostMachineId", "TEMPLAR"),
        ("host", "anchorDigest", "0" * 64),
        ("host", "sequence", 1),
        ("host", "observedAtMs", 1_705_000),
        ("observer", "signedHostDigest", "0" * 64),
        ("observer", "sequence", 1),
        ("observer", "observedAtMs", 1_700_000),
        ("observer", "isolationConfirmed", "yes"),
    ],
)
def test_tampered_source_anchor_host_witness_or_clock_fails_closed(
    monkeypatch, tmp_path, role, field, value
):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"][role]["payload"][field] = value
    outcome = case["run"]()
    assert outcome["accepted"] is False
    assert outcome["connection"] == "HOLD"
    assert case["journal"].read(Ree(), case["incident"], "REVIEW") is None


def test_original_private_ql448_custody_and_governance_veto(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["prior"]["result448"]["finalReceiptDigest"] = "0" * 64
    assert case["run"]()["accepted"] is False
    assert not case["journal"].directory.exists()

    case = fixture(monkeypatch, tmp_path / "masters")
    case["masters"]["rosevear-comms-hub"]["payload"]["disposition"] = "CONNECTED"
    assert case["run"]()["accepted"] is False

    case = fixture(monkeypatch, tmp_path / "owners")
    case["owners"]["ownerReviewer"]["payload"]["incidentStatus"] = "CLOSED"
    assert case["run"]()["accepted"] is False

    case = fixture(monkeypatch, tmp_path / "pins")
    case["pins"]["externalAnchor"] = case["pins"]["commsSource"]
    assert case["run"]()["accepted"] is False


def test_one_use_crash_replay_symlink_and_conflicting_terminal(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"]["externalAnchor"] = None
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
