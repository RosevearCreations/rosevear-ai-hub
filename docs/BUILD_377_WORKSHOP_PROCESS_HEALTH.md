# Build 377 — Workshop process-health command centre

**Source implementation only. Original Windows server, printer PC and physical
sensors remain FIELD_HOLD until separately witnessed.** Workshop process health
is a local-first, owner-driven overview, not an interlock, safety certification,
remote controller, active machine telemetry or unattended device discovery.

## Operator capability

- A responsive owner/administrator **Workshop → Process Health** panel displays
  the actual local equipment registry, equipment type/project/activity,
  independent inspection readiness, linked active jobs and their **owner-entered**
  progress, and maintenance due dates from the existing scheduler.
- Append-only owner process observations include a **timestamp**, reported
  operating state, progress %, temperature °C, ventilation declaration and an
  optional note. These are always labelled `OWNER_MANUAL_UNVERIFIED`.
  Historical or future-dated records over seven days/2 minutes are rejected.
  No reported temperature, progress or status ever changes the existing
  equipment safety gate or authorizes a machine action.
- Freshness is computed from the **observed** time, not receipt time. More than
  one hour old, future, missing or nonexistent manual readings are warned
  rather than shown as live or healthy. Maintenance overdue, blocked
  inspections, a reported fault or reported ventilation-off during laser,
  forge or chemical work produce explicit **review notices**.
- Previously **independently admitted** signed Build 370 printer-PC receipts
  are shown separately and expire per their signed timestamp. Only
  `octoprint_loopback` progress/temperature metadata is displayed. It is
  deliberately **not joined** to workshop equipment by a similar label or
  assumed USB/PnP source. No active OctoPrint scan, API read or camera fetch
  happens in Build 377. With no approved source, the UI says unavailable.
- Private owner/administrator authenticated API, no-store response,
  append-only audit with zero machine operations, bounded board/history and
  role, origin, stale, invalid, missing-source tests.
- Additive SQLite migration `0038`. Existing jobs, inspections, maintenance,
  reader/writer roles and execution engines are not altered.

## Field acceptance on Ree's original Windows Hub (not executed by GitHub CI)

1. Verify a restorable, off-machine database backup; shut down only the
   approved Hub API during supervised migration. Run the existing migration
   procedure to apply `0038`, verify and restart Hub. No new Windows task,
   local service, persistent poller, printer agent or startup authority is added.
2. Sign in as the existing owner on the Hub's authenticated same-origin
   Workshop page. Confirm equipment and jobs are the real local registry,
   not placeholder seeds, and missing readings appear as **unknown**.
3. Record two clearly labelled manual observations for a test equipment
   entry, one with reported ventilation off/fault. Inspect the audit trail,
   warning, history and freshness expiry; ensure no Home Assistant, MQTT,
   printer, laser, CNC, kiln or router action occurred.
4. With owner-installed, approved original printer-PC key enrollment **if
   available**, inspect a real signed Build 370 receipt and its expiry;
   verify it remains separate from physical machine identity. No signed
   receipt means **HOLD** instead of invented live temperature/progress.
5. Verify desktop/tablet/mobile text contrast, touch controls and form errors
   on the actual devices before owner field acceptance.

## Rollback

Code may be rolled back with the previous known-good protected release.
Keep database `0038` in place unless a verified backup is restored and the
new process rows are no longer needed. Never apply an irreversible downgrade
blindly: the downgrade deletes new observation history. Other application
telemetry must not be mistaken for a Hub Git code change.

## Sources

- Existing internal workshop register: `api/workshop.py`, `api/workshop_jobs.py`,
  `api/workshop_maintenance.py`
- Signed workshop source: `api/workshop_gateway370.py`
- [Home Assistant guidance on device and entity state](https://www.home-assistant.io/docs/configuration/state_object/)
- [GitHub protected branch workflows](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

**Next queued: Build 378 — Grocery ordering board and pantry.**
Numbered Build 378–387 = **10** proposals, plus displaced radio bridge
provenance work. Build 377 FIELD_HOLD does not mean a connected device or
production Windows acceptance.
