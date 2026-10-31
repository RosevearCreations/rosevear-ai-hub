# Build 208 — Exception triage, retest view persistence and owner recovery clarity

- The two-sample diagnostic comparison now offers an owner-facing changed-source triage with conservative fixed-choice manual follow-up labels. A newly responding API never proves a repaired Windows service, camera or device. No incident is automatically created.
- Windows retest filters (All, awaiting, issue persists, reported improvement) are remembered as an allowlisted choice in browser-tab `sessionStorage` for the owner. They change only visible cards, not field observations, baseline audits, engineering follow-ups or independent witness status. Invalid/stale stored values default to All.
- Owner recovery guidance explicitly explains the save-count preview, Recover action and accessible status focus. No automatic recovery, credential storage, backend change or remote action was added.

QL-275 remains **Under Review / deferred**. Integration is **DISCONNECTED/HOLD**, private relay **OFF**, authenticated gateway GETs **0**; physical Windows acceptance remains **NOT VERIFIED**.

Validation: `npm run build:208:hub:test`, `npm run web:build`, full web suite and GitHub feature/dev/exact-main workflows.

Next planned: **Build 209 — Diagnostic Triage Priority Readback, Retest View Recovery Controls & Standard Theme Owner Review Completion Follow-Up (QL-275 Deferred).**

The owner-requested 20-build forward queue, **Builds 209–228**, is defined in [`BUILD_QUEUE_209_228.md`](BUILD_QUEUE_209_228.md). These are planned requirements, not source or installed-Windows completion claims.
