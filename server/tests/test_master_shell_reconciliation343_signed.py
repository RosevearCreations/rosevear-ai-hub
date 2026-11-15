"""QL-452 independent signed historical QL-451 receipt reconciliation."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_reconciliation343 as q
from test_master_shell_acceptance322 import Ree
from test_master_shell_renewal342_signed import fixture


def review(monkeypatch, tmp_path, **options):
    case = fixture(monkeypatch, tmp_path, **options)
    result = case["run"]()
    assert result["accepted"] is True, result
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    data = {
        "prior450": case["prior"],
        "result451": result,
        "request451": case["request"],
        "journal451": case["journal"],
        "pins451": case["pins"],
        "signed451": case["evidence"],
        "masters451": case["masters"],
        "owners451": case["owners"],
    }
    return data


@pytest.mark.parametrize(
    "options",
    [
        {},
        {"prior_exception": True},
        {"host_on": True},
        {"divergence": True},
        {"response_unresolved": True, "prior_exception": True},
    ],
)
def test_authentic_original_history_stays_open(monkeypatch, tmp_path, options):
    data = review(monkeypatch, tmp_path, **options)
    result = q.reconcile_ql451_outcome343(Ree(), **data)
    assert result["accepted"] is True, result
    assert result["historicalQl451Verified"] is True
    assert result["threeMasterGovernanceVerified"] is True
    assert result["connection"] == "HOLD"
    assert result["incidentStatus"] == "OPEN"
    assert result["incidentClosed"] is False
    assert result["closureAuthorized"] is False
    assert result["activationAuthorized"] is False
    assert result["physicalReceiverCurrentlyOff"] is False
    assert result["followUpClosureVerified"] is False
    assert result["originalHostFollowUp"] == "NOT_VERIFIED_CURRENT_PHYSICAL_OFF"
    assert result["unresolvedException"] is bool(
        options.get("host_on") or options.get("divergence") or options.get("response_unresolved")
    )


@pytest.mark.parametrize(
    "path",
    [
        ("result451", "finalReceiptDigest", "0" * 64),
        ("result451", "physicalReceiverCurrentlyOff", True),
        ("result451", "incidentStatus", "CLOSED"),
        ("request451", "priorQl450Digest", "0" * 64),
        ("request451", "challengeNonce", "QL450SameNonce"),
    ],
)
def test_original_record_tampering_blocks(monkeypatch, tmp_path, path):
    data = review(monkeypatch, tmp_path)
    item, key, value = path
    data[item] = deepcopy(data[item])
    data[item][key] = value
    result = q.reconcile_ql451_outcome343(Ree(), **data)
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"


def test_signed_officer_anchor_host_and_master_changes_fail(monkeypatch, tmp_path):
    for i, role in enumerate(("responseOfficer", "externalAnchor", "hostLONG")):
        data = review(monkeypatch, tmp_path / str(i))
        data["signed451"] = deepcopy(data["signed451"])
        data["signed451"][role]["payload"]["incidentStatus"] = "CLOSED"
        assert q.reconcile_ql451_outcome343(Ree(), **data)["accepted"] is False

    data = review(monkeypatch, tmp_path / "master")
    data["masters451"] = deepcopy(data["masters451"])
    data["masters451"]["rosevear-comms-hub"]["payload"]["reassessmentDecision"] = "CLOSE"
    assert q.reconcile_ql451_outcome343(Ree(), **data)["accepted"] is False

    data = review(monkeypatch, tmp_path / "owner")
    data["owners451"] = deepcopy(data["owners451"])
    data["owners451"]["ownerReviewer"]["payload"]["closureAuthorized"] = True
    assert q.reconcile_ql451_outcome343(Ree(), **data)["accepted"] is False


def test_unreadable_or_conflicting_original_custody_stays_hold(monkeypatch, tmp_path):
    data = review(monkeypatch, tmp_path)
    data["pins451"] = {**data["pins451"], "observer": data["pins451"]["host"]}
    assert q.reconcile_ql451_outcome343(Ree(), **data)["accepted"] is False

    data = review(monkeypatch, tmp_path / "missing")
    data["journal451"] = q.ProtectedRenewalJournal342(tmp_path / "nonexistent")
    assert q.reconcile_ql451_outcome343(Ree(), **data)["accepted"] is False
