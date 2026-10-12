@echo off
setlocal
cd /d "%~dp0.."
echo Updating Rosevear AI Hub backend. This window stays open on errors.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-hub-backend.ps1" -RepoRoot "%CD%"
echo.
echo Maintenance process exited with code %ERRORLEVEL%.
echo Review the output above and logs\hub-backend-maintenance.log.
pause
