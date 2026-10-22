<# Build 106: READ-ONLY VM/EFI and private LAN port snapshot on Windows.
   This does not configure VirtualBox, authenticate to Home Assistant/MQTT,
   change devices, read secrets or attempt camera discovery.
#>
[CmdletBinding()]
param(
    [ValidateNotNullOrEmpty()][string]$VmName = 'Home Assistant',
    [ValidateNotNullOrEmpty()][string]$HomeAssistantHost = 'homeassistant.local',
    [ValidateRange(1,65535)][int]$HomeAssistantPort = 80,
    [ValidateNotNullOrEmpty()][string]$MqttHost = 'homeassistant.local',
    [ValidateRange(1,65535)][int]$MqttPort = 1883
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Import-Module (Join-Path $PSScriptRoot 'HubHaMqttEvidence.psm1') -Force

function Test-PrivateTarget([string]$Target) {
    if ($Target -match '(?i)^[a-z0-9-]+(\.[a-z0-9-]+)*\.local$') { return $true }
    $ip = $null
    if (-not [System.Net.IPAddress]::TryParse($Target, [ref]$ip)) { return $false }
    if ($ip.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { return $false }
    $bytes = $ip.GetAddressBytes()
    return ($bytes[0] -eq 10 -or
        ($bytes[0] -eq 172 -and $bytes[1] -ge 16 -and $bytes[1] -le 31) -or
        ($bytes[0] -eq 192 -and $bytes[1] -eq 168))
}

if (-not (Test-PrivateTarget $HomeAssistantHost) -or -not (Test-PrivateTarget $MqttHost)) {
    throw 'Use only a private LAN IPv4 address or a household .local hostname.'
}
if ($VmName.Length -gt 128 -or $VmName.Contains("`n") -or $VmName.Contains("`r")) {
    throw 'Specify a short, existing VirtualBox VM name.'
}

function Test-TcpPort([string]$Target, [int]$Port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $async = $client.BeginConnect($Target, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(2500)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

$virtualBox = Get-Command 'VBoxManage.exe' -ErrorAction SilentlyContinue
$virtualBoxPath = if ($virtualBox) { [string]$virtualBox.Source } else { '' }
if ([string]::IsNullOrWhiteSpace($virtualBoxPath)) {
    $candidate = Join-Path ([Environment]::GetFolderPath('ProgramFiles')) 'Oracle\VirtualBox\VBoxManage.exe'
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { $virtualBoxPath = $candidate }
}
$vmFound = $false
$vmRunning = $false
$efiEnabled = $false
if (-not [string]::IsNullOrWhiteSpace($virtualBoxPath)) {
    try {
        # VBoxManage is queried only; its detailed output is never printed.
        $vmInfo = @(& $virtualBoxPath 'showvminfo' $VmName '--machinereadable' 2>$null)
        if ($LASTEXITCODE -eq 0) {
            $vmFound = $true
            $vmRunning = [bool](@($vmInfo | Where-Object { $_ -match '^VMState="running"$' }).Count)
            $efiEnabled = [bool](@($vmInfo | Where-Object { $_ -match '(?i)^firmware="efi"$' }).Count)
        }
    } catch {
        # Missing/inaccessible VM remains unverified; do not expose local paths.
    }
}
$evidence = @{
    VirtualBoxFound = -not [string]::IsNullOrWhiteSpace($virtualBoxPath)
    VmFound = $vmFound
    VmRunning = $vmRunning
    EfiEnabled = $efiEnabled
    HomeAssistantTcpReachable = Test-TcpPort $HomeAssistantHost $HomeAssistantPort
    MqttTcpReachable = Test-TcpPort $MqttHost $MqttPort
}
$verdict = Get-HubHaMqttEvidenceVerdict -Evidence $evidence
Write-Host 'Read-only post-reboot Home Assistant VM/MQTT prerequisites:'
[pscustomobject]$evidence | Format-List
$verdict | Format-List
Write-Host 'Authenticated Hub status, device continuity and actual camera playback still require owner review.'
if ($verdict.runtime_posture -eq 'HOLD') { exit 2 }
