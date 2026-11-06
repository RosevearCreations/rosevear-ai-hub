<# Build 257: observe Windows process ancestry and in-checkout source hashes.
   This script neither authenticates a release nor connects a Comms receiver.
   No paths, PIDs, command arguments, hostnames or secrets are exported. #>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\') + '\'
$legacy = & (Join-Path $PSScriptRoot 'inspect-hub-process-249.ps1') | ConvertFrom-Json
if ($legacy.schema -ne 'rosevear-windows-release-process-249/v1') {
    throw 'Unrecognized local Build 249 process observation.'
}

function Get-ExpectedSourceHash([string]$RelativePath) {
    $path = Join-Path $repoRoot $RelativePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $null }
    try { return (Get-FileHash -LiteralPath $path -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
    catch { return $null }
}

function Test-CheckoutReference([string]$CommandLine) {
    if ([string]::IsNullOrWhiteSpace($CommandLine)) { return $false }
    # This is a lexical hint, not authenticated source lineage. Never serialize
    # the sensitive command line or treat a generic interpreter as source proof.
    return $CommandLine.IndexOf($repoRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Get-ListenerChain([int]$Port, [string]$RelativeSource) {
    $unknown = [ordered]@{
        listener = 'unverified'; executable_kind = 'unverified'; executable_sha256 = $null
        source_hint = 'unverified'; parent_hops_inspected = 0; listener_stable = $false
        checkout_source_sha256 = (Get-ExpectedSourceHash $RelativeSource)
    }
    try {
        $owners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop |
            Where-Object { $_.LocalAddress -in @('127.0.0.1', '::1') } |
            Select-Object -ExpandProperty OwningProcess -Unique)
        if ($owners.Count -ne 1) { return $unknown }
        $owner = [int]$owners[0]
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $owner" -ErrorAction Stop
        if (!$proc -or [string]::IsNullOrWhiteSpace([string]$proc.ExecutablePath)) { return $unknown }
        $executable = [string]$proc.ExecutablePath
        $item = Get-Item -LiteralPath $executable -ErrorAction Stop
        if ($item.Length -le 0 -or $item.Length -gt 268435456) { return $unknown }
        $digest = (Get-FileHash -LiteralPath $executable -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant()
        $filename = [IO.Path]::GetFileName($executable)
        $kind = if ($filename -in @('node.exe','python.exe','pythonw.exe','uvicorn.exe')) {
            'generic_interpreter'
        } else { 'other_executable' }
        $hint = 'no_checkout_reference_observed'
        if (Test-CheckoutReference ([string]$proc.CommandLine)) { $hint = 'checkout_path_in_listener_command' }
        $hops = 0
        $visited = @($owner)
        $parent = [int]$proc.ParentProcessId
        while ($parent -gt 0 -and $hops -lt 4 -and $parent -notin $visited) {
            $visited += $parent
            $ancestor = Get-CimInstance Win32_Process -Filter "ProcessId = $parent" -ErrorAction SilentlyContinue
            if (!$ancestor) { break }
            $hops++
            if ($hint -eq 'no_checkout_reference_observed' -and
                (Test-CheckoutReference ([string]$ancestor.CommandLine))) {
                $hint = 'checkout_path_in_ancestor_command'
            }
            $parent = [int]$ancestor.ParentProcessId
        }
        $after = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop |
            Where-Object { $_.LocalAddress -in @('127.0.0.1','::1') } |
            Select-Object -ExpandProperty OwningProcess -Unique)
        if ($after.Count -ne 1 -or [int]$after[0] -ne $owner) { return $unknown }
        return [ordered]@{
            listener = 'observed'; executable_kind = $kind; executable_sha256 = $digest
            source_hint = $hint; parent_hops_inspected = $hops; listener_stable = $true
            checkout_source_sha256 = $unknown.checkout_source_sha256
        }
    } catch { return $unknown }
}

$checkout = $null
try {
    $global:LASTEXITCODE = 0
    $gitSha = (& git -C $repoRoot rev-parse HEAD 2>$null | Out-String).Trim()
    if ($global:LASTEXITCODE -eq 0 -and $gitSha -match '^[a-f0-9]{40}$') { $checkout = $gitSha }
} catch { }

$report = [ordered]@{
    schema = 'rosevear-windows-process-chain-257/v1'
    source = 'on_device_read_only'
    observed_at = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    checkout_sha_candidate = $checkout
    web = (Get-ListenerChain 5173 'apps\web\vite.config.ts')
    backend = (Get-ListenerChain 8765 'server\src\rosevear_ai_hub\main.py')
    recovery_action = [string]$legacy.recovery_task.action
    recovery_task_state = [string]$legacy.recovery_task.status
    original_issuer_signature_verified = $false
    receiver_off_signature_verified = $false
    process_attested = $false
    receiver_activated = $false
    comms_connected = $false
    changed_anything = $false
    remote_requests = 0
}
$report | ConvertTo-Json -Depth 5 -Compress
