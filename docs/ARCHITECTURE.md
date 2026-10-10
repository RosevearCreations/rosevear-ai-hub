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


## Build 030 notification layer

Build 030 introduces a local notification boundary between deterministic automation and future
external messaging.

notification.household.send is a registered Level-1 tool with a strict title, message, and severity
schema. The Event Engine may execute it autonomously because the action only creates a persistent
record inside the Hub. It does not contact email, SMS, push, webhook, or cloud providers.

Notifications are shared household records. Read and dismiss state is stored separately per user so
one person's inbox actions do not hide or acknowledge the notification for another account.

The web application exposes Notifications as a primary section. Build 030 also adds a reusable
contextual help layer at the application shell: every primary section gets the same accessible
circled-i entry point while the panel content changes with the active section. This keeps help
consistent without duplicating interaction logic in each feature view.


## Build 032 camera transport

Camera streaming now has a separate local transport layer:

authenticated Owner/Admin
-> camera registry entry
-> private RTSP URL validation
-> AES-GCM encrypted camera_streams record
-> loopback-only go2rtc HTTP API
-> runtime-only go2rtc stream/source patch
-> no Hub-managed camera source persisted in go2rtc YAML
-> local RTSP relay

The browser receives sanitized transport metadata but never the credential-bearing source URL.
Build 032 does not proxy media through FastAPI. Build 033 will own dashboard/health presentation
without weakening the local-only go2rtc boundary.


## Build 033 camera dashboard and health

Build 033 adds a presentation/health layer without creating a second media transport:

authenticated camera viewer
-> camera dashboard API
-> sanitized camera/stream health metadata
-> loopback-only go2rtc viewer URL using stable stream name
-> embedded local live tile

Owner/Administrator health refresh performs bounded producer probes through the existing go2rtc
adapter and updates the existing camera_streams last-probe fields. Dashboard reads never decrypt or
return camera source credentials.

Health is computed from existing registry/stream state:
- disabled
- unconfigured
- untested
- healthy
- stale
- unavailable / failed / no_producer

The browser receives only local viewer URLs and sanitized health metadata. No new public listener,
recording subsystem, or camera device-control path is introduced.


## Build 034 Frigate adapter

Build 034 adds a separate optional read-only event-analysis integration beside go2rtc:

authenticated camera viewer
-> Hub Frigate API
-> loopback-only Frigate internal HTTP API
-> normalized service/camera/event metadata
-> Cameras Frigate panel

The browser never connects to Frigate directly. The adapter validates FRIGATE_BASE_URL before every
client construction and rejects non-loopback HTTP targets, embedded credentials, queries, and
fragments.

Frigate remains optional. Failure of the adapter returns an offline/error state without taking down
the camera registry, go2rtc live dashboard, Home Assistant, MQTT, chat, or knowledge features.

Build 034 does not persist Frigate events or execute automations from them. Build 035 will define
durable event-ingestion/deduplication and automation semantics.


## Build 035 camera-event automation path

Build 035 connects the optional Frigate adapter to the existing deterministic Event Engine:

enabled frigate_event rule
-> bounded loopback Frigate event poll
-> first-use historical baseline suppression
-> normalized Frigate event
-> runtime queue
-> Rule Schema trigger/condition matching
-> automatic event-ID deduplication
-> existing Level-1 action executor
-> automation run + audit evidence
-> bounded persistent seen-event checkpoint

The Frigate source remains dormant when no enabled camera-event rule exists. The browser never
polls Frigate and receives no raw event payload for automation execution.

The first successful poll after camera-event automation becomes active seeds the current Frigate
history as already seen. This intentionally avoids firing physical actions for old events. Later
events are checkpointed only after an execution attempt reaches the worker, while the Event Engine
also persists per-rule deduplication evidence so restart timing cannot silently replay a completed
camera-triggered action.

Build 035 reuses app_settings for a bounded source checkpoint and therefore requires no migration.


## Build 036 business connector framework

Build 036 introduces a common server-owned boundary for business systems:

authenticated Hub user
-> /api/v1/business
-> connector registry
-> normalized descriptor/status/capabilities
-> future concrete read adapter
-> normalized read result

The framework has no network client of its own. Every connector declares a stable key, display name,
planned build, access mode, capabilities, safe health state, and whether writes require confirmation.
The base write method is fail-closed and raises a normalized write-blocked error.

Devil n Dove, Rosie Dazzlers, and Yard Workers are registered as planned read-only connectors so
Builds 037–039 can supply concrete adapters without changing the shared API/UI contract. Build 040
must define every allowed write explicitly; the framework does not provide a generic arbitrary write
or remote-command escape hatch.


## Build 037 Devil n Dove read adapter

The first concrete business adapter sits behind the Build 036 `BusinessConnector` contract:

```text
Browser / Tauri
    |
    | authenticated Hub request
    v
FastAPI /api/v1/business/connectors/devilndove/read/{resource}
    |
    | resolve server-side Devil n Dove credential
    v
DevilNDoveReadConnector
    |
    +-- catalogue -> GET /api/admin/product-picker
    +-- orders    -> GET /api/admin/orders
    +-- inventory -> GET /api/admin/contracts/inventory-read
    |
    v
Devil n Dove (system of record)
```

The Hub stores no replicated Product, Order, or Inventory table in this build. Records are normalized
in memory and returned to the authenticated caller. The connector does not expose a generic URL,
method, request body, or provider-response passthrough, and its inherited write path remains blocked.
