# Build 017 — Tool Registry

## Purpose

Build 017 establishes the normalized, permission-aware registry that future AI and deterministic
workflows will use to discover Hub tools safely.

This build describes and administers tools. It does **not** execute tools.

## Scope

Build 017 adds:

- stable dotted tool keys
- normalized JSON-compatible input schemas
- normalized JSON-compatible output schemas
- declared capabilities
- canonical risk levels 0–3
- confirmation-policy metadata derived from risk
- persistent enable/disable state
- integration ownership metadata
- owner/administrator registry administration
- registry summary and detail APIs
- an authenticated Tool Registry UI
- audit evidence for enable/disable changes
- a reversible database migration

## Non-scope

Build 017 intentionally does not add:

- tool execution
- AI-initiated actions
- approval tokens
- approve/reject flows
- confirmation expiry
- replay prevention
- Home Assistant actions
- MQTT actions
- business-system writes
- secret storage

Those boundaries remain assigned to Builds 018–025 and later connector builds.

## Canonical risk levels

The registry implements the Source of Truth risk classes:

| Level | Registry label | Policy |
|---|---|---|
| 0 | `read` | read-only; no confirmation |
| 1 | `low_risk_action` | direct execution may later be user-configurable |
| 2 | `confirmation_required` | execution must require confirmation |
| 3 | `prohibited_autonomous` | cannot be enabled for autonomous execution |

Build 017 blocks attempts to enable a Level 3 registry record.

## Normalized tool contract

Each tool record exposes:

- `tool_key`
- display name
- description
- integration
- capabilities
- risk level and label
- confirmation policy
- normalized input schema
- normalized output schema
- enabled state
- built-in state

Built-in schema objects:

- use `type: object`
- declare `properties`
- declare an explicit `required` list
- set `additionalProperties: false`

This gives later execution code a deterministic contract instead of accepting arbitrary model
arguments.

## Built-in registry entries

Build 017 seeds code-owned metadata for:

### `knowledge.search`
- Level 0
- enabled by default
- capabilities: `knowledge.read`, `knowledge.search`

### `knowledge.answer`
- Level 0
- enabled by default
- capabilities: `ai.generate`, `knowledge.answer`, `knowledge.read`

### `knowledge.document.delete`
- Level 2
- disabled by default
- capabilities: `knowledge.delete`, `knowledge.write`
- registry description only; execution remains unavailable until the Build 018 confirmation layer

Code-owned metadata is synchronized into the database while operator enable/disable state is
preserved.

## API

Authenticated users may inspect:

- `GET /api/v1/tools`
- `GET /api/v1/tools/summary`
- `GET /api/v1/tools/{tool_key}`

Owners and administrators may change registry enable state:

- `PATCH /api/v1/tools/{tool_key}`

Household users may inspect the registry but cannot administer it. Read-only accounts retain the
Build 016 server-side prohibition against state changes.

## User interface

Owners and administrators receive a **Tools** navigation entry.

The Tool Registry screen displays:

- total/enabled/disabled counts
- capability count
- tool key and description
- risk level
- confirmation policy
- integration
- capability tags
- normalized input/output schemas
- enable/disable control

Level 3 tools cannot be enabled from the UI.

## Database migration

Alembic revision `0008_tool_registry.py` creates:

### `integrations`
- integration_key
- type
- name
- enabled
- configuration reference
- health status metadata
- timestamps

### `tools`
- integration reference
- stable tool key
- display metadata
- capabilities JSON
- risk level
- input/output schema JSON
- enabled state
- built-in state
- timestamps

The migration is reversible to revision 0007.

## Security impact

Build 017 improves the safety boundary by making tool capability and risk explicit before any
execution framework exists.

Important properties:

- no tool can execute through the registry
- schemas reject undeclared top-level arguments
- Level 2 tools carry mandatory-confirmation metadata
- Level 3 tools cannot be enabled for autonomous execution
- only owner/administrator accounts can change enabled state
- enable/disable changes write an audit event
- no secret values are introduced
- no public network exposure is introduced

## Tests

Build 017 adds coverage for:

- normalized built-in contracts
- registry ordering
- capabilities
- risk labels and confirmation policy
- summary counts
- persistent enable/disable state
- audit evidence
- household-user read/admin boundaries
- Level 3 enable prohibition
- integration/tool persistence
- migration upgrade/downgrade
- authenticated Tool Registry UI

## Rollback

1. Roll application code back to Build 016.
2. Downgrade Alembic revision 0008 to 0007.

The downgrade removes only Build 017 integration/tool-registry metadata. It does not alter users,
sessions, conversations, knowledge documents, or model profiles.

## External setup

No external service, API key, OAuth application, secret, hosted database, or paid subscription is
required.

## Next build

**Build 018 — Confirmation Workflow**

Build 018 will add exact action previews, approve/reject decisions, expiry, and replay prevention
before confirmation-required tools can execute.
