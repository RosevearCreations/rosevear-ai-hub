"""Build 356 source safeguards; CI cannot claim real Windows boot acceptance."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "scripts"


def src(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def test_unattended_tasks_require_explicit_owner_enrollment():
    source = src("install-hub-unattended356.ps1")
    for required in (
        "Get-Credential",
        "New-ScheduledTaskTrigger -AtStartup",
        "New-ScheduledTaskTrigger -Daily",
        "-Password $plain",
        "Disable-ScheduledTask",
        "Enable-ScheduledTask",
        "HOLD_UNRECOGNIZED_TASK",
        "DESKTOP-AE894KC",
    ):
        assert required in source
    assert "LogonType Interactive" not in source
    assert "schtasks.exe /Create" not in source
    assert "Rosevear AI Server Startup" not in source



def test_partial_install_pin_can_be_resumed_only_after_exact_match():
    source = src("install-hub-unattended356.ps1")
    for required in (
        "EXISTING_OWNER_PIN_MATCHES_VM_AND_OLLAMA",
        "HOLD_PRIOR_PINNED_CONFIG_MISMATCH_NO_OVERWRITE",
        "CONFIG_FIELDS_INVALID",
        "savedPin.vmUuid -ine $uuid",
        "GetFullPath([string]$savedPin.ollamaExecutable)",
        "GetFullPath($ollamaPath)",
        "IO.File]::Open($cfgPath, 'CreateNew'",
        "($savedFile.Attributes -band [IO.FileAttributes]::ReparsePoint)",
    ):
        assert required in source
    assert "HOLD_PRIOR_PINNED_CONFIG_REQUIRES_OWNER_REVIEW" not in source
    assert "Remove-Item -LiteralPath $cfgPath" not in source
    assert "Set-Content -LiteralPath $cfgPath" not in source

def test_unattended_worker_reuses_only_existing_guarded_launchers():
    source = src("boot-hub-unattended356.ps1")
    for required in (
        "showvminfo",
        "startvm",
        "--type headless",
        "HOLD_VM_STATE_REQUIRES_OWNER_REVIEW",
        "127.0.0.1:11434",
        "hub-recovery.ps1",
        "start-hub-lan-gateway.ps1",
    ):
        assert required in source
    for forbidden in (
        "git pull",
        "npm install",
        "alembic upgrade",
        "Stop-Process",
        "New-NetFirewallRule",
        "ql340c-windows-operator.ps1",
    ):
        assert forbidden not in source


def test_virtualbox_inspection_replaces_incorrect_hyperv_assumption():
    source = src("inspect-master-startup355.ps1")
    assert "VBoxManage.exe" in source
    assert "VIRTUALBOX_GUEST_RUNNING_NOT_BOOT_PROOF" in source
    assert "Get-VM" not in source
