# Build 089 — Verification Queue Review Filter & Pending Counts

## Scope
Extend Build 088 manual verification planner with an all versus not-yet-reviewed filter and a pending-review count in the active Home, Workshop or Business context. The filter is purely presentational: independently verifying source services remains necessary regardless of temporary review marks. Refresh or change context to restore the all view; manual snapshot refresh also clears prior review acknowledgments.

## Acceptance
1. Open Operations overview, wait for a manually collected snapshot and select Not yet reviewed.
2. Mark one item reviewed in the existing manual action queue. It disappears only from the filtered planner view, not from All follow-ups.
3. Switch to All follow-ups and confirm the reviewed item is visible and still requires independent verification.
4. Change context and confirm filter reverts to All. Refresh overview and confirm the filter resets and review marks invalidate.
5. Confirm no private provider strings appear in either list; do not infer device safety, Windows reboot acceptance or repairs.

## Security and rollback
Frontend session state only. No new network requests, backend endpoints, persistence, migrations, device writes, background polling, scheduled task changes, service restarts or server reboot. Roll back frontend/test/docs via reviewed revert. Require five CI lanes on dev PR and push, isolated main PR and independent main push. Actual Windows PWA adoption remains separately unverified.

## Next queued
Build 090 — Scope to be confirmed from practical operations priorities.
