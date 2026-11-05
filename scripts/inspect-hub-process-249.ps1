<# Build 249: on-device, read-only independent path/task/reboot correlation. No secrets or raw paths exported. #>
[CmdletBinding()]
param([ValidateRange(1024,65535)][int]$WebPort = 5173,
      [ValidateRange(1024,65535)][int]$BackendPort = 8765)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\') + '\'
$bootUtc = $null
try { $bootUtc = (Get-CimInstance Win32_OperatingSystem -ErrorAction Stop).LastBootUpTime.ToUniversalTime() } catch { }

function Test-UnderRoot([string]$PathValue) {
    if ([string]::IsNullOrWhiteSpace($PathValue)) { return $false }
    try { return [IO.Path]::GetFullPath($PathValue).StartsWith($repoRoot, [StringComparison]::OrdinalIgnoreCase) } catch { return $false }
}
function Get-ProcessIdentity([int]$Port) {
    $all = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalAddress -in @('127.0.0.1','::1') })
    $owners = @($all | Select-Object -ExpandProperty OwningProcess -Unique)
    if ($owners.Count -ne 1) { return @{ listener = if ($owners.Count -eq 0) { 'missing' } else { 'ambiguous' }; pid = $null; source_path = 'unverified'; post_boot = 'unverified' } }
    $ownerId = [int]$owners[0]
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerId" -ErrorAction SilentlyContinue
    if (!$proc) { return @{ listener = 'process_unavailable'; pid = $ownerId; source_path = 'unverified'; post_boot = 'unverified' } }
    $pathStatus = if (Test-UnderRoot ([string]$proc.ExecutablePath)) { 'within_checkout' } else { 'outside_checkout' }
    $processStart = $null
    try { $processStart = (Get-Process -Id $ownerId -ErrorAction Stop).StartTime.ToUniversalTime() } catch { }
    $postBoot = if (!$bootUtc -or !$processStart) { 'unverified' } elseif ($processStart -ge $bootUtc) { 'after_boot' } else { 'before_boot' }
    return @{ listener = 'observed'; pid = $ownerId; source_path = $pathStatus; post_boot = $postBoot }
}
function Get-RecoveryTaskIdentity() {
    $task = Get-ScheduledTask -TaskName 'Rosevear AI Hub Recovery' -ErrorAction SilentlyContinue
    if (!$task) { return @{ status = 'missing'; action = 'unverified'; last_run = 'unverified' } }
    $enabled = $task.State -ne 'Disabled' -and $task.Settings.Enabled -ne $false
    $actions = @($task.Actions)
    $actionStatus = 'unverified'
    if ($actions.Count -eq 1) {
        $exe = [IO.Path]::GetFileName([string]$actions[0].Execute)
        $args = [string]$actions[0].Arguments
        # Only classify script path inside checkout; do not serialize arguments, including passwords.
        $expectedScript = Join-Path $PSScriptRoot 'hub-recovery.ps1'
        if ($exe -ieq 'powershell.exe' -and $args.Contains($expectedScript)) { $actionStatus = 'expected_script_reported' }
        else { $actionStatus = 'drift_or_unknown' }
    }
    $run = 'unverified'
    try {
        $info = Get-ScheduledTaskInfo -TaskName 'Rosevear AI Hub Recovery' -ErrorAction Stop
        if ($info.LastRunTime.Year -ge 2000 -and $bootUtc) {
            $run = if ($info.LastRunTime.ToUniversalTime() -ge $bootUtc) { 'after_boot' } else { 'before_boot' }
        }
    } catch { }
    return @{ status = if ($enabled) { 'enabled' } else { 'disabled' }; action = $actionStatus; last_run = $run }
}

$report = [ordered]@{
    schema = 'rosevear-windows-release-process-249/v1'
    observed_at = [datetime]::UtcNow.ToString('o')
    source = 'local_read_only_owner_handoff'
    boot_observed = [bool]$bootUtc
    web = (Get-ProcessIdentity $WebPort)
    backend = (Get-ProcessIdentity $BackendPort)
    recovery_task = (Get-RecoveryTaskIdentity)
    release_commit_attested = $false
    post_reboot_accepted = $false
}
$report | ConvertTo-Json -Depth 4 -Compress
