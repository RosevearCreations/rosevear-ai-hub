<# Build 081: read-only private gateway acceptance report. No reboot or mutations.
   A successful local report does NOT certify TLS trust on another computer.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$LanIPv4,
    [ValidateRange(1024,65535)][int]$Port = 8443
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'hub-gateway-acceptance-policy.ps1')
$root = Split-Path -Parent $PSScriptRoot

$parsedAddress = $null
if (-not [System.Net.IPAddress]::TryParse($LanIPv4,[ref]$parsedAddress) -or
    $parsedAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
    throw 'Only an explicit private LAN IPv4 is supported.'
}
$bytes = $parsedAddress.GetAddressBytes()
$private = ($bytes[0] -eq 10 -or
    ($bytes[0] -eq 172 -and $bytes[1] -ge 16 -and $bytes[1] -le 31) -or
    ($bytes[0] -eq 192 -and $bytes[1] -eq 168))
if (-not $private) { throw 'Refusing a non-private IPv4.' }

$addressOnHost = [bool](Get-NetIPAddress -IPAddress $LanIPv4 -AddressFamily IPv4 -ErrorAction SilentlyContinue)
$apiListeners = @(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)
$apiLoopbackOnly = ($apiListeners.Count -gt 0 -and
    @($apiListeners | Where-Object { $_.LocalAddress -notin @('127.0.0.1','::1') }).Count -eq 0)
$apiHealthy = $false
$pwaReady = $false
if ($apiLoopbackOnly) {
    try {
        $healthResult = Invoke-RestMethod 'http://127.0.0.1:8765/health' -TimeoutSec 4
        $apiHealthy = ($healthResult.status -eq 'ok')
        if ($apiHealthy) {
            $indexResponse = Invoke-WebRequest 'http://127.0.0.1:8765/' -UseBasicParsing -TimeoutSec 4
            $manifestResponse = Invoke-WebRequest 'http://127.0.0.1:8765/manifest.webmanifest' -UseBasicParsing -TimeoutSec 4
            $pwaReady = ($indexResponse.StatusCode -eq 200 -and $manifestResponse.StatusCode -eq 200)
        }
    } catch {
        # No exception text, response body, camera URL or credential is emitted.
    }
}

$caddyExe = Join-Path $root 'tools\caddy\caddy.exe'
$caddyConfig = Join-Path $root 'data\lan-access\Caddyfile'
$gatewayListeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
$gatewayProcessVerified = $false
if ($gatewayListeners.Count -gt 0 -and (Test-Path -LiteralPath $caddyExe) -and
    @($gatewayListeners | Where-Object { $_.LocalAddress -ne $LanIPv4 }).Count -eq 0) {
    $owners = @($gatewayListeners | Select-Object -ExpandProperty OwningProcess -Unique)
    if ($owners.Count -eq 1) {
        $gatewayOwner = Get-CimInstance Win32_Process -Filter "ProcessId = $($owners[0])" -ErrorAction SilentlyContinue
        $gatewayProcessVerified = [bool]($gatewayOwner -and
            $gatewayOwner.ExecutablePath -ieq $caddyExe -and
            $gatewayOwner.CommandLine -like "*$caddyConfig*")
    }
}

$rules = @(Get-NetFirewallRule -DisplayName 'Rosevear AI Hub LAN HTTPS' -ErrorAction SilentlyContinue)
$firewallScopeVerified = $false
if ($rules.Count -eq 1) {
    $rule = $rules[0]
    $ruleAddresses = $rule | Get-NetFirewallAddressFilter
    $ruleProgram = $rule | Get-NetFirewallApplicationFilter
    $rulePorts = $rule | Get-NetFirewallPortFilter
    $remote = @($ruleAddresses.RemoteAddress)
    $firewallScopeVerified = [bool]($rule.Enabled -eq 'True' -and
        $rule.Direction -eq 'Inbound' -and $rule.Action -eq 'Allow' -and
        $rule.Profile -eq 'Private' -and
        $ruleAddresses.LocalAddress -contains $LanIPv4 -and
        $remote.Count -gt 0 -and
        @($remote | Where-Object { $_ -in @('Any','*','0.0.0.0/0','Internet') }).Count -eq 0 -and
        $ruleProgram.Program -ieq $caddyExe -and
        @($rulePorts.LocalPort) -contains [string]$Port -and
        $rulePorts.Protocol -eq 'TCP')
}
$taskName = 'Rosevear AI Hub LAN Gateway'
$tasks = @(Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue)
$startupTaskIdentityVerified = $false
$lastTaskResult = $null
if ($tasks.Count -eq 1) {
    $task = $tasks[0]
    $actions = @($task.Actions)
    $worker = Join-Path $PSScriptRoot 'start-hub-lan-gateway.ps1'
    $expectedArguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f $worker
    $startupTaskIdentityVerified = ($task.State -ne 'Disabled' -and
        $actions.Count -eq 1 -and
        [IO.Path]::GetFileName([string]$actions[0].Execute) -ieq 'powershell.exe' -and
        [string]$actions[0].Arguments -ceq $expectedArguments)
    if ($startupTaskIdentityVerified) {
        $info = Get-ScheduledTaskInfo -TaskName $taskName -ErrorAction SilentlyContinue
        if ($info -and $info.LastRunTime -gt [datetime]'2001-01-01') {
            $lastTaskResult = $info.LastTaskResult
        }
    }
}
$decision = Get-HubGatewayAcceptanceDecision -AddressOnHost $addressOnHost -ApiLoopbackHealthy ($apiLoopbackOnly -and $apiHealthy) -PwaReady $pwaReady -GatewayProcessVerified $gatewayProcessVerified -FirewallScopeVerified $firewallScopeVerified -StartupTaskIdentityVerified $startupTaskIdentityVerified -LastTaskResult $lastTaskResult
[pscustomobject][ordered]@{
    requested_endpoint = ('https://' + $LanIPv4 + ':' + $Port + '/')
    address_on_host = $addressOnHost
    api_loopback_healthy = ($apiLoopbackOnly -and $apiHealthy)
    built_pwa_ready = $pwaReady
    gateway_caddy_owner_verified = $gatewayProcessVerified
    private_firewall_scope_verified = $firewallScopeVerified
    scheduled_task_identity_verified = $startupTaskIdentityVerified
    last_task_result_zero = ($null -ne $lastTaskResult -and [string]$lastTaskResult -eq '0')
    local_gateway = $decision.local_gateway
    remote_client_tls = $decision.remote_client_tls
    authenticated_client_access = $decision.authenticated_client_access
    reboot_persistence = $decision.reboot_persistence
    camera_reconciliation = $decision.camera_reconciliation
    backup_provenance = $decision.backup_provenance
    changed_anything = $decision.changed_anything
} | Format-List
if ($decision.local_gateway -eq 'HOLD') { exit 2 }
