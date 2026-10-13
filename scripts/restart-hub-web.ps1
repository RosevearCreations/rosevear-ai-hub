<# Build 060: stop only the known local Vite server; recovery script handles safe startup. #>
param(
    [ValidateSet('Inspect','Stop')][string]$Action = 'Inspect',
    [string]$RepoRoot = ''
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (-not $RepoRoot) { $RepoRoot = Split-Path -Parent $PSScriptRoot }
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
. (Join-Path $PSScriptRoot 'hub-release-policy.ps1')
$listeners = @(Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)
if ($listeners.Count -eq 0) { Write-Host 'No local Vite listener; no process to stop.'; exit 0 }
$pids = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
if ($pids.Count -ne 1) { throw 'Ambiguous web listeners; operator inspection required.' }
foreach ($listener in $listeners) {
    if ($listener.LocalAddress -notin @('127.0.0.1','::1')) { throw 'Web listener exposed outside loopback; refusing to control it.' }
}
$proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($pids[0])"
if (!$proc -or !(Test-HubWebProcessIdentity -ActualExecutable ([string]$proc.ExecutablePath) -CommandLine ([string]$proc.CommandLine) -RepoRoot $RepoRoot)) {
    throw 'Port 5173 is not a verified Hub Vite process. Keep the existing client and inspect manually.'
}
Write-Host "Verified Hub web Vite PID $($pids[0])."
if ($Action -eq 'Stop') {
    Stop-Process -Id $pids[0] -ErrorAction Stop
    $deadline = (Get-Date).AddSeconds(30)
    do {
        if (@(Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue).Count -eq 0) {
            Write-Host 'Known Hub Vite listener stopped.'
            exit 0
        }
        Start-Sleep -Seconds 1
    } while ((Get-Date) -lt $deadline)
    throw 'Web listener did not close; no duplicate startup permitted.'
}
