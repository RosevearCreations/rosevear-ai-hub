<# Build 080: Windows CI parsing and safety invariants; live acceptance remains separate. #>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
foreach ($relative in @('scripts/recover-lan-https.ps1','scripts/start-hub-lan-gateway.ps1','scripts/install-hub-lan-startup-task.ps1')) {
    $path = Join-Path $root $relative
    $tokens = $null
    $errorsFound = $null
    [System.Management.Automation.Language.Parser]::ParseFile($path,[ref]$tokens,[ref]$errorsFound) | Out-Null
    if (@($errorsFound).Count -gt 0) { throw "Invalid PowerShell in $($relative): $($errorsFound -join '; ')" }
}
$gateway = Get-Content -LiteralPath (Join-Path $root 'scripts/recover-lan-https.ps1') -Raw
$runner = Get-Content -LiteralPath (Join-Path $root 'scripts/start-hub-lan-gateway.ps1') -Raw
$installer = Get-Content -LiteralPath (Join-Path $root 'scripts/install-hub-lan-startup-task.ps1') -Raw
foreach ($required in @('Get-NetFirewallAddressFilter','Get-NetFirewallApplicationFilter','Get-NetFirewallPortFilter','Get-NetConnectionProfile','Get-CimInstance Win32_Process','127.0.0.1:8765','admin off','tls internal','TryParse','CHECK ONLY')) {
    if (-not $gateway.Contains($required)) { throw "Gateway guard missing: $required" }
}
foreach ($forbidden in @('New-NetFirewallRule','Set-NetFirewallRule','Set-NetFirewallAddressFilter','Remove-NetFirewallRule','tailscale funnel','Stop-Service','Restart-Service','Stop-Process','Register-ScheduledTask')) {
    if ($gateway.Contains($forbidden)) { throw "Forbidden gateway mutation: $forbidden" }
}
foreach ($required in @('New-ScheduledTaskTrigger -AtLogOn','LogonType Interactive','exact Hub gateway task','Register-ScheduledTask','Unregister-ScheduledTask','if ($task)')) {
    if (-not $installer.Contains($required)) { throw "Task owner guard missing: $required" }
}
foreach ($required in @('MaxAttempts','DelaySeconds','Invoke-RestMethod','recover-lan-https.ps1')) {
    if (-not $runner.Contains($required)) { throw "Bounded startup check missing: $required" }
}
foreach ($forbidden in @('New-NetFirewallRule','Remove-NetFirewallRule','Stop-Service','Restart-Service','Start-Service')) {
    if ($runner.Contains($forbidden)) { throw "Forbidden startup mutation: $forbidden" }
}
Write-Host 'Build 080 Windows syntax and security checks PASS.'
