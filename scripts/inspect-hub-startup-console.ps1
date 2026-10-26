<#
Build 146: optional, on-demand, READ-ONLY Windows task classification.
Run locally in PowerShell on the installed Windows Hub and paste only its JSON
into the owner-only startup console. No task actions, commands, arguments,
user identities, paths, machine names, ports or credentials are serialized.
This is operator-supplied evidence and never proves startup/recovery by itself.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$bootTime = $null
try { $bootTime = (Get-CimInstance Win32_OperatingSystem -ErrorAction Stop).LastBootUpTime } catch { }

function Get-TaskClassification([string]$Name) {
    $task = $null
    try { $task = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue } catch { }
    if ($null -eq $task) { return @{ state = 'missing'; lastRun = 'never_recorded'; bootCorrelation = 'unverified' } }

    $state = 'unverified'
    try {
        if ($task.State -eq 'Disabled' -or $task.Settings.Enabled -eq $false) {
            $state = 'disabled'
        } elseif ($task.State -in @('Ready', 'Running', 'Queued')) {
            $state = 'enabled'
        }
    } catch { $state = 'unverified' }

    $lastRun = 'unverified'
    $correlation = 'unverified'
    try {
        $info = Get-ScheduledTaskInfo -TaskName $Name -ErrorAction Stop
        if ($info.LastRunTime -eq [datetime]::MinValue -or $info.LastRunTime.Year -lt 2000) {
            $lastRun = 'never_recorded'
        } elseif ($info.LastTaskResult -eq 0) {
            $lastRun = 'success_recorded'
            if ($null -ne $bootTime) {
                $correlation = if ($info.LastRunTime -ge $bootTime) { 'after_boot' } else { 'before_boot' }
            }
        } else {
            $lastRun = 'failure_recorded'
        }
    } catch { $lastRun = 'unverified' }

    return @{ state = $state; lastRun = $lastRun; bootCorrelation = $correlation }
}

$report = [ordered]@{
    schema = 'rosevear-hub-windows-startup-v1'
    observedAt = [datetime]::UtcNow.ToString('o')
    tasks = [ordered]@{
        server = (Get-TaskClassification 'Rosevear AI Server Startup')
        hub = (Get-TaskClassification 'Rosevear AI Hub Startup')
        recovery = (Get-TaskClassification 'Rosevear AI Hub Recovery')
    }
}
$report | ConvertTo-Json -Depth 4 -Compress
