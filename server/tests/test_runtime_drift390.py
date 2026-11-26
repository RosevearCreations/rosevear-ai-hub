"""Synthetic tests; no peer network or real production signers."""

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.runtime_drift390 import (
    MASTERS390,
    Observation390,
    intake390,
    signing_bytes390,
    snapshot390,
)

NOW = 1800000000000
A = "a" * 40
B = "b" * 40


def test_drift_and_recovery_are_durable_and_not_independent_acceptance(tmp_path):
    keys = {source: Ed25519PrivateKey.generate() for source in MASTERS390}
    pins = {source: key.public_key().public_bytes_raw().hex() for source, key in keys.items()}
    targets = dict.fromkeys(MASTERS390, A)
    path = tmp_path / "runtime.sqlite3"
    source = "ai-data-platform"

    def signed(sequence, observed, runtime):
        packet = Observation390(
            source=source,
            target_sha=A,
            runtime_sha=runtime,
            observed_at_ms=observed,
            sequence=sequence,
            healthy=True,
            signature="0" * 128,
        )
        return packet.model_copy(
            update={"signature": keys[source].sign(signing_bytes390(packet)).hex()}
        )

    def read(now):
        report = snapshot390(path, pins=pins, targets=targets, now_ms=now, loaded_hub_sha=None)
        assert not report["independentThreeMasterAcceptance"]
        assert not report["remoteRecoveryExecuted"]
        return next(row["status"] for row in report["sources"] if row["source"] == source)

    assert read(NOW) == "HOLD_NO_SIGNED_RUNTIME"
    assert not path.exists()
    first = signed(1, NOW, B)
    intake390(path, first, pins=pins, targets=targets, now_ms=NOW)
    assert read(NOW) == "OPEN_DEPLOYMENT_DRIFT"
    with pytest.raises(ValueError, match="REPLAY"):
        intake390(path, first, pins=pins, targets=targets, now_ms=NOW)
    second = signed(2, NOW + 1000, A)
    intake390(path, second, pins=pins, targets=targets, now_ms=NOW + 1000)
    assert read(NOW + 1000) == "HOLD_RECOVERY_CONFIRMATION"
    third = signed(3, NOW + 32000, A)
    intake390(path, third, pins=pins, targets=targets, now_ms=NOW + 32000)
    assert read(NOW + 32000) == "RECOVERY_SOURCE_REPORTED"
    assert read(NOW + 700000) == "HOLD_STALE_RUNTIME"
    with pytest.raises(ValueError, match="SIGNATURE"):
        intake390(
            path,
            signed(4, NOW + 33000, A).model_copy(update={"runtime_sha": B}),
            pins=pins,
            targets=targets,
            now_ms=NOW + 33000,
        )


def test_runtime_drift_read_is_owner_only():
    client = TestClient(app)
    assert client.get("/api/v1/system/runtime-drift-390").status_code in (401, 403)
