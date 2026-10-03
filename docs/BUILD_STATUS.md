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
| 011 | File Ingestion | IN PROGRESS | dev |

## Completed foundation

Builds 001–010 establish the documented repository, FastAPI backend, SQLite/Alembic database, React/Tauri interface, Ollama discovery, persistent token-streaming local chat, model profiles, provider-neutral routing, and bounded chat recovery.

## Build 011 acceptance checklist

- [x] PDF ingestion
- [x] UTF-8 TXT ingestion
- [x] Markdown ingestion
- [x] DOCX ingestion
- [x] safe filename normalization
- [x] MIME/extension validation
- [x] configurable upload-size limit
- [x] DOCX expanded-size guard
- [x] PDF encrypted/invalid-file rejection
- [x] SHA-256 content hashing
- [x] duplicate-content detection
- [x] content-addressed local original storage
- [x] extracted text persistence
- [x] document metadata persistence
- [x] seeded local-only Inbox collection
- [x] document list/detail API
- [x] local Knowledge ingestion UI
- [x] duplicate user feedback
- [x] ingestion/unit/API/migration/UI tests
- [x] rollback/security documentation
- [x] no external service required
- [ ] Build 011 CI green
- [ ] promoted to main
- [ ] post-merge main CI green
- [ ] dev synchronized with main

## External setup

None is required for Build 011.

Original source files are stored under the local knowledge directory, which defaults to `./data/knowledge`. The directory is gitignored.

Ollama remains separate from file ingestion. A local model is not required until later retrieval/answering builds.
