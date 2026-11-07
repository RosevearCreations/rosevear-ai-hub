<# Build 261 read-only original Windows launcher and installed-artifact map.
   No PID, full path, command line, environment, credential or private key is exported.
   Matched templates are observations, not proof of loaded application source. #>
[CmdletBinding()]
param([ValidateSet('before','after')][string]$Stage = 'before')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\')
. (Join-Path $PSScriptRoot 'hub-release-policy.ps1')
$runtime = & (Join-Path $PSScriptRoot 'inspect-hub-runtime-260.ps1') -Stage $Stage | ConvertFrom-Json
if ($runtime.schema -ne 'rosevear-windows-supervised-runtime-260/v1' -or
    $runtime.changed_anything -ne $false -or $runtime.remote_requests -ne 0) {
    throw 'Build 260 read-only runtime observation is required.'
}

function Get-SourceDigest([string]$Relative) {
    $full = Join-Path $root $Relative
    if (!(Test-Path -LiteralPath $full -PathType Leaf)) { return $null }
    try { return (Get-FileHash -Algorithm SHA256 -LiteralPath $full -ErrorAction Stop).Hash.ToLowerInvariant() }
    catch { return $null }
}

function Get-TemplateReadback([int]$Port, [string]$Kind) {
    $result = [ordered]@{
        listener = 'unverified'
        process_kind = $Kind
        executable_path_status = 'unavailable'
        command_line_status = 'unavailable'
        template_status = 'unavailable'
        expected_launch_template = if ($Kind -eq 'node') { 'hub_vite_loopback' } else { 'hub_uvicorn_loopback' }
        listener_stable = $false
    }
    try {
        $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop)
        if ($listeners.Count -eq 0) { $result.listener = 'missing'; return $result }
        if (@($listeners | Where-Object { $_.LocalAddress -notin @('127.0.0.1','::1') }).Count -gt 0) {
            $result.listener = 'ambiguous_or_exposed'; return $result
        }
        $owners = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
        if ($owners.Count -ne 1) { $result.listener = 'ambiguous_or_exposed'; return $result }
        $result.listener = 'observed'
        $pidOwned = [int]$owners[0]
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $pidOwned" -ErrorAction SilentlyContinue
        if (!$proc) { $result.listener = 'unverified'; return $result }
        $exe = [string]$proc.ExecutablePath
        $line = [string]$proc.CommandLine
        $result.executable_path_status = if ($exe) { 'readable' } else { 'access_restricted_or_unavailable' }
        $result.command_line_status = if ($line) { 'readable' } else { 'access_restricted_or_unavailable' }
        if ($exe -and $line) {
            $matched = $false
            if ($Kind -eq 'node') {
                $matched = Test-HubWebProcessIdentity -ActualExecutable $exe -CommandLine $line -RepoRoot $root -LoopbackListenerVerified
            } else {
                $venv = Join-Path $root '.venv\Scripts\python.exe'
                $userPython = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python311\python.exe'
                $ownedExe = [string]::Equals($exe, $venv, [StringComparison]::OrdinalIgnoreCase) -or
                    [string]::Equals($exe, $userPython, [StringComparison]::OrdinalIgnoreCase)
                $matched = $ownedExe -and $line -match '(?i)(?:^|\s)-m\s+uvicorn(?:\s|$)' -and
                    $line -match '(?i)(?:^|\s)rosevear_ai_hub\.main:app(?:\s|$)'
            }
            $result.template_status = if ($matched) { 'matched_unattested' } else { 'mismatch' }
        }
        $after = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop |
            Where-Object { $_.LocalAddress -in @('127.0.0.1','::1') } |
            Select-Object -ExpandProperty OwningProcess -Unique)
        $result.listener_stable = ($after.Count -eq 1 -and [int]$after[0] -eq $pidOwned)
        if (!$result.listener_stable) { $result.template_status = 'unavailable' }
    } catch {
        $result.listener = 'unverified'
        $result.template_status = 'unavailable'
        $result.listener_stable = $false
    }
    return $result
}

$webSource = Get-SourceDigest 'apps\web\vite.config.ts'
$backendSource = Get-SourceDigest 'server\src\rosevear_ai_hub\main.py'
$report = [ordered]@{
    schema = 'rosevear-windows-installed-source-map-261/v1'
    source = 'on_device_read_only'
    observed_at = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    stage = $Stage
    release_sha_candidate = $runtime.release_sha_candidate
    runtime_260 = $runtime
    web = (Get-TemplateReadback 5173 'node')
    backend = (Get-TemplateReadback 8765 'python')
    checkout_web_source_sha256 = $webSource
    checkout_backend_source_sha256 = $backendSource
    artifact_mapping_status = 'checkout_artifacts_only'
    original_installed_source_verified = $false
    supervised_restart_receipt_verified = $false
    independent_witness_verified = $false
    test_authorized = $false
    challenge_executed = $false
    receiver_activated = $false
    comms_connected = $false
    changed_anything = $false
    remote_requests = 0
}
$report | ConvertTo-Json -Depth 16 -Compress
