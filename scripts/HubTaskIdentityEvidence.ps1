<# Build 082: pure, fail-closed and sanitized Task Scheduler identity classifier.
Does not print accounts, SID strings, command lines, paths or credentials.
#>
Set-StrictMode -Version Latest
function Get-HubTaskIdentityVerdict {
    [CmdletBinding()]
    param(
        [bool]$TaskExists,
        [int]$ActionCount,
        [AllowEmptyString()][string]$Executable,
        [AllowEmptyString()][string]$Arguments,
        [Parameter(Mandatory=$true)][string]$ExpectedArguments,
        [AllowEmptyString()][string]$CurrentSid,
        [AllowEmptyString()][string]$PrincipalSid
    )
    # Order matters: diagnose one bounded category; never relax ownership checks.
    $reason = if (-not $TaskExists) { 'TASK_ABSENT' }
        elseif ($ActionCount -ne 1) { 'ACTION_COUNT_MISMATCH' }
        elseif ([IO.Path]::GetFileName($Executable) -ine 'powershell.exe') { 'EXECUTABLE_MISMATCH' }
        elseif ($Arguments -cne $ExpectedArguments) { 'ARGUMENTS_MISMATCH' }
        elseif ([string]::IsNullOrWhiteSpace($CurrentSid) -or
                [string]::IsNullOrWhiteSpace($PrincipalSid)) { 'PRINCIPAL_UNRESOLVED' }
        elseif ($CurrentSid -ine $PrincipalSid) { 'PRINCIPAL_MISMATCH' }
        else { 'VERIFIED' }
    [pscustomobject][ordered]@{
        task_owned = ($reason -eq 'VERIFIED')
        identity_reason = $reason
        changed_anything = $false
    }
}
