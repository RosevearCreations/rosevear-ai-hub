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
| 012 | Chunking and Embeddings | IN PROGRESS | dev |

## Completed foundation

Builds 001–011 establish the documented repository, FastAPI backend, SQLite/Alembic database, React/Tauri interface, local Ollama chat, provider-neutral routing, reliable generation recovery, and safe local file ingestion.

## Build 012 acceptance checklist

- [x] configurable deterministic chunking
- [x] configurable overlap
- [x] stable character offsets for future citations
- [x] local Ollama embedding adapter
- [x] configurable embedding model
- [x] configurable embedding batch size
- [x] vector-storage abstraction
- [x] portable SQLite/SQLAlchemy JSON-vector backend
- [x] document chunk persistence
- [x] embedding metadata and vector persistence
- [x] per-chunk embedding references
- [x] idempotent document re-index foundation
- [x] no-text document handling
- [x] document indexing API
- [x] chunk inspection API
- [x] local indexing UI and re-index control
- [x] chunking/indexing/Ollama/API/migration tests
- [x] rollback/security/runtime documentation
- [ ] Build 012 CI green
- [ ] promoted to main
- [ ] post-merge main CI green
- [ ] dev synchronized with main

## External setup

No new application, hosted database, or cloud service is required.

For **live embeddings**, Ollama needs the configured embedding model. The default is:

`nomic-embed-text`

On the Windows Ollama PC, the model can be installed from PowerShell with:

`ollama pull nomic-embed-text`

Repository CI uses a fake embedding provider, so development and promotion do not depend on the model download.
