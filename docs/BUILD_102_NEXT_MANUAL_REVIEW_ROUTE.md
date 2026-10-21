# Build 102 — Next Manual Review Route

Build 101 added a priority filter to the current manual handoff review navigator. Build 102 adds one **suggested next manual review** from the visible pending routes. The suggestion uses only finite, allowlisted service names and existing navigation; it does not automatically run checks. If first-safe-check instruction reviews are pending, the prompt identifies them. Once both are marked reviewed, the prompt identifies a pending follow-up acknowledgement. Only after both kinds of review are recorded does that route disappear from the navigator.

## Manual operator acceptance

1. Open Operations overview, Home. Check that the suggested next route identifies the first pending Home service and its outstanding instruction reviews. Select **Open Devices for next manual review** and confirm only the existing Devices section opens.
2. Mark both first-safe-check instructions reviewed. The prompt should then mention the remaining follow-up acknowledgement, without claiming health or safety.
3. Mark that follow-up reviewed. The suggestion should move to the next outstanding route. Switch to Business and Workshop to verify the suggestion uses only those contexts' services.
4. With optional setup still pending, choose **Needs review or unverified only**. There must be no suggested route when the filtered list is empty; the existing no-match explanation remains. Select **All outstanding routes** to restore the optional route.
5. Open the private handoff while filtered and confirm all outstanding routes remain listed. Refresh overview and verify review marks and filter reset to the new snapshot, with a new suggestion. Confirm no raw provider errors, addresses, customer details or secrets appear.
6. Verify navigation does not trigger Home Assistant controls, MQTT messages, camera actions, indexing, notifications or business writes.

## Boundaries, rollback and release

This is a session-only frontend presentation feature. It adds no backend endpoint, persistence, schema migration, Windows task, device command, repair attempt or report transmission. A suggested route is not service verification, physical equipment safety, incident closure or Windows live installation acceptance.

Rollback with a reviewed revert PR of the Build 102 component, tests, style, roadmap and runbook changes. Release gates remain: reviewed dev PR, independent dev push, isolated protected-main candidate PR, independent main push, main-history reconciliation PR and final dev push, with five checks each. A GREEN GitHub run verifies the repository checks, **not** live hardware or server deployment.

## Next

Build 103 — scope to be confirmed from Home, Workshop & Business operational priorities.
