param(
    [string]$TaskName = "Rosevear AI Hub Recovery",
    [switch]$Install,
    [switch]$Remove
)
$ErrorActionPreference = "Stop"
if ($Install -eq $Remove) { throw "Specify exactly one of -Install or -Remove." }
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Remove) {
    if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }
    Write-Host "Recovery task removed (if present). Existing server startup task unchanged."
    exit 0
}
if ($existing) { throw "Task '$TaskName' already exists; refusing to overwrite." }
$root = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $PSScriptRoot "hub-recovery.ps1"
if (-not (Test-Path $scriptPath)) { throw "Recovery script missing: $scriptPath" }
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
# SCHTASKS supports five-minute repetition across Windows PowerShell versions;
# no direct edits to the ScheduledTasks CIM Repetition property are required.
$taskCommand = 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f $scriptPath
& schtasks.exe /Create /TN $TaskName /TR $taskCommand /SC MINUTE /MO 5 /RU $identity /IT /RL HIGHEST
if ($LASTEXITCODE -ne 0) { throw "schtasks.exe failed; task was not successfully installed." }
Write-Host "Installed recovery task repeating every five minutes. Existing startup task unchanged."
