<# Build 062. READ ONLY: inspect fixed Hub Scheduled Tasks and the fixed
Application event ID. Output only fixed classifications, never task actions,
usernames, paths, event messages, private command lines or process data. #>
param([Parameter(Mandatory=$true)][string]$RepoRoot)
$ErrorActionPreference = 'Stop'
$unknown = [ordered]@{
  adoption_task = 'unavailable'
  recovery_task = 'unavailable'
  event_610 = 'unavailable'
}
if ([System.Environment]::OSVersion.Platform -ne 'Win32NT') {
  $unknown | ConvertTo-Json -Compress
  exit 0
}
try {
  $root = [IO.Path]::GetFullPath($RepoRoot)
  $script = Join-Path $root 'scripts\hub-auto-update.ps1'
  $recoveryScript = Join-Path $root 'scripts\hub-recovery.ps1'
  $adoption = Get-ScheduledTask -TaskName 'Rosevear AI Hub Release Adoption' -ErrorAction SilentlyContinue
  if (-not $adoption) {
    $unknown.adoption_task = 'not_installed'
  } elseif ($adoption.State -eq 'Disabled') {
    $unknown.adoption_task = 'disabled'
  } else {
    $actions = @($adoption.Actions)
    $args = if ($actions.Count -eq 1) { [string]$actions[0].Arguments } else { '' }
    $expected = '(?i)-File\s+"?' + [regex]::Escape($script) + '"?(?:\s|$)'
    $proper = ($actions.Count -eq 1) -and
      ([IO.Path]::GetFileName($actions[0].Execute) -ieq 'powershell.exe') -and
      ($args -match $expected) -and ($args -match '(?i)(?:^|\s)-Apply(?:\s|$)') -and
      ($adoption.Principal.LogonType -eq 'Interactive') -and
      ($adoption.Principal.RunLevel -eq 'Highest') -and
      ($adoption.Settings.MultipleInstances -eq 'IgnoreNew')
    $unknown.adoption_task = if ($proper) { 'configured' } else { 'mismatch' }
  }
  $recovery = Get-ScheduledTask -TaskName 'Rosevear AI Hub Recovery' -ErrorAction SilentlyContinue
  if (-not $recovery) {
    $unknown.recovery_task = 'unavailable'
  } elseif ($recovery.State -eq 'Disabled') {
    $unknown.recovery_task = 'disabled'
  } else {
    $actions = @($recovery.Actions)
    $args = if ($actions.Count -eq 1) { [string]$actions[0].Arguments } else { '' }
    $expected = '(?i)-File\s+"?' + [regex]::Escape($recoveryScript) + '"?(?:\s|$)'
    $proper = ($actions.Count -eq 1) -and
      ([IO.Path]::GetFileName($actions[0].Execute) -ieq 'powershell.exe') -and
      ($args -match $expected)
    $unknown.recovery_task = if ($proper) { 'enabled' } else { 'mismatch' }
  }
} catch {
  $unknown.adoption_task = 'unavailable'
  $unknown.recovery_task = 'unavailable'
}
try {
  $event = Get-WinEvent -FilterHashtable @{
    LogName = 'Application'
    ProviderName = 'Rosevear AI Hub Release Adoption'
    Id = 610
    StartTime = (Get-Date).AddDays(-7)
  } -MaxEvents 1 -ErrorAction SilentlyContinue
  $unknown.event_610 = if ($event) { 'present' } else { 'none' }
} catch {
  $unknown.event_610 = 'unavailable'
}
$unknown | ConvertTo-Json -Compress -Depth 2
