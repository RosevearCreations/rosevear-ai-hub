<# Build 104: READ ONLY inspection of the two Hub runtime startup tasks.
   Does not reboot, change tasks, start services or prove post-boot recovery.
   Prints only fixed classifications and booleans; never paths or identities.
#>
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Import-Module (Join-Path $PSScriptRoot 'HubStartupEvidence.psm1') -Force
. (Join-Path $PSScriptRoot 'HubTaskIdentityEvidence.ps1')

$currentSid = [string][Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$recoveryScript = Join-Path $PSScriptRoot 'hub-recovery.ps1'
$expectedArguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f $recoveryScript

function Get-TaskPrincipalSid([object]$Task) {
    if (-not $Task) { return '' }
    try {
        $name = [string]$Task.Principal.UserId
        if ([string]::IsNullOrWhiteSpace($name)) { return '' }
        if ($name -match '^S-\d+-\d+(-\d+)+$') {
            return ([Security.Principal.SecurityIdentifier]::new($name)).Value
        }
        return ([Security.Principal.NTAccount]::new($name)).Translate(
            [Security.Principal.SecurityIdentifier]).Value
    } catch { return '' }
}

function Test-KnownTask([object]$Task) {
    if (-not $Task) { return $false }
    $actions = @($Task.Actions)
    $executable = if ($actions.Count -eq 1) { [string]$actions[0].Execute } else { '' }
    $arguments = if ($actions.Count -eq 1) { [string]$actions[0].Arguments } else { '' }
    $verdict = Get-HubTaskIdentityVerdict -TaskExists $true -ActionCount $actions.Count `
        -Executable $executable -Arguments $arguments -ExpectedArguments $expectedArguments `
        -CurrentSid $currentSid -PrincipalSid (Get-TaskPrincipalSid $Task)
    return [bool]$verdict.task_owned
}

function Test-FiveMinuteTrigger([object]$Task) {
    if (-not $Task) { return $false }
    foreach ($trigger in @($Task.Triggers)) {
        if ($trigger.Enabled -ne $true) { continue }
        try {
            $interval = [string]$trigger.Repetition.Interval
            if ([string]::IsNullOrWhiteSpace($interval)) { continue }
            if ([System.Xml.XmlConvert]::ToTimeSpan($interval) -eq [timespan]::FromMinutes(5)) {
                return $true
            }
        } catch { continue }
    }
    return $false
}

$startup = Get-ScheduledTask -TaskName 'Rosevear AI Hub Startup' -ErrorAction SilentlyContinue
$recovery = Get-ScheduledTask -TaskName 'Rosevear AI Hub Recovery' -ErrorAction SilentlyContinue
$startupLogon = [bool]($startup -and @($startup.Triggers | Where-Object {
    $_.CimClass.CimClassName -eq 'MSFT_TaskLogonTrigger' -and $_.Enabled -eq $true
}).Count -gt 0)
$evidence = @{
    StartupTaskPresent = [bool]$startup
    StartupTaskOwned = [bool](Test-KnownTask $startup)
    StartupTaskEnabled = [bool]($startup -and $startup.State -ne 'Disabled')
    StartupTaskLogonTrigger = $startupLogon
    RecoveryTaskPresent = [bool]$recovery
    RecoveryTaskOwned = [bool](Test-KnownTask $recovery)
    RecoveryTaskEnabled = [bool]($recovery -and $recovery.State -ne 'Disabled')
    RecoveryTaskFiveMinute = [bool](Test-FiveMinuteTrigger $recovery)
}
$verdict = Get-HubStartupEvidenceVerdict -Evidence $evidence
Write-Host 'Read-only Hub startup task readiness (not proof of a successful reboot):'
[pscustomobject]$evidence | Format-List
$verdict | Format-List
if ($verdict.runtime_posture -eq 'HOLD') { exit 2 }
