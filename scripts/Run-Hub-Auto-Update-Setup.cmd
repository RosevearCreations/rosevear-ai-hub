@echo off
setlocal
cd /d "%~dp0.."
echo Explicitly opt in to hourly verified GREEN release adoption.
echo The user must be signed in. The Windows Recovery task must already exist.
echo Database migrations and unverified processes will be blocked.
choice /M "Install the Rosevear AI Hub hourly update task"
if errorlevel 2 goto end
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-hub-auto-update.ps1" -Install
echo.
echo Installer exit code: %ERRORLEVEL%
:end
pause
