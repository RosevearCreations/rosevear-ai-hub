<# Explicit enrollment only, after supervised managed-runtime acceptance. #>
param(
    [switch]$Install,
    [switch]$Remove,
    [string]$TaskName = 'Rosevear AI Hub Release Adoption'
)
$ErrorActionPreference = 'Stop'
if ($Install -eq $Remove) { throw 'Choose exactly one of -Install or -Remove.' }
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Remove) {
    if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }
    exit 0
}
if ($existing) { throw 'Release Adoption task exists; no overwrite performed.' }
$root = Split-Path -Parent $PSScriptRoot
$recovery = Get-ScheduledTask -TaskName 'Rosevear AI Hub Recovery' -ErrorAction SilentlyContinue
if (-not $recovery -or $recovery.State -eq 'Disabled') { throw 'Enabled Hub Recovery task required.' }
$recoveryPath = Join-Path $root 'scripts\hub-recovery.ps1'
$pathPattern = '(?i)-File\s+(?:"' + [regex]::Escape($recoveryPath) + '"|' + [regex]::Escape($recoveryPath) + '(?:\s|$))'
if (@($recovery.Actions).Count -ne 1 -or
    [IO.Path]::GetFileName($recovery.Actions[0].Execute) -ine 'powershell.exe' -or
    $recovery.Actions[0].Arguments -notmatch $pathPattern) {
    throw 'Recovery task action does not match this checkout. Review it; no task changed.'
}
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
if ($recovery.Principal.UserId -notin @($currentIdentity.Name,$currentIdentity.User.Value,$env:USERNAME) -or
    $recovery.Principal.LogonType -ne 'Interactive' -or $recovery.Principal.RunLevel -ne 'Highest') {
    throw 'Recovery identity/logon/elevation must match the approved signed-in Windows user.'
}
$python = Join-Path $root '.venv\Scripts\python.exe'
& $python -B (Join-Path $PSScriptRoot 'hub_release_manager.py') inspect-runtime --repo-root $root
if ($LASTEXITCODE -ne 0) { throw 'Supervised managed-runtime health acceptance must pass before enrollment.' }
$key = Join-Path $root 'logs\private-recovery\backup-key.dpapi'
if (-not (Test-Path -LiteralPath $key)) { throw 'Privately provision and test the current-user DPAPI backup key before enrollment.' }
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$eventSource = 'Rosevear AI Hub Release Adoption'
if (-not [Diagnostics.EventLog]::SourceExists($eventSource)) {
    New-EventLog -LogName Application -Source $eventSource
}
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}" -Apply' -f (Join-Path $PSScriptRoot 'hub-auto-update.ps1'))
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Hours 1)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2) -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Highest
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null
Write-Host 'Hourly adoption enrolled. Same signed-in Windows identity required; schema/control changes remain held.'
