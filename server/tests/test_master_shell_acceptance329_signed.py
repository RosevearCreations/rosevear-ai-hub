"""QL-438 signed synthetic end-to-end: both expired lease classes and denial.

All Ed25519 keys are generated inside tests. These tests make no physical receiver
or off-host custody claims; only the supplied mock adapters are exercised.
"""

import sqlite3
from copy import deepcopy

import pytest

from rosevear_ai_hub import master_shell_acceptance328 as ql437_source
from rosevear_ai_hub import master_shell_acceptance329 as q
from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_acceptance327 import LATE_HOST, LATE_OFF
from test_master_shell_acceptance322 import signed, signer


class LocalMonitor:
    pass


def make_case(monkeypatch, tmp_path, disposition):
    monkeypatch.setattr(q, "_on_ree", lambda monitor: True)
    monkeypatch.setattr(ql437_source, "_on_ree", lambda monitor: True)
    incident = "originalIncidentSynthetic329"
    nonce = "uniqueNonceSynthetic329"
    prior = {
        "accepted": True,
        "state": "DURABLE_QL437_EXPIRED_LEASE_EXCEPTION_OPEN_INDEPENDENT_CUSTODY",
        "leaseExceptionOpen": True,
        "incidentClosureAuthorized": False,
        "connection": "HOLD",
        "activationAuthorized": False,
        "leaseDisposition": disposition,
        "originalIncidentId": incident,
        "nextCeremonyId": "nextCeremonySynthetic329",
        "finalReceiptDigest": "a" * 64,
        "externalAnchorDigest": "b" * 64,
        "independentAnchorReadbackDigest": "c" * 64,
    }
    ql437 = q.ProtectedClosureJournal328(tmp_path / "ql437-predecessor.db")
    export = _digest({"export": "signed-ql437"})
    assert ql437.claim_once(LocalMonitor(), incident, "PENDING", export, export)
    assert ql437.claim_once(
        LocalMonitor(), incident, "FINAL", export, _digest({"final": "signed-ql437"})
    )
    prior["finalReceiptDigest"] = ql437.read(LocalMonitor(), incident, "FINAL")["receiptDigest"]
    request = {
        "remediationNonce": nonce,
        "remediationId": "syntheticRemediation329",
        "originalIncidentId": incident,
        "ql437FinalReceiptDigest": prior["finalReceiptDigest"],
        "ql437AnchorDigest": prior["externalAnchorDigest"],
        "ql437ReaderDigest": prior["independentAnchorReadbackDigest"],
        "leaseDisposition": disposition,
        "rootCause": q.REMEDIES[disposition][0],
        "remedy": q.REMEDIES[disposition][1],
        "sourceRevision": "a" * 40,
        "controllerRevision": "b" * 40,
    }
    req_digest = _digest(request)
    keys = {
        role: signer()
        for role in (
            "host",
            "receiver",
            "remediationReviewer",
            "anchor",
            "reader",
            "owner",
            "ownerReviewer",
            *q.MASTERS,
        )
    }
    pins = {role: (value[1], value[2]) for role, value in keys.items()}
    host = {
        "schema": "rosevear.ai-hub.ql438.host.v1",
        "requestDigest": req_digest,
        "hostMachineId": "DESKTOP-AE894KC",
        "receiverState": "OFF",
        "failClosedShutdownArmed": True,
        "repairSequence": 19,
        "remedy": request["remedy"],
        "observedAtMs": 1_000_000,
    }
    off = {
        "schema": "rosevear.ai-hub.ql438.receiver.v1",
        "requestDigest": req_digest,
        "hostDigest": _digest(host),
        "receiverState": "OFF",
        "offSequence": 20,
        "observedAtMs": 1_001_000,
    }
    reviewer = {
        "schema": "rosevear.ai-hub.ql438.remediationReviewer.v1",
        "requestDigest": req_digest,
        "hostDigest": _digest(host),
        "offDigest": _digest(off),
        "remedy": request["remedy"],
        "reviewedAtMs": 1_002_000,
    }
    master_reports = {}
    for master in q.MASTERS:
        master_reports[master] = signed(
            keys[master],
            {
                "schema": f"rosevear.ai-hub.ql438.{master}.v1",
                "masterId": master,
                "requestDigest": req_digest,
                "offDigest": _digest(off),
                "reviewDigest": _digest(reviewer),
                "decision": q.MASTER_DECISION,
            },
        )
    masters_digest = _digest([master_reports[m]["payload"] for m in q.MASTERS])
    anchor = {
        "schema": "rosevear.ai-hub.ql438.anchor.v1",
        "requestDigest": req_digest,
        "previousAnchorDigest": prior["externalAnchorDigest"],
        "masterDigest": masters_digest,
        "offDigest": _digest(off),
        "externalStoreId": "isolated-immutable-store-329",
        "immutable": True,
        "anchorSequence": 21,
    }
    reader = {
        "schema": "rosevear.ai-hub.ql438.reader.v1",
        "requestDigest": req_digest,
        "anchorDigest": _digest(anchor),
        "externalStoreId": anchor["externalStoreId"],
        "remoteDurable": True,
        "readbackSequence": 22,
    }
    owners = {
        role: signed(
            keys[role],
            {
                "schema": f"rosevear.ai-hub.ql438.{role}.v1",
                "requestDigest": req_digest,
                "readerDigest": _digest(reader),
                "masterDigest": masters_digest,
                "decision": q.DECISION,
            },
        )
        for role in ("owner", "ownerReviewer")
    }
    evidence = {
        role: signed(keys[role], payload)
        for role, payload in (
            ("host", host),
            ("receiver", off),
            ("remediationReviewer", reviewer),
            ("anchor", anchor),
            ("reader", reader),
        )
    }
    journal = q.ProtectedCorrectiveJournal329(tmp_path / "ql438-synthetic.db")
    calls = []

    def adapt(role):
        def read(**kwargs):
            calls.append(role)
            return deepcopy(evidence[role])

        return read

    inputs = {
        "read_host": adapt("host"),
        "read_off": adapt("receiver"),
        "read_reviewer": adapt("remediationReviewer"),
        "read_anchor": adapt("anchor"),
        "read_reader": adapt("reader"),
        "master_reports": master_reports,
        "owner_signatures": owners,
    }

    def run():
        return q.review_corrective_closure329(
            LocalMonitor(), prior, request, journal, pins, ql437_journal=ql437, **inputs
        )

    run.prior_journal = ql437
    return run, journal, evidence, owners, inputs, calls


@pytest.mark.parametrize("disposition", [LATE_HOST, LATE_OFF])
def test_signed_full_chain_both_expired_exception_types(monkeypatch, tmp_path, disposition):
    run, journal, _, _, _, calls = make_case(monkeypatch, tmp_path, disposition)
    result = run()
    assert result["state"] == "DURABLE_QL438_OWNER_GATED_LEASE_EXCEPTION_CLOSURE_READBACK"
    assert result["state"] == "DURABLE_QL438_OWNER_GATED_LEASE_EXCEPTION_CLOSURE_READBACK"
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert result["leaseExceptionOpen"] is False
    assert result["receiver"] == "OFF_VERIFIED_FOR_THIS_SIGNED_REVIEW_ONLY"
    assert calls == ["host", "receiver", "remediationReviewer", "anchor", "reader"]
    assert journal.read(LocalMonitor(), "originalIncidentSynthetic329", "CLOSED")
    assert run()["accepted"] is False


@pytest.mark.parametrize(
    ("role", "mutation"),
    [
        ("host", ("receiverState", "ON")),
        ("host", ("failClosedShutdownArmed", False)),
        ("host", ("hostMachineId", "TEMPLAR")),
        ("receiver", ("receiverState", "ON")),
        ("receiver", ("offSequence", 18)),
        ("remediationReviewer", ("remedy", "UNAPPROVED_REPAIR")),
        ("anchor", ("previousAnchorDigest", "0" * 64)),
        ("anchor", ("immutable", False)),
        ("anchor", ("anchorSequence", 0)),
        ("reader", ("anchorDigest", "f" * 64)),
        ("reader", ("remoteDurable", False)),
        ("reader", ("readbackSequence", 1)),
    ],
)
def test_forged_signed_evidence_cannot_close(monkeypatch, tmp_path, role, mutation):
    run, journal, evidence, _, _, _ = make_case(monkeypatch, tmp_path, LATE_HOST)
    evidence[role]["payload"][mutation[0]] = mutation[1]
    result = run()
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"
    assert result["activationAuthorized"] is False
    assert journal.read(LocalMonitor(), "originalIncidentSynthetic329", "PENDING")
    assert journal.read(LocalMonitor(), "originalIncidentSynthetic329", "CLOSED") is None


def test_missing_master_or_one_owner_fails_after_pending(monkeypatch, tmp_path):
    run, journal, _, owners, inputs, _ = make_case(monkeypatch, tmp_path, LATE_OFF)
    del inputs["master_reports"]["ai-data-platform"]
    assert run()["accepted"] is False
    assert journal.read(LocalMonitor(), "originalIncidentSynthetic329", "CLOSED") is None
    run2, journal2, _, owners2, _, _ = make_case(monkeypatch, tmp_path / "owner-case", LATE_OFF)
    del owners2["ownerReviewer"]
    assert run2()["accepted"] is False
    assert journal2.read(LocalMonitor(), "originalIncidentSynthetic329", "CLOSED") is None


def test_protected_ql437_tamper_blocks_corrective_pending(monkeypatch, tmp_path):
    run, journal, _, _, _, calls = make_case(monkeypatch, tmp_path, LATE_HOST)
    with sqlite3.connect(run.prior_journal.path) as db:
        db.execute(
            "UPDATE closure328 SET receipt_digest=? WHERE stage='FINAL'",
            ("f" * 64,),
        )
    result = run()
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"
    assert not journal.path.exists()
    assert calls == []


def test_protected_ql437_changes_mid_review_prevent_closed(monkeypatch, tmp_path):
    run, journal, _, _, inputs, _ = make_case(monkeypatch, tmp_path, LATE_OFF)
    original_reader = inputs["read_reader"]

    def change_prior_custody(**kwargs):
        output = original_reader(**kwargs)
        with sqlite3.connect(run.prior_journal.path) as db:
            db.execute(
                "UPDATE closure328 SET receipt_digest=? WHERE stage='FINAL'",
                ("f" * 64,),
            )
        return output

    inputs["read_reader"] = change_prior_custody
    result = run()
    assert result["accepted"] is False
    assert result["connection"] == "HOLD"
    assert journal.read(LocalMonitor(), "originalIncidentSynthetic329", "PENDING")
    assert journal.read(LocalMonitor(), "originalIncidentSynthetic329", "CLOSED") is None
