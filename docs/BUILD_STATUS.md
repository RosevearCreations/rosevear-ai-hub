# Build Status

This file records completed and active builds. The roadmap remains authoritative for planned scope.

| Build | Name | Status | Promotion |
|---|---|---|---|
| 001 | Repository and Documentation Foundation | COMPLETE | main via PR #1 |
| 002 | FastAPI Backend Skeleton | COMPLETE | main via PR #2 |
| 003 | Local Database Foundation | COMPLETE | main via PR #3 |
| 004 | React Web UI Foundation | COMPLETE | main via PR #4 |
| 005 | Tauri Desktop Shell | COMPLETE | main via PR #5 |

## Completed foundation

### Build 001
Repository structure, canonical documentation, architecture, security model, roadmap, ADR process, and CI foundation.

### Build 002
FastAPI backend skeleton, configuration, structured logging, health/version endpoints, pytest, and Ruff.

### Build 003
SQLAlchemy + SQLite database foundation, Alembic migrations, users, settings, audit events, conversation metadata, and reversible migration tests.

### Build 004
React/TypeScript/Vite UI, responsive navigation, accessibility baseline, API client, backend health display, error boundary, tests, and production web build.

## Build 005 acceptance checklist

- [x] Tauri 2 project shell
- [x] shared React frontend strategy
- [x] restrictive desktop capability
- [x] Content Security Policy
- [x] localhost FastAPI connection strategy
- [x] development launcher
- [x] Windows CI compile/build job
- [x] Windows executable artifact configuration
- [x] Build 005 CI green
- [x] ready for promotion to main
- [ ] dev synchronized with main

## External setup

No household-side setup is required to author Build 005. GitHub Actions performs the Windows/Rust validation.

The first external runtime setup is expected at Build 006, when Ollama must be installed on the Windows machine or another LAN host that will provide local AI.
