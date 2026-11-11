"""Build 309: protection, actual QL-416 correlation, owner-gated handoff."""

import base64
import hashlib
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import COMMS_SCHEMA, _serialize, _utc
from rosevear_ai_hub.master_shell_acceptance306 import (
    REVIEW_SCHEMA,
    ProtectedSourceImportLedger306,
)
from rosevear_ai_hub.master_shell_acceptance307 import ProtectedChainLedger307
from rosevear_ai_hub.master_shell_acceptance308 import ACK_SCHEMA, OPERATION
from rosevear_ai_hub.master_shell_acceptance309 import (
    AIDATA_369_MAIN_AT_RECONCILIATION,
    AIHUB308_MAIN,
    COMMS_QL416_MAIN,
    admit_ql416_one_test309,
    prepare_ai_data_owner_handoff309,
    prepare_ql414_one_test309,
    reconcile_master_evidence309,
    review_installed_308_on_ree309,
)

NOW = 1794400000000
CORRELATION = "master309OneTestCorrelation"
RECEIVER_KEY = "comms309IndependentReceiver"


class Monitor:
    persist_eligible = True

    def persistent_snapshot304(self):
        return {"collectionState": "OBSERVING_REE_LOCAL", "sampleCount": 3}

    class Ledger:
        def observed_daily_trend306(self, _):
            return [{"dayUtc": "2026-11-11", "observedMinutes": 3}]

    ledger = Ledger()


def key():
    private = Ed25519PrivateKey.generate()
    public = private.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return private, public, hashlib.sha256(public).hexdigest()


def signed(private, payload):
    return {
        "payload": payload,
        "signature": base64.b64encode(private.sign(_serialize(payload))).decode(),
    }


def ree(monkeypatch):
    for name in (
        "master_shell_acceptance306",
        "master_shell_acceptance307",
        "master_shell_acceptance308",
    ):
        monkeypatch.setattr(f"rosevear_ai_hub.{name}.platform.system", lambda: "Windows")
        monkeypatch.setattr(f"rosevear_ai_hub.{name}.socket.gethostname", lambda: "DESKTOP-AE894KC")
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance306.safe_document", lambda _: {"sha": AIHUB308_MAIN}
    )


def field():
    return {
        "schema": REVIEW_SCHEMA,
        "sourceId": "rosevear-ai-hub",
        "originalHost": "DESKTOP-AE894KC",
        "reviewerHost": "TEMPLAR",
        "sourceRevision": AIHUB308_MAIN,
        "observedAt": _utc(NOW),
        "releasePointerSha": AIHUB308_MAIN,
        "loadedProcessSha": AIHUB308_MAIN,
        "launcherPid": 900,
        "processPid": 901,
        "processEvidenceSha256": "a" * 64,
        "ownerConsentReference": "reeOriginalHost309",
    }


def source():
    return {
        "schema": COMMS_SCHEMA,
        "sourceId": "rosevear-ai-hub",
        "hostId": "DESKTOP-AE894KC",
        "sourceRevision": AIHUB308_MAIN,
        "capturedAt": _utc(NOW - 1000),
        "episodeId": "one309RealEpisode",
        "samples": [
            {
                "observationId": f"one309Sample{i}",
                "service": "hub_api_8765",
                "observedAt": _utc(NOW - 2000 - i * 100),
                "reachable": i == 0,
                "latencyMs": 4.5 if i == 0 else 1700,
            }
            for i in range(2)
        ],
    }


def ack(src):
    return {
        "schema": ACK_SCHEMA,
        "operation": OPERATION,
        "sourceId": "rosevear-ai-hub",
        "hostId": "DESKTOP-AE894KC",
        "sourceRevision": AIHUB308_MAIN,
        "sourceEpisodeId": src["episodeId"],
        "correlationId": CORRELATION,
        "receivedAt": _utc(NOW),
        "receiverKeyId": RECEIVER_KEY,
        "sourcePayloadSha256": hashlib.sha256(_serialize(src)).hexdigest(),
        "decision": "METADATA_VERIFIED_FOR_OWNER_REVIEW",
        "connection": "HOLD",
    }


def ql416(src):
    return {
        "state": "SIGNED_ONE_TEST_IMPORTED_FOR_REVIEW",
        "source": "rosevear-ai-hub",
        "host": "DESKTOP-AE894KC",
        "installedSourceRevision": AIHUB308_MAIN,
        "aiDataControllerRevision": AIDATA_369_MAIN_AT_RECONCILIATION,
        "episodeId": src["episodeId"],
        "correlationId": CORRELATION,
        "capturedAt": src["capturedAt"],
        "uptime": "SIGNED_SAMPLED_READ_MODEL_ONLY",
        "services": [
            {"service": "hub_api_8765", "samples": 2, "sampledUptimePercent": 50.0},
            {"service": "hub_client_5173", "samples": 0, "sampledUptimePercent": None},
            {"service": "hub_caddy_8443", "samples": 0, "sampledUptimePercent": None},
        ],
        "incidents": [
            {
                "service": "hub_api_8765",
                "classification": "SIGNED_SAMPLE_REACHABILITY_GAP",
                "sampledUptimePercent": 50.0,
                "acceptance": "AWAITING_OWNER_REVIEW",
            }
        ],
        "replay": "INDEPENDENT_PROTECTED_LEDGER_RECORD_MATCHED",
        "receiverAck": "INDEPENDENT_SIGNED_ACK_MATCHED",
        "ownerDecision": "HOLD",
        "receiver": "OFF",
        "connection": "HOLD",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }


def test_original_release_owner_review_uses_build308_installed_proof(monkeypatch):
    private, pub, pin = key()
    args = dict(
        reviewer_public_der=pub,
        independent_reviewer_pin=pin,
        owner_authorize=lambda **_: True,
        now_ms=NOW,
    )
    proof = signed(private, field())
    assert not review_installed_308_on_ree309(Path.cwd(), Monitor(), proof, **args)["accepted"]
    ree(monkeypatch)
    assert review_installed_308_on_ree309(Path.cwd(), Monitor(), proof, **args)["accepted"]
    assert not review_installed_308_on_ree309(
        Path.cwd(), Monitor(), signed(private, {**field(), "releasePointerSha": "b" * 40}), **args
    )["accepted"]
    assert not review_installed_308_on_ree309(
        Path.cwd(), Monitor(), proof, **{**args, "independent_reviewer_pin": "c" * 64}
    )["accepted"]


def test_prepared_request_requires_import_and_two_independent_authorizations(monkeypatch, tmp_path):
    ree(monkeypatch)
    reviewer, rpub, rpin = key()
    sender, spub, spin = key()
    src = source()
    prior = ProtectedSourceImportLedger306(tmp_path / "prior-import.sqlite3")
    args = dict(
        reviewer_public_der=rpub,
        independent_reviewer_pin=rpin,
        release_owner_authorize=lambda **_: True,
        source_public_der=spub,
        independently_pinned_source_sha256=spin,
        source_import_claimed=prior.was_claimed,
        one_test_owner_authorize=lambda **_: True,
        independent_reviewer_approve=lambda **_: True,
        correlation_id=CORRELATION,
        now_ms=NOW,
    )
    proof = signed(reviewer, field())
    envelope = signed(sender, src)
    assert not prepare_ql414_one_test309(Path.cwd(), Monitor(), proof, envelope, **args)["accepted"]
    assert prior.claim(
        source_id="rosevear-ai-hub",
        episode_id=src["episodeId"],
        envelope_sha256=hashlib.sha256(_serialize(src)).hexdigest(),
    )
    result = prepare_ql414_one_test309(Path.cwd(), Monitor(), proof, envelope, **args)
    assert result["accepted"] and not result["transportSent"]
    assert set(result["request"]) == {"operation", "correlationId", "envelope"}
    assert not prepare_ql414_one_test309(
        Path.cwd(),
        Monitor(),
        proof,
        envelope,
        **{**args, "independent_reviewer_approve": lambda **_: False},
    )["accepted"]
    assert not prepare_ql414_one_test309(
        Path.cwd(), Monitor(), proof, signed(sender, {**src, "sourceRevision": "a" * 40}), **args
    )["accepted"]


def test_operational_one_test_authentic_signatures_replay_and_uptime(monkeypatch, tmp_path):
    ree(monkeypatch)
    sender, spub, spin = key()
    receiver, rpub, rpin = key()
    src = source()
    envelope, signed_ack = signed(sender, src), signed(receiver, ack(src))
    prior = ProtectedSourceImportLedger306(tmp_path / "prior.sqlite3")
    chains = ProtectedChainLedger307(tmp_path / "chain.sqlite3")
    assertions = []

    def witness(**kwargs):
        assertions.append(kwargs)
        return True

    args = dict(
        source_public_der=spub,
        independently_pinned_source_sha256=spin,
        receiver_public_der=rpub,
        independently_pinned_receiver_sha256=rpin,
        expected_receiver_key_id=RECEIVER_KEY,
        correlation_id=CORRELATION,
        source_import_claimed=prior.was_claimed,
        protected_transport_attest=lambda **_: True,
        owner_authorize=lambda **_: True,
        independent_reviewer_approve=lambda **_: True,
        independently_attest_comms_ql416_ledger=witness,
        claim_chain=chains.claim,
        controller_revision=AIDATA_369_MAIN_AT_RECONCILIATION,
        now_ms=NOW,
    )
    assert not admit_ql416_one_test309(Monitor(), envelope, signed_ack, ql416(src), **args)[
        "accepted"
    ]
    assert prior.claim(
        source_id="rosevear-ai-hub",
        episode_id=src["episodeId"],
        envelope_sha256=hashlib.sha256(_serialize(src)).hexdigest(),
    )
    accepted = admit_ql416_one_test309(Monitor(), envelope, signed_ack, ql416(src), **args)
    assert accepted["accepted"] and accepted["connection"] == "HOLD"
    assert accepted["sourceRevision"] == AIHUB308_MAIN
    assert accepted["uptime"] == "SIGNED_SAMPLED_READ_MODEL_ONLY"
    assert accepted["incidentCandidates"][0]["sampledUptimePercent"] == 50.0
    assert assertions[0]["controller_revision"] == AIDATA_369_MAIN_AT_RECONCILIATION
    assert not admit_ql416_one_test309(Monitor(), envelope, signed_ack, ql416(src), **args)[
        "accepted"
    ]  # atomic original-host episode replay


def test_ql416_unsigned_projection_is_not_proof(monkeypatch, tmp_path):
    ree(monkeypatch)
    sender, spub, spin = key()
    receiver, rpub, rpin = key()
    src = source()
    envelope, signed_ack = signed(sender, src), signed(receiver, ack(src))
    prior = ProtectedSourceImportLedger306(tmp_path / "prior.sqlite3")
    assert prior.claim(
        source_id="rosevear-ai-hub",
        episode_id=src["episodeId"],
        envelope_sha256=hashlib.sha256(_serialize(src)).hexdigest(),
    )
    args = dict(
        source_public_der=spub,
        independently_pinned_source_sha256=spin,
        receiver_public_der=rpub,
        independently_pinned_receiver_sha256=rpin,
        expected_receiver_key_id=RECEIVER_KEY,
        correlation_id=CORRELATION,
        source_import_claimed=prior.was_claimed,
        protected_transport_attest=lambda **_: True,
        owner_authorize=lambda **_: True,
        independent_reviewer_approve=lambda **_: True,
        independently_attest_comms_ql416_ledger=lambda **_: False,
        claim_chain=ProtectedChainLedger307(tmp_path / "chain.sqlite3").claim,
        controller_revision=AIDATA_369_MAIN_AT_RECONCILIATION,
        now_ms=NOW,
    )
    assert not admit_ql416_one_test309(Monitor(), envelope, signed_ack, ql416(src), **args)[
        "accepted"
    ]
    assert not admit_ql416_one_test309(
        Monitor(),
        envelope,
        signed_ack,
        {**ql416(src), "connection": "CONNECTED"},
        **{**args, "independently_attest_comms_ql416_ledger": lambda **_: True},
    )["accepted"]
    assert not admit_ql416_one_test309(
        Monitor(),
        envelope,
        signed_ack,
        {
            **ql416(src),
            "services": [
                {**ql416(src)["services"][0], "sampledUptimePercent": 100},
                *ql416(src)["services"][1:],
            ],
        },
        **{**args, "independently_attest_comms_ql416_ledger": lambda **_: True},
    )["accepted"]
    assert not admit_ql416_one_test309(
        Monitor(),
        envelope,
        signed(receiver, {**ack(src), "sourceEpisodeId": "different309Episode"}),
        ql416(src),
        **{**args, "independently_attest_comms_ql416_ledger": lambda **_: True},
    )["accepted"]
    assert not admit_ql416_one_test309(
        Monitor(),
        envelope,
        signed_ack,
        ql416(src),
        **{
            **args,
            "controller_revision": "bad",
            "independently_attest_comms_ql416_ledger": lambda **_: True,
        },
    )["accepted"]


def test_ai_data_owner_gate_needs_separate_original_chain_witness(monkeypatch):
    admission = {
        "state": "ONE_TEST_SOURCE_COMMS_QL416_ADMITTED_FOR_AI_DATA_REVIEW",
        "accepted": True,
        "connection": "HOLD",
        "receiver": "OFF",
        "mastersSynced": False,
        "sourceRevision": AIHUB308_MAIN,
        "controllerRevision": AIDATA_369_MAIN_AT_RECONCILIATION,
        "commsRevision": COMMS_QL416_MAIN,
        "episodeId": "one309RealEpisode",
        "correlationId": CORRELATION,
        "sourcePayloadSha256": "a" * 64,
        "receiverAckSha256": "b" * 64,
        "ql416ReviewSha256": "c" * 64,
    }
    opts = dict(
        independently_attest_original_chain=lambda **_: False,
        owner_authorize=lambda **_: True,
        independent_reviewer_approve=lambda **_: True,
    )
    assert not prepare_ai_data_owner_handoff309(Monitor(), admission, **opts)["accepted"]
    ree(monkeypatch)
    assert not prepare_ai_data_owner_handoff309(Monitor(), admission, **opts)["accepted"]
    result = prepare_ai_data_owner_handoff309(
        Monitor(), admission, **{**opts, "independently_attest_original_chain": lambda **_: True}
    )
    assert result["accepted"] and result["sent"] is False
    assert result["controllerApproved"] is False and result["connection"] == "HOLD"
    assert result["handoff"]["ownerDecision"] == "PENDING_INDEPENDENT_AI_DATA_REVIEW"
    assert not prepare_ai_data_owner_handoff309(
        Monitor(),
        {**admission, "mastersSynced": True},
        **{**opts, "independently_attest_original_chain": lambda **_: True},
    )["accepted"]
    assert not prepare_ai_data_owner_handoff309(
        Monitor(),
        {**admission, "ql416ReviewSha256": "invalid"},
        **{**opts, "independently_attest_original_chain": lambda **_: True},
    )["accepted"]


def test_owner_only_runtime_status_never_attests_original_host():
    read = reconcile_master_evidence309(Monitor())
    assert read["sourceBuild"] == 309
    assert read["sampledUptime"].startswith("UNKNOWN")
    assert read["masterSync"] == read["connection"] == "HOLD"
    assert read["newWindowsScheduledTasks"] == 0
    result = TestClient(app).get("/api/v1/system/master-shell-309-acceptance")
    assert result.status_code == 401
