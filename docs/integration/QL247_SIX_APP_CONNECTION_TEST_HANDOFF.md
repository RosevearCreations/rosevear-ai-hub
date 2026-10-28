# Rosevear Interconnectivity QL-247 — six-app connection-test readiness request

**Copy to each application independently. Do not include credentials, household addresses or customer data. This document grants no connection or pilot permission.**

Sharing the `RosevearCreations` GitHub organization proves neither an authenticated service identity nor successful API access. Public CI/source provenance is Phase A; independently authorized nonproduction GET tests are Phase B; a time-bounded owner-approved read-only pilot is a later **Phase C, NOT AUTHORIZED**.

| Source app | GitHub repository | Owner-safe return |
| --- | --- | --- |
| AI Data Platform | `RosevearCreations/ai-data-platform` | Source main SHA, same-SHA GREEN CI, QL-246 proof status, nonproduction gateway and no direct database sharing |
| Devil n Dove | `RosevearCreations/devilndove-site` | Source provenance; product/listing reads and Etsy/Marketplace publication writes remain disabled |
| Rosie Dazzlers | `RosevearCreations/rosiedazzlers` | Source proof PENDING until real read-only GET and independently witnessed seven denials; no booking/payment/gift/SMS mutation |
| Yard Workers | `RosevearCreations/yw` | Independently verify Build 477 promotion and genuine isolated `np-...` company tenant; no payroll, route or dispatch |
| iCamp | `RosevearCreations/iCamp` | Verify genuine isolated campground tenant; no reservations, access gates or visitor changes |
| Rosevear AI Hub | `RosevearCreations/rosevear-ai-hub` | Private runner must be separately approved/provisioned, keep LAN/private-only and disabled; no camera/device/vault/network exposure |

Rosevear Comms Hub is the future coordination gateway consumer, **not** a seventh authorized source in this QL-247 six-source proof. Its phone, SMS and live provider dispatch remain disabled.

## Phase A — public source provenance only

1. Resolve each app's **current `main` 40-hex commit SHA**, exactly corresponding GitHub Actions GREEN workflow run and immutable source revision. Do not reuse another app's CI or older source SHA.
2. Review read-only health/capability API code, nonproduction fail-closed state, business-to-tenant mapping, and audit posture. Treat locally simulated seven negatives as tests of source logic, **never external negative-witness receipts**.
3. Prepare (but do not presume readiness for) distinct app-owned Ed25519 signer. Real private key stays in its own secret manager; independent operator receives its public SPKI SHA-256 fingerprint through a **separately authenticated channel**. Never put passwords, HMAC keys, bearer tokens or private keys in source, public JSON or chat.
4. Report actual nonsecret `np-...` receipt IDs, key IDs and independently verified pin status; absent values remain `null`, `NOT PROVISIONED` or `UNVERIFIED`.
5. **Do not create** `docs/integration/ql246-source-proof.json` before genuine Phase B seven-denial observations. The signed final envelope must not be faked to satisfy a file-presence check.

## Phase B — exact authorized nonproduction connection test (not approved by this handoff)

Only after an independent owner approves exact target, source, tenant, reviewer, protected private runner, expiry, rollback and GET-only scope may operators:

1. Provision a **unique 256-bit random HMAC secret** per source/tenant/nonproduction environment in each app's approved server-side secret manager. No shared six-app HMAC and no client-side or repository secret values.
2. Make explicit authenticated protected-transport server-to-server `GET /api/integration/v1/health` and `GET /api/integration/v1/capabilities` calls using the exact QL-243 twelve-line HMAC canonicalization, timestamp ±5 minutes and atomic nonce replay prevention.
3. Have an independent reviewer actually observe target-side denial of nonce replay, stale timestamp, wrong business, wrong tenant, revoked key, forbidden write and dispatch. Preserve original nonsecret trace/receipt references, **not simulated test IDs**.
4. After restart/redeploy, independently fetch durable gateway audit/health/capability source-of-truth receipts, verify separately pinned Ed25519 keys and deployed SHA; test scoped key revocation/rotation, kill switch and rollback.
5. **Only after** the seven genuine denials are witnessed, request a fresh one-hour operator challenge, sign exact QL-246 payload in canonical field order with the actual app-specific private signer, publish public metadata and independently verify raw-byte SHA-256, immutable publication commit and audit source SHA. Reissue expired challenges; never backdate.

**QL-246 SHA clarification:** A signed `source_revision` cannot equal the SHA of the commit that contains the self-referential JSON file. Identify a reviewed immutable source commit `S` and a later immutable proof publication commit `P` separately; obtain an explicit matching verifier contract update from AI Data Platform before publishing.

## Phase C — future owner pilot approval (NOT GIVEN)

Even a verified source signature and independently witnessed nonproduction gateway test produce only a **signed-metadata HOLD**. A later independently authenticated owner decision must be per business/tenant, time-bounded, reversible and strictly read-only. No product/listing, booking/gift/payment, job/payroll, campground/gate, device/vault or phone/SMS writes are within QL-247.

## Copyable per-application truthful response

```text
Application / GitHub repository / exact current main SHA / same-SHA GREEN CI URL:
QL-246 public signed proof URL at an immutable publication SHA: PRESENT / MISSING / BLOCKED
Public JSON SHA-256 / signer ID / separately authenticated Ed25519 SPKI pin:
Business ID / real separately confirmed tenant ID / approved nonproduction origin (private detail only via approved secret channel):
Scope: GET /api/integration/v1/health and GET /api/integration/v1/capabilities only
HMAC key ID and registry/rotation receipt (NO secret): PROVISIONED / NOT PROVISIONED
Real authenticated GET health/capability receipt IDs: VERIFIED / UNVERIFIED
Seven genuine denial cases, original traces and independent witness: VERIFIED / UNVERIFIED
Durable audit after restart and independently pinned gateway signer: VERIFIED / UNVERIFIED
Private runner / rollback / key-revocation witness: VERIFIED / UNVERIFIED
Separate owner pilot approval: NOT GIVEN
Actual connection: DISCONNECTED / HOLD
Remaining exact blockers:
```

Public source material is not a grant to perform authenticated requests. **PENDING is an acceptable accurate Phase A outcome.**
