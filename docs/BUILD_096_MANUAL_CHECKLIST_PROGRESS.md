# Build 096 — Manual Verification Checklist Progress

## What changes
The independent manual verification plan now shows the two **static first-safe-check instructions** from Build 095 for each current Home, Workshop or Business follow-up. An operator can tick individual instructions to note **that they reviewed the guidance**, with a count of reviewed instructions against the current queue total. These marks never mean that a step was physically completed, connectivity verified, a service repaired, a machine safe, or permission granted.

Checklist marks remain only in React memory during the current snapshot/context, survive switching the queue filter, and reset when the working context changes or a fresh manual overview snapshot is collected. Existing follow-up review flags remain separate; review and verification are deliberately different concepts. Read-only roles can review instructions locally without API writes.

## Private operator acceptance
1. Open Operations overview, select Home, and collect a manual snapshot. The "Next manual verification" section shows two separate safe-check instructions for each active follow-up and starts at 0 reviewed.
2. Tick one Home Assistant instruction; verify the count increases by one and no network, device, credential or backend mutation occurs.
3. Mark the follow-up reviewed in Today's manual follow-ups; this does **not** tick the two instruction checkboxes. Select "Not yet reviewed", then "All follow-ups": the checklist marks remain for that snapshot.
4. Switch to Business, then Workshop: the previous checklist marks reset and only that context's bounded, static instructions appear. Return Home and confirm its checklist is reset.
5. Tick a step and manually refresh overview: all checklist marks reset for the fresh snapshot. If a service becomes unknown, its instructions reflect verification-first guidance instead of guessing it is healthy.
6. Confirm raw errors, tokens, hostnames, customer records and addresses are never displayed. Confirm clicking a checkbox cannot contact a service, perform repairs, publish MQTT, command cameras or use workshop tools.

## Security, migration, rollback and release verification
Frontend-only static allowlisted copy and session-only bit flags. No new endpoints, persistent state, browser storage, polling, provider calls from checkboxes, account/credential exposure, API write, migration, backup mutation, Windows scheduled task change, host reboot, or physical machine command. All live service and physical safety acceptance stays **separate** from GitHub CI.

Rollback: revert the scoped Build 096 frontend/tests/CSS/roadmap/runbook files in a reviewed PR. No data schema rollback is necessary. Require five GitHub checks on dev PR, independent dev push, isolated protected-main production PR, and independent main push. Then reconcile production ancestry into dev and verify its own checks. Local Windows adoption is not implied by GREEN GitHub code.

## Next queued
Build 097 — scope to be selected from practical Home, Workshop & Business operator acceptance.
