# Rosevear AI Hub — Cross-Application Authentication Incident

## Observed on the Windows installation
The API responds at http://127.0.0.1:8765/health, but protected
requests show HTTP 401 / Authentication required. Across pages, the client
can remain navigable even after a session has expired or its cookie is not
sent. A service status labelled Not verified is **not** proof the service
or device is down.

## Corrective scope
1. **Vite browser application** now proxies /api, /health and /version
   through the exact UI host, preventing localhost vs 127.0.0.1 SameSite
   session-cookie loss. No CORS wildcard or browser security exception.
2. **Packaged Windows Tauri application** retains its dedicated app origin.
   Login cookies are HttpOnly, Secure and SameSite=None **only** for the
   exact allow-listed Tauri origin; normal web sessions remain SameSite=Strict.
   Real Windows WebView2 acceptance is outstanding.
3. **Protected API responses** (standard JSON, knowledge upload/index,
   streaming chat, camera CSV and voice) propagate HTTP 401 centrally.
   The client returns to its existing sign-in surface rather than showing
   failures or fake empty states in every section.
4. **Login is confirmed** with a second authenticated status request,
   so a successful password check with a rejected cookie does not falsely
   display an authenticated UI.
5. **Contextual help button** now reserves layout height, avoiding overlap
   with Chat model selection and Cameras top actions.

## Screenshot-by-screenshot triage
- Home operations overview — protected integration requests not verified:
  authenticate and refresh the snapshot after signing in.
- Chat — 401 model/profile requests: fix local session and re-check models;
  no local model is a separate installation concern.
- Devices — 401 Home Assistant requests: fix session first; genuine VM
  reachability and Home Assistant event timeouts need separate local check.
- Cameras — 401 Frigate/camera requests: fix session first. go2rtc and
  actual streams must be tested independently; no registered cameras in a
  database is a distinct configuration issue.
- Business connectors — 401 request: same session cause; connector
  configuration remains unverified.
- MQTT — Authentication required: same session cause; test broker
  connection only after signing back in.
- Notifications — Authentication required and empty counters do not
  establish an empty notification ledger while session is rejected.
- System diagnostic cards — only Hub API shows available; protected
  statuses require login before drawing conclusions.
- Automations — Authentication required; zero rule counts are not
  authoritative until protected read succeeds.
- Confirmations — Authentication required; empty pending queue is not
  authoritative without access.
- Audit log — Authentication required; no matching events may be
  a permission/session issue, not proof of missing history.
- Secrets — Authentication required and loading state; preserve all
  secrets; never remove or re-enter credentials as an auth workaround.
- Tool registry — 401 from authenticated endpoint.
- User accounts — 401 from authenticated endpoint; never re-bootstrap
  or modify the users database to fix a missing browser cookie.
- Chat/Cameras top-right help icon — overlapping controls was a separate
  CSS layout defect.

## Scope and limits of verification
GitHub CI tests code paths in clean test environments; it does NOT
confirm that household WebView2 accepts the Tauri-origin Secure cookie
over loopback HTTP. No Windows services, VMs, credentials, local databases,
camera registrations or other private resources are changed by this patch.

If any page remains 401 after deploying this fix, confirm the exact
webview origin and a cookie round trip through /api/v1/auth/status using
local developer diagnostics (never paste raw session cookies in reports).
If AuthStatus says authenticated=false, sign in via the existing account;
never create a duplicate owner.

Do not stop the working backend or run recovery controllers as part of
this UI-only application acceptance. Next planned build remains
Build 068 — Supervised Restart Acceptance & Runtime Recovery Evidence.
