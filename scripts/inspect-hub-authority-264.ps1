<# Build 264: read-only original Windows authority field readback.
   No raw host identifier, executable path, task action, PID, or secret leaves this command.
   A local hash is a candidate, never independent attestation or an authorization. #>
[CmdletBinding()]
param([ValidateSet('before','after')][string]$Stage = 'before')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$launcher = & (Join-Path $PSScriptRoot 'inspect-hub-launcher-263.ps1') -Stage $Stage | ConvertFrom-Json
if ($launcher.schema -ne 'rosevear-windows-original-launcher-custody-263/v1' -or
    $launcher.changed_anything -ne $false -or $launcher.remote_requests -ne 0) {
    throw 'A genuine read-only Build 263 observation is required.'
}

function Get-AuthorityDigest([string]$Text) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
        return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
    } finally { $sha.Dispose() }
}

$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\')
$hostCandidate = Get-AuthorityDigest "ROSEVEAR-264-HOST-CANDIDATE`n$([Environment]::MachineName.ToLowerInvariant())`n$($root.ToLowerInvariant())"
$recoveryState = 'unavailable'
$recoveryResult = 'unavailable'
$actionDigest = $null
$expectedAction = $false
try {
    $task = Get-ScheduledTask -TaskName 'Rosevear AI Hub Recovery' -ErrorAction Stop
    $actions = @($task.Actions)
    $recoveryState = if ($task.State -eq 'Disabled') { 'disabled' } else { 'enabled' }
    if ($actions.Count -eq 1) {
        $action = $actions[0]
        $execution = [string]$action.Execute
        $arguments = [string]$action.Arguments
        $workingDirectory = [string]$action.WorkingDirectory
        $expectedScript = Join-Path $root 'scripts\hub-recovery.ps1'
        $expectedAction = $execution -match '(?i)(?:^|[\\/])powershell(?:\.exe)?$' -and
            $arguments.Contains($expectedScript) -and
            $arguments -match '(?i)-File\s+' -and
            ($workingDirectory -eq '' -or $workingDirectory -eq $root)
        $actionDigest = Get-AuthorityDigest "ROSEVEAR-264-RECOVERY-ACTION`n$execution`n$arguments`n$workingDirectory"
    }
    $info = Get-ScheduledTaskInfo -TaskName 'Rosevear AI Hub Recovery' -ErrorAction Stop
    $recoveryResult = if ($info.LastTaskResult -eq 0) { 'success' } else { 'nonzero' }
} catch {
    # Access restriction or task absence is HOLD, never an excuse to infer custody.
    $recoveryState = 'unavailable'
    $recoveryResult = 'unavailable'
    $expectedAction = $false
    $actionDigest = $null
}

[ordered]@{
    schema = 'rosevear-windows-authority-field-264/v1'
    source = 'on_device_read_only'
    stage = $Stage
    observed_at = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    release_sha_candidate = $launcher.release_sha_candidate
    launcher_263 = $launcher
    host_binding_candidate_sha256 = $hostCandidate
    recovery_action_candidate_sha256 = $actionDigest
    recovery_task_state = $recoveryState
    recovery_last_result = $recoveryResult
    recovery_action_expected = $expectedAction
    original_host_authenticated = $false
    witnessed_restart_accepted = $false
    test_authorized = $false
    challenge_executed = $false
    receiver_activated = $false
    comms_connected = $false
    changed_anything = $false
    remote_requests = 0
} | ConvertTo-Json -Depth 12 -Compress
