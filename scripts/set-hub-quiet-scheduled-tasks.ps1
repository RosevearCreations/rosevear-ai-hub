<# QL-455: owner-reviewed switch for known Hub scheduled tasks to hidden windows.

PREVIEW IS DEFAULT. -Apply changes ONLY a known single PowerShell task action,
keeping its original trigger, user, run level and settings. It does not enroll,
enable, start, stop, reboot, update or modify unrelated tasks.
#>
[CmdletBinding()]
param(
    [switch]$Apply,
    [ValidateSet('All', 'Recovery', 'Startup', 'Gateway', 'Adoption')]
    [string]$Target = 'All'
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$specifications = @(
    @{ Key = 'Recovery'; Name = 'Rosevear AI Hub Recovery'; Script = 'hub-recovery.ps1'; Suffix = '' },
    @{ Key = 'Startup'; Name = 'Rosevear AI Hub Startup'; Script = 'hub-recovery.ps1'; Suffix = '' },
    @{ Key = 'Gateway'; Name = 'Rosevear AI Hub LAN Gateway'; Script = 'start-hub-lan-gateway.ps1'; Suffix = '' },
    @{ Key = 'Adoption'; Name = 'Rosevear AI Hub Release Adoption'; Script = 'hub-auto-update.ps1'; Suffix = ' -Apply' }
)
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$trustedUsers = @($identity.Name, $identity.User.Value, $env:USERNAME)
$administrator = [Security.Principal.WindowsPrincipal]$identity
if ($Apply -and -not $administrator.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Elevated Windows owner review is required. No task was changed.'
}

foreach ($spec in $specifications) {
    if ($Target -ne 'All' -and $Target -ne $spec.Key) { continue }
    $task = Get-ScheduledTask -TaskName $spec.Name -ErrorAction SilentlyContinue
    if (-not $task) {
        Write-Host "$($spec.Name): NOT_INSTALLED; no change."
        continue
    }
    $script = Join-Path $PSScriptRoot $spec.Script
    if (-not (Test-Path -LiteralPath $script -PathType Leaf)) {
        throw "$($spec.Name): trusted local script missing; no change."
    }
    $oldArgs = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"{1}' -f $script, $spec.Suffix
    $quietArgs = '-WindowStyle Hidden ' + $oldArgs
    $actions = @($task.Actions)
    if (
        $task.TaskPath -ne '\' -or
        $actions.Count -ne 1 -or
        [IO.Path]::GetFileName([string]$actions[0].Execute) -ine 'powershell.exe' -or
        [string]$task.Principal.UserId -notin $trustedUsers -or
        $task.Principal.LogonType -ne 'Interactive' -or
        $task.Principal.RunLevel -ne 'Highest' -or
        [string]$actions[0].Arguments -cnotin @($oldArgs, $quietArgs)
    ) {
        throw "$($spec.Name): unrecognized action, owner or run level; nothing modified."
    }
    if ([string]$actions[0].Arguments -ceq $quietArgs) {
        Write-Host "$($spec.Name): ALREADY_QUIET; no change."
        continue
    }
    if (-not $Apply) {
        Write-Host "$($spec.Name): LEGACY_VISIBLE; run -Apply as the same elevated owner when ready."
        continue
    }
    if ($task.State -eq 'Running') {
        throw "$($spec.Name): task still running; do not change during active recovery."
    }
    # Only the action changes. Do not touch trigger/principal/settings or task enable state.
    $newAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $quietArgs
    Set-ScheduledTask -TaskName $spec.Name -TaskPath '\' -Action $newAction -ErrorAction Stop | Out-Null
    $readback = Get-ScheduledTask -TaskName $spec.Name -ErrorAction Stop
    if (
        @($readback.Actions).Count -ne 1 -or
        [string]$readback.Actions[0].Arguments -cne $quietArgs
    ) {
        throw "$($spec.Name): quiet task action readback failed; manual owner review needed."
    }
    Write-Host "$($spec.Name): QUIET_ACTION_VERIFIED; triggers, identity and policy preserved."
}
Write-Host 'This change prevents normal console focus theft where Windows honors hidden task windows.'
Write-Host 'No scheduled execution or live source release was performed by this review.'
