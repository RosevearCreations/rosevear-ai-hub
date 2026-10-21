<# Build 104: pure evidence regression, script parse and no-host-mutation test. #>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$module = Join-Path $PSScriptRoot 'HubStartupEvidence.psm1'
$inspector = Join-Path $PSScriptRoot 'inspect-hub-startup-readiness.ps1'
foreach ($path in @($module,$inspector)) {
    $tokens = $null
    $issues = $null
    [System.Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$issues) | Out-Null
    if (@($issues).Count -gt 0) { throw "PowerShell parse error: $($issues -join '; ')" }
}
$source = Get-Content -LiteralPath $inspector -Raw
foreach ($forbidden in @(
    'Start-Process','Stop-Process','Restart-Computer','Restart-Service',
    'Start-Service','Stop-Service','Start-ScheduledTask','Register-ScheduledTask',
    'Unregister-ScheduledTask','Set-ScheduledTask','Disable-ScheduledTask',
    'Enable-ScheduledTask','New-NetFirewallRule','Set-NetFirewallRule',
    'Remove-NetFirewallRule','Set-Content','Add-Content','Set-NetIPAddress'
)) {
    if ($source -match ('(?im)^\s*' + [regex]::Escape($forbidden) + '\b')) {
        throw "Read-only inspector may not mutate the host: $forbidden"
    }
}
if ($source -match '(?im)^\s*\$HOME\s*=') { throw 'Reserved HOME assignment is forbidden.' }
Import-Module $module -Force
$good = @{
    StartupTaskPresent = $true; StartupTaskOwned = $true
    StartupTaskEnabled = $true; StartupTaskLogonTrigger = $true
    RecoveryTaskPresent = $true; RecoveryTaskOwned = $true
    RecoveryTaskEnabled = $true; RecoveryTaskFiveMinute = $true
}
$healthy = Get-HubStartupEvidenceVerdict -Evidence $good
if ($healthy.runtime_posture -ne 'READY_FOR_SUPERVISED_REBOOT_TEST' -or
    $healthy.passed_checks -ne 8 -or $healthy.total_checks -ne 8 -or
    $healthy.reboot_persistence -ne 'PENDING_SUPERVISED_SERVER_REBOOT' -or
    $healthy.before_windows_sign_in -ne 'NOT_PROVIDED_BY_USER_LOGON_TASKS' -or
    $healthy.changed_anything) {
    throw 'All-pass evidence must not certify reboot persistence or mutate host.'
}
foreach ($key in @($good.Keys)) {
    $bad = $good.Clone()
    $bad[$key] = $false
    $result = Get-HubStartupEvidenceVerdict -Evidence $bad
    if ($result.runtime_posture -ne 'HOLD' -or $result.passed_checks -ne 7) {
        throw "Missing prerequisite failed to HOLD: $key"
    }
}
$partial = $good.Clone()
$partial.Remove('RecoveryTaskFiveMinute')
$rejected = $false
try { $null = Get-HubStartupEvidenceVerdict -Evidence $partial } catch { $rejected = $true }
if (-not $rejected) { throw 'Missing check must throw.' }
$invalid = $good.Clone()
$invalid['StartupTaskOwned'] = 'True'
$rejected = $false
try { $null = Get-HubStartupEvidenceVerdict -Evidence $invalid } catch { $rejected = $true }
if (-not $rejected) { throw 'Truthy string must be rejected.' }
Write-Host 'Build 104: syntax, read-only contract and 10 fail-closed cases PASS.'
