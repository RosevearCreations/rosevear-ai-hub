# Build 056 — Automations Operations Console & Safe Backend Maintenance

Version **0.0.56**. Next: **Build 057 — Workshop Equipment & Safety Readiness**.

## Purpose and boundaries

Automation operations workbench builds on existing event-engine rules, history,
audit and exact-action confirmation, not a new scheduler. It shows rule
enabled state, source/runtime configuration checks, recent observed execution,
cooldowns, dropped events, interrupted recovery count and disabled automatic
retry. No claims of next run times: current supported triggers are event-driven,
**not clock schedules**. Last run status is from the last 25 fetched records, not
a per-rule lifetime guarantee.

Owner/Admin may prepare an exact Level-2 confirmation for pausing or enabling a
rule, inspect exact arguments, approve or reject, and apply through the existing
single-use confirmation endpoint. It does **not** replay failed/uncertain
physical-world actions; Level 2/3 tools remain disallowed as autonomous actions.
Ollama unavailable must not prevent read-only ops/history access.

## Household screenshot diagnostic

The Home snapshot showed Home Assistant and MQTT **configured but unavailable**,
and no registered cameras. Treat as service or credential/network triage,
**not** as proof of a broken Hub API, and do not auto-repair or write to devices.
Use Home > Devices / MQTT to inspect errors and secret configuration without
exposing tokens, ensure Home Assistant VM and Mosquitto broker are running,
and confirm routing. Frigate is optional. Local dashboard snapshots are
not live monitoring.

## Windows: backend update/restart workflow

The user's client restart script is separate and must remain unchanged.
The old generic updater intentionally **did not restart anything**; Build 056
adds an opt-in, dedicated backend maintenance path.

1. From a saved file or double-click `scripts/Run-Hub-Backend-Update.cmd` to
   keep its console open and display failures. Or run
   `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\update-hub-backend.ps1`
   from the repo (PowerShell window already open). No blind `powershell .ps1`
   copy/paste, forced Git reset, arbitrary process termination or task changes.
2. **Pause your existing Hub recovery Scheduled Task manually**, not Home
   Assistant/Ollama. The script explicitly requires typing `PAUSED`.
   It inspects port **8765** and refuses to stop any process that is not
   approved local `.venv\Scripts\python.exe` or per-user Python 3.11
   executable, with `-m uvicorn rosevear_ai_hub.main:app` and a verified
   local Hub `/version` response, or one listening outside loopback. If another process owns the port, stop and investigate manually.
3. The backend procedure performs a controlled stop, runs the safe generic
   updater (`git fetch`, fast-forward-only merge, pip, npm/web build and
   optional backend/web tests), then starts one verified API process at
   `127.0.0.1:8765`; verifies `/version` against installed package.
   No extra client process is spawned.
4. If previously required **Build 054 Alembic 0017** is still outstanding,
   verify a **real encrypted restorable backup** first, then explicitly run
   `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\update-hub-backend.ps1 -ApplyMigrations -BackupVerified`.
   Never assert a backup merely because a test passed.
5. On failure, backend is **left stopped** (no blind fallback restart) and the
   console remains visible via the .cmd's PAUSE; inspect
   `logs\hub-backend-maintenance.log`, `hub-backend-stderr.log` and
   `hub-recovery.log`. Recover using the known-good backup/manual process,
   never overwrite live SQLite data automatically.
6. When healthy, **resume the existing recovery task manually**. Check
   `http://127.0.0.1:8765/health` and `/version` on the Windows host,
   the existing working client, and Home/Devices/MQTT status independently.

**Caution:** `update-hub-backend.ps1` uses the already-installed generic
updater in the repository. If the local source checkout is too old to contain
these scripts or has an untracked conflict, first complete the generic
fast-forward update with the updater kept *outside* the repository and
`-RepoRoot`, then run the new backend helper.

## Security, tests, rollback

No new database migration, cloud API, device write or runtime scheduler in
Build 056. Exact confirmation workflow is required for rule changes. Windows
PowerShell scripts undergo parser checks in the Windows CI lane; no CI
procedure attempts to alter actual household Scheduled Tasks or live services.
Use existing release rollback procedures, preserving rules and audit evidence.

### Build 056 backend identity hotfix

An existing Hub installation was observed serving `0.0.55` on loopback
`127.0.0.1:8765` from the operator's per-user Python 3.11 install instead
of `.venv`. The backend maintenance inspector now accepts **either exact
approved interpreter path** only if the verified Hub uvicorn module and live
`/version` service identity also match; otherwise it refuses the process.
`-Action Inspect` is read-only, and the existing recovery task must be
paused before any explicit stop/restart operation. CI now tests both accepted
startup patterns and multiple rejected impersonators. This does not prove the
physical Windows server has been migrated/restarted.
