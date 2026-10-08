# Rosevear AI Hub

**Status:** Active development  
**Established:** 2026-10-02  
**Repository:** RosevearCreations/rosevear-ai-hub

Rosevear AI Hub is a private, local-first AI control and knowledge layer for our home, workshop, cameras, documents, automations, and business systems.

It is intentionally **not just another chatbot**. The Hub is designed to let us:
- use local AI through Ollama
- optionally use cloud AI through replaceable provider adapters
- search our own documents with citations
- control approved Home Assistant devices
- integrate MQTT sensors and automations
- view compatible cameras through ONVIF/RTSP/go2rtc/Frigate
- connect to Devil n Dove, Rosie Dazzlers, and YW without duplicating their data
- keep high-risk physical-world actions behind strict permissions and confirmation

## Core principles

1. Local-first whenever practical.
2. Cloud optional, never mandatory.
3. Provider-neutral architecture.
4. Home Assistant is the primary IoT abstraction layer.
5. Deterministic automation executes rules; AI may help author them.
6. State-changing actions are permissioned and audited.
7. No direct public-internet exposure.
8. Business systems remain their own sources of truth.
9. Safety-critical equipment is never autonomously controlled by an LLM.
10. Documentation is part of the product.

## Planned stack

- **Desktop:** React + Tauri
- **Web/PWA:** React
- **API:** Python + FastAPI
- **Database:** SQLite initially; PostgreSQL + pgvector later if justified
- **Local AI:** Ollama
- **Speech-to-text:** faster-whisper
- **Text-to-speech:** Piper or compatible local TTS
- **IoT:** Home Assistant + MQTT
- **Cameras:** ONVIF / RTSP / go2rtc; Frigate optional
- **Remote access:** Tailscale or equivalent private VPN
- **Tool protocol:** MCP-compatible adapters where useful

## Canonical documentation

Start here:

1. [Source of Truth](docs/SOURCE_OF_TRUTH.md)
2. [Architecture](docs/ARCHITECTURE.md)
3. [Build Roadmap](docs/BUILD_ROADMAP.md)
4. [Build Status](docs/BUILD_STATUS.md)
5. [Security Model](docs/SECURITY_MODEL.md)
6. [Data Model](docs/DATA_MODEL.md)
7. [Integrations](docs/INTEGRATIONS.md)
8. [Testing and Release](docs/TESTING_AND_RELEASE.md)
9. [Operations](docs/OPERATIONS.md)
10. [Open Decisions](docs/DECISIONS_TO_MAKE.md)

## Branch policy

- `dev` — active integration branch
- `main` — stable, reviewed home-production branch

Major architecture changes require an ADR under `docs/adr/`.

## Completed builds

- **Build 001 — Repository and Documentation Foundation**
- **Build 002 — FastAPI Backend Skeleton**
- **Build 003 — Local Database Foundation**
- **Build 004 — React Web UI Foundation**
- **Build 005 — Tauri Desktop Shell**
- **Build 006 — Ollama Discovery**
- **Build 007 — Streaming Chat**
- **Build 008 — Model Profiles**
- **Build 009 — Provider Abstraction**
- **Build 010 — Chat Reliability**
- **Build 011 — File Ingestion**
- **Build 012 — Chunking and Embeddings**
- **Build 013 — Retrieval**
- **Build 014 — Citations**
- **Build 015 — Knowledge Administration**
- **Build 016 — Authentication**
- **Build 017 — Tool Registry**
- **Build 018 — Confirmation Workflow**
- **Build 019 — Audit Log**
- **Build 020 — Secret Management**
- **Build 021 — Home Assistant Connection**
- **Build 022 — Entity Browser**
- **Build 023 — Safe Device Controls**
- **Build 024 — Natural-Language Home Tools**
- **Build 025 — MQTT Foundation**
- **Build 026 — Rule Schema**
- **Build 027 — Event Engine**

## Next build

**Build 028 — AI-Assisted Rule Authoring**

The first functional MVP boundary remains Build 025. Build 027 turns the validated Rule Schema into
a deterministic local event engine without moving automation execution into the AI model layer.
