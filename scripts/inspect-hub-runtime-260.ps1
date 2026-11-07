<# Build 260 supervised Windows release observation. Read-only by design.
   -Stage is an operator label, NOT evidence that a restart happened.
   Never restart processes, change tasks, activate receivers, or export paths/PIDs/arguments. #>
[CmdletBinding()]
param(
    [ValidateSet('before', 'after')][string]$Stage = 'before'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$launcher = & (Join-Path $PSScriptRoot 'inspect-hub-launcher-259.ps1') | ConvertFrom-Json
if ($launcher.schema -ne 'rosevear-windows-launcher-custody-259/v1' -or
    $launcher.changed_anything -ne $false -or $launcher.remote_requests -ne 0) {
    throw 'Build 259 source observation is missing or not read-only.'
}

$report = [ordered]@{
    schema = 'rosevear-windows-supervised-runtime-260/v1'
    source = 'on_device_read_only'
    stage = $Stage
    observed_at = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    release_sha_candidate = $launcher.checkout_sha_candidate
    launcher_259 = $launcher
    web_started_utc = $launcher.identity_258.web.process_started_utc
    backend_started_utc = $launcher.identity_258.backend.process_started_utc
    recovery_task_state = $launcher.recovery_task_state
    startup_task_state = $launcher.startup_task_state
    operator_stage_is_not_proof = $true
    supervised_restart_authorized = $false
    supervised_restart_performed_attested = $false
    installed_release_attested = $false
    independent_runtime_verified = $false
    test_authorized = $false
    challenge_executed = $false
    receiver_activated = $false
    comms_connected = $false
    changed_anything = $false
    remote_requests = 0
}
$report | ConvertTo-Json -Depth 12 -Compress
