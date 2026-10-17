<# Build 078: read-only checks for the supported private-LAN HTTPS gateway.
   Does NOT expose Vite, bind the Hub API to the LAN, or change firewall settings.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$LanIPv4,
    [int]$Port = 8443
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$address = $null
if ($LanIPv4 -notmatch '^\d{1,3}(\.\d{1,3}){3}$' -or
    -not [System.Net.IPAddress]::TryParse($LanIPv4, [ref]$address)) {
    throw 'Specify the current private LAN IPv4 address.'
}
$octets = $address.GetAddressBytes()
$private = ($octets[0] -eq 10 -or
    ($octets[0] -eq 172 -and $octets[1] -ge 16 -and $octets[1] -le 31) -or
    ($octets[0] -eq 192 -and $octets[1] -eq 168))
if (-not $private) { throw 'Refusing a public IPv4 address.' }

$listen = @(Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)
$viteLoopbackOnly = ($listen.Count -gt 0 -and @($listen | Where-Object {
    $_.LocalAddress -notin @('127.0.0.1', '::1')
}).Count -eq 0)
$caddy = Join-Path $root 'tools\caddy\caddy.exe'
$gateway = @(Get-NetTCPConnection -LocalAddress $LanIPv4 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
$apiHealthy = $false
$pwaReady = $false
try {
    $apiHealthy = ((Invoke-RestMethod -Uri 'http://127.0.0.1:8765/health' -TimeoutSec 4).status -eq 'ok')
} catch {}
if ($apiHealthy) {
    try {
        $indexResponse = Invoke-WebRequest -Uri 'http://127.0.0.1:8765/' -UseBasicParsing -TimeoutSec 4
        $manifest = Invoke-WebRequest -Uri 'http://127.0.0.1:8765/manifest.webmanifest' -UseBasicParsing -TimeoutSec 4
        $pwaReady = ($indexResponse.StatusCode -eq 200 -and $manifest.StatusCode -eq 200)
    } catch {}
}
$rule = Get-NetFirewallRule -DisplayName 'Rosevear AI Hub LAN HTTPS' -ErrorAction SilentlyContinue
$onHost = [bool](Get-NetIPAddress -IPAddress $LanIPv4 -AddressFamily IPv4 -ErrorAction SilentlyContinue)
$result = [ordered]@{
    requested_lan_address = "https://${LanIPv4}:${Port}/"
    address_on_host = $onHost
    hub_api_loopback_healthy = $apiHealthy
    built_pwa_on_api = $pwaReady
    vite_loopback_only = $viteLoopbackOnly
    caddy_binary_present = (Test-Path -LiteralPath $caddy)
    lan_https_listener_present = ($gateway.Count -gt 0)
    private_firewall_rule_present = [bool]$rule
    remote_client_certificate_trust_verified = $false
    changed_anything = $false
}
[pscustomobject]$result | Format-List
if (-not $onHost -or -not $apiHealthy) { exit 2 }
