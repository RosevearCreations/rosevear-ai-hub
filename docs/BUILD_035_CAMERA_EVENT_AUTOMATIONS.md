# Build 035 — Camera Event Automations

## Status

Implementation complete on dev; promotion evidence is recorded in BUILD_STATUS.

## Scope

Build 035 connects the optional local Frigate adapter to the existing deterministic Event Engine.

- new `frigate_event` Rule Schema trigger
- filters for exact label plus optional camera, sub-label, zone, minimum score, clip, and snapshot state
- false-positive events ignored by default
- optional Frigate polling only when at least one enabled camera-event rule exists
- first-use baseline seeding so historical Frigate events are not executed retrospectively
- bounded persistent seen-event checkpoint using the existing app_settings store
- automatic per-automation Frigate event-ID deduplication
- restart-safe replay containment
- existing Home Assistant state conditions remain available
- existing Level-1 Home Assistant and household-notification actions remain the only deterministic actions
- AI-assisted authoring receives local Frigate camera and recent-label context when available
- runtime status exposes Frigate rule count, online state, checkpoint count, and last poll time
- no database migration

## Trigger contract

Example:

```json
{
  "type": "frigate_event",
  "label": "person",
  "camera": "front_door",
  "zone": "porch",
  "min_score": 0.75,
  "require_snapshot": true,
  "include_false_positives": false
}
```

Only `label` is required. Build 035 performs exact string matching for configured fields.

## Safety and replay behavior

Camera events can ultimately cause physical actions, so Build 035 preserves every existing Event
Engine safety boundary.

- camera-event rules execute only already-supported Level-1 deterministic tools
- Home Assistant physical targets still require the Build 023 safe-control allow list
- Level-2 and Level-3 tools remain prohibited from autonomous rules
- every Frigate event receives automatic per-rule deduplication based on Frigate event ID
- first successful poll after camera-event automation is introduced establishes a baseline and does
  not replay older Frigate history
- processed event IDs are checkpointed in bounded local app_settings state
- if action outcome is uncertain after interruption, the existing no-auto-retry policy still applies
- false-positive events do not match unless a rule explicitly opts in

## Polling behavior

The Frigate event source is dormant when no enabled `frigate_event` rule exists.

Default:
- `FRIGATE_EVENT_POLL_SECONDS=2`
- accepted range: 1–60 seconds
- event retrieval still uses the Build 034 bounded `FRIGATE_EVENT_LIMIT`

The polling client remains server-side and loopback-only. The browser never polls Frigate directly.

## Persistence

No migration is required. Build 035 uses:
- existing `automations`
- existing `automation_runs`
- existing `audit_events`
- existing `app_settings` for a bounded Frigate seen-event checkpoint

No image, clip, raw event JSON, or camera credential is persisted by Build 035.

## Non-scope

Build 035 does not:
- alter Frigate configuration
- start/stop recordings
- delete or retain Frigate events
- download clips or snapshots
- perform facial recognition
- add PTZ/talkback
- expose Frigate remotely
- add new action tool classes

## Rollback

Deploy Build 034. No schema downgrade is required. The bounded Frigate runtime checkpoint in
app_settings is inert under Build 034 and may be left in place.

## Next build

Build 036 — Connector Framework.
