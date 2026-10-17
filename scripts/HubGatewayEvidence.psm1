# Build 081: pure evaluator for read-only gateway evidence.
# A successful task run does not prove automatic post-reboot recovery.
function Get-HubGatewayEvidenceVerdict {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][hashtable]$Evidence)
    $keys = @(
        'TaskPresent', 'TaskOwned', 'TaskLogonTrigger', 'TaskRunSucceeded',
        'BackendLoopback', 'BuiltPwaReady', 'CaddyOwnedListener', 'FirewallScoped'
    )
    foreach ($key in $keys) {
        if (-not $Evidence.ContainsKey($key) -or $Evidence[$key] -isnot [bool]) {
            throw "Invalid or missing boolean evidence field: $key"
        }
    }
    $passing = @($keys | Where-Object { $Evidence[$_] -eq $true })
    $state = if ($passing.Count -eq $keys.Count) { 'READY_FOR_SUPERVISED_REBOOT_TEST' } else { 'HOLD' }
    [pscustomobject][ordered]@{
        runtime_posture = $state
        passed_checks = $passing.Count
        required_checks = $keys.Count
        reboot_persistence = 'PENDING_SUPERVISED_SERVER_REBOOT'
        task_automatic_launch = 'NOT_PROVEN_BY_LAST_RUN'
        client_tls_trust = 'SEPARATE_CLIENT_CONFIRMATION'
        camera_reconciliation = 'SEPARATE_OWNER_ACCEPTANCE'
        backup_provenance = 'SEPARATE_OWNER_ACCEPTANCE'
        changed_anything = $false
    }
}
Export-ModuleMember -Function Get-HubGatewayEvidenceVerdict
