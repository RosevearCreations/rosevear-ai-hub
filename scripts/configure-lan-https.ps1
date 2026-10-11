[CmdletBinding()]
param(
    [string]$LanIPv4,
    [string[]]$TrustedLanCIDRs,
    [ValidateRange(1024, 65535)][int]$Port = 8443,
    [switch]$Enable,
    [switch]$Disable
)

# Safe by default: no Caddy process or firewall rule is created without -Enable.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$StateDir = Join-Path $Root "data\lan-access"
$ConfigPath = Join-Path $StateDir "Caddyfile"
$PidPath = Join-Path $StateDir "caddy.pid"
$RuleName = "Rosevear AI Hub LAN HTTPS"
$ApiUrl = "http://127.0.0.1:8765"
$CaddyExe = Join-Path $Root "tools\caddy\caddy.exe"

function Test-PrivateIPv4([string]$Text) {
    $address = $null
    if ($Text -notmatch '^\d{1,3}(\.\d{1,3}){3}$' -or
        -not [System.Net.IPAddress]::TryParse($Text, [ref]$address) -or
        $address.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
        return $false
    }
    $bytes = $address.GetAddressBytes()
    return ($bytes[0] -eq 10 -or
        ($bytes[0] -eq 172 -and $bytes[1] -ge 16 -and $bytes[1] -le 31) -or
        ($bytes[0] -eq 192 -and $bytes[1] -eq 168))
}

function Test-TrustedCIDR([string]$CIDR) {
    if ($CIDR -notmatch '^(\d{1,3}(?:\.\d{1,3}){3})/(\d{1,2})$') {
        return $false
    }
    $addressText = $Matches[1]
    $prefix = [int]$Matches[2]
    if ($prefix -lt 24 -or $prefix -gt 32 -or -not (Test-PrivateIPv4 $addressText)) {
        return $false
    }
    $bytes = ([System.Net.IPAddress]::Parse($addressText)).GetAddressBytes()
    $lastOctetMask = 256 - [int][math]::Pow(2, (32 - $prefix))
    return (($bytes[3] -band $lastOctetMask) -eq $bytes[3])
}

function Test-OwnedCaddyProcess([int]$ProcessId) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
    if (-not $process) { return $false }
    return ($process.ExecutablePath -ieq $CaddyExe -and
        $process.CommandLine -like "*$ConfigPath*")
}

if ($Enable -and $Disable) { throw "Specify -Enable OR -Disable, not both." }
if ($Disable) {
    $principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "Run elevated PowerShell to remove the LAN firewall rule."
    }
    if (Test-Path -LiteralPath $PidPath) {
        $savedPid = [int](Get-Content -LiteralPath $PidPath -Raw).Trim()
        if (Test-OwnedCaddyProcess $savedPid) {
            Stop-Process -Id $savedPid -ErrorAction Stop
            Write-Host "Stopped Hub LAN Caddy process." -ForegroundColor Green
        } elseif (Get-Process -Id $savedPid -ErrorAction SilentlyContinue) {
            throw "Saved PID belongs to another process. Nothing was stopped."
        }
        Remove-Item -LiteralPath $PidPath -Force
    }
    $rule = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
    if ($rule) { $rule | Remove-NetFirewallRule }
    Write-Host "Hub LAN access disabled. Hub API, Tailscale, cameras and data unchanged."
    exit 0
}

if (-not (Test-PrivateIPv4 $LanIPv4)) {
    throw "Specify the server's private IPv4 address using -LanIPv4."
}
if (-not $TrustedLanCIDRs -or $TrustedLanCIDRs.Count -gt 8) {
    throw "Specify 1 to 8 trusted /24 through /32 ranges with -TrustedLanCIDRs."
}
foreach ($cidr in $TrustedLanCIDRs) {
    if (-not (Test-TrustedCIDR $cidr)) {
        throw "Invalid trusted range '$cidr'. Use an aligned private IPv4 /24 through /32."
    }
}
if (-not (Test-Path -LiteralPath $CaddyExe)) {
    throw "Caddy missing. Install the official Windows executable at tools\caddy\caddy.exe."
}
$ipAddress = Get-NetIPAddress -IPAddress $LanIPv4 -AddressFamily IPv4 -ErrorAction Stop |
    Select-Object -First 1
$adapter = Get-NetAdapter -InterfaceIndex $ipAddress.InterfaceIndex -ErrorAction Stop
$networkProfile = Get-NetConnectionProfile -InterfaceIndex $ipAddress.InterfaceIndex -ErrorAction Stop
if ($adapter.Status -ne "Up" -or $adapter.Name -match 'Tailscale|VPN|vEthernet' -or
    $adapter.InterfaceDescription -match 'Tailscale|VPN|Virtual|WireGuard') {
    throw "Chosen IP is not on an active household LAN interface."
}
if ($networkProfile.NetworkCategory -ne "Private") {
    throw "The selected Windows network must be Private; refusing a Public interface."
}
$firewall = Get-NetFirewallProfile -Name Private -ErrorAction Stop
if (-not $firewall.Enabled -or $firewall.DefaultInboundAction -eq "Allow") {
    throw "Windows Private firewall must be enabled with inbound blocking."
}
if (@(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue).Count -gt 0) {
    throw "Port $Port is occupied. No existing listener will be changed."
}
$hub = @(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)
if (-not $hub -or @($hub | Where-Object { $_.LocalAddress -notin @("127.0.0.1", "::1") }).Count) {
    throw "Hub API must be listening ONLY on loopback."
}
if ((Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 5).status -ne "ok") {
    throw "Local Hub API is unhealthy."
}
if ((Invoke-WebRequest -Uri "$ApiUrl/" -UseBasicParsing -TimeoutSec 5).StatusCode -ne 200 -or
    (Invoke-WebRequest -Uri "$ApiUrl/manifest.webmanifest" -UseBasicParsing -TimeoutSec 5).StatusCode -ne 200) {
    throw "Built PWA not served on API port. Restart the updated API first."
}
if (Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue) {
    throw "Existing Hub LAN firewall rule must be reviewed before retrying."
}
$siteAddress = "https://" + $LanIPv4 + ":" + $Port
$trusted = $TrustedLanCIDRs -join " "
$caddyfile = @"
{
    admin off
    auto_https disable_redirects
}
$siteAddress {
    bind $LanIPv4
    tls internal
    @trusted remote_ip $trusted
    handle @trusted {
        reverse_proxy 127.0.0.1:8765
    }
    handle {
        respond "Forbidden" 403
    }
}
"@
Write-Host "LAN HTTPS endpoint: $siteAddress" -ForegroundColor Cyan
Write-Host "Allowed client ranges: $trusted"
Write-Host "The API stays bound to localhost; browser certificates require one-time trust."
if (-not $Enable) {
    Write-Host "CHECK ONLY PASSED. No listener, firewall rule or config was changed." -ForegroundColor Green
    Write-Host "Review client ranges, then use -Enable in elevated PowerShell to opt in."
    exit 0
}
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run elevated PowerShell for -Enable."
}
New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
if (Test-Path -LiteralPath $ConfigPath) {
    if ((Get-Content -LiteralPath $ConfigPath -Raw).Trim() -ne $caddyfile.Trim()) {
        throw "Existing Caddyfile differs; refusing overwrite until reviewed."
    }
} else {
    Set-Content -LiteralPath $ConfigPath -Value $caddyfile -Encoding UTF8
}
& $CaddyExe validate --config $ConfigPath --adapter caddyfile
if ($LASTEXITCODE -ne 0) { throw "Caddyfile validation failed. Nothing exposed." }
$ruleCreated = $false
$started = $null
try {
    $ruleArgs = @{
        DisplayName = $RuleName
        Direction = "Inbound"
        Action = "Allow"
        Profile = "Private"
        Protocol = "TCP"
        LocalAddress = $LanIPv4
        LocalPort = $Port
        RemoteAddress = $TrustedLanCIDRs
        Program = $CaddyExe
        ErrorAction = "Stop"
    }
    New-NetFirewallRule @ruleArgs | Out-Null
    $ruleCreated = $true
    $arguments = 'run --config "' + $ConfigPath + '" --adapter caddyfile'
    $started = Start-Process -FilePath $CaddyExe -ArgumentList $arguments -WorkingDirectory $StateDir -PassThru -WindowStyle Hidden -ErrorAction Stop
    Start-Sleep -Seconds 4
    if ($started.HasExited -or -not (Get-NetTCPConnection -LocalAddress $LanIPv4 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)) {
        throw "Caddy LAN listener did not start. Inspect Caddy logs."
    }
    Set-Content -LiteralPath $PidPath -Value $started.Id -Encoding ASCII
    Write-Host "Private LAN HTTPS started at $siteAddress." -ForegroundColor Green
    Write-Host "No router forwarding, API LAN bind, or Tailscale Funnel created."
} catch {
    if ($started -and -not $started.HasExited -and (Test-OwnedCaddyProcess $started.Id)) {
        Stop-Process -Id $started.Id -Force -ErrorAction SilentlyContinue
    }
    if ($ruleCreated) {
        Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    }
    throw
}
