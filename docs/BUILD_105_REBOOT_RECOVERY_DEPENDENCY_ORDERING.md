# Build 105 — Reboot Recovery Dependency Ordering & Database Readiness

## Field incident that motivated this release

During the **2026-10-21 supervised Windows restart**, the existing repeating
Hub recovery task returned `1` with no new recovery-log entry. The API on
`127.0.0.1:8765` was offline. The existing checkout expected Alembic revision
`0022`, but the live SQLite database was at `0018`. The guarded
`inspect-schema` call correctly refused to start the application. This was
**not** a Windows execution-policy or Task Scheduler action-identity failure.

The operator created and verified a new encrypted `.hubbackup`, successfully
restored it to a separate directory, then supervised upgrades `0018` through
`0022` while holding the maintenance lock. The recovery task subsequently
returned `0`; Hub API, local Vite, and the go2rtc API were healthy.

The LAN gateway's earlier sign-in-only attempt had already timed out while the
Hub was offline. With the built PWA readiness endpoints healthy, the operator
manually started the existing gateway task. It returned `0`, and a separate LAN
computer could reach the Hub. Ollama's local `/api/version` endpoint also
responded. These are **field observations**, not a claim that GitHub CI tested
the physical server or that every camera/MQTT integration is accepted.

## Implemented correction

1. Before a planned Windows reboot, use
   `scripts/inspect-hub-schema-readiness.ps1` alongside Build 104's existing
   task inspector. It invokes the release manager's **read-only** schema
   comparison and reports `READY_SCHEMA_MATCH` or a bounded `HOLD`. It does
   not migrate the database, stop a service, update source, or alter tasks.
   The release manager briefly holds a local controller lock.
2. Legacy `hub-recovery.ps1` now records a sanitized `HOLD` in
   `logs/hub-recovery.log` and exits `2` when the schema comparison fails.
   It must **never** auto-run Alembic migrations or bypass the compatibility
   check. The existing encrypted backup, isolated restore verification,
   maintenance lock and supervised migration remain required.
3. At the **end of a successful non-check-only** recovery pass, the Hub checks
   the local API health and the built PWA index **and** manifest. If healthy,
   no HTTPS gateway listener is present, and the *exact owner-controlled*
   scheduled gateway task exists, is enabled, and is ready, it asks Task
   Scheduler to retry that existing task. The task's own Caddy/firewall,
   certificate, local IP and process ownership guards remain unchanged.
4. A missing/disabled/unfamiliar/busy task, occupied gateway port, failed
   PWA probe or failed dispatch is a bounded **gateway HOLD**, not permission
   to create or edit another task. The core API/web recovery can still finish
   successfully. With the existing five-minute recovery schedule, another
   safe check happens after readiness changes; no extra scheduled task,
   network binding, firewall rule or cloud infrastructure is installed.

## Install/acceptance boundaries

- Merging GREEN to GitHub `main` changes **source only**. It does not update
  `C:\Users\Ree\rosevearaihub`, run migrations, reboot Windows or silently
  reconfigure Home Assistant/VirtualBox, MQTT, Ollama, go2rtc, Caddy or the
  LAN firewall. The server was observed using Build 085 code during this
  incident. Installation is a separate owner-supervised action using the
  existing guarded Windows update workflow, after protecting local changes.
- Before installing or rebooting, verify a decryptable off-machine backup,
  protected recovery secret and the current running services. The Build 047
  backup excludes the Home Assistant VM, MQTT storage, Ollama models,
  credentials, and the private certificate authority.
- After installing Build 105 on the Windows PC, run in a normal PowerShell
  window from the repository root:

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-startup-readiness.ps1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-schema-readiness.ps1
  ```

- Only after both checks pass should the operator approve another supervised
  reboot. After Windows login, allow at least one five-minute recovery cycle.
  Check **three distinct task results**, local API and built PWA, actual LAN
  client sign-in, VirtualBox Home Assistant state, MQTT, Ollama, go2rtc and
  real camera streams. A healthy go2rtc API alone is not a camera-stream test.
- Missing Home Assistant VM unattended startup remains a separate, opt-in
  Windows/VirtualBox task; this build does not claim to solve it.

## CI contract

`scripts/test-hub-build-105.ps1` executes pure gateway eligibility tests for
ready, check-only, not-ready PWA, unknown task ownership, disabled/busy task,
and occupied HTTPS port. It parses the PowerShell scripts and asserts that
this implementation does not create tasks, change network policy, start
unverified processes, or automatically migrate data. CI does not emulate
the owner's actual Windows installation or external clients.

## Next proposed

Build 106 — Home Assistant VM & MQTT Post-Reboot Dependency Acceptance.
