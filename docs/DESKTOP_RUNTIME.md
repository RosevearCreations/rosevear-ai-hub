# Desktop Runtime Strategy

## Status

Accepted for Build 005.

## Development topology

The desktop shell is deliberately thin.

```text
Tauri desktop window
        |
        v
React/Vite UI :5173
        |
        v
FastAPI :8765
        |
        +--> SQLite
        +--> later Ollama / Home Assistant / MQTT / cameras
```

All development services bind to localhost by default.

The convenience launcher `scripts/dev-desktop.ps1`:
1. applies Alembic migrations
2. starts FastAPI on 127.0.0.1:8765
3. starts Vite on 127.0.0.1:5173
4. starts the Tauri development shell
5. stops child processes when the shell exits

## Packaged desktop strategy

Build 005 validates a Windows desktop executable in CI.

The packaged shell:
- embeds the compiled React frontend
- connects to FastAPI only through localhost
- does not open a public listener
- does not grant shell, filesystem, or process-control plugins to the webview
- uses a restrictive Content Security Policy

For now, the production backend remains a separately managed local process/service. Bundling or supervising the Python backend as a Tauri sidecar is intentionally deferred until the backend and AI runtime stabilize.

## Why not embed Python yet?

Packaging the backend now would make every backend change a desktop packaging concern and would complicate debugging. The safer sequence is:
1. stabilize API contracts
2. add local AI
3. add authentication/tool permissions
4. then decide whether to package FastAPI as a sidecar executable or install it as a local service

## Windows packaging

CI builds a Windows executable with Tauri bundling disabled. This proves the Windows desktop shell without introducing installer signing and branding work prematurely.

Before household distribution, production hardening will add:
- application icon set
- installer
- signing strategy if desired
- update strategy
- rollback strategy
