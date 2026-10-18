# Build 088 — Manual Follow-Up Verification Planner

## Scope
In the existing authenticated Home / Workshop / Business operations dashboard, show a read-only verification plan for the current manual status snapshot. Each known, context-scoped suggested follow-up provides navigation to its existing source section. A review acknowledgment does not hide a task or count as verified, resolved, safe or repaired. On manual refresh the underlying review acknowledgments reset as before.

## Operator acceptance
1. Open Operations overview and wait for the manual snapshot.
2. Confirm known suggested follow-ups appear in context and navigate only to the expected section.
3. Mark a follow-up reviewed. It must remain in the planner, explicitly requiring independent verification.
4. Change context. Do not display another context's follow-up.
5. Refresh; see the current snapshot and reset review state. No history is persisted.
6. Confirm no provider error payload, token, private account information, URL or credentials appear in the planner.

## Security, migration and rollback
Pure frontend reuse of existing sanitized, finite follow-up keys; no backend endpoint, network request beyond the existing manual snapshot, storage, migration, business write, HA/MQTT/camera/laser/CNC control, Task Scheduler change, process restart, or server reboot. Roll back by reverting the frontend/test/docs commit. Five CI jobs on dev PR, independent dev push, main PR and independent main push required for code GREEN. Windows PWA adoption and physical reboot acceptance remain separate, unverified checks.

## Next queued
Build 089 — scope to be confirmed from operational priorities.
