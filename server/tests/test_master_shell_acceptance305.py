"""305: QL-411 wire format, original host, and original-authority TEST controls."""

import asyncio
import base64
import hashlib
from datetime import UTC, datetime

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell_acceptance305 import (
    _serialize,
    capture_one_supervised_probe305,
    inspect_original_release305,
    prepare_ql411_one_test305,
    review_ql412_handoff305,
)

REV = "a" * 40
EPISODE = "oneTestEpisode305x"
NOW = 1794324000000
TIME = (
    datetime.fromtimestamp(NOW / 1000, UTC)
    .isoformat(timespec="milliseconds")
    .replace("+00:00", "Z")
)


class Monitor:
    persist_eligible = True

    def persistent_snapshot304(self):
        return {"collectionState": "OBSERVING_REE_LOCAL", "sampleCount": 5}


def sample_rows():
    return [
        dict(
            observationId=f"observed305-{i:03d}",
            service="hub_api_8765",
            observedAt=TIME,
            reachable=i % 2 == 0,
            latencyMs=2.5,
        )
        for i in range(2)
    ]


def test_original_host_and_local_release_pointer_never_certify_installation(monkeypatch, tmp_path):
    from rosevear_ai_hub.master_shell_acceptance305 import LATEST_PRODUCTION_304
    from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304

    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance305.platform.system", lambda: "Linux"
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance305.socket.gethostname", lambda: "TEMPLAR"
    )
    monitor = PersistentReeMonitor304(system="Linux", hostname="TEMPLAR", enabled=True)
    denied = inspect_original_release305(tmp_path, monitor)
    assert denied["state"] == "HOLD_WRONG_HOST_OR_OS"
    assert denied["installedProcessRevisionVerified"] is False
    assert denied["newWindowsScheduledTasks"] == 0

    # Even a fabricated matching pointer cannot certify loaded process identity.
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance305.platform.system", lambda: "Windows"
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance305.socket.gethostname", lambda: "DESKTOP-AE894KC"
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance305.safe_document",
        lambda _: {"sha": LATEST_PRODUCTION_304},
    )
    matched = inspect_original_release305(tmp_path, Monitor())
    assert matched["recorded304Matches"] is True
    assert matched["state"] == "HOLD_POINTER_MATCH_NEEDS_INDEPENDENT_PROCESS_BINDING"
    assert matched["installedProcessRevisionVerified"] is False
    assert matched["durableHistoryState"] == "OBSERVING_TWO_OR_MORE_LOCAL_SAMPLES"


def test_local_supervised_capture_is_off_on_jack_and_measures_on_ree(monkeypatch):
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance305.platform.system", lambda: "Windows"
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance305.socket.gethostname", lambda: "TEMPLAR"
    )
    assert asyncio.run(capture_one_supervised_probe305(Monitor())) == []
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance305.socket.gethostname", lambda: "DESKTOP-AE894KC"
    )

    async def probe(port):
        return port == 8765

    rows = asyncio.run(capture_one_supervised_probe305(Monitor(), probe=probe))
    assert [row["service"] for row in rows] == ["hub_api_8765", "hub_client_5173", "hub_caddy_8443"]
    assert rows[0]["reachable"] and not rows[1]["reachable"]
    assert all(isinstance(row["latencyMs"], float) for row in rows)


def test_ql411_one_test_is_replay_gated_signed_offline_and_not_connected(monkeypatch):
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance305.platform.system", lambda: "Windows"
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.master_shell_acceptance305.socket.gethostname", lambda: "DESKTOP-AE894KC"
    )
    private = Ed25519PrivateKey.generate()
    der = private.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    sha = hashlib.sha256(der).hexdigest()

    def approve(**_):
        return dict(
            state="INDEPENDENT_ONE_TEST_APPROVED",
            sourceId="rosevear-ai-hub",
            sourceRevision=REV,
            episodeId=EPISODE,
            installedProcessRevisionVerified=True,
            measuredSamplesVerifiedOnRee=True,
            independentReviewerVerified=True,
            sourceOwnerVerified=True,
            masterOwnerVerified=True,
            ownerConsentVerified=True,
            revoked=False,
            sourceSpkiSha256=sha,
            sourcePublicKeyDer=der,
        )

    def signer(*, exact_payload_bytes, **_):
        return dict(
            attested=True,
            spkiSha256=sha,
            signature=base64.b64encode(private.sign(exact_payload_bytes)).decode(),
        )

    opts = dict(
        source_revision=REV,
        episode_id=EPISODE,
        observations=sample_rows(),
        authorize_original=approve,
        sign_original=signer,
        now_ms=NOW,
    )
    denied = asyncio.run(
        prepare_ql411_one_test305(Monitor(), claim_durable_episode=lambda **_: False, **opts)
    )
    assert denied["state"] == "HOLD_DURABLE_REPLAY_CLAIM"
    result = asyncio.run(
        prepare_ql411_one_test305(Monitor(), claim_durable_episode=lambda **_: True, **opts)
    )
    assert result["state"] == "SIGNED_OFFLINE_QL411_TEST_CANDIDATE_HOLD"
    assert result["signed"] is True and result["sent"] is False
    assert result["connection"] == "HOLD" and not result["ackAccepted"]
    envelope = result["envelope"]
    payload = envelope["payload"]
    assert list(payload) == [
        "schema",
        "sourceId",
        "hostId",
        "sourceRevision",
        "capturedAt",
        "episodeId",
        "samples",
    ]
    assert payload["schema"] == "rosevear.ql411.ree-telemetry.v1"
    assert len(base64.b64decode(envelope["signature"])) == 64
    private.public_key().verify(base64.b64decode(envelope["signature"]), _serialize(payload))
    assert result["envelopeSha256"] == hashlib.sha256(_serialize(payload)).hexdigest()

    bad = asyncio.run(
        prepare_ql411_one_test305(
            Monitor(),
            claim_durable_episode=lambda **_: True,
            **{**opts, "observations": [*sample_rows(), {**sample_rows()[0], "service": "hacker"}]},
        )
    )
    assert bad["state"] == "HOLD_ORIGINAL_MEASURED_SAMPLES_INVALID"


def test_ql412_claim_never_proves_ack_and_owner_endpoint_is_protected():
    result = review_ql412_handoff305(
        {"sourceRevision": REV, "connection": "HOLD", "receiverEnabled": False},
        expected_source_revision=REV,
    )
    assert result["connection"] == "HOLD" and result["ackAccepted"] is False
    assert TestClient(app).get("/api/v1/system/master-shell-305-readiness").status_code == 401
