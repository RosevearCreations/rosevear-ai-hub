# Build Status

This file records completed and active builds. The roadmap remains authoritative for planned scope.

| Build | Name | Status | Promotion |
|---|---|---|---|
| 001 | Repository and Documentation Foundation | COMPLETE | main via PR #1 |
| 002 | FastAPI Backend Skeleton | COMPLETE | main via PR #2 |
| 003 | Local Database Foundation | COMPLETE | main via PR #3 |
| 004 | React Web UI Foundation | COMPLETE | main via PR #4 |
| 005 | Tauri Desktop Shell | COMPLETE | main via PR #5 |
| 006 | Ollama Discovery | COMPLETE | main via PR #6 |
| 007 | Streaming Chat | COMPLETE | main via PR #7 |
| 008 | Model Profiles | COMPLETE | main via PR #8 |
| 009 | Provider Abstraction | COMPLETE | main via PR #9 |
| 010 | Chat Reliability | IN PROGRESS | dev |

## Completed foundation

Builds 001–009 establish the documented repository, FastAPI backend, SQLite/Alembic database, React/Tauri interface, Ollama discovery, persistent token-streaming local chat, model profiles, and provider-neutral AI routing.

## Build 010 acceptance checklist

- [x] normalized provider timeout error
- [x] bounded generation retry policy
- [x] retry only before the first token
- [x] retry progress stream event
- [x] process-level provider offline/cooldown state
- [x] provider status remains available while inference is offline
- [x] provider degraded-state metadata
- [x] user message persisted before generation
- [x] assistant placeholder persisted before generation
- [x] successful response persistence
- [x] provider-error persistence
- [x] cancelled-response persistence
- [x] abandoned generation recovery to interrupted
- [x] partial content preserved where available
- [x] conversation history remains available while provider is offline
- [x] model-list failure no longer blocks history UI
- [x] provider refresh/recovery UI
- [x] retry/offline/recovery tests
- [x] no schema migration required
- [x] rollback and security documentation
- [ ] Build 010 CI green
- [ ] promoted to main
- [ ] post-merge main CI green
- [ ] dev synchronized with main

## External setup

Ollama 0.35.1 remains the only active provider.

Build 010 requires no new application, hosted database, cloud account, or secret. Reliability policy is configured through optional environment variables with safe defaults.

A local model is still needed only for live response acceptance, not for repository CI. All household runtime commands are documented for PowerShell; Bash is not required.
