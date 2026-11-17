"""Build 359: detached Ed25519 external witness remains distinct from physical approval."""

import base64
import hashlib
import importlib.util
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

ROOT = Path(__file__).resolve().parents[2] / "scripts"


def load(name: str):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), ROOT / name)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def fixture():
    v = load("verify-signed-prelogin-witness359.py")
    w = load("witness-hub-prelogin358.py")
    secret = Ed25519PrivateKey.generate()  # Ephemeral test fixture; never written.
    public = secret.public_key()
    pem = public.public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
    fingerprint = hashlib.sha256(public.public_bytes(Encoding.Raw, PublicFormat.Raw)).hexdigest()
    now = datetime.now(UTC).replace(microsecond=0)

    def fmt(value: datetime) -> str:
        return value.isoformat().replace("+00:00", "Z")

    nonce = "a" * 32
    earlier = now - timedelta(minutes=3)
    previous = w.ZERO
    lines = []
    for item in (
        {
            "kind": "START",
            "schema": w.SCHEMA,
            "nonce": nonce,
            "endpointSha256": "b" * 64,
            "utc": fmt(earlier),
            "signaturePresent": False,
        },
        {
            "kind": "PROBE",
            "sequence": 1,
            "utc": fmt(earlier + timedelta(minutes=1)),
            "ok": False,
            "status": "NETWORK_HOLD",
        },
        {
            "kind": "PROBE",
            "sequence": 2,
            "utc": fmt(earlier + timedelta(minutes=2)),
            "ok": True,
            "status": "HTTP_200",
        },
    ):
        record = w.chain_record(item, previous)
        previous = record["sha256"]
        lines.append(json.dumps(record, sort_keys=True))
    witness = ("\n".join(lines) + "\n").encode()
    commit = "c" * 40
    payload = {
        "schema": v.SCHEMA,
        "host": v.HOST,
        "sourceCommit": commit,
        "witnessSha256": hashlib.sha256(witness).hexdigest(),
        "witnessNonce": nonce,
        "observedAt": fmt(earlier + timedelta(minutes=2)),
        "issuedAt": fmt(now),
        "witnessKeyFingerprint": fingerprint,
        "observedAfterWindowsRestart": True,
        "observedWindowsLoginScreen": True,
        "noOwnerDesktopLogin": True,
        "httpsRecoveredWhileScreenLocked": True,
    }
    signature = base64.b64encode(secret.sign(v.canonical_json(payload)))
    return v, payload, signature, witness, pem, fingerprint, commit, now


def check(data):
    v, payload, signature, witness, pem, fingerprint, commit, now = data
    return v.verify(
        json.dumps(payload).encode(),
        signature,
        witness,
        pem,
        fingerprint,
        commit,
        now=now,
    )


def test_genuine_synthetic_signature_proves_only_signed_claims():
    result = check(fixture())
    assert result["signatureCryptographicallyVerified"]
    assert result["externalProbeChainVerified"]
    assert result["trustedPublicKeyFingerprintVerified"]
    assert not result["actualWindowsLoginScreenIndependentlyCorroborated"]
    assert not result["threeMasterWorkerEnrollmentVerified"]
    assert not result["physicalProductionGreen"]


def test_tampered_claim_or_signature_is_rejected():
    data = fixture()
    v, payload, signature, witness, pem, fingerprint, commit, now = data
    changed = {**payload, "noOwnerDesktopLogin": False}
    with pytest.raises(ValueError):
        v.verify(
            json.dumps(changed).encode(), signature, witness, pem, fingerprint, commit, now=now
        )
    corrupted = base64.b64encode(b"\x00" * 64)
    with pytest.raises(ValueError, match="HOLD_ED25519_SIGNATURE_INVALID"):
        v.verify(
            json.dumps(payload).encode(), corrupted, witness, pem, fingerprint, commit, now=now
        )


def test_wrong_pin_commit_and_external_probe_are_rejected():
    data = fixture()
    v, payload, signature, witness, pem, fingerprint, commit, now = data
    with pytest.raises(ValueError, match="HOLD_OWNER_TRUST_PIN_MISMATCH"):
        v.verify(json.dumps(payload).encode(), signature, witness, pem, "0" * 64, commit, now=now)
    with pytest.raises(ValueError, match="HOLD_UNTRUSTED_SOURCE_COMMIT"):
        v.verify(
            json.dumps(payload).encode(), signature, witness, pem, fingerprint, "d" * 40, now=now
        )
    with pytest.raises(ValueError, match="HOLD_WITNESS_FILE_TAMPERED"):
        v.verify(
            json.dumps(payload).encode(),
            signature,
            witness.replace(b"NETWORK_HOLD", b"HTTP_200"),
            pem,
            fingerprint,
            commit,
            now=now,
        )
