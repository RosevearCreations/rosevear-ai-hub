# Build 087 — Manual Operations Handoff Acceptance & Follow-Up Tracking

## Purpose
Extend the Build 086 opt-in private report with an explicit, session-only acknowledgement checklist for Home, Workshop and Business. The user must reveal the handoff before they may mark its review complete, may reopen review, and must repeat acceptance after changing contexts or refreshing the overview.

## Limits
The acknowledgement only means the operator reviewed the snapshot. It **never** certifies repaired devices, outstanding follow-up closure, real-world safety, Windows reboot persistence, MQTT/HA connectivity, camera acceptance or a live release installation. The existing manually reviewed follow-ups stay independent and remain unresolved until verified in their source sections.

No storage, export, polling, new endpoint, business write, device command, Scheduled Task change, service restart, Windows reboot or schema migration. The report is visible only on demand; content continues to use the existing sanitized allowlist.

## Acceptance
1. Open Operations overview and wait for a snapshot.
2. Confirm the acceptance button is disabled before the report is explicitly shown.
3. Reveal the private report, review context, timestamp, status cards and manual follow-ups; mark handoff reviewed.
4. Confirm text states reviewed-for-snapshot-only and not resolved; reopen and confirm status clears.
5. Mark reviewed again, switch context, and confirm acceptance clears and the report hides.
6. Reveal again, mark reviewed, refresh overview; confirm acceptance clears and the report hides.
7. Verify no calls, storage or external sharing are initiated from the acceptance controls.

## Release gates
Require five CI lanes on dev PR and independent dev push; isolated main PR and independent main push must each pass five lanes. Operator Windows PWA acceptance and supervised reboot remain separately deferred.

## Rollback
Revert the Build 087 frontend, React tests, and docs in a reviewed commit. No database or local host rollback required.

## Next queued
Build 088 — Scope to be confirmed from practical operator priorities.
