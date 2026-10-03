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
| 009 | Provider Abstraction | IN PROGRESS | dev |

## Completed foundation

Builds 001–008 established the documented repository, FastAPI backend, SQLite/Alembic database, React/Tauri interface, Ollama discovery, persistent token-streaming local chat, and built-in model profiles.

## Build 009 acceptance checklist

- [x] provider-neutral AI interface
- [x] normalized provider descriptor and health metadata
- [x] normalized provider error classes
- [x] Ollama implementation behind the provider interface
- [x] optional-cloud adapter contract without enabling a cloud provider
- [x] provider registry
- [x] provider status API
- [x] provider routing persisted on conversations
- [x] provider metadata persisted on assistant messages
- [x] chat generation routed through provider registry
- [x] profile preferred-provider routing
- [x] unknown/disabled provider rejection
- [x] provider selector and provider state in chat UI
- [x] migration for provider routing metadata
- [x] provider, chat, migration, and UI tests
- [x] no cloud credentials or hosted AI service required
- [ ] Build 009 CI green
- [ ] promoted to main
- [ ] dev synchronized with main

## External setup

Ollama 0.35.1 is installed and reachable on the target Windows PC.

The target PC has an Intel Core i7-8700 (6 cores / 12 logical processors) and about 16 GB of usable RAM. The Task Manager screenshot confirms Intel UHD Graphics is present; another GPU entry is also visible but its model/VRAM has not yet been captured.

Build 009 requires no new application, hosted database, cloud AI account, or secret. Ollama remains the only registered provider and remains local-only.

A local model is still needed only for live response acceptance, not for repository CI. All household runtime commands are documented for PowerShell; Bash is not required.
