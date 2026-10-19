# Build 097 — Outstanding Safe-Check Workbench

## Scope
The existing Build 096 review-only checklist gains a per-follow-up reviewed/total count and a temporary **Show outstanding safe-check instructions only** filter. In this mode reviewed instructions disappear, and fully reviewed follow-ups disappear from the *instruction view only*. Owners can always use **Show all safe-check instructions** to revisit or uncheck steps. The original review acknowledgement queue and independent verification requirement remain separate.

Only known service keys and priority categories contribute to counters; untrusted provider errors and credentials never enter checklist copy. Everything is frontend-only in the active browser session.

## Operator acceptance
1. Refresh Operations overview and open Home. Confirm each manual follow-up shows 0 of 2 instructions reviewed; total unreviewed follow-ups displays 3 when the current three service cards require follow-ups.
2. Review one safe-check instruction and enable the outstanding filter. The reviewed instruction disappears from this view; its paired unreviewed instruction remains.
3. Review the second instruction. The follow-up disappears from the outstanding view, but must reappear with both checked when Show all is selected. This is not verification that the service works.
4. Separately use Not yet reviewed in the existing follow-up queue; the two filters must not change each other's underlying review state.
5. Switch between Business, Workshop, and Home and refresh. Filter and review-only instruction flags reset. No real-world action is executed.
6. Confirm no credentials, raw provider errors, customer data, device addresses or business record details are ever shown.

## Security and rollback
React-only transient state. No background polling, API endpoints, database migrations, browser persistence, credential access, Home Assistant commands, MQTT messages, camera controls, business write, Windows task, machine restart or safety certification. Read-only roles only change their own transient checklist UI.

Add pure helper and React interaction regression tests for partial/full review, restoring all, two filters, context isolation, refresh and injected unknown keys. Revert the scoped Build 097 frontend/tests/CSS/roadmap/runbook in a reviewed PR if needed. Require 5/5 development PR, dev push, isolated main PR and main push CI, plus history synchronization back to dev. A GREEN GitHub release does not certify actual Windows installation or equipment operation.

## Next queued
Build 098 — scope to be confirmed from practical Home, Workshop and Business priorities.
