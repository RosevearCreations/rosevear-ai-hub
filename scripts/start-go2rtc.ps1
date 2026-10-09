param(
    [string]$Go2RTCExe = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

if (-not $Go2RTCExe) {
    $Go2RTCExe = Join-Path $RepoRoot "tools\go2rtc\go2rtc.exe"
}

if (-not (Test-Path $Go2RTCExe)) {
    throw "go2rtc.exe not found at $Go2RTCExe. Install the official go2rtc Windows binary there or pass -Go2RTCExe."
}

$RuntimeDir = Join-Path $RepoRoot "data\go2rtc"
$ConfigPath = Join-Path $RuntimeDir "go2rtc.yaml"
$TemplatePath = Join-Path $RepoRoot "config\go2rtc.yaml.example"

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

if (-not (Test-Path $ConfigPath)) {
    if (-not (Test-Path $TemplatePath)) {
        throw "go2rtc config template not found at $TemplatePath"
    }
    Copy-Item $TemplatePath $ConfigPath
    Write-Host "Created local-only go2rtc config: $ConfigPath" -ForegroundColor Cyan
}

$AlreadyListening = Test-NetConnection 127.0.0.1 -Port 1984 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($AlreadyListening) {
    Write-Host "go2rtc is already listening on 127.0.0.1:1984." -ForegroundColor Green
    exit 0
}

Write-Host "Starting go2rtc with loopback-only API/RTSP/WebRTC listeners..." -ForegroundColor Cyan
Start-Process -FilePath $Go2RTCExe -ArgumentList "-c", $ConfigPath -WorkingDirectory $RuntimeDir

$Deadline = (Get-Date).AddSeconds(20)
while ((Get-Date) -lt $Deadline) {
    if (Test-NetConnection 127.0.0.1 -Port 1984 -InformationLevel Quiet -WarningAction SilentlyContinue) {
        Write-Host "go2rtc online at http://127.0.0.1:1984" -ForegroundColor Green
        exit 0
    }
    Start-Sleep -Milliseconds 500
}

throw "go2rtc did not become reachable on 127.0.0.1:1984 within 20 seconds."
