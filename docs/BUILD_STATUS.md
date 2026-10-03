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
| 007 | Streaming Chat | IN PROGRESS | dev |

## Completed foundation

Builds 001–006 established the documented repository, FastAPI backend, SQLite/Alembic database, React/Tauri interface, and local Ollama discovery.

## Build 007 acceptance checklist

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
- [ ] Build 007 CI green
- [ ] promoted to main
- [ ] dev synchronized with main

## External setup

Ollama 0.35.1 is installed and reachable on the target Windows PC, but no model is installed yet.

Build 007 can be fully implemented and CI-tested without a downloaded model. Live chat validation will require one suitable model. Model choice should account for the target PC's 16 GB RAM and available GPU/VRAM.
