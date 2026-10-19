# Build 091 — Contextual Priority Triage Summary

## Scope
Extend the Home / Workshop / Business operations dashboard with a read-only priority triage summary based on sanitized current snapshot actions. Count needs-attention, unverified and optional setup categories separately. Display up to three already prioritized follow-ups with navigation to known sections; never call the target device or execute a repair.

## Acceptance
1. Open Operations dashboard. Await the current manually sampled snapshot.
2. Confirm the selected context's counts distinguish attention, unverified and optional setup.
3. Use the first triage link and confirm it navigates to its known section without issuing a device command.
4. Switch contexts and confirm a prior context's follow-up is not offered.
5. Confirm raw provider fields and credentials are never rendered; no success or safety claim appears.

## Safety and rollback
No new API, persistence, background network polling, data migration, Windows scheduled task, service restart, reboot, or control of Home Assistant/MQTT/cameras/laser/forge/CNC or business services. Tests cover contexts/navigation/privacy; rollback via reviewed frontend/tests/docs revert. Require 5/5 PR and push checks on dev and isolated main patch. Live Windows installation remains separately unverified.

## Next queued
Build 092 — Scope to be confirmed after verified production code promotion.
