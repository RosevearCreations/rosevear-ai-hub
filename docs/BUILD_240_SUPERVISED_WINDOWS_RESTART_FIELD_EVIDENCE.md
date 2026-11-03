# Build 240 — Supervised Windows Restart Field Evidence & Recovery Follow-Up

Status: **source-only owner worksheet**. A green `main` commit is not a Windows install, an actual reboot, restored services or independent physical acceptance. The owner has not yet supplied post-reboot evidence. No remotely executed restart or repair is authorized.

## Purpose

- Use the updated [supervised Windows restart checklist](WINDOWS_SUPERVISED_RESTART_2026.md) for the *existing installed PC*. The live installation may be behind this repository. Do not run a new source script unless that source is already the owner-reviewed installed version.
- Add a first-class **System → Build 240 restart worksheet** for owner-only, code-safe before/after evidence. It requires actual preflight checks, a witnessed reboot/sign-in report, at least one five-minute recovery cycle, and independent results for each dependency in the documented order.
- Permit a preflight baseline to survive the machine reboot by **copying and saving a code-only JSON handoff privately before restarting**, then importing it back after Windows sign-in. The worksheet does not persist to a server, watch the host, or contact any provider.
- Distinguish untested, partially recovered, failed, not configured and owner-reported working. A first failing dependency offers its safe next read-only check. Never turn a checkbox into authenticated evidence or automatic remediation.

## Before the real restart

1. Confirm uninterrupted workshop jobs have been stopped or postponed. Preserve in-progress backups and let the original Home Assistant VM shut down normally.
2. Personally inspect an off-machine, restore-ready Hub backup **and separately** the existing Home Assistant VM/HA backup. Keep recovery keys private. The Hub database backup alone cannot restore VirtualBox, MQTT data, models, gateway CA or camera provider setups.
3. Identify the *actually installed* Windows Hub version, existing startup/recovery Task Scheduler entries, and **the original VirtualBox HA guest / EFI identity**. Never register second tasks, import a second VM or bypass TLS to make a green status.
4. In **System → Build 240**, enter unique, metadata-only receipt codes, attest the concrete checks, record the preflight and **copy the Build 240 JSON handoff to private off-machine storage**. A browser-session-only draft will not survive the browser closing or Windows reboot on its own.
5. Follow the [revised supervised restart procedure](WINDOWS_SUPERVISED_RESTART_2026.md), not the historical Build 030 updater. Use Start → Power → Restart only under owner supervision; do not execute a reboot through this worksheet.

## After Windows sign-in

1. Allow the existing sign-in tasks and one full five-minute recovery cycle before deciding a service failed. There is **no guarantee the HA VirtualBox VM auto-starts**. Do not launch duplicate services or guests during recovery.
2. Reopen the current installed System page and import the private Build 240 JSON, if the installed version contains this feature. If it does not, keep the handoff for later and use the updated document's manual checks. A source-green release does not install itself.
3. Confirm the witnessed restart and sign-in and enter a **new distinct reboot evidence code** and actual waited minutes. This stamps only the time of the *owner's report*, not a cryptographically verified Windows boot time.
4. Observe and record these eight checks separately, with their **own unique code and local source**:

   | Sequence | Read-only check | Failure follow-up |
   | --- | --- | --- |
   | 1 | Existing scheduled startup/recovery tasks | Check actual task trigger and last result, no duplicates |
   | 2 | Hub API `/health` and `/version` on loopback | Read existing recovery log and schema; don't start another backend |
   | 3 | Real Hub login / built PWA (legacy Vite only if installed) | Distinguish built PWA from development-only port 5173 |
   | 4 | Same original Home Assistant VirtualBox VM with EFI | Check actual VM state; preserve guest/disk identity |
   | 5 | Authenticated MQTT / Hub device readback | Broker listening is insufficient; no publish/test actuation |
   | 6 | Loopback Ollama and an available local model | Service `/api/version` is not model readiness |
   | 7 | Caddy HTTPS / Tailscale from an authorized private client | Investigate trust, gateway and address without bypassing TLS |
   | 8 | Existing registered cameras and moving authorized video | Green counters/go2rtc listening are not live camera proof |

5. Export the redacted status report. **First unresolved dependency** identifies the next read-only investigation. An owner report that all eight are working is still a self-report and never closes independent Windows acceptance.

## Code and security boundaries

- `apps/web/src/windowsRestart240.ts`: deterministic evidence gates, stale/duplicate reference checks, fixed eight-dependency order, guarded code-only import/export, safe first-blocker report. No side effects.
- `apps/web/src/WindowsRestart240Panel.tsx`: semantic HTML form and keyboard-accessible dark/high-contrast worksheet, mounted in System with owner/admin gating. **No HTTP requests, scheduled task writes, OS actions, VM commands, migrations, database changes or local-storage persistence.**
- `apps/web/src/windowsRestart240.test.tsx`: zero-action defaults, preflight, five-minute wait, exact snapshot binding, duplicate receipts, failure/partial/deferred gates, cross-reboot handoff and unsafe import rejection.
- Fixed source holds remain: six-app integration **DISCONNECTED / HOLD**, private relay **OFF**, QL-275 **UNDER REVIEW**, vault **SECURITY HOLD**. No external proof, repair authorization, production Windows installation or device acceptance is fabricated.

## Owner decision after retest

Keep every genuine missing/failed/partial result **Under Review** until a specific safe reference, genuine observed symptom and separate authorized repair scope exists. Build 240 collects evidence; it does **not** approve or perform any repair. Build 241, if needed, should reconcile the actual restart findings first, not invent a new defect or issue a broad change order.
