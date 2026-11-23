<# Build 381 — read-only original Windows startup observation.

Runs only fixed local health probes and reads exact existing Windows tasks.
No task registration, start/stop/restart, VM creation, migration, firewall,
router, DNS, network scan, secret export, or external web request.
Run manually on the original Windows Hub, before and after a supervised reboot.
#>
[CmdletBinding()]
param([Parameter(Mandatory)]
      [ValidateSet('Before','After')][string]$Phase)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-FixedHttp381 {
    param([Parameter(Mandatory)][string]$Path)
    try {
        $response = Invoke-WebRequest -Uri $Path -UseBasicParsing -TimeoutSec 3
        if ([int]$response.StatusCode -eq 200) { return 'healthy' }
        return 'unavailable'
    } catch { return 'unavailable' }
}

function Get-Task381 {
    param([Parameter(Mandatory)][string]$Name,
          [Parameter(Mandatory)][datetime]$BootUtc)
    $state='unverified'
    $recent=$false
    try {
        $task = Get-ScheduledTask -TaskName $Name -ErrorAction Stop
        if ($task.State -eq 'Disabled') { $state='disabled' }
        elseif ($task.State -in @('Ready','Running','Queued')) { $state='enabled' }
        $info = Get-ScheduledTaskInfo -TaskName $Name -ErrorAction Stop
        if ($info.LastRunTime -and $info.LastRunTime.Year -ge 2020 -and
            $info.LastRunTime.ToUniversalTime() -ge $BootUtc -and
            [int]$info.LastTaskResult -eq 0) {
            $recent=$true
        }
    } catch [Microsoft.Management.Infrastructure.CimException] {
        $state='missing'
    } catch {
        # Reporting an unknown task is NOT the same as proving it absent.
    }
    return [pscustomobject]@{ state=$state; ranAfterBoot=$recent }
}

try {
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    if ($null -eq $os -or $null -eq $os.LastBootUpTime) {
        throw 'HOLD_BOOT_TIME_UNAVAILABLE'
    }
    $bootUtc = ([datetime]$os.LastBootUpTime).ToUniversalTime()
} catch {
    throw 'HOLD_OS_BOOT_TIME_NOT_READABLE'
}

$vm='unverified'
try {
    # Existing Build356 check-only verifies the PINNED original EFI guest.
    # It never launches a VM, installs a task or changes process state.
    $raw = @(& (Join-Path $PSScriptRoot 'boot-hub-unattended356.ps1') -CheckOnly 2>$null)
    $check = ($raw -join [Environment]::NewLine) | ConvertFrom-Json
    if ($check.virtualBoxPinnedAndEfiVerified -eq $true) {
        if ($check.virtualBoxState -ceq 'running') { $vm='healthy' }
        elseif ($check.virtualBoxState -in @('saved','poweroff')) { $vm='unavailable' }
    }
} catch {
    $vm='unverified'
}

$tailscale='unverified'
try {
    $svc=Get-CimInstance Win32_Service -Filter "Name='Tailscale'" -ErrorAction Stop
    if ($svc) {
        $tailscale = if ($svc.State -eq 'Running' -and $svc.StartMode -eq 'Auto') {
            'healthy'
        } else {
            'unavailable'
        }
    }
} catch {
    $tailscale='unverified'
}

$gateway='unverified'
try {
    $listener=@(Get-NetTCPConnection -State Listen -LocalPort 8443 -ErrorAction Stop)
    if ($listener.Count -gt 0) { $gateway='healthy' }
    else { $gateway='unavailable' }
} catch {
    # A local 8443 TCP listener is NOT proof of Caddy, TLS or a second client.
    $gateway='unverified'
}

$tasksBoot=Get-Task381 -Name 'Rosevear AI Hub Unattended Boot' -BootUtc $bootUtc
$tasksRecovery=Get-Task381 -Name 'Rosevear AI Hub Unattended Recovery' -BootUtc $bootUtc
$captured=([datetime]::UtcNow).ToString('o')
$report=[ordered]@{
    schema='rosevear.hub.boot-sequence381.report.v1'
    phase=$Phase.ToLowerInvariant()
    captured_at_utc=$captured
    os_boot_at_utc=$bootUtc.ToString('o')
    original_host_name_matched=([Environment]::MachineName.ToUpperInvariant() -ceq 'DESKTOP-AE894KC')
    source='UNSIGNED_LOCAL_WINDOWS_READ_ONLY'
    checks=[ordered]@{
        vm=$vm
        mqtt='unverified'              # MQTT belongs to the Home Assistant guest.
        tailscale=$tailscale
        ollama=(Test-FixedHttp381 -Path 'http://127.0.0.1:11434/api/version')
        api=(Test-FixedHttp381 -Path 'http://127.0.0.1:8765/health')
        web=(Test-FixedHttp381 -Path 'http://127.0.0.1:5173/')
        go2rtc=(Test-FixedHttp381 -Path 'http://127.0.0.1:1984/api')
        gateway=$gateway
        ip_reservation='unverified'    # DHCP reservation needs router evidence.
        private_https='unverified'     # Local TCP != authenticated HTTPS.
        off_device='unverified'        # Independent pre-login witness required.
    }
    tasks=[ordered]@{
        boot=$tasksBoot.state
        recovery=$tasksRecovery.state
        boot_last_run_after_os_boot=[bool]$tasksBoot.ranAfterBoot
        recovery_last_run_after_os_boot=[bool]$tasksRecovery.ranAfterBoot
        task_identity_independently_verified=$false
    }
    reboot_independently_verified=$false
    external_witness_verified=$false
    operations_performed=$false
}
# Exactly one bounded, secret-free JSON line, no persisted report or outbound send.
$report | ConvertTo-Json -Compress -Depth 6
