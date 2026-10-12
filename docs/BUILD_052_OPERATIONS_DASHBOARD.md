# Build 052 — Unified Operations Dashboard & Guided Onboarding

## Scope

Version 0.0.52 turns the Home page from static foundation claims into a contextual
**read-only daily operations overview**. Home, Workshop and Business are operator
presentation filters, not backend tenancy/security scopes and not persistent
account settings. The dashboard never publishes, actuates, restarts, sends,
subscribes, writes or changes secrets.

- The Home screen displays read-only, sampled status cards from authenticated
  Home Assistant, MQTT, camera health, knowledge counts and business connector
  metadata APIs. Results are summarized as Ready, Needs review, Not configured,
  or Not verified. If a call returns 401/403/timeout, the card is Not verified,
  **not** "Offline"; raw credentials, broker hosts, RTSP URLs and provider error
  text are never displayed.
- Manual Refresh lets an operator re-check the same five GETs; navigating
  away cancels first-load requests. No background polling or metrics retention.
- The three selectable contexts filter the same safe service summaries;
  selecting a context never changes a Home Assistant area, business selection,
  tool privileges or global API configuration.
- Guided setup steps open the corresponding existing page for local account,
  Ollama, Home Assistant, MQTT, cameras, workshop knowledge or business
  connectors. No direct configuration writes or approval bypass on Home.
- Frigate is OPTIONAL, even when offline: the camera status uses the existing
  Camera Dashboard and does not claim that Frigate must be installed.
- Read-only users see a reminder that editing requires a suitable role;
  backend permission checks remain authoritative.
- Helpful state copy handles unconfigured dependencies without suggesting
  any Home Assistant/MQTT/camera writes. Home keeps local Ollama and Knowledge
  entry points and dynamic /version label from Build 048.

## Security, reliability, performance and rollback

- No migration or Windows configuration change. Existing endpoint security
  and cookies are reused; no new open API, paid service or cloud storage.
- Tests cover all-unconfigured status (not a failure), true attention
  states, unavailable/unauthorized GETs, and protection against leaking raw
  provider error strings or URLs. Full web/backend/docs/Windows suites
  remain release gates.
- Most GETs are made concurrently at initial Home render, then only on
  manual refresh, so the dashboard is not continuous monitoring. For low
  resource servers the operator can simply navigate to another page.
- Code promotion to main is not the same as deploying on our physical
  server. Verify the Windows update, restart only the API, confirm version
  0.0.52 and open Home on Templar.
- To roll back, install the prior verified main release using the documented
  controlled update procedure; no schema/data conversion is required.
  Caddy, Tailscale, cameras, Ollama, MQTT and Home Assistant remain unchanged.

## Operator acceptance

1. Open Home and switch Home / Workshop / Business. Verify a different set
   of cards appears, without altering source device/business settings.
2. Confirm "Not configured" for unused services and "Not verified" for
   inaccessible/permission-blocked calls, instead of misleading offline.
3. Select Open Devices/Cameras/Knowledge/MQTT/Business: the correct existing
   page opens without submitting a physical action.
4. Select Refresh overview and check the timestamp changes only on
   operator request.
5. Verify keyboard operation, the Home help icon, logout, and narrower
   access on a non-admin test account.
6. Retest Caddy CA trust, restricted Tailscale ACLs and an actual archive
   drill separately. These were not modified by this build.

**Next: Build 053 — Local Service Diagnostics & Guided Repair.**
