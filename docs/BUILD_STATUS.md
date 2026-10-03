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

## Completed foundation

Builds 001–007 established the documented repository, FastAPI backend, SQLite/Alembic database, React/Tauri interface, Ollama discovery, and persistent token-streaming local chat.

## Build 007 acceptance

- [x] conversation creation and listing
- [x] model selection per conversation
- [x] chat-message schema and migration
- [x] user-message persistence
- [x] assistant-message persistence after successful completion
- [x] Ollama /api/chat streaming adapter
- [x] NDJSON streaming API
- [x] incremental token rendering
- [x] generation cancellation
- [x] conversation history UI
- [x] backend integration tests
- [x] web coverage for empty-model chat state
- [x] security/rollback/runtime documentation
- [x] Build 007 dev CI green
- [x] ready for promotion to main

## External setup

Ollama 0.35.1 is installed and reachable on the target Windows PC.

The target PC has an Intel Core i7-8700 (6 cores / 12 logical processors) and about 16 GB of usable RAM. No local model is installed yet. Live chat validation requires one model, but repository development can continue independently.

All household runtime commands are documented for PowerShell; Bash is not required.
