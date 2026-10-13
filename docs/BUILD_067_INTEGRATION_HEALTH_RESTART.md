# Build 067 — Integration Health Evidence & Safe Remediation Readiness

## What changed
Owner/administrator **System** now has a manual **Check integration health** action.
It uses existing authenticated/read-only API status routes for Home Assistant,
MQTT, Ollama, Frigate and go2rtc (plus camera registry summary). It reports
five independent observations from this browser session, including failed
status requests, without echoing exception strings, credentials, URLs or
device addresses. A successful status API is **not** proof that actual device
commands, camera frames, or model generation succeed.

There is no background monitor, no automatic remediation, no database or
configuration write, and no polling without operator action.

## Restart Hub applications from the Windows desktop client
When opened inside the **Tauri Windows desktop app**, an additional
**Restart Hub applications** panel is available on System for an authenticated
owner or administrator. When the backend is unavailable, the desktop-only
recovery control also appears on the backend-error screen. The normal web
browser never gets these native process controls.

- **Restart backend app**: click and type `RESTART HUB BACKEND`. Native
  Tauri invokes the existing `scripts/restart-hub-backend.ps1 -Action Restart`
  directly in a separately tracked Windows PowerShell process. That script
  checks the actual loopback port 8765 process identity before stopping it.
  It does not migrate the database, update Git, or touch Home Assistant,
  MQTT, Ollama, Windows or camera processes.
- **Check backend restart status**: reports running, script-completed,
  failed or idle from the desktop's tracked process. A script-completed
  report is *not* a substitute for refreshing and checking `/health`,
  `/version` and actual connected devices.
- **Restart desktop client**: click and type `RESTART HUB CLIENT`;
  native Tauri requests an app relaunch. Save any unsaved edits first.

The desktop app does **not** restart the operating system. No generic
shell command, script path, argument string or PID comes from web UI input.
Duplicate backend restarts are rejected while a tracked maintenance process
is still running.

### Standalone .exe setup

The existing repository scripts are required. When the executable is
launched outside the repository tree (for instance from Desktop), define
the Windows user environment variable `ROSEVEAR_AI_HUB_ROOT` to the
**trusted Rosevear AI Hub Git checkout folder** on the **same Windows PC**
before launching the client. The native command verifies that the expected
repository manifest and helper scripts exist and refuses missing/symlinked
scripts. For local desktop development and executables within the checkout,
the repository may be discovered automatically from the process location.

The existing maintenance script expects
`.venv\Scripts\python.exe` and will **fail safely** if absent. It refuses
to stop an unverified listener or start duplicate APIs. If a Scheduled
Task races startup, inspect `logs/hub-backend-maintenance.log`; **do not**
disable recovery tasks automatically. An operator may need to pause the
known recovery task according to the release runbook.

If the client cannot open, relaunch it using the usual desktop shortcut
or launcher; a stopped desktop executable cannot serve its own buttons.

## Acceptance and security
- Tauri rust handler requires an exact typed confirmation and uses
  fixed native command arguments with no browser-accessible shell API.
- React tests prove no machine actions in a normal web browser and
  no hidden startup action; endpoint errors never display raw secrets.
- The existing Windows backend identity script remains the single
  authority for process selection.
- GitHub CI compiles the Windows desktop executable and tests the frontend.
- These checks certify **code build only**; an operator must still deploy
  the new executable on the household PC and verify real backend/client
  restart and reconnect. GitHub GREEN does not imply real Windows adoption.

Next proposed: **Build 068 — Supervised Restart Acceptance & Runtime Recovery Evidence**.
