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
| 010 | Chat Reliability | COMPLETE | main via PR #10 |
| 011 | File Ingestion | COMPLETE | main via PR #12 |
| 012 | Chunking and Embeddings | COMPLETE | main via PR #13 |
| 013 | Retrieval | COMPLETE | main via PR #15 |
| 014 | Citations | COMPLETE | main via PR #17 |
| 015 | Knowledge Administration | IN PROGRESS | dev |

## Build 015 acceptance checklist

- [x] administration status endpoint
- [x] collection creation
- [x] collection description and local-only metadata
- [x] collection local-only toggle
- [x] safe collection deletion
- [x] default Inbox protection
- [x] occupied collection deletion protection
- [x] document move between collections
- [x] document deletion
- [x] chunk and embedding cleanup on document deletion
- [x] stored-original cleanup on document deletion
- [x] existing local re-index operation surfaced as administration action
- [x] index/document/collection status dashboard
- [x] destructive-action confirmation in UI
- [x] collection administration UI
- [x] document administration UI
- [x] PATCH/DELETE CORS support for local web client
- [x] backend administration tests
- [x] web administration coverage
- [x] no new hosted service or secret required
- [x] no schema migration required
- [ ] Build 015 CI green
- [ ] promoted to main
- [ ] post-merge main CI green
- [ ] dev synchronized with main

## External setup

No new application, hosted database, cloud account, or secret is required.

Build 015 uses the existing local SQLite knowledge metadata and original-file storage. Re-indexing still requires the local Ollama embedding model configured for knowledge indexing.

All destructive administration actions remain local and require explicit user interaction in the UI.
