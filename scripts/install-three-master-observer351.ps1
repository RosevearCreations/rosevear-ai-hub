<# QL-460 original-host guarded observer installer.
Install creates a disabled task; separately approved Enable is required.
No module start, receiver action, remote connection or unsupervised activation.
#>
[CmdletBinding(DefaultParameterSetName="Inspect")]
param(
 [Parameter(ParameterSetName="Install",Mandatory)][switch]$Install,
 [Parameter(ParameterSetName="Enable",Mandatory)][switch]$Enable,
 [Parameter(ParameterSetName="Disable",Mandatory)][switch]$Disable,
 [Parameter(ParameterSetName="Remove",Mandatory)][switch]$Remove,
 [Parameter(ParameterSetName="Inspect")][switch]$Inspect,
 [string]$PythonExecutable = "",
 [string]$TaskName = "Rosevear Three-Master Observer QL460"
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
if ([Environment]::MachineName.ToUpperInvariant() -cne "DESKTOP-AE894KC") { throw "HOLD_ORIGINAL_HOST_REQUIRED" }
if ($TaskName -cne "Rosevear Three-Master Observer QL460") { throw "HOLD_TASK_NAME_NOT_ALLOWLISTED" }
$entry = Join-Path $PSScriptRoot "hub_master_supervisor350.py"
if (-not (Test-Path -LiteralPath $entry -PathType Leaf)) { throw "HOLD_SUPERVISOR_ENTRY_NOT_INSTALLED" }
$entry = [IO.Path]::GetFullPath($entry)
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
$needsPython = ($Install -or $null -ne $existing)
if ($needsPython -and [string]::IsNullOrWhiteSpace($PythonExecutable)) {
 throw "HOLD_OWNER_PINNED_PYTHON_PATH_REQUIRED"
}
$expectedArgs = $null
if ($needsPython) {
 if (-not [IO.Path]::IsPathRooted($PythonExecutable)) { throw "HOLD_PYTHON_MUST_BE_ABSOLUTE" }
 $PythonExecutable = [IO.Path]::GetFullPath($PythonExecutable)
 if (-not (Test-Path -LiteralPath $PythonExecutable -PathType Leaf)) { throw "HOLD_PINNED_PYTHON_NOT_FOUND" }
 if ([IO.Path]::GetFileName($PythonExecutable).ToLowerInvariant() -notin @("python.exe","pythonw.exe")) {
  throw "HOLD_PYTHON_EXECUTABLE_NOT_ALLOWLISTED"
 }
 $expectedArgs = '-u "{0}" --watch' -f $entry
}
function Assert-KnownTask($task) {
 if ($null -eq $task) { throw "HOLD_TASK_NOT_INSTALLED" }
 $actions = @($task.Actions)
 $triggers = @($task.Triggers)
 if (
  $actions.Count -ne 1 -or
  [IO.Path]::GetFullPath([string]$actions[0].Execute) -cne $PythonExecutable -or
  [string]$actions[0].Arguments -cne $expectedArgs -or
  $triggers.Count -ne 1 -or
  [string]$triggers[0].CimClass.CimClassName -cne "MSFT_TaskBootTrigger" -or
  [string]$task.Principal.UserId -notin @("SYSTEM","S-1-5-18") -or
  [string]$task.Principal.RunLevel -cne "Highest"
 ) { throw "HOLD_UNRECOGNIZED_TASK_NO_MUTATION" }
}
if ($Install) {
 if ($existing) {
  Assert-KnownTask $existing
  Write-Output "KNOWN_TASK_ALREADY_PRESENT_NO_CHANGE"
  exit 0
 }
 $admin = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
 if (-not $admin.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "HOLD_ELEVATED_LOCAL_OWNER_REQUIRED"
 }
 foreach ($key in @(
  "ROSEVEAR_QL458_MANIFEST_PATH","ROSEVEAR_QL458_OWNER_KEY_PATH",
  "ROSEVEAR_QL458_OWNER_KEY_PIN","ROSEVEAR_QL459_CUSTODY_DB",
  "ROSEVEAR_QL460_EVENT_DB","ROSEVEAR_QL460_BOOT_DB"
 )) {
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key,"Machine"))) {
   throw "HOLD_MACHINE_SCOPED_CONFIGURATION_MISSING_$key"
  }
 }
 $action = New-ScheduledTaskAction -Execute $PythonExecutable -Argument $expectedArgs
 $trigger = New-ScheduledTaskTrigger -AtStartup
 $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
 $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -RestartCount 0
 Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -ErrorAction Stop | Out-Null
 Disable-ScheduledTask -TaskName $TaskName -ErrorAction Stop | Out-Null
 Write-Output "TASK_INSTALLED_DISABLED_REQUIRES_SEPARATE_OWNER_ENABLE_AND_REBOOT_TEST"
 exit 0
}
if ($Remove -and -not $existing) {
 Write-Output "TASK_NOT_PRESENT_NO_CHANGE"
 exit 0
}
Assert-KnownTask $existing
if ($Inspect) {
 $info = Get-ScheduledTaskInfo -TaskName $TaskName
 [pscustomobject]@{
  taskName=$TaskName; state=[string]$existing.State;
  lastRunTime=$info.LastRunTime.ToString("o");
  lastTaskResult=$info.LastTaskResult;
  originalHostConfirmed=$true;
  rebootPersistenceVerified=$false;
  recoveredModulesVerified=$false;
  physicalReceiverAuthorized=$false
 } | ConvertTo-Json -Compress
 exit 0
}
$admin = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $admin.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
 throw "HOLD_ELEVATED_LOCAL_OWNER_REQUIRED"
}
if ($Enable) {
 Enable-ScheduledTask -TaskName $TaskName -ErrorAction Stop | Out-Null
 Write-Output "TASK_ENABLED_NEXT_REAL_REBOOT_WITNESS_REQUIRED"
}
if ($Disable) {
 Disable-ScheduledTask -TaskName $TaskName -ErrorAction Stop | Out-Null
 Write-Output "TASK_DISABLED_NO_SERVICE_STOP"
}
if ($Remove) {
 if ($existing.State -ne "Disabled") { throw "HOLD_DISABLE_BEFORE_REMOVE" }
 Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
 Write-Output "OWNED_TASK_REMOVED_NO_SERVICE_STOP"
}
