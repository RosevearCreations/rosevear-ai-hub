<#
.SYNOPSIS
Explicit Windows backend update + stopped-API migration + restart, no web/client restart.
.DESCRIPTION
Pause the operator's existing recovery task before running; do not kill unknown
listeners. Uses generic git-safe updater, then starts a known local Hub API.
.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\update-hub-backend.ps1
.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\update-hub-backend.ps1 -ApplyMigrations -BackupVerified
#>
param(
    [string]$RepoRoot = "",
    [switch]$ApplyMigrations,
    [switch]$BackupVerified,
    [switch]$SkipTests
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    if ($PSScriptRoot) { $RepoRoot = Split-Path -Parent $PSScriptRoot }
    else { $RepoRoot = (Get-Location).Path }
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
if ($ApplyMigrations -and -not $BackupVerified) {
    throw "Confirm a real encrypted restorable backup before -ApplyMigrations -BackupVerified."
}
$root = Join-Path $RepoRoot "scripts"
$updater = Join-Path $root "update-rosevear-ai-hub.ps1"
$backend = Join-Path $root "restart-hub-backend.ps1"
if (-not (Test-Path $updater) -or -not (Test-Path $backend)) {
    throw "Maintenance helpers missing. Update the repository using the generic updater first."
}
Write-Host "Pause ONLY the known Hub recovery scheduled task first." -ForegroundColor Yellow
$consent = Read-Host "Type PAUSED to confirm recovery task is paused (or type anything else to cancel)"
if ($consent -cne "PAUSED") { throw "No maintenance performed; pause recovery task first." }

& $backend -Action Inspect -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) { throw "Backend listener inspection failed; no update attempted." }
& $backend -Action Stop -RepoRoot $RepoRoot
if ($LASTEXITCODE -ne 0) { throw "Backend stop failed; no update attempted." }

try {
    & $updater -RepoRoot $RepoRoot -ApplyMigrations:$ApplyMigrations -SkipTests:$SkipTests
    if ($LASTEXITCODE -ne 0) { throw "Generic updater failed. Restart withheld." }
} catch {
    Write-Host "Update failed. Backend restart withheld; review the error and backup before retrying." -ForegroundColor Red
    throw
}
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) { throw "Python environment absent after update." }
$expected = (& $Python -c "import rosevear_ai_hub; print(rosevear_ai_hub.__version__)").Trim()
if ($LASTEXITCODE -ne 0) { throw "Cannot verify new backend version." }
& $backend -Action Start -RepoRoot $RepoRoot -ExpectedVersion $expected
if ($LASTEXITCODE -ne 0) { throw "New backend startup failed. Review logs; do not launch another copy." }
Write-Host "Backend update/restart verified at version $expected." -ForegroundColor Green
Write-Host "Resume the existing recovery task after checking backend and client health."
