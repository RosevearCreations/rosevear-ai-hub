# Server

FastAPI application and core services for Rosevear AI Hub.

## Development setup

Requires Python 3.11+.

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e ".[dev]"
```

Copy `.env.example` to `.env` if custom local settings are needed.

## Run

```powershell
uvicorn rosevear_ai_hub.main:app --host 127.0.0.1 --port 8765 --reload
```

Open:
- API docs: http://127.0.0.1:8765/docs
- Health: http://127.0.0.1:8765/health
- Version: http://127.0.0.1:8765/version

## Verify

```powershell
ruff check server/src server/tests
ruff format --check server/src server/tests
pytest
```

The backend binds to localhost by default. Do not expose it directly to the public internet.
