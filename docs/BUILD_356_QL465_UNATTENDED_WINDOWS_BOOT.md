# Rosevear AI Hub Build 356 / QL-465 — unattended original-host boot

## Requirement

Normal Windows reboots MUST recover approved components WITHOUT a human signing in, opening PowerShell, manually restoring a VM, starting programs, or pulling source code. One-time enrollment and a real unattended reboot acceptance are required. GitHub deployment does not configure the physical PC.

## Ground truth from the actual host

- Original PC: DESKTOP-AE894KC; Tailscale RUNNING and AUTOMATIC.
- Hub API Python on 127.0.0.1:8765, web Node on 127.0.0.1:5173, go2rtc on 127.0.0.1:1984, Ollama on 127.0.0.1:11434; private LAN Caddy on 192.168.68.74:8443. These are listener observations, not boot persistence.
- Rosevear AI Hub Startup and LAN Gateway are LOGON/interactive tasks. Rosevear AI Hub Recovery was installed by schtasks /IT, so running every five minutes does NOT prove unattended before-login recovery.
- The obsolete Rosevear AI Server Startup remains DISABLED and MUST NOT be revived.
- Three-Master QL460 Observer NOT_INSTALLED; its required original-host, machine-scope signer/ledger configuration missing.
- Rosevear-AIDataPlatform, Rosevear-AIHub and Rosevear-CommsHub are NOT_INSTALLED as Windows services.
- Home Assistant is the original VirtualBox VM, not Hyper-V. Lack of a Windows Mosquitto service/local listener on 1883 does not prove that the MQTT add-on inside the Home Assistant guest is offline; earlier deployment evidence used homeassistant.local:1883.

## Owner-enrolled unattended tasks

The new one-time installer creates two exact, initially DISABLED Windows Scheduled Tasks, both using the SAME original Windows server account with a password stored in Windows Task Scheduler, not in GitHub, task arguments or program logs. These use batch logon, not Interactive or AtLogon.

1. Rosevear AI Hub Unattended Boot — At Windows startup.
2. Rosevear AI Hub Unattended Recovery — every five minutes using a daily repeating trigger.

Both invoke scripts/boot-hub-unattended356.ps1 -Run. The worker:
- Pins the original existing Home Assistant VirtualBox VM by its UUID and checks its EFI firmware. Starts ONLY that original guest headlessly when powered off/saved; already-running guest is not duplicated; aborted/unknown state remains HOLD.
- Pins the exact currently running Ollama binary. Probes the loopback Ollama API first, only starting the pinned executable if the port is unused. Never opens Ollama to the LAN.
- Runs existing guarded hub-recovery.ps1 for the Hub API, web UI and go2rtc, preserving schema mismatch HOLD, maintenance lock and duplicate process refusal.
- Directly invokes the existing guarded private Caddy gateway launcher after the Hub is ready, avoiding its legacy login-only task.
- Leaves Tailscale to its already Automatic Windows service. MQTT comes from the original Home Assistant guest; no second broker is installed.
- Does NOT install or start the uninstalled AI Data Platform/Comms Windows workers, auto-enroll keys, run an unapproved Comms receiver, change a firewall, migrate a DB, pull repository updates or install packages.

## Stage 1 — one-time install on the original Windows server

First take separately restorable Hub and VirtualBox/Home Assistant backups; verify current signed-in owner and installed checkout. Use a genuine Windows account password, NOT Windows Hello PIN. Run in ELEVATED PowerShell as the Windows user who already owns the VirtualBox VM, Hub profile, Ollama and gateway. The installer requires the default registered VM name Home Assistant, EFI, existing VirtualBox installed in the normal Program Files location, a currently healthy Ollama process whose absolute binary path can be pinned, plus the local Hub Python venv and recovery scripts.

~~~powershell
cd C:\Users\ree\rosevearaihub
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-unattended356.ps1 -Inspect
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-unattended356.ps1 -Install
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\boot-hub-unattended356.ps1 -CheckOnly
~~~

Install prompts once for the SAME Windows user password and registers both tasks DISABLED. The pinned VM UUID and Ollama executable path contain no passwords and are stored locally in the owner's profile, not Git. An error/HOLD means stop and inspect; never invent a VM or reset the original one. The current original host is not touched by GitHub CI.

## Build 356.1 field hotfix — resume an existing owner pin

The first installer used to write the non-secret pinned configuration BEFORE prompting for the Windows password. A cancelled credential prompt or interrupted task registration could leave that valid file behind, even when no new tasks were registered. Re-running -Install would then stop with HOLD_PRIOR_PINNED_CONFIG_REQUIRES_OWNER_REVIEW.

The repaired installer REUSES a pre-existing pin only when all four expected fields, the original existing VirtualBox Home Assistant UUID/EFI, and the absolute currently running Ollama executable all match the on-device evidence. If anything differs, it still HOLDs and NEVER overwrites, deletes, or re-pins the file. A new pin is written with CreateNew, not overwrite.

From the actual original host, same elevated Windows account, after refreshing a verified clean main checkout:

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-unattended356.ps1 -Inspect
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\boot-hub-unattended356.ps1 -CheckOnly
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-unattended356.ps1 -Install
~~~

Expected when prior pin matches: EXISTING_OWNER_PIN_MATCHES_VM_AND_OLLAMA followed by Windows account password prompt and INSTALLED_DISABLED. Run -Inspect before considering -Enable. If it still HOLDs, do not rename/remove the pin or create a second VM; inspect locally with owner supervision, with secrets/absolute private paths kept off GitHub and chat.

## Stage 2 — enable once and test without an interactive logon

After inspecting the local results, in the original elevated owner session:

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-unattended356.ps1 -Enable
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-unattended356.ps1 -Inspect

# One-time supervised test of the stored-credential batch-logon context.
Start-ScheduledTask -TaskName 'Rosevear AI Hub Unattended Recovery'
Get-ScheduledTaskInfo -TaskName 'Rosevear AI Hub Unattended Recovery' |
  Select-Object LastRunTime, LastTaskResult
~~~

Inspect the bounded log at logs/hub-unattended-boot356.log and independently check the Hub HTTP /health, built PWA, approved HTTPS LAN client, HA/MQTT authenticated status, Ollama model and at least one known live camera stream. A task result 0 is insufficient by itself.

The real acceptance test is to reboot with an owner supervising and, BEFORE signing in, verify from an already authorized second LAN/Tailscale client that Hub/HA/HTTPS services are reachable. Then inspect actual task start times, source process ownership, repeated health samples and the original VM/camera inventory. Never simulate a successful reboot. Preserve all legacy working tasks as fallback until new boot tasks are proven; do not run two competing manual VM starts.

## One-time rollback

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-unattended356.ps1 -Disable
~~~

This disables only the TWO new exact tasks, never shuts down already-running Hub/VM/Ollama/Caddy/Tailscale, and leaves the old tasks available. Task removal or replacement of legacy tasks requires a separate, supervised change. A Windows account password change can invalidate the stored Task Scheduler logon and requires supervised re-enrollment.

## Cross-Master boundary

AI Data Platform Build 411/414 requires independent local worker authorization and receipts; Comms Hub private QL-340C receiver is supervised TEST only, not authorized to auto-start. Neither other Master currently has a verified installed Windows worker on this PC. Source handoffs remain open: https://github.com/RosevearCreations/ai-data-platform/issues/970 and https://github.com/RosevearCreations/rosevear-comms-hub/issues/947 . Until separately installed and independently signed/verified, their physical service and live peer health remain HOLD. QL460 monitor likewise requires original owner-pinned machine-scope settings and cannot be silently installed.

**Source CODE GREEN does not equal physical pre-login AUTOSTART GREEN.** We only claim genuine unattended startup after the actual post-reboot observation.

## Next proposed Build 357 / QL-466

Original-host unattended boot witness and recovery continuity, independently enrolled AI Data Platform/Comms workers, signed fresh peer ACK and certificate rotation completion acceptance.
