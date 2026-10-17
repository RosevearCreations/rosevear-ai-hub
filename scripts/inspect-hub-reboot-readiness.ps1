<# Build 081: read-only server gateway snapshot. No restarts or task edits.
   This can be run any time without rebooting the Windows server.
   It does NOT certify reboot persistence, remote TLS trust, cameras or backups.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$LanIPv4,
    [ValidateRange(1024,65535)][int]$Port = 8443
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Import-Module (Join-Path $PSScriptRoot 'HubGatewayEvidence.psm1') -Force
. (Join-Path $PSScriptRoot 'HubTaskIdentityEvidence.ps1')
$root = Split-Path -Parent $PSScriptRoot
$gatewayExecutable = Join-Path $root 'tools\caddy\caddy.exe'
$caddyConfiguration = Join-Path $root 'data\lan-access\Caddyfile'
$gatewayWorker = Join-Path $PSScriptRoot 'start-hub-lan-gateway.ps1'
$ruleName = 'Rosevear AI Hub LAN HTTPS'
$taskName = 'Rosevear AI Hub LAN Gateway'
$taskArgs = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f $gatewayWorker
$ip = $null
if (-not [System.Net.IPAddress]::TryParse($LanIPv4,[ref]$ip) -or
    $ip.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
    throw 'Specify the current private household IPv4 address.'
}
$bytes = $ip.GetAddressBytes()
$private = ($bytes[0] -eq 10 -or
    ($bytes[0] -eq 172 -and $bytes[1] -ge 16 -and $bytes[1] -le 31) -or
    ($bytes[0] -eq 192 -and $bytes[1] -eq 168))
if (-not $private) { throw 'Refusing a public address.' }
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
$taskExists = [bool]$task
$taskOwned = $false
$taskIdentityReason = 'TASK_ABSENT'
$taskLogon = $false
$taskRunSucceeded = $false
if ($task) {
    $actions = @($task.Actions)
    $operatorSid = [string][Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $principalSid = ''
    try {
        $principalName = [string]$task.Principal.UserId
        if ($principalName -match '^S-\d+-\d+(-\d+)+$') {
            $principalSid = ([Security.Principal.SecurityIdentifier]::new($principalName)).Value
        } elseif (-not [string]::IsNullOrWhiteSpace($principalName)) {
            $principalSid = ([Security.Principal.NTAccount]::new($principalName)).Translate(
                [Security.Principal.SecurityIdentifier]).Value
        }
    } catch {
        # Fail closed if Windows cannot resolve the task principal.
    }
    $actionExecutable = if ($actions.Count -eq 1) { [string]$actions[0].Execute } else { '' }
    $actionArguments = if ($actions.Count -eq 1) { [string]$actions[0].Arguments } else { '' }
    $identityVerdict = Get-HubTaskIdentityVerdict -TaskExists $true -ActionCount $actions.Count -Executable $actionExecutable -Arguments $actionArguments -ExpectedArguments $taskArgs -CurrentSid $operatorSid -PrincipalSid $principalSid
    $taskOwned = $identityVerdict.task_owned
    $taskIdentityReason = $identityVerdict.identity_reason
    $taskLogon = @($task.Triggers | Where-Object {
        $_.CimClass.CimClassName -eq 'MSFT_TaskLogonTrigger' -and $_.Enabled -eq $true
    }).Count -gt 0
    $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName -ErrorAction SilentlyContinue
    if ($taskInfo) {
        $taskRunSucceeded = ($taskInfo.LastTaskResult -eq 0 -and
            $taskInfo.LastRunTime -gt [datetime]'2000-01-01')
    }
}
$apiListeners = @(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)
$loopbackOnly = ($apiListeners.Count -gt 0 -and
    @($apiListeners | Where-Object { $_.LocalAddress -notin @('127.0.0.1','::1') }).Count -eq 0)
$pwaHealthy = $false
if ($loopbackOnly) {
    try {
        $healthStatus = Invoke-RestMethod 'http://127.0.0.1:8765/health' -TimeoutSec 4 -ErrorAction Stop
        $indexResponse = Invoke-WebRequest 'http://127.0.0.1:8765/' -TimeoutSec 4 -UseBasicParsing -ErrorAction Stop
        $manifestResponse = Invoke-WebRequest 'http://127.0.0.1:8765/manifest.webmanifest' -TimeoutSec 4 -UseBasicParsing -ErrorAction Stop
        $pwaHealthy = ($healthStatus.status -eq 'ok' -and
            $indexResponse.StatusCode -eq 200 -and $manifestResponse.StatusCode -eq 200)
    } catch {
        # Readiness is false; do not disclose HTTP bodies or credentials.
    }
}
$caddyOwned = $false
$listeners = @(Get-NetTCPConnection -LocalAddress $LanIPv4 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
$otherListeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalAddress -ne $LanIPv4 })
if ($listeners.Count -eq 1 -and $otherListeners.Count -eq 0) {
    $ownerProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($listeners[0].OwningProcess)" -ErrorAction SilentlyContinue
    $caddyOwned = [bool]($ownerProcess -and $ownerProcess.ExecutablePath -ieq $gatewayExecutable -and
        $ownerProcess.CommandLine -like "*$caddyConfiguration*")
}
$firewallScoped = $false
$rules = @(Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)
$hostAddress = Get-NetIPAddress -IPAddress $LanIPv4 -AddressFamily IPv4 -ErrorAction SilentlyContinue
if ($rules.Count -eq 1 -and $hostAddress) {
    $rule = $rules[0]
    $addresses = $rule | Get-NetFirewallAddressFilter
    $application = $rule | Get-NetFirewallApplicationFilter
    $ports = $rule | Get-NetFirewallPortFilter
    $remote = @($addresses.RemoteAddress)
    $firewallScoped = ($rule.Enabled -eq 'True' -and $rule.Action -eq 'Allow' -and
        $rule.Direction -eq 'Inbound' -and $rule.Profile -eq 'Private' -and
        $addresses.LocalAddress -contains $LanIPv4 -and
        $remote.Count -gt 0 -and
        @($remote | Where-Object { $_ -in @('Any','*','Internet','0.0.0.0/0') }).Count -eq 0 -and
        $application.Program -ieq $gatewayExecutable -and
        $ports.LocalPort -eq "$Port" -and $ports.Protocol -eq 'TCP')
}
$evidence = @{
    TaskPresent = [bool]$taskExists
    TaskOwned = [bool]$taskOwned
    TaskLogonTrigger = [bool]$taskLogon
    TaskRunSucceeded = [bool]$taskRunSucceeded
    BackendLoopback = [bool]$loopbackOnly
    BuiltPwaReady = [bool]$pwaHealthy
    CaddyOwnedListener = [bool]$caddyOwned
    FirewallScoped = [bool]$firewallScoped
}
$verdict = Get-HubGatewayEvidenceVerdict -Evidence $evidence
Write-Host 'Read-only gateway checks (separate manual reboot gate):'
Write-Host ('Task identity status: ' + $taskIdentityReason)
[pscustomobject]$evidence | Format-List
$verdict | Format-List
if ($verdict.runtime_posture -eq 'HOLD') { exit 2 }
