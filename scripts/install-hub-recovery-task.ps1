param(
    [string]$TaskName = "Rosevear AI Hub Recovery",
    [switch]$Install,
    [switch]$Remove
)
$ErrorActionPreference = "Stop"
if ($Install -and $Remove) { throw "Choose either -Install or -Remove." }
if (-not $Install -and -not $Remove) { throw "Pass -Install or -Remove explicitly." }
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Remove) {
    if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }
    Write-Host "Recovery task removed (if present). Existing startup task unchanged."
    exit 0
}
if ($existing) { throw "Task '$TaskName' already exists; review it before changing." }
$root = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $PSScriptRoot "hub-recovery.ps1"
if (-not (Test-Path $scriptPath)) { throw "Recovery script missing." }
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f $scriptPath) -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Repetition = $null
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 4) -StartWhenAvailable
# Use a separate repeated trigger. It does not replace the existing startup task.
$daily = New-ScheduledTaskTrigger -Daily -At (Get-Date).Date.AddMinutes(5)
$daily.Repetition.Interval = "PT5M"
$daily.Repetition.Duration = "P1D"
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Highest
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($trigger, $daily) -Settings $settings -Principal $principal | Out-Null
Write-Host "Installed five-minute recovery task. Existing startup task unchanged."
