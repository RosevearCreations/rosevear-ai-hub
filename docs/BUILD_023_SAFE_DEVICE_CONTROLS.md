# Build 023 — Safe Device Controls

## Purpose

Build 023 introduces the first state-changing Home Assistant actions while preserving the Hub's
local-first risk model. Only explicitly approved Level-1 lights, switches, and non-safety scenes
can be operated.

## Scope

- Level-1 tool contracts for:
  - Home Assistant light on/off
  - Home Assistant switch on/off
  - Home Assistant non-safety scene activation
- Owner/Administrator-managed exact-entity allow list
- explicit low-risk acknowledgement when the allow list is changed
- Household User execution of allow-listed low-risk controls
- Read-only execution denied
- tool enable/disable gate retained
- exact tool-schema validation before execution
- bounded Home Assistant service methods rather than an arbitrary service-call endpoint
- hazardous/safety-looking target rejection
- Home Assistant offline/unavailable write blocking
- immutable audit evidence for successful and failed actions
- audit evidence for allow-list policy changes
- Devices UI controls and allow-list administration
- backend, role, audit, adapter, web, and Windows packaging coverage

## Non-scope

Build 023 does not:
- unlock doors
- control alarm/security systems
- disable smoke/CO devices
- operate forge, kiln, laser, CNC, heaters, boilers, furnaces, or comparable hazardous equipment
- expose arbitrary Home Assistant service calls
- permit Read-only users to write
- let an LLM modify the safe-control allow list
- add natural-language entity resolution; that belongs to Build 024

## Risk model

Lights, benign switches, and non-safety scenes are Level 1 only after an Owner/Administrator has
explicitly placed the exact entity ID on the safe-control allow list.

Changing the allow list is treated as a Level-3 administrative policy event for audit purposes
because it changes which future writes may be delegated. The allow-list administration endpoint is
not registered as an AI tool.

The Home Assistant light/switch/scene execution tools remain Level 1. They are also subject to:
1. exact entity allow-list membership
2. supported domain/action pairing
3. hazardous-name deny checks
4. tool-registry enabled state
5. registered JSON-schema validation
6. authenticated role authorization
7. Home Assistant availability
8. audit recording

## API

- GET /api/v1/home-assistant/control-policy
- PUT /api/v1/home-assistant/control-policy — Owner/Administrator only
- POST /api/v1/home-assistant/control — Owner/Administrator/Household User

No arbitrary domain/service endpoint exists.

## Persistence

The allow list uses the existing app_settings table under:

home_assistant.safe_control_allowlist

No database migration is required.

## Audit

Allow-list changes record:

home_assistant.control_policy.updated

Successful controls record:

tool.execution.completed

Failed Home Assistant execution attempts record:

tool.execution.failed

Control audit records include actor, exact entity ID, requested action, tool key, risk level, result,
and timestamp. Existing Build 019 sanitization applies.

## Security notes

- Home Assistant credentials remain backend-only.
- A write is impossible unless the exact entity ID is allow-listed.
- Only light, switch, and scene domains are accepted.
- Actions are fixed to light/switch on/off and scene activation.
- Safety/hazard markers are denied even if an entity somehow appears in persisted policy data.
- Policy editing requires Owner/Administrator authentication and cannot be invoked through the tool registry.
- Scenes must be manually classified by the Owner/Administrator as non-safety before allow-listing.
- Home Assistant connectivity failure blocks writes.
- No public listener or new remote-access path is introduced.

## Operator setup

No new credential or service is required. Use the existing Build 021 Home Assistant URL/token.

After updating the Hub:
1. open Devices as Owner/Administrator
2. review the Safe-control allow list
3. select only ordinary low-risk lights, switches, and non-safety scenes
4. save the allow list
5. use the controls shown on allow-listed entity cards
6. inspect Audit to verify tool.execution.completed evidence

## Rollback

Revert Build 023. The existing app_settings row may remain harmlessly in SQLite; Build 022 ignores
it. No schema downgrade is needed.

## Next build

Build 024 — Natural-Language Home Tools
