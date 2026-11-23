# Build 379 — Family Calendar, Chores and Reminders

**Source implemented; original Windows field acceptance HOLD.**

## Functionality

A new authenticated **Calendar** Hub workspace provides a month view, household
appointment/chore/task/supply/event list, free-text supply notes, assigned
members, user-chosen local date and time, and one of seven approved IANA zones
(UTC and Canada's major zones). A `tzdata` runtime dependency provides
IANA rules on Windows. Invalid/nonexistent spring DST times and ambiguous fall
DST times are rejected; no silent one-hour shift.

- Account roles: owner, administrator and household_user may create entries;
  read_only may view permitted household entries only.
- Shared entries can be viewed by the family; private entries are disclosed
  **only to their creator and assigned family member**, even if the viewer
  is owner/admin. Private activity receipts are similarly filtered.
- Household users can assign **only themselves**. Owner/admin may assign other
  enabled household editors. Readers and disabled users cannot be assigned.
- Organizers may edit their own entries; owner/admin may edit shared entries.
  Participants may acknowledge an in-app reminder and mark an occurrence
  complete; no invisible editor or stranger can operate a private entry.
- Reminder visibility and overdue indicators are computed on a **manual
  screen open/refresh** using UTC instants; no background scheduler, OS
  notification, SMS/email, external calendar, calendar invitations, machine
  action, purchase or cross-app task creation exists.
- Explicit reminder acknowledgments are durable, actor-attributed, and
  revision-guarded; repeats and stale writes are rejected. Changing a
  schedule invalidates the old acknowledgment. Missed items remain visible
  and are **not** marked sent or acknowledged by a background process.
- Completing an entry records an immutable local receipt. For recurring
  entries it advances **one local wall-time interval** (1–365 days),
  preserving the hour across DST with explicit ambiguity rejection; previous
  completion receipts remain. It never silently skips missed occurrences.
- Archiving preserves history; timestamped local audit events exclude
  sensitive appointment details. No external outbound messages or providers.
- Additive migration `0040`; API `/api/v1/family-calendar-379`;
  frontend Calendar workspace plus type-checked client; backend/UX tests for
  roles, privacy, acknowledgments, replay, DST and overdue negative cases.

## Supervised original Windows acceptance (NOT executed by GitHub)

1. Verify restorable offline SQLite backup before applying migration 0040
   on the original Hub PC. Install current dependencies (including tzdata).
   Stop the Hub API, apply 0040, start it, and confirm /health; reload web.
   No other server, hardware, MQTT broker or printer PC restart is required.
2. Create a clearly labelled test household account and a test appointment.
   Confirm unauthorized users cannot see a **private** appointment title,
   notes, or activity history, including when signed in as a different family
   user. Confirm editor and read-only permissions.
3. On the original owner browser, select America/Toronto and date and time,
   test a past-due reminder, acknowledge once, confirm replay 409; reschedule
   and verify the acknowledgment resets. Test spring DST gap and fall fold 422.
4. Complete a recurring test chore and observe the next wall-clock occurrence.
   Check monthly display on Firefox/Windows and on a mobile device; validate
   keyboard, time-zone selection, colour themes and narrow-screen layout.
5. Verify no emails, SMS, push, calendar events, provider tasks or external
   app notifications were sent. The dashboard is **readback only**.

## Restore

Migration 0040 adds separate tables and an IANA tzdata dependency. Code
rollback can leave tables in place. **Do not downgrade blindly**, as it drops
the private calendar entries and reminder receipt history. Restore a verified
compatible backup if recovery requires database rollback. GitHub CI GREEN
does not mean the original Windows service has been updated.

## Queue

**Next proposed: Build 380 — Private AI Helper Across Home and Workshop.**
Eight numbered builds 380–387 remain, plus previously deferred radio/MQTT
bridge-provenance scope.

## Sources

- https://docs.python.org/3/library/zoneinfo.html
- https://fastapi.tiangolo.com/tutorial/security/
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
