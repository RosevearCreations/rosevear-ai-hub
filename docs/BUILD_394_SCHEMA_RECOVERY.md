# Build 394 — Original Windows schema migration and supervised cutover preparation

Known original-host report: live revision 0029, target 0040. The 11 reviewed
migrations are additive. Existing release activation explicitly refuses schema
changes and same-schema rollback cannot restore an old database. Do not bypass
those checks. No owner request to restart equipment or change passwords.

This increment adds an inspect/rehearse tool, with actual migrations on a
private online SQLite snapshot and exact pre-existing table column/row
comparisons, integrity and foreign-key checks. The migrated scratch is deleted
on normal completion; no production database, activation journal or running
service is changed. A snapshot proves only that point in time. If interrupted,
retain private scratch under restricted custody and review, never publish it.

On the original host, after protected source promotion, using a reviewed copy
of the script and its two existing helper modules, run the controller Python
with `inspect --repo-root <existing root>` or `rehearse --repo-root <existing
root> --expected-commit <exact independently GREEN main SHA>`. Rehearse
prepares the exact release in an isolated slot using the existing controller,
validates configured backup database identity, and runs the 0029-to-0040
migration only on a private temporary database. It does not perform activation.
No PowerShell execution policy changes are needed for Python invocation.

Production cutover remains a distinct supervised action: inspect actual
activation journal, launcher/task identity and loaded runtime; keep the
existing verified encrypted backup and create a fresh stopped-Hub checkpoint;
confirm an independent copy; prepare same-schema recovery and exact candidate;
stop only independently identified Hub writers and prevent their restart;
rehearse again on the final checkpoint; migrate/switch only the approved
database; verify actual loaded source, frontend marker and authenticated
journey; re-enable original recovery only after a compatible baseline is
established. If any step fails preserve originals and use a separately reviewed
data-and-runtime rollback (never automatic downgrade). Do not stop or change
Home Assistant, Mosquitto, Caddy, Ollama, camera service or workshop equipment.
An interrupted or unknown journal is HOLD, not authority to overwrite it.

Source acceptance: synthetic actual Alembic migration from 0029 to 0040 with
preserved data, deliberate row change refusal, same-path/existing destination
refusal and journal classification tests. Original-host rehearsal and cutover
are separate field evidence. No claim of installed version or field GREEN.
