# Build 214 — Private Camera Wall Health, Playback & Evidence Follow-Up

The existing private camera wall now offers a **Needs attention only** filter, source-safe health interpretations, fresh-probe and missing/stale observations, explicit last-good-frame **unverified** readback, and reversible in-session owner follow-up flags. This does not fabricate thumbnails, store snapshots or equate probes with observed video playback. Flags reset with the signed-in view; actual durable playback evidence belongs in the existing Field Playback Acceptance workflow.

Safety: the model never exposes transport addresses, source hosts, camera credentials, probe error strings or private stream URLs. Videos remain opt-in, localhost-only, single active iframe, and close when the view is hidden or transport degrades. No new camera control, probes, recording or provider writes are introduced.

Windows owner acceptance remains separate: verify the actual camera feed and browser playback, confirm privacy and room controls, document any unsupported/cloud-only routes, and retain a manual acceptance record. QL-275 remains deferred/Under Review; integration disconnected/HOLD and relay OFF.

Verification: `npm run build:214:hub:test`, `npm run web:build`, full web suite and three five-job source CI gates.
