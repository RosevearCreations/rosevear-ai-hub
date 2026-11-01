# Build 217 — Workshop Equipment Registry & Maintenance Calendar

The existing offline/manual workshop records now support owner-maintained model references and distinct accessory labels. Workstations remain the location grouping, and the maintenance planner retains due dates, assigned operators, intervals, append-only service history, and safety holds. Migration `0027` preserves older records with empty identity fields and seven-day default reminders.

Owner/Administrator can set a 0–365 day **on-screen** reminder lead time per maintenance plan; due-soon calculations use that saved lead time. No background notification delivery, equipment telemetry, auto-control, or service certification is implied. A checked service receipt can advance the schedule but never enables machinery; unsafe observations continue to block readiness.

The UI adds a printable paper-review checklist and local JSON export of the **first 200 loaded manual records** with source labels, safety-state fields and no claims of certified operation. Export is user-initiated; it is not a full backup, private vault storage or an external sync.

Acceptance: offline create/update/readback; invalid accessory and reminder rejection; migration preservation; deterministic export; owner-only writes; no machine command endpoints. Full CI must pass on the exact promoted source commit. Windows-device acceptance and QL-275 remain separate, deferred/HOLD.
