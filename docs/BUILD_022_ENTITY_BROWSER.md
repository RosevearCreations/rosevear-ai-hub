# Build 022 — Entity Browser

## Purpose

Build 022 turns the Build 021 Home Assistant connection into a useful read-only browser. It joins live entity state with Home Assistant's area, device, and entity registries.

## Scope

- authenticated Home Assistant WebSocket registry discovery
- read-only area, device, and entity registries
- live REST state inventory
- normalized area/device/domain/entity browser response
- entity-area resolution using entity assignment first and device assignment second
- browser search and filters for area, domain, device, state, name, entity ID, and platform
- bounded attributes with secret-like values redacted before the browser receives them
- additive support for current child-device fields
- CORS PUT regression fix for Build 020 secret create/rotation
- backend, web, CORS, and Windows packaging coverage

## API

GET /api/v1/home-assistant/browser returns counts plus normalized areas, devices, domains, and live entities. Build 021 status and minimal entity endpoints remain available.

## CORS PUT fix

During the first real Home Assistant setup, the Secrets page correctly issued PUT /api/v1/secrets/{secret_key}, but FastAPI's CORS middleware allowed only GET, POST, PATCH, and DELETE. The browser preflight therefore failed before the request reached the secret endpoint. Build 022 adds PUT to the allowed methods and a regression test for the actual preflight.

This does not weaken authentication: secret writes still require an authenticated Owner/Administrator session. CORS controls which approved browser origins may send the already-authorized request.

## Security

- credentials remain backend-only
- WebSocket authentication reuses the resolved token
- registry commands are read-only
- no service-call command is introduced
- attributes are bounded in depth, collection size, and string length
- secret-like attribute keys are redacted
- no public listener or port forwarding is introduced

## Database migration

None.

## Rollback

Revert the Build 022 application commit. Build 021 status and minimal entity inventory remain usable; no database state needs to be downgraded.

## External setup

No new credential, cloud account, OAuth application, or paid service is required. A working Build 021 Home Assistant URL and token are sufficient.

## Next build

Build 023 — Safe Device Controls
