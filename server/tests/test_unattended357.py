"""Build 357 source, read-only identity, and acceptance fail-closed contracts."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "scripts"


def source(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def test_installer_inspect_reports_existing_tasks_without_mutation():
    installer = source("install-hub-unattended356.ps1")
    for marker in (
        "HubUnattendedTaskIdentity357.ps1",
        "bootIdentityVerified",
        "recoveryIdentityVerified",
        "bootMismatchCodes",
        "recoveryMismatchCodes",
        "bootCheckFlags",
        "recoveryCheckFlags",
        "HOLD_UNRECOGNIZED_TASK_",
        "$script:inspectionOnly",
        "if (-not $report.identityVerified -and -not $script:inspectionOnly)",
    ):
        assert marker in installer
    assert "Reset-ScheduledTask" not in installer
    assert "Unregister-ScheduledTask" not in installer


def test_identity_report_never_emits_secret_or_raw_task_identity():
    identity = source("HubUnattendedTaskIdentity357.ps1")
    for marker in (
        "Test-HubUnattendedTaskIdentity357",
        "Resolve-HubUnattendedSid357",
        "rootTaskPath",
        "executableExact",
        "argumentsExact",
        "principalSameSid",
        "passwordBatchLogon",
        "recoveryIntervalExact",
        "recoveryDurationIndefinite",
        "reasonCodes",
        "identityVerified",
    ):
        assert marker in identity
    for forbidden in (
        "Register-ScheduledTask",
        "Enable-ScheduledTask",
        "Disable-ScheduledTask",
        "Stop-Process",
        "Set-ScheduledTask",
        "Get-Credential",
        "Start-Process",
        "ConvertTo-SecureString",
    ):
        assert forbidden not in identity


def test_original_host_acceptance_is_read_only_and_fail_closed():
    snapshot = source("inspect-original-host-acceptance357.ps1")
    for marker in (
        "original-host-acceptance357.v1",
        "UNSIGNED_LOCAL_READ_ONLY",
        "remotePreLoginWitnessVerified=$false",
        "independentWindowsBootWitnessVerified=$false",
        "independentMasterPeerMtlSAndAckVerified=$false",
        "productionOriginalHostBootGreen=$false",
        "commsPrivateReceiverAuthorityVerified=$false",
        "ownerCustodianEnrollmentIndependentlyVerified=$false",
        "Rosevear-AIDataPlatform",
        "Rosevear-CommsHub",
        "originalVmAndOllamaPinReady",
    ):
        assert marker in snapshot
    for forbidden in (
        "Register-ScheduledTask",
        "Enable-ScheduledTask",
        "Disable-ScheduledTask",
        "Start-ScheduledTask",
        "Start-VM",
        "startvm",
        "Invoke-Reboot",
        "Restart-Computer",
        "Set-Service",
        "New-NetFirewallRule",
    ):
        assert forbidden not in snapshot


def test_no_live_peer_or_receiver_activation():
    installer = source("install-hub-unattended356.ps1")
    identity = source("HubUnattendedTaskIdentity357.ps1")
    acceptance = source("inspect-original-host-acceptance357.ps1")
    for source_text in (installer, identity, acceptance):
        assert "ql340c-windows-operator.ps1 -Start" not in source_text
        assert "mTLS_verified=$true" not in source_text
        assert "certificateRotationComplete=$true" not in source_text
