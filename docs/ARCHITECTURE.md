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
Providers       SQLite/Vec  Integrations  Event Store
  |                         /   |    \
  v                       HA   MQTT  Cameras
Ollama
(optional cloud later)
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

Build 009 establishes a provider-neutral interface with:
- provider capability metadata
- normalized health and errors
- provider registry
- model discovery contract
- streaming chat contract
- privacy metadata
- optional-cloud adapter contract

Current provider:
- Ollama — local-only

Planned later behavior:
- local-first preference
- timeout/retry/fallback
- tool-call normalization
- cost metadata for optional paid providers

Cloud providers remain optional and are not configured by Build 009.

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

Build 026 formalizes this concept as strict Rule Schema v1 and persists validated definitions in the local `automations` table. Owner/Administrator changes use the Build 018 exact confirmation workflow. Rule definitions may reference only Level 0/1 registered tools. Build 026 does not subscribe to events or execute rules; that boundary is implemented by Build 027.

Build 027 runs a server-owned Event Engine. Home Assistant `state_changed` WebSocket events and
authorized MQTT messages enter a bounded queue, then deterministic code evaluates the persisted
Rule Schema. Conditions use current Home Assistant state, threshold triggers require an actual
boundary crossing, cooldown and deduplication are checked against persistent run evidence, and only
the explicitly supported Build 023 Level-1 Home Assistant tool contracts can execute autonomously.
The Event Engine never asks an LLM whether a rule matches or which tool arguments to use.

Build 028 adds AI-assisted authoring in front of this deterministic boundary. The authoring endpoint
provides the selected AI provider with Rule Schema v1, currently registered Event Engine action
contracts, bounded Home Assistant entity metadata, the safe-control allow list, and MQTT topic-policy
metadata. Credentials are never included. Provider output is treated as untrusted structured input:
the server parses strict JSON, validates Rule Schema v1, rechecks tool risk/enable state, and validates
every action's arguments against the registered tool schema. The AI draft is not persisted. The
Owner/Administrator workbench displays the exact JSON and warnings, then reuses the Build 018 Level-2
confirmation and Build 026 apply path for an explicit human-approved save.

Build 029 makes the existing `automation_runs` evidence operational. Authenticated history endpoints
join run evidence to automation names, support bounded status/rule filtering, and summarize success,
failure, interruption, skip, and active counts. Runtime startup closes any orphaned `running` row as
`interrupted`, preserving prior evidence and audit-recording the recovery. Unexpected action
exceptions are contained to the affected run instead of escaping into the event worker.

Failure handling deliberately does not replay actions. A failed or interrupted run may represent a
partially completed physical-world change, so Build 029 records `automatic_retry=false`, applies
cooldown protection to interrupted runs, and requires a later source event after the operator fixes
the underlying issue.

## Home Assistant adapter

Build 021 implements the first IoT adapter against Home Assistant's authenticated REST API. The
FastAPI backend owns URL/token resolution, network calls, normalized errors, health, and a basic
read-only entity inventory. The browser receives normalized status/entity fields only.

No service calls are implemented in Build 021. Safe controls remain a later tool/permission layer.

Build 022 adds Home Assistant WebSocket registry discovery for areas, devices, and entities. The backend joins registry metadata to REST state and emits a normalized read-only browser model. WebSocket commands remain discovery-only; service calls are still absent.

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


## Build 023 control path

Safe Home Assistant writes follow a deterministic server-owned path:

authenticated user
-> exact entity allow list
-> supported domain/action check
-> hazardous target deny check
-> enabled Level-1 tool contract
-> JSON-schema argument validation
-> bounded Home Assistant adapter method
-> immutable audit record

The allow-list administration path is Owner/Administrator-only and is intentionally not registered
as an AI-executable tool.


## Build 024 home-language orchestration

Home-profile chat now branches before model generation:

chat prompt
-> bounded imperative parser
-> exact Home Assistant entity resolver
-> Build 023 safe-control policy
-> bounded tool execution
-> audit evidence
-> deterministic chat result

If the prompt is not a recognized home-control command, the normal provider-neutral streaming chat
path continues unchanged. The architecture intentionally avoids LLM-selected device IDs or generic
Home Assistant service calls.


## Build 025 MQTT foundation

Build 025 adds a server-owned MQTT adapter beside Home Assistant. The browser never opens a broker
socket and never receives the broker password.

The bounded path is:

authenticated Hub user
-> MQTT API
-> topic/filter validation
-> configured topic allow list
-> authenticated broker client
-> local broker

Subscriptions are restored after reconnect. Reconnect delay stays inside the configured minimum and
maximum. Concrete subscriptions may sit beneath an allow-listed wildcard, but wildcard subscription
requests must exactly match an allow-list entry so callers cannot widen broker visibility.

MQTT publish remains a human-invoked integration action in Build 025. It is not an AI-executable tool
and is not yet an automation action. Retained publishes are blocked until a later build deliberately
defines their lifecycle and safety semantics.
