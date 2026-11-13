"""QL-439 signed synthetic positive and adversarial no-runtime readiness tests."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_readiness330 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_acceptance327 import LATE_HOST, LATE_OFF
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_acceptance329_signed import make_case


def fixture(monkeypatch, tmp_path, disposition=LATE_HOST):
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    run438, closed_journal, _, _, _, _ = make_case(monkeypatch, tmp_path / "prior", disposition)
    closed = run438()
    assert closed["accepted"] is True, closed
    prior = run438.prior437
    history = run438.history
    incident = run438.incident_id
    request438 = run438.request438
    signed438 = run438.signed438
    keys438 = run438.pins438
    old_anchor = _digest(signed438["anchor"]["payload"])
    old_reader = _digest(signed438["reader"]["payload"])
    request = {
        "originalIncidentId": incident,
        "previousCeremonyId": prior["nextCeremonyId"],
        "proposedCeremonyId": "freshDistinctCeremony439",
        "proposedEpisodeId": "freshDistinctEpisode439",
        "renewalNonce": "brandNewRandomNonce439Synthetic",
        "ql438ClosedReceiptDigest": closed["closedReceiptDigest"],
        "ql438AnchorDigest": old_anchor,
        "ql438ReaderDigest": old_reader,
        "sourceRevision": request438["sourceRevision"],
        "controllerRevision": request438["controllerRevision"],
        "oldLeaseExpiresAt": history.ql435["leaseExpiresAt"],
        "action": "RENEW_CORRECTIVE_ANCHOR_PREPARE_ONLY_NO_ACTIVATION",
    }
    digest = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: key[1:] for role, key in keys.items()}
    anchor = {
        "schema": "rosevear.ai-hub.ql439.anchor.v1",
        "requestDigest": digest,
        "previousAnchorDigest": old_anchor,
        "previousReaderDigest": old_reader,
        "renewalNonce": request["renewalNonce"],
        "ceremonyId": request["proposedCeremonyId"],
        "episodeId": request["proposedEpisodeId"],
        "immutable": True,
        "externalStoreId": "synthetic-separate-immutable-store",
        "anchorSequence": 51,
    }
    reader = {
        "schema": "rosevear.ai-hub.ql439.reader.v1",
        "requestDigest": digest,
        "renewalNonce": request["renewalNonce"],
        "anchorDigest": _digest(anchor),
        "externalStoreId": anchor["externalStoreId"],
        "durableReadback": True,
        "readbackSequence": 52,
    }
    host = {
        "schema": "rosevear.ai-hub.ql439.host.v1",
        "requestDigest": digest,
        "hostMachineId": "DESKTOP-AE894KC",
        "renewalNonce": request["renewalNonce"],
        "receiverState": "OFF",
        "failClosedShutdownArmed": True,
        "readerDigest": _digest(reader),
        "ceremonyId": request["proposedCeremonyId"],
        "episodeId": request["proposedEpisodeId"],
        "offSequence": 70,
        "observedAtMs": 1_080_000,
    }
    receiver = {
        "schema": "rosevear.ai-hub.ql439.receiver.v1",
        "requestDigest": digest,
        "renewalNonce": request["renewalNonce"],
        "hostOffDigest": _digest(host),
        "readerDigest": _digest(reader),
        "receiverState": "OFF",
        "ceremonyId": request["proposedCeremonyId"],
        "episodeId": request["proposedEpisodeId"],
        "offSequence": 71,
        "observedAtMs": 1_090_000,
    }
    masters = {}
    for name in q.MASTERS:
        masters[name] = signed(
            keys[name],
            {
                "schema": f"rosevear.ai-hub.ql439.{name}.v1",
                "masterId": name,
                "requestDigest": digest,
                "renewalNonce": request["renewalNonce"],
                "ceremonyId": request["proposedCeremonyId"],
                "episodeId": request["proposedEpisodeId"],
                "readerDigest": _digest(reader),
                "independentOffDigest": _digest(receiver),
                "decision": q.MASTER,
            },
        )
    masters_digest = _digest([masters[n]["payload"] for n in q.MASTERS])
    owners = {}
    for name in ("owner", "ownerReviewer"):
        owners[name] = signed(
            keys[name],
            {
                "schema": f"rosevear.ai-hub.ql439.{name}.v1",
                "ownerId": "ownerA" if name == "owner" else "ownerB",
                "requestDigest": digest,
                "renewalNonce": request["renewalNonce"],
                "readerDigest": _digest(reader),
                "independentOffDigest": _digest(receiver),
                "masterDigest": masters_digest,
                "action": q.PREPARE,
            },
        )
    evidence = {
        "anchor": signed(keys["anchor"], anchor),
        "reader": signed(keys["reader"], reader),
        "host": signed(keys["host"], host),
        "receiver": signed(keys["receiver"], receiver),
    }
    calls = []
    journal = q.ProtectedReadinessJournal330(tmp_path / "ql439-custody")

    def adapter(role):
        def read(**kwargs):
            calls.append(role)
            return deepcopy(evidence[role])

        return read

    def review(*, anchor_adapter=None):
        return q.review_readiness330(
            Ree(),
            prior,
            request438,
            closed,
            closed_journal,
            history,
            signed438,
            keys438,
            request,
            journal,
            pins,
            read_anchor=anchor_adapter or adapter("anchor"),
            read_reader=adapter("reader"),
            read_host_off=adapter("host"),
            read_independent_off=adapter("receiver"),
            master_reports=masters,
            owner_signatures=owners,
            now_ms=1_100_000,
        )

    return {
        "review": review,
        "journal": journal,
        "prior": prior,
        "history": history,
        "request": request,
        "incident": incident,
        "evidence": evidence,
        "owners": owners,
        "masters": masters,
        "keys": keys,
        "calls": calls,
        "closed": closed,
        "input438": {
            "prior437": prior,
            "request438": request438,
            "result438": closed,
            "ql438_journal": closed_journal,
            "historical": history,
            "signed438": signed438,
            "pins438": keys438,
        },
    }


@pytest.mark.parametrize("disposition", [LATE_HOST, LATE_OFF])
def test_signed_readiness_both_closed_lease_causes(monkeypatch, tmp_path, disposition):
    case = fixture(monkeypatch, tmp_path, disposition)
    outcome = case["review"]()
    assert outcome["accepted"] is True, outcome
    assert outcome["state"] == q.READY
    assert outcome["connection"] == "HOLD"
    assert outcome["activationAuthorized"] is False
    assert outcome["ownerAcceptance"] == "DUAL_SIGNED_NEW_CEREMONY_PREPARATION_ONLY"
    assert outcome["receiver"] == "OFF_VERIFIED_POST_REMEDIATION_INDEPENDENT_READBACK"
    assert case["calls"] == ["anchor", "reader", "host", "receiver"]
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["journal"].read(Ree(), case["incident"], "READINESS")
    assert case["review"]()["accepted"] is False
    restart = q.private_readback330(Ree(), case["journal"], case["incident"])
    assert restart["connection"] == "HOLD"
    assert restart["activationAuthorized"] is False
    assert restart["receiver"] == q.UNKNOWN
    assert restart["protectedReadinessPresent"] is True


@pytest.mark.parametrize(
    ("role", "field", "value"),
    [
        ("anchor", "previousAnchorDigest", "f" * 64),
        ("anchor", "immutable", False),
        ("reader", "durableReadback", False),
        ("reader", "anchorDigest", "f" * 64),
        ("host", "hostMachineId", "TEMPLAR"),
        ("host", "receiverState", "ON"),
        ("host", "failClosedShutdownArmed", False),
        ("receiver", "receiverState", "ON"),
        ("receiver", "offSequence", 69),
        ("receiver", "hostOffDigest", "0" * 64),
        ("receiver", "observedAtMs", 1_200_000),
    ],
)
def test_forged_or_wrong_signed_witness_consumes_pending(monkeypatch, tmp_path, role, field, value):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"][role]["payload"][field] = value
    result = case["review"]()
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["journal"].read(Ree(), case["incident"], "READINESS") is None


def test_missing_master_and_owner_activation_prohibited(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    del case["masters"]["ai-data-platform"]
    assert case["review"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "owner-case")
    case["owners"]["owner"]["payload"]["action"] = "ACTIVATE_RECEIVER"
    assert case["review"]()["accepted"] is False


def test_owner_identity_collusion_fails_closed(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    reviewer = case["owners"]["ownerReviewer"]["payload"]
    reviewer["ownerId"] = "ownerA"
    case["owners"]["ownerReviewer"] = signed(case["keys"]["ownerReviewer"], reviewer)
    assert case["review"]()["state"] == "HOLD_QL439_OWNER_IDENTITIES_NOT_DISTINCT"


def test_old_nonce_or_reused_ceremony_rejected_before_pending(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["request"]["proposedCeremonyId"] = case["prior"]["nextCeremonyId"]
    assert case["review"]()["accepted"] is False
    assert not case["journal"].directory.exists()


def test_interruption_consumes_one_use_pending(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)

    def interrupted(**kwargs):
        assert case["journal"].read(Ree(), case["incident"], "PENDING")
        raise OSError("synthetic external-store interruption")

    assert case["review"](anchor_adapter=interrupted)["accepted"] is False
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["journal"].read(Ree(), case["incident"], "READINESS") is None
    assert case["review"]()["accepted"] is False
    assert case["calls"] == []
    restart = q.private_readback330(Ree(), case["journal"], case["incident"])
    assert restart["connection"] == "HOLD"
    assert restart["receiver"] == q.UNKNOWN
    assert restart["protectedReadinessPresent"] is False
