# ADR-0001: Local-first modular architecture

**Status:** Accepted  
**Date:** 2026-10-02

## Context
The Hub will access private home/business information and integrate devices from multiple vendors. Vendor lock-in would make the system fragile.

## Decision
Use a local-first modular architecture:
- FastAPI core
- React clients
- Tauri desktop shell
- SQLite initially
- provider-neutral AI layer
- explicit integration adapters
- deterministic automation engine

## Consequences
Benefits:
- replaceable providers
- local operation during internet outages
- better privacy
- easier testing
- business systems remain independent

Costs:
- more integration code
- local maintenance
- vendor-cloud devices may remain constrained
