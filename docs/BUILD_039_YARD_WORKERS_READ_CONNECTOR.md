# Build 039 — Yard Workers Read Connector

## Status

Feature implementation active on `build-039-yardworkers-read-connector`.

## Goal

Activate the Build 036 Yard Workers connector as a bounded read-only integration while keeping Yard
Workers and its Supabase project as the source of truth.

## Verified Yard Workers contract

Build 039 was designed against the current Yard Workers default-branch source at commit
`8514825087326bdfe8b5de0e0c96d937ac7c10ee`.

The existing protected Shared Core contract is:

- endpoint: `POST /functions/v1/core-data-read`
- authentication: `Authorization: Bearer <signed-in user access token>`
- Supabase project header: `apikey: <anon/publishable API key>`
- authorization: active profile plus module `view` permission
- Build 039 uses `module_key: "jobs"`
- upstream endpoint is explicitly read-only and has no insert/update/upsert/delete operation
- upstream JWT verification remains enabled

Build 039 does not change the Yard Workers application or create a second read API.

## Hub resources

| Hub resource | Shared Core entities | Hub cap |
|---|---|---:|
| Clients | `customer`, `customer_site`, `service_document` | 100 total normalized records |
| Jobs | `job` | 100 |
| Crew | `profile` | 100 |
| Equipment | `equipment` | 100 |

Client-site street addresses are intentionally omitted from the Hub projection. Client/site identity,
job scheduling identity, active workforce identity, active equipment identity, and service-document
references are normalized to bounded fields.

## Security boundary

- remote Yard Workers/Supabase origins require HTTPS
- HTTP is accepted only for localhost/loopback tests
- the browser never receives the access token or API key
- the Hub accepts no arbitrary upstream URL, method, entities, module, headers, or request body
- the client calls exactly one code-owned read-only endpoint
- every request uses the existing Yard Workers Jobs module view authority
- response payloads must explicitly confirm `read_only: true`
- connector status is configuration-only and makes no network request
- writes continue to fail closed through the Build 036 base connector
- upstream authentication/provider errors are sanitized before reaching the browser

## Runtime configuration

Preferred Build 020 secrets:

- `yardworkers.access_token` — **Yard Workers access token**
- `yardworkers.anon_key` — **Yard Workers API key**

Environment fallback:

- `YARDWORKERS_BASE_URL=https://jmqvkgiqlimdhcofwkxr.supabase.co`
- `YARDWORKERS_ACCESS_TOKEN=<current signed-in user JWT>`
- `YARDWORKERS_ANON_KEY=<Supabase anon/publishable key>`
- `YARDWORKERS_TIMEOUT_SECONDS=8`

The access-token user must be active and have Jobs module view permission. The connector may remain
unconfigured without blocking Hub startup or deployment.

## UI and help

The Business page exposes **Read Clients**, **Read Jobs**, **Read Crew**, and **Read Equipment** when
both Yard Workers credentials are configured. The circled-i Business help documents setup, token
refresh, Jobs permission, read-only behavior, and troubleshooting.

## Tests

Build 039 covers:

- remote HTTPS enforcement with loopback-only HTTP
- exact POST path and fixed `jobs` module authority
- bounded read limits
- backend-only Bearer and API-key headers
- CR/LF header-injection rejection
- response read-only confirmation
- response normalization and client-site street-address minimization
- sanitized authentication failures
- registry/API activation and environment secret resolution
- Business UI Yard Workers live preview
- inherited write blocking

## Database and dependency impact

- no Hub database migration
- no Yard Workers database migration
- no Yard Workers source change
- no new package dependency
- no new paid service

## Promotion evidence

To be completed after feature dev CI, protected-main promotion, Production validation, release
closeout, and final dev synchronization are GREEN.
