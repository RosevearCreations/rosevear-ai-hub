<# Build 356 / QL-465 — original-PC attended enrollment, unattended execution.
   Only starts the pinned ORIGINAL VirtualBox HA guest, local Ollama, the
   guarded Hub recovery and guarded private Caddy recovery. Does not install
   software, change firewall, migrate databases, start other Master workers,
   publish messages, or authorize the Comms private TEST receiver.
#>
[CmdletBinding(DefaultParameterSetName='Check')]
param(
    [Parameter(ParameterSetName='Run', Mandatory)][switch]$Run,
    [Parameter(ParameterSetName='Check')][switch]$CheckOnly
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([Environment]::MachineName.ToUpperInvariant() -cne 'DESKTOP-AE894KC') {
    throw 'HOLD_ORIGINAL_HOST_REQUIRED'
}
$root = Split-Path -Parent $PSScriptRoot
$psExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$cfgPath = Join-Path $env:LOCALAPPDATA 'RosevearAIHub\autonomous-boot356.json'
if (-not (Test-Path -LiteralPath $cfgPath -PathType Leaf)) {
    throw 'HOLD_NO_OWNER_PINNED_BOOT_CONFIG'
}
$cfgFile = Get-Item -LiteralPath $cfgPath
if ($cfgFile.Length -gt 8192 -or ($cfgFile.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'HOLD_UNTRUSTED_BOOT_CONFIG'
}
$cfg = Get-Content -LiteralPath $cfgPath -Raw | ConvertFrom-Json
if ($cfg.schema -cne 'rosevear.hub.autonomous-boot356.v1' -or
    $cfg.vmUuid -notmatch '^[0-9a-fA-F-]{36}$' -or
    $cfg.vmName -cne 'Home Assistant' -or
    [IO.Path]::GetFileName([string]$cfg.ollamaExecutable) -ine 'ollama.exe' -or
    -not [IO.Path]::IsPathRooted([string]$cfg.ollamaExecutable)) {
    throw 'HOLD_BOOT_CONFIGURATION_INVALID'
}
$vbox = Join-Path ([Environment]::GetFolderPath('ProgramFiles')) 'Oracle\VirtualBox\VBoxManage.exe'
if (-not (Test-Path -LiteralPath $vbox -PathType Leaf)) {
    throw 'HOLD_VIRTUALBOX_MISSING'
}
$vmInfo = @(& $vbox showvminfo $cfg.vmUuid --machinereadable 2>$null)
if ($LASTEXITCODE -ne 0) { throw 'HOLD_PINNED_VM_UNAVAILABLE' }
$uuidLine = @($vmInfo | Where-Object { $_ -match '^UUID="' + [regex]::Escape([string]$cfg.vmUuid) + '"$' })
$efiLine = @($vmInfo | Where-Object { $_ -match '(?i)^firmware="efi"$' })
$vmState = @($vmInfo | Where-Object { $_ -match '^VMState="' })
if ($uuidLine.Count -ne 1 -or $efiLine.Count -ne 1 -or $vmState.Count -ne 1) {
    throw 'HOLD_VM_UUID_OR_EFI_NOT_VERIFIED'
}
$state = ([regex]::Match([string]$vmState[0], '^VMState="([^"]+)"$')).Groups[1].Value
if ($state -notin @('running', 'poweroff', 'saved')) {
    throw 'HOLD_VM_STATE_REQUIRES_OWNER_REVIEW'
}
if (-not (Test-Path -LiteralPath $cfg.ollamaExecutable -PathType Leaf)) {
    throw 'HOLD_PINNED_OLLAMA_BINARY_MISSING'
}
if ($CheckOnly) {
    [pscustomobject]@{
        schema='rosevear.hub.unattended-check356.v1'
        originalHostVerified=$true
        virtualBoxPinnedAndEfiVerified=$true
        virtualBoxState=$state
        ollamaBinaryPinned=$true
        requiresPasswordBackedWindowsTask=$true
        unattendedBootProven=$false
        changedAnything=$false
    } | ConvertTo-Json -Compress
    return
}
# A no-UI task invokes this once on boot and every five minutes.
$problems = [Collections.Generic.List[string]]::new()
$logPath = Join-Path $root 'logs\hub-unattended-boot356.log'
New-Item -ItemType Directory -Path (Split-Path -Parent $logPath) -Force | Out-Null
function Note([string]$Message) {
    Add-Content -LiteralPath $logPath -Value ((Get-Date -Format 'yyyy-MM-ddTHH:mm:ss') + ' ' + $Message)
}
if ($state -ne 'running') {
    try {
        & $vbox startvm $cfg.vmUuid --type headless 1>$null 2>$null
        if ($LASTEXITCODE -ne 0) { throw 'VM_LAUNCH_FAILED' }
        Note 'Existing pinned Home Assistant guest headless start requested.'
    } catch {
        $problems.Add('VM_LAUNCH_HOLD')
        Note 'HOLD: pinned Home Assistant guest could not start.'
    }
}
$ollamaHealthy = $false
try {
    $ver = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/version' -TimeoutSec 4
    $ollamaHealthy = -not [string]::IsNullOrWhiteSpace([string]$ver.version)
} catch { }
if (-not $ollamaHealthy) {
    $occupied = @(Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue)
    if ($occupied.Count -gt 0) {
        $problems.Add('OLLAMA_PORT_OWNERSHIP_HOLD')
        Note 'HOLD: Ollama port occupied but health is absent; no duplicate launched.'
    } else {
        try {
            $env:OLLAMA_HOST = '127.0.0.1:11434'
            Start-Process -FilePath $cfg.ollamaExecutable -ArgumentList 'serve' -WindowStyle Hidden
            Note 'Pinned local Ollama service start requested.'
        } catch {
            $problems.Add('OLLAMA_START_HOLD')
            Note 'HOLD: local Ollama launch failed.'
        }
    }
}
try {
    & $psExe -WindowStyle Hidden -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'hub-recovery.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'HUB_RECOVERY_HOLD' }
    Note 'Guarded Hub API / web / camera recovery checked.'
} catch {
    $problems.Add('HUB_RECOVERY_HOLD')
    Note 'HOLD: existing guarded Hub recovery was unsuccessful.'
}
try {
    # Directly invoke the existing verified private LAN gateway procedure.
    # The older handoff requires the signed-in principal and cannot dispatch
    # its LOGON task when nobody has signed in.
    & $psExe -WindowStyle Hidden -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'start-hub-lan-gateway.ps1') -MaxAttempts 3 -DelaySeconds 5
    if ($LASTEXITCODE -ne 0) { throw 'GATEWAY_HOLD' }
    Note 'Guarded private LAN gateway checked.'
} catch {
    $problems.Add('GATEWAY_HOLD')
    Note 'HOLD: existing gateway readiness or private authorization did not pass.'
}
if ($problems.Count -gt 0) {
    Note ('Boot pass completed with bounded holds: ' + ($problems -join ','))
    exit 2
}
Note 'Boot recovery pass complete. Physical reboot acceptance still requires witness.'
exit 0
