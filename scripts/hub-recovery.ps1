param(
    [switch]$CheckOnly,
    [switch]$SkipCamera,
    [int]$StartupTimeoutSeconds = 35
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
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
} elseif ($CheckOnly) {
    Write-RecoveryLog "API unavailable (check-only)."
    exit 1
} elseif (-not (Test-Path $Python)) {
    Write-RecoveryLog "ERROR Python virtual environment missing."
    exit 2
} else {
    Write-RecoveryLog "Starting API."
    Start-Process -FilePath $Python -ArgumentList @("-m", "uvicorn", "rosevear_ai_hub.main:app", "--host", "127.0.0.1", "--port", "8765") -WorkingDirectory $Root -WindowStyle Hidden
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
} elseif ($CheckOnly) {
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
    Start-Process -FilePath "cmd.exe" -ArgumentList @("/d", "/c", "npm.cmd run web:dev -- --strictPort") -WorkingDirectory $Root -WindowStyle Hidden
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
