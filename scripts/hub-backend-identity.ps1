<#
.SYNOPSIS
Pure, testable identity gate for local Hub API process ownership.
.DESCRIPTION
Permit only the Hub .venv or the user's known Python 3.11 executable with the
exact Hub uvicorn module and a verified local version response. No side effects.
#>
function Test-HubBackendIdentity {
    param(
        [Parameter(Mandatory = $true)][string]$ActualExecutable,
        [Parameter(Mandatory = $true)][string]$ExpectedVenvPython,
        [Parameter(Mandatory = $true)][string]$ExpectedUserPython,
        [Parameter(Mandatory = $true)][string]$CommandLine,
        [string]$ServiceName = "",
        [string]$Version = ""
    )
    try {
        $actual = [System.IO.Path]::GetFullPath($ActualExecutable)
        $venv = [System.IO.Path]::GetFullPath($ExpectedVenvPython)
        $userPython = [System.IO.Path]::GetFullPath($ExpectedUserPython)
    }
    catch {
        return $false
    }
    $isVenv = [string]::Equals(
        $actual, $venv, [System.StringComparison]::OrdinalIgnoreCase
    )
    $isUserPython = [string]::Equals(
        $actual, $userPython, [System.StringComparison]::OrdinalIgnoreCase
    )
    $isUvicorn = [bool]($CommandLine -match '(?i)(?:^|\s)-m\s+uvicorn(?:\s|$)')
    $isHubModule = [bool]($CommandLine -match '(?i)(?:^|\s)rosevear_ai_hub\.main:app(?:\s|$)')
    $hasHubResponse = (
        $ServiceName -ceq "Rosevear AI Hub" -and
        $Version -match '^\d+\.\d+\.\d+$'
    )
    return [bool](($isVenv -or $isUserPython) -and $isUvicorn -and
        $isHubModule -and $hasHubResponse)
}
