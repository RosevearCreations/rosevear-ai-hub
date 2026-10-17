<# Build 081 Windows regression tests: real PowerShell parsing, static side-effect checks,
and deterministic pure policy scenarios. No Caddy, network, firewall or task state needed. #>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$paths = @(
    'scripts/inspect-hub-lan.ps1',
    'scripts/inspect-hub-gateway-081.ps1',
    'scripts/hub-gateway-acceptance-policy.ps1',
    'scripts/start-hub-lan-gateway.ps1',
    'scripts/recover-lan-https.ps1'
)
foreach ($relative in $paths) {
    $path = Join-Path $root $relative
    $tokens = $null
    $parseErrors = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$parseErrors)
    if (@($parseErrors).Count -gt 0) { throw "PowerShell parser failed: $relative" }
    $assignments = $ast.FindAll({
        param($node)
        $node -is [System.Management.Automation.Language.AssignmentStatementAst]
    },$true)
    foreach ($assign in $assignments) {
        if ($assign.Left -is [System.Management.Automation.Language.VariableExpressionAst] -and
            $assign.Left.VariablePath.UserPath -ieq 'HOME') {
            throw "Reserved automatic variable HOME assignment in $relative"
        }
    }
}
foreach ($relative in @('scripts/inspect-hub-gateway-081.ps1','scripts/hub-gateway-acceptance-policy.ps1')) {
    $tokens = $null
    $parseErrors = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $root $relative),[ref]$tokens,[ref]$parseErrors)
    $commands = $ast.FindAll({
        param($node)
        $node -is [System.Management.Automation.Language.CommandAst]
    },$true)
    foreach ($command in $commands) {
        if ($command.GetCommandName() -in @(
            'New-NetFirewallRule','Set-NetFirewallRule','Remove-NetFirewallRule',
            'Set-NetFirewallAddressFilter','Start-Process','Stop-Process',
            'Register-ScheduledTask','Unregister-ScheduledTask','Start-ScheduledTask',
            'Stop-ScheduledTask','Restart-Computer','Stop-Computer','Set-Content',
            'Add-Content','Invoke-Expression'
        )) { throw "Mutating command forbidden in read-only reporter: $relative" }
    }
}
. (Join-Path $root 'scripts/hub-gateway-acceptance-policy.ps1')
function Assert-Equal([object]$actual,[object]$expected,[string]$case) {
    if ($actual -cne $expected) { throw "Build 081 $case expected $expected, received $actual" }
}
$all = @{
    AddressOnHost = $true
    ApiLoopbackHealthy = $true
    PwaReady = $true
    GatewayProcessVerified = $true
    FirewallScopeVerified = $true
    StartupTaskIdentityVerified = $true
    LastTaskResult = 0
}
$ready = Get-HubGatewayAcceptanceDecision @all
Assert-Equal $ready.local_gateway 'READY_FOR_REMOTE_RECHECK' 'healthy'
Assert-Equal $ready.reboot_persistence 'DEFERRED_BY_OPERATOR' 'never assume reboot'
Assert-Equal $ready.remote_client_tls 'MANUAL_RECHECK_REQUIRED' 'never certify remote TLS'
Assert-Equal $ready.changed_anything $false 'no mutation'

foreach ($field in @('AddressOnHost','ApiLoopbackHealthy','PwaReady',
                     'GatewayProcessVerified','FirewallScopeVerified',
                     'StartupTaskIdentityVerified')) {
    $bad = $all.Clone()
    $bad[$field] = $false
    $decision = Get-HubGatewayAcceptanceDecision @bad
    Assert-Equal $decision.local_gateway 'HOLD' $field
}
foreach ($badResult in @(2,1,$null)) {
    $bad = $all.Clone()
    $bad.LastTaskResult = $badResult
    $decision = Get-HubGatewayAcceptanceDecision @bad
    Assert-Equal $decision.local_gateway 'HOLD' 'task failure or unknown'
    Assert-Equal $decision.reboot_persistence 'DEFERRED_BY_OPERATOR' 'reboot remains deferred'
}
Write-Host 'Build 081 parser, no HOME assignment, no mutation and deferred-reboot policy tests PASS.'
