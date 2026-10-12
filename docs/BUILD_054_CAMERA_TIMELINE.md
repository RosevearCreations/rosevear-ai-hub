# Build 054 — Cameras and Event Timeline Workbench

Version **0.0.54**. Next queued: **Build 055 — Knowledge Projects & Collection Workspace**.

## Scope

- The Cameras page retains ONVIF registry, go2rtc health and existing optional
  Frigate integration. Recent local Frigate events may be filtered by camera,
  object label and review status, with newest/oldest sorting. No new polling,
  camera discovery, recording, streaming or Frigate-control operations.
- Owner/Admin can save a bounded (500-character) local event note and
  `needs_review / reviewed / flagged` state. The backend verifies the event
  appears in a bounded set of up to 100 *current* Frigate events before storing
  a note. The Hub saves only event ID, camera/label/time, note, actor and state;
  **no clips, snapshots, stream URLs or credentials** are copied.
- Owners/Admins see the local reviewed metadata index even if Frigate goes
  offline. Read-only household users can view live event summaries but cannot
  inspect local reviewer notes, save reviews or export metadata.
- A metadata-only CSV is explicitly opt-in with a user acknowledgement and
  backend `PRIVATE_METADATA_ONLY` guard; maximum 100 local review records,
  formula-injection escaping, no recorded footage. Exports include **private
  notes** and must be stored safely. There is no automatic upload or backup.
- SQLite migration `0017_camera_event_reviews` creates one local table,
  retaining notes until operator-initiated data maintenance. The source Frigate
  retention policy is independent; local notes can outlive provider events.

## Windows operator runbook

1. Confirm this build's `main` push CI is GREEN. Back up the live encrypted Hub
   database and verify the archive before applying a migration. Do not remove
   the old archive. Work on the private Windows server.
2. Save `scripts/update-rosevear-ai-hub.ps1` once. Use the generic updater
   from the repo directory. To migrate, stop **only the known Hub API service**
   with existing operator procedures (never kill arbitrary Python processes),
   then run:
   `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\update-rosevear-ai-hub.ps1 -ApplyMigrations`
3. The updater refuses dirty tracked files, divergent Git branches, unsafe
   merges and SQLite migrations while port 8765 is listening. It never
   restarts services or edits personal startup scripts, .env, camera data,
   Tailscale or Caddy. For a kept-outside-repo copy supply `-RepoRoot`.
4. Use the existing independent restart/client script. Check
   `http://127.0.0.1:8765/version` reports **0.0.54**.
5. Open Cameras, verify Frigate offline does not break the camera dashboard.
   If local Frigate is configured, review a recent event and save a note
   as Owner/Admin; confirm it persists after Refresh. Filter/sort as needed.
6. Confirm a read-only user can see event summaries but cannot read/save/export
   owner review notes. Export CSV only after consent, inspect it locally, and
   safeguard/delete the file when no longer needed.
7. Retest go2rtc listener isolation, home-network controls, authenticated
   camera access and local privacy before extending recording capability.

## Security, rollback and acceptance

No hosted storage, remote access, media download, clip export, Frigate
mutations, device automation or new public listener. CI validates role
restrictions, input bounds, no unknown event annotations, CSV guard and
formula-injection resistance, Alembic forward/reverse migration, and frontend
filters. GitHub CI is separate from physical Windows service acceptance.

Rollback code by selecting the last verified main release through a controlled
manual rollback. The `0017` table is additive; **keep its data** rather than
automatically downgrading a live database. Do not restore older database
archives on top of live data.

## Generic updater usage

`scripts/update-rosevear-ai-hub.ps1` is reused for later versions; no version
hardcoded. Run by double-click-free PowerShell command, not a scheduled task.
Use optional `-ExpectedCommit <40-character verified SHA>` to lock release.
Never combine it with a blind reset, auto-restart or production cron task.
