<# Build 357 / QL-466 — read-only original-host reboot acceptance inventory.
   This cannot witness pre-login availability from this same PC and MUST NEVER
   assert an independently signed reboot, peer ACK, or Comms receiver approval.
   Do not run changes, create services, enable tasks, or reboot Windows.
#>
[CmdletBinding()]
param([ValidateSet('BeforeReboot','AfterReboot')][string]$Phase='BeforeReboot')
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if ([Environment]::MachineName.ToUpperInvariant() -cne 'DESKTOP-AE894KC') {
    throw 'HOLD_ORIGINAL_HOST_REQUIRED'
}
. (Join-Path $PSScriptRoot 'HubUnattendedTaskIdentity357.ps1')
$psExe=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$worker=Join-Path $PSScriptRoot 'boot-hub-unattended356.ps1'
$argsExpected='-WindowStyle Hidden -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $worker + '" -Run'
$owner=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$bootTask=Get-ScheduledTask -TaskName 'Rosevear AI Hub Unattended Boot' -ErrorAction SilentlyContinue
$recoveryTask=Get-ScheduledTask -TaskName 'Rosevear AI Hub Unattended Recovery' -ErrorAction SilentlyContinue
$boot=Test-HubUnattendedTaskIdentity357 -Task $bootTask -TriggerKind Boot -ExpectedExecutable $psExe -ExpectedArguments $argsExpected -ExpectedUserId $owner
$recovery=Test-HubUnattendedTaskIdentity357 -Task $recoveryTask -TriggerKind Time -ExpectedExecutable $psExe -ExpectedArguments $argsExpected -ExpectedUserId $owner
$os=Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$lastBoot=if ($os) { [datetime]$os.LastBootUpTime } else { [datetime]::MinValue }
function Get-HubTaskAfterBoot357([string]$TaskName) {
    try {
        $info=Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction Stop
        return [pscustomobject]@{
            ranAfterCurrentWindowsBoot=($lastBoot -gt [datetime]::MinValue -and
                [datetime]$info.LastRunTime -gt $lastBoot)
            lastTaskResultZero=($info.LastTaskResult -eq 0 -and
                $info.LastRunTime -gt [datetime]'2000-01-01')
        }
    } catch {
        return [pscustomobject]@{
            ranAfterCurrentWindowsBoot=$false
            lastTaskResultZero=$false
        }
    }
}
$bootHistory=Get-HubTaskAfterBoot357 -TaskName 'Rosevear AI Hub Unattended Boot'
$recoveryHistory=Get-HubTaskAfterBoot357 -TaskName 'Rosevear AI Hub Unattended Recovery'
$vmPinReady=$false
try {
    $process = & $psExe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $worker -CheckOnly 2>$null
    if ($LASTEXITCODE -eq 0) {
        $check = (($process | Out-String).Trim() | ConvertFrom-Json -ErrorAction Stop)
        $vmPinReady=([bool]$check.originalHostVerified -and
            [bool]$check.virtualBoxPinnedAndEfiVerified -and
            [bool]$check.ollamaBinaryPinned)
    }
} catch {}
$hubHttpHealthy=$false
$ollamaHttpHealthy=$false
try {
    $health=Invoke-RestMethod -Uri 'http://127.0.0.1:8765/health' -TimeoutSec 3 -ErrorAction Stop
    $hubHttpHealthy=($health.status -eq 'ok')
} catch {}
try {
    $ver=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/version' -TimeoutSec 3 -ErrorAction Stop
    $ollamaHttpHealthy=-not [string]::IsNullOrWhiteSpace([string]$ver.version)
} catch {}
$tailscaleAutomatic=$false
try {
    $svc=Get-CimInstance Win32_Service -Filter "Name = 'Tailscale'" -ErrorAction Stop
    $tailscaleAutomatic=([string]$svc.State -eq 'Running' -and
        [string]$svc.StartMode -eq 'Auto')
} catch {}
$peerServices=@(
    foreach ($name in @('Rosevear-AIDataPlatform','Rosevear-CommsHub')) {
        $svc=Get-Service -Name $name -ErrorAction SilentlyContinue
        [pscustomobject]@{
            component=$(if ($name -eq 'Rosevear-AIDataPlatform') {'AI_DATA_PLATFORM'} else {'COMMS_HUB'})
            windowsServiceDetected=[bool]$svc
            serviceRunning=[bool]($svc -and $svc.Status -eq 'Running')
            ownerCustodianEnrollmentIndependentlyVerified=$false
            freshSignedPeerAckIndependentlyVerified=$false
        }
    }
)
$report=[ordered]@{
    schema='rosevear.hub.original-host-acceptance357.v1'
    phase=$Phase
    originalHostVerified=$true
    source='UNSIGNED_LOCAL_READ_ONLY'
    bootTask=$boot
    recoveryTask=$recovery
    bootTaskDisabled=[bool]($bootTask -and $bootTask.State -eq 'Disabled')
    recoveryTaskDisabled=[bool]($recoveryTask -and $recoveryTask.State -eq 'Disabled')
    bootHistory=$bootHistory
    recoveryHistory=$recoveryHistory
    originalVmAndOllamaPinReady=$vmPinReady
    hubLoopbackHttpHealthy=$hubHttpHealthy
    ollamaLoopbackHttpHealthy=$ollamaHttpHealthy
    tailscaleServiceAutomatic=$tailscaleAutomatic
    peerEnrollment=$peerServices
    authenticatedHomeAssistantMqttAndCameraPlaybackVerified=$false
    remotePreLoginWitnessVerified=$false
    independentWindowsBootWitnessVerified=$false
    independentMasterPeerMtlSAndAckVerified=$false
    commsPrivateReceiverAuthorityVerified=$false
    productionOriginalHostBootGreen=$false
    rebootExecuted=$false
    changesMade=$false
}
[pscustomobject]$report | ConvertTo-Json -Depth 9 -Compress
