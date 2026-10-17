<# Build 081: pure, conservative status policy. No network, disk, device or task actions. #>
Set-StrictMode -Version Latest

function Get-HubGatewayAcceptanceDecision {
    [CmdletBinding()]
    param(
        [bool]$AddressOnHost,
        [bool]$ApiLoopbackHealthy,
        [bool]$PwaReady,
        [bool]$GatewayProcessVerified,
        [bool]$FirewallScopeVerified,
        [bool]$StartupTaskIdentityVerified,
        [AllowNull()][object]$LastTaskResult = $null
    )
    $taskSucceeded = $StartupTaskIdentityVerified -and
        $null -ne $LastTaskResult -and
        [string]$LastTaskResult -eq '0'
    $localReady = $AddressOnHost -and $ApiLoopbackHealthy -and $PwaReady -and
        $GatewayProcessVerified -and $FirewallScopeVerified -and $taskSucceeded

    # Only the operator's actual client and a real restart can establish these.
    [pscustomobject]@{
        local_gateway = if ($localReady) { 'READY_FOR_REMOTE_RECHECK' } else { 'HOLD' }
        startup_task = if ($taskSucceeded) { 'LAST_RUN_SUCCEEDED' } else { 'UNVERIFIED_OR_FAILED' }
        remote_client_tls = 'MANUAL_RECHECK_REQUIRED'
        authenticated_client_access = 'MANUAL_RECHECK_REQUIRED'
        reboot_persistence = 'DEFERRED_BY_OPERATOR'
        camera_reconciliation = 'SEPARATE_OWNER_REVIEW'
        backup_provenance = 'SEPARATE_OWNER_REVIEW'
        changed_anything = $false
    }
}
