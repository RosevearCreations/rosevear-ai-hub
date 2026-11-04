<# Build 248. Read-only, on-device evidence capture; no raw paths, command lines, task arguments,
   account names, machine names or secrets leave the console. A report is not attestation. #>
[CmdletBinding()]
param([ValidateRange(1024,65535)][int]$WebPort = 5173,
      [ValidateRange(1024,65535)][int]$BackendPort = 8765)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-ListenerReadback([int]$Port) {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalAddress -in @('127.0.0.1','::1') })
    if ($listeners.Count -ne 1) {
        return @{ status = if ($listeners.Count -eq 0) { 'not_observed' } else { 'ambiguous' }; pid = $null; parent_pid = $null; executable_kind = 'unverified' }
    }
    $ownerPid = [int]$listeners[0].OwningProcess
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerPid" -ErrorAction SilentlyContinue
    if (!$proc) { return @{ status = 'process_unavailable'; pid = $ownerPid; parent_pid = $null; executable_kind = 'unverified' } }
    $leaf = [IO.Path]::GetFileName([string]$proc.ExecutablePath).ToLowerInvariant()
    $kind = if ($leaf -in @('python.exe','pythonw.exe','node.exe','powershell.exe','pwsh.exe')) { $leaf } else { 'other' }
    return @{ status = 'observed_loopback'; pid = $ownerPid; parent_pid = [int]$proc.ParentProcessId; executable_kind = $kind }
}

function Get-TaskReadback([string]$Name) {
    $task = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
    if (!$task) { return @{ state = 'missing'; last_result = 'unavailable' } }
    $state = if ($task.State -eq 'Disabled' -or $task.Settings.Enabled -eq $false) { 'disabled' }
        elseif ($task.State -in @('Ready','Running','Queued')) { 'enabled' } else { 'unknown' }
    $last = 'unavailable'
    try {
        $info = Get-ScheduledTaskInfo -TaskName $Name -ErrorAction Stop
        $last = if ($info.LastRunTime.Year -lt 2000) { 'never_run' }
            elseif ($info.LastTaskResult -eq 0) { 'success_recorded' } else { 'failure_recorded' }
    } catch { }
    return @{ state = $state; last_result = $last }
}

$report = [ordered]@{
    schema = 'rosevear-windows-process-task-248/v1'
    observed_at = [datetime]::UtcNow.ToString('o')
    source = 'owner_on_device_read_only'
    listeners = [ordered]@{
        web = (Get-ListenerReadback $WebPort)
        backend = (Get-ListenerReadback $BackendPort)
    }
    tasks = [ordered]@{
        server = (Get-TaskReadback 'Rosevear AI Server Startup')
        hub = (Get-TaskReadback 'Rosevear AI Hub Startup')
        recovery = (Get-TaskReadback 'Rosevear AI Hub Recovery')
    }
    process_release_verified = $false
    restart_verified = $false
}
$report | ConvertTo-Json -Depth 5 -Compress
