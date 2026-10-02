# Build Status

This file records completed and active builds. The roadmap remains authoritative for planned scope.

| Build | Name | Status | Promotion |
|---|---|---|---|
| 001 | Repository and Documentation Foundation | COMPLETE | main via PR #1 |
| 002 | FastAPI Backend Skeleton | COMPLETE | main via PR #2 |
| 003 | Local Database Foundation | COMPLETE | main via PR #3 |
| 004 | React Web UI Foundation | COMPLETE | main via PR #4 |
| 005 | Tauri Desktop Shell | COMPLETE | main via PR #5 |
| 006 | Ollama Discovery | IN PROGRESS | dev |

## Completed foundation

Builds 001–005 established the documented repository, FastAPI backend, SQLite/Alembic database, React web UI, and Tauri Windows shell.

## Build 006 acceptance checklist

- [x] Ollama base URL and timeout configuration
- [x] local Ollama version discovery
- [x] installed-model enumeration
- [x] safe offline/unavailable state
- [x] model smoke-test endpoint
- [x] backend status/models/test API
- [x] UI Ollama status display
- [x] backend integration tests with mock transport
- [x] web component coverage
- [x] CORS policy for local web/Tauri development
- [x] Ollama setup documentation
- [x] Rust CI cache to reduce repeated desktop build time
- [ ] Build 006 CI green
- [ ] promoted to main
- [ ] dev synchronized with main

## External setup

Build 006 is the first point where a household runtime is useful.

To test against the real Windows machine, install Ollama from the official Windows distribution. A model download is not required merely to confirm that Ollama is online; model selection can wait until we inventory the machine's RAM, GPU, VRAM, and disk space.
