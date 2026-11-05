<# Build 251: readonly installed web artifact digest. No automatic signature or trust enrollment. #>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$asset = Join-Path $root 'apps\web\dist\index.html'
$exists = Test-Path -LiteralPath $asset -PathType Leaf
$hash = $null
if ($exists) { $hash = (Get-FileHash -LiteralPath $asset -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant() }
$report = [ordered]@{
    schema = 'rosevear-windows-artifact-251/v1'
    observed_at = [datetime]::UtcNow.ToString('o')
    asset = 'web_index_html'
    exists = [bool]$exists
    sha256 = $hash
    signer_authenticated = $false
    release_verified = $false
}
$report | ConvertTo-Json -Compress
