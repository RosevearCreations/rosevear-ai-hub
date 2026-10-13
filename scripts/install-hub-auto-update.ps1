<# One-time opt-in. Does not install or change tasks unless -Install is supplied. #>
param(
    [switch]$Install,
    [switch]$Remove,
    [string]$TaskName = 'Rosevear AI Hub Release Adoption'
)
$ErrorActionPreference = 'Stop'
if ($Install -eq $Remove) { throw 'Choose exactly one of -Install or -Remove.' }
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Remove) {
    if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }
    Write-Host 'Only the Release Adoption scheduled task was removed.'
    exit 0
}
if ($existing) { throw 'Release Adoption task already exists. No overwrite performed.' }
$scriptPath = Join-Path $PSScriptRoot 'hub-auto-update.ps1'
if (-not (Test-Path -LiteralPath $scriptPath)) { throw 'Build 060 auto-update script missing.' }
$recovery = Get-ScheduledTask -TaskName 'Rosevear AI Hub Recovery' -ErrorAction SilentlyContinue
if (-not $recovery) { throw 'Install and verify the existing Hub Recovery task before enabling unattended adoption.' }
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$taskCommand = 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}" -Apply' -f $scriptPath
& schtasks.exe /Create /TN $TaskName /TR $taskCommand /SC HOURLY /MO 1 /RU $identity /IT /RL HIGHEST
if ($LASTEXITCODE -ne 0) { throw 'Release Adoption Scheduled Task was not installed.' }
Write-Host 'Opt-in hourly GREEN-release adoption installed (only while this Windows user is signed in).'
Write-Host 'A release with a new schema migration, unknown process or incomplete CI is held for manual review.'
