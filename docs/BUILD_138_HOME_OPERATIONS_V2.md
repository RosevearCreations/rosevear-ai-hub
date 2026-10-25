# Build 138 — Home Operations V2: Rooms, Health & Quick Navigation

## Delivered functionality

- The signed-in Home screen now starts with a practical read-only operations command center. Home, Cameras, Workshop and Services categories expose buttons to existing screens; Workshop administration remains restricted to owner/administrator roles.
- A manually refreshed health strip summarizes the Hub `/health`, Home Assistant, MQTT, camera dashboard and Ollama endpoints, each with an observation timestamp and explicit unavailable / not configured / needs review states. It distinguishes stale previous observations from the current in-progress refresh.
- The existing authenticated Home Assistant browser supplies bounded room names and registered device/entity counts. These counts are directory observations, not assertions that a device is live or safe. A room selector filters the visible cards; each room routes to the existing Devices browser (not a fictitious deep link).
- Responsive card and navigation layout, keyboard-focus treatment and circled-i inline help supplement the existing Home Help topic. The older operations comparison, manual follow-ups, handoff and verification workbench remain intact below the new command center.

## Security and observation boundaries

- No physical commands, automation triggers, MQTT publish, camera stream start, secrets mutation, new database storage or credential exposure are introduced. The component handles only safe derived counts, states and vetted room labels; never render raw backend errors or service configurations.
- Room labels resembling URLs, credentials or multiline data are replaced by generic indexed room labels. The browser read is bounded to the first 100 area records and the dashboard to 12 cards at a time. Full data remains available through existing authenticated Devices access.
- Read-only, household and administrative roles see only destinations already available under the existing App section routing. This display never elevates permissions.
- All status calls use the same explicitly refreshed, abortable snapshot. A failed individual API call is “Not verified,” not “Healthy.” Each source's displayed timestamp means the most recent completed overview request, not continuous telemetry. The Hub OK state describes its endpoint only.
- Passing test/CI and merging `main` do not imply live installation or field acceptance on the local Windows PC, Home Assistant VM, cameras or connected equipment. The first-party vault remains SECURITY HOLD with 0/6 real security gates verified.

## Verification

- New isolated model and rendered UI regression tests cover successful/failed/partial sources, sanitization, room inventory filtering, contextual routing, role restrictions, stale/refresh wording and absence of control/secret leakage.
- Existing dashboard tests continue to cover snapshot comparison, manual verification and handoff boundaries.
- Run `npm run web:typecheck`, `npm run web:test`, `npm run web:build`, and `git diff --check`; then require all five independent GitHub checks for feature, `dev` push and `main` push before declaring source production GREEN.

## Next queued build

Build 139 — Device 360 Registry, Identity Matching & Room Assignment. Review identity provenance before matching devices; no automatic device adoption or physical action.
