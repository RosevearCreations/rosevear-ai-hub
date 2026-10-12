# Build 053 — Local Service Diagnostics & Guided Repair

**Version:** 0.0.53. **Scope:** safe owner/admin status and operator instructions.
**Next queued:** Build 054 — Cameras and Event Timeline Workbench.

## What changed

- System > Local service diagnostics samples existing Hub `/health`, authenticated
  Ollama, Home Assistant, MQTT, and authenticated go2rtc status endpoints.
- A single initial inspection is followed only by explicit **Refresh diagnostics**.
  No service polling loop, probes of arbitrary addresses, credential verification
  attempt, device write, broker publication, process inventory, automatic start,
  shutdown, restart, privilege elevation, or "repair all" action is added.
- States are **Available**, **Needs attention**, **Not configured**, and **Not
  verified**. HTTP errors, 401/403, aborted requests, missing/malformed statuses,
  and connection failures are *not* mislabelled as proven server outages.
- Diagnostics show generic status copy only, never raw response or error strings,
  provider hostnames, internal base URLs, credentials, topics or RTSP source URLs.
- go2rtc is optional; API readiness does not prove an actual camera feed works.
  Loopback-only API and RTSP listener results are checked when service responds.
- All fix instructions are user-run in PowerShell or the existing relevant
  application's own operator interface; links navigate to existing Hub views
  without submitting mutations.

## Windows operator steps

1. Install the verified release on the Hub Windows machine using the existing
   update process. Log in as Hub Owner/Admin and open **System**.
2. Select **Refresh diagnostics** after the status completes. Expand **Guided
   checks and log locations** on the service needing attention.
3. Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\hub-recovery.ps1 -CheckOnly`
   in the repository folder. This is an inspection pass (it adds lines to
   `logs\hub-recovery.log`) and **does not start services**.
4. Open `logs\hub-recovery.log`; inspect the existing **Rosevear AI Hub
   Recovery** Task Scheduler history, and compare `127.0.0.1:8765/health`,
   Ollama port 11434 and go2rtc 1984 on the Windows computer.
5. **Before a manual launch, check the listening port's owner and health**.
   An occupied but unhealthy port must not trigger a duplicate instance.
   Follow the existing `scripts\hub-recovery.ps1` and
   `scripts\start-go2rtc.ps1` runbooks only after confirming ownership
   and intended service configuration. Don't create another scheduled task.
6. Review Home Assistant inside the existing VirtualBox VM, MQTT from the
   installed broker/add-on, and Ollama using `ollama list`; separately verify
   local camera playback and never print stream credentials into logs.
7. Recheck status with **Refresh diagnostics**. If a service remains
   Not verified, review Hub sign-in/role and its local logs first; do not
   disable permissions or expose listeners to diagnose it.

## Safety and boundaries

The diagnostics panel is available only to Owner/Administrator in System.
All existing API-side authorization remains unchanged; no new endpoints,
database changes, background jobs, migrations, cloud services, firewall,
Caddy/Tailscale, or Windows scheduled task changes are needed.

Local CI validates the pure state classifier (optional/offline, missing model,
unauthorized, bad body, listener exposure), redaction, and existing backend/web/
Windows suites. Real Windows endpoints, process ownership, log availability,
Home Assistant VM operation, physical devices and camera playback are **manual
operator acceptance**; passing GitHub Actions is not proof those components
are up or the home server updated.

**Rollback:** use the prior verified main release and normal Hub update
instructions. No schema or data rollback is necessary. Leave `.env`,
local credentials, Windows tasks, certificates and external services untouched.
