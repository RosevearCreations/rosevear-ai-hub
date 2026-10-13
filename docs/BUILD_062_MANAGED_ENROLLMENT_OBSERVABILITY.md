# Build 062 — Managed Enrollment Acceptance & Update Observability

## Goal and security

The authenticated owner/admin System page provides an explicitly refreshed,
read-only local snapshot at `GET /api/v1/system/release-observability`.
A login test or GitHub GREEN does not prove the Windows server has installed,
started, rolled back or validated any release. No background polling is added.

The server reads only four bounded, non-symlinked local metadata JSON files
and a static Windows Scheduled Task/Event Log inspector. Only known enum states,
40-character SHA identifiers, and validated UTC timestamps are returned;
no raw error, Windows user, task arguments, passwords, file paths, .env values,
event messages, service identifiers or task identity are returned to the browser.
Malformed, missing and unknown results classify as unavailable/unverified.
Responses are no-store and the endpoint uses existing owner/admin auth.

The Windows inspector classifies the fixed Release Adoption task as
not_installed/configured/disabled/mismatch/unavailable, the fixed Recovery
task as enabled/disabled/mismatch/unavailable, and recent Application event
610 as present/none/unavailable. It never changes a task, event, backup,
database or running process. The task is called configured only when it
matches the expected script and Interactive/Highest/IgnoreNew policy.

## Owner acceptance steps (without Codex)

1. Open Hub → System → Managed release & update status → Refresh.
2. If Release Adoption is not installed, do **not** interpret it as enabled;
   verify actual Windows cutover, rollback exercise and private backup
   acceptance before using the existing opt-in installer.
3. If HOLD, FAILED or ROLLBACK_FAILED, inspect on the server:
   `logs/hub-release-adoption.json`, `logs/hub-release-adoption.log`,
   the recovery journal and Windows Application event ID 610.
4. Run `scripts/Run-Hub-Release-Assurance.cmd` for the Build 061 read-only
   metadata checklist. Confirm the real runtime SHA/version, schema and a
   **different same-schema retained release** through supervised failover and
   re-adoption; a metadata pointer is not a rollback test.
5. Check a current encrypted backup's actual private restore, escrow access,
   and a separate-machine copy when possible. D: is a different physical
   drive in the same computer and not whole-machine recovery.
6. After all prerequisites are independently verified, the existing
   `scripts/install-hub-auto-update.ps1 -Install` can enroll the hourly
   task locally with explicit operator authorization. This build does not
   enroll it or execute a live server command.

No SQL migration, secrets, outbound notification, remote access, new
service, Windows task installation, schema downgrade or Home Assistant/MQTT/
Ollama/camera write is included. Revert the panel/endpoint/inspector alone
if needed; do not reset the Hub, stash, database or rollback checkpoints.

## Tests and next queued

Backend tests exercise no-store owner-only permissions and malformed/oversized
JSON, secret redaction, status classification and no writes. Web tests confirm
manual refresh and no exposed restart control. CI validates Windows PowerShell
parsing and preserves all five existing jobs.

Next: **Build 063 — Release Health Cohorts & Supervised Recovery Evidence**.
