param(
    [switch]$CheckOnly,
    [switch]$SkipCamera,
    [int]$StartupTimeoutSeconds = 35
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$maintenanceHandle = $null
$ManagedRuntime = $false
try {
$ManagedHome = Join-Path $Root 'logs\hub-deployment'
. (Join-Path $PSScriptRoot 'hub-recovery-mode.ps1')
$RecoveryMode = Get-HubRecoveryMode -ManagedHome $ManagedHome
if ($RecoveryMode -eq 'Hold') {
    Write-Error 'HOLD: unknown or unreadable Hub activation journal. Nothing changed.'
    exit 2
}
# After an interrupted supervised_bootstrap there is no active.json. The old
# code called managed recovery solely because the journal existed, then failed
# with "No managed release is enrolled." Allow guarded legacy startup ONLY for
# this exact known phase, while preserving the activation journal for review.
if ($RecoveryMode -eq 'Managed') {
    # Recovery and activation share an OS-released lock. Tasks remain enabled;
    # after a controller crash the next recovery pass uses the rollback journal.
    $controllerPython = Join-Path $Root '.venv\Scripts\python.exe'
    $mode = 'recover'
    if ($CheckOnly) { $mode = 'inspect-runtime' }
    & $controllerPython -B (Join-Path $PSScriptRoot 'hub_release_manager.py') $mode --repo-root $Root
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    $ManagedRuntime = $true
    # Managed recovery covers both Hub services. Camera recovery below remains
    # the existing task's responsibility outside maintenance; never an updater action.
    if ($CheckOnly -or $SkipCamera) { exit 0 }
    # If activation owns the lock, leave the entire existing task pass untouched.
    $maintenanceHandle = $null
    try {
        $maintenanceHandle = [IO.File]::Open((Join-Path $ManagedHome 'maintenance.lock'), 'Open', 'ReadWrite', 'None')
    } catch [IO.IOException] {
        if (($_.Exception.HResult -band 0xffff) -in @(32,33)) { exit 0 }
        throw
    }
}
if (-not $maintenanceHandle) {
    # Honor the same maintenance lock during the initial supervised bootstrap,
    # before a managed active pointer exists. No task-disable operation is needed.
    New-Item -ItemType Directory -Path $ManagedHome -Force | Out-Null
    try {
        $maintenanceHandle = [IO.File]::Open((Join-Path $ManagedHome 'maintenance.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    } catch [IO.IOException] {
        if (($_.Exception.HResult -band 0xffff) -in @(32,33)) { exit 0 }
        throw
    }
}
# Recheck after obtaining the maintenance lock so an activation that completed
# concurrently cannot be overtaken by a legacy startup.
if ((Get-HubRecoveryMode -ManagedHome $ManagedHome) -ne $RecoveryMode) {
    Write-Warning 'Release state changed during recovery; retry on next scheduled pass.'
    exit 0
}
$LogDirectory = Join-Path $Root "logs"
New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
$LogFile = Join-Path $LogDirectory "hub-recovery.log"

function Write-RecoveryLog([string]$Message) {
    $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -LiteralPath $LogFile -Value $line
    Write-Host $line
}
function Test-LocalPort([int]$Port) {
    [bool](Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}
function Test-HttpStatus([string]$Url) {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4
        return ($response.StatusCode -eq 200)
    } catch { return $false }
}
function Wait-Healthy([scriptblock]$Probe, [int]$Seconds) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    do {
        if (& $Probe) { return $true }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    return $false
}
$Python = Join-Path $Root ".venv\Scripts\python.exe"
$Go2RTC = Join-Path $Root "tools\go2rtc\go2rtc.exe"
$Go2RTCLauncher = Join-Path $Root "scripts\start-go2rtc.ps1"
$ApiProbe = { Test-HttpStatus "http://127.0.0.1:8765/health" }
$WebProbe = { Test-HttpStatus "http://127.0.0.1:5173/" }
$CameraProbe = { Test-HttpStatus "http://127.0.0.1:1984/api" }

# Do not replace a process owned by an unknown application or restart a failing
# listener in a loop. Scheduled-task history and log are the escalation path.
if (& $ApiProbe) {
    Write-RecoveryLog "API healthy."
} elseif (Test-LocalPort 8765) {
    Write-RecoveryLog "ERROR API port occupied but health check failed; refusing duplicate launch."
    exit 2
} elseif ($CheckOnly -or $ManagedRuntime) {
    Write-RecoveryLog "API unavailable (check-only)."
    exit 1
} elseif (-not (Test-Path $Python)) {
    Write-RecoveryLog "ERROR Python virtual environment missing."
    exit 2
} else {
    # A stale live DB must not be auto-started under newer checkout source,
    # including after an interrupted initial supervised migration.
    & $Python -B (Join-Path $PSScriptRoot 'hub_release_manager.py') inspect-schema --repo-root $Root
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-RecoveryLog "Starting API."
    # Reuse the launcher proven during the October power-outage recovery. It
    # verifies the running Hub identity/version and refuses duplicate startups.
    & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'restart-hub-backend.ps1') -Action Start -RepoRoot $Root
    if ($LASTEXITCODE -ne 0) {
        Write-RecoveryLog "ERROR verified API launcher failed; no retry or DB writes."
        exit 2
    }
    if (-not (Wait-Healthy $ApiProbe $StartupTimeoutSeconds)) {
        Write-RecoveryLog "ERROR API did not become healthy."
        exit 2
    }
    Write-RecoveryLog "API recovered."
}
if (& $WebProbe) {
    Write-RecoveryLog "Web healthy."
} elseif (Test-LocalPort 5173) {
    Write-RecoveryLog "ERROR Web port occupied but HTTP check failed; refusing duplicate launch."
    exit 2
} elseif ($CheckOnly -or $ManagedRuntime) {
    Write-RecoveryLog "Web unavailable (check-only)."
    exit 1
} else {
    $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
    if (-not $npm) {
        Write-RecoveryLog "ERROR npm.cmd missing."
        exit 2
    }
    Write-RecoveryLog "Starting web preview on strict port 5173."
    # Strict port prevents silent fallback to 5174 and duplicate previews.
    Start-Process -FilePath "cmd.exe" -ArgumentList @("/d", "/c", "npm.cmd --workspace apps/web run dev -- --host 127.0.0.1 --strictPort") -WorkingDirectory $Root -WindowStyle Hidden
    if (-not (Wait-Healthy $WebProbe $StartupTimeoutSeconds)) {
        Write-RecoveryLog "ERROR Web did not become healthy."
        exit 2
    }
    Write-RecoveryLog "Web recovered."
}
if (-not $SkipCamera) {
    if (& $CameraProbe) {
        Write-RecoveryLog "go2rtc API healthy."
    } elseif (Test-LocalPort 1984) {
        Write-RecoveryLog "WARNING go2rtc port occupied but API is unhealthy; no duplicate launch."
    } elseif ($CheckOnly) {
        Write-RecoveryLog "WARNING go2rtc offline (check-only)."
    } elseif ((Test-Path $Go2RTC) -and (Test-Path $Go2RTCLauncher)) {
        try {
            & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Go2RTCLauncher
            if ($LASTEXITCODE -ne 0) { throw "go2rtc launcher returned $LASTEXITCODE" }
            Write-RecoveryLog "go2rtc startup attempted; verify camera streams separately."
        } catch {
            Write-RecoveryLog "WARNING go2rtc startup failed; check local binary/config and camera credentials."
        }
    } else {
        Write-RecoveryLog "WARNING go2rtc executable missing; install the official Windows binary under tools/go2rtc."
    }
}
Write-RecoveryLog "Recovery pass complete."
} finally {
    if ($maintenanceHandle) { $maintenanceHandle.Dispose() }
}
