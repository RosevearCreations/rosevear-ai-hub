param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern("^[0-9a-f]{40}$")]
    [string]$ExpectedCommit,
    [switch]$SkipVerification
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Label" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE."
    }
}

Push-Location $RepoRoot
try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "Git is not installed or is not available in PATH."
    }
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw "Node/npm is not installed or is not available in PATH."
    }

    $TrackedChanges = (& git status --porcelain --untracked-files=no)
    if ($TrackedChanges) {
        $Details = $TrackedChanges -join [Environment]::NewLine
        throw "Tracked local changes are present. Stop and review them before updating the test server. $Details"
    }

    Invoke-Checked "Fetch verified main" { git fetch origin main --prune }
    $RemoteCommit = (& git rev-parse origin/main).Trim()
    if ($RemoteCommit -ne $ExpectedCommit) {
        throw "origin/main is $RemoteCommit but the verified release is $ExpectedCommit. No update performed."
    }

    $CurrentBranch = (& git branch --show-current).Trim()
    if ($CurrentBranch -ne "main") {
        Invoke-Checked "Switch to main" { git checkout main }
    }
    Invoke-Checked "Fast-forward local main" { git pull --ff-only origin main }

    $LocalCommit = (& git rev-parse HEAD).Trim()
    if ($LocalCommit -ne $ExpectedCommit) {
        throw "Local main is $LocalCommit after pull; expected $ExpectedCommit."
    }

    if (-not (Test-Path $Python)) {
        if (Get-Command py -ErrorAction SilentlyContinue) {
            Invoke-Checked "Create Python 3.11 virtual environment" { py -3.11 -m venv .venv }
        }
        elseif (Get-Command python -ErrorAction SilentlyContinue) {
            Invoke-Checked "Create Python virtual environment" { python -m venv .venv }
        }
        else {
            throw "Python 3.11 is not installed or available in PATH."
        }
    }

    Invoke-Checked "Upgrade pip" { & $Python -m pip install --upgrade pip }
    Invoke-Checked "Install backend and test dependencies" { & $Python -m pip install -e ".[dev]" }
    Invoke-Checked "Install Node workspaces" { npm.cmd install }
    Invoke-Checked "Upgrade database schema" { & $Python -m alembic upgrade head }

    if (-not $SkipVerification) {
        Invoke-Checked "Run backend tests" { & $Python -m pytest }
        Invoke-Checked "Type-check web application" { npm.cmd run web:typecheck }
        Invoke-Checked "Run web tests" { npm.cmd run web:test }
        Invoke-Checked "Build production web application" { npm.cmd run web:build }
    }

    Write-Host ""
    Write-Host "Test server update complete." -ForegroundColor Green
    Write-Host "Verified commit: $ExpectedCommit"
    Write-Host "Database: Alembic head"
    if ($SkipVerification) {
        Write-Host "Verification suite: skipped by explicit switch"
    }
    else {
        Write-Host "Verification suite: backend tests + web typecheck/tests/build passed"
    }
    Write-Host "Restart the Hub using the test machine's existing launch method."
}
finally {
    Pop-Location
}
