"""Synthetic key tests are not original-host acceptance."""

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.field_witness388 import (
    Witness388,
    WitnessPair388,
    reconcile388,
    signing_bytes388,
)
from rosevear_ai_hub.main import app

NOW = 1800000000000
RELEASE = "a" * 40


def _signed(role, key):
    witness = Witness388(
        role=role,
        gate_id="encrypted-backup-restore",
        host="DESKTOP-AE894KC",
        release_sha=RELEASE,
        evidence_sha256="b" * 64,
        challenge="c" * 64,
        observed_at_ms=NOW,
        signature="0" * 128,
    )
    return witness.model_copy(update={"signature": key.sign(signing_bytes388(witness)).hex()})


def _fixture():
    original, reviewer = Ed25519PrivateKey.generate(), Ed25519PrivateKey.generate()
    pair = WitnessPair388(
        original=_signed("original-host", original),
        independent=_signed("independent-reviewer", reviewer),
    )
    pins = {
        "original_key": original.public_key().public_bytes_raw().hex(),
        "reviewer_key": reviewer.public_key().public_bytes_raw().hex(),
        "release_sha": RELEASE,
        "original_host": True,
        "now_ms": NOW,
    }
    return pair, pins


def test_valid_distinct_signatures_remain_field_hold():
    pair, pins = _fixture()
    result = reconcile388(pair, **pins)
    assert result["pairedSignaturesVerified"] is True
    assert result["fieldCertified"] is False
    assert result["independentRecoveryClosed"] is False
    assert result["durableReplayProtectionVerified"] is False
    assert result["evidencePersisted"] is False


def test_missing_trust_wrong_host_same_key_and_stale():
    pair, pins = _fixture()
    for changes in (
        {"original_key": ""},
        {"original_host": False},
        {"reviewer_key": pins["original_key"]},
        {"now_ms": NOW + 900001},
        {"now_ms": NOW - 1},
        {"release_sha": "d" * 40},
    ):
        result = reconcile388(pair, **(pins | changes))
        assert result["pairedSignaturesVerified"] is False
        assert result["fieldCertified"] is False


def test_tampered_digest_and_signature():
    pair, pins = _fixture()
    for change in ({"evidence_sha256": "e" * 64}, {"signature": "0" * 128}):
        changed = pair.model_copy(
            update={"independent": pair.independent.model_copy(update=change)}
        )
        assert reconcile388(changed, **pins)["pairedSignaturesVerified"] is False


def test_owner_endpoint_denies_anonymous():
    pair, _pins = _fixture()
    with TestClient(app) as client:
        response = client.post("/api/v1/system/field-witness-reconcile-388", json=pair.model_dump())
        assert response.status_code in (401, 403)
