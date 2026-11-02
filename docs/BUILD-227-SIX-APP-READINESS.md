# Build 227 — Six-App Integration Contract & Nonproduction Readiness Dashboard

## Purpose and actual state

The local System > Integration screen now includes a **static, offline six-app contract matrix** for AI Data Platform, Devil n Dove, Rosie Dazzlers, Yard Workers, iCamp and Rosevear Comms Hub. It does not access any app, repository, host, local gateway or credential store. The existing separate manual HA/MQTT/Ollama/Frigate/go2rtc health reader is unchanged and is **not** evidence of six-app readiness.

Every app starts and stays **DISCONNECTED / HOLD**. The six checks for every app are **NOT INDEPENDENTLY VERIFIED**. Source CI, a static contract row, copied proof metadata, a local screenshot, or a simulated receipt never lifts a gate. We do not know a current trusted pinned source A/proof B for each app from this screen.

## Six evidence gates per application

1. Versioned read-only capabilities schema and explicit denied operations (no publishing, booking, invoicing, dispatch, messages, household devices or cameras).
2. Immutable source A revision and actual QL-246 signed Proof-B publication B, trusted signer pin/challenge, ancestry and exact-source CI independently reconciled. Historical HTTP 404 observations do not prove the current state.
3. Original independent external reviewer receipt, custody and witnessed negative tests—not a copied claim or untrusted substitute.
4. Isolated tenant and unique least-privilege nonproduction credentials, expiry, rotation and revocation verified per app; none collected here.
5. Explicitly limited private GET-only test plan for future `/api/integration/v1/health` and `/api/integration/v1/capabilities` endpoints, with device/camera denial, timebox and reversible rollback. No GETs executed.
6. Separate app-specific owner TEST permission after evidence, distinct from GitHub merges, QL-275 status or a browser checklist.

## Scope-specific exclusions

| App | Test boundary | Explicit exclusions |
| --- | --- | --- |
| AI Data Platform | Nonproduction workspace identity | No private credentials, production mutations or implicit Hub/admin authority |
| Devil n Dove | Dedicated test tenant | No Etsy/Marketplace publishing, inventory writes or customer PII |
| Rosie Dazzlers | Dedicated test tenant | No booking, payments, SMS or live customer data |
| Yard Workers | Test company | No work dispatch, job edits or invoicing |
| iCamp | Test campground | No reservation/occupancy updates, guest data or billing |
| Rosevear Comms Hub | Four-business preview | No call/SMS/dispatch or live operator assignment |

## Privacy and ownership

The dashboard has no request, upload, credentials field, connection toggle, acceptance API or secret/pin intake. Application filtering and evidence-topic selection operate only in the browser. It reports **0 authenticated gateway GETs**, **0/6 independently ready**, **private relay OFF** and **QL-275 Under Review / Deferred**. It cannot attest to external source or reviewer evidence and cannot grant owner authorization.

## Acceptance

- `npm run build:227:hub:test` verifies all six contract rows, negative forged-proof/owner claims, local filters, zero network fetches, and existing manual integration/QL-275 regressions.
- The production web build and feature → dev → main five-job GitHub CI must pass. Source GREEN means the dashboard code was promoted, **not** an installed Windows pilot or cross-application integration approval.
- Revisit original signed proof, independent custody and owner approvals only through an explicitly authorized future separate workflow. No private relay activation under this build.
