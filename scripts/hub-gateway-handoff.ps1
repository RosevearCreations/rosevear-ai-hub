<# Build 105: fail-closed handoff from the five-minute Hub recovery task to the
   pre-existing, owner-approved LAN gateway task after built PWA readiness.
   Dot-source only; no task/network mutation until Invoke-HubGatewayHandoff.
   No task creation, firewall/certificate edits, or process ownership guesses.
#>

function Get-HubGatewayRetryVerdict {
    [CmdletBinding()]
    param(
        [bool]$CheckOnly,
        [bool]$BuiltPwaReady,
        [bool]$TaskOwned,
        [bool]$TaskEnabled,
        [bool]$TaskReady,
        [bool]$PortFree
    )
    $reason = if ($CheckOnly) { 'CHECK_ONLY' }
        elseif (-not $BuiltPwaReady) { 'PWA_NOT_READY' }
        elseif (-not $TaskOwned) { 'TASK_NOT_VERIFIED' }
        elseif (-not $TaskEnabled) { 'TASK_DISABLED' }
        elseif (-not $TaskReady) { 'TASK_BUSY' }
        elseif (-not $PortFree) { 'GATEWAY_LISTENER_PRESENT' }
        else { 'RETRY_ALLOWED' }
    [pscustomobject]@{
        retry_allowed = ($reason -eq 'RETRY_ALLOWED')
        reason = $reason
        changed_anything = $false
    }
}

function Test-HubGatewayBuiltPwa {
    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8765/health' -TimeoutSec 4
        if ($health.status -ne 'ok') { return $false }
        foreach ($path in @('/', '/manifest.webmanifest')) {
            $response = Invoke-WebRequest -Uri ('http://127.0.0.1:8765' + $path) -UseBasicParsing -TimeoutSec 4
            if ($response.StatusCode -ne 200) { return $false }
        }
        return $true
    } catch { return $false }
}

function Get-HubGatewayPrincipalSid([object]$Task) {
    if (-not $Task) { return '' }
    try {
        $identity = [string]$Task.Principal.UserId
        if ([string]::IsNullOrWhiteSpace($identity)) { return '' }
        if ($identity -match '^S-\d+-\d+(-\d+)+$') {
            return ([Security.Principal.SecurityIdentifier]::new($identity)).Value
        }
        return ([Security.Principal.NTAccount]::new($identity)).Translate(
            [Security.Principal.SecurityIdentifier]).Value
    } catch { return '' }
}

function Invoke-HubGatewayHandoff {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$RepositoryRoot, [switch]$CheckOnly)

    # This operation is intentionally local and fail-closed. A missing or
    # unfamiliar gateway task is NEVER launched just because it has the name.
    . (Join-Path $PSScriptRoot 'HubTaskIdentityEvidence.ps1')
    $taskName = 'Rosevear AI Hub LAN Gateway'
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    $actions = if ($task) { @($task.Actions) } else { @() }
    $expected = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f (
        Join-Path $RepositoryRoot 'scripts\start-hub-lan-gateway.ps1')
    $currentSid = try { [string][Security.Principal.WindowsIdentity]::GetCurrent().User.Value } catch { '' }
    $identityVerdict = Get-HubTaskIdentityVerdict -TaskExists ([bool]$task) `
        -ActionCount $actions.Count `
        -Executable $(if ($actions.Count -eq 1) { [string]$actions[0].Execute } else { '' }) `
        -Arguments $(if ($actions.Count -eq 1) { [string]$actions[0].Arguments } else { '' }) `
        -ExpectedArguments $expected -CurrentSid $currentSid `
        -PrincipalSid (Get-HubGatewayPrincipalSid $task)
    $owned = [bool]$identityVerdict.task_owned
    if ($task) {
        $owned = $owned -and $task.Principal.LogonType -eq 'Interactive' -and
            $task.Principal.RunLevel -eq 'Highest'
    }
    $listener = @(Get-NetTCPConnection -LocalPort 8443 -State Listen -ErrorAction SilentlyContinue)
    $verdict = Get-HubGatewayRetryVerdict -CheckOnly ([bool]$CheckOnly) `
        -BuiltPwaReady (Test-HubGatewayBuiltPwa) -TaskOwned $owned `
        -TaskEnabled ([bool]($task -and $task.State -ne 'Disabled')) `
        -TaskReady ([bool]($task -and $task.State -eq 'Ready')) `
        -PortFree ($listener.Count -eq 0)
    if (-not $verdict.retry_allowed) { return $verdict.reason }

    try {
        Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
        return 'RETRY_REQUESTED'
    } catch {
        # Never forward platform exceptions: those can contain private paths.
        return 'HOLD_DISPATCH_FAILED'
    }
}
