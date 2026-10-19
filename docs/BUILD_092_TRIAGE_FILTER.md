# Build 092 — Triage Visibility Filter & Review Continuity

## Scope
Add a temporary, opt-in not-yet-reviewed toggle to the existing Home, Workshop and Business priority triage. Filtering applies only to the triage display, not the manual verification planner or underlying action queue. Manually reviewed does not mean independently verified, repaired, safe or resolved.

## Operator verification
1. Collect a manual snapshot in Operations overview and mark a follow-up reviewed.
2. Choose Show unreviewed triage only; the reviewed triage entry hides, but remains in All triage and in the independent verification planner.
3. Toggle back to All; confirm its known-section navigation is available.
4. Switch context and refresh overview; filter must default to all and reviewed marks must reset on refresh.
5. Check privacy: no raw provider details or credentials are rendered.

## Security and rollback
Frontend transient React state only. No backend endpoints, storage, background polling, migrations, credentials, device writes, Windows tasks, service restarts or reboot. Revert the four Build 092 frontend/test/documentation files through a reviewed PR. Require 5/5 CI on dev and main promotion, with independent main push verification. Actual Windows PWA adoption remains a separate owner acceptance.

## Next queued
Build 093 — Scope to be confirmed from practical Home, Workshop & Business priorities.
