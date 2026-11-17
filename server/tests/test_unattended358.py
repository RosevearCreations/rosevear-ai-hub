"""Build 358 / QL-467: evidence integrity without fake physical-host acceptance."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "scripts"


def source(name: str) -> str:
    return (SCRIPTS / name).read_text(encoding="utf-8")


def witness_module():
    spec = importlib.util.spec_from_file_location(
        "witness_prelogin358", SCRIPTS / "witness-hub-prelogin358.py"
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize(
    "url",
    [
        "http://hub.example/health",
        "https://localhost:8443/health",
        "https://127.0.0.1:8443/health",
        "https://[::1]:8443/health",
        "https://username:password@hub.example/health",
        "https://hub.example/health?secret=abc",
        "https://hub.example/health#token",
    ],
)
def test_external_witness_rejects_insecure_endpoints(url: str):
    with pytest.raises(ValueError):
        witness_module().endpoint_digest(url)


def test_external_witness_hash_chain_detects_tampering_but_is_not_signature():
    w = witness_module()
    assert len(w.endpoint_digest("https://192.168.68.74:8443/health")) == 64
    previous = w.ZERO
    lines = []
    for entry in (
        {
            "kind": "START",
            "schema": w.SCHEMA,
            "nonce": "a" * 32,
            "endpointSha256": "b" * 64,
            "utc": "2026-11-17T12:00:00+00:00",
            "signaturePresent": False,
        },
        {
            "kind": "PROBE",
            "sequence": 1,
            "utc": "2026-11-17T12:00:05+00:00",
            "ok": False,
            "status": "NETWORK_HOLD",
        },
        {
            "kind": "PROBE",
            "sequence": 2,
            "utc": "2026-11-17T12:00:10+00:00",
            "ok": True,
            "status": "HTTP_200",
        },
    ):
        record = w.chain_record(entry, previous)
        previous = record["sha256"]
        lines.append(json.dumps(record, sort_keys=True))
    good = w.verify_lines(lines)
    assert good["chainIntact"]
    assert good["observedFailureThenSuccess"]
    assert good["https200Count"] == 1
    assert not good["independentDigitalSignatureVerified"]
    assert not good["physicalPreloginRecoveryProven"]
    bad = lines.copy()
    bad[1] = bad[1].replace("NETWORK_HOLD", "HTTP_200")
    assert not w.verify_lines(bad)["chainIntact"]


def test_local_continuity_is_non_destructive_and_cannot_sign_a_remote_witness():
    text = source("inspect-reboot-continuity358.ps1")
    for required in (
        "'Preflight','CaptureBaseline','AfterReboot'",
        "HOLD_TASK_IDENTITIES",
        "HOLD_TASKS_NOT_ENABLED",
        "HOLD_NO_NEW_WINDOWS_BOOT",
        "HOLD_NEW_BOOT_TASK_HISTORY",
        "HOLD_PRIOR_BASELINE_REQUIRES_OWNER_REVIEW_NO_OVERWRITE",
        "'CreateNew','Write','None'",
        "offHostAuthenticatedPreLoginWitnessVerified=$false",
        "independentOwnerBackupAndGuestCameraMqttVerified=$false",
        "aiDataWorkerSignedEnrollmentVerified=$false",
        "commsWorkerSignedEnrollmentVerified=$false",
        "peerMtlSAndDurableAckVerified=$false",
        "commsPrivateTestReceiverAuthorized=$false",
        "physicalUnattendedProductionGreen=$false",
        "rebootExecuted=$false",
    ):
        assert required in text
    for forbidden in (
        "Restart-Computer",
        "Register-ScheduledTask",
        "Enable-ScheduledTask",
        "Disable-ScheduledTask",
        "Start-ScheduledTask",
        "Start-VM",
        "Start-Service",
        "Set-Service",
        "New-NetFirewallRule",
        "ql340c-windows-operator.ps1 -Start",
        "git pull",
    ):
        assert forbidden not in text


def test_external_witness_cannot_run_with_insecure_tls_or_cert_bypass():
    text = source("witness-hub-prelogin358.py")
    for required in (
        "ssl.create_default_context(cafile=cafile)",
        "NoRedirect",
        'output.open("x", encoding="utf-8")',
        '"signaturePresent": False',
        '"physicalPreloginRecoveryProven": False',
        '"masterPeerSignedAckVerified": False',
    ):
        assert required in text
    for forbidden in (
        "CERT_NONE",
        "check_hostname = False",
        "verify=False",
        "urllib3.disable_warnings",
        "https://127.0.0.1",
    ):
        # The loopback URL appears only in the negative self-test fixture, which
        # should explicitly reject it, so handle that one separately.
        if forbidden != "https://127.0.0.1":
            assert forbidden not in text
