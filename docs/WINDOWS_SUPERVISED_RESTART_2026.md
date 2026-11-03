# Rosevear AI Hub — Supervised Windows Restart Checklist (November 2026)

**Purpose:** the short, current operator procedure for a *planned restart of the existing Windows mini-server*, not a code update, task installation or automated reboot. Source CI GREEN does not mean the installed Windows checkout matches `main` or that recovery was field-verified.

**Do not run a remote restart from this document.** Perform a normal Windows **Start → Power → Restart** only when an owner is physically or privately supervising the host. A recovery HOLD calls for investigation; do not erase a database, recreate a VM, disable firewall/TLS checks or install duplicate startup tasks to make it green.

## 1 · Before restart — protect our running services

1. Save workshop/business work and stop or postpone active printing, CNC, camera recording, indexing, migration, backups and other jobs requiring uninterrupted uptime. Let the original Home Assistant VM and databases shut down gracefully; no forced power-off.
2. Verify a decryptable, restorable **off-machine Hub backup** and a **separate Home Assistant VM/HA backup** with the recovery key available. The Hub backup does **not** include VirtualBox VM files, MQTT data, Ollama models, Caddy private CA, secrets, camera registrations outside the Hub DB or other device settings.
3. Open ordinary PowerShell **in the already installed, trusted Hub Git checkout** on the Windows computer. Do not assume that GitHub's latest source is installed. If a listed script is absent locally, stop that check and use the already installed documentation; do not download scripts from chat or run an unreviewed updater immediately before reboot.
4. Run each existing **read-only** preflight separately and record its classification. `HOLD` means investigate the actual cause before a *planned acceptance restart*. A managed task may legitimately be absent if this PC still uses only the original server task; don't register duplicates just to silence a HOLD.

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-startup-readiness.ps1
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-schema-readiness.ps1
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-ha-mqtt-readiness.ps1
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-startup-console.ps1
   ```

   The fourth command prints a sanitized JSON task classification for the owner-only **System → Windows Startup Console**, if that page exists on the installed version. It is not cryptographically signed.
5. Inspect **existing** Task Scheduler entries and recent results. These are **different possible tasks**, not interchangeable names:

   | Existing task | What it tells us |
   | --- | --- |
   | `Rosevear AI Server Startup` | Original owner-configured all-in-one server startup |
   | `Rosevear AI Hub Startup` | Later Hub-managed on-sign-in recovery |
   | `Rosevear AI Hub Recovery` | Later Hub-managed five-minute recovery |
   | `Rosevear AI Hub LAN Gateway` | Optional private HTTPS/Caddy gateway at sign-in |

   ```powershell
   Get-ScheduledTaskInfo -TaskName 'Rosevear AI Server Startup' -ErrorAction SilentlyContinue | Select-Object LastRunTime, LastTaskResult, NextRunTime
   Get-ScheduledTaskInfo -TaskName 'Rosevear AI Hub Startup' -ErrorAction SilentlyContinue | Select-Object LastRunTime, LastTaskResult, NextRunTime
   Get-ScheduledTaskInfo -TaskName 'Rosevear AI Hub Recovery' -ErrorAction SilentlyContinue | Select-Object LastRunTime, LastTaskResult, NextRunTime
   Get-ScheduledTaskInfo -TaskName 'Rosevear AI Hub LAN Gateway' -ErrorAction SilentlyContinue | Select-Object LastRunTime, LastTaskResult, NextRunTime
   ```

   No task's LastTaskResult of `0` proves its dependent application is healthy, and a task missing in a different deployment arrangement is not an instruction to install it.
6. **If private HTTPS is in use**, run the separate read-only gateway inspector. Unlike an older Build 117 example, its `-LanIPv4` parameter is **mandatory**. Substitute the *current private IPv4 of the Windows PC* from local Windows network settings; do not use the Home Assistant guest, Tailscale VPN or a public IP:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-reboot-readiness.ps1 -LanIPv4 '<Windows-private-LAN-IPv4>'
   ```

7. Before closing the UI, optionally open **System → Post-reboot acceptance runbook → Capture before reboot**, if installed. Save its private, code-only baseline where only we can access it. It is browser-session-only and may disappear across reboot. Never paste real device/entity IDs, tokens or private JSON into GitHub/chat.
8. Record the currently working local Hub, HA VM, MQTT, Ollama, authorized HTTPS client, camera inventory and actual video. Check the **original VirtualBox Home Assistant VM** is running with the expected EFI configuration. The Hub's sign-in/recovery tasks **do not** promise that VirtualBox will auto-start this VM.

## 2 · Normal supervised Windows restart

- Restart Windows normally while an owner can observe it. No repository script here performs a reboot or launches another guest.
- After Windows sign-in, allow the existing sign-in tasks and **at least one five-minute recovery cycle**. Do not manually start duplicate backends, Vite clients, brokers, gateways or Home Assistant VMs while they are starting.
- If no owner is available to sign in, do **not** assume the sign-in tasks will recover services before login.

## 3 · After restart — verify in dependency order

1. **Task history and local API:** repeat the read-only task and schema inspections. Confirm the already installed Hub at `http://127.0.0.1:8765/health` and `/version`. Check `logs/hub-recovery.log` if missing. An occupied port with failed health requires investigation, not a duplicate launch.
2. **Frontend:** confirm the existing Hub login/UI. Managed release slots may serve a built PWA on `127.0.0.1:8765`; the legacy Vite development client may use `127.0.0.1:5173`. **Do not require or start 5173** if the installed release uses only the built PWA.
3. **Home Assistant:** in VirtualBox, verify the *same original* VM is running with EFI and the HA UI responds. If it did not auto-start, record that fact and follow the existing owner-approved VM procedure; never create a replacement VM or import an old backup over live data to make it appear healthy.
4. **MQTT and Ollama:** confirm the Hub **Devices** and **MQTT** pages authenticate to the existing integrations, not just that TCP ports 80/1883 are open. For local Ollama, `Invoke-RestMethod 'http://127.0.0.1:11434/api/version'` verifies its service endpoint, not model availability; check a model separately if needed.
5. **Private clients:** verify Caddy HTTPS, Tailscale where applicable, correct sign-in and trusted TLS from an already authorized *other* LAN/Tailscale client. Do not click through certificate warnings, widen the listener or open router ports.
6. **Cameras and inventory:** inspect Hub registered cameras against the previous list and open each required authorized stream long enough to see **moving video**. An online go2rtc API or HA count alone does not establish a working camera.
7. **Owner comparison:** if the installed System page has **Post-reboot acceptance runbook**, import the private baseline and capture after. Compare identities, service states and actual installed version; record missing/changed devices and task results. An owner self-check is not independent Windows acceptance.

## 4 · If something did not recover

- **Stop and record the first failing dependency** (task, schema, VM, HA, MQTT, Ollama, API, built web, private HTTPS or camera). Check Task Scheduler history and the existing Hub recovery log before manual intervention.
- **Schema HOLD:** do not auto-run Alembic or replace the SQLite database. Follow the documented encrypted-backup + isolated-restore verification + supervised maintenance-lock migration procedure.
- **VM missing/not running:** examine the existing VirtualBox guest and startup arrangement. Preserve EFI settings and disk; do not create a second HA VM.
- **Gateway failure:** verify the owner-controlled task, private LAN address and built PWA readiness before any supervised retry. Never relax firewall/TLS safeguards.
- **Owner remote access unavailable:** arrange local console help instead of bypassing authentication. No repair is granted by GitHub CI.
- Record the actual installed version, start/recovery delay, working and missing services, and a safe evidence code. Decide separately whether a targeted fix is needed.

## Notes about earlier runbooks

- [Build 104](BUILD_104_SUPERVISED_RESTART_READINESS.md): two managed task identities and pre/post restart checks.
- [Build 105](BUILD_105_REBOOT_RECOVERY_DEPENDENCY_ORDERING.md): schema mismatch and guarded dependency recovery.
- [Build 106](BUILD_106_HA_MQTT_POST_REBOOT_ACCEPTANCE.md): original VM EFI and authenticated HA/MQTT acceptance.
- [Build 117](BUILD_117_POST_REBOOT_ACCEPTANCE_RUNBOOK.md): private before/after owner snapshot.
- [Build 146](BUILD_146_WINDOWS_STARTUP_RECOVERY.md): classified three-task console.
- [Windows release slots](WINDOWS_RELEASE_SLOTS.md): the **current** supervised release adoption/rollback path. The old [Build 030 test updater](TEST_SERVER_UPDATE.md) is historical and must not be used to update a current deployment.
