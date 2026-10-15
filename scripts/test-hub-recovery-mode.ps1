<# Windows-safe Build 077 regression for orphan supervised bootstrap routing. #>
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'hub-recovery-mode.ps1')
$root = Join-Path ([IO.Path]::GetTempPath()) ('hub-recovery-test-' + [guid]::NewGuid().ToString('N'))
try {
    New-Item -ItemType Directory -Path $root -Force | Out-Null
    function Expect([string]$Expected) {
        $mode = Get-HubRecoveryMode -ManagedHome $root
        if ($mode -ne $Expected) { throw "Recovery classification mismatch: expected $Expected, received $mode" }
    }
    Expect 'Legacy'
    Set-Content -LiteralPath (Join-Path $root 'activation.json') -Value '{"phase":"supervised_bootstrap"}'
    Expect 'Legacy'
    Set-Content -LiteralPath (Join-Path $root 'activation.json') -Value '{"phase":"activating"}'
    Expect 'Managed'
    Set-Content -LiteralPath (Join-Path $root 'activation.json') -Value '{"phase":"unknown"}'
    Expect 'Hold'
    Set-Content -LiteralPath (Join-Path $root 'activation.json') -Value '{"phase":'
    Expect 'Hold'
    Set-Content -LiteralPath (Join-Path $root 'active.json') -Value '{"sha":"test"}'
    Expect 'Managed'
    Write-Host 'Hub reboot recovery routing checks passed.'
} finally {
    Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
}
