# Build 026 — Rule Schema

Build 026 establishes the deterministic, versioned automation rule contract. It intentionally does
not execute rules; Build 027 remains the Event Engine.

## Scope

- versioned Rule Schema v1
- strict unknown-field rejection
- Home Assistant state-change and numeric-threshold triggers
- MQTT message triggers with Build 025 topic-filter validation
- state-equality and numeric-threshold conditions
- one or more registered tool actions
- cooldown and deduplication metadata
- persistent automations table
- authenticated schema, validation, list, and detail APIs
- Owner/Administrator-only rule changes
- Build 018 exact confirmation required for create, update, and delete
- current-record fingerprint bound into update/delete confirmations
- audit evidence for confirmed rule changes
- migration upgrade/downgrade coverage

## Safety boundary

An automation action may reference only registered Level 0 or Level 1 tools. Level 2 actions require
human confirmation and therefore cannot be embedded as autonomous rule actions. Level 3 actions
remain prohibited. An enabled rule also cannot reference a disabled tool.

The Build 023 Home Assistant safe-control allow list remains authoritative at execution time. Build
026 does not create a bypass around tool enable state, risk class, device allow lists, confirmations,
or audit logging.

## Schema v1

A rule contains one trigger, zero or more conditions, one or more actions, an optional cooldown, and
an optional deduplication key.

Supported triggers:
- state_change
- state_threshold
- mqtt_message

Supported conditions:
- state_equals
- numeric_threshold

Supported actions:
- tool

Notification actions remain deferred until the Notification Layer. Event subscriptions, polling,
scheduling, evaluation, and action execution remain deferred to Build 027.

## Change flow

Owner/Administrator clients validate a desired rule, request an exact Build 018 confirmation, approve
that confirmation, then apply the exact same change. The confirmation includes a fingerprint of the
current row for update/delete, so an approval cannot silently apply to a rule that changed after the
preview.

## External setup

No external application, cloud account, OAuth registration, API key, paid service, or live Home
Assistant/MQTT connection is required to verify Build 026. Automated tests use the local database and
the existing registered tool contracts.
