# Build 104 — Supervised Windows Restart Readiness & Task Identity Evidence

Build 104 prepares for a planned, *human-supervised* restart of the Windows test PC.
It adds an independent, read-only inspection for the two Hub runtime tasks
that Build 081's gateway-specific inspector does not check. It does **not**
install a task, start a service, modify Home Assistant, change automatic-login
settings, reboot the PC, or certify successful startup.

## Before restarting — record the baseline

1. **Save active work**, including unfinished workshop/business records. Confirm
   that an independently recoverable backup exists for the Hub database and
   separately for the Home Assistant VirtualBox VM and MQTT/configuration data.
   Do not assume the Hub database backup includes the VM, secrets, Ollama models
   or Caddy private CA. See `docs/BUILD_047_BACKUP_AND_RESTORE.md`.
2. From a normal PowerShell terminal as the Windows user who owns the Hub tasks,
   open the existing Hub checkout (for example
   `C:\Users\Ree\rosevearaihub`) and run:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-startup-readiness.ps1
   ```

   The result is `READY_FOR_SUPERVISED_REBOOT_TEST` only if the exact expected
   Hub sign-in task and five-minute recovery task identities, enabled states
   and triggers match. A `HOLD` (exit code 2) means **stop and investigate**
   the failing boolean; this inspector fixes nothing and prints no account,
   task command line, secrets, addresses or paths.
3. If private HTTPS is used, separately run Build 081's existing gateway
   inspector with the current *private LAN IPv4 address of the Windows PC*
   (never the VirtualBox, VPN or guest IP):

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-reboot-readiness.ps1 -LanIPv4 "<current-private-LAN-IPv4>"
   ```

   Replace the placeholder. `HOLD` requires diagnosis; its all-pass result does
   not prove reboot persistence, client certificate trust or external devices.
4. Confirm Home Assistant's VM is currently **running** in VirtualBox, and
   record its current shutdown/startup handling. **This repo does not configure
   a VirtualBox VM autostart service.** Confirm MQTT, Ollama, API, web, go2rtc,
   camera streams and the gateway *independently* while they work. Avoid
   inserting credentials into a shared report. For local Ollama, a safe
   connectivity-only check is:

   ```powershell
   Invoke-RestMethod 'http://127.0.0.1:11434/api/version'
   ```

5. Record the time and current known-good states. Make sure the HA VM and
   any active jobs can shut down cleanly before a **normal Windows Restart**;
   avoid an emergency power-off. Reboot only when an operator is available.

## After restarting and signing in

1. Distinguish **before Windows sign-in** from **after sign-in**. The Hub
   Startup and LAN Gateway tasks are user-logon tasks, not system boot
   services. The five-minute recovery task is a separate repeating task. Do
   not claim unattended-before-login availability based on these tasks.
2. Wait for Windows sign-in tasks and allow a full five-minute recovery
   interval; do not immediately start duplicate Hub processes. Repeat the
   Build 104 startup inspector and Build 081 gateway inspector. Inspect task
   history/last results locally using Task Scheduler or:

   ```powershell
   Get-ScheduledTaskInfo -TaskName 'Rosevear AI Hub Startup'
   Get-ScheduledTaskInfo -TaskName 'Rosevear AI Hub Recovery'
   Get-ScheduledTaskInfo -TaskName 'Rosevear AI Hub LAN Gateway'
   ```

3. Verify the Hub API at `http://127.0.0.1:8765/health` and the local web
   interface at `http://127.0.0.1:5173/`. Verify private HTTPS on an authorized
   client independently; test sign-in and client certificate trust.
4. In VirtualBox, verify Home Assistant VM state and the HA UI/integration.
   Check MQTT connectivity from the existing Hub/HA UI, and check Ollama
   using the local version endpoint. Verify go2rtc and actual camera streams
   independently. **Healthy Hub ports are not proof that those services work.**
5. Review `logs/hub-recovery.log` and Scheduled Task history if a Hub process
   is missing. If a port is occupied but unhealthy, do not manually launch
   duplicates; capture the failing category and investigate first. Preserve
   activation journals and database files. Do not disable existing tasks.
6. Record what recovered automatically, what needed a manual start, whether
   anything failed, and the sign-in/recovery delay. A reboot acceptance is
   confirmed only by this real-world evidence, not by green GitHub Actions.

## Test and safety contract

- `scripts/HubStartupEvidence.psm1` classifies eight required boolean checks;
  all must pass. Missing, string-valued or false evidence fails closed.
- `scripts/inspect-hub-startup-readiness.ps1` only queries fixed named tasks.
  It checks the task executable, *exact* recovery-script arguments, Windows
  task principal identity, enabled state and appropriate trigger type.
- `scripts/test-hub-startup-readiness.ps1` covers all eight single failures,
  all-pass, missing/invalid types, script syntax and a no-mutation allowlist.
  GitHub Windows CI runs it on every PR/push.
- `READY_FOR_SUPERVISED_REBOOT_TEST` is *preflight readiness* only.
  `reboot_persistence=PENDING_SUPERVISED_SERVER_REBOOT` remains until owner
  acceptance. No script changes the host.

## Next step

Build 105 should use the observed restart results to prioritize a focused,
opt-in correction, **if a gap is actually found**. In particular, a Home
Assistant VM not starting automatically requires a separate approved
VirtualBox/Windows startup design and verification; this Hub release does
not silently install one.
