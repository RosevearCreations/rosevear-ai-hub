"""Build 342 / QL451 synthetic signed response and private custody tests."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_renewal342 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_prior342 import verify_prior_stability342
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_stability341_signed import fixture as fixture450


def fixture(
    monkeypatch, tmp_path, *,
    prior_exception=False, response_unresolved=False,
    host_on=False, divergence=False, locked=True, lease_revoked=True,
    watchdog=True, isolation_confirmed=True,
):
    old = fixture450(monkeypatch, tmp_path / "ql450", host_on=prior_exception)
    result = old["run"]()
    assert result["accepted"] is True, result
    prior = {
        "prior449": old["prior"],
        "result450": result,
        "request450": old["request"],
        "journal450": old["journal"],
        "pins450": old["pins"],
        "signed450": old["evidence"],
        "masters450": old["masters"],
        "owners450": old["owners"],
    }
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    checked = verify_prior_stability342(Ree(), **prior)
    assert checked is not None, result
    prior_digest, link = checked
    request = {
        "action": q.ACTION,
        "originalIncidentId": link["incident"],
        "priorQl450Digest": prior_digest,
        "ql450ReceiptDigest": link["ql450ReceiptDigest"],
        "ql450StabilityDigest": link["ql450StabilityDigest"],
        "ql450BoundaryDigest": link["ql450BoundaryDigest"],
        "priorClassification": link["priorClassification"],
        "previousObserverDigest": link["previousObserverDigest"],
        "renewalId": "QL451FreshProtectedHistoricalRenewal",
        "challengeNonce": "QL451FreshOriginalWindowsNonce",
    }
    rd = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: key[1:] for role, key in keys.items()}
    source = {
        "schema": "rosevear.ai-hub.ql451.commsSource.v1",
        "requestDigest": rd, "originalIncidentId": link["incident"],
        "priorQl450Digest": prior_digest,
        "ql450ReceiptDigest": link["ql450ReceiptDigest"],
        "ql450StabilityDigest": link["ql450StabilityDigest"],
        "priorClassification": link["priorClassification"],
        "incidentStatus": "OPEN_HOLD", "observedAtMs": 2_100_000,
    }
    officer = {
        "schema": "rosevear.ai-hub.ql451.responseOfficer.v1",
        "requestDigest": rd, "originalIncidentId": link["incident"],
        "ql450ReceiptDigest": link["ql450ReceiptDigest"],
        "sourceDigest": _digest(source),
        "renewalId": request["renewalId"],
        "challengeNonce": request["challengeNonce"],
        "responseDisposition": (
            q.RESPONSE_UNRESOLVED if response_unresolved else
            q.RESPONSE_COMPLETE if prior_exception else q.RESPONSE_CONTINUITY
        ),
        "isolationLock": locked, "leaseRevoked": lease_revoked,
        "watchdogArmed": watchdog, "observedAtMs": 2_102_000,
    }
    anchor = {
        "schema": "rosevear.ai-hub.ql451.externalAnchor.v1",
        "requestDigest": rd, "originalIncidentId": link["incident"],
        "ql450ReceiptDigest": link["ql450ReceiptDigest"],
        "sourceDigest": _digest(source), "responseDigest": _digest(officer),
        "renewalId": request["renewalId"],
        "challengeNonce": request["challengeNonce"],
        "disposition": q.ANCHOR_DISPOSITION,
        "anchorId": "QL451IndependentExternalAnchor",
        "sequence": link["previousSequence"] + 1,
        "observedAtMs": 2_104_000,
    }
    evidence = {
        "commsSource": signed(keys["commsSource"], source),
        "responseOfficer": signed(keys["responseOfficer"], officer),
        "externalAnchor": signed(keys["externalAnchor"], anchor),
    }
    host_digests, witness_digests = [], []
    prev_host, prev_witness = None, link["previousObserverDigest"]
    seq = anchor["sequence"]
    for horizon, moment in zip(
        q.HORIZONS, (2_108_000, 2_120_000, 2_140_000), strict=True
    ):
        state = "ON" if host_on and horizon == "MEDIUM" else "OFF"
        host = {
            "schema": "rosevear.ai-hub.ql451.host.v1",
            "requestDigest": rd, "originalIncidentId": link["incident"],
            "hostMachineId": "DESKTOP-AE894KC",
            "ql450ReceiptDigest": link["ql450ReceiptDigest"],
            "renewalId": request["renewalId"],
            "challengeNonce": request["challengeNonce"],
            "responseDigest": _digest(officer),
            "anchorDigest": _digest(anchor), "horizon": horizon,
            "previousHostDigest": prev_host,
            "previousObserverDigest": prev_witness,
            "receiverState": state, "isolationLock": locked,
            "leaseRevoked": lease_revoked, "watchdogArmed": watchdog,
            "sequence": seq + 1, "observedAtMs": moment,
        }
        witness = {
            "schema": "rosevear.ai-hub.ql451.observer.v1",
            "requestDigest": rd, "originalIncidentId": link["incident"],
            "ql450ReceiptDigest": link["ql450ReceiptDigest"],
            "renewalId": request["renewalId"],
            "challengeNonce": request["challengeNonce"],
            "anchorDigest": _digest(anchor), "horizon": horizon,
            "signedHostDigest": _digest(host),
            "previousObserverDigest": prev_witness,
            "receiverState": "ON" if divergence and horizon == "LONG" else state,
            "isolationConfirmed": isolation_confirmed,
            "sequence": host["sequence"] + 1,
            "observedAtMs": moment + 500,
        }
        evidence["host" + horizon] = signed(keys["host"], host)
        evidence["observer" + horizon] = signed(keys["observer"], witness)
        host_digests.append(_digest(host))
        witness_digests.append(_digest(witness))
        prev_host, prev_witness = _digest(host), _digest(witness)
        seq = witness["sequence"]
    renewed = not any((
        response_unresolved, host_on, divergence, not locked,
        not lease_revoked, not watchdog, not isolation_confirmed,
    ))
    classification = q.CLASS_RENEWED if renewed else q.CLASS_EXCEPTION
    decision = q.DECISION_RENEWED if renewed else q.DECISION_EXCEPTION
    renewal_digest = _digest({
        "prior": prior_digest, "source": _digest(source),
        "response": _digest(officer), "anchor": _digest(anchor),
        "hostDigests": host_digests, "observerDigests": witness_digests,
        "classification": classification, "renewalId": request["renewalId"],
    })
    boundary = {
        "schema": "rosevear.ai-hub.ql451.closureAuthority.v1",
        "requestDigest": rd, "originalIncidentId": link["incident"],
        "ql450ReceiptDigest": link["ql450ReceiptDigest"],
        "renewalId": request["renewalId"],
        "challengeNonce": request["challengeNonce"],
        "renewalEvidenceDigest": renewal_digest,
        "classification": classification, "boundaryDecision": q.BOUNDARY,
        "closureAuthorized": False, "activationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "incidentStatus": "OPEN_HOLD", "reviewedAtMs": 2_142_000,
    }
    evidence["closureAuthority"] = signed(keys["closureAuthority"], boundary)
    masters = {}
    for master in q.MASTERS:
        masters[master] = signed(keys[master], {
            "schema": f"rosevear.ai-hub.ql451.{master}.v1",
            "masterId": master, "requestDigest": rd,
            "originalIncidentId": link["incident"],
            "ql450ReceiptDigest": link["ql450ReceiptDigest"],
            "renewalId": request["renewalId"],
            "renewalEvidenceDigest": renewal_digest,
            "closureBoundaryDigest": _digest(boundary),
            "classification": classification,
            "reassessmentDecision": decision,
            "incidentStatus": "OPEN_HOLD", "reviewedAtMs": 2_145_000,
        })
    report_digest = _digest([masters[m]["payload"] for m in q.MASTERS])
    owners = {}
    for role, identity in zip(
        ("owner", "ownerReviewer"), link["ownerIds"], strict=True
    ):
        owners[role] = signed(keys[role], {
            "schema": f"rosevear.ai-hub.ql451.{role}.v1",
            "ownerId": identity, "requestDigest": rd,
            "originalIncidentId": link["incident"],
            "ql450ReceiptDigest": link["ql450ReceiptDigest"],
            "renewalId": request["renewalId"],
            "renewalEvidenceDigest": renewal_digest,
            "closureBoundaryDigest": _digest(boundary),
            "threeMasterDigest": report_digest,
            "classification": classification,
            "reassessmentDecision": decision,
            "incidentStatus": "OPEN_HOLD", "closureAuthorized": False,
            "reviewedAtMs": 2_149_000,
        })
    journal = q.ProtectedRenewalJournal342(tmp_path / "private-ql451")

    def run():
        return q.review_renewal342(
            Ree(), prior, request, journal, pins,
            read_comms_source=lambda **_: deepcopy(evidence["commsSource"]),
            read_response_officer=lambda **_: deepcopy(evidence["responseOfficer"]),
            read_external_anchor=lambda **_: deepcopy(evidence["externalAnchor"]),
            read_host=lambda *, horizon, **_: deepcopy(evidence["host" + horizon]),
            read_observer=lambda *, horizon, **_: deepcopy(
                evidence["observer" + horizon]
            ),
            read_closure_authority=lambda **_: deepcopy(
                evidence["closureAuthority"]
            ),
            master_reports=masters, dual_owners=owners,
            now_ms=2_155_000, final_now_ms=2_157_000,
        )

    return {
        "run": run, "prior": prior, "request": request,
        "keys": keys, "pins": pins, "evidence": evidence,
        "masters": masters, "owners": owners,
        "journal": journal, "incident": link["incident"],
    }


@pytest.mark.parametrize(
    ("options", "expected"),
    [
        ({}, q.CLASS_RENEWED),
        ({"prior_exception": True}, q.CLASS_RENEWED),
        ({"prior_exception": True, "response_unresolved": True}, q.CLASS_EXCEPTION),
        ({"host_on": True}, q.CLASS_EXCEPTION),
        ({"divergence": True}, q.CLASS_EXCEPTION),
        ({"locked": False}, q.CLASS_EXCEPTION),
        ({"lease_revoked": False}, q.CLASS_EXCEPTION),
        ({"watchdog": False}, q.CLASS_EXCEPTION),
        ({"isolation_confirmed": False}, q.CLASS_EXCEPTION),
    ],
)
def test_repaired_recurring_and_historical_safe_boundary(
    monkeypatch, tmp_path, options, expected
):
    case = fixture(monkeypatch, tmp_path, **options)
    result = case["run"]()
    assert result["accepted"] is True, result
    assert result["classification"] == expected
    assert result["connection"] == "HOLD"
    assert result["incidentStatus"] == "OPEN"
    assert result["incidentClosed"] is False
    assert result["closureAuthorized"] is False
    assert result["activationAuthorized"] is False
    assert result["physicalReceiverCurrentlyOff"] is False
    assert result["responsePreconditionsEvidenced"] is (
        expected == q.CLASS_RENEWED and options.get("prior_exception") is True
    )
    assert case["run"]()["accepted"] is False
    state = "RENEWED" if expected == q.CLASS_RENEWED else "EXCEPTION"
    assert case["journal"].read(Ree(), case["incident"], state)
    assert q.read_private_renewal342(Ree(), case["journal"], case["incident"])[
        "connection"
    ] == "HOLD"


@pytest.mark.parametrize(
    ("role", "field", "value"),
    [
        ("commsSource", "incidentStatus", "CLOSED"),
        ("commsSource", "ql450ReceiptDigest", "0" * 64),
        ("responseOfficer", "sourceDigest", "0" * 64),
        ("responseOfficer", "responseDisposition", "CONNECTED"),
        ("externalAnchor", "responseDigest", "0" * 64),
        ("externalAnchor", "disposition", "CLOSE_INCIDENT"),
        ("hostSHORT", "hostMachineId", "OTHER"),
        ("hostMEDIUM", "observedAtMs", 2_115_000),
        ("hostLONG", "observedAtMs", 2_135_000),
        ("hostLONG", "sequence", 1),
        ("observerSHORT", "signedHostDigest", "0" * 64),
        ("observerMEDIUM", "previousObserverDigest", "0" * 64),
        ("observerLONG", "horizon", "SHORT"),
        ("closureAuthority", "closureAuthorized", True),
        ("closureAuthority", "physicalReceiverCurrentlyOff", True),
        ("closureAuthority", "boundaryDecision", "AUTO_CLOSE"),
    ],
)
def test_original_signed_tampering_and_stale_evidence_fail_hold(
    monkeypatch, tmp_path, role, field, value
):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"][role]["payload"][field] = value
    assert case["run"]()["accepted"] is False
    assert case["journal"].read(Ree(), case["incident"], "RENEWED") is None


def test_ql450_private_custody_and_master_owner_veto(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["prior"]["result450"]["finalReceiptDigest"] = "0" * 64
    assert case["run"]()["accepted"] is False
    assert not case["journal"].directory.exists()

    case = fixture(monkeypatch, tmp_path / "master")
    case["masters"]["rosevear-comms-hub"]["payload"][
        "reassessmentDecision"
    ] = "ACTIVATE"
    assert case["run"]()["accepted"] is False

    case = fixture(monkeypatch, tmp_path / "owner")
    case["owners"]["ownerReviewer"]["payload"]["closureAuthorized"] = True
    assert case["run"]()["accepted"] is False

    case = fixture(monkeypatch, tmp_path / "pins")
    case["pins"]["responseOfficer"] = case["pins"]["commsSource"]
    assert case["run"]()["accepted"] is False


def test_private_pending_crash_symlink_and_terminal_conflict(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"]["responseOfficer"] = None
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
        Ree(), case["incident"], "EXCEPTION",
        _digest(case["request"]), "a" * 64
    ) is None
