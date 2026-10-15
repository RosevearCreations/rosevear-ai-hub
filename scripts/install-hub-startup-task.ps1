<# Build 077: install at-sign-in recovery alongside the five-minute task.
   Starts only after this Windows user signs in, not before login.
   Requires an elevated PowerShell for registration.
#>
param(
    [switch]$Install,
    [switch]$Remove,
    [string]$TaskName = "Rosevear AI Hub Startup"
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
if ($Install -eq $Remove) { throw "Specify exactly one of -Install or -Remove." }

$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$recoveryScript = Join-Path $PSScriptRoot "hub-recovery.ps1"
if (-not (Test-Path -LiteralPath $recoveryScript)) {
    throw "Hub recovery entry point is missing."
}
$arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f $recoveryScript
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    # Refuse to overwrite or delete an unrecognized scheduled task.
    $actions = @($existing.Actions)
    $matching = (
        $actions.Count -eq 1 -and
        ([IO.Path]::GetFileName([string]$actions[0].Execute) -ieq 'powershell.exe') -and
        ([string]$actions[0].Arguments -eq $arguments) -and
        ([string]$existing.Principal.UserId -ieq $identity)
    )
    if (-not $matching) { throw "Existing startup task differs; refusing to modify it." }
    if ($Install) {
        Write-Host "Known Hub startup-on-sign-in task already exists; no changes made."
        exit 0
    }
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Known Hub sign-in task removed. Five-minute recovery task unchanged."
    exit 0
}
if ($Remove) {
    Write-Host "No Hub sign-in task was installed; no changes made."
    exit 0
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Seconds 0)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -ErrorAction Stop | Out-Null
Write-Host "Installed Hub recovery at Windows sign-in. Existing 5-minute recovery task retained."
Write-Host "Startup occurs after this Windows user signs in (not before login)."
