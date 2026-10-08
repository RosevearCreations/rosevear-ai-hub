# Build 025 — MQTT Foundation

## Purpose

Build 025 completes the first functional MVP boundary with authenticated, allow-listed local MQTT
messaging. The browser, AI providers, and retrieved content never receive direct broker authority.

## Scope

- broker host/port/username configuration
- Build 020 MQTT password resolution
- optional TLS transport
- authenticated connection status
- bounded subscribe and publish APIs
- fail-closed topic allow-list enforcement
- bounded in-memory recent-message inspection
- bounded reconnect delay and subscription restoration
- authenticated MQTT UI
- publish audit evidence without payload plaintext

## Topic policy

`MQTT_ALLOWED_TOPICS` is a comma-separated set of MQTT filters.

1. An empty allow list disables MQTT.
2. Publish requests must use concrete topics; `+` and `#` are rejected.
3. A concrete publish topic must match one configured filter.
4. A concrete subscription may sit beneath an allow-listed wildcard.
5. A wildcard subscription request must exactly equal a configured allow-list filter.
6. QoS is limited to 0 or 1.
7. Retained publishes are rejected.

The wildcard-subscription rule prevents a caller from widening a narrow broker permission.

## Authentication and secrets

The connector requires `MQTT_HOST`, `MQTT_USERNAME`, an MQTT password, and at least one allowed
topic filter. The password comes from `MQTT_PASSWORD` or Build 020 encrypted storage and never
leaves the backend.

## Reconnect behavior

Paho's network loop uses `MQTT_RECONNECT_MIN_SECONDS` and `MQTT_RECONNECT_MAX_SECONDS`.
Previously authorized active subscriptions are re-applied after reconnect.

## Audit and privacy

Publish audit records contain actor, topic, QoS, retain=false, payload byte length, payload SHA-256,
and the safe result. Payload plaintext is excluded. Recent received messages live only in a bounded
in-memory buffer.

## Non-scope

Build 025 does not add AI-executable MQTT tools, automation rule execution, durable MQTT history,
retained publishing, arbitrary broker administration, anonymous fallback, public broker exposure,
or a cloud MQTT dependency.

## API

- `GET /api/v1/mqtt/status`
- `GET /api/v1/mqtt/messages`
- `POST /api/v1/mqtt/subscriptions`
- `POST /api/v1/mqtt/publish`

Build 016 authorization continues to block read-only accounts from POST requests.

## Testing

Fake broker clients cover connection configuration, allow-list policy, disconnected writes,
message buffering, reconnect restoration, API behavior, retained-publish rejection, audit plaintext
exclusion, web actions, and the read-only boundary. No live broker is required for CI.

## Migration impact

No database migration is required.

## Rollback

Rollback to the Build 024 tree and remove or ignore the Build 025 MQTT environment variables. MQTT
creates no durable application state in this build, so no database rollback is required.
