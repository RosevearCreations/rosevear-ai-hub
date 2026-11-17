"""Build 360 / QL-469: fail-closed offline signed field review regressions."""

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


def load():
    path = ROOT / "assess-supervised-acceptance360.py"
    spec = importlib.util.spec_from_file_location("ql469_assessment", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def signed(scope="guest", *, now=None):
    module = load()
    timestamp = now or datetime.now(UTC).replace(microsecond=0)

    def fmt(dt):
        return dt.isoformat().replace("+00:00", "Z")

    key = Ed25519PrivateKey.generate()  # Test-only ephemeral; never written to disk.
    public = key.public_key()
    pub = public.public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
    pin = hashlib.sha256(public.public_bytes(Encoding.Raw, PublicFormat.Raw)).hexdigest()
    raw = b"SANITIZED_NONSECRET_TEST_EVIDENCE\n"
    commit = "a" * 40
    payload = {
        "schema": module.SCHEMA,
        "scope": scope,
        "host": module.HOST,
        "sourceCommit": commit,
        "observedAt": fmt(timestamp - timedelta(minutes=3)),
        "issuedAt": fmt(timestamp - timedelta(minutes=1)),
        "nonce": "b" * 32,
        "evidenceSha256": hashlib.sha256(raw).hexdigest(),
        "signerKeyFingerprint": pin,
        "checks": dict.fromkeys(module.CHECKS[scope], True),
    }
    encoded = json.dumps(payload).encode()
    sig = base64.b64encode(key.sign(module.canonical(payload)))
    return module, payload, encoded, sig, raw, pub, pin, commit, timestamp


def verify(case):
    module, payload, encoded, sig, raw, pub, pin, commit, now = case
    return module.verify_field(encoded, sig, raw, pub, pin, commit, payload["scope"], now=now)


@pytest.mark.parametrize("scope", ["guest", "ai-data-worker", "comms-worker"])
def test_ephemeral_signed_claim_is_not_physical_proof(scope):
    result = verify(signed(scope))
    assert result["signedClaimVerified"]
    assert result["realWorldAssertionsIndependentlyCorroborated"] is False
    assert result["changesMade"] is False


def test_tampered_claim_and_evidence_hold():
    m, payload, encoded, sig, evidence, pem, pin, commit, now = signed()
    payload["checks"]["realCameraPlaybackTest"] = False
    with pytest.raises(ValueError, match="HOLD_FIELD_CHECKLIST_FAILED"):
        m.verify_field(json.dumps(payload).encode(), sig, evidence, pem, pin, commit, "guest", now)
    payload["checks"]["realCameraPlaybackTest"] = True
    payload["nonce"] = "c" * 32
    with pytest.raises(ValueError, match="HOLD_FIELD_SIGNATURE_INVALID"):
        m.verify_field(json.dumps(payload).encode(), sig, evidence, pem, pin, commit, "guest", now)
    with pytest.raises(ValueError, match="HOLD_FIELD_EVIDENCE_TAMPERED"):
        m.verify_field(encoded, sig, evidence + b"TAMPER", pem, pin, commit, "guest", now)


def test_wrong_host_source_scope_and_key_pin_hold():
    m, payload, encoded, sig, evidence, pem, pin, commit, now = signed("comms-worker")
    with pytest.raises(ValueError, match="HOLD_FIELD_HOST_SCOPE_COMMIT_MISMATCH"):
        m.verify_field(encoded, sig, evidence, pem, pin, commit, "ai-data-worker", now)
    with pytest.raises(ValueError, match="HOLD_FIELD_HOST_SCOPE_COMMIT_MISMATCH"):
        m.verify_field(encoded, sig, evidence, pem, pin, "c" * 40, "comms-worker", now)
    with pytest.raises(ValueError, match="HOLD_FIELD_PIN_MISMATCH"):
        m.verify_field(encoded, sig, evidence, pem, "d" * 64, commit, "comms-worker", now)
    payload["host"] = "OTHER-PC"
    with pytest.raises(ValueError, match="HOLD_FIELD_HOST_SCOPE_COMMIT_MISMATCH"):
        m.verify_field(
            json.dumps(payload).encode(), sig, evidence, pem, pin, commit, "comms-worker", now
        )


def test_expired_and_non_utc_claims_rejected():
    m, payload, encoded, sig, evidence, pem, pin, commit, now = signed()
    with pytest.raises(ValueError, match="HOLD_FIELD_STALE_OR_FUTURE"):
        m.verify_field(encoded, sig, evidence, pem, pin, commit, "guest", now + timedelta(hours=26))
    payload["observedAt"] = "not a utc instant"
    with pytest.raises(ValueError, match="HOLD_FIELD_UTC_REQUIRED"):
        m.verify_field(json.dumps(payload).encode(), sig, evidence, pem, pin, commit, "guest", now)


def test_receiver_off_required_and_missing_checks_rejected():
    m, payload, encoded, sig, evidence, pem, pin, commit, now = signed("comms-worker")
    del payload["checks"]["ql340cPrivateTestReceiverStillOff"]
    with pytest.raises(ValueError, match="HOLD_FIELD_CHECKLIST_INCOMPLETE"):
        m.verify_field(
            json.dumps(payload).encode(), sig, evidence, pem, pin, commit, "comms-worker", now
        )
    payload["checks"]["ql340cPrivateTestReceiverStillOff"] = False
    with pytest.raises(ValueError, match="HOLD_FIELD_CHECKLIST_FAILED"):
        m.verify_field(
            json.dumps(payload).encode(), sig, evidence, pem, pin, commit, "comms-worker", now
        )


def test_missing_field_evidence_report_is_readonly_and_never_green(tmp_path):
    m = load()
    pins = {s: (format(i + 1, "x") * 64) for i, s in enumerate(("prelogin", *m.CHECKS))}
    result = m.evaluate(tmp_path, "a" * 40, pins)
    assert not result["physicalUnattendedProductionGreen"]
    assert not result["threeMasterWorkerProductionGreen"]
    assert not result["commsPrivateTestReceiverAuthorized"]
    assert not result["automaticEnrollmentAuthorized"]
    assert not result["changesMade"]
    assert all(status["status"].startswith("HOLD_") for status in result["scopeStatuses"].values())
    assert result["independentKeySeparationVerified"]


def test_reused_signing_key_fingerprint_blocks_independent_review(tmp_path):
    m = load()
    pins = dict.fromkeys(("prelogin", *m.CHECKS), "f" * 64)
    result = m.evaluate(tmp_path, "a" * 40, pins)
    assert not result["independentKeySeparationVerified"]
    assert "HOLD_SIGNING_KEYS_NOT_INDEPENDENT" in result["holdCodes"]
