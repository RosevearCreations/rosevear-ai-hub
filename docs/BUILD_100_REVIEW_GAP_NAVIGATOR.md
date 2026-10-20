# Build 100 — Operator Review Gap Navigator

Build 099 counted outstanding follow-up and instruction reviews. Build 100 adds a finite manual review navigator next to handoff acceptance and a corresponding privacy-safe route list in the private handoff report. Only static, allowlisted service names/sections are used; user/provider titles, addresses, errors and credentials never appear in navigator copy.

## Operator acceptance
1. Open Operations overview, Home; verify outstanding Home Assistant, MQTT and Camera manual routes when sampled statuses require follow-up.
2. Select Open Devices for manual review. It only navigates to the existing Devices UI. No commands or repairs run.
3. Review both Home Assistant instruction checkboxes and mark that follow-up reviewed. Its route disappears; others remain pending. Acknowledging only one aspect must not hide it.
4. Open the private handoff. Confirm its routes match the UI and contain no private raw provider content.
5. Switch to Business or Workshop. Verify no cross-context routes appear. Refresh to discard transient marks and resample statuses.
6. Mark every suggested review complete. The empty-route state must still require independent real-world source verification; not a repair, safety clearance, or incident closeout.

## Boundaries / rollback
Frontend-only and existing onNavigate section callback. No new backend, storage, OS actions, network writes, MQTT publish, camera actions, credential access, business data mutation or automatic handoff transmission. Review flags reset as before on context switch/refresh.

Rollback via reviewed PR reverting the Build 100 frontend/tests/CSS/roadmap/runbook changes. Gates: dev PR, independent dev push, isolated protected-main PR, independent main push, main-history sync PR, final dev push. GREEN GitHub CI does not prove actual Windows server installation or operation.

## Next
Build 101 — scope to be confirmed from Home, Workshop & Business operational priorities.
