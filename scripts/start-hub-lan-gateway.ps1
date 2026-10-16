<# Build 080: bounded sign-in worker for already authorized Caddy gateway.
Never modifies firewall, certificates, Hub/HA/MQTT/Ollama/go2rtc, or camera processes.
#>
[CmdletBinding()]
param([ValidateRange(1,30)][int]$MaxAttempts = 24, [ValidateRange(1,30)][int]$DelaySeconds = 5)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root 'logs'
$recover = Join-Path $PSScriptRoot 'recover-lan-https.ps1'
if (-not (Test-Path -LiteralPath $recover)) { throw 'HOLD: gateway recovery script missing.' }
function Write-GatewayStatus([string]$message) {
    # Keep diagnostics metadata-only; never log credentials or private camera configuration.
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $line = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss') + ' ' + $message
    Add-Content -LiteralPath (Join-Path $logDir 'hub-lan-startup.log') -Value $line
    Write-Host $line
}
$ready = $false
for ($i = 1; $i -le $MaxAttempts; $i++) {
    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8765/health' -TimeoutSec 4
        $home = Invoke-WebRequest -Uri 'http://127.0.0.1:8765/' -UseBasicParsing -TimeoutSec 4
        $manifest = Invoke-WebRequest -Uri 'http://127.0.0.1:8765/manifest.webmanifest' -UseBasicParsing -TimeoutSec 4
        if ($health.status -eq 'ok' -and $home.StatusCode -eq 200 -and $manifest.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        # Backend may still be starting; bounded wait is safer than restarting it.
    }
    if ($i -lt $MaxAttempts) { Start-Sleep -Seconds $DelaySeconds }
}
if (-not $ready) { Write-GatewayStatus 'HOLD: built PWA not ready by bounded deadline.'; exit 2 }
try {
    & $recover
    if (-not $?) { throw 'Gateway recovery command did not succeed.' }
    Write-GatewayStatus 'Gateway recovery checked; review remote client separately.'
} catch {
    Write-GatewayStatus 'HOLD: gateway recovery requires operator review.'
    exit 2
}
