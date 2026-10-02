# Build Roadmap

This is the canonical implementation sequence. Build numbers are never reused.

## Phase 0 — Foundation

### Build 001 — Repository and Documentation Foundation
- repository structure
- README
- source-of-truth documentation
- architecture
- security model
- data model
- integration catalogue
- testing/release rules
- operations guide
- ADR structure
- .gitignore
- environment template
- CI foundation check

**Acceptance:** repository can be cloned and the product can be understood without relying on chat history.

### Build 002 — FastAPI Backend Skeleton
- project packaging
- FastAPI app
- /health
- /version
- config loader
- structured logging
- pytest
- lint/format checks

### Build 003 — Local Database Foundation
- SQLite
- migrations
- users
- settings
- audit events
- conversation metadata

### Build 004 — React Web UI Foundation
- Vite/React
- navigation
- accessibility baseline
- API client
- system health
- error boundary

### Build 005 — Tauri Desktop Shell
- desktop wrapper
- secure local configuration
- Windows packaging
- local API launch/connection strategy

## Phase 1 — Local AI MVP

### Build 006 — Ollama Discovery
- detect Ollama
- enumerate models
- connection test
- health dashboard

### Build 007 — Streaming Chat
- create conversations
- stream tokens
- cancel generation
- choose model
- persist messages

### Build 008 — Model Profiles
- General
- Coding
- Home
- Workshop
- Business
- profile-specific system instructions

### Build 009 — Provider Abstraction
- provider interface
- Ollama adapter
- optional-cloud adapter contract
- routing metadata

### Build 010 — Chat Reliability
- timeout/retry
- provider offline state
- graceful degradation
- persistence recovery

## Phase 2 — Knowledge / RAG

### Build 011 — File Ingestion
- PDF
- TXT
- Markdown
- DOCX
- metadata
- hashing
- duplicate detection

### Build 012 — Chunking and Embeddings
- configurable chunking
- local embeddings
- vector-storage abstraction

### Build 013 — Retrieval
- semantic search
- keyword fallback
- source filters
- collection filters

### Build 014 — Citations
- source name
- page/section where available
- evidence links
- grounded-answer policy

### Build 015 — Knowledge Administration
- collections
- local-only flag
- re-index
- delete
- status
- error handling

## Phase 3 — Security and Tooling

### Build 016 — Authentication
- local accounts
- password hashing
- sessions
- roles

### Build 017 — Tool Registry
- normalized schemas
- capabilities
- risk levels
- enable/disable

### Build 018 — Confirmation Workflow
- action preview
- approve/reject
- expiry
- replay prevention

### Build 019 — Audit Log
- actor
- tool
- sanitized arguments
- result
- timestamps
- filters

### Build 020 — Secret Management
- environment secrets
- encrypted token storage where practical
- redaction tests
- rotation documentation

## Phase 4 — Home Assistant / IoT

### Build 021 — Home Assistant Connection
- URL/token
- health check
- entity inventory

### Build 022 — Entity Browser
- area
- domain
- device
- state
- attributes

### Build 023 — Safe Device Controls
- lights
- switches
- scenes
- allow lists
- audit trail

### Build 024 — Natural-Language Home Tools
- resolve friendly names
- ambiguity handling
- action validation
- confirmation rules

### Build 025 — MQTT Foundation
- broker configuration
- subscribe/publish
- topic allow list
- reconnect behavior

**MVP boundary:** after Build 025 the Hub can run locally, chat with Ollama, search private documents with citations, manage users, control approved Home Assistant entities, audit actions, and use MQTT.

## Phase 5 — Automation

### Build 026 — Rule Schema
### Build 027 — Event Engine
### Build 028 — AI-Assisted Rule Authoring
### Build 029 — Automation History and Failure Handling
### Build 030 — Notification Layer

## Phase 6 — Cameras

### Build 031 — Camera Registry and ONVIF Discovery
### Build 032 — RTSP / go2rtc Integration
### Build 033 — Camera Dashboard and Health
### Build 034 — Frigate Adapter
### Build 035 — Camera Event Automations

## Phase 7 — Business Connectors

### Build 036 — Connector Framework
### Build 037 — Devil n Dove Read Connector
### Build 038 — Rosie Dazzlers Read Connector
### Build 039 — YW Read Connector
### Build 040 — Narrow Approved Business Writes

## Phase 8 — Voice and Mobile

### Build 041 — Local Speech-to-Text
### Build 042 — Local Text-to-Speech
### Build 043 — Voice Commands and Confirmations
### Build 044 — Installable PWA
### Build 045 — Private Remote Access via Tailscale

## Phase 9 — Hardening

### Build 046 — Backup and Restore
### Build 047 — Performance and Resource-Budget Review
### Build 048 — Threat Model and Security Review
### Build 049 — Disaster Recovery Drill
### Build 050 — Production Readiness and Roadmap Renewal

## Build execution rules

Each build must:
1. begin from a known branch/SHA
2. state scope and non-scope
3. add/update tests
4. update docs
5. record security impact
6. verify migrations where applicable
7. record rollback path
8. pass CI before promotion
