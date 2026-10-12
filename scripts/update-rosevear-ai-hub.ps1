<#
.SYNOPSIS
Safe, generic Rosevear AI Hub Windows updater. Does not stop or restart services.
.DESCRIPTION
Fast-forward verified origin/main; install Python/Node dependencies, build the
web app and optionally migrate the SQLite database with Hub API stopped.
Does not replace .env, untracked startup scripts, certificates or any local data.
Save under the repo scripts folder, or supply -RepoRoot when kept elsewhere.
.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\update-rosevear-ai-hub.ps1
.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\update-rosevear-ai-hub.ps1 -ApplyMigrations
#>
param(
    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot),
    [ValidatePattern("^(|[0-9a-fA-F]{40})$")]
    [string]$ExpectedCommit = "",
    [switch]$ApplyMigrations,
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-Step {
    param([string]$Label, [scriptblock]$Action)
    Write-Host "==> $Label" -ForegroundColor Cyan
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed (exit $LASTEXITCODE). No restart was performed."
    }
}

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"
Push-Location -LiteralPath $RepoRoot
try {
    foreach ($exe in @("git.exe", "npm.cmd")) {
        if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) {
            throw "Required executable missing from PATH: $exe"
        }
    }
    if (-not (Test-Path -LiteralPath ".git")) {
        throw "Not a Git working copy. Supply -RepoRoot pointing at rosevear-ai-hub."
    }
    $branch = (& git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $branch -ne "main") {
        throw "Checkout the local main branch safely before updating; current branch: $branch"
    }
    $changes = @(& git status --porcelain --untracked-files=no)
    if ($LASTEXITCODE -ne 0 -or $changes.Count -gt 0) {
        throw "Tracked local edits detected. Commit or review manually; updater will not overwrite them."
    }
    $old = (& git rev-parse HEAD).Trim()
    Invoke-Step "Fetch official main" { git fetch origin main }
    $remote = (& git rev-parse origin/main).Trim()
    if ($LASTEXITCODE -ne 0 -or $remote -notmatch '^[0-9a-f]{40}$') {
        throw "Could not verify origin/main commit."
    }
    if ($ExpectedCommit -and $remote -ne $ExpectedCommit.ToLowerInvariant()) {
        throw "origin/main did not match approved release $ExpectedCommit; current $remote"
    }
    & git merge-base --is-ancestor HEAD origin/main
    if ($LASTEXITCODE -ne 0) {
        throw "Local main diverged. Refusing reset, rebase, force-pull or overwrite."
    }
    Invoke-Step "Fast-forward main (no merge commit)" { git merge --ff-only origin/main }
    $head = (& git rev-parse HEAD).Trim()
    if ($head -ne $remote) { throw "Updated HEAD does not match fetched release." }
    Write-Host "Source: $old -> $head"

    if (-not (Test-Path -LiteralPath $Python)) {
        if (-not (Get-Command py.exe -ErrorAction SilentlyContinue)) {
            throw "Python 3.11 launcher missing. Install Python and rerun."
        }
        Invoke-Step "Create private Python 3.11 venv" { py.exe -3.11 -m venv .venv }
    }
    Invoke-Step "Install local backend package" { & $Python -m pip install -e ".[dev]" }
    Invoke-Step "Install Node packages" { npm.cmd install --no-audit --no-fund }
    Invoke-Step "Build production web UI" { npm.cmd run web:build }
    if (-not $SkipTests) {
        Invoke-Step "Test backend" { & $Python -m pytest }
        Invoke-Step "Test web" { npm.cmd run web:test }
    }

    if ($ApplyMigrations) {
        $listeners = @(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)
        if ($listeners.Count -gt 0) {
            throw "Hub API port 8765 is listening. Stop only the known Hub API through your own service procedure, make a verified encrypted backup, then rerun -ApplyMigrations. No services were stopped."
        }
        Write-Host "Before migration, confirm an encrypted recoverable backup exists." -ForegroundColor Yellow
        Invoke-Step "Upgrade local database schema" { & $Python -m alembic upgrade head }
    }
    else {
        Write-Host "Database migrations NOT applied. For schema-changing releases, stop the Hub API and run this updater with -ApplyMigrations after a verified backup." -ForegroundColor Yellow
    }
    $version = (& $Python -c "import rosevear_ai_hub; print(rosevear_ai_hub.__version__)").Trim()
    if ($LASTEXITCODE -ne 0) { throw "Version verification failed." }
    Write-Host "Update staged: $version at $head" -ForegroundColor Green
    Write-Host "No restart or scheduled-task change performed. Run your EXISTING restart/client script after migration and verification."
}
finally {
    Pop-Location
}
