<# Build 259 read-only launcher chain and restart HOLD observation.
   This is not a service restart, signed process identity or Comms challenge.
   Never export PIDs, command lines, absolute paths or credentials. #>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\') + '\'
$identity = & (Join-Path $PSScriptRoot 'inspect-hub-identity-258.ps1') | ConvertFrom-Json
if ($identity.schema -ne 'rosevear-windows-installed-identity-258/v1') {
    throw 'Missing validated Build 258 read-only identity observation.'
}

function Get-ProcessKind([string]$ExecutableName) {
    switch -Regex ($ExecutableName) {
        '^powershell\.exe$|^pwsh\.exe$' { return 'powershell' }
        '^cmd\.exe$' { return 'cmd' }
        '^node\.exe$' { return 'node' }
        '^python(w)?\.exe$' { return 'python' }
        '^explorer\.exe$' { return 'explorer' }
        default { return 'other' }
    }
}

function Get-LauncherObservation([int]$Port, $IdentityProcess, [Nullable[DateTime]]$CommitUtc) {
    $result = [ordered]@{
        listener = [string]$IdentityProcess.listener
        ancestor_kinds = @()
        recovery_script_mentioned = $false
        chain_hops_inspected = 0
        chain_status = 'unavailable'
        process_predates_checkout_commit = $null
        launch_source = 'unknown'
    }
    try {
        if ($null -ne $CommitUtc -and $IdentityProcess.process_started_utc) {
            $started = [DateTime]::Parse([string]$IdentityProcess.process_started_utc).ToUniversalTime()
            $result.process_predates_checkout_commit = [bool]($started -lt [DateTime]$CommitUtc)
        }
    } catch { }
    if ($IdentityProcess.listener -ne 'observed') { return $result }
    try {
        $owners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop |
            Where-Object { $_.LocalAddress -in @('127.0.0.1', '::1') } |
            Select-Object -ExpandProperty OwningProcess -Unique)
        if ($owners.Count -ne 1) { $result.chain_status = 'listener_changed_or_ambiguous'; return $result }
        $currentPid = [int]$owners[0]
        $visited = @()
        $ancestry = @()
        while ($currentPid -gt 0 -and $result.chain_hops_inspected -lt 6 -and $currentPid -notin $visited) {
            $visited += $currentPid
            $process = Get-CimInstance Win32_Process -Filter "ProcessId = $currentPid" -ErrorAction SilentlyContinue
            if (!$process) { break }
            $ancestry += (Get-ProcessKind ([string]$process.Name))
            $result.chain_hops_inspected++
            # Lexical evidence is explicitly a weak hint, never ownership proof.
            $line = [string]$process.CommandLine
            if ($line.IndexOf('hub-recovery.ps1', [StringComparison]::OrdinalIgnoreCase) -ge 0) {
                $result.recovery_script_mentioned = $true
            }
            $currentPid = [int]$process.ParentProcessId
        }
        $result.ancestor_kinds = @($ancestry)
        $result.chain_status = if ($ancestry.Count -eq 0) { 'process_unavailable' } else { 'partial_or_complete' }
        if ($result.recovery_script_mentioned) { $result.launch_source = 'recovery_script_mention_unverified' }
        $after = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop |
            Where-Object { $_.LocalAddress -in @('127.0.0.1', '::1') } |
            Select-Object -ExpandProperty OwningProcess -Unique)
        if ($after.Count -ne 1 -or [int]$after[0] -ne [int]$owners[0]) {
            $result.chain_status = 'listener_changed_or_ambiguous'
            $result.launch_source = 'unknown'
        }
    } catch {
        $result.chain_status = 'probe_failed'
        $result.launch_source = 'unknown'
    }
    return $result
}

$commitUtc = $null
$releaseCommitUtc = $null
try {
    $global:LASTEXITCODE = 0
    $commitText = (& git -C $repoRoot show -s --format=%cI HEAD 2>$null | Out-String).Trim()
    if ($global:LASTEXITCODE -eq 0 -and $commitText) {
        $commitUtc = [DateTimeOffset]::Parse($commitText).UtcDateTime
        $releaseCommitUtc = $commitUtc.ToString('yyyy-MM-ddTHH:mm:ssZ')
    }
} catch { }

$report = [ordered]@{
    schema = 'rosevear-windows-launcher-custody-259/v1'
    source = 'on_device_read_only'
    observed_at = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
    checkout_sha_candidate = $identity.checkout_sha_candidate
    checkout_commit_utc = $releaseCommitUtc
    identity_258 = $identity
    web_launcher = (Get-LauncherObservation 5173 $identity.web $commitUtc)
    backend_launcher = (Get-LauncherObservation 8765 $identity.backend $commitUtc)
    recovery_task_state = $identity.recovery_task_state
    recovery_action = $identity.recovery_action
    startup_task_state = $identity.startup_task_state
    supervised_restart_state = 'HOLD_PENDING_ORIGINAL_LAUNCHER_CUSTODY'
    original_issuer_signature_verified = $false
    independent_challenge_signature_verified = $false
    installed_release_attested = $false
    process_attested = $false
    restart_authorized = $false
    challenge_executed = $false
    test_authorized = $false
    receiver_activated = $false
    comms_connected = $false
    changed_anything = $false
    remote_requests = 0
}
$report | ConvertTo-Json -Depth 9 -Compress
