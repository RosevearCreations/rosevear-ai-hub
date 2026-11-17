"""Build 359 / QL-468: verify independently signed pre-login witness (read-only).

An Ed25519 signature proves a trusted private key signed specific *claims*.
It does not by itself prove the original PC was on the login screen or that
AI Data / Comms worker enrollment occurred. No private keys are generated,
accepted or stored. The expected public-key fingerprint MUST come separately
from an independently trusted owner/custodian.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import importlib.util
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, load_pem_public_key

SCHEMA = "rosevear.hub.ql468.signed-prelogin-acceptance359.v1"
HOST = "DESKTOP-AE894KC"
KEYS = frozenset(
    {
        "schema",
        "host",
        "sourceCommit",
        "witnessSha256",
        "witnessNonce",
        "observedAt",
        "issuedAt",
        "witnessKeyFingerprint",
        "observedAfterWindowsRestart",
        "observedWindowsLoginScreen",
        "noOwnerDesktopLogin",
        "httpsRecoveredWhileScreenLocked",
    }
)


def utc_date(value: object) -> datetime:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("HOLD_UTC_TIMESTAMP_REQUIRED")
    try:
        instant = datetime.fromisoformat(value[:-1] + "+00:00")
        return instant.astimezone(timezone.utc)
    except ValueError as error:
        raise ValueError("HOLD_INVALID_UTC_TIMESTAMP") from error


def require_hash(value: object, reason: str) -> str:
    if not isinstance(value, str) or re.fullmatch("[0-9a-f]{64}", value) is None:
        raise ValueError(reason)
    return value


def canonical_json(payload: dict) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode(
        "utf-8"
    )


def verify(
    envelope: bytes,
    detached_signature: bytes,
    witness_bytes: bytes,
    trusted_public_key_pem: bytes,
    expected_fingerprint: str,
    expected_source_commit: str,
    now: datetime | None = None,
) -> dict:
    try:
        if (
            not 2 <= len(envelope) <= 8192
            or len(witness_bytes) > 12_000_000
            or len(trusted_public_key_pem) > 8192
            or len(detached_signature) > 256
        ):
            raise ValueError("HOLD_EVIDENCE_SIZE_INVALID")
        payload = json.loads(envelope)
        if not isinstance(payload, dict) or set(payload) != KEYS:
            raise ValueError("HOLD_WITNESS_SCHEMA_OR_FIELDS")
        if payload["schema"] != SCHEMA or payload["host"] != HOST:
            raise ValueError("HOLD_WITNESS_HOST_OR_SCHEMA")
        if (
            re.fullmatch("[0-9a-f]{40}", expected_source_commit) is None
            or payload["sourceCommit"] != expected_source_commit
        ):
            raise ValueError("HOLD_UNTRUSTED_SOURCE_COMMIT")
        require_hash(expected_fingerprint, "HOLD_OWNER_KEY_PIN_REQUIRED")
        if require_hash(
            payload["witnessKeyFingerprint"], "HOLD_SIGNER_FINGERPRINT_INVALID"
        ) != expected_fingerprint:
            raise ValueError("HOLD_OWNER_TRUST_PIN_MISMATCH")
        if (
            require_hash(payload["witnessSha256"], "HOLD_WITNESS_HASH_INVALID")
            != hashlib.sha256(witness_bytes).hexdigest()
        ):
            raise ValueError("HOLD_WITNESS_FILE_TAMPERED")
        if not isinstance(payload["witnessNonce"], str) or re.fullmatch(
            "[a-f0-9]{32}", payload["witnessNonce"]
        ) is None:
            raise ValueError("HOLD_WITNESS_NONCE_INVALID")
        for claim in (
            "observedAfterWindowsRestart",
            "observedWindowsLoginScreen",
            "noOwnerDesktopLogin",
            "httpsRecoveredWhileScreenLocked",
        ):
            if payload[claim] is not True:
                raise ValueError("HOLD_INDEPENDENT_PRELOGIN_CLAIMS_INCOMPLETE")
        observed = utc_date(payload["observedAt"])
        issued = utc_date(payload["issuedAt"])
        current = now or datetime.now(timezone.utc)
        if (
            observed > issued
            or issued > current + timedelta(minutes=2)
            or current - observed > timedelta(hours=24)
            or issued - observed > timedelta(hours=2)
        ):
            raise ValueError("HOLD_WITNESS_OUTSIDE_TIME_WINDOW")
        key = load_pem_public_key(trusted_public_key_pem)
        if not isinstance(key, Ed25519PublicKey):
            raise ValueError("HOLD_ED25519_PUBLIC_KEY_REQUIRED")
        raw_key = key.public_bytes(Encoding.Raw, PublicFormat.Raw)
        if hashlib.sha256(raw_key).hexdigest() != expected_fingerprint:
            raise ValueError("HOLD_PUBLIC_KEY_FINGERPRINT_MISMATCH")
        signature = base64.b64decode(detached_signature.strip(), validate=True)
        if len(signature) != 64:
            raise ValueError("HOLD_DETACHED_SIGNATURE_FORMAT")
        try:
            key.verify(signature, canonical_json(payload))
        except Exception as error:
            raise ValueError("HOLD_ED25519_SIGNATURE_INVALID") from error

        source = Path(__file__).with_name("witness-hub-prelogin358.py")
        spec = importlib.util.spec_from_file_location("ql467_witness", source)
        if spec is None or spec.loader is None:
            raise ValueError("HOLD_PROBE_VERIFIER_UNAVAILABLE")
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        result = module.verify_lines(witness_bytes.decode("utf-8").splitlines())
        if (
            not result["chainIntact"]
            or not result["observedFailureThenSuccess"]
            or result["probeCount"] < 2
        ):
            raise ValueError("HOLD_WITNESS_CHAIN_OR_RECOVERY_INVALID")
        witnessed_events = [
            json.loads(line) for line in witness_bytes.decode("utf-8").splitlines()
        ]
        if (
            witnessed_events[0].get("nonce") != payload["witnessNonce"]
            or witnessed_events[0].get("schema") != module.SCHEMA
        ):
            raise ValueError("HOLD_SIGNED_WITNESS_NONCE_MISMATCH")
        first_probe_at = utc_date(witnessed_events[1]["utc"])
        last_probe_at = utc_date(witnessed_events[-1]["utc"])
        if not (
            first_probe_at <= observed <= last_probe_at + timedelta(minutes=2)
            and last_probe_at <= issued + timedelta(minutes=2)
        ):
            raise ValueError("HOLD_WITNESS_OBSERVATION_TIME_MISMATCH")
    except ValueError:
        raise
    except Exception as error:
        raise ValueError("HOLD_WITNESS_EVIDENCE_INVALID") from error

    return {
        "schema": SCHEMA,
        "source": "INDEPENDENT_ED25519_DETACHED_CLAIM",
        "originalHost": HOST,
        "trustedPublicKeyFingerprintVerified": True,
        "exactSourceCommitVerified": True,
        "signatureCryptographicallyVerified": True,
        "externalProbeChainVerified": True,
        "witnessClaimsSigned": True,
        "actualWindowsLoginScreenIndependentlyCorroborated": False,
        "haMqttAndCameraContinuityIndependentlyVerified": False,
        "threeMasterWorkerEnrollmentVerified": False,
        "physicalProductionGreen": False,
        "changesMade": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Read-only detached Ed25519 witness verifier")
    parser.add_argument("--receipt", type=Path, required=True)
    parser.add_argument("--signature-base64", type=Path, required=True)
    parser.add_argument("--witness-jsonl", type=Path, required=True)
    parser.add_argument("--trusted-ed25519-public-pem", type=Path, required=True)
    parser.add_argument("--trusted-key-sha256", required=True)
    parser.add_argument("--expected-commit", required=True)
    args = parser.parse_args()
    try:
        result = verify(
            args.receipt.read_bytes(),
            args.signature_base64.read_bytes(),
            args.witness_jsonl.read_bytes(),
            args.trusted_ed25519_public_pem.read_bytes(),
            args.trusted_key_sha256,
            args.expected_commit,
        )
        print(json.dumps(result, sort_keys=True))
    except (ValueError, OSError) as error:
        reason = str(error)
        if not reason.startswith("HOLD_"):
            reason = "HOLD_WITNESS_VERIFICATION_FAILED"
        parser.exit(2, reason + "\n")


if __name__ == "__main__":
    main()
