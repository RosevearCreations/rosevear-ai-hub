# Build 038 — Rosie Dazzlers Read Connector

## Status

COMPLETE — promoted to `main` through PR #69.

## Goal

Activate the Build 036 Rosie Dazzlers connector as a bounded, read-only integration while keeping
Rosie Dazzlers as the sole system of record.

## Verified Rosie Dazzlers contracts

Build 038 was designed against the current Rosie Dazzlers default-branch source at commit
`c3a20007bbbb40ff8c8a5fc8160705f30419591c`.

The existing staff authorization path first accepts a valid `rd_staff_session` cookie. The Hub
therefore stores only that opaque token value server-side and sends it back as the single Rosie
Dazzlers session cookie on explicit reads.

Existing source contracts reused:

| Hub resource | Rosie Dazzlers contract | Upstream method | Hub cap |
|---|---|---:|---:|
| Bookings | `/api/admin/bookings_search` | POST (read-only query) | 100 |
| Customers | `/api/admin/customers_list` | POST (read-only query) | 100 |
| Jobs | `/api/detailer/jobs?scope=workspace` | GET | 80 |
| Inventory | `/api/admin/catalog_inventory_list` | GET | 100 |

The two POST endpoints above are query/list endpoints in the existing application; they do not
change Rosie Dazzlers state. Build 038 uses an exact method/path allow list so this compatibility
does not create a generic POST proxy.

## Security boundary

- remote Rosie Dazzlers origins require HTTPS
- HTTP is accepted only for localhost/loopback testing
- the staff-session token is resolved only on the Hub backend
- the browser never receives the token or contacts Rosie Dazzlers directly
- no arbitrary upstream path, method, headers, or body are accepted from the browser
- upstream responses are normalized to bounded fields
- booking/job projections intentionally discard progress tokens, coordinates, and free-form notes
- business writes continue to fail closed through the Build 036 base connector
- connector status never performs a live Rosie Dazzlers request

## Runtime configuration

Preferred secret:

- secret key: `rosiedazzlers.staff_session_token`
- UI label: **Rosie Dazzlers staff session token**

Environment fallback:

- `ROSIEDAZZLERS_BASE_URL=https://rosiedazzlers.ca`
- `ROSIEDAZZLERS_STAFF_SESSION_TOKEN=<opaque rd_staff_session value>`
- `ROSIEDAZZLERS_TIMEOUT_SECONDS=8`

The connector may remain unconfigured without blocking Hub startup or deployment.

## UI

The Business page now exposes Rosie Dazzlers **Read Bookings**, **Read Customers**, **Read Jobs**,
and **Read Inventory** controls when the connector is configured. Results use the same bounded JSON
preview surface as Devil n Dove.

## Tests

Build 038 adds coverage for:

- remote HTTPS enforcement
- cookie-injection rejection
- exact read methods and paths
- bounded request sizes
- backend-only session-cookie authentication
- response normalization/privacy minimization
- sanitized authentication failures
- connector registry activation
- environment-secret configuration
- Rosie Dazzlers Business UI read preview
- inherited write blocking

## Database and dependency impact

- no Hub database migration
- no Rosie Dazzlers database migration
- no Rosie Dazzlers source change
- no new paid service
- no new package dependency

## Promotion evidence

- final GREEN dev integration tree: `c91aac71776723e6628a8378b696f584a2215316`
- final feature dev CI: run 38054235678 — docs/backend/web/Windows GREEN
- backend result: 164 passed, 9 warnings
- protected-main promotion gate: run 38054594711 — all four lanes GREEN
- feature promotion: PR #69
- main feature merge: `d562ca796fa05a88853977b46fa22553dba3c573`
- main Production validation: run 38055745019 — all four lanes GREEN
- Windows Production artifact: `rosevear-ai-hub-windows` uploaded successfully
- release-evidence closeout: protected-main PR following the green feature Production run
- final operation: synchronize `dev` to the release-evidence `main` target and verify GREEN
