# Build 393: reuse existing read-only printer-PC installation after sign-in.
# No private key generation, dependency install, hardware commands or service restart.
[CmdletBinding()]
param(
    [ValidateSet('Inspect','SendOnce','Enroll')]
    [string]$Action = 'Inspect',
    [string]$HubReceiptUrl = '',
    [string]$TrustedCaFile = ''
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Join-Path $env:LOCALAPPDATA 'Rosevear\PrinterPC'
$python = Join-Path $root '.venv\Scripts\python.exe'
$collector = Join-Path $root 'printer-pc-collector370.py'
$key = Join-Path $root 'private\printer370-key.pem'
$configPath = Join-Path $root 'private\observation393.json'
$runner = Join-Path $root 'resume-printer-pc393.ps1'
$lockPath = Join-Path $root 'private\observation393.lock'
$taskName = 'Rosevear Printer PC Read-only Observation'
$ready = (Test-Path -LiteralPath $python -PathType Leaf) -and
         (Test-Path -LiteralPath $collector -PathType Leaf) -and
         (Test-Path -LiteralPath $key -PathType Leaf)
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$expectedArgs = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy RemoteSigned -File "' + $runner + '" -Action SendOnce'
function Test-OwnedTask393 {
    param($Existing)
    if (-not $Existing) { return $false }
    return (@($Existing.Actions).Count -eq 1 -and
        [IO.Path]::GetFileName($Existing.Actions[0].Execute) -ieq 'powershell.exe' -and
        $Existing.Actions[0].Arguments -ceq $expectedArgs -and
        $Existing.Principal.UserId -in @($identity.Name,$identity.User.Value) -and
        $Existing.Principal.LogonType -eq 'Interactive' -and
        $Existing.Principal.RunLevel -eq 'Limited')
}
if ($Action -eq 'Inspect') {
    $state = if (-not $task) { 'NOT_ENROLLED' } elseif (-not (Test-OwnedTask393 $task)) { 'IDENTITY_HOLD' } elseif ($task.State -eq 'Disabled') { 'DISABLED' } else { 'ENROLLED_AFTER_SIGN_IN' }
    [ordered]@{
        existingClientReady = [bool]$ready
        configurationPresent = [bool](Test-Path -LiteralPath $configPath -PathType Leaf)
        observationTask = $state
        preLoginRecoveryVerified = $false
        machineCommands = 0
    } | ConvertTo-Json -Compress
    return
}
if (-not $ready) { throw 'HOLD_EXISTING_CLIENT_FILES_MISSING; no reinstall or key rotation performed.' }
function Assert-PrivateCustody393 {
    param([string]$Path)
    $item = Get-Item -LiteralPath $Path -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw 'HOLD_REPARSE_POINT_NOT_ALLOWED'
    }
    $allowed = @($identity.User.Value,'S-1-5-18','S-1-5-32-544')
    foreach ($rule in (Get-Acl -LiteralPath $Path).Access) {
        $sid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
        if ($rule.AccessControlType -eq 'Allow' -and $sid -notin $allowed) {
            throw 'HOLD_REVIEW_EXISTING_PRINTER_CLIENT_ACL'
        }
    }
}
function Invoke-Observation393 {
    param([string]$Url, [string]$Ca)
    Assert-PrivateCustody393 (Split-Path -Parent $key)
    Assert-PrivateCustody393 $key
    if (Test-Path -LiteralPath $lockPath) { Assert-PrivateCustody393 $lockPath }
    $lease = $null
    try {
        $lease = [IO.File]::Open($lockPath,[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
    } catch [IO.IOException] {
        throw 'HOLD_OBSERVATION_BUSY'
    }
    try {
        & $python $collector --key $key --include-usb --push-url $Url --ca-file $Ca
        if ($LASTEXITCODE -ne 0) { throw 'HOLD_SIGNED_OBSERVATION_NOT_ACCEPTED' }
    } finally {
        $lease.Dispose()
    }
}
function Test-PrivateDestination393 {
    param([string]$Value)
    $uri = [uri]$Value
    if (-not $uri.IsAbsoluteUri -or $uri.Scheme -cne 'https' -or $uri.Port -ne 8443 -or
        $uri.AbsolutePath -cne '/api/v1/workshop-gateway-370/receipt' -or $uri.Query -or $uri.Fragment -or $uri.UserInfo) {
        throw 'HOLD_EXACT_PRIVATE_RECEIPT_DESTINATION_REQUIRED'
    }
    $ip = $null
    if (-not [Net.IPAddress]::TryParse($uri.Host,[ref]$ip) -or $ip.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) {
        throw 'HOLD_PRIVATE_IPV4_REQUIRED'
    }
    $b = $ip.GetAddressBytes()
    if (-not ($b[0] -eq 10 -or ($b[0] -eq 172 -and $b[1] -ge 16 -and $b[1] -le 31) -or ($b[0] -eq 192 -and $b[1] -eq 168))) {
        throw 'HOLD_PRIVATE_IPV4_REQUIRED'
    }
    return $uri.AbsoluteUri
}
if ($Action -eq 'Enroll') {
    if ($task -or (Test-Path -LiteralPath $configPath) -or (Test-Path -LiteralPath $runner)) {
        throw 'HOLD_EXISTING_ENROLLMENT; no overwrite or duplicate task.'
    }
    $url = Test-PrivateDestination393 $HubReceiptUrl
    if (-not [IO.Path]::IsPathRooted($TrustedCaFile) -or -not (Test-Path -LiteralPath $TrustedCaFile -PathType Leaf)) {
        throw 'HOLD_EXISTING_TRUSTED_CA_REQUIRED'
    }
    $ca = (Resolve-Path -LiteralPath $TrustedCaFile).Path
    $caHash = (Get-FileHash -LiteralPath $ca -Algorithm SHA256).Hash
    # First demonstrate actual admitted receipt with existing key before enrolling.
    try { Invoke-Observation393 $url $ca }
    catch { throw 'HOLD_FIRST_SIGNED_RECEIPT_NOT_ACCEPTED; inspect existing local custody and private TLS.' }
    [ordered]@{url=$url; ca=$ca; caHash=$caHash} | ConvertTo-Json -Compress |
        Set-Content -LiteralPath $configPath -Encoding UTF8
    Copy-Item -LiteralPath $PSCommandPath -Destination $runner
    Assert-PrivateCustody393 $configPath
    $actionSpec = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $expectedArgs
    $logon = New-ScheduledTaskTrigger -AtLogOn -User $identity.Name
    $repeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Minutes 5)
    $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 2) -StartWhenAvailable
    $principal = New-ScheduledTaskPrincipal -UserId $identity.Name -LogonType Interactive -RunLevel Limited
    Register-ScheduledTask -TaskName $taskName -Action $actionSpec -Trigger @($logon,$repeat) -Settings $settings -Principal $principal | Out-Null
    Write-Output 'ENROLLED_AFTER_SIGN_IN; existing key retained; no hardware commands.'
    return
}
if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) { throw 'HOLD_ONE_TIME_ENROLLMENT_REQUIRED' }
Assert-PrivateCustody393 $configPath
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$url = Test-PrivateDestination393 $config.url
if (-not (Test-Path -LiteralPath $config.ca -PathType Leaf) -or
    (Get-FileHash -LiteralPath $config.ca -Algorithm SHA256).Hash -cne $config.caHash) {
    throw 'HOLD_TRUSTED_CA_CHANGED'
}
Invoke-Observation393 $url $config.ca
Write-Output 'SIGNED_OBSERVATION_ACCEPTED; no physical identity or live printer progress inferred.'
