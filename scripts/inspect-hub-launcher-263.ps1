<# Build 263: local Windows original launcher readback, with redacted evidence.
   Never prints PID, executable, command line, environment, tokens or full paths.
   Does not stop/start a process or modify the protected recovery task. #>
[CmdletBinding()]
param([ValidateSet('before','after')][string]$Stage = 'before')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\')
$closure = & (Join-Path $PSScriptRoot 'inspect-hub-closure-262.ps1') -Stage $Stage | ConvertFrom-Json
if ($closure.schema -ne 'rosevear-windows-runtime-closure-262/v1' -or
    $closure.changed_anything -ne $false -or $closure.remote_requests -ne 0) {
    throw 'Read-only Build 262 Windows custody evidence required.'
}
. (Join-Path $PSScriptRoot 'hub-release-policy.ps1')

function Get-LaunchBindingDigest([string]$Value) {
    $hasher = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
        return [BitConverter]::ToString($hasher.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
    } finally { $hasher.Dispose() }
}

function Inspect-LocalLauncher([int]$Port, [string]$Kind) {
    $result = [ordered]@{
        listener = 'unverified'
        kind = $Kind
        executable_readable = $false
        command_line_readable = $false
        template_match = $false
        checkout_reference_observed = $false
        stable_listener = $false
        process_started_utc = $null
        launch_binding_sha256 = $null
    }
    try {
        $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop)
        if ($listeners.Count -eq 0) { $result.listener = 'missing'; return $result }
        if (@($listeners | Where-Object { $_.LocalAddress -notin @('127.0.0.1','::1') }).Count -gt 0) {
            $result.listener = 'ambiguous_or_exposed'; return $result
        }
        $owners = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
        if ($owners.Count -ne 1) { $result.listener = 'ambiguous_or_exposed'; return $result }
        $ownerId = [int]$owners[0]
        $result.listener = 'observed'
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerId" -ErrorAction SilentlyContinue
        if ($null -eq $process) { $result.listener = 'unverified'; return $result }
        $exe = [string]$process.ExecutablePath
        $cmd = [string]$process.CommandLine
        $result.executable_readable = [bool]$exe
        $result.command_line_readable = [bool]$cmd
        if ($exe -and $cmd) {
            if ($Kind -eq 'node') {
                $result.template_match = [bool](Test-HubWebProcessIdentity -ActualExecutable $exe `
                    -CommandLine $cmd -RepoRoot $root -LoopbackListenerVerified)
            } else {
                $venv = Join-Path $root '.venv\Scripts\python.exe'
                $localPython = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python311\python.exe'
                $owned = [string]::Equals($exe,$venv,[StringComparison]::OrdinalIgnoreCase) -or
                    [string]::Equals($exe,$localPython,[StringComparison]::OrdinalIgnoreCase)
                $result.template_match = $owned -and $cmd -match '(?i)(?:^|\s)-m\s+uvicorn(?:\s|$)' -and
                    $cmd -match '(?i)(?:^|\s)rosevear_ai_hub\.main:app(?:\s|$)'
            }
            $result.checkout_reference_observed = $cmd.IndexOf($root,[StringComparison]::OrdinalIgnoreCase) -ge 0
            $started = ([DateTime]$process.CreationDate).ToUniversalTime()
            $result.process_started_utc = $started.ToString('yyyy-MM-ddTHH:mm:ssZ')
            if ($result.template_match) {
                # This fingerprint binds the observed local command, executable, start and owner id;
                # it is not source-code proof, issuer authentication or an authorization.
                $result.launch_binding_sha256 = Get-LaunchBindingDigest "$Kind`n$exe`n$cmd`n$($started.Ticks)`n$ownerId"
            }
        }
        $again = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
            Where-Object { $_.LocalAddress -in @('127.0.0.1','::1') } |
            Select-Object -ExpandProperty OwningProcess -Unique)
        $result.stable_listener = ($again.Count -eq 1 -and [int]$again[0] -eq $ownerId)
        if (-not $result.stable_listener) {
            $result.template_match = $false
            $result.launch_binding_sha256 = $null
        }
    } catch {
        $result.listener = 'unverified'
        $result.template_match = $false
        $result.stable_listener = $false
        $result.launch_binding_sha256 = $null
    }
    return $result
}

$report = [ordered]@{
    schema = 'rosevear-windows-original-launcher-custody-263/v1'
    source = 'on_device_read_only'
    stage = $Stage
    observed_at = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    release_sha_candidate = $closure.release_sha_candidate
    recovery_mode = $closure.recovery_mode
    expected_recovery_action_matches = $closure.expected_recovery_action_matches
    web = (Inspect-LocalLauncher 5173 'node')
    backend = (Inspect-LocalLauncher 8765 'python')
    original_launcher_custody_attested = $false
    supervised_restart_attested = $false
    independently_signed_runtime_accepted = $false
    test_authorized = $false
    challenge_executed = $false
    receiver_activated = $false
    comms_connected = $false
    changed_anything = $false
    remote_requests = 0
}
$report | ConvertTo-Json -Depth 6 -Compress
