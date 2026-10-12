# Build 051 — local-only, read-only release-readiness preflight for Windows.
# Runs no repair actions; stops if Hub API is exposed outside loopback.
param(
    [switch]$SaveEvidence
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $Root ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $Python -PathType Leaf)) {
    throw "Hub Python environment is missing. No services changed."
}

$Listeners = @(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)
if ($Listeners.Count -lt 1) {
    throw "Hub API listener is unavailable. No services changed."
}
if (@($Listeners | Where-Object { $_.LocalAddress -notin @("127.0.0.1", "::1") }).Count -gt 0) {
    throw "Hub API is not bound exclusively to loopback. Review listener immediately."
}
if (-not @($Listeners | Where-Object { $_.LocalAddress -eq "127.0.0.1" }).Count) {
    throw "Expected 127.0.0.1 Hub API listener is missing."
}
$Args = @("-m", "rosevear_ai_hub.production_readiness")
if ($SaveEvidence) {
    $ReportName = "hub51-readiness-{0}-{1}.json" -f (Get-Date -Format "yyyyMMdd-HHmmss"), [guid]::NewGuid().ToString("N").Substring(0, 8)
    $Args += @("--evidence", (Join-Path $env:TEMP $ReportName))
}
& $Python @Args
if ($LASTEXITCODE -ne 0) {
    throw "Read-only API readiness checks did not pass. No services changed."
}
Write-Host "Build 051 local API readiness and loopback listener PASS." -ForegroundColor Green
Write-Host "Firewall, Caddy certificate, Tailscale ACLs and real restore remain manual."
