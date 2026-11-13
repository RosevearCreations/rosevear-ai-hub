"""QL-440 synthetic signed issuance, three-Master consensus and fail-closed custody."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_issuance331 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_acceptance327 import LATE_HOST, LATE_OFF
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_readiness330 import fixture as fixture439


def fixture(monkeypatch, tmp_path, disposition=LATE_HOST):
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    prior = fixture439(monkeypatch, tmp_path / "prior", disposition)
    ready = prior["review"]()
    assert ready["accepted"] is True, ready
    signed439 = {**prior["evidence"], **prior["masters"], **prior["owners"]}
    pins439 = {role: key[1:] for role, key in prior["keys"].items()}
    nonce = "newDistinctQl440CeremonyChallengeNonce"
    request = {
        "action": q.CHALLENGE,
        "originalIncidentId": prior["incident"],
        "ceremonyId": ready["proposedCeremonyId"],
        "episodeId": ready["proposedEpisodeId"],
        "challengeNonce": nonce,
        "pendingReceiptDigest": ready["pendingReceiptDigest"],
        "readinessReceiptDigest": ready["readinessReceiptDigest"],
        "renewedAnchorDigest": _digest(prior["evidence"]["anchor"]["payload"]),
        "independentReaderDigest": _digest(prior["evidence"]["reader"]["payload"]),
    }
    digest = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: key[1:] for role, key in keys.items()}
    host = {
        "schema": "rosevear.ai-hub.ql440.host.v1",
        "requestDigest": digest,
        "hostMachineId": "DESKTOP-AE894KC",
        "receiverState": "OFF",
        "failClosedShutdownArmed": True,
        "challengeNonce": nonce,
        "offSequence": 101,
        "observedAtMs": 1_200_000,
    }
    off = {
        "schema": "rosevear.ai-hub.ql440.receiver.v1",
        "requestDigest": digest,
        "challengeNonce": nonce,
        "hostOffDigest": _digest(host),
        "receiverState": "OFF",
        "offSequence": 102,
        "observedAtMs": 1_210_000,
    }
    masters = {
        master: signed(
            keys[master],
            {
                "schema": f"rosevear.ai-hub.ql440.{master}.v1",
                "masterId": master,
                "requestDigest": digest,
                "challengeNonce": nonce,
                "independentOffDigest": _digest(off),
                "decision": q.MASTER_DECISION,
            },
        )
        for master in q.MASTERS
    }
    masters_digest = _digest([masters[m]["payload"] for m in q.MASTERS])
    owners = {
        role: signed(
            keys[role],
            {
                "schema": f"rosevear.ai-hub.ql440.{role}.v1",
                "ownerId": "ownerA" if role == "owner" else "ownerB",
                "requestDigest": digest,
                "challengeNonce": nonce,
                "independentOffDigest": _digest(off),
                "mastersDigest": masters_digest,
                "decision": q.OWNER_DECISION,
            },
        )
        for role in ("owner", "ownerReviewer")
    }
    owners_digest = _digest([owners[r]["payload"] for r in ("owner", "ownerReviewer")])
    issuer = {
        "schema": "rosevear.ai-hub.ql440.issuer.v1",
        "requestDigest": digest,
        "hostMachineId": "DESKTOP-AE894KC",
        "challengeNonce": nonce,
        "independentOffDigest": _digest(off),
        "mastersDigest": masters_digest,
        "ownersDigest": owners_digest,
        "action": q.ISSUER_DECISION,
    }
    signed_evidence = {
        "host": signed(keys["host"], host),
        "receiver": signed(keys["receiver"], off),
        "issuer": signed(keys["issuer"], issuer),
    }
    journal = q.ProtectedIssuanceJournal331(tmp_path / "issued")
    calls = []

    def adapter(role):
        def read(**kwargs):
            calls.append(role)
            return deepcopy(signed_evidence[role])
        return read

    def run(*, issuer_adapter=None):
        return q.review_issuance331(
            Ree(), prior["input438"], ready, prior["request"], prior["journal"],
            signed439, pins439, request, journal, pins,
            read_host_off=adapter("host"),
            read_independent_off=adapter("receiver"),
            master_reports=masters,
            owner_signatures=owners,
            read_issuer=issuer_adapter or adapter("issuer"),
            now_ms=1_220_000,
        )

    return {
        "run": run, "prior": prior, "ready": ready, "request": request,
        "journal": journal, "masters": masters, "owners": owners,
        "keys": keys, "evidence": signed_evidence, "calls": calls,
    }


@pytest.mark.parametrize("disposition", [LATE_HOST, LATE_OFF])
def test_signed_ql440_challenge_only_after_exact_ql439(monkeypatch, tmp_path, disposition):
    case = fixture(monkeypatch, tmp_path, disposition)
    result = case["run"]()
    assert result["accepted"] is True, result
    assert result["state"] == q.ISSUED
    assert result["ceremonyAuthorizationIssued"] is True
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert case["calls"] == ["host", "receiver", "issuer"]
    assert case["journal"].read(Ree(), case["request"]["originalIncidentId"], "PENDING")
    assert case["journal"].read(Ree(), case["request"]["originalIncidentId"], "ISSUED")
    assert case["run"]()["accepted"] is False
    status = q.private_readback331(Ree(), case["journal"], case["request"]["originalIncidentId"])
    assert status["connection"] == "HOLD"
    assert status["receiver"] == q.UNKNOWN
    assert status["ceremonyAuthorizationIssued"] is False


@pytest.mark.parametrize(
    ("role", "field", "value"),
    [
        ("host", "hostMachineId", "TEMPLAR"),
        ("host", "receiverState", "ON"),
        ("host", "failClosedShutdownArmed", False),
        ("receiver", "receiverState", "ON"),
        ("receiver", "offSequence", 100),
        ("receiver", "hostOffDigest", "f" * 64),
        ("issuer", "action", "ACTIVATE_RECEIVER"),
        ("issuer", "ownersDigest", "0" * 64),
    ],
)
def test_tampered_ql440_signatures_never_issue(
    monkeypatch, tmp_path, role, field, value
):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"][role]["payload"][field] = value
    result = case["run"]()
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert case["journal"].read(Ree(), case["request"]["originalIncidentId"], "PENDING")
    assert case["journal"].read(Ree(), case["request"]["originalIncidentId"], "ISSUED") is None


def test_reused_ql439_nonce_denied_before_pending(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["request"]["challengeNonce"] = case["prior"]["request"]["renewalNonce"]
    assert case["run"]()["accepted"] is False
    assert not case["journal"].directory.exists()


def test_missing_master_or_owner_broadened(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    del case["masters"]["ai-data-platform"]
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "owner")
    case["owners"]["owner"]["payload"]["decision"] = "RECEIVER_ON"
    assert case["run"]()["accepted"] is False


def test_legitimately_signed_colluding_owner_id_rejected(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    body = case["owners"]["ownerReviewer"]["payload"]
    body["ownerId"] = "ownerA"
    case["owners"]["ownerReviewer"] = signed(case["keys"]["ownerReviewer"], body)
    assert case["run"]()["state"] == "HOLD_QL440_OWNER_IDENTITIES_NOT_DISTINCT"


def test_failed_issuer_interruption_consumes_pending(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)

    def interrupted(**kwargs):
        incident = case["request"]["originalIncidentId"]
        assert case["journal"].read(Ree(), incident, "PENDING")
        raise OSError("original host signed issuer unavailable")

    assert case["run"](issuer_adapter=interrupted)["accepted"] is False
    incident = case["request"]["originalIncidentId"]
    assert case["journal"].read(Ree(), incident, "ISSUED") is None
    assert case["run"]()["accepted"] is False
    assert case["calls"] == ["host", "receiver"]
