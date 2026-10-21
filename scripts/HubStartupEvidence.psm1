<# Build 104: pure reboot-prerequisite classifier. No Windows or network calls. #>
Set-StrictMode -Version Latest

function Get-HubStartupEvidenceVerdict {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][System.Collections.IDictionary]$Evidence)

    $required = @(
        'StartupTaskPresent', 'StartupTaskOwned', 'StartupTaskEnabled',
        'StartupTaskLogonTrigger', 'RecoveryTaskPresent', 'RecoveryTaskOwned',
        'RecoveryTaskEnabled', 'RecoveryTaskFiveMinute'
    )
    $passed = 0
    foreach ($name in $required) {
        if (-not $Evidence.Contains($name) -or $Evidence[$name] -isnot [bool]) {
            throw "Missing or invalid startup evidence: $name"
        }
        if ($Evidence[$name]) { $passed++ }
    }
    [pscustomobject][ordered]@{
        runtime_posture = if ($passed -eq $required.Count) { 'READY_FOR_SUPERVISED_REBOOT_TEST' } else { 'HOLD' }
        passed_checks = $passed
        total_checks = $required.Count
        reboot_persistence = 'PENDING_SUPERVISED_SERVER_REBOOT'
        before_windows_sign_in = 'NOT_PROVIDED_BY_USER_LOGON_TASKS'
        home_assistant_mqtt_ollama = 'SEPARATE_MANUAL_VERIFICATION'
        changed_anything = $false
    }
}

Export-ModuleMember -Function Get-HubStartupEvidenceVerdict
