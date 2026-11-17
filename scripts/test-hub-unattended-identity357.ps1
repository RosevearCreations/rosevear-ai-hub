<# Build 357 Windows runner synthetic fixtures only.
   Builds in-memory CIM actions, triggers and principal. NEVER registers,
   enables, disables, starts or stops a Windows task or process.
#>
[CmdletBinding()]param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'HubUnattendedTaskIdentity357.ps1')
$expectedUser=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$psExe=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$worker=Join-Path $PSScriptRoot 'boot-hub-unattended356.ps1'
$argsExpected='-WindowStyle Hidden -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $worker + '" -Run'
$action=New-ScheduledTaskAction -Execute $psExe -Argument $argsExpected
$boot=New-ScheduledTaskTrigger -AtStartup
$time=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 5)
$principal=New-ScheduledTaskPrincipal -UserId $expectedUser -LogonType Password
$fixture=[pscustomobject]@{
    TaskPath='\'
    Actions=@($action)
    Triggers=@($boot)
    Principal=$principal
}
$good=Test-HubUnattendedTaskIdentity357 -Task $fixture -TriggerKind Boot -ExpectedExecutable $psExe -ExpectedArguments $argsExpected -ExpectedUserId $expectedUser
if (-not $good.identityVerified -or @($good.reasonCodes).Count -ne 0) {
    throw ('SYNTHETIC_BOOT_TASK_REJECTED: ' + ($good.reasonCodes -join ','))
}
$fixture.Triggers=@($time)
$goodTime=Test-HubUnattendedTaskIdentity357 -Task $fixture -TriggerKind Time -ExpectedExecutable $psExe -ExpectedArguments $argsExpected -ExpectedUserId $expectedUser
if (-not $goodTime.identityVerified) {
    throw ('SYNTHETIC_RECOVERY_TASK_REJECTED: ' + ($goodTime.reasonCodes -join ','))
}
$badAction=New-ScheduledTaskAction -Execute $psExe -Argument '-Run -UnexpectedArgument'
$fixture.Actions=@($badAction)
$bad=Test-HubUnattendedTaskIdentity357 -Task $fixture -TriggerKind Time -ExpectedExecutable $psExe -ExpectedArguments $argsExpected -ExpectedUserId $expectedUser
if ($bad.identityVerified -or $bad.reasonCodes -notcontains 'ARGUMENTS_MISMATCH') {
    throw 'SYNTHETIC_MALICIOUS_ARGUMENTS_NOT_REJECTED'
}
$fixture.Actions=@($action)
$fixture.Principal=[pscustomobject]@{UserId=$expectedUser;LogonType='Interactive'}
$badLogon=Test-HubUnattendedTaskIdentity357 -Task $fixture -TriggerKind Time -ExpectedExecutable $psExe -ExpectedArguments $argsExpected -ExpectedUserId $expectedUser
if ($badLogon.identityVerified -or $badLogon.reasonCodes -notcontains 'PASSWORD_LOGON_MISMATCH') {
    throw 'SYNTHETIC_INTERACTIVE_TASK_NOT_REJECTED'
}
$missing=Test-HubUnattendedTaskIdentity357 -Task $null -TriggerKind Boot -ExpectedExecutable $psExe -ExpectedArguments $argsExpected -ExpectedUserId $expectedUser
if ($missing.identityVerified -or $missing.reasonCodes -notcontains 'TASK_ABSENT') {
    throw 'SYNTHETIC_ABSENT_TASK_NOT_REJECTED'
}
Write-Output 'BUILD357_IN_MEMORY_WINDOWS_IDENTITY_FIXTURES_PASSED_NO_TASKS_REGISTERED'
