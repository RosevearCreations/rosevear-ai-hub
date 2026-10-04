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

## Completed foundation

Builds 001–012 establish the documented repository, FastAPI backend, SQLite/Alembic database, React/Tauri interface, local Ollama chat, provider-neutral routing, reliable generation recovery, and local knowledge ingestion/indexing.

## Build 013 acceptance checklist

- [x] semantic retrieval over stored local vectors
- [x] cosine similarity ranking
- [x] compatible embedding provider/model filtering
- [x] keyword fallback
- [x] explicit keyword-only mode
- [x] explicit semantic-only mode
- [x] collection filters
- [x] source-document filters
- [x] bounded top-k results
- [x] source, collection, chunk, offset, score metadata
- [x] retrieval API
- [x] Knowledge search UI
- [x] visible semantic-fallback explanation
- [x] retrieval service tests
- [x] retrieval API tests
- [x] web retrieval-surface coverage
- [x] no schema migration required
- [x] rollback/security/runtime documentation
- [x] Build 013 CI green
- [x] promoted to main
- [x] post-merge main CI green
- [x] dev synchronized with main

## External setup

No new application, hosted database, cloud account, or secret is required.

Live semantic retrieval uses the same configured Ollama embedding model as Build 012. The default is:

`nomic-embed-text`

If it is not installed on the Windows Ollama PC, it can be installed from PowerShell with:

`ollama pull nomic-embed-text`

Keyword retrieval does not require Ollama and is available as the local fallback.
