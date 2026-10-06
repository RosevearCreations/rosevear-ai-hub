# Build 021 — Home Assistant Connection

## Purpose

Build 021 opens Phase 4 by connecting Rosevear AI Hub to Home Assistant as the primary IoT
abstraction layer. The build is deliberately read-only: it proves configuration, authentication,
health, error normalization, and a basic entity inventory before richer browsing or controls exist.

## Scope

- Home Assistant base URL from `HOME_ASSISTANT_URL`
- Home Assistant token through Build 020 secret resolution
- configurable `HOME_ASSISTANT_TIMEOUT_SECONDS`
- authenticated REST adapter
- `GET /api/` health check
- `GET /api/states` entity inventory
- normalized connection/authentication/timeout/request errors
- authenticated Hub status and inventory endpoints
- Devices UI with connection state and basic entity cards
- mock-backed backend and web tests
- operations/security/integration documentation

## Non-scope

Build 021 does not:
- call Home Assistant services
- change entity/device state
- create Home Assistant automations
- expose full arbitrary entity attributes
- resolve areas/devices/registries
- add MQTT
- expose Home Assistant publicly
- replace Home Assistant as the device integration platform

Those concerns remain assigned to Builds 022–025.

## API

### `GET /api/v1/home-assistant/status`

Returns a safe status envelope:
- whether URL/token are configured
- whether Home Assistant is reachable/authenticated
- configured base URL
- normalized message

The token is never included.

### `GET /api/v1/home-assistant/entities`

Returns a normalized read-only inventory with:
- entity ID
- domain
- current state
- friendly name
- icon
- unit of measurement
- device class
- last changed/updated timestamps

The endpoint intentionally does not forward arbitrary Home Assistant attributes.

## Security

- token resolution is server-side through Build 020
- browser requests never contain the Home Assistant token
- rejected-token errors do not echo credentials
- configured URLs are limited to HTTP/HTTPS URLs with a host
- the connector remains read-only
- no public-network exposure is added

## Testing

Automated tests use `httpx.MockTransport`, so CI does not require a live Home Assistant instance or
real token. Coverage includes success, unauthorized token redaction, offline, timeout, unconfigured
runtime, normalized inventory, and web rendering.

## Rollback

Rollback is code-only. No database migration is introduced. Reverting the Build 021 commit removes
the Home Assistant router, adapter, Devices UI, tests, and documentation while leaving Build 020
secret storage intact.

## Operator setup

Production connection requires only local runtime configuration:
- `HOME_ASSISTANT_URL`
- Home Assistant token via `HOME_ASSISTANT_TOKEN` or encrypted secret storage
- optional `HOME_ASSISTANT_TIMEOUT_SECONDS`

Do not place real tokens in source control, screenshots, tickets, or chat.
