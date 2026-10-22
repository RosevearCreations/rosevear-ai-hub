<# Build 106 pure verdict, syntax and read-only boundary regression.
   No VirtualBox calls, DNS lookups, device commands, or network activity here.
#>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$module = Join-Path $PSScriptRoot 'HubHaMqttEvidence.psm1'
$inspector = Join-Path $PSScriptRoot 'inspect-hub-ha-mqtt-readiness.ps1'
foreach ($file in @($module, $inspector)) {
    $tokens = $null
    $errorsFound = $null
    [System.Management.Automation.Language.Parser]::ParseFile($file, [ref]$tokens, [ref]$errorsFound) | Out-Null
    if (@($errorsFound).Count -gt 0) { throw "Build 106 PowerShell syntax invalid: $file" }
}
Import-Module $module -Force
$good = @{
    VirtualBoxFound = $true
    VmFound = $true
    VmRunning = $true
    EfiEnabled = $true
    HomeAssistantTcpReachable = $true
    MqttTcpReachable = $true
}
$ready = Get-HubHaMqttEvidenceVerdict -Evidence $good
if ($ready.runtime_posture -cne 'READY_FOR_MANUAL_ACCEPTANCE' -or
    $ready.reason -cne 'READY_FOR_MANUAL_ACCEPTANCE' -or
    $ready.passed_checks -ne 6 -or $ready.total_checks -ne 6 -or
    $ready.authenticated_ha_status -cne 'UNVERIFIED_BY_TCP' -or
    $ready.authenticated_mqtt_status -cne 'UNVERIFIED_BY_TCP' -or
    $ready.device_inventory_continuity -cne 'MANUAL_REVIEW_REQUIRED' -or
    $ready.camera_inventory_and_playback -cne 'MANUAL_REVIEW_REQUIRED' -or
    $ready.vm_autostart_after_reboot -cne 'NOT_ESTABLISHED' -or
    $ready.changed_anything) {
    throw 'Passing TCP prerequisites must not imply authenticated or device/camera acceptance.'
}
$reasons = @{
    VirtualBoxFound = 'VIRTUALBOX_UNAVAILABLE'
    VmFound = 'VM_UNVERIFIED'
    VmRunning = 'VM_NOT_RUNNING'
    EfiEnabled = 'EFI_NOT_VERIFIED'
    HomeAssistantTcpReachable = 'HOME_ASSISTANT_TCP_UNREACHABLE'
    MqttTcpReachable = 'MQTT_TCP_UNREACHABLE'
}
foreach ($key in @($reasons.Keys)) {
    $bad = $good.Clone()
    $bad[$key] = $false
    $blocked = Get-HubHaMqttEvidenceVerdict -Evidence $bad
    if ($blocked.runtime_posture -cne 'HOLD' -or $blocked.reason -cne $reasons[$key] -or
        $blocked.passed_checks -ne 5 -or $blocked.changed_anything) {
        throw "Missing prerequisite did not HOLD: $key"
    }
}
foreach ($badEvidence in @(
    @{ VmFound = $true },
    @{ VirtualBoxFound = 'true'; VmFound = $true; VmRunning = $true;
       EfiEnabled = $true; HomeAssistantTcpReachable = $true; MqttTcpReachable = $true }
)) {
    $rejected = $false
    try { $null = Get-HubHaMqttEvidenceVerdict -Evidence $badEvidence } catch { $rejected = $true }
    if (-not $rejected) { throw 'Incomplete or non-boolean evidence must fail closed.' }
}
$source = Get-Content -LiteralPath $inspector -Raw
foreach ($required in @('showvminfo', '--machinereadable', 'HomeAssistantPort = 80',
    'MqttPort = 1883', 'Test-PrivateTarget', 'Test-TcpPort', 'Get-HubHaMqttEvidenceVerdict')) {
    if (-not $source.Contains($required)) { throw "Build 106 missing read-only probe: $required" }
}
foreach ($forbidden in @(
    'startvm', 'controlvm', 'modifyvm', 'unregistervm', 'createvm',
    'Start-Process', 'Stop-Process', 'Restart-Computer', 'Restart-Service',
    'Start-Service', 'Stop-Service', 'Start-ScheduledTask', 'Register-ScheduledTask',
    'Set-ScheduledTask', 'Set-NetFirewallRule', 'New-NetFirewallRule',
    'Remove-NetFirewallRule', 'Set-Content', 'Add-Content', 'alembic upgrade'
)) {
    if ($source -match ('(?im)^\s*' + [regex]::Escape($forbidden) + '\b') -or
        $source -match ('(?i)''\s*' + [regex]::Escape($forbidden) + '\s*''')) {
        throw "Build 106 inspector must not execute $forbidden"
    }
}
if ($source -match '(?im)^\s*\$HOME\s*=') { throw 'Reserved HOME variable may not be assigned.' }
Write-Host 'Build 106: six fail-closed VM/MQTT checks, privacy and no-mutation regression PASS.'
