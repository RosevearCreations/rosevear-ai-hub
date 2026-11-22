# Build 374 — Samsung SmartThings and cross-platform device scope

**Source implemented, field HOLD.** Owner-only, manual cloud GET inventory. No
Samsung login, real account OAuth installation, provider control, SmartThings
subscription, original Windows Hub installation, physical device verification,
Android/Tizen acceptance or new paid service activated.

## Delivered

- A bounded SmartThings GET adapter for authorized device, location and room
  inventory. HTTPS pinned to api.smartthings.com, no redirects, constrained
  pagination, request timeouts and fixed failure codes for expired credentials,
  denied scopes, rate limits or unavailable cloud. No commands or polling.
- Existing AES-GCM local secret storage is available for an optional short-lived
  read token through the Hub Secrets screen. It is never returned in device
  responses. A disconnected Hub deletes its encrypted token, but actual Samsung
  token revocation must occur independently in the Samsung account.
- Exact HA SmartThings-provider ID match only. Same-name devices are labeled
  as candidates, not falsely merged. Rooms/locations and duplicate names are
  displayed; missing HA is reported independently of vendor status.
- Metadata-only successful observations (time, counts, digest) with a 15-minute
  stale state, not a claim of continuously live vendor access.
- Optimistic local owner reviewed/excluded decisions with audit; approved
  review re-reads actual vendor inventory. Offline exclusion is local only.
- Responsive owner-only device review in Home Assistant section. Additive
  migration 0035 and synthetic tests. No business/customer data copied.

## Samsung API changes and constraints

New SmartThings Personal Access Tokens are generally valid only 24 hours.
Samsung recommends registered OAuth API Access Apps for persistent access;
plan and pricing eligibility are subject to current provider policies. This
build does not register one, store refresh tokens, or purchase a plan. Real
OAuth permission consent is an explicit future acceptance dependency.

## Later original-host acceptance

1. Independently verify Windows Hub installation, existing database backup
   and installation/rollback of schema 0035.
2. In Samsung Developer Center, verify account/plan eligibility. Only if
   owner-approved, create a short-lived token with minimal read scopes such as
   devices/locations read. Do not give device execute/write scopes.
3. Store the temporary credential only via the local encrypted Secrets screen,
   never via chat, browser screenshot, source code or CI.
4. Use Home Assistant > SmartThings review > Inspect. Verify real device IDs,
   room ownership, exact HA matches, and appropriate read permission errors.
5. Perform separate Android/Tizen original-device permission field checks.
   Revoke provider credential at Samsung before removing the local token.
   Confirm stale/offline behavior and no vendor commands.

## References

- https://developer.smartthings.com/docs/getting-started/authorization-and-permissions
- https://developer.smartthings.com/docs/service-integrations/api-overview
- https://developer.smartthings.com/docs/service-integrations/query-and-list-devices
- https://developer.smartthings.com/docs/service-integrations/token-management
