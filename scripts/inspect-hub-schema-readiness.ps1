<# Build 105: pre-reboot database/schema compatibility check.
   Does not run migrations, start/stop services or modify application data.
   The release manager's read-only inspector briefly uses its controller lock.
#>
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root '.venv\Scripts\python.exe'
$inspector = Join-Path $PSScriptRoot 'hub_release_manager.py'
if (-not (Test-Path -LiteralPath $python) -or -not (Test-Path -LiteralPath $inspector)) {
    Write-Host 'HOLD: local Hub Python or release inspector missing. Do not reboot for acceptance.'
    exit 2
}
try {
    & $python -B $inspector inspect-schema --repo-root $root
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'HOLD: live database does not match the installed Hub schema. Verify encrypted backup and plan supervised migration before reboot.'
        exit 2
    }
} catch {
    Write-Host 'HOLD: database compatibility could not be established. No migration attempted.'
    exit 2
}
Write-Host 'READY_SCHEMA_MATCH: local database revision matches the installed Hub checkout.'
