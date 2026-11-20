# Build 371: explicitly owner-invoked, non-service Windows Printer PC setup.
# Does not remotely install, open serial ports, control machines, or auto-start cameras.
[CmdletBinding()]
param(
    [ValidateSet('Prepare', 'Inventory', 'Push', 'Cameras', 'RemovalGuide')]
    [string]$Action = 'Prepare',
    [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'Rosevear\PrinterPC'),
    [string]$HubReceiptUrl = '',
    [string]$TrustedCaFile = '',
    [string]$CameraIndices = '0,1',
    [switch]$InstallCameraDependency
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$originalDir = $PSScriptRoot
$collectorSource = Join-Path $originalDir 'printer-pc-collector370.py'
$cameraSource = Join-Path $originalDir 'printer-pc-camera371.py'
$collector = Join-Path $InstallRoot 'printer-pc-collector370.py'
$camera = Join-Path $InstallRoot 'printer-pc-camera371.py'
$python = Join-Path $InstallRoot '.venv\Scripts\python.exe'
$key = Join-Path $InstallRoot 'private\printer370-key.pem'
$ca = $TrustedCaFile

if ($Action -eq 'RemovalGuide') {
    Write-Host 'Stop this window or press Ctrl+C to stop any local preview.'
    Write-Host 'No Windows service, scheduled task, driver or firewall rule was installed by this script.'
    Write-Host 'Remove the installation folder only after deciding how long to retain signing keys.'
    Write-Host 'Hub receipts/audit remain on the Hub and should not be deleted by uninstall.'
    return
}
if ($Action -eq 'Prepare') {
    if (-not (Test-Path -LiteralPath $collectorSource) -or -not (Test-Path -LiteralPath $cameraSource)) {
        throw 'Use this installer from the reviewed GitHub repository scripts folder.'
    }
    New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $InstallRoot 'private') -Force | Out-Null
    Copy-Item -LiteralPath $collectorSource -Destination $collector -Force
    Copy-Item -LiteralPath $cameraSource -Destination $camera -Force
    if (-not (Test-Path -LiteralPath $python)) {
        if (Get-Command py -ErrorAction SilentlyContinue) {
            & py -3 -m venv (Join-Path $InstallRoot '.venv')
        } elseif (Get-Command python -ErrorAction SilentlyContinue) {
            & python -m venv (Join-Path $InstallRoot '.venv')
        } else {
            throw 'Install Python 3.11+ for Windows from python.org first.'
        }
        if ($LASTEXITCODE -ne 0) { throw 'Python virtual environment setup failed.' }
    }
    & $python -m pip install cryptography
    if ($LASTEXITCODE -ne 0) { throw 'cryptography install failed.' }
    if ($InstallCameraDependency) {
        & $python -m pip install opencv-python
        if ($LASTEXITCODE -ne 0) { throw 'OpenCV install failed.' }
    }
    if (-not (Test-Path -LiteralPath $key)) {
        & $python $collector --init-key $key
        if ($LASTEXITCODE -ne 0) { throw 'Local source signing key creation failed.' }
    } else {
        Write-Host 'Reusing existing private key; key rotation requires separate owner approval.'
    }
    Write-Host 'PREPARED only; no Hub connection, machine commands, camera recording or background service.'
    Write-Host 'Review folder NTFS access: only the intended Windows user and Administrators should read the private key.'
    Write-Host 'Transfer only the .pub.pem to the Hub and enroll its independently checked SHA-256 pin.'
    return
}
if (-not (Test-Path -LiteralPath $python) -or -not (Test-Path -LiteralPath $collector)) {
    throw 'Run -Action Prepare on the actual Windows printer PC first.'
}
if ($Action -eq 'Cameras') {
    if (-not (Test-Path -LiteralPath $camera)) { throw 'Camera script missing; re-run Prepare.' }
    & $python $camera --cameras $CameraIndices
    return
}
if (-not (Test-Path -LiteralPath $key)) { throw 'Private key is missing; re-run Prepare.' }
if ($Action -eq 'Inventory') {
    & $python $collector --key $key --include-usb
    return
}
if ($Action -eq 'Push') {
    if (-not $HubReceiptUrl -or -not $ca -or -not (Test-Path -LiteralPath $ca)) {
        throw 'Owner must provide an approved private HTTPS HubReceiptUrl and verified TrustedCaFile.'
    }
    & $python $collector --key $key --include-usb --push-url $HubReceiptUrl --ca-file $ca
    if ($LASTEXITCODE -ne 0) { throw 'Signed upload was not accepted.' }
}
