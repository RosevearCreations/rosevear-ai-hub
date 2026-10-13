<# Build 060 opt-in, outbound-only adoption of a verified GitHub GREEN main push.
No automatic database migration, external device control, secret access or force-reset. #>
param(
    [string]$RepoRoot = '',
    [switch]$Apply
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (-not $RepoRoot) { $RepoRoot = Split-Path -Parent $PSScriptRoot }
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$logDir = Join-Path $RepoRoot 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logFile = Join-Path $logDir 'hub-release-adoption.log'
$statusFile = Join-Path $logDir 'hub-release-adoption.json'
$lockFile = Join-Path $logDir 'hub-release-adoption.lock'
. (Join-Path $PSScriptRoot 'hub-release-policy.ps1')
$lock = $null
$recoveryDisabled = $false
$recoveryTaskName = 'Rosevear AI Hub Recovery'
$release = ''
$previousHead = ''
function Note([string]$message) {
    $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $message
    Write-Host $line
    Add-Content -LiteralPath $logFile -Value $line
}
function Record([string]$state, [string]$message) {
    $data = [ordered]@{
        checked_utc = (Get-Date).ToUniversalTime().ToString('o')
        state = $state
        release = $release
        previous_commit = $previousHead
        detail = $message
    }
    $data | ConvertTo-Json | Set-Content -LiteralPath $statusFile -Encoding UTF8
    Note "$state : $message"
}
function Exec([string]$name, [string]$command, [string[]]$arguments) {
    & $command @arguments
    if ($LASTEXITCODE -ne 0) { throw "$name failed; exit code $LASTEXITCODE." }
}
function GitOut([string[]]$arguments) {
    $out = @(& git.exe @arguments)
    if ($LASTEXITCODE -ne 0) { throw 'Git verification failed; refusing adoption.' }
    return $out
}
try {
    # File-share lock covers checks AND adoption; overlapping task/manual starts are rejected.
    $lock = [System.IO.File]::Open($lockFile, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
    Push-Location -LiteralPath $RepoRoot
    try {
        if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot '.git'))) { throw 'Hub Git working copy missing.' }
        if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) { throw 'Git is unavailable.' }
        $branch = (GitOut @('branch','--show-current') | Select-Object -First 1).Trim()
        if ($branch -cne 'main') { throw 'Local branch is not main; operator review required.' }
        $origin = (GitOut @('config','--get','remote.origin.url') | Select-Object -First 1).Trim()
        if (-not (Test-HubOrigin -Origin $origin)) { throw 'Git origin does not match the allowed official Hub repository.' }
        if (@(GitOut @('status','--porcelain','--untracked-files=no')).Count -gt 0) {
            throw 'Tracked local changes exist; no automated overwrite.'
        }
        $previousHead = (GitOut @('rev-parse','HEAD') | Select-Object -First 1).Trim()
        $base = 'https://api.github.com/repos/RosevearCreations/rosevear-ai-hub'
        $headers = @{ 'User-Agent' = 'Rosevear-AI-Hub-Release-Adoption'; 'Accept' = 'application/vnd.github+json' }
        $branchInfo = Invoke-RestMethod -Uri "$base/branches/main" -Headers $headers -TimeoutSec 15
        $release = [string]$branchInfo.commit.sha
        if ($release -cnotmatch '^[0-9a-f]{40}$') { throw 'Malformed official main commit.' }
        $runs = Invoke-RestMethod -Uri "$base/actions/workflows/foundation.yml/runs?branch=main&event=push&per_page=30" -Headers $headers -TimeoutSec 15
        $run = @($runs.workflow_runs | Where-Object {
            $_.head_sha -ceq $release -and $_.head_branch -ceq 'main' -and $_.event -ceq 'push'
        } | Select-Object -First 1)
        if ($run.Count -ne 1) {
            Record 'HOLD' 'Official main has no independent push workflow evidence yet.'
            exit 0
        }
        $jobsResponse = Invoke-RestMethod -Uri "$base/actions/runs/$($run[0].id)/jobs?per_page=100" -Headers $headers -TimeoutSec 15
        if ($jobsResponse.total_count -gt 100 -or
            -not (Test-HubReleaseEligible -RemoteSha $release -Run $run[0] -Jobs @($jobsResponse.jobs))) {
            Record 'HOLD' 'The five required jobs are not all GREEN on the exact main push.'
            exit 0
        }
        if ($previousHead -ceq $release) {
            Record 'CURRENT' 'Verified GREEN main commit already installed; no restart requested.'
            exit 0
        }
        Exec 'Fetch official main' 'git.exe' @('fetch','origin','main')
        $remote = (GitOut @('rev-parse','origin/main') | Select-Object -First 1).Trim()
        if ($remote -cne $release) { throw 'Remote main changed during verification; retry a later check.' }
        & git.exe merge-base --is-ancestor HEAD origin/main
        if ($LASTEXITCODE -ne 0) { throw 'Local history diverged; refusing reset, rebase or force-pull.' }
        $changed = @(GitOut @('diff','--name-only','HEAD','origin/main'))
        if (Test-HubSchemaChanges -ChangedPaths $changed) {
            Record 'HOLD' 'Database migration changes detected; require verified backup and explicit operator procedure.'
            exit 0
        }
        if (-not $Apply) {
            Record 'READY' 'Verified GREEN, clean fast-forward and no schema migration. Preview only.'
            exit 0
        }
        $task = Get-ScheduledTask -TaskName $recoveryTaskName -ErrorAction SilentlyContinue
        if (-not $task -or $task.State -eq 'Disabled') {
            throw 'Recovery task missing or disabled; refusing unattended maintenance.'
        }
        # Stage source, dependencies, tests and web build BEFORE taking the API offline.
        # The generic updater re-verifies fast-forward, origin/main and expected SHA.
        Note "Staging verified release $release (before backend stop)."
        Exec 'Stage and test verified release' 'powershell.exe' @(
            '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',
            (Join-Path $PSScriptRoot 'update-rosevear-ai-hub.ps1'), '-RepoRoot',$RepoRoot,
            '-ExpectedCommit',$release
        )
        # Fail closed if another operator disabled/reconfigured recovery during staging.
        $task = Get-ScheduledTask -TaskName $recoveryTaskName -ErrorAction Stop
        if ($task.State -eq 'Disabled') { throw 'Recovery task changed during staging.' }
        Disable-ScheduledTask -TaskName $recoveryTaskName -ErrorAction Stop | Out-Null
        $recoveryDisabled = $true
        Note 'Hub recovery task paused for a bounded verified-process restart.'
        Exec 'Inspect verified backend' 'powershell.exe' @(
            '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',
            (Join-Path $PSScriptRoot 'restart-hub-backend.ps1'), '-Action','Inspect','-RepoRoot',$RepoRoot
        )
        Exec 'Inspect verified web client' 'powershell.exe' @(
            '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',
            (Join-Path $PSScriptRoot 'restart-hub-web.ps1'), '-Action','Inspect','-RepoRoot',$RepoRoot
        )
        Exec 'Stop known web client' 'powershell.exe' @(
            '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',
            (Join-Path $PSScriptRoot 'restart-hub-web.ps1'), '-Action','Stop','-RepoRoot',$RepoRoot
        )
        Exec 'Stop verified backend' 'powershell.exe' @(
            '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',
            (Join-Path $PSScriptRoot 'restart-hub-backend.ps1'), '-Action','Stop','-RepoRoot',$RepoRoot
        )
        $python = Join-Path $RepoRoot '.venv\Scripts\python.exe'
        if (-not (Test-Path -LiteralPath $python)) { throw 'Staged Python environment missing.' }
        $version = (& $python -c 'import rosevear_ai_hub; print(rosevear_ai_hub.__version__)').Trim()
        if ($LASTEXITCODE -ne 0 -or $version -notmatch '^\d+\.\d+\.\d+$') { throw 'Staged backend version invalid.' }
        Exec 'Start verified backend' 'powershell.exe' @(
            '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',
            (Join-Path $PSScriptRoot 'restart-hub-backend.ps1'), '-Action','Start',
            '-RepoRoot',$RepoRoot,'-ExpectedVersion',$version
        )
        Exec 'Start and inspect Hub web via recovery' 'powershell.exe' @(
            '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',
            (Join-Path $PSScriptRoot 'hub-recovery.ps1'), '-SkipCamera'
        )
        Exec 'Verify API and client without changing devices' 'powershell.exe' @(
            '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',
            (Join-Path $PSScriptRoot 'hub-recovery.ps1'), '-CheckOnly','-SkipCamera'
        )
        Record 'ADOPTED' 'GREEN release staged and backend/web health verified. Local Windows acceptance is distinct from CI.'
    }
    finally { Pop-Location }
}
catch {
    # Avoid printing raw exceptions from remote systems/paths; details stay local.
    Record 'FAILED' 'Release adoption stopped safely. Inspect local release-adoption and backend maintenance logs.'
    Write-Error 'Hub auto-update failed; recovery will be restored if this task paused it.'
    exit 1
}
finally {
    if ($recoveryDisabled) {
        try {
            Enable-ScheduledTask -TaskName $recoveryTaskName -ErrorAction Stop | Out-Null
            Note 'Hub recovery task resumed.'
        }
        catch { Note 'WARNING: recovery task could not be resumed; operator intervention required.' }
    }
    if ($lock) { $lock.Dispose() }
}
