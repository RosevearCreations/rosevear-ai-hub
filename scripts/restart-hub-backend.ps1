<#
.SYNOPSIS
Inspect, stop, or start ONLY the verified local Rosevear AI Hub API process.
.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\restart-hub-backend.ps1
.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\restart-hub-backend.ps1 -Action Restart -ExpectedVersion 0.0.56
#>
param(
    [ValidateSet("Inspect", "Stop", "Start", "Restart")]
    [string]$Action = "Inspect",
    [string]$RepoRoot = "",
    [string]$ExpectedVersion = "",
    [int]$WaitSeconds = 45
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    if ($PSScriptRoot) { $RepoRoot = Split-Path -Parent $PSScriptRoot }
    else { $RepoRoot = (Get-Location).Path }
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"
$UserPython = Join-Path $env:LOCALAPPDATA "Programs\Python\Python311\python.exe"
. (Join-Path $PSScriptRoot "hub-backend-identity.ps1")
$Logs = Join-Path $RepoRoot "logs"
New-Item -ItemType Directory -Path $Logs -Force | Out-Null
$Log = Join-Path $Logs "hub-backend-maintenance.log"

function Note([string]$Message) {
    $entry = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -LiteralPath $Log -Value $entry
    Write-Host $entry
}
function Get-Listener {
    return @(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)
}
function Get-VerifiedPid {
    $listeners = @(Get-Listener)
    if ($listeners.Count -eq 0) { return 0 }
    $pids = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
    if ($pids.Count -ne 1) { throw "Multiple processes on 8765; manual investigation required." }
    foreach ($listener in $listeners) {
        if ($listener.LocalAddress -notin @("127.0.0.1", "::1")) {
            throw "Port 8765 listens outside loopback. Refusing to control it."
        }
    }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($pids[0])"
    if ($null -eq $process -or !$process.ExecutablePath -or !$process.CommandLine) {
        throw "Cannot verify ownership of 8765; refusing to stop it."
    }
    # The operator's existing backend may use per-user Python 3.11 rather than
    # the project venv. Require the exact app invocation AND a real Hub /version.
    $apiIdentity = $null
    try {
        $apiIdentity = Invoke-RestMethod -Uri "http://127.0.0.1:8765/version" -TimeoutSec 4
    }
    catch {
        throw "Port 8765 is occupied but Hub identity cannot be confirmed. Refusing to stop it."
    }
    $verified = Test-HubBackendIdentity `
        -ActualExecutable $process.ExecutablePath `
        -ExpectedVenvPython $Python `
        -ExpectedUserPython $UserPython `
        -CommandLine $process.CommandLine `
        -ServiceName ([string]$apiIdentity.service) `
        -Version ([string]$apiIdentity.version)
    if (-not $verified) {
        throw "Port 8765 belongs to an unverified process; refusing to stop it."
    }
    Note "Verified Rosevear AI Hub process identity: PID $($pids[0]); local version $($apiIdentity.version)."

    return [int]$pids[0]
}
function Get-ApiVersion {
    try {
        $data = Invoke-RestMethod -Uri "http://127.0.0.1:8765/version" -TimeoutSec 4
        return [string]$data.version
    } catch { return "" }
}
function Wait-For([scriptblock]$Predicate) {
    $deadline = (Get-Date).AddSeconds($WaitSeconds)
    do {
        if (& $Predicate) { return $true }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    return $false
}
$pidOwned = Get-VerifiedPid
Note "Action=$Action verified_pid=$pidOwned current_version=$(Get-ApiVersion)"
if ($Action -eq "Inspect") {
    Note "Inspection only: no process changed. Log $Log"
    exit 0
}
if ($Action -in @("Stop", "Restart") -and $pidOwned -gt 0) {
    Note "Stopping verified Hub API PID $pidOwned."
    Stop-Process -Id $pidOwned -ErrorAction Stop
    if (-not (Wait-For { @(Get-Listener).Count -eq 0 })) {
        throw "Port 8765 did not close safely; investigate before starting another API."
    }
}
if ($Action -eq "Stop") { Note "Backend stopped; external scheduled recovery must remain paused."; exit 0 }
if (-not (Test-Path -LiteralPath $Python)) { throw "Private .venv Python not found: $Python" }
if (@(Get-Listener).Count -gt 0) {
    if ($Action -eq "Start") { throw "Backend already running; refusing duplicate startup." }
    throw "Port 8765 occupied after stop, possibly by recovery task. Investigate before restart."
}
Note "Launching verified Hub API on loopback only."
$stdout = Join-Path $Logs "hub-backend-stdout.log"
$stderr = Join-Path $Logs "hub-backend-stderr.log"
$proc = Start-Process -FilePath $Python -ArgumentList @(
    "-m", "uvicorn", "rosevear_ai_hub.main:app",
    "--host", "127.0.0.1", "--port", "8765"
) -WorkingDirectory $RepoRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
if (-not (Wait-For { [bool](Get-ApiVersion) })) {
    Note "API failed to start. Review $stderr (PID $($proc.Id))."
    throw "Hub API did not become healthy. No second process attempted."
}
$version = Get-ApiVersion
if ($ExpectedVersion -and $version -ne $ExpectedVersion) {
    throw "API responded with version $version, expected $ExpectedVersion."
}
Note "Hub API healthy at version $version (PID $($proc.Id))."
