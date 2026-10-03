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
| 008 | Model Profiles | IN PROGRESS | dev |

## Completed foundation

Builds 001–007 established the documented repository, FastAPI backend, SQLite/Alembic database, React/Tauri interface, Ollama discovery, and persistent token-streaming local chat.

## Build 008 acceptance checklist

- [x] model_profiles persistence schema
- [x] migration seeds General profile
- [x] migration seeds Coding profile
- [x] migration seeds Home profile
- [x] migration seeds Workshop profile
- [x] migration seeds Business profile
- [x] local-only privacy policy metadata
- [x] profile listing API
- [x] conversation profile persistence
- [x] profile-specific system instruction injection
- [x] profile selector in chat UI
- [x] preferred-model hook when a profile has one
- [x] disabled profiles excluded from selection API
- [x] migration/profile/chat tests
- [x] data-model and rollback documentation
- [ ] Build 008 CI green
- [ ] promoted to main
- [ ] dev synchronized with main

## External setup

Ollama 0.35.1 is installed and reachable on the target Windows PC.

The target PC has an Intel Core i7-8700 (6 cores / 12 logical processors) and about 16 GB of usable RAM. The Task Manager screenshot confirms Intel UHD Graphics is present; another GPU entry is also visible but its model/VRAM has not yet been captured.

No additional application or service is required for Build 008. A local model is still needed only for live chat acceptance, not for repository CI.

All household runtime commands are documented for PowerShell; Bash is not required.
