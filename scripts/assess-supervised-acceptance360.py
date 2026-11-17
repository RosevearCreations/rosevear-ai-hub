"""Build 360 / QL-469: offline, read-only supervised acceptance evidence matrix.

Detached signatures authenticate attributed claims, not physical truth. This tool
NEVER enables Windows tasks, installs peers, contacts devices or grants authority.
Keep witness and field receipts outside the repository, and pin independent
public key fingerprints through an independently trusted owner channel.
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

HOST = "DESKTOP-AE894KC"
SCHEMA = "rosevear.hub.ql469.field-assertion360.v1"
OUTPUT_SCHEMA = "rosevear.hub.ql469.supervised-acceptance360.v1"
HEX40 = re.compile(r"[a-f0-9]{40}\Z")
HEX64 = re.compile(r"[a-f0-9]{64}\Z")
HEX32 = re.compile(r"[a-f0-9]{32}\Z")
FIELDS = frozenset(
    {
        "schema", "scope", "host", "sourceCommit", "observedAt", "issuedAt",
        "nonce", "evidenceSha256", "signerKeyFingerprint", "checks",
    }
)
CHECKS = {
    "guest": frozenset(
        {
            "realHomeAssistantApiAuthTest", "realMqttPublishSubscribeAck",
            "realCameraPlaybackTest", "independentPrivateHttpsTest",
            "offHostBackupRestoreTest", "supervisedRecoveryDrillTest",
        }
    ),
    "ai-data-worker": frozenset(
        {
            "ownerApprovedServiceEnrollment", "originalWindowsServiceIdentityReadback",
            "independentPinnedMtlsPeerTest", "durableSignedAckReplayTest",
            "ownerReviewedRollbackTest",
        }
    ),
    "comms-worker": frozenset(
        {
            "ownerApprovedNonReceiverEnrollment", "originalWindowsServiceIdentityReadback",
            "independentPinnedMtlsPeerTest", "durableSignedAckReplayTest",
            "ownerReviewedRollbackTest", "ql340cPrivateTestReceiverStillOff",
        }
    ),
}


def utc(value: object) -> datetime:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("HOLD_FIELD_UTC_REQUIRED")
    try:
        parsed = datetime.fromisoformat(value[:-1] + "+00:00")
        if parsed.utcoffset() != timedelta(0):
            raise ValueError("HOLD_FIELD_UTC_REQUIRED")
        return parsed.astimezone(timezone.utc)
    except (TypeError, ValueError) as error:
        raise ValueError("HOLD_FIELD_UTC_INVALID") from error


def canonical(payload: dict) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def require_hex(value: object, pattern: re.Pattern, code: str) -> str:
    if not isinstance(value, str) or not pattern.fullmatch(value):
        raise ValueError(code)
    return value


def verify_field(
    receipt: bytes,
    signature_b64: bytes,
    evidence: bytes,
    trusted_pem: bytes,
    trusted_pin: str,
    expected_commit: str,
    expected_scope: str,
    now: datetime | None = None,
) -> dict:
    """Verify an independent signer claimed a bounded event; do not assert truth."""
    if expected_scope not in CHECKS:
        raise ValueError("HOLD_FIELD_UNKNOWN_SCOPE")
    require_hex(expected_commit, HEX40, "HOLD_FIELD_UNVERIFIED_SOURCE")
    require_hex(trusted_pin, HEX64, "HOLD_FIELD_INDEPENDENT_PIN_REQUIRED")
    if not (2 <= len(receipt) <= 8192 and 2 <= len(evidence) <= 262144):
        raise ValueError("HOLD_FIELD_SIZE_INVALID")
    if len(signature_b64) > 256 or len(trusted_pem) > 8192:
        raise ValueError("HOLD_FIELD_KEY_SIZE_INVALID")
    try:
        payload = json.loads(receipt)
    except (ValueError, UnicodeDecodeError) as error:
        raise ValueError("HOLD_FIELD_JSON_INVALID") from error
    if not isinstance(payload, dict) or frozenset(payload) != FIELDS:
        raise ValueError("HOLD_FIELD_SCHEMA_INVALID")
    if (payload["schema"] != SCHEMA or payload["scope"] != expected_scope
            or payload["host"] != HOST or payload["sourceCommit"] != expected_commit):
        raise ValueError("HOLD_FIELD_HOST_SCOPE_COMMIT_MISMATCH")
    require_hex(payload["nonce"], HEX32, "HOLD_FIELD_NONCE_INVALID")
    if (require_hex(payload["evidenceSha256"], HEX64, "HOLD_FIELD_EVIDENCE_HASH_INVALID")
            != hashlib.sha256(evidence).hexdigest()):
        raise ValueError("HOLD_FIELD_EVIDENCE_TAMPERED")
    if payload["signerKeyFingerprint"] != trusted_pin:
        raise ValueError("HOLD_FIELD_PIN_MISMATCH")
    if (
        not isinstance(payload["checks"], dict)
        or frozenset(payload["checks"]) != CHECKS[expected_scope]
    ):
        raise ValueError("HOLD_FIELD_CHECKLIST_INCOMPLETE")
    if not all(v is True for v in payload["checks"].values()):
        raise ValueError("HOLD_FIELD_CHECKLIST_FAILED")
    observed, issued = utc(payload["observedAt"]), utc(payload["issuedAt"])
    current = now or datetime.now(timezone.utc)
    if (observed > issued or issued > current + timedelta(minutes=2)
            or current - observed > timedelta(hours=24)
            or issued - observed > timedelta(hours=2)):
        raise ValueError("HOLD_FIELD_STALE_OR_FUTURE")
    try:
        key = load_pem_public_key(trusted_pem)
        if not isinstance(key, Ed25519PublicKey):
            raise ValueError("HOLD_FIELD_ED25519_KEY_REQUIRED")
        actual_pin = hashlib.sha256(key.public_bytes(Encoding.Raw, PublicFormat.Raw)).hexdigest()
        if actual_pin != trusted_pin:
            raise ValueError("HOLD_FIELD_PUBLIC_KEY_PIN_MISMATCH")
        signature = base64.b64decode(signature_b64.strip(), validate=True)
        if len(signature) != 64:
            raise ValueError("HOLD_FIELD_SIGNATURE_FORMAT")
        key.verify(signature, canonical(payload))
    except ValueError:
        raise
    except Exception as error:
        raise ValueError("HOLD_FIELD_SIGNATURE_INVALID") from error
    return {
        "scope": expected_scope,
        "sourceCommit": expected_commit,
        "signedClaimVerified": True,
        "realWorldAssertionsIndependentlyCorroborated": False,
        "claimEvidenceDigest": payload["evidenceSha256"],
        "signerKeyFingerprint": trusted_pin,
        "nonce": payload["nonce"],
        "changesMade": False,
    }


def load_script(file_name: str, module_name: str):
    path = Path(__file__).with_name(file_name)
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ValueError("HOLD_FIELD_DEPENDENT_VERIFIER_MISSING")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def limited_read(folder: Path, name: str, limit: int) -> bytes:
    target = folder / name
    if not target.is_file() or target.is_symlink() or target.stat().st_size > limit:
        raise ValueError("HOLD_FIELD_EVIDENCE_FILE_MISSING_OR_TOO_LARGE")
    return target.read_bytes()


def evaluate(folder: Path, expected_commit: str, pins: dict[str, str]) -> dict:
    """Verify source-linked claims; missing evidence produces explicit HOLDs."""
    require_hex(expected_commit, HEX40, "HOLD_FIELD_UNVERIFIED_SOURCE")
    status: dict[str, dict] = {}
    reasons: list[str] = []
    fingerprints = list(pins.values())
    unique_pins = len(fingerprints) == len(set(fingerprints))
    if not unique_pins:
        reasons.append("HOLD_SIGNING_KEYS_NOT_INDEPENDENT")

    try:
        witness = load_script("verify-signed-prelogin-witness359.py", "witness359_360")
        reboot = load_script("reconcile-original-host359.py", "reconcile359_360")
        local = json.loads(limited_read(folder, "local-after-reboot.json", 128000))
        result = witness.verify(
            limited_read(folder, "prelogin-receipt.json", 8192),
            limited_read(folder, "prelogin.sig.b64", 256),
            limited_read(folder, "prelogin-probes.jsonl", 12000000),
            limited_read(folder, "prelogin.pub.pem", 8192),
            pins.get("prelogin", ""), expected_commit,
        )
        correlated = reboot.correlate(local, result, expected_commit)
        if not correlated["reconciledHostAndSource"]:
            raise ValueError("HOLD_REBOOT_AND_SIGNED_WITNESS_NOT_CORRELATED")
        status["reboot"] = {"status": "SIGNED_CLAIMS_CORRELATED_NOT_PHYSICAL_APPROVAL"}
    except (OSError, ValueError, TypeError, KeyError) as error:
        code = str(error)
        if not code.startswith("HOLD_"):
            code = "HOLD_REBOOT_EVIDENCE_INVALID_OR_MISSING"
        status["reboot"] = {"status": code}
        reasons.append(code)

    for scope in CHECKS:
        try:
            verified = verify_field(
                limited_read(folder, scope + ".json", 8192),
                limited_read(folder, scope + ".sig.b64", 256),
                limited_read(folder, scope + ".evidence", 262144),
                limited_read(folder, scope + ".pub.pem", 8192),
                pins.get(scope, ""), expected_commit, scope,
            )
            # An individual attestation still does not independently prove the asserted event.
            status[scope] = {"status": "SIGNED_CLAIM_NOT_INDEPENDENT_PHYSICAL_PROOF",
                             "evidenceSha256": verified["claimEvidenceDigest"]}
        except (OSError, ValueError, TypeError, KeyError) as error:
            code = str(error)
            if not code.startswith("HOLD_"):
                code = "HOLD_FIELD_EVIDENCE_INVALID_OR_MISSING"
            status[scope] = {"status": code}
            reasons.append(code)

    # Sources can never grant runtime approval, nor switch a receiver ON.
    reasons.append("HOLD_PHYSICAL_WITNESS_AND_INDEPENDENT_OWNER_APPROVAL")
    reasons.append("HOLD_REAL_DEVICE_AND_SERVICE_AUTHENTICATED_RUNTIME_PROOF")
    return {
        "schema": OUTPUT_SCHEMA,
        "originalHost": HOST,
        "sourceCommit": expected_commit,
        "readOnly": True,
        "scopeStatuses": status,
        "independentKeySeparationVerified": unique_pins and len(pins) == 4,
        "holdCodes": sorted(set(reasons)),
        "physicalUnattendedProductionGreen": False,
        "threeMasterWorkerProductionGreen": False,
        "commsPrivateTestReceiverAuthorized": False,
        "automaticEnrollmentAuthorized": False,
        "changesMade": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build 360 read-only four-scope field acceptance")
    parser.add_argument("--evidence-dir", type=Path, required=True)
    parser.add_argument("--expected-commit", required=True)
    for name in ("prelogin", *CHECKS):
        parser.add_argument("--" + name + "-key-sha256", default="")
    parser.add_argument("--strict", action="store_true", help="Exit 2 when any HOLD remains")
    args = parser.parse_args()
    pins = {name: getattr(args, name.replace("-", "_") + "_key_sha256")
            for name in ("prelogin", *CHECKS)}
    try:
        report = evaluate(args.evidence_dir, args.expected_commit, pins)
    except (OSError, ValueError) as error:
        reason = str(error) if str(error).startswith("HOLD_") else "HOLD_REVIEW_FAILED"
        parser.exit(2, reason + "\n")
    print(json.dumps(report, sort_keys=True))
    if args.strict and report["holdCodes"]:
        parser.exit(2)


if __name__ == "__main__":
    main()
