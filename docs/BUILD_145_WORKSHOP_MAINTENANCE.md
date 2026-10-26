# Build 145 — Workshop Equipment 360 & Preventive Maintenance Planner

## Source delivery

The Workshop page now includes an Equipment 360 maintenance workbench around the existing Build 057 equipment, workstation and inspection records. The screen supports search by equipment/project/type/station, due status, project filters, last observed inspection, and a bounded due-date view. Operators can open an item to inspect its manual maintenance plan and its append-only service history.

Owner/Administrator can save one plan per equipment record:

- service interval (1–3650 days), next due instant with an **explicit timezone offset** (normalized to UTC), and assigned active non-read-only Hub operator;
- 1–12 exact, distinct checklist items, up to 20 parts/inventory references, and an owner note;
- an explicit revision. A stale edit returns `409` and cannot silently replace somebody else's newer schedule.

The original `maintenance_due_at` is updated to match the plan, keeping the existing readiness summary consistent. Once a managed plan exists, the legacy equipment PATCH endpoint refuses direct due-date changes. The plan's due date and service-event history remain separate from the safety/readiness inspection status.

The browser rejects non-existent local times during the spring daylight-saving transition. Ambiguous fall-back times should be scheduled at an unambiguous local hour and verified against the saved due date; service intervals use fixed UTC 24-hour days.

## Manual service and safety contract

The optional service ledger accepts only `checked`, `needs_service` or `unsafe` observations from an Owner/Administrator with a required written note, exact plan revision and an explicit acknowledgment that **this is not a safety certification**.

- `checked`: requires **every** plan checklist item, records parts actually used, and computes a new due date from the server's UTC service time plus the configured interval. This changes only the maintenance schedule; it **never elevates safety readiness**.
- `needs_service`: records an attention state without moving the due date or clearing a previous block.
- `unsafe`: records a blocked equipment readiness state without moving the due date. A later `checked` receipt cannot clear that block.

Each service observation is append-only and audited with previous/new due dates and operator identity. No machinery start/stop endpoint, automated scheduled job, calibration certificate, legal inspection conclusion, electrical/laser/CNC/forge permission or physical device credential is created.

The overview explicitly shows `unplanned`, `scheduled`, `due_soon` (within seven days), `overdue`, `blocked` and `disabled`. Blocked and disabled status override the display label without hiding whether the maintenance date is overdue. Because the current equipment registry is limited to its first 200 source records, counts are visibly scope-limited and cannot be represented as a complete site-wide certification.

## Database installation

Build 145 adds Alembic revision `0026_workshop_maintenance_planner.py`. It preserves all prior workshop records and adds `workshop_maintenance_plans` and `workshop_maintenance_events`. Apply it on the **actual Windows host** only after an authenticated encrypted backup and a verified restore path, with the Hub API stopped using the reviewed maintenance runbook:

`alembic upgrade head`

Source CI proves migration operation on temporary SQLite fixtures; it does **not** migrate the household Windows database or certify any machinery.

## Acceptance

`server/tests/test_workshop_maintenance.py` covers time zone offsets and UTC conversion (including DST-edge dates), stale revisions, invalid/duplicate checklist and parts references, disallowed assignees, overdue/project/search filters, denied direct legacy updates, incomplete service checklists, missing acknowledgment, audit provenance, unsafe/attention holds, role denial and migration 0025→0026. Frontend tests verify due labels, read-only visibility, plan editing, and manual event confirmation.

The independent on-premise acceptance needs the owner to verify the actual local backup, database migration, equipment inventory mappings, chosen service dates, real inspection notes and overdue views. No remote physical machine action is included.

**Next expected Build 146:** Windows Service Startup & Recovery Operations Console.
