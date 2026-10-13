# Local failure reporting only. No mail, cloud messaging, or device action.
param([Parameter(Mandatory=$true)][string]$RepoRoot)
$ErrorActionPreference = 'Stop'
$statusPath = Join-Path $RepoRoot 'logs\hub-release-adoption.json'
$lastAlert = Join-Path $RepoRoot 'logs\hub-deployment\last-alert.json'
if (-not (Test-Path -LiteralPath $statusPath)) { exit 1 }
$status = Get-Content -LiteralPath $statusPath -Raw | ConvertFrom-Json
if ($status.state -notin @('FAILED','HOLD','ROLLED_BACK','ROLLBACK_FAILED')) { exit 0 }
$release = ''
if ($status.PSObject.Properties['release']) { $release = [string]$status.release }
$signature = '{0}|{1}|{2}' -f $status.state,$release,$status.detail
if (Test-Path -LiteralPath $lastAlert) {
    $previous = Get-Content -LiteralPath $lastAlert -Raw | ConvertFrom-Json
    if ($previous.signature -ceq $signature) { exit 0 }
}
$message = 'Hub release adoption needs attention ({0}). Read the local release-adoption status and runtime logs. Recovery was not disabled.' -f $status.state
$eventWritten = $false
try {
    Write-EventLog -LogName Application -Source 'Rosevear AI Hub Release Adoption' -EventId 610 -EntryType Error -Message $message
    $eventWritten = $true
} catch {
    Add-Content -LiteralPath (Join-Path $RepoRoot 'logs\hub-release-adoption.log') -Value 'Local Windows event reporting failed; inspect task result and status JSON.'
}
try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    $notification = New-Object System.Windows.Forms.NotifyIcon
    try {
        $notification.Icon = [Drawing.SystemIcons]::Warning
        $notification.Visible = $true
        $notification.ShowBalloonTip(10000,'Rosevear AI Hub',$message,[Windows.Forms.ToolTipIcon]::Warning)
        Start-Sleep -Seconds 12
    } finally { $notification.Dispose() }
} catch {
    Add-Content -LiteralPath (Join-Path $RepoRoot 'logs\hub-release-adoption.log') -Value 'Desktop notification unavailable; inspect Windows Application events and local status JSON.'
}
if ($eventWritten) {
    @{signature=$signature;notified_utc=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $lastAlert -Encoding UTF8
}
