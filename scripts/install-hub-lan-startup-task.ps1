<# Build 080: owner-opt-in gateway recovery at Windows sign-in.
   Separate from the working Hub/HA/MQTT/go2rtc scheduled tasks.
   No startup task is registered without -Install. No other task is removed.
#>
[CmdletBinding()]
param(
    [switch]$Install,
    [switch]$Remove,
    [string]$TaskName = 'Rosevear AI Hub LAN Gateway'
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($Install -and $Remove) { throw 'Choose -Install or -Remove, not both.' }

$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$runner = Join-Path $PSScriptRoot 'start-hub-lan-gateway.ps1'
if (-not (Test-Path -LiteralPath $runner)) { throw 'Gateway recovery entry point is missing.' }
$argsExpected = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f $runner
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    $actions = @($task.Actions)
    $owned = ($actions.Count -eq 1 -and
        [IO.Path]::GetFileName([string]$actions[0].Execute) -ieq 'powershell.exe' -and
        [string]$actions[0].Arguments -ceq $argsExpected -and
        [string]$task.Principal.UserId -ieq $identity)
    if (-not $owned) { throw 'HOLD: existing task is not the exact Hub gateway task; leaving it unchanged.' }
}
if (-not $Install -and -not $Remove) {
    Write-Host ('Gateway logon task installed: ' + [bool]$task)
    Write-Host 'No change. Use -Install or -Remove in elevated PowerShell after owner review.'
    exit 0
}
$admin = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $admin.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Install/remove requires explicitly elevated PowerShell.'
}
if ($Remove) {
    if ($task) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }
    Write-Host 'Gateway task removed (or absent). Running gateway and all other tasks unchanged.'
    exit 0
}
if ($task) { Write-Host 'Exact gateway task already installed; no changes.'; exit 0 }
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argsExpected
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -ErrorAction Stop | Out-Null
Write-Host 'Installed owner-approved gateway recovery at this Windows user sign-in.'
Write-Host 'Requires sign-in; this is NOT a pre-login Windows service.'
