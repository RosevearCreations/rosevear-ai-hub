<# Build 361 / QL-470. Read-only original-host recovery/worker inventory.
   No task/service installation, restart, authorization, credential or receiver action.
   No event messages, account IDs, task arguments, paths or secrets are exported.
#>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if ([Environment]::MachineName.ToUpperInvariant() -cne 'DESKTOP-AE894KC') {
    throw 'HOLD_ORIGINAL_HOST_REQUIRED'
}
$root=Split-Path -Parent $PSScriptRoot
$head=@(& git -C $root rev-parse --verify HEAD 2>$null)
if ($LASTEXITCODE -ne 0 -or $head.Count -ne 1 -or [string]$head[0] -notmatch '^[0-9a-f]{40}$') {
    throw 'HOLD_SOURCE_COMMIT_UNVERIFIED'
}
$boot=(Get-CimInstance Win32_OperatingSystem -ErrorAction Stop).LastBootUpTime
$bootUtc=([datetime]$boot).ToUniversalTime()
$taskNames=@('Rosevear AI Hub Unattended Boot','Rosevear AI Hub Unattended Recovery')
$tasks=@(
    foreach ($name in $taskNames) {
        $task=Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
        $info=if ($null -ne $task) {
            Get-ScheduledTaskInfo -TaskName $name -ErrorAction SilentlyContinue
        } else { $null }
        $state=if ($null -eq $task) { 'NOT_INSTALLED' }
        elseif ([string]$task.State -eq 'Ready') { 'READY' }
        elseif ([string]$task.State -eq 'Running') { 'RUNNING' }
        elseif ([string]$task.State -eq 'Disabled') { 'DISABLED' }
        else { 'UNKNOWN' }
        $ran=if ($null -ne $info -and $null -ne $info.LastRunTime -and
                [datetime]$info.LastRunTime -ge [datetime]'2000-01-01') {
            ([datetime]$info.LastRunTime).ToUniversalTime().ToString('o')
        } else { $null }
        [pscustomobject]@{
            name=$name
            state=$state
            lastRunUtc=$ran
            lastResult=if ($null -ne $info) { [long]$info.LastTaskResult } else { $null }
            exactTaskIdentityIndependentlyVerified=$false
        }
    }
)
$serviceNames=@('Rosevear-AIHub','Rosevear-AIDataPlatform','Rosevear-CommsHub')
$services=@(
    foreach ($name in $serviceNames) {
        $service=Get-CimInstance Win32_Service -Filter ("Name='" + $name + "'") -ErrorAction SilentlyContinue
        $service= @($service) | Select-Object -First 1
        [pscustomobject]@{
            name=$name
            state=if ($null -eq $service) { 'NOT_INSTALLED' }
                elseif ($service.State -eq 'Running') { 'RUNNING' }
                elseif ($service.State -eq 'Stopped') { 'STOPPED' }
                else { 'UNKNOWN' }
            startMode=if ($null -eq $service) { 'NOT_INSTALLED' }
                elseif ($service.StartMode -eq 'Auto') { 'AUTOMATIC' }
                elseif ($service.StartMode -eq 'Manual') { 'MANUAL' }
                elseif ($service.StartMode -eq 'Disabled') { 'DISABLED' }
                else { 'UNKNOWN' }
            signedServiceEnrollmentVerified=$false
        }
    }
)
# Event IDs/timestamps are a bounded LOCAL sample, not evidence a named task ran.
$events=@()
try {
    $raw=@(Get-WinEvent -FilterHashtable @{
        LogName='Microsoft-Windows-TaskScheduler/Operational'
        StartTime=$bootUtc.ToLocalTime()
    } -MaxEvents 30 -ErrorAction Stop)
    $events=@($raw |
        Where-Object { $_.Id -in @(100,101,102,103,106,107,108,110,111,200,201) } |
        Select-Object -First 12 |
        ForEach-Object {
            [pscustomobject]@{
                id=[int]$_.Id
                utc=([datetime]$_.TimeCreated).ToUniversalTime().ToString('o')
            }
        })
} catch {
    # A missing or unreadable event log must not fabricate a success.
    $events=@()
}
$now=[DateTimeOffset]::UtcNow
[pscustomobject]@{
    schema='rosevear.hub.ql470.local-recovery-telemetry361.v1'
    source='UNSIGNED_LOCAL_INVENTORY_ONLY'
    originalHost='DESKTOP-AE894KC'
    sourceCommit=[string]$head[0]
    observedAtMs=$now.ToUnixTimeMilliseconds()
    lastWindowsBootUtc=$bootUtc.ToString('o')
    tasks=$tasks
    masterServices=$services
    recentTaskSchedulerEventIds=$events
    guestAuthenticatedContinuityVerified=$false
    independentPreloginWitnessVerified=$false
    physicalAutomaticStartupVerified=$false
    masterWorkersSignedAckVerified=$false
    commsPrivateReceiverAuthorized=$false
    changesMade=$false
} | ConvertTo-Json -Depth 6 -Compress
