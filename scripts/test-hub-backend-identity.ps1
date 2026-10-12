<#
.SYNOPSIS
Read-only tests for strict Hub backend identity matching. No process is stopped.
#>
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "hub-backend-identity.ps1")
$venv = 'C:\Users\HubTest\rosevearaihub\.venv\Scripts\python.exe'
$globalPython = 'C:\Users\HubTest\AppData\Local\Programs\Python\Python311\python.exe'
$command = '"C:\Users\HubTest\AppData\Local\Programs\Python\Python311\python.exe" -m uvicorn rosevear_ai_hub.main:app --host 127.0.0.1 --port 8765'
$valid = @{
    ActualExecutable = $globalPython
    ExpectedVenvPython = $venv
    ExpectedUserPython = $globalPython
    CommandLine = $command
    ServiceName = 'Rosevear AI Hub'
    Version = '0.0.55'
}
if (-not (Test-HubBackendIdentity @valid)) { throw "The operator's exact Python 3.11 Hub startup must be recognized." }
$valid.ActualExecutable = $venv
if (-not (Test-HubBackendIdentity @valid)) { throw "The private venv Hub startup must stay supported." }
$valid.ActualExecutable = 'C:\Windows\System32\python.exe'
if (Test-HubBackendIdentity @valid) { throw "An unrelated Python executable must be rejected." }
$valid.ActualExecutable = $globalPython
$valid.CommandLine = '"python.exe" -m uvicorn another_app.main:app --host 127.0.0.1 --port 8765'
if (Test-HubBackendIdentity @valid) { throw "A different uvicorn application must be rejected." }
$valid.CommandLine = '"python.exe" -c "print(rosevear_ai_hub.main:app)"'
if (Test-HubBackendIdentity @valid) { throw "A non-uvicorn mention of the Hub module must be rejected." }
$valid.CommandLine = $command
$valid.ServiceName = 'Another service'
if (Test-HubBackendIdentity @valid) { throw "An unrelated /version response must be rejected." }
$valid.ServiceName = 'Rosevear AI Hub'
$valid.Version = ''
if (Test-HubBackendIdentity @valid) { throw "Unverified backend version must be rejected." }
Write-Host "Hub backend process identity tests passed." -ForegroundColor Green
