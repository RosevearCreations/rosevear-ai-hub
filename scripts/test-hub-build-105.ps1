<# Build 105: pure handoff cases and fail-closed script regression.
   CI-only: does not query Windows tasks, call an HTTP endpoint or start Caddy.
#>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$handoffPath = Join-Path $PSScriptRoot 'hub-gateway-handoff.ps1'
$recoveryPath = Join-Path $PSScriptRoot 'hub-recovery.ps1'
$schemaPath = Join-Path $PSScriptRoot 'inspect-hub-schema-readiness.ps1'
foreach ($file in @($handoffPath, $recoveryPath, $schemaPath)) {
    $tokens = $null
    $errorsFound = $null
    [System.Management.Automation.Language.Parser]::ParseFile($file, [ref]$tokens, [ref]$errorsFound) | Out-Null
    if (@($errorsFound).Count -gt 0) { throw "Build 105 PowerShell parse error in $file" }
}
. $handoffPath
$base = @{
    CheckOnly = $false
    BuiltPwaReady = $true
    TaskOwned = $true
    TaskEnabled = $true
    TaskReady = $true
    PortFree = $true
}
$verdict = Get-HubGatewayRetryVerdict @base
if (-not $verdict.retry_allowed -or $verdict.reason -cne 'RETRY_ALLOWED' -or $verdict.changed_anything) {
    throw 'Build 105 ready handoff must be eligible without mutation.'
}
foreach ($case in @(
    @{ key='CheckOnly'; value=$true; expected='CHECK_ONLY' },
    @{ key='BuiltPwaReady'; value=$false; expected='PWA_NOT_READY' },
    @{ key='TaskOwned'; value=$false; expected='TASK_NOT_VERIFIED' },
    @{ key='TaskEnabled'; value=$false; expected='TASK_DISABLED' },
    @{ key='TaskReady'; value=$false; expected='TASK_BUSY' },
    @{ key='PortFree'; value=$false; expected='GATEWAY_LISTENER_PRESENT' }
)) {
    $evidence = $base.Clone()
    $evidence[$case.key] = $case.value
    $blocked = Get-HubGatewayRetryVerdict @evidence
    if ($blocked.retry_allowed -or $blocked.reason -cne $case.expected -or $blocked.changed_anything) {
        throw "Build 105 gateway retry must fail closed for $($case.expected)."
    }
}
$handoff = Get-Content -LiteralPath $handoffPath -Raw
$recovery = Get-Content -LiteralPath $recoveryPath -Raw
$inspector = Get-Content -LiteralPath $schemaPath -Raw
foreach ($required in @('Get-HubTaskIdentityVerdict','Get-HubGatewayPrincipalSid',
    'Get-NetTCPConnection -LocalPort 8443','/manifest.webmanifest',
    'Start-ScheduledTask -TaskName $taskName','LogonType','RunLevel',
    'GATEWAY_LISTENER_PRESENT','HOLD_DISPATCH_FAILED')) {
    if (-not $handoff.Contains($required)) { throw "Missing gateway handoff safety condition: $required" }
}
foreach ($forbidden in @('Register-ScheduledTask','Unregister-ScheduledTask',
    'New-NetFirewallRule','Set-NetFirewallRule','Start-Process','Stop-Process',
    'alembic upgrade','Restart-Computer')) {
    if ($handoff.Contains($forbidden) -or $inspector.Contains($forbidden)) {
        throw "Build 105 recovery helper may not perform $forbidden"
    }
}
if (-not $recovery.Contains('HOLD: live database revision does not match installed code.') -or
    -not $recovery.Contains('Invoke-HubGatewayHandoff -RepositoryRoot $Root') -or
    -not $recovery.Contains('if (-not $CheckOnly)')) {
    throw 'Build 105 recovery must log the schema HOLD and schedule only outside check-only mode.'
}
if (-not $inspector.Contains('inspect-schema --repo-root $root') -or
    -not $inspector.Contains('READY_SCHEMA_MATCH') -or
    -not $inspector.Contains('exit 2')) {
    throw 'Build 105 pre-reboot inspector must use the fail-closed read-only schema check.'
}
Write-Host 'Build 105: schema HOLD and six gateway retry safety cases PASS.'
