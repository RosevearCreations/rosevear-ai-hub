<# Rosevear AI Hub Build 358 / QL-467.
  Original-host, bounded reboot continuity evidence.
  Default Preflight/AfterReboot are read-only. CaptureBaseline writes only a new
  local, NON-SECRET, UNSIGNED snapshot; never starts tasks, services or VMs.
  Off-machine pre-login witness and independent Master peer ACK are distinct.
#>
[CmdletBinding()]
param(
    [ValidateSet('Preflight','CaptureBaseline','AfterReboot')]
    [string]$Mode='Preflight'
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if ([Environment]::MachineName.ToUpperInvariant() -cne 'DESKTOP-AE894KC') {
    throw 'HOLD_ORIGINAL_HOST_REQUIRED'
}
$root=Split-Path -Parent $PSScriptRoot
$baselinePath=Join-Path $env:LOCALAPPDATA 'RosevearAIHub\ql467-reboot-baseline358.json'
$psExe=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

# The existing 357 inventory performs NO registration or activation.
$json=@(& $psExe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'inspect-original-host-acceptance357.ps1') -Phase BeforeReboot)
if ($LASTEXITCODE -ne 0) { throw 'HOLD_357_READ_ONLY_INVENTORY_FAILED' }
$snapshot=($json -join [Environment]::NewLine) | ConvertFrom-Json -ErrorAction Stop
if ([string]$snapshot.schema -cne 'rosevear.hub.original-host-acceptance357.v1' -or
    -not $snapshot.originalHostVerified) { throw 'HOLD_ORIGINAL_HOST_INVENTORY_INVALID' }

$os=Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
$bootUtc=([datetime]$os.LastBootUpTime).ToUniversalTime()
$utcNow=[DateTime]::UtcNow
$head=@(& git -C $root rev-parse HEAD 2>$null)
if ($LASTEXITCODE -ne 0 -or $head.Count -ne 1 -or
    [string]$head[0] -notmatch '^[0-9a-fA-F]{40}$') {
    throw 'HOLD_SOURCE_COMMIT_UNVERIFIED'
}
$sourceCommit=[string]$head[0]
$taskStatesValid=([bool]$snapshot.bootTask.identityVerified -and
    [bool]$snapshot.recoveryTask.identityVerified)
$taskStatesEnabled=(-not [bool]$snapshot.bootTaskDisabled -and
    -not [bool]$snapshot.recoveryTaskDisabled)
$vmAndHttpHealthy=([bool]$snapshot.originalVmAndOllamaPinReady -and
    [bool]$snapshot.hubLoopbackHttpHealthy -and
    [bool]$snapshot.ollamaLoopbackHttpHealthy -and
    [bool]$snapshot.tailscaleServiceAutomatic)
# Identity and disabled flags are separate: not-disabled does NOT guarantee Enabled.
$bootTask=Get-ScheduledTask -TaskName 'Rosevear AI Hub Unattended Boot' -ErrorAction SilentlyContinue
$recoveryTask=Get-ScheduledTask -TaskName 'Rosevear AI Hub Unattended Recovery' -ErrorAction SilentlyContinue
$bothEnabled=($null -ne $bootTask -and $null -ne $recoveryTask -and
    [string]$bootTask.State -eq 'Ready' -and
    [string]$recoveryTask.State -eq 'Ready')
$preflightReady=($taskStatesValid -and $taskStatesEnabled -and $bothEnabled -and $vmAndHttpHealthy)
$reasonCodes=[Collections.Generic.List[string]]::new()
if (-not $taskStatesValid) { $reasonCodes.Add('HOLD_TASK_IDENTITIES') }
if (-not $taskStatesEnabled -or -not $bothEnabled) {
    $reasonCodes.Add('HOLD_TASKS_NOT_ENABLED')
}
if (-not $vmAndHttpHealthy) { $reasonCodes.Add('HOLD_LOCAL_DEPENDENCIES') }

$baselineFound=Test-Path -LiteralPath $baselinePath -PathType Leaf
$baselineWritten=$false
$baselineMatched=$false
$newWindowsBootObserved=$false
$taskHistoryObserved=$false
$localContinuityObserved=$false

if ($Mode -eq 'CaptureBaseline') {
    if (-not $preflightReady) {
        throw ('HOLD_BASELINE_PREFLIGHT_' + ($reasonCodes -join '_'))
    }
    if (Test-Path -LiteralPath $baselinePath) {
        throw 'HOLD_PRIOR_BASELINE_REQUIRES_OWNER_REVIEW_NO_OVERWRITE'
    }
    $record=[ordered]@{
        schema='rosevear.hub.ql467-reboot-baseline358.v1'
        originalHost='DESKTOP-AE894KC'
        beforeBootUtc=$bootUtc.ToString('o')
        capturedUtc=$utcNow.ToString('o')
        sourceCommit=$sourceCommit
        independentWitnessSignaturePresent=$false
    }
    $dir=Split-Path -Parent $baselinePath
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    $bytes=[Text.UTF8Encoding]::new($false).GetBytes(
        ($record | ConvertTo-Json -Compress))
    $stream=$null
    try {
        $stream=[IO.File]::Open($baselinePath,'CreateNew','Write','None')
        $stream.Write($bytes,0,$bytes.Length)
        $baselineWritten=$true
        $baselineFound=$true
    } finally {
        if ($null -ne $stream) { $stream.Dispose() }
    }
}
if ($Mode -eq 'AfterReboot') {
    if (-not $baselineFound) {
        $reasonCodes.Add('HOLD_BASELINE_MISSING')
    } else {
        $item=Get-Item -LiteralPath $baselinePath -ErrorAction Stop
        if ($item.Length -lt 2 -or $item.Length -gt 8192 -or
            ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            $reasonCodes.Add('HOLD_BASELINE_UNTRUSTED')
        } else {
            try {
                $record=Get-Content -LiteralPath $baselinePath -Raw -ErrorAction Stop |
                    ConvertFrom-Json -ErrorAction Stop
                if ($record.schema -cne 'rosevear.hub.ql467-reboot-baseline358.v1' -or
                    $record.originalHost -cne 'DESKTOP-AE894KC' -or
                    [string]$record.sourceCommit -cne $sourceCommit -or
                    [string]$record.beforeBootUtc -notmatch '^\d{4}-' -or
                    [string]$record.capturedUtc -notmatch '^\d{4}-') {
                    $reasonCodes.Add('HOLD_BASELINE_IDENTITY_MISMATCH')
                } else {
                    $oldBoot=[datetime]::Parse(
                        [string]$record.beforeBootUtc,
                        [Globalization.CultureInfo]::InvariantCulture,
                        [Globalization.DateTimeStyles]::RoundtripKind
                    ).ToUniversalTime()
                    $captured=[datetime]::Parse(
                        [string]$record.capturedUtc,
                        [Globalization.CultureInfo]::InvariantCulture,
                        [Globalization.DateTimeStyles]::RoundtripKind
                    ).ToUniversalTime()
                    $baselineMatched=($captured -ge $oldBoot -and
                        $captured -le $utcNow.AddMinutes(1))
                    $newWindowsBootObserved=($baselineMatched -and
                        $bootUtc -gt $oldBoot -and $bootUtc -gt $captured)
                    if (-not $newWindowsBootObserved) {
                        $reasonCodes.Add('HOLD_NO_NEW_WINDOWS_BOOT')
                    }
                }
            } catch {
                $reasonCodes.Add('HOLD_BASELINE_PARSE_INVALID')
            }
        }
    }
    # A zero result ALONE does not prove pre-login / HA/MQTT/cameras or signed peer ACK.
    $taskHistoryObserved=($newWindowsBootObserved -and
        [bool]$snapshot.bootHistory.ranAfterCurrentWindowsBoot -and
        [bool]$snapshot.recoveryHistory.ranAfterCurrentWindowsBoot -and
        [bool]$snapshot.bootHistory.lastTaskResultZero -and
        [bool]$snapshot.recoveryHistory.lastTaskResultZero)
    if (-not $taskHistoryObserved) { $reasonCodes.Add('HOLD_NEW_BOOT_TASK_HISTORY') }
    $localContinuityObserved=($preflightReady -and
        $newWindowsBootObserved -and $taskHistoryObserved)
}
$report=[ordered]@{
    schema='rosevear.hub.ql467-original-host-continuity358.v1'
    source='UNSIGNED_LOCAL_ONLY'
    phase=$Mode
    sourceCommit=$sourceCommit
    originalHostVerified=$true
    taskIdentitiesVerified=[bool]$taskStatesValid
    taskStatesEnabled=[bool]$bothEnabled
    originalVmHubOllamaTailscaleHealthy=[bool]$vmAndHttpHealthy
    preflightReadyForOwnerSupervisedReview=[bool]$preflightReady
    baselinePresent=[bool]$baselineFound
    baselineCaptured=[bool]$baselineWritten
    baselineMatched=[bool]$baselineMatched
    newWindowsBootObserved=[bool]$newWindowsBootObserved
    tasksRanSuccessfullyAfterBoot=[bool]$taskHistoryObserved
    localContinuityObserved=[bool]$localContinuityObserved
    reasonCodes=@($reasonCodes)
    offHostAuthenticatedPreLoginWitnessVerified=$false
    independentOwnerBackupAndGuestCameraMqttVerified=$false
    aiDataWorkerSignedEnrollmentVerified=$false
    commsWorkerSignedEnrollmentVerified=$false
    peerMtlSAndDurableAckVerified=$false
    commsPrivateTestReceiverAuthorized=$false
    physicalUnattendedProductionGreen=$false
    rebootExecuted=$false
    changesMade=[bool]$baselineWritten
}
[pscustomobject]$report | ConvertTo-Json -Depth 5 -Compress
