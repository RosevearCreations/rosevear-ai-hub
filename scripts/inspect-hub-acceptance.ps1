<# Build 079: read-only operator acceptance snapshot. No service changes. #>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$LanIPv4,
    [ValidateRange(1024,65535)][int]$Port = 8443
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$inspect = Join-Path $PSScriptRoot 'inspect-hub-lan.ps1'
if (-not (Test-Path -LiteralPath $inspect)) { throw 'Build 078 LAN inspector is required.' }

# Do not infer that a running gateway means a trusted browser or a healthy camera.
& $inspect -LanIPv4 $LanIPv4 -Port $Port
if ($LASTEXITCODE -ne 0) { throw 'Local Hub prereq failed. HOLD.' }

$rule = Get-NetFirewallRule -DisplayName 'Rosevear AI Hub LAN HTTPS' -ErrorAction SilentlyContinue
$filter = if ($rule) { $rule | Get-NetFirewallAddressFilter } else { $null }
$application = if ($rule) { $rule | Get-NetFirewallApplicationFilter } else { $null }
$localMatches = [bool]($filter -and ($filter.LocalAddress -contains $LanIPv4))
$listener = @(Get-NetTCPConnection -LocalAddress $LanIPv4 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
$gateway = Join-Path $root 'tools\caddy\caddy.exe'
$programMatches = [bool]($application -and $application.Program -ieq $gateway)
$firewallReady = [bool]($rule -and $rule.Enabled -eq 'True' -and
    $rule.Direction -eq 'Inbound' -and $rule.Action -eq 'Allow' -and
    $rule.Profile -eq 'Private' -and $localMatches -and $programMatches)
$checks = [ordered]@{
    firewall_rule_targets_current_ip = $localMatches
    firewall_rule_targets_caddy_only = $programMatches
    firewall_private_allow_enabled = $firewallReady
    https_listener_on_current_ip = ($listener.Count -gt 0)
    remote_client_tcp_test = 'MANUAL_REVIEW'
    remote_client_certificate_trust = 'MANUAL_REVIEW'
    authenticated_remote_login = 'MANUAL_REVIEW'
    camera_owner_reconciliation = 'MANUAL_REVIEW'
    isolated_backup_provenance = 'MANUAL_REVIEW'
    reboot_persistence = 'MANUAL_REVIEW'
    changed_anything = $false
}
[pscustomobject]$checks | Format-List
if (-not $firewallReady -or $listener.Count -eq 0) {
    Write-Warning 'LAN acceptance HOLD: gateway or firewall prerequisite failed.'
    exit 2
}
Write-Host 'Gateway prerequisites PASS; owner-only remote, camera and recovery acceptance still required.'
