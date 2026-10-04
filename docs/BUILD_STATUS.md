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

## Build 014 acceptance checklist

- [x] source name on retrieval evidence
- [x] PDF page metadata where extraction provides page boundaries
- [x] Markdown section metadata where headings exist
- [x] stable evidence endpoint and links
- [x] citation-ready search response
- [x] evidence-only grounded-answer prompt
- [x] citation ID validation
- [x] unknown citation rejection
- [x] uncited answer rejection
- [x] insufficient-evidence response path
- [x] local-only collection protection against future cloud providers
- [x] evidence links in Knowledge UI
- [x] grounded-answer UI
- [x] citation/grounding tests
- [x] no schema migration required
- [x] rollback/security/runtime documentation
- [x] Build 014 CI green
- [x] ready for promotion to main
- [ ] post-merge main CI green
- [ ] dev synchronized with main

## External setup

No new application, hosted database, cloud account, or secret is required.

Citation search works immediately with indexed documents. Grounded answer generation additionally requires an installed local Ollama chat model.

Existing documents remain valid. Re-ingesting/re-indexing a PDF or Markdown source is required only if we want the new page/section citation metadata applied to an older ingestion.
