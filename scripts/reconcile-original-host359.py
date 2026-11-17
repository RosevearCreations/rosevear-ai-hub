"""Build 359: correlate local reboot observation and signed external witness.

Read-only; a signed claim is NOT proof of a signed Windows host receipt,
camera/MQTT health or actual AI Data/Comms worker enrollment. Never activate.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path


def load_verifier():
    path = Path(__file__).with_name("verify-signed-prelogin-witness359.py")
    spec = importlib.util.spec_from_file_location("ql468_signed_witness359", path)
    if spec is None or spec.loader is None:
        raise ValueError("HOLD_SIGNED_WITNESS_VERIFIER_MISSING")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def correlate(local_report: dict, signed_report: dict, expected_commit: str) -> dict:
    if (
        local_report.get("schema") != "rosevear.hub.ql467-original-host-continuity358.v1"
        or local_report.get("phase") != "AfterReboot"
        or local_report.get("sourceCommit") != expected_commit
        or signed_report.get("schema") != "rosevear.hub.ql468.signed-prelogin-acceptance359.v1"
        or signed_report.get("originalHost") != "DESKTOP-AE894KC"
    ):
        raise ValueError("HOLD_ORIGINAL_HOST_OR_SOURCE_CORRELATION")
    local_ok = all(
        local_report.get(field) is True
        for field in (
            "originalHostVerified",
            "taskIdentitiesVerified",
            "taskStatesEnabled",
            "originalVmHubOllamaTailscaleHealthy",
            "baselineMatched",
            "newWindowsBootObserved",
            "tasksRanSuccessfullyAfterBoot",
            "localContinuityObserved",
        )
    )
    signed_ok = all(
        signed_report.get(field) is True
        for field in (
            "trustedPublicKeyFingerprintVerified",
            "exactSourceCommitVerified",
            "signatureCryptographicallyVerified",
            "externalProbeChainVerified",
            "witnessClaimsSigned",
        )
    )
    return {
        "schema": "rosevear.hub.ql468.reconciled-boot359.v1",
        "originalHost": "DESKTOP-AE894KC",
        "expectedSourceCommit": expected_commit,
        "localWindowsBootContinuityObserved": local_ok,
        "trustedIndependentWitnessSignatureVerified": signed_ok,
        "reconciledHostAndSource": local_ok and signed_ok,
        "physicalLoginScreenCorroborationIndependentlyApproved": False,
        "authenticatedHomeAssistantMqttCameraContinuityVerified": False,
        "aiDataPlatformWorkerInstalledAndSignedAckVerified": False,
        "commsHubNonReceiverWorkerInstalledAndSignedAckVerified": False,
        "commsQl340cPrivateReceiverAuthorized": False,
        "physicalUnattendedAndThreeMasterProductionGreen": False,
        "changesMade": False,
    }


def main() -> None:
    p = argparse.ArgumentParser(description="Read-only signed/off-host + original-PC review")
    p.add_argument("--local-json", required=True, type=Path)
    p.add_argument("--receipt", required=True, type=Path)
    p.add_argument("--signature-base64", required=True, type=Path)
    p.add_argument("--witness-jsonl", required=True, type=Path)
    p.add_argument("--trusted-ed25519-public-pem", required=True, type=Path)
    p.add_argument("--trusted-key-sha256", required=True)
    p.add_argument("--expected-commit", required=True)
    args = p.parse_args()
    try:
        local_raw = args.local_json.read_bytes()
        if len(local_raw) > 128_000:
            raise ValueError("HOLD_LOCAL_REPORT_TOO_LARGE")
        local = json.loads(local_raw)
        signed = load_verifier().verify(
            args.receipt.read_bytes(),
            args.signature_base64.read_bytes(),
            args.witness_jsonl.read_bytes(),
            args.trusted_ed25519_public_pem.read_bytes(),
            args.trusted_key_sha256,
            args.expected_commit,
        )
        print(json.dumps(correlate(local, signed, args.expected_commit), sort_keys=True))
    except (OSError, ValueError) as error:
        reason = str(error)
        if not reason.startswith("HOLD_"):
            reason = "HOLD_ORIGINAL_HOST_RECONCILIATION"
        p.exit(2, reason + "\n")


if __name__ == "__main__":
    main()
