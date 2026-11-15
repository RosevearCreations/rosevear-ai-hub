"""Build346 static Windows task contract; not a substitute for original-PC run."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "scripts"


def source(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def test_new_hub_tasks_default_hidden_without_changing_identity():
    for script in (
        "install-hub-recovery-task.ps1",
        "install-hub-startup-task.ps1",
        "install-hub-lan-startup-task.ps1",
        "install-hub-auto-update.ps1",
    ):
        data = source(script)
        assert "-WindowStyle Hidden" in data, script
        assert "LogonType Interactive" in data or "/IT" in data, script
        assert "RunLevel Highest" in data or "/RL HIGHEST" in data, script


def test_existing_task_migration_requires_owner_apply_and_verification():
    data = source("set-hub-quiet-scheduled-tasks.ps1")
    for marker in (
        "[switch]$Apply",
        "Rosevear AI Hub Recovery",
        "Rosevear AI Hub Startup",
        "Rosevear AI Hub LAN Gateway",
        "Rosevear AI Hub Release Adoption",
        "New-ScheduledTaskAction",
        "Set-ScheduledTask",
        "Get-ScheduledTask",
        "WindowStyle Hidden",
        "TaskPath",
        "LogonType",
        "RunLevel",
        "Running",
        "Administrator",
    ):
        assert marker in data
    assert "Unregister-ScheduledTask" not in data
    assert "Register-ScheduledTask" not in data
    assert "Start-ScheduledTask" not in data


def test_recovery_child_powershell_invocations_are_hidden():
    data = source("hub-recovery.ps1")
    assert "-WindowStyle Hidden" in data
    assert "restart-hub-backend.ps1" in data
    assert "start-go2rtc.ps1" in data
