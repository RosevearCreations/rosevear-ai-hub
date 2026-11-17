<#
QL-464 local ORIGINAL HOST preflight. READ ONLY, UNSIGNED, and safe to run
before a supervised reboot. Does not install, enable, start, stop, reboot,
configure networking, inspect private key contents, or publish customer data.
Redirect JSON only to an ACL-protected local folder if desired.
#>
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ([Environment]::MachineName.ToUpperInvariant() -cne 'DESKTOP-AE894KC') {
    throw 'HOLD_ORIGINAL_HOST_REQUIRED'
}
function Get-FixedService([string]$Name) {
    try {
        $svc = Get-Service -Name $Name -ErrorAction Stop
        $state = if ($svc.Status -eq 'Running') { 'RUNNING' } elseif ($svc.Status -eq 'Stopped') { 'STOPPED' } else { 'UNKNOWN' }
        $mode = switch ([string]$svc.StartType) {
            'Automatic' { 'AUTOMATIC' }
            'Manual' { 'MANUAL' }
            'Disabled' { 'DISABLED' }
            default { 'UNKNOWN' }
        }
        return [ordered]@{name=$Name;state=$state;startMode=$mode}
    } catch {
        return [ordered]@{name=$Name;state='NOT_INSTALLED';startMode='NOT_INSTALLED'}
    }
}
function Get-FixedTask([string]$Name) {
    try {
        $task = Get-ScheduledTask -TaskName $Name -ErrorAction Stop
        $state = switch ([string]$task.State) {
            'Ready' { 'READY' }
            'Running' { 'RUNNING' }
            'Disabled' { 'DISABLED' }
            default { 'UNKNOWN' }
        }
        $trigger = 'UNKNOWN'
        foreach ($one in @($task.Triggers)) {
            $kind = [string]$one.CimClass.CimClassName
            if ($kind -eq 'MSFT_TaskBootTrigger') { $trigger = 'BOOT'; break }
            if ($kind -eq 'MSFT_TaskLogonTrigger') { $trigger = 'LOGON'; break }
            if ($null -ne $one.Repetition -and $null -ne $one.Repetition.Interval) { $trigger = 'REPETITION' }
            else { $trigger = 'OTHER' }
        }
        return [ordered]@{name=$Name;state=$state;trigger=$trigger}
    } catch {
        return [ordered]@{name=$Name;state='NOT_INSTALLED';trigger='NOT_INSTALLED'}
    }
}
function Get-LoopbackListener([int]$Port) {
    try {
        $all = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
        if ($all.Count -eq 0) { return 'NOT_LISTENING' }
        foreach ($item in $all) {
            if ($item.LocalAddress -notin @('127.0.0.1', '::1')) { return 'BIND_REVIEW_REQUIRED' }
        }
        return 'LOOPBACK_LISTENING_NOT_HEALTH_PROOF'
    } catch { return 'UNKNOWN' }
}
$serviceNames = @('Rosevear-AIDataPlatform','Rosevear-AIHub','Rosevear-CommsHub','Mosquitto','Ollama','Caddy','Tailscale','go2rtc')
$taskNames = @('Rosevear AI Hub Startup','Rosevear AI Hub Recovery','Rosevear Three-Master Observer QL460','Rosevear AI Server Startup')
$settings = @('ROSEVEAR_QL458_MANIFEST_PATH','ROSEVEAR_QL458_OWNER_KEY_PATH','ROSEVEAR_QL458_OWNER_KEY_PIN','ROSEVEAR_QL459_CUSTODY_DB','ROSEVEAR_QL460_EVENT_DB','ROSEVEAR_QL460_BOOT_DB','ROSEVEAR_QL461_MASTER_REGISTRY_PATH','ROSEVEAR_QL461_TLS_CA','ROSEVEAR_QL461_TLS_CERT','ROSEVEAR_QL461_TLS_KEY')
$machineConfig = @{}
foreach ($setting in $settings) {
    $machineConfig[$setting] = -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($setting, 'Machine'))
}
$ports = [ordered]@{}
foreach ($port in @(8765,5173,8443,1883,11434,1984)) {
    $ports[[string]$port] = Get-LoopbackListener -Port $port
}
$vmStatus = 'HYPERV_VM_AUTOSTART_NOT_CONFIRMED'
if (Get-Command Get-VM -ErrorAction SilentlyContinue) {
    foreach ($candidate in @('Home Assistant','HomeAssistant','Home Assistant OS')) {
        try {
            $vm = Get-VM -Name $candidate -ErrorAction Stop
            $vmStatus = if ($vm.AutomaticStartAction -eq 'Start') { 'KNOWN_VM_AUTO_START_CONFIGURED_NOT_BOOT_PROOF' } else { 'KNOWN_VM_AUTOSTART_NOT_CONFIGURED' }
            break
        } catch { }
    }
}
$report = [ordered]@{
    schema='rosevear.hub.windows-startup-inventory355.v1'
    originalHost='DESKTOP-AE894KC'
    observedAtMs=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    source='UNSIGNED_LOCAL_READ_ONLY_INSPECTION'
    tasks=@($taskNames | ForEach-Object { Get-FixedTask -Name $_ })
    services=@($serviceNames | ForEach-Object { Get-FixedService -Name $_ })
    machineConfigurationPresent=$machineConfig
    localListeners=$ports
    homeAssistantVM=$vmStatus
    independentBootWitnessVerified=$false
    peerMtlSAndAckVerified=$false
    certificateRotationComplete=$false
    physicalReceiverOffVerified=$false
    changesMade=$false
}
$report | ConvertTo-Json -Depth 8 -Compress
