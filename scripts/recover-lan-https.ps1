<# Build 080 — restore ONLY an already authorized private-LAN Caddy gateway.
No firewall changes, IP auto-rewrite, certificate installation, service restart, or router configuration.
Designed for an opt-in user sign-in task after the Hub backend becomes healthy.
#>
[CmdletBinding()]
param([ValidateRange(1024,65535)][int]$Port = 8443, [switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$state = Join-Path $root 'data\lan-access'
$config = Join-Path $state 'Caddyfile'
$binary = Join-Path $root 'tools\caddy\caddy.exe'
$pidFile = Join-Path $state 'caddy.pid'
$ruleName = 'Rosevear AI Hub LAN HTTPS'
if (-not (Test-Path -LiteralPath $config) -or -not (Test-Path -LiteralPath $binary)) {
    throw 'HOLD: saved owner configuration or Caddy binary missing.'
}
$raw = Get-Content -LiteralPath $config -Raw
$matchesSite = [regex]::Match($raw, '(?m)^https://(\d{1,3}(?:\.\d{1,3}){3}):'+$Port+'\s*\{')
if (-not $matchesSite.Success) { throw 'HOLD: expected private HTTPS site not found.' }
$ip = $matchesSite.Groups[1].Value
$address = [System.Net.IPAddress]::Parse($ip)
$octets = $address.GetAddressBytes()
$isPrivate = ($octets[0] -eq 10 -or ($octets[0] -eq 172 -and $octets[1] -ge 16 -and $octets[1] -le 31) -or ($octets[0] -eq 192 -and $octets[1] -eq 168))
if (-not $isPrivate -or $raw -notmatch '(?m)^\s*admin off\s*$' -or
    $raw -notmatch '(?m)^\s*@trusted remote_ip\s+(?!0\.0\.0\.0/0|any|\*)' -or
    $raw -notmatch [regex]::Escape("bind $ip") -or
    $raw -notmatch 'reverse_proxy\s+127\.0\.0\.1:8765' -or
    $raw -notmatch '(?m)^\s*tls internal\s*$') {
    throw 'HOLD: gateway configuration does not meet private LAN safety constraints.'
}
$iface = Get-NetIPAddress -AddressFamily IPv4 -IPAddress $ip -ErrorAction SilentlyContinue
if (-not $iface) { throw "HOLD: IP $ip is no longer assigned. Owner must review IP and firewall; no automatic changes." }
$profile = Get-NetConnectionProfile -InterfaceIndex $iface.InterfaceIndex -ErrorAction Stop
if ($profile.NetworkCategory -ne 'Private') { throw 'HOLD: network profile is not Private.' }
$rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $rule -or $rule.Enabled -ne 'True' -or $rule.Direction -ne 'Inbound' -or
    $rule.Action -ne 'Allow' -or $rule.Profile -ne 'Private') {
    throw 'HOLD: owner-authorized Private firewall rule missing or altered.'
}
$addr = $rule | Get-NetFirewallAddressFilter
$app = $rule | Get-NetFirewallApplicationFilter
$portFilter = $rule | Get-NetFirewallPortFilter
if ($addr.LocalAddress -notcontains $ip -or\n    @($addr.RemoteAddress).Count -eq 0 -or\n    @($addr.RemoteAddress | Where-Object { $_ -in @('Any','*','0.0.0.0/0','Internet') }).Count -gt 0 -or\n    $app.Program -ine $binary -or
    $portFilter.LocalPort -ne "$Port" -or $portFilter.Protocol -ne 'TCP') {
    throw 'HOLD: firewall scope does not match saved gateway.'
}
$api = @(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)
if (-not $api -or @($api | Where-Object { $_.LocalAddress -notin @('127.0.0.1','::1') }).Count -gt 0) {
    throw 'HOLD: API must be loopback-only.'
}
try {
    if ((Invoke-WebRequest 'http://127.0.0.1:8765/' -UseBasicParsing -TimeoutSec 5).StatusCode -ne 200 -or
        (Invoke-WebRequest 'http://127.0.0.1:8765/manifest.webmanifest' -UseBasicParsing -TimeoutSec 5).StatusCode -ne 200) {
        throw 'PWA not ready'
    }
} catch { throw 'HOLD: built PWA not available.' }
# Never accept an unrelated process merely because port 8443 is open.
$occupied = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
if ($occupied.Count -gt 0) {
    if (@($occupied | Where-Object { $_.LocalAddress -ne $ip }).Count -gt 0) {
        throw 'HOLD: listener bound to an unexpected interface.'
    }
    $owners = @($occupied | Select-Object -ExpandProperty OwningProcess -Unique)
    if ($owners.Count -ne 1) { throw 'HOLD: ambiguous gateway listener ownership.' }
    $ownerProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($owners[0])" -ErrorAction SilentlyContinue
    if (-not $ownerProcess -or $ownerProcess.ExecutablePath -ine $binary -or
        $ownerProcess.CommandLine -notlike "*$config*") {
        throw 'HOLD: HTTPS port belongs to an unrecognized process.'
    }
    Write-Host 'Verified existing private gateway Caddy listener; no changes.'
    exit 0
}
& $binary validate --config $config --adapter caddyfile
if ($LASTEXITCODE -ne 0) { throw 'HOLD: Caddy validation failed.' }
if ($CheckOnly) { Write-Host "CHECK ONLY PASSED; gateway could be launched at https://${ip}:${Port}/"; exit 0 }
$arguments = 'run --config "' + $config + '" --adapter caddyfile'
$p = Start-Process -FilePath $binary -ArgumentList $arguments -WorkingDirectory $state -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 3
if ($p.HasExited -or -not (Get-NetTCPConnection -LocalAddress $ip -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)) {
    throw 'HOLD: gateway did not start; investigate separately.'
}
Set-Content -LiteralPath $pidFile -Value $p.Id -Encoding ASCII
Write-Host "Private LAN gateway recovered at https://${ip}:${Port}/. Client acceptance remains manual."
 -or\n    $raw -notmatch '(?m)^\s*@trusted remote_ip (?!\s*(?:0\.0\.0\.0/0|any|\*))' -or\n    $raw -notmatch [regex]::Escape("bind $ip") -or
    $raw -notmatch 'reverse_proxy\s+127\.0\.0\.1:8765' -or
    $raw -notmatch '(?m)^\s*tls internal\s*$') {
    throw 'HOLD: gateway configuration does not meet private LAN safety constraints.'
}
$iface = Get-NetIPAddress -AddressFamily IPv4 -IPAddress $ip -ErrorAction SilentlyContinue
if (-not $iface) { throw "HOLD: IP $ip is no longer assigned. Owner must review IP and firewall; no automatic changes." }
$profile = Get-NetConnectionProfile -InterfaceIndex $iface.InterfaceIndex -ErrorAction Stop
if ($profile.NetworkCategory -ne 'Private') { throw 'HOLD: network profile is not Private.' }
$rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $rule -or $rule.Enabled -ne 'True' -or $rule.Direction -ne 'Inbound' -or
    $rule.Action -ne 'Allow' -or $rule.Profile -ne 'Private') {
    throw 'HOLD: owner-authorized Private firewall rule missing or altered.'
}
$addr = $rule | Get-NetFirewallAddressFilter
$app = $rule | Get-NetFirewallApplicationFilter
$portFilter = $rule | Get-NetFirewallPortFilter
if ($addr.LocalAddress -notcontains $ip -or $app.Program -ine $binary -or
    $portFilter.LocalPort -ne "$Port" -or $portFilter.Protocol -ne 'TCP') {
    throw 'HOLD: firewall scope does not match saved gateway.'
}
$api = @(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)
if (-not $api -or @($api | Where-Object { $_.LocalAddress -notin @('127.0.0.1','::1') }).Count -gt 0) {
    throw 'HOLD: API must be loopback-only.'
}
try {
    if ((Invoke-WebRequest 'http://127.0.0.1:8765/' -UseBasicParsing -TimeoutSec 5).StatusCode -ne 200 -or
        (Invoke-WebRequest 'http://127.0.0.1:8765/manifest.webmanifest' -UseBasicParsing -TimeoutSec 5).StatusCode -ne 200) {
        throw 'PWA not ready'
    }
} catch { throw 'HOLD: built PWA not available.' }
$occupied = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
if ($occupied.Count -gt 0) {
    if (@($occupied | Where-Object { $_.LocalAddress -eq $ip }).Count -gt 0) {
        Write-Host 'Gateway listener present. No change; check client trust separately.'
        exit 0
    }
    throw 'HOLD: HTTPS port occupied by another address/process.'
}
& $binary validate --config $config --adapter caddyfile
if ($LASTEXITCODE -ne 0) { throw 'HOLD: Caddy validation failed.' }
if ($CheckOnly) { Write-Host "CHECK ONLY PASSED; gateway could be launched at https://${ip}:${Port}/"; exit 0 }
$arguments = 'run --config "' + $config + '" --adapter caddyfile'
$p = Start-Process -FilePath $binary -ArgumentList $arguments -WorkingDirectory $state -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 3
if ($p.HasExited -or -not (Get-NetTCPConnection -LocalAddress $ip -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)) {
    throw 'HOLD: gateway did not start; investigate separately.'
}
Set-Content -LiteralPath $pidFile -Value $p.Id -Encoding ASCII
Write-Host "Private LAN gateway recovered at https://${ip}:${Port}/. Client acceptance remains manual."
