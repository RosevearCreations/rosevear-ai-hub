<# Build 081: Windows fake-evidence test, script parsing and no-mutation checks. #>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$module = Join-Path $PSScriptRoot 'HubGatewayEvidence.psm1'
$inspector = Join-Path $PSScriptRoot 'inspect-hub-reboot-readiness.ps1'
foreach ($path in @($module,$inspector)) {
    $tokens = $null
    $issues = $null
    [System.Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$issues) | Out-Null
    if (@($issues).Count -gt 0) { throw "PowerShell parse error: $($issues -join '; ')" }
}
$source = Get-Content -LiteralPath $inspector -Raw
foreach ($forbidden in @(
    'Start-Process','Stop-Process','Restart-Service','Start-Service','Stop-Service',
    'Register-ScheduledTask','Unregister-ScheduledTask','Start-ScheduledTask',
    'Set-NetFirewallRule','New-NetFirewallRule','Remove-NetFirewallRule',
    'Set-Content','Add-Content','Import-Certificate','Set-NetIPAddress'
)) {
    if ($source -match ('(?i)\b' + [regex]::Escape($forbidden) + '\b')) {
        throw "Read-only inspector must not mutate the host: $forbidden"
    }
}
if ($source -match '(?im)^\s*\$HOME\s*=') { throw 'Cannot assign reserved HOME variable.' }
Import-Module $module -Force
$good = @{
    TaskPresent = $true; TaskOwned = $true; TaskLogonTrigger = $true
    TaskRunSucceeded = $true; BackendLoopback = $true; BuiltPwaReady = $true
    CaddyOwnedListener = $true; FirewallScoped = $true
}
$healthy = Get-HubGatewayEvidenceVerdict -Evidence $good
if ($healthy.runtime_posture -ne 'READY_FOR_SUPERVISED_REBOOT_TEST' -or
    $healthy.passed_checks -ne 8 -or $healthy.reboot_persistence -ne 'PENDING_SUPERVISED_SERVER_REBOOT' -or
    $healthy.task_automatic_launch -ne 'NOT_PROVEN_BY_LAST_RUN' -or $healthy.changed_anything) {
    throw 'Healthy runtime was incorrectly certified as an actual reboot.'
}
foreach ($key in @($good.Keys)) {
    $bad = $good.Clone()
    $bad[$key] = $false
    $outcome = Get-HubGatewayEvidenceVerdict -Evidence $bad
    if ($outcome.runtime_posture -ne 'HOLD' -or $outcome.passed_checks -ne 7 -or
        $outcome.reboot_persistence -ne 'PENDING_SUPERVISED_SERVER_REBOOT') {
        throw "Fail-closed case did not HOLD: $key"
    }
}
$partial = $good.Clone()
$partial.Remove('FirewallScoped')
$threw = $false
try { $null = Get-HubGatewayEvidenceVerdict -Evidence $partial } catch { $threw = $true }
if (-not $threw) { throw 'Missing evidence must be rejected.' }
$wrongType = $good.Clone()
$wrongType['TaskOwned'] = 'True'
$threw = $false
try { $null = Get-HubGatewayEvidenceVerdict -Evidence $wrongType } catch { $threw = $true }
if (-not $threw) { throw 'String truthy evidence must be rejected.' }
Write-Host 'Build 081: syntax, non-mutating inspector and 10 evidence cases PASS.'
