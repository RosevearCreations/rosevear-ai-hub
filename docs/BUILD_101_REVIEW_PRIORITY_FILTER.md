# Build 101 — Manual Review Priority Filter

Build 100 exposed remaining manual review routes. Build 101 adds **two explicit views** to its operator-only on-screen navigator: All outstanding routes, or Needs review or unverified only. The latter includes only known services from the current manual snapshot in review/verify categories. It hides optional setup from the visible list without treating optional setup as an incident or certifying health. The private copyable handoff ALWAYS retains all pending routes, irrespective of the on-screen filter.

## Manual operator acceptance
1. Open Home Operations overview with current manual snapshot. In the Handoff acceptance navigator choose Needs review or unverified only. Only status categories that report attention or could not be verified remain; optional camera setup disappears visually.
2. Select All outstanding routes. Confirm optional pending setup reappears with normal review instructions.
3. Review both safe checks and mark reviewed for each attention/unverified follow-up, leaving optional setup pending. In priority filter, check the explicit no-match explanation: optional review debt still exists, no physical service verification has occurred. All mode must show the optional route.
4. Open the private copyable handoff while filtered. Confirm the omitted optional route remains in the handoff text.
5. Change Home > Business > Workshop (if desired): filter always returns to All. Filter again, then Refresh overview: filter resets with manual snapshot. No raw provider errors, addresses or credentials must be visible.
6. Confirm filter interaction neither communicates with services nor runs device, camera, MQTT or business commands.

## Safety, privacy and rollback
Frontend-only; uses static allowlisted service title/category/section data. No new backend or network calls, persistence, schema migration, Windows service task, device automation, business writes, or automatic report transmission. Review marks never certify service availability, repair, or equipment safety. Code CI GREEN cannot establish physical Windows installation.

Rollback via standard reviewed PR reverting the Build 101 component/tests/CSS/roadmap/runbook files. Release gates: development PR, independent dev push, isolated protected-main candidate PR, independent main push, main history reconciliation PR and final dev push — five required checks each.

## Next
Build 102 — scope to be confirmed from Home, Workshop & Business operational priorities.
