<# Build 258: read-only Windows listener and task identity reconciliation.
   Never expose process IDs, paths, raw command lines, credentials or hostnames.
   The checkout SHA and file hashes are NOT proof of the code loaded by a process. #>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\') + '\'
$legacy = & (Join-Path $PSScriptRoot 'inspect-hub-process-249.ps1') | ConvertFrom-Json
if ($legacy.schema -ne 'rosevear-windows-release-process-249/v1') { throw 'Unexpected legacy observation schema.' }

function Get-SourceDigest([string]$Relative) {
    $candidate = Join-Path $repoRoot $Relative
    try {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return (Get-FileHash -LiteralPath $candidate -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant()
        }
    } catch { }
    return $null
}

function Test-CheckoutMention([string]$CommandLine) {
    if ([string]::IsNullOrWhiteSpace($CommandLine)) { return $false }
    return $CommandLine.IndexOf($repoRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Get-ListenerOwners([int]$Port) {
    return @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop |
        Where-Object { $_.LocalAddress -in @('127.0.0.1', '::1') } |
        Select-Object -ExpandProperty OwningProcess -Unique)
}

function Get-Identity([int]$Port, [string]$SourceRelative) {
    $report = [ordered]@{
        listener = 'probe_failed'; process_kind = 'unavailable'; executable_path_status = 'not_checked'
        executable_sha256 = $null; source_hint = 'unavailable'; parent_hops_inspected = 0
        listener_stable = $false; process_started_utc = $null
        checkout_source_sha256 = (Get-SourceDigest $SourceRelative)
    }
    try {
        $owners = @(Get-ListenerOwners $Port)
        if ($owners.Count -eq 0) { $report.listener = 'missing'; return $report }
        if ($owners.Count -ne 1) { $report.listener = 'ambiguous'; return $report }
        $identityPid = [int]$owners[0]
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $identityPid" -ErrorAction Stop
        if (!$proc) { $report.listener = 'process_unavailable'; return $report }
        $report.process_kind = switch -Regex ([string]$proc.Name) {
            '^node\.exe$' { 'node'; break }
            '^python(w)?\.exe$' { 'python'; break }
            default { 'other' }
        }
        try {
            $started = [datetime]$proc.CreationDate
            if ($started.Year -gt 2000) { $report.process_started_utc = $started.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') }
        } catch { }
        $report.source_hint = 'no_checkout_reference_observed'
        if (Test-CheckoutMention ([string]$proc.CommandLine)) { $report.source_hint = 'checkout_path_in_listener_command' }
        $seen = @($identityPid)
        $parent = [int]$proc.ParentProcessId
        while ($parent -gt 0 -and $report.parent_hops_inspected -lt 4 -and $parent -notin $seen) {
            $seen += $parent
            $ancestor = Get-CimInstance Win32_Process -Filter "ProcessId = $parent" -ErrorAction SilentlyContinue
            if (!$ancestor) { break }
            $report.parent_hops_inspected++
            if ($report.source_hint -eq 'no_checkout_reference_observed' -and
                (Test-CheckoutMention ([string]$ancestor.CommandLine))) {
                $report.source_hint = 'checkout_path_in_ancestor_command'
            }
            $parent = [int]$ancestor.ParentProcessId
        }
        $executable = [string]$proc.ExecutablePath
        if ([string]::IsNullOrWhiteSpace($executable)) {
            try { $executable = [string](Get-Process -Id $identityPid -ErrorAction Stop).Path } catch { }
        }
        if ([string]::IsNullOrWhiteSpace($executable)) {
            # Windows can withhold executable paths from non-elevated observers.
            $report.executable_path_status = 'access_restricted_or_unavailable'
        } else {
            try {
                $item = Get-Item -LiteralPath $executable -ErrorAction Stop
                if ($item.Length -gt 0 -and $item.Length -le 268435456) {
                    $report.executable_sha256 = (Get-FileHash -LiteralPath $executable -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant()
                    $report.executable_path_status = 'readable'
                } else { $report.executable_path_status = 'hash_unavailable' }
            } catch { $report.executable_path_status = 'hash_unavailable' }
        }
        $after = @(Get-ListenerOwners $Port)
        if ($after.Count -ne 1 -or [int]$after[0] -ne $identityPid) {
            $report.listener = 'changed_during_observation'
            $report.executable_sha256 = $null
            $report.listener_stable = $false
            return $report
        }
        $report.listener = 'observed'
        $report.listener_stable = $true
    } catch {
        $report.listener = 'probe_failed'
        $report.listener_stable = $false
        $report.executable_sha256 = $null
    }
    return $report
}

$checkout = $null
try {
    $global:LASTEXITCODE = 0
    $gitSha = (& git -C $repoRoot rev-parse HEAD 2>$null | Out-String).Trim()
    if ($global:LASTEXITCODE -eq 0 -and $gitSha -match '^[a-f0-9]{40}$') { $checkout = $gitSha }
} catch { }
$startupState = 'unknown'
try {
    $startup = Get-ScheduledTask -TaskName 'Rosevear AI Server Startup' -ErrorAction Stop
    $startupState = if ($startup.State -eq 'Disabled') { 'disabled' }
        elseif ($startup.State -in @('Ready', 'Running', 'Queued')) { 'enabled' }
        else { 'unknown' }
} catch { $startupState = 'missing_or_unavailable' }

[ordered]@{
    schema = 'rosevear-windows-installed-identity-258/v1'
    source = 'on_device_read_only'
    observed_at = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    checkout_sha_candidate = $checkout
    web = (Get-Identity 5173 'apps\web\vite.config.ts')
    backend = (Get-Identity 8765 'server\src\rosevear_ai_hub\main.py')
    recovery_action = [string]$legacy.recovery_task.action
    recovery_task_state = [string]$legacy.recovery_task.status
    startup_task_state = $startupState
    original_issuer_signature_verified = $false
    receiver_off_signature_verified = $false
    installed_release_attested = $false
    process_attested = $false
    receiver_activated = $false
    comms_connected = $false
    changed_anything = $false
    remote_requests = 0
} | ConvertTo-Json -Depth 5 -Compress
