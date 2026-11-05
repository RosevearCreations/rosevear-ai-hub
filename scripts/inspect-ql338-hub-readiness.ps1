# QL-338 owner-supervised, READ-ONLY local check; never starts a service or joins a tailnet.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-OnlyTaskState {
    try {
        $task = Get-ScheduledTask -TaskName 'Rosevear AI Server Startup' -ErrorAction Stop
        return [string]$task.State
    } catch { return 'NOT_FOUND_OR_UNREADABLE' }
}

function Read-OnlyTailnetState {
    $tailscaleCommand = Get-Command tailscale.exe -ErrorAction SilentlyContinue
    if (-not $tailscaleCommand) { return 'CLI_NOT_FOUND' }
    try {
        $raw = (& $tailscaleCommand.Source status --json 2>$null) -join "`n"
        if ($LASTEXITCODE -ne 0) { return 'NOT_AVAILABLE' }
        $status = $raw | ConvertFrom-Json
        if ($status.BackendState -eq 'Running') { return 'RUNNING_ACL_NOT_VERIFIED' }
        return 'NOT_CONNECTED'
    } catch { return 'NOT_AVAILABLE' }
}

function Read-OnlyListenerState {
    try {
        $listeners = @(Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)
        if ($listeners.Count -eq 0) { return 'NO_BACKEND_LISTENER' }
        foreach ($listener in $listeners) {
            if ($listener.LocalAddress -notin @('127.0.0.1', '::1')) {
                return 'NON_LOOPBACK_BIND_REVIEW_REQUIRED'
            }
        }
        return 'LOOPBACK_ONLY_LISTENER'
    } catch { return 'UNAVAILABLE' }
}

$report = [ordered]@{
    schema = 'rosevear.hub.ql338.readonly.field-check.v1'
    check_mode = 'READ_ONLY_NO_REPAIR_NO_NETWORK_PROBE'
    startup_task = Read-OnlyTaskState
    tailscale = Read-OnlyTailnetState
    backend_port_8765 = Read-OnlyListenerState
    origin_cert_and_tailnet_acl_witness = 'NOT_VERIFIED_BY_THIS_SCRIPT'
    signer_and_windows_key_store_custody = 'NOT_VERIFIED_BY_THIS_SCRIPT'
    master_and_source_owner_test_authorization = 'NOT_GIVEN_BY_THIS_SCRIPT'
    power_restart_rollback_and_kill_switch_witness = 'NOT_VERIFIED_BY_THIS_SCRIPT'
    private_relay_install_or_activation = 'NOT_PERFORMED'
    real_signed_nonproduction_handshake = 'NOT_PERFORMED'
}

Write-Output ($report | ConvertTo-Json -Depth 3)
