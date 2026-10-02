# Desktop App

Tauri 2 desktop shell for Rosevear AI Hub.

## Build 005 scope

Delivered:
- Windows-capable Tauri shell
- shared React web frontend
- localhost-only backend connection model
- restrictive default Tauri capability
- application CSP
- Windows CI compile/build validation
- development launcher strategy

## Development

From the repository root, first prepare the Python environment described in `server/README.md`, then install Node workspaces:

```powershell
npm install
```

The convenience launcher can start the database migration, FastAPI backend, Vite frontend, and Tauri shell:

```powershell
.\scripts\dev-desktop.ps1
```

The script expects `.venv\Scripts\python.exe` to exist.

## Build a Windows executable

```powershell
npm run desktop:build
```

Build 005 intentionally produces the application executable without an installer. Installer signing, branded icons, and household distribution belong to production hardening after the core application is functional.
