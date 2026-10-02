$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {
    throw "Python virtual environment not found. Create .venv and install the backend first."
}

Push-Location $RepoRoot
try {
    & $Python -m alembic upgrade head

    $Backend = Start-Process -FilePath $Python -ArgumentList "-m", "uvicorn", "rosevear_ai_hub.main:app", "--host", "127.0.0.1", "--port", "8765" -WorkingDirectory $RepoRoot -PassThru
    $Web = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "web:dev" -WorkingDirectory $RepoRoot -PassThru

    Start-Sleep -Seconds 3
    & npm.cmd run desktop:dev
}
finally {
    if ($Web -and -not $Web.HasExited) {
        Stop-Process -Id $Web.Id -Force
    }
    if ($Backend -and -not $Backend.HasExited) {
        Stop-Process -Id $Backend.Id -Force
    }
    Pop-Location
}
