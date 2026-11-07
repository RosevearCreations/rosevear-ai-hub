<# Build 262: read-only Windows recovery custody classification and runtime HOLD.
   Neither a successful recovery pass nor served Vite source proves installed-process identity.
   Never exports PIDs, commands, full paths, credentials or private keys. #>
[CmdletBinding()]
param([ValidateSet('before','after')][string]$Stage = 'before')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\')
$previous = & (Join-Path $PSScriptRoot 'inspect-hub-installed-261.ps1') -Stage $Stage | ConvertFrom-Json
if ($previous.schema -ne 'rosevear-windows-installed-source-map-261/v1' -or
    $previous.changed_anything -ne $false -or $previous.remote_requests -ne 0) {
    throw 'Build 261 read-only custody source is required.'
}
. (Join-Path $PSScriptRoot 'hub-recovery-mode.ps1')
$mode = Get-HubRecoveryMode -ManagedHome (Join-Path $root 'logs\hub-deployment')
$taskState = 'unavailable'
$taskActionMatches = $false
$taskLastResultZero = $false
try {
    $task = Get-ScheduledTask -TaskName 'Rosevear AI Hub Recovery' -ErrorAction Stop
    $taskState = if ($task.State -eq 'Disabled') { 'disabled' } else { 'present' }
    $expectedScript = (Join-Path $root 'scripts\hub-recovery.ps1')
    $taskActionMatches = @($task.Actions | Where-Object {
        [string]$_.Execute -match '(?i)(?:^|[\\/])powershell\.exe$' -and
        [string]$_.Arguments -like "*$expectedScript*"
    }).Count -eq 1
    $taskInfo = Get-ScheduledTaskInfo -TaskName 'Rosevear AI Hub Recovery' -ErrorAction SilentlyContinue
    if ($null -ne $taskInfo) { $taskLastResultZero = ($taskInfo.LastTaskResult -eq 0) }
} catch { $taskState = 'unavailable' }
$report = [ordered]@{
    schema = 'rosevear-windows-runtime-closure-262/v1'
    source = 'on_device_read_only'
    stage = $Stage
    observed_at = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    release_sha_candidate = $previous.release_sha_candidate
    recovery_mode = $mode
    recovery_task_state = $taskState
    expected_recovery_action_matches = $taskActionMatches
    recovery_last_result_zero = $taskLastResultZero
    recovery_success_is_process_proof = $false
    checkout_source_only = ($previous.artifact_mapping_status -eq 'checkout_artifacts_only')
    served_client_module_is_process_proof = $false
    original_installed_source_verified = $false
    supervised_restart_receipt_verified = $false
    independent_witness_verified = $false
    runtime_identity_closure = 'HOLD_PENDING_ORIGINAL_PROCESS_COMMAND_AND_SIGNED_RELEASE_RECEIPT'
    test_authorized = $false
    challenge_executed = $false
    receiver_activated = $false
    comms_connected = $false
    changed_anything = $false
    remote_requests = 0
}
$report | ConvertTo-Json -Depth 6 -Compress
