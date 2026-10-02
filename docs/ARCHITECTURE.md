# Architecture

## High-level view

```text
Desktop / Browser / Phone
          |
          v
     UI Applications
          |
          v
      FastAPI Core
          |
  +-------+--------+----------+-----------+
  |                |          |           |
  v                v          v           v
AI Router      Knowledge   Tool Bus   Automation Engine
  |                |          |           |
  v                v          v           v
Ollama/Cloud   SQLite/Vec   Integrations  Event Store
                           /   |    \
                         HA   MQTT  Cameras
                                  |
                           Business adapters
```

## Desktop and web clients

Responsibilities:
- authentication
- chat experience
- streaming output
- citations
- dashboards
- confirmation dialogs
- settings
- user-visible system health
- admin audit views

Desktop uses React inside Tauri. Web/PWA uses the same design system wherever practical.

## FastAPI core

Responsibilities:
- authentication/session handling
- authorization
- model routing
- tool orchestration
- validation
- rate limiting
- audit logging
- health endpoints
- integration lifecycle
- automation lifecycle

## AI router

Provider-neutral interface with:
- provider capability metadata
- model discovery
- privacy routing
- local-first preference
- timeout/retry/fallback
- tool-call normalization
- cost metadata for optional paid providers

## Knowledge service

Responsibilities:
- ingest
- hashing
- duplicate detection
- extraction
- chunking
- embeddings
- ACL/collection metadata
- keyword + semantic retrieval
- citation metadata
- re-indexing

Initial storage:
- SQLite metadata
- vector abstraction chosen during Build 012

## Tool bus

Every external read/write action passes through a normalized tool interface.

Minimum execution envelope:

```json
{
  "tool_id": "homeassistant.light",
  "action": "turn_on",
  "requested_by": "user-id",
  "risk_level": 1,
  "arguments": {},
  "validation_result": "allowed",
  "confirmation_id": null,
  "execution_result": {},
  "timestamp": "ISO-8601"
}
```

## Automation engine

Rules contain:
- trigger
- zero or more conditions
- one or more actions
- cooldown/deduplication
- enabled state
- run history

Example:

```json
{
  "name": "Workshop temperature alert",
  "enabled": true,
  "trigger": {
    "type": "state_threshold",
    "entity": "sensor.workshop_temperature",
    "above": 30
  },
  "conditions": [],
  "actions": [
    {
      "type": "notify",
      "target": "household",
      "message": "Workshop temperature is above 30 C."
    }
  ]
}
```

## Integration contract

Each adapter exposes:
- connection configuration
- connection test
- health state
- capability discovery
- read methods
- write methods
- normalized errors
- tool risk classification

## Planned API namespaces

```text
/api/v1/auth
/api/v1/chat
/api/v1/models
/api/v1/knowledge
/api/v1/tools
/api/v1/automations
/api/v1/integrations
/api/v1/home
/api/v1/cameras
/api/v1/business
/api/v1/audit
/api/v1/system
```

## Deployment modes

### Development
- Windows workstation
- FastAPI local
- SQLite
- Ollama local
- Vite dev server
- test Home Assistant token

### Home production
Recommended eventual pattern:
- dedicated always-on mini PC/server
- Docker Compose where suitable
- API + DB local
- Ollama local or LAN GPU host
- Tailscale for remote access
- encrypted backup

## Network rule

Do **not** directly expose FastAPI, Ollama, MQTT, Home Assistant admin services, or camera services to the public internet.
