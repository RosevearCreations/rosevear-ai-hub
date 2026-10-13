@echo off
setlocal
cd /d "%~dp0.."
echo Rosevear AI Hub Build 061 - READ ONLY assurance report.
echo No restarts, upgrades, migrations or Windows task changes will occur.
if not exist ".venv\Scripts\python.exe" (
  echo No local Hub virtual environment found. Nothing was changed.
  pause
  exit /b 2
)
".venv\Scripts\python.exe" -B "scripts\hub_release_assurance.py" --repo-root "%CD%"
echo.
echo This metadata report is not a live rollback, backup, login or service acceptance test.
echo Exit code: %ERRORLEVEL%
pause
