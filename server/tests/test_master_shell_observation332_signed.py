"""QL-441 synthetic signed GO/veto, independent ON witnesses and fail-closed custody.

Temporary Ed25519 keys and local fake adapters never represent live receiver ON.
"""

from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_decision332 as custody
from rosevear_ai_hub import master_shell_observation332 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_acceptance327 import LATE_HOST, LATE_OFF
from test_master_shell_acceptance322 import Ree, signed, signer
from test_master_shell_issuance331_signed import fixture as fixture440


def fixture(monkeypatch, tmp_path, disposition=LATE_HOST, veto=False):
    base_dir = tmp_path / "original-ql440"
    base_dir.mkdir(parents=True, exist_ok=True)
    earlier = fixture440(monkeypatch, base_dir, disposition)
    issued = earlier["run"]()
    assert issued["accepted"] is True, issued
    prior439 = earlier["prior"]
    signed439 = {
        **prior439["evidence"],
        **prior439["masters"],
        **prior439["owners"],
    }
    keys439 = {role: key[1:] for role, key in prior439["keys"].items()}
    signed440 = {
        **earlier["evidence"],
        **earlier["masters"],
        **earlier["owners"],
    }
    predecessor = {
        "input438": prior439["input438"],
        "readiness439": earlier["ready"],
        "request439": prior439["request"],
        "journal439": prior439["journal"],
        "signed439": signed439,
        "keys439": keys439,
        "issued440": issued,
        "request440": earlier["request"],
        "journal440": earlier["journal"],
        "signed440": signed440,
        "keys440": {role: key[1:] for role, key in earlier["keys"].items()},
    }
    monkeypatch.setattr(q, "_on_ree", lambda _: True)
    monkeypatch.setattr(custody, "_on_ree", lambda _: True)
    request = {
        "action": q.ACTION,
        "challengeId": "freshWitnessChallengeId332",
        "challengeNonce": "freshDistinctWitnessNonce332",
        "leaseId": "boundedIsolatedLease332",
        "originalIncidentId": issued["originalIncidentId"],
        "ceremonyId": issued["ceremonyId"],
        "episodeId": issued["episodeId"],
        "ql440PendingReceiptDigest": issued["pendingReceiptDigest"],
        "ql440IssuedReceiptDigest": issued["issuedReceiptDigest"],
        "ql440IssuerDigest": issued["issuerDigest"],
        "ql440IndependentOffDigest": issued["independentOffDigest"],
        "leaseIssuedAtMs": 1_300_000,
        "leaseExpiresAtMs": 1_350_000,
    }
    digest = _digest(request)
    keys = {role: signer() for role in q.ROLES}
    pins = {role: key[1:] for role, key in keys.items()}
    approvals = {}
    for role, owner_id in (("sourceOwner", "ownerSource332"), ("masterOwner", "ownerMaster332")):
        approvals[role] = signed(
            keys[role],
            {
                "schema": f"rosevear.ai-hub.ql441.{role}.v1",
                "ownerId": owner_id,
                "requestDigest": digest,
                "challengeId": request["challengeId"],
                "challengeNonce": request["challengeNonce"],
                "leaseId": request["leaseId"],
                "ql440IssuerDigest": issued["issuerDigest"],
                "action": q.OWNER_ACTION,
            },
        )
    initial_digest = _digest([approvals[r]["payload"] for r in ("sourceOwner", "masterOwner")])
    consumption = {
        "schema": "rosevear.ai-hub.ql441.consumption.v1",
        "requestDigest": digest,
        "hostMachineId": "DESKTOP-AE894KC",
        "challengeId": request["challengeId"],
        "challengeNonce": request["challengeNonce"],
        "leaseId": request["leaseId"],
        "ql440IssuerDigest": issued["issuerDigest"],
        "initialOwnersDigest": initial_digest,
        "watchdogArmed": True,
        "sequence": 140,
        "observedAtMs": 1_310_000,
    }
    host_on = {
        "schema": "rosevear.ai-hub.ql441.hostOn.v1",
        "requestDigest": digest,
        "hostMachineId": "DESKTOP-AE894KC",
        "challengeId": request["challengeId"],
        "challengeNonce": request["challengeNonce"],
        "leaseId": request["leaseId"],
        "consumptionDigest": _digest(consumption),
        "watchdogArmed": True,
        "receiverState": "ON",
        "sequence": 145,
        "observedAtMs": 1_320_000,
    }
    independent_on = {
        "schema": "rosevear.ai-hub.ql441.receiverOn.v1",
        "requestDigest": digest,
        "challengeId": request["challengeId"],
        "challengeNonce": request["challengeNonce"],
        "leaseId": request["leaseId"],
        "hostOnDigest": _digest(host_on),
        "receiverState": "ON",
        "sequence": 146,
        "observedAtMs": 1_325_000,
    }
    evidence = {
        "consumption": signed(keys["consumption"], consumption),
        "hostOn": signed(keys["hostOn"], host_on),
        "receiverOn": signed(keys["receiverOn"], independent_on),
    }
    master_reports = {}
    for master in q.MASTERS:
        decision = q.NO_GO if veto and master == "ai-data-platform" else q.GO
        master_reports[master] = signed(
            keys[master],
            {
                "schema": f"rosevear.ai-hub.ql441.{master}.v1",
                "masterId": master,
                "requestDigest": digest,
                "challengeId": request["challengeId"],
                "challengeNonce": request["challengeNonce"],
                "leaseId": request["leaseId"],
                "independentOnDigest": _digest(independent_on),
                "decision": decision,
            },
        )
    masters_digest = _digest([master_reports[m]["payload"] for m in q.MASTERS])
    final = {}
    for role, owner in (
        ("finalSourceOwner", "ownerSource332"),
        ("finalMasterOwner", "ownerMaster332"),
    ):
        final[role] = signed(
            keys[role],
            {
                "schema": f"rosevear.ai-hub.ql441.{role}.v1",
                "ownerId": owner,
                "requestDigest": digest,
                "challengeId": request["challengeId"],
                "challengeNonce": request["challengeNonce"],
                "leaseId": request["leaseId"],
                "initialOwnersDigest": initial_digest,
                "independentOnDigest": _digest(independent_on),
                "mastersDigest": masters_digest,
                "action": q.OWNER_NO_GO if veto else q.OWNER_GO,
            },
        )
    ledger = custody.ProtectedWitnessJournal332(tmp_path / "ql441-protected")
    reads = []
    adapters = {}

    def adapter(role):
        def read(**kwargs):
            reads.append(role)
            if role == "issuer":
                return deepcopy(earlier["evidence"]["issuer"])
            return deepcopy(evidence[role])

        return read

    for role in ("issuer", "consumption", "hostOn", "receiverOn"):
        adapters[role] = adapter(role)

    def run(*, now_ms=1_330_000, final_now_ms=1_340_000):
        return q.review_witnessed_on332(
            Ree(),
            predecessor,
            request,
            ledger,
            pins,
            source_owner=approvals["sourceOwner"],
            master_owner=approvals["masterOwner"],
            read_issuer=adapters["issuer"],
            read_consumption=adapters["consumption"],
            read_host_on=adapters["hostOn"],
            read_independent_on=adapters["receiverOn"],
            master_reports=master_reports,
            final_owner_signatures=final,
            now_ms=now_ms,
            final_now_ms=final_now_ms,
        )

    return {
        "run": run,
        "prior": predecessor,
        "issued": issued,
        "request": request,
        "keys": keys,
        "pins": pins,
        "ledger": ledger,
        "approvals": approvals,
        "evidence": evidence,
        "masters": master_reports,
        "final": final,
        "adapters": adapters,
        "reads": reads,
    }


@pytest.mark.parametrize("disposition", [LATE_HOST, LATE_OFF])
@pytest.mark.parametrize("veto", [False, True])
def test_signed_bounded_witness_go_or_master_veto(monkeypatch, tmp_path, disposition, veto):
    case = fixture(monkeypatch, tmp_path, disposition, veto)
    result = case["run"]()
    assert result["accepted"] is True, result
    assert result["state"] == q.CUSTODY
    assert result["decision"] == (q.NO_GO if veto else q.GO)
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert result["receiver"] == custody.UNKNOWN
    assert result["manualReceiverIsolationRequired"] is True
    assert case["reads"] == ["issuer", "consumption", "hostOn", "receiverOn"]
    assert case["ledger"].read(Ree(), result["originalIncidentId"], "PENDING")
    assert case["ledger"].read(Ree(), result["originalIncidentId"], "DECISION")
    assert case["run"]()["accepted"] is False
    reboot = custody.read_private_decision332(
        Ree(), case["ledger"], result["originalIncidentId"]
    )
    assert reboot["connection"] == "HOLD"
    assert reboot["privateDecisionPresent"] is True
    assert reboot["receiver"] == custody.UNKNOWN


@pytest.mark.parametrize(
    ("role", "field", "value"),
    [
        ("consumption", "hostMachineId", "TEMPLAR"),
        ("consumption", "watchdogArmed", False),
        ("consumption", "initialOwnersDigest", "0" * 64),
        ("hostOn", "watchdogArmed", False),
        ("hostOn", "receiverState", "OFF"),
        ("hostOn", "sequence", 130),
        ("receiverOn", "receiverState", "OFF"),
        ("receiverOn", "hostOnDigest", "f" * 64),
        ("receiverOn", "sequence", 130),
        ("receiverOn", "observedAtMs", 1_319_000),
    ],
)
def test_forged_on_evidence_cannot_commit_decision(
    monkeypatch, tmp_path, role, field, value
):
    case = fixture(monkeypatch, tmp_path)
    case["evidence"][role]["payload"][field] = value
    result = case["run"]()
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"
    assert case["ledger"].read(Ree(), case["issued"]["originalIncidentId"], "DECISION") is None


def test_original_issuer_readback_must_be_exact(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["adapters"]["issuer"] = lambda **kwargs: None
    result = case["run"]()
    assert result["accepted"] is False
    assert case["ledger"].read(Ree(), case["issued"]["originalIncidentId"], "PENDING")


def test_prior_ql440_private_receipt_tamper_blocks_pending(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    prior = case["prior"]
    ledger = prior["journal440"]
    incident = case["issued"]["originalIncidentId"]
    path = ledger._path(incident, "ISSUED")
    import json

    value = json.loads(path.read_text())
    value["receiptDigest"] = "f" * 64
    path.write_text(json.dumps(value))
    assert case["run"]()["accepted"] is False
    assert not case["ledger"].directory.exists()


def test_fresh_nonce_and_max_120_second_lease(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    case["request"]["challengeNonce"] = case["issued"]["challengeNonce"]
    assert case["run"]()["accepted"] is False
    assert not case["ledger"].directory.exists()
    case = fixture(monkeypatch, tmp_path / "overlong")
    case["request"]["leaseExpiresAtMs"] = 1_420_001
    assert case["run"]()["accepted"] is False
    assert not case["ledger"].directory.exists()


def test_owner_collusion_and_broadened_action(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    body = case["approvals"]["masterOwner"]["payload"]
    body["ownerId"] = "ownerSource332"
    case["approvals"]["masterOwner"] = signed(case["keys"]["masterOwner"], body)
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "broad")
    body = case["approvals"]["sourceOwner"]["payload"]
    body["action"] = "ACTIVATE_RECEIVER"
    case["approvals"]["sourceOwner"] = signed(case["keys"]["sourceOwner"], body)
    assert case["run"]()["accepted"] is False


def test_single_master_veto_requires_both_final_owner_no_go(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path, veto=True)
    body = case["final"]["finalMasterOwner"]["payload"]
    body["action"] = q.OWNER_GO
    case["final"]["finalMasterOwner"] = signed(
        case["keys"]["finalMasterOwner"], body
    )
    result = case["run"]()
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"


def test_missing_master_and_expired_final_lease(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)
    del case["masters"]["rosevear-comms-hub"]
    assert case["run"]()["accepted"] is False
    case = fixture(monkeypatch, tmp_path / "expired")
    assert case["run"](final_now_ms=1_350_000)["accepted"] is False


def test_interrupt_consumes_pending_and_blocks_replay(monkeypatch, tmp_path):
    case = fixture(monkeypatch, tmp_path)

    def interrupted(**kwargs):
        incident = case["issued"]["originalIncidentId"]
        assert case["ledger"].read(Ree(), incident, "PENDING")
        raise OSError("signed original-host consumption unavailable")

    case["adapters"]["consumption"] = interrupted
    result = case["run"]()
    assert result["accepted"] is False
    assert case["ledger"].read(Ree(), case["issued"]["originalIncidentId"], "PENDING")
    assert case["ledger"].read(Ree(), case["issued"]["originalIncidentId"], "DECISION") is None
    assert case["run"]()["accepted"] is False
