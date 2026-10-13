<# Isolated Windows release slots. Preview is default; -Stage never restarts.
Enrollment and the first activation require separate operator approval. #>
param(
    [string]$RepoRoot = '',
    [switch]$Apply,
    [switch]$Stage,
    [string]$BaselineCommit = '',
    [string]$BackupEvidence = '',
    [switch]$ReviewedControlChanges,
    [string]$ExpectedCommit = '',
    [switch]$RetryFailedRelease
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (-not $RepoRoot) { $RepoRoot = Split-Path -Parent $PSScriptRoot }
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
if ($Apply -and $Stage) { throw 'Choose preview, -Stage or -Apply.' }
$python = Join-Path $RepoRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) { throw 'Controller Python missing; no environment is modified automatically.' }
$mode = 'check'
if ($Stage) { $mode = 'stage' }
if ($Apply) { $mode = 'apply' }
$arguments = @('-B', (Join-Path $PSScriptRoot 'hub_release_manager.py'), $mode, '--repo-root', $RepoRoot)
if ($BaselineCommit) { $arguments += @('--baseline', $BaselineCommit) }
if ($BackupEvidence) { $arguments += @('--backup-evidence', $BackupEvidence) }
if ($ReviewedControlChanges) { $arguments += '--reviewed-control-changes' }
if ($ExpectedCommit) { $arguments += @('--expected-commit', $ExpectedCommit) }
if ($RetryFailedRelease) { $arguments += '--retry-failed-release' }
& $python @arguments
$result = $LASTEXITCODE
if ($Apply -and $result -ne 0) {
    & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Send-Hub-Release-Alert.ps1') -RepoRoot $RepoRoot
}
exit $result
