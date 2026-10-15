<# Safe recovery routing after power loss.
   Only a verified un-enrolled supervised bootstrap may use the guarded legacy
   recovery path. Preserve every journal; never infer successful enrollment. #>
function Get-HubRecoveryMode {
    param([Parameter(Mandatory=$true)][string]$ManagedHome)

    $active = Join-Path $ManagedHome 'active.json'
    $journal = Join-Path $ManagedHome 'activation.json'
    if (Test-Path -LiteralPath $active) { return 'Managed' }
    if (-not (Test-Path -LiteralPath $journal)) { return 'Legacy' }

    try {
        $data = Get-Content -LiteralPath $journal -Raw -ErrorAction Stop |
            ConvertFrom-Json -ErrorAction Stop
    } catch { return 'Hold' }

    switch ([string]$data.phase) {
        'supervised_bootstrap' { return 'Legacy' }
        'activating' { return 'Managed' }
        default { return 'Hold' }
    }
}
