[CmdletBinding()]
param(
    [switch]$Enable
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$ApiUrl = "http://127.0.0.1:8765"
$TailscaleTarget = "$ApiUrl"
$ExpectedDist = Join-Path $Root "apps\web\dist\index.html"

function Test-LoopbackListener {
    $listeners = @(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)
    if ($listeners.Count -eq 0) {
        throw "Hub API is not listening on port 8765. Start the existing Hub API before continuing."
    }
    foreach ($item in $listeners) {
        if ($item.LocalAddress -notin @("127.0.0.1", "::1")) {
            throw "Unsafe listener $($item.LocalAddress):8765. Refusing to expose a non-loopback API."
        }
    }
}

Push-Location $Root
try {
    if (-not (Get-Command tailscale.exe -ErrorAction SilentlyContinue)) {
        throw "Tailscale is not installed or tailscale.exe is not in PATH. Install and sign in using the official Windows app first."
    }
    Test-LoopbackListener

    if (-not (Test-Path -LiteralPath $ExpectedDist)) {
        throw "Production web assets missing. Run npm.cmd run web:build on the Windows server first."
    }

    $Health = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 10
    if ($Health.status -ne "ok") {
        throw "Hub API health did not return ok."
    }
    $Home = Invoke-WebRequest -Uri "$ApiUrl/" -UseBasicParsing -TimeoutSec 10
    $Manifest = Invoke-WebRequest -Uri "$ApiUrl/manifest.webmanifest" -UseBasicParsing -TimeoutSec 10
    if ($Home.StatusCode -ne 200 -or $Manifest.StatusCode -ne 200) {
        throw "Same-origin production frontend is not served on port 8765. Restart the updated API."
    }

    $TailnetRaw = (& tailscale.exe status --json) -join "`n"
    if ($LASTEXITCODE -ne 0) {
        throw "Tailscale daemon is not available."
    }
    $Tailnet = $TailnetRaw | ConvertFrom-Json
    if ($Tailnet.BackendState -ne "Running") {
        throw "Tailscale is not connected. Sign in to your private tailnet before enabling Serve."
    }

    Write-Host "Local API and same-origin production frontend are healthy." -ForegroundColor Green
    Write-Host "Tailscale connected. No router forwarding or Windows listener changes are needed." -ForegroundColor Green

    $ServeRaw = (& tailscale.exe serve status --json 2>&1) -join "`n"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not inspect existing Tailscale Serve/Funnel configuration. Refusing to modify it."
    }
    $ServeConfig = $ServeRaw | ConvertFrom-Json
    $TcpEntries = @($ServeConfig.TCP.PSObject.Properties | Where-Object { $_.Name }).Count
    $WebEntries = @($ServeConfig.Web.PSObject.Properties | Where-Object { $_.Name }).Count
    $FunnelEntries = @($ServeConfig.AllowFunnel.PSObject.Properties | Where-Object { $_.Name }).Count
    $AlreadyConfigured = ($TcpEntries -gt 0 -or $WebEntries -gt 0 -or $FunnelEntries -gt 0)
    if ($AlreadyConfigured) {
        Write-Host "Existing Serve or Funnel configuration detected. No changes made." -ForegroundColor Yellow
        & tailscale.exe serve status
        if ($Enable) {
            throw "Review/remove conflicting Serve or Funnel configuration yourself before enabling Hub."
        }
        return
    }

    if (-not $Enable) {
        Write-Host "Check-only complete. Private Serve has not been activated." -ForegroundColor Cyan
        Write-Host "After reviewing this result, use .\scripts\enable-tailscale-serve.ps1 -Enable to opt in."
        return
    }

    Write-Host "Enabling PRIVATE tailnet HTTPS reverse proxy, never Tailscale Funnel..." -ForegroundColor Cyan
    & tailscale.exe serve --bg --https=443 $TailscaleTarget
    if ($LASTEXITCODE -ne 0) {
        throw "Tailscale Serve did not activate. Confirm tailnet HTTPS permission in the Tailscale app."
    }
    & tailscale.exe serve status
    if ($LASTEXITCODE -ne 0) {
        throw "Tailscale Serve status could not be checked."
    }
    Write-Host "Private Serve requested. Open the shown https://*.ts.net URL on an approved tailnet device." -ForegroundColor Green
}
finally {
    Pop-Location
}
