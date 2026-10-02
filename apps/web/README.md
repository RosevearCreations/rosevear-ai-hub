# Web App

React + TypeScript + Vite web/PWA client for Rosevear AI Hub.

## Build 004 scope

Delivered:
- responsive application shell
- primary navigation
- accessibility baseline and skip link
- backend API client
- live backend health indicator
- error boundary
- unit/component test foundation
- production build/type checks

## Development

From the repository root:

```powershell
npm install
npm run web:dev
```

The UI expects the FastAPI backend at `http://127.0.0.1:8765` by default.

Override with:

```text
VITE_API_BASE_URL=http://127.0.0.1:8765
```

No external service is required for this build.
