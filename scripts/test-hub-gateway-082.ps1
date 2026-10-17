<# Build 082: Windows parser, read-only command guards and fail-closed identity cases. #>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$paths = @('scripts/HubTaskIdentityEvidence.ps1',
    'scripts/inspect-hub-reboot-readiness.ps1', 'scripts/inspect-hub-lan.ps1')
foreach ($relative in $paths) {
    $tokens = $null
    $errorsFound = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile(
        (Join-Path $root $relative), [ref]$tokens, [ref]$errorsFound)
    if (@($errorsFound).Count -gt 0) { throw "Build 082 parse error in $relative" }
    $assignments = $ast.FindAll({
        param($node)
        $node -is [System.Management.Automation.Language.AssignmentStatementAst]
    },$true)
    foreach ($assignment in $assignments) {
        if ($assignment.Left -is [System.Management.Automation.Language.VariableExpressionAst] -and
            $assignment.Left.VariablePath.UserPath -ieq 'HOME') {
            throw "Reserved HOME variable assignment in $relative"
        }
    }
    $commands = $ast.FindAll({
        param($node)
        $node -is [System.Management.Automation.Language.CommandAst]
    },$true)
    foreach ($command in $commands) {
        if ($command.GetCommandName() -in @(
            'New-NetFirewallRule','Set-NetFirewallRule','Remove-NetFirewallRule',
            'Register-ScheduledTask','Unregister-ScheduledTask',
            'Start-ScheduledTask','Stop-ScheduledTask','Start-Process','Stop-Process',
            'Start-Service','Stop-Service','Restart-Service','Restart-Computer',
            'Set-Content','Add-Content','Import-Certificate'
        )) { throw "Read-only inspector contains mutation in $relative" }
    }
}
. (Join-Path $root 'scripts/HubTaskIdentityEvidence.ps1')
$argsExact = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "C:\Users\Ree\rosevearaihub\scripts\start-hub-lan-gateway.ps1"'
$good = @{
    TaskExists = $true; ActionCount = 1;
    Executable = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
    Arguments = $argsExact; ExpectedArguments = $argsExact
    CurrentSid = 'S-1-5-21-100-200-300-400'
    PrincipalSid = 'S-1-5-21-100-200-300-400'
}
function Assert-Reason([hashtable]$values,[string]$expected) {
    $out = Get-HubTaskIdentityVerdict @values
    if ($out.identity_reason -cne $expected -or
        $out.task_owned -ne ($expected -eq 'VERIFIED') -or $out.changed_anything) {
        throw "Build 082 expected status $expected"
    }
}
Assert-Reason $good 'VERIFIED'
foreach ($case in @(
    @{ key='TaskExists'; value=$false; reason='TASK_ABSENT' },
    @{ key='ActionCount'; value=2; reason='ACTION_COUNT_MISMATCH' },
    @{ key='Executable'; value='cmd.exe'; reason='EXECUTABLE_MISMATCH' },
    @{ key='Arguments'; value='-File "other.ps1"'; reason='ARGUMENTS_MISMATCH' },
    @{ key='CurrentSid'; value=''; reason='PRINCIPAL_UNRESOLVED' },
    @{ key='PrincipalSid'; value=''; reason='PRINCIPAL_UNRESOLVED' },
    @{ key='PrincipalSid'; value='S-1-5-21-100-200-300-401'; reason='PRINCIPAL_MISMATCH' }
)) {
    $bad = $good.Clone()
    $bad[$case.key] = $case.value
    Assert-Reason $bad $case.reason
}
$source = Get-Content -LiteralPath (Join-Path $root 'scripts/inspect-hub-reboot-readiness.ps1') -Raw
foreach ($needle in @('Get-HubTaskIdentityVerdict','identity_reason','PRINCIPAL_UNRESOLVED',
    'Security.Principal.NTAccount','WindowsIdentity')) {
    if (-not ($source.Contains($needle) -or
        (Get-Content -LiteralPath (Join-Path $root 'scripts/HubTaskIdentityEvidence.ps1') -Raw).Contains($needle))) {
        throw "Build 082 diagnostic guard missing: $needle"
    }
}
Write-Host 'Build 082: PowerShell parsing, read-only controls, reserved HOME regression and 8 identity cases PASS.'
