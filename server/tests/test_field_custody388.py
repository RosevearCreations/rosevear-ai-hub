"""Synthetic durable receipt custody; no original hardware or keys used."""

import hashlib

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from rosevear_ai_hub.field_custody388 import (
    Evidence388,
    Intake388,
    Review388,
    evidence_bytes388,
    intake388,
    issue388,
    review388,
    snapshot388,
)
from rosevear_ai_hub.field_witness388 import Witness388, WitnessPair388, signing_bytes388


def test_private_challenge_intake_replay_and_owner_review(tmp_path):
    path = tmp_path / "witness.sqlite3"
    a, b = Ed25519PrivateKey.generate(), Ed25519PrivateKey.generate()
    pins = {
        "original_key": a.public_key().public_bytes_raw().hex(),
        "reviewer_key": b.public_key().public_bytes_raw().hex(),
        "release_sha": "a" * 40,
    }
    now = 1800000000000
    gate = "encrypted-backup-restore"
    assert snapshot388(path, owner=1, release_sha="a" * 40)["receipts"] == []
    assert not path.exists()
    issued = issue388(path, gate=gate, owner=1, now_ms=now, **pins)
    evidence = Evidence388(
        gate_id=gate, artifact_sha256="b" * 64, result="observed",
        recovery="isolated_restore_reported",
    )
    digest = hashlib.sha256(evidence_bytes388(evidence)).hexdigest()

    def signed(role, key):
        w = Witness388(
            role=role, gate_id=gate, host="DESKTOP-AE894KC", release_sha="a" * 40,
            evidence_sha256=digest, challenge=issued["challenge"],
            observed_at_ms=now + 1, signature="0" * 128,
        )
        return w.model_copy(update={"signature": key.sign(signing_bytes388(w)).hex()})

    packet = Intake388(
        pair=WitnessPair388(
            original=signed("original-host", a), independent=signed("independent-reviewer", b),
        ),
        evidence=evidence,
    )
    with pytest.raises(ValueError, match="SCOPE"):
        intake388(path, packet, owner=2, now_ms=now + 2, **pins)
    with pytest.raises(ValueError, match="DIGEST"):
        intake388(
            path, packet.model_copy(update={"evidence": evidence.model_copy(
                update={"artifact_sha256": "c" * 64},
            )}), owner=1, now_ms=now + 2, **pins,
        )
    result = intake388(path, packet, owner=1, now_ms=now + 2, **pins)
    assert result["evidencePersisted"] and result["durableReplayProtectionVerified"]
    assert not result["fieldCertified"]
    with pytest.raises(ValueError, match="REPLAY"):
        intake388(path, packet, owner=1, now_ms=now + 3, **pins)
    request = Review388(challenge=issued["challenge"], decision="reviewed")
    with pytest.raises(ValueError, match="SCOPE"):
        review388(path, request, owner=2, now_ms=now + 4, **pins)
    result = review388(path, request, owner=1, now_ms=now + 4, **pins)
    assert result["recoveryReviewRecorded"] and not result["independentRecoveryClosed"]
    assert snapshot388(path, owner=1, release_sha="a" * 40)["receipts"][0]["decision"] == "reviewed"
    with pytest.raises(ValueError, match="NOT_PENDING"):
        review388(path, request, owner=1, now_ms=now + 5, **pins)
