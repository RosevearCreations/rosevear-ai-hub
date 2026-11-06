<# Build 255: Windows-only, owner-supervised read-only release/connection handoff.
   This is an observation, not an original-issuer signature or installed-process
   attestation. Only the existing QL-339A loopback GET is permitted. #>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Read-LocalJson([string]$Name, [scriptblock]$Command) {
    try {
        $global:LASTEXITCODE = 0
        $raw = & $Command 2>$null
        if ($global:LASTEXITCODE -ne 0) { return $null }
        return ($raw | Out-String | ConvertFrom-Json -ErrorAction Stop)
    } catch { return $null }
}

# No raw process command line, absolute path, PID, credentials, passphrase or
# device payload is exported. The signer command only reports file presence.
$mapping = Read-LocalJson 'mapping' { & (Join-Path $PSScriptRoot 'inspect-hub-mapping-253.ps1') }
$probe = Read-LocalJson 'probe' { & node (Join-Path $PSScriptRoot 'ql339a-relay-agent.mjs') --probe-local }
$signer = Read-LocalJson 'signer' { & node (Join-Path $PSScriptRoot 'ql339b-windows-signer.mjs') --inspect }

$mappingValid = $null -ne $mapping -and
    $mapping.schema -eq 'rosevear-windows-mapping-observation-253/v1' -and
    $mapping.source -eq 'on_device_read_only' -and
    $mapping.witness_verified -eq $false -and $mapping.process_attested -eq $false
$probeValid = $null -ne $probe -and
    $probe.schema -eq 'rosevear.hub.ql339a.local-probe.v1' -and
    $probe.state -eq 'LOCAL_HUB_HEALTH_VERIFIED_TEST_ONLY' -and
    $probe.localStatus -eq 'ok' -and $probe.cloudRequests -eq 0 -and
    $probe.deviceActions -eq 0 -and $probe.relayActivated -eq $false
$signerValid = $null -ne $signer -and
    $signer.schema -eq 'rosevear.hub.ql339b.signer.v1' -and
    $signer.connected -eq $false -and $signer.relayActivated -eq $false

$checkoutSha = $null
$checkoutClean = $false
try {
    $global:LASTEXITCODE = 0
    $sha = (& git -C $root rev-parse HEAD 2>$null | Out-String).Trim()
    if ($global:LASTEXITCODE -eq 0 -and $sha -match '^[0-9a-f]{40}$') {
        $checkoutSha = $sha
        $global:LASTEXITCODE = 0
        $changes = @(& git -C $root status --porcelain 2>$null)
        $checkoutClean = ($global:LASTEXITCODE -eq 0 -and $changes.Count -eq 0)
    }
} catch { }

$report = [ordered]@{
    schema = 'rosevear.hub.build255.windows-release-handoff.v1'
    source = 'owner_supervised_windows_read_only'
    observed_at = [DateTime]::UtcNow.ToString('o')
    checkout_sha_candidate = $checkoutSha
    checkout_clean_observed = $checkoutClean
    local_hub_health = if ($probeValid) { 'LOCAL_HUB_HEALTH_VERIFIED_TEST_ONLY' } else { 'NOT_VERIFIED' }
    artifact_mapping_observation = if ($mappingValid) {
        [ordered]@{
            exists = [bool]$mapping.exists
            sha256 = if ($mapping.exists) { [string]$mapping.sha256 } else { $null }
            web = $mapping.web
            backend = $mapping.backend
            recovery_action = $mapping.recovery_action
        }
    } else { $null }
    encrypted_signer_present = ($signerValid -and $signer.encryptedSignerPresent -eq $true)
    public_candidate_present = ($signerValid -and $signer.publicCandidatePresent -eq $true)
    comms_connection = 'DISCONNECTED / HOLD'
    private_receiver_verified = $false
    original_issuer_signature_verified = $false
    independent_witness_verified = $false
    installed_release_attested = $false
    process_attested = $false
    owner_post_reboot_accepted = $false
    relay_activated = $false
    changed_anything = $false
    remote_requests = 0
}
$report | ConvertTo-Json -Depth 7 -Compress
