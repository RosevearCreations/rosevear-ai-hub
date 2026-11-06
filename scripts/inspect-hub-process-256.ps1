<# Build 256: owner-supervised, read-only Windows process digest observation.
   Executable hashes alone are NOT proof of the loaded Hub release: Node/Python
   are generic interpreters. This does not activate a relay or attest a process. #>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$mapping = & (Join-Path $PSScriptRoot 'inspect-hub-mapping-253.ps1') | ConvertFrom-Json
if ($mapping.schema -ne 'rosevear-windows-mapping-observation-253/v1' -or
    $mapping.source -ne 'on_device_read_only' -or
    $mapping.witness_verified -ne $false -or $mapping.process_attested -ne $false) {
    throw 'Build 253 local mapping was not independently recognizable.'
}

function Get-SafeExecutableDigest([int]$Port) {
    $unknown = [ordered]@{ executable_sha256 = $null; executable_kind = 'unverified'; listener_stable = $false }
    try {
        $first = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop |
            Where-Object { $_.LocalAddress -in @('127.0.0.1', '::1') } |
            Select-Object -ExpandProperty OwningProcess -Unique)
        if ($first.Count -ne 1) { return $unknown }
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$first[0])" -ErrorAction Stop
        if (!$process -or [string]::IsNullOrWhiteSpace([string]$process.ExecutablePath)) { return $unknown }
        $path = [string]$process.ExecutablePath
        $info = Get-Item -LiteralPath $path -ErrorAction Stop
        if ($info.Length -le 0 -or $info.Length -gt 268435456) { return $unknown }
        $digest = (Get-FileHash -LiteralPath $path -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant()
        $second = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop |
            Where-Object { $_.LocalAddress -in @('127.0.0.1', '::1') } |
            Select-Object -ExpandProperty OwningProcess -Unique)
        if ($second.Count -ne 1 -or $second[0] -ne $first[0]) { return $unknown }
        $exe = [IO.Path]::GetFileName($path)
        $kind = if ($exe -in @('node.exe', 'python.exe', 'pythonw.exe', 'uvicorn.exe')) {
            'generic_interpreter'
        } else { 'other_executable' }
        return [ordered]@{ executable_sha256 = $digest; executable_kind = $kind; listener_stable = $true }
    } catch { return $unknown }
}

$webDigest = Get-SafeExecutableDigest 5173
$backendDigest = Get-SafeExecutableDigest 8765
$checkoutSha = $null
try {
    $global:LASTEXITCODE = 0
    $sha = (& git -C $root rev-parse HEAD 2>$null | Out-String).Trim()
    if ($global:LASTEXITCODE -eq 0 -and $sha -match '^[0-9a-f]{40}$') { $checkoutSha = $sha }
} catch { }

$report = [ordered]@{
    schema = 'rosevear-windows-process-observation-256/v1'
    source = 'on_device_read_only'
    observed_at = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    checkout_sha_candidate = $checkoutSha
    web = [ordered]@{
        listener = [string]$mapping.web.listener
        source_path = [string]$mapping.web.source_path
        post_boot = [string]$mapping.web.post_boot
        executable_sha256 = $webDigest.executable_sha256
        executable_kind = $webDigest.executable_kind
        listener_stable = [bool]$webDigest.listener_stable
    }
    backend = [ordered]@{
        listener = [string]$mapping.backend.listener
        source_path = [string]$mapping.backend.source_path
        post_boot = [string]$mapping.backend.post_boot
        executable_sha256 = $backendDigest.executable_sha256
        executable_kind = $backendDigest.executable_kind
        listener_stable = [bool]$backendDigest.listener_stable
    }
    recovery_action = [string]$mapping.recovery_action
    signed_by_original_issuer = $false
    independent_witness_verified = $false
    installed_release_attested = $false
    process_attested = $false
    comms_connected = $false
    changed_anything = $false
    remote_requests = 0
}
$report | ConvertTo-Json -Depth 5 -Compress
