"""Synthetic keys only; no original-host or network claims."""

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_acceptance389 import (
    MASTERS,
    Packet389,
    Receipt389,
    intake389,
    issue389,
    read389,
    signing_bytes389,
)


def test_challenge_replay_and_readback(tmp_path):
    path = tmp_path.resolve() / "private.sqlite3"
    keys = {source: Ed25519PrivateKey.generate() for source in MASTERS}
    sha = "a" * 40
    kwargs = {
        "pins": {s: k.public_key().public_bytes_raw().hex() for s, k in keys.items()},
        "targets": dict.fromkeys(MASTERS, sha),
        "loaded": sha,
        "owner": 7,
        "now": 1000,
    }
    assert not read389(path, **kwargs)
    challenge = issue389(path, **kwargs)["challenge"]
    receipts = []
    for source in MASTERS:
        receipt = Receipt389(
            source=source,
            challenge=challenge,
            releases=kwargs["targets"],
            observed_at_ms=1000,
            signature="0" * 128,
        )
        receipts.append(
            receipt.model_copy(
                update={"signature": keys[source].sign(signing_bytes389(receipt)).hex()}
            )
        )
    packet = Packet389(receipts=receipts)
    with pytest.raises(ValueError, match="SOURCE_SET"):
        intake389(path, Packet389(receipts=[receipts[0]] * 3), **kwargs)
    with pytest.raises(ValueError, match="RELEASE_OR_TRUST"):
        intake389(path, packet, **{**kwargs, "loaded": "b" * 40})
    intake389(path, packet, **kwargs)
    assert read389(path, **kwargs)
    assert not read389(path, **{**kwargs, "owner": 8})
    assert not read389(path, **{**kwargs, "now": 1000000})
    with pytest.raises(ValueError, match="REPLAY"):
        intake389(path, packet, **kwargs)


def test_master_readback_owner_only():
    client = TestClient(app)
    assert client.get("/api/v1/system/master-acceptance-389").status_code in (401, 403)
