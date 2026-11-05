<# Build 253: read-only, privacy-minimized Windows artifact and process observation.
   The local output is NOT an attestation, a signature, or proof of witness identity.
   Run on the actual Windows Hub, then have a separate human witness authenticate
   the source and sign the canonical Build 253 witness message out of band. #>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# These existing inspectors only read a known index.html digest, loopback listener
# ownership and recovery task metadata. No command lines, private paths, usernames,
# credentials or raw process IDs are exported from this combined handoff.
$artifact = & (Join-Path $PSScriptRoot 'inspect-hub-artifact-251.ps1') | ConvertFrom-Json
$process = & (Join-Path $PSScriptRoot 'inspect-hub-process-249.ps1') | ConvertFrom-Json
if ($artifact.schema -ne 'rosevear-windows-artifact-251/v1' -or
    $process.schema -ne 'rosevear-windows-release-process-249/v1') {
    throw 'Unexpected local inspector schema. No mapping observation issued.'
}

$report = [ordered]@{
    schema = 'rosevear-windows-mapping-observation-253/v1'
    source = 'on_device_read_only'
    observed_at = [datetime]::UtcNow.ToString('o')
    artifact_kind = 'web_index_html'
    relative_path = 'apps/web/dist/index.html'
    exists = [bool]$artifact.exists
    sha256 = if ($artifact.exists) { [string]$artifact.sha256 } else { $null }
    web = [ordered]@{
        listener = [string]$process.web.listener
        source_path = [string]$process.web.source_path
        post_boot = [string]$process.web.post_boot
    }
    backend = [ordered]@{
        listener = [string]$process.backend.listener
        source_path = [string]$process.backend.source_path
        post_boot = [string]$process.backend.post_boot
    }
    recovery_action = [string]$process.recovery_task.action
    witness_verified = $false
    process_attested = $false
    changes_made = $false
}
$report | ConvertTo-Json -Depth 4 -Compress
