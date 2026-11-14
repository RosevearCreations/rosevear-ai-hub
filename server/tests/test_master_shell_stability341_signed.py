"""QL-450 synthetic signed original-host stability and closure veto regressions."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_stability341 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior341 import verify_prior_disposition341
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_disposition340_signed import fixture as fixture449


def fixture(
    monkeypatch, tmp_path, *,
    prior_exception=False, host_on=False, divergence=False,
    locked=True, revoked=True, watchdog=True, observer_isolation=True,
):
    old = fixture449(monkeypatch, tmp_path / "ql449", host_on=prior_exception)
    result = old["run"]()
    assert result["accepted"] is True, result
    prior = {
        "prior448": old["prior"],
        "result449": result,
        "request449": old["request"],
        "journal449": old["journal"],
        "pins449": old["pins"],
        "signed449": old["evidence"],
        "masters449": old["masters"],
        "owners449": old["owners"],
    }
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    verified = verify_prior_disposition341(Ree(), **prior)
    if prior_exception:
        assert verified is None
        return {"prior": prior, "journal": q.ProtectedStabilityJournal341(
            tmp_path / "private-ql450"
        )}
    assert verified is not None
    prior_digest, link = verified
    request = {
        "action": q.ACTION,
        "originalIncidentId": link["incident"],
        "priorQl449Digest": prior_digest,
        "ql449ReceiptDigest": link["ql449ReceiptDigest"],
        "ql449AnchoredDigest": link["ql449AnchoredDigest"],
        "ql449CeremonyId": link["ql449CeremonyId"],
        "previousObserverDigest": link["previousObserverDigest"],
        "reviewId": "QL450UniqueLongHorizonReview",
        "challengeNonce": "QL450FreshScopedChallengeNonce",
    }
    rd = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: k[1:] for role, k in keys.items()}
    source = {
        "schema": "rosevear.ai-hub.ql450.commsSource.v1",
        "requestDigest": rd, "originalIncidentId": link["incident"],
        "priorQl449Digest": prior_digest,
        "ql449ReceiptDigest": link["ql449ReceiptDigest"],
        "ql449AnchoredDigest": link["ql449AnchoredDigest"],
        "incidentStatus": "OPEN_HOLD", "observedAtMs": 1_994_000,
    }
    anchor = {
        "schema": "rosevear.ai-hub.ql450.externalAnchor.v1",
        "requestDigest": rd, "originalIncidentId": link["incident"],
        "ql449ReceiptDigest": link["ql449ReceiptDigest"],
        "ql449AnchoredDigest": link["ql449AnchoredDigest"],
        "sourceDigest": _digest(source), "reviewId": request["reviewId"],
        "challengeNonce": request["challengeNonce"],
        "originalAnchorId": link["ql449AnchorId"],
        "disposition": q.ANCHOR_HISTORY,
        "sequence": link["previousSequence"] + 1,
        "observedAtMs": 1_996_000,
    }
    evidence = {
        "commsSource": signed(keys["commsSource"], source),
        "externalAnchor": signed(keys["externalAnchor"], anchor),
    }
    last_observer = link["previousObserverDigest"]
    last_host = None
    seq = anchor["sequence"]
    host_digests, observer_digests = [], []
    for horizon, moment in zip(
        q.HORIZONS, (2_000_000, 2_012_000, 2_032_000), strict=True
    ):
        state = "ON" if host_on and horizon == "MEDIUM" else "OFF"
        host = {
            "schema": "rosevear.ai-hub.ql450.host.v1",
            "requestDigest": rd, "originalIncidentId": link["incident"],
            "hostMachineId": "DESKTOP-AE894KC",
            "ql449ReceiptDigest": link["ql449ReceiptDigest"],
            "reviewId": request["reviewId"],
            "challengeNonce": request["challengeNonce"],
            "anchorDigest": _digest(anchor), "horizon": horizon,
            "previousHostDigest": last_host,
            "previousObserverDigest": last_observer,
            "receiverState": state, "isolationLock": locked,
            "leaseRevoked": revoked, "watchdogArmed": watchdog,
            "sequence": seq + 1, "observedAtMs": moment,
        }
        observer = {
            "schema": "rosevear.ai-hub.ql450.observer.v1",
            "requestDigest": rd, "originalIncidentId": link["incident"],
            "ql449ReceiptDigest": link["ql449ReceiptDigest"],
            "reviewId": request["reviewId"],
            "challengeNonce": request["challengeNonce"],
            "anchorDigest": _digest(anchor), "horizon": horizon,
            "signedHostDigest": _digest(host),
            "previousObserverDigest": last_observer,
            "receiverState": (
                "ON" if divergence and horizon == "LONG" else state
            ),
            "isolationConfirmed": observer_isolation,
            "sequence": host["sequence"] + 1,
            "observedAtMs": moment + 500,
        }
        evidence["host" + horizon] = signed(keys["host"], host)
        evidence["observer" + horizon] = signed(keys["observer"], observer)
        host_digests.append(_digest(host))
        observer_digests.append(_digest(observer))
        last_host = _digest(host)
        last_observer = _digest(observer)
        seq = observer["sequence"]
    stable = not (
        host_on or divergence or not locked or not revoked
        or not watchdog or not observer_isolation
    )
    classification = q.CLASS_STABLE if stable else q.CLASS_EXCEPTION
    decision = q.DECISION_STABLE if stable else q.DECISION_EXCEPTION
    stability_digest = _digest({
        "prior": prior_digest, "source": _digest(source),
        "anchor": _digest(anchor), "hostDigests": host_digests,
        "observerDigests": observer_digests,
        "classification": classification, "reviewId": request["reviewId"],
    })
    boundary = {
        "schema": "rosevear.ai-hub.ql450.closureAuthority.v1",
        "requestDigest": rd, "originalIncidentId": link["incident"],
        "ql449ReceiptDigest": link["ql449ReceiptDigest"],
        "reviewId": request["reviewId"],
        "challengeNonce": request["challengeNonce"],
        "stabilityEvidenceDigest": stability_digest,
        "classification": classification, "boundaryDecision": q.BOUNDARY,
        "closureAuthorized": False, "activationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "incidentStatus": "OPEN_HOLD", "reviewedAtMs": 2_034_000,
    }
    evidence["closureAuthority"] = signed(keys["closureAuthority"], boundary)
    reports = {}
    for master in q.MASTERS:
        reports[master] = signed(keys[master], {
            "schema": f"rosevear.ai-hub.ql450.{master}.v1",
            "masterId": master, "requestDigest": rd,
            "originalIncidentId": link["incident"],
            "ql449ReceiptDigest": link["ql449ReceiptDigest"],
            "reviewId": request["reviewId"],
            "stabilityEvidenceDigest": stability_digest,
            "closureBoundaryDigest": _digest(boundary),
            "classification": classification,
            "recurrenceDecision": decision,
            "incidentStatus": "OPEN_HOLD", "reviewedAtMs": 2_039_000,
        })
    report_digest = _digest([reports[m]["payload"] for m in q.MASTERS])
    owners = {}
    for role, identity in zip(
        ("owner", "ownerReviewer"), link["ownerIds"], strict=True
    ):
        owners[role] = signed(keys[role], {
            "schema": f"rosevear.ai-hub.ql450.{role}.v1",
            "ownerId": identity, "requestDigest": rd,
            "originalIncidentId": link["incident"],
            "ql449ReceiptDigest": link["ql449ReceiptDigest"],
            "reviewId": request["reviewId"],
            "stabilityEvidenceDigest": stability_digest,
            "closureBoundaryDigest": _digest(boundary),
            "threeMasterDigest": report_digest,
            "classification": classification,
            "recurrenceDecision": decision,
            "incidentStatus": "OPEN_HOLD", "closureAuthorized": False,
            "reviewedAtMs": 2_043_000,
        })
    journal = q.ProtectedStabilityJournal341(tmp_path / "private-ql450")

    def run():
        return q.review_stability341(
            Ree(), prior, request, journal, pins,
            read_comms_source=lambda **_: deepcopy(evidence["commsSource"]),
            read_external_anchor=lambda **_: deepcopy(evidence["externalAnchor"]),
            read_host=lambda *, horizon, **_: deepcopy(evidence["host" + horizon]),
            read_observer=lambda *, horizon, **_: deepcopy(
                evidence["observer" + horizon]
            ),
            read_closure_authority=lambda **_: deepcopy(
                evidence["closureAuthority"]
            ),
            master_reports=reports, dual_owners=owners,
            now_ms=2_047_000, final_now_ms=2_051_000,
        )

    return {
        "run": run, "prior": prior, "request": request, "keys": keys,
        "pins": pins, "evidence": evidence, "masters": reports,
        "owners": owners, "journal": journal, "incident": link["incident"],
    }


@pytest.mark.parametrize(
    ("options", "classification"),
    [
        ({}, q.CLASS_STABLE),
        ({"host_on": True}, q.CLASS_EXCEPTION),
        ({"divergence": True}, q.CLASS_EXCEPTION),
        ({"locked": False}, q.CLASS_EXCEPTION),
        ({"revoked": False}, q.CLASS_EXCEPTION),
        ({"watchdog": False}, q.CLASS_EXCEPTION),
        ({"observer_isolation": False}, q.CLASS_EXCEPTION),
    ],
)
def test_history_only_stable_and_signed_recurrence(
    monkeypatch, tmp_path, options, classification
):
    case = fixture(monkeypatch, tmp_path, **options)
    result = case["run"]()
    assert result["accepted"] is True, result
    assert result["classification"] == classification
    assert result["state"] == (
        q.STABLE if classification == q.CLASS_STABLE else q.EXCEPTION
    )
    assert result["connection"] == "HOLD"
    assert result["incidentClosed"] is False
    assert result["incidentStatus"] == "OPEN"
    assert result["closureAuthorized"] is False
    assert result["activationAuthorized"] is False
    assert result["physicalReceiverCurrentlyOff"] is False
    assert result["historicalEvidenceOnly"] is True
    assert result["independentStabilityReviewAdmitted"] is True
    assert case["run"]()["accepted"] is False
    stage = "STABLE" if classification == q.CLASS_STABLE else "EXCEPTION"
    assert case["journal"].read(Ree(), case["incident"], stage)
    assert q.read_private_stability341(
        Ree(), case["journal"], case["incident"]
    )["connection"] == "HOLD"


@pytest.mark.parametrize(
    ("role", "field", "value"),
    [
        ("commsSource", "incidentStatus", "CLOSED"),
        ("commsSource", "ql449ReceiptDigest", "0" * 64),
        ("externalAnchor", "sourceDigest", "0" * 64),
        ("externalAnchor", "disposition", "CONNECTED"),
        ("externalAnchor", "sequence", 1),
        ("hostSHORT", "hostMachineId", "TEMPLAR"),
        ("hostSHORT", "anchorDigest", "0" * 64),
        ("hostMEDIUM", "observedAtMs", 2_005_000),
        ("hostLONG", "observedAtMs", 2_027_000),
        ("hostLONG", "sequence", 1),
        ("observerSHORT", "signedHostDigest", "0" * 64),
        ("observerMEDIUM", "previousObserverDigest", "0" * 64),
        ("observerLONG", "horizon", "SHORT"),
        ("observerLONG", "observedAtMs", 1_700_000),
        ("closureAuthority", "closureAuthorized", True),
        ("closureAuthority", "activationAuthorized", True),
        ("closureAuthority", "physicalReceiverCurrentlyOff", True),
        ("closureAuthority", "boundaryDecision", "CLOSE_INCIDENT"),
        ("closureAuthority", "stabilityEvidenceDigest", "0" * 64),
    ],
)
def test_tamper_stale_horizon_and_closure_bypass_fail_hold(
    monkeypatch, tmp_path, role, field, value
):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"][role]["payload"][field] = value
    assert case["run"]()["accepted"] is False
    assert case["journal"].read(Ree(), case["incident"], "STABLE") is None


def test_ql449_source_tamper_and_master_owner_veto(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["prior"]["result449"]["finalReceiptDigest"] = "0" * 64
    assert case["run"]()["accepted"] is False
    assert not case["journal"].directory.exists()

    case = fixture(monkeypatch, tmp_path / "master")
    case["masters"]["rosevear-comms-hub"]["payload"][
        "recurrenceDecision"
    ] = "CONNECTED"
    assert case["run"]()["accepted"] is False

    case = fixture(monkeypatch, tmp_path / "owner")
    case["owners"]["ownerReviewer"]["payload"]["closureAuthorized"] = True
    assert case["run"]()["accepted"] is False

    case = fixture(monkeypatch, tmp_path / "pins")
    case["pins"]["closureAuthority"] = case["pins"]["commsSource"]
    assert case["run"]()["accepted"] is False


def test_ql449_prior_exception_and_replay_unsafe_path(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path, prior_exception=True)
    assert case["journal"].directory.exists() is False

    case = fixture(monkeypatch, tmp_path / "pending")
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
    assert case["journal"].claim(
        Ree(), case["incident"], "EXCEPTION", _digest(case["request"]), "a" * 64
    ) is None
