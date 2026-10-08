# Build 027 — Event Engine

## Status

Implementation is on `dev` pending exact-head CI and promotion evidence.

## Scope

Build 027 turns Rule Schema v1 into a deterministic local runtime. It consumes Home Assistant
`state_changed` events and authorized MQTT messages, evaluates enabled rules and conditions, applies
persistent cooldown/deduplication guards, executes the existing safe Home Assistant Level-1 tools,
and records run/audit evidence.

## Event sources

### Home Assistant

The existing authenticated WebSocket adapter now supports `subscribe_events` for
`state_changed`. The runtime reconnects with bounded backoff after connector failures. Event state
is normalized before rule evaluation; conditions are refreshed from the Home Assistant REST state
inventory.

### MQTT

The Build 025 client exposes in-process message listeners. The Event Engine reconciles enabled
MQTT-trigger rules into broker subscriptions only after the existing client is connected and only
through the Build 025 topic allow-list validation.

Both sources feed a 256-event queue. The MQTT callback never runs rule logic on the Paho network
thread. If that queue is full, the event is dropped and the runtime drop counter/last error is
updated rather than allowing unbounded memory growth.

## Evaluation

Supported trigger semantics:
- `state_change`: entity and optional from/to state must match exactly
- `state_threshold`: requires an actual crossing of the configured above/below boundary
- `mqtt_message`: MQTT filter must match; optional payload equality is exact

Supported conditions remain Rule Schema v1:
- exact state equality
- numeric above/below threshold

Rules are loaded fresh from SQLite for each event, so disabling or editing a rule does not require
an Event Engine restart.

## Cooldown and deduplication

Build 027 creates `automation_runs`. Cooldown checks the most recent success/failure attempt.
Deduplication combines the rule's configured key with a deterministic event fingerprint and stores
only the resulting SHA-256 token. Replayed source events therefore cannot repeat an action simply
because the process restarted.

MQTT event evidence contains topic/QoS/retain/timestamp and a SHA-256 payload fingerprint. The raw
payload is not copied into run evidence or automation audit summaries.

## Execution safety

The execution path revalidates the live tool registry immediately before every action:
1. tool exists
2. tool is enabled
3. tool is an Event Engine-supported executor
4. tool remains Level 1
5. arguments match the registered JSON schema
6. entity is on the Build 023 safe-control allow list
7. current entity state exists
8. hazardous/safety-looking target checks pass
9. Home Assistant is available

The first executors are exactly:
- `home_assistant.light.set`
- `home_assistant.switch.set`
- `home_assistant.scene.activate`

Level 2/3 tools remain prohibited. Unsupported Level-0 tools are not silently converted into Event
Engine actions. No model/provider is consulted during matching or execution.

## Persistence and audit

Migration `0013` adds `automation_runs` with automation ID, start/completion timestamps, status,
and structured result summary. Runs may be `running`, `success`, `failed`, or `skipped`.
Tool attempts continue to use the central audit writer, and final automation outcomes are also
recorded.

Build 029 remains responsible for the richer user-facing automation history/failure workflow.

## Runtime status

Authenticated `GET /api/v1/automations/runtime` reports:
- running state
- queue depth/capacity
- processed/dropped/failed event counters
- Home Assistant/MQTT configuration presence
- MQTT rule subscriptions
- last runtime error

## Tests

Coverage includes:
- state-change execution with a condition
- persistent run and audit evidence
- deduplication preventing replay
- cooldown/dedup skip evidence
- MQTT payload privacy in run evidence
- threshold crossing semantics
- migration upgrade/downgrade
- existing automation API contract updated to report execution available

## Non-scope

Build 027 does not:
- use AI to author rules (Build 028)
- add the full automation history/failure UI or retry workflows (Build 029)
- add notification actions (Build 030)
- add camera event sources (Build 035)
- permit arbitrary Home Assistant service calls
- permit Level 2 or Level 3 autonomous actions
- add a cloud/event-bus dependency

## Security impact

Autonomous execution becomes real in this build, but the authority is intentionally no broader than
the existing Build 023 safe-control policy. Event sources cannot select a new tool, target, or action
outside the persisted rule; the Event Engine cannot widen MQTT topic policy; and no LLM fallback can
convert an unsupported event into a physical action.

## Rollback

1. Disable affected automations.
2. Stop the Hub.
3. Downgrade Alembic from `0013` to `0012`.
4. Deploy the prior application version.

The downgrade removes run evidence but preserves Build 026 automation definitions.
