# Build 103 — Focused Manual Review Checklist

Build 102 suggested the next pending manual review route. Build 103 places the same two pre-approved first-safe-check instructions directly in that route's focus card, with separate session-only controls to mark instructions **read/reviewed** and the follow-up **acknowledged**. These are the identical review marks already used by the full verification plan, manual handoff digest and private report; they are not a second checklist or a source of service status.

## Manual operator acceptance

1. Open Operations overview, Home. Confirm the next suggested route includes exactly two static guidance steps for Home Assistant. No raw connection payload, token, address or provider error should appear.
2. Show the private handoff and mark it reviewed. Mark focused guidance step one. The matching checkbox in **Next manual verification** should immediately become checked, the private handoff should show instruction one reviewed, and handoff acceptance must revert to not reviewed.
3. Uncheck that same instruction in the full verification plan. The focused checkbox must clear. Review both instructions again in the focused panel; the next-route prompt must now identify the separate pending follow-up acknowledgement.
4. Mark the focused follow-up reviewed (not resolved). The focus must advance to the next outstanding route, while the original follow-up list, handoff counters and private report use the same state. No actual service health or equipment safety has been certified.
5. Switch Home to Business or Workshop. Focused steps must change to allowlisted instructions for that context; old review marks must not carry over. Refresh overview and ensure both instruction and acknowledgement marks reset with the new manual snapshot.
6. With only optional setup outstanding, select **Needs review or unverified only**: the focus card must disappear without losing the optional item from the full private report. **All outstanding routes** must restore it.
7. Confirm clicks on instruction and acknowledgement controls do not call network APIs, start indexing, publish MQTT, operate cameras or devices, send messages, update business records or write stored review data.

## Boundaries and release

Frontend-only, session-only review UI. All route titles, sections and guidance are finite allowlisted strings; no raw provider data is echoed. All checkboxes are review notes, **not** successful execution, independent verification, a repair, permission to use equipment, or Windows server deployment acceptance.

Use the standard six release gates: dev PR five jobs, independent dev push five jobs, isolated protected-main PR five jobs, independent main push five jobs, main-to-dev history sync PR five jobs, final dev push five jobs. Roll back through a reviewed PR reverting the Build 103 component, tests, styles, roadmap and runbook. GitHub GREEN verifies repository CI only, not installation on the physical Windows test PC.

## Next

Build 104 — scope to be confirmed from Home, Workshop & Business operational priorities.
