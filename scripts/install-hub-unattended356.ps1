<# Build 356 / QL-465 — ONE-TIME opt-in installation of unattended boot.
   Requires elevated owner on DESKTOP-AE894KC and the password of the SAME
   Windows user who owns the original VirtualBox VM, Hub data and Caddy keys.
   Uses Windows Task Scheduler credential vault, never embeds passwords in
   task arguments, repository files, logs, or machine environment.
   -Install creates two DISABLED tasks. -Enable is a separate one-time action.
   -Inspect is default and has no side effects. -Disable is a rollback switch.
#>
[CmdletBinding(DefaultParameterSetName='Inspect')]
param(
    [Parameter(ParameterSetName='Install')][switch]$Install,
    [Parameter(ParameterSetName='Enable')][switch]$Enable,
    [Parameter(ParameterSetName='Disable')][switch]$Disable,
    [Parameter(ParameterSetName='Inspect')][switch]$Inspect
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ([Environment]::MachineName.ToUpperInvariant() -cne 'DESKTOP-AE894KC') {
    throw 'HOLD_ORIGINAL_HOST_REQUIRED'
}
$bootName = 'Rosevear AI Hub Unattended Boot'
$recoveryName = 'Rosevear AI Hub Unattended Recovery'
$worker = Join-Path $PSScriptRoot 'boot-hub-unattended356.ps1'
$root = Split-Path -Parent $PSScriptRoot
$cfgPath = Join-Path $env:LOCALAPPDATA 'RosevearAIHub\autonomous-boot356.json'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principalName = $identity.Name
$psExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$arguments = '-WindowStyle Hidden -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $worker + '" -Run'
if (-not (Test-Path -LiteralPath $worker -PathType Leaf)) {
    throw 'HOLD_APPROVED_BOOT_WORKER_NOT_INSTALLED'
}
function Get-KnownTask([string]$Name, [string]$TriggerKind) {
    $task = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
    if (-not $task) { return $null }
    $a = @($task.Actions)
    $tr = @($task.Triggers)
    $kind = 'MSFT_Task' + $TriggerKind + 'Trigger'
    $good = (
        $task.TaskPath -eq '\' -and
        $a.Count -eq 1 -and
        [IO.Path]::GetFullPath([string]$a[0].Execute) -ieq $psExe -and
        [string]$a[0].Arguments -ceq $arguments -and
        $tr.Count -eq 1 -and
        $tr[0].CimClass.CimClassName -eq $kind -and
        [string]$task.Principal.UserId -ieq $principalName -and
        [string]$task.Principal.LogonType -eq 'Password'
    )
    if (-not $good) { throw ('HOLD_UNRECOGNIZED_TASK_' + $Name) }
    return $task
}
function Assert-Elevated {
    $p = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'HOLD_ELEVATED_OWNER_REQUIRED'
    }
}
if ($Install) {
    Assert-Elevated
    if ((Get-ScheduledTask -TaskName $bootName -ErrorAction SilentlyContinue) -or
        (Get-ScheduledTask -TaskName $recoveryName -ErrorAction SilentlyContinue)) {
        throw 'HOLD_ALREADY_INSTALLED_OR_PARTIAL_INSTALL_INSPECT_FIRST'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $root '.venv\Scripts\python.exe') -PathType Leaf) -or
        -not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'hub-recovery.ps1') -PathType Leaf) -or
        -not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'start-hub-lan-gateway.ps1') -PathType Leaf)) {
        throw 'HOLD_HUB_LAUNCH_DEPENDENCIES_NOT_INSTALLED'
    }
    $vbox = Join-Path ([Environment]::GetFolderPath('ProgramFiles')) 'Oracle\VirtualBox\VBoxManage.exe'
    if (-not (Test-Path -LiteralPath $vbox -PathType Leaf)) {
        throw 'HOLD_EXISTING_VIRTUALBOX_BINARY_NOT_FOUND'
    }
    $vmInfo = @(& $vbox showvminfo 'Home Assistant' --machinereadable 2>$null)
    if ($LASTEXITCODE -ne 0 -or
        @($vmInfo | Where-Object { $_ -match '(?i)^firmware="efi"$' }).Count -ne 1) {
        throw 'HOLD_EXISTING_HA_VM_OR_EFI_NOT_VERIFIED'
    }
    $uuidLine = @($vmInfo | Where-Object { $_ -match '^UUID="[0-9a-fA-F-]{36}"$' })
    if ($uuidLine.Count -ne 1) { throw 'HOLD_VM_UUID_NOT_VERIFIED' }
    $uuid = ([regex]::Match([string]$uuidLine[0], '^UUID="([^"]+)"$')).Groups[1].Value
    $listeners = @(Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue)
    $pids = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
    if ($pids.Count -ne 1) { throw 'HOLD_PINNED_OLLAMA_PROCESS_REQUIRED' }
    $ollamaProcess = Get-CimInstance Win32_Process -Filter ("ProcessId = " + $pids[0])
    if (-not $ollamaProcess -or
        [IO.Path]::GetFileName([string]$ollamaProcess.ExecutablePath) -ine 'ollama.exe') {
        throw 'HOLD_VERIFIED_OLLAMA_EXECUTABLE_REQUIRED'
    }
    $ollamaPath = [string]$ollamaProcess.ExecutablePath
    if (-not (Test-Path -LiteralPath $ollamaPath -PathType Leaf)) {
        throw 'HOLD_OLLAMA_BINARY_MISSING'
    }
    # A failed or cancelled earlier enrollment may have written the non-secret
    # pin before Task Scheduler tasks existed. Reuse ONLY an exact pinned match:
    # never delete, overwrite, re-pin, or print the previous configuration.
    $writeNewPin = -not (Test-Path -LiteralPath $cfgPath)
    if (-not $writeNewPin) {
        if (-not (Test-Path -LiteralPath $cfgPath -PathType Leaf)) {
            throw 'HOLD_PRIOR_PINNED_CONFIG_NOT_A_FILE'
        }
        $savedFile = Get-Item -LiteralPath $cfgPath -ErrorAction Stop
        if ($savedFile.Length -lt 2 -or $savedFile.Length -gt 8192 -or
            ($savedFile.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw 'HOLD_PRIOR_PINNED_CONFIG_UNTRUSTED'
        }
        try {
            $savedPin = Get-Content -LiteralPath $cfgPath -Raw -ErrorAction Stop |
                ConvertFrom-Json -ErrorAction Stop
            $keys = @($savedPin.PSObject.Properties.Name | Sort-Object)
            $expectedKeys = @('ollamaExecutable','schema','vmName','vmUuid')
            if (($keys -join '|') -cne ($expectedKeys -join '|')) {
                throw 'CONFIG_FIELDS_INVALID'
            }
            if ([string]$savedPin.schema -cne 'rosevear.hub.autonomous-boot356.v1' -or
                [string]$savedPin.vmName -cne 'Home Assistant' -or
                [string]$savedPin.vmUuid -notmatch '^[0-9a-fA-F-]{36}$' -or
                [string]$savedPin.vmUuid -ine $uuid -or
                -not [IO.Path]::IsPathRooted([string]$savedPin.ollamaExecutable) -or
                [IO.Path]::GetFullPath([string]$savedPin.ollamaExecutable) -ine
                    [IO.Path]::GetFullPath($ollamaPath)) {
                throw 'CONFIG_PIN_MISMATCH'
            }
        } catch {
            throw 'HOLD_PRIOR_PINNED_CONFIG_MISMATCH_NO_OVERWRITE'
        }
        Write-Output 'EXISTING_OWNER_PIN_MATCHES_VM_AND_OLLAMA; continuing without file changes.'
    }
    $credential = Get-Credential -UserName $principalName -Message 'Enter the server Windows account PASSWORD (not PIN) once for pre-login Task Scheduler startup'
    if (-not $credential -or $credential.UserName -ine $principalName) {
        throw 'HOLD_CREDENTIAL_MUST_MATCH_VM_OWNER'
    }
    $plain = $credential.GetNetworkCredential().Password
    if ([string]::IsNullOrEmpty($plain)) { throw 'HOLD_WINDOWS_PASSWORD_REQUIRED' }
    if ($writeNewPin) {
        # Create once, atomically; never replace a pin another process wrote.
        $cfgDir = Split-Path -Parent $cfgPath
        New-Item -ItemType Directory -Path $cfgDir -Force | Out-Null
        $cfg = @{
            schema='rosevear.hub.autonomous-boot356.v1'
            vmName='Home Assistant'
            vmUuid=$uuid
            ollamaExecutable=$ollamaPath
        }
        $json = $cfg | ConvertTo-Json -Compress
        $bytes = [Text.UTF8Encoding]::new($false).GetBytes($json)
        $stream = $null
        try {
            $stream = [IO.File]::Open($cfgPath, 'CreateNew', 'Write', 'None')
            $stream.Write($bytes, 0, $bytes.Length)
        } catch {
            throw 'HOLD_CONFIG_CREATE_NEW_FAILED_NO_OVERWRITE'
        } finally {
            if ($null -ne $stream) { $stream.Dispose() }
        }
    }
    $action = New-ScheduledTaskAction -Execute $psExe -Argument $arguments -WorkingDirectory $root
    $settings = New-ScheduledTaskSettingsSet -Disable -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 5) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    $boot = New-ScheduledTaskTrigger -AtStartup
    $recur = New-ScheduledTaskTrigger -Daily -At '00:00' -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Hours 23 -Minutes 55)
    try {
        Register-ScheduledTask -TaskName $bootName -Action $action -Trigger $boot -Settings $settings -User $principalName -Password $plain -ErrorAction Stop | Out-Null
        Register-ScheduledTask -TaskName $recoveryName -Action $action -Trigger $recur -Settings $settings -User $principalName -Password $plain -ErrorAction Stop | Out-Null
        Disable-ScheduledTask -TaskName $bootName | Out-Null
        Disable-ScheduledTask -TaskName $recoveryName | Out-Null
    } finally {
        $plain = $null
        $credential = $null
    }
    Write-Output 'INSTALLED_DISABLED; pinned original VM and Ollama; run -Inspect and -Enable separately; NO reboot executed.'
    exit 0
}
$bootTask = Get-KnownTask -Name $bootName -TriggerKind 'Boot'
$recoveryTask = Get-KnownTask -Name $recoveryName -TriggerKind 'Daily'
if ($Inspect -or (-not $Enable -and -not $Disable)) {
    [pscustomobject]@{
        schema='rosevear.hub.unattended-task-install356.v1'
        bootTaskState=$(if ($bootTask) { [string]$bootTask.State } else { 'NOT_INSTALLED' })
        recoveryTaskState=$(if ($recoveryTask) { [string]$recoveryTask.State } else { 'NOT_INSTALLED' })
        sameUserPasswordPrincipal=$(if ($bootTask -and $recoveryTask) { $true } else { $false })
        pinnedConfigurationPresent=(Test-Path -LiteralPath $cfgPath -PathType Leaf)
        originalHost='DESKTOP-AE894KC'
        rebootPersistenceProven=$false
        changesMade=$false
    } | ConvertTo-Json -Compress
    exit 0
}
Assert-Elevated
if (-not $bootTask -or -not $recoveryTask) { throw 'HOLD_BOTH_KNOWN_TASKS_REQUIRED' }
if ($Disable) {
    Disable-ScheduledTask -TaskName $bootName -ErrorAction Stop | Out-Null
    Disable-ScheduledTask -TaskName $recoveryName -ErrorAction Stop | Out-Null
    Write-Output 'UNATTENDED_BOOT_TASKS_DISABLED; running services unchanged.'
    exit 0
}
if ($Enable) {
    & $psExe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $worker -CheckOnly
    if ($LASTEXITCODE -ne 0) { throw 'HOLD_ORIGINAL_HOST_PINNED_CONFIG_PREFLIGHT_FAILED' }
    try {
        Enable-ScheduledTask -TaskName $bootName -ErrorAction Stop | Out-Null
        Enable-ScheduledTask -TaskName $recoveryName -ErrorAction Stop | Out-Null
    } catch {
        Disable-ScheduledTask -TaskName $bootName -ErrorAction SilentlyContinue | Out-Null
        Disable-ScheduledTask -TaskName $recoveryName -ErrorAction SilentlyContinue | Out-Null
        throw 'HOLD_ENABLE_PARTIALLY_FAILED_ROLLBACK_ATTEMPTED'
    }
    Write-Output 'ENABLED_FOR_NEXT_WINDOWS_BOOT_AND_REPEATING_RECOVERY; physical reboot NOT YET proven.'
}
