"""Synthetic QL-442 signed ON_TIME and EXPIRED shutdown, never physical OFF."""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_decision333 as custody
from rosevear_ai_hub import master_shell_shutdown333 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_observation332_signed import fixture as fixture441


def fixture(monkeypatch, tmp_path, late=False, veto=False):
    previous_dir = tmp_path / "signed-previous"
    previous_dir.mkdir(parents=True, exist_ok=True)
    old = fixture441(monkeypatch, previous_dir, veto=veto)
    issued = old["run"]()
    assert issued["accepted"] is True, issued
    prior = {
        "prior440": old["prior"],
        "result441": issued,
        "request441": old["request"],
        "journal441": old["ledger"],
        "pins441": old["pins"],
        "approvals441": old["approvals"],
        "signed441": old["evidence"],
        "masters441": old["masters"],
        "final441": old["final"],
    }
    monkeypatch.setattr(q, "_on_ree", lambda monitor: True)
    monkeypatch.setattr(custody, "_on_ree", lambda monitor: True)
    request = {
        "action": q.ACTION,
        "shutdownNonce": "freshShutdownNonceQl442333",
        "originalIncidentId": issued["originalIncidentId"],
        "challengeId": issued["challengeId"],
        "leaseId": issued["leaseId"],
        "leaseExpiresAtMs": issued["leaseExpiresAtMs"],
        "ql441DecisionReceiptDigest": issued["decisionReceiptDigest"],
        "independentOnDigest": issued["independentOnDigest"],
    }
    req_digest = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: key[1:] for role, key in keys.items()}
    source = {
        "schema": "rosevear.ai-hub.ql442.commsSource.v1",
        "requestDigest": req_digest,
        "priorQl441Digest": "OVERRIDE_WITH_REVERIFIED_PRIOR",
        "originalIncidentId": issued["originalIncidentId"],
        "ql441DecisionReceiptDigest": issued["decisionReceiptDigest"],
        "assertedState": "QL441_SIGNED_DECISION_EXISTS_NO_CURRENT_RECEIVER_ASSUMPTION",
        "observedAtMs": 1_333_000,
    }
    from rosevear_ai_hub.master_shell_prior333 import verify_prior_witness333

    prior_data = verify_prior_witness333(Ree(), **prior)
    assert prior_data is not None
    source["priorQl441Digest"] = prior_data[0]
    host = {
        "schema": "rosevear.ai-hub.ql442.host.v1",
        "requestDigest": req_digest,
        "commsSourceDigest": _digest(source),
        "hostMachineId": "DESKTOP-AE894KC",
        "originalIncidentId": issued["originalIncidentId"],
        "challengeId": issued["challengeId"],
        "leaseId": issued["leaseId"],
        "shutdownNonce": request["shutdownNonce"],
        "ql441DecisionReceiptDigest": issued["decisionReceiptDigest"],
        "priorIndependentOnDigest": issued["independentOnDigest"],
        "watchdogArmed": True,
        "receiverState": "OFF",
        "shutdownSequence": 150,
        "shutdownAtMs": 1_351_000 if late else 1_340_000,
    }
    receiver = {
        "schema": "rosevear.ai-hub.ql442.receiver.v1",
        "requestDigest": req_digest,
        "originalIncidentId": issued["originalIncidentId"],
        "challengeId": issued["challengeId"],
        "leaseId": issued["leaseId"],
        "shutdownNonce": request["shutdownNonce"],
        "signedHostShutdownDigest": _digest(host),
        "receiverState": "OFF",
        "offSequence": 151,
        "observedAtMs": 1_355_000 if late else 1_345_000,
    }
    master_reports = {}
    for master in q.MASTERS:
        master_reports[master] = signed(
            keys[master],
            {
                "schema": f"rosevear.ai-hub.ql442.{master}.v1",
                "masterId": master,
                "requestDigest": req_digest,
                "originalIncidentId": issued["originalIncidentId"],
                "hostShutdownDigest": _digest(host),
                "independentOffDigest": _digest(receiver),
                "leaseDisposition": q.EXPIRED if late else q.ON_TIME,
                "decision": q.MASTER_LATE if late else q.MASTER_ON_TIME,
                "reviewedAtMs": 1_356_000,
            },
        )
    master_digest = _digest([master_reports[m]["payload"] for m in q.MASTERS])
    owners = {}
    for role, owner_id in (
        ("owner", "ownerSource332"),
        ("ownerReviewer", "ownerMaster332"),
    ):
        owners[role] = signed(
            keys[role],
            {
                "schema": f"rosevear.ai-hub.ql442.{role}.v1",
                "ownerId": owner_id,
                "requestDigest": req_digest,
                "originalIncidentId": issued["originalIncidentId"],
                "independentOffDigest": _digest(receiver),
                "masterReportsDigest": master_digest,
                "decision": q.OWNER_LATE if late else q.OWNER_ON_TIME,
                "reviewedAtMs": 1_358_000,
            },
        )
    evidence = {
        "commsSource": signed(keys["commsSource"], source),
        "host": signed(keys["host"], host),
        "receiver": signed(keys["receiver"], receiver),
    }
    journal = custody.ProtectedWitnessJournal333(tmp_path / "private-ql442")
    adapters = {}

    for role in evidence:

        def read(role=role, **kwargs):
            return deepcopy(evidence[role])
        adapters[role] = read

    def run():
        return q.review_signed_shutdown333(
            Ree(),
            prior,
            request,
            journal,
            pins,
            read_comms_source=adapters["commsSource"],
            read_host_shutdown=adapters["host"],
            read_independent_off=adapters["receiver"],
            master_reports=master_reports,
            dual_owners=owners,
            now_ms=1_360_000,
            final_now_ms=1_365_000,
        )

    return {
        "run": run,
        "prior": prior,
        "request": request,
        "evidence": evidence,
        "keys": keys,
        "pins": pins,
        "masters": master_reports,
        "owners": owners,
        "adapters": adapters,
        "journal": journal,
        "incident": issued["originalIncidentId"],
    }


@pytest.mark.parametrize("late", [False, True])
@pytest.mark.parametrize("veto", [False, True])
def test_signed_shutdown_on_time_or_expired_with_prior_go_or_veto(
    monkeypatch, tmp_path, late, veto
):
    case = fixture(monkeypatch, tmp_path, late, veto)
    result = case["run"]()
    assert result["accepted"] is True, result
    assert result["state"] == (q.EXCEPTION if late else q.CLOSED)
    assert result["leaseDisposition"] == (q.EXPIRED if late else q.ON_TIME)
    assert result["leaseExceptionOpen"] is late
    assert result["incidentClosed"] is False
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert result["receiver"] == custody.UNKNOWN
    assert result["shutdownEvidenceAccepted"] is True
    stage = "EXCEPTION" if late else "CLOSED"
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["journal"].read(Ree(), case["incident"], stage)
    assert case["run"]()["accepted"] is False
    reboot = custody.read_private_decision333(Ree(), case["journal"], case["incident"])
    assert reboot["receiver"] == custody.UNKNOWN
    assert reboot["connection"] == "HOLD"
    assert "NOT_CURRENT_RECEIVER_OFF" in reboot["state"] or late


@pytest.mark.parametrize(
    ("role", "key", "value"),
    [
        ("commsSource", "assertedState", "CONNECTED"),
        ("commsSource", "ql441DecisionReceiptDigest", "0" * 64),
        ("host", "hostMachineId", "TEMPLAR"),
        ("host", "receiverState", "ON"),
        ("host", "watchdogArmed", False),
        ("host", "shutdownSequence", 1),
        ("host", "priorIndependentOnDigest", "0" * 64),
        ("receiver", "receiverState", "ON"),
        ("receiver", "offSequence", 1),
        ("receiver", "signedHostShutdownDigest", "0" * 64),
    ],
)
def test_forged_source_host_and_receiver_cannot_close(monkeypatch, tmp_path, role, key, value):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"][role]["payload"][key] = value
    status = case["run"]()
    assert status["accepted"] is False
    assert status["connection"] == "HOLD"
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["journal"].read(Ree(), case["incident"], "CLOSED") is None


def test_missing_three_masters_and_owner_collusion_fail_closed(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    del case["masters"]["rosevear-comms-hub"]
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "owner")
    case["owners"]["ownerReviewer"]["payload"]["ownerId"] = "ownerSource332"
    assert case["run"]()["accepted"] is False


def test_prior_ql441_tamper_blocks_pending(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["prior"]["result441"]["decisionReceiptDigest"] = "f" * 64
    assert case["run"]()["accepted"] is False
    assert not case["journal"].directory.exists()


def test_interrupted_signed_source_consumes_pending_and_cannot_replay(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["adapters"]["commsSource"] = lambda **_: None
    assert case["run"]()["accepted"] is False
    assert case["journal"].read(Ree(), case["incident"], "PENDING")
    assert case["run"]()["accepted"] is False
    assert case["journal"].read(Ree(), case["incident"], "CLOSED") is None


def test_late_off_independently_classified_as_open_exception(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path, late=True)
    body = case["masters"]["rosevear-ai-hub"]["payload"]
    body["leaseDisposition"] = q.ON_TIME
    case["masters"]["rosevear-ai-hub"] = signed(case["keys"]["rosevear-ai-hub"], body)
    assert case["run"]()["accepted"] is False
    assert case["journal"].read(Ree(), case["incident"], "CLOSED") is None
