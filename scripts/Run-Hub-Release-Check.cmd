@echo off
setlocal
cd /d "%~dp0.."
echo Checking verified GREEN release without updating services.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0hub-auto-update.ps1" -RepoRoot "%CD%"
echo.
echo Exit code: %ERRORLEVEL%
echo Read logs\hub-release-adoption.log for metadata-only evidence.
pause
