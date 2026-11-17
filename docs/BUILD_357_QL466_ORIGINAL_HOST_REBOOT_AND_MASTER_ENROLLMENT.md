# Rosevear AI Hub Build 357 / QL-466 — original-host pre-login acceptance, task identity reconciliation, three-Master enrollment HOLD

## Actual owner-supplied Windows evidence — November 17, 2026

Original host: DESKTOP-AE894KC.

1. Build 356.2 was fast-forwarded into the original PC's main checkout. Existing untracked package-lock.json remains preserved.
2. Existing original VirtualBox Home Assistant pin and Ollama binary independently passed local CheckOnly, with VM running and EFI pinned.
3. New password-backed Task Scheduler entries were REGISTERED by install-hub-unattended356.ps1, which returned INSTALLED_DISABLED. No original PC reboot was executed.
4. Immediately after registration, the installer -Inspect raised HOLD_UNRECOGNIZED_TASK_Rosevear AI Hub Unattended Boot. This does NOT prove task installation failed; the installer already reported success, and the readback may disagree with Task Scheduler serialization. The exact mismatching field was not recorded.
5. No verified signed original-host pre-login reboot, auto-recovery receipt, external private-LAN client witness or authenticated Home Assistant/MQTT/camera inventory continuity has yet been provided. Do not assert physical Production GREEN.
6. Cloud-hosted AI Data Platform and Comms Hub peer installation/authority remains separate. Existing source boundaries prohibit unattended starting the Comms QL-340C private TEST receiver.

## Build 357 changes

- Add scripts/HubUnattendedTaskIdentity357.ps1: PURE read-only verifier that evaluates each observed Windows task field individually and returns fixed codes (no username, executable path, argument, credential, or sensitive saved configuration).
- Update scripts/install-hub-unattended356.ps1 -Inspect: readback NO LONGER THROWS on task identity mismatch; instead returns boot/recovery task state, exact boolean check flags, identityVerified, and reason codes. The -Enable and -Disable write paths REMAIN fail-closed; an unknown task still produces HOLD_UNRECOGNIZED_TASK with its first bounded reason code.
- Add scripts/inspect-original-host-acceptance357.ps1 -Phase BeforeReboot or AfterReboot. It reports task run since the current real Windows boot, LastTaskResult=0 separately from actual local API/Ollama health, original VM pin, Tailscale service, and other Master Windows service presence. ALL independent signed/reboot/peer-ACK flags remain FALSE because running this script on the machine is not an independent witness.
- Add Windows CI in-memory ScheduledTasks CIM fixtures with real New-ScheduledTaskAction, New-ScheduledTaskTrigger and New-ScheduledTaskPrincipal objects, verifying positive and negative task identity cases without registering a real task. This is a code+Windows module confidence test, NOT original-PC acceptance.

## Safe original-host field procedure, no reboot yet

On DESKTOP-AE894KC, from its EXISTING local checkout and the correct Windows user:

~~~powershell
cd C:\Users\ree\rosevearaihub
git status --short --branch
git pull --ff-only origin main

# Read-only inspector; returns specific mismatch codes and task states.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-hub-unattended356.ps1 -Inspect

# Read-only before-reboot acceptance snapshot.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-original-host-acceptance357.ps1 -Phase BeforeReboot
~~~

Do not run -Install again while tasks of those names already exist. Do not run -Enable until BOTH task identities are verified under the same original account, the tasks remain Disabled, the private backup, Home Assistant guest/VM EFI, MQTT, Ollama, Hub schema, cameras and HTTPS private LAN readiness are reviewed. If the code reports ACCOUNT_SID_MISMATCH, ARGUMENTS_MISMATCH, EXECUTABLE_MISMATCH, TASK_PATH_MISMATCH or PASSWORD_LOGON_MISMATCH, preserve the tasks and investigate Windows-reported shape; do not edit task actions, change credentials, delete, rename, reset or replace an unknown task to force green. Share ONLY the fixed reason codes and booleans, never the actual action command or account identifier.

The installer deliberately does not auto-enable merely because a match is found. Successful task registration != pre-login boot proof. The existing disabled legacy Rosevear AI Server Startup must remain disabled and QL-340C Comms private receiver MUST remain OFF.

## Supervised live acceptance and recovery rollback (PENDING ORIGINAL PC)

Only after signed owner approval and healthy independently checked backups and application dependencies:

1. Inspect both task identities, original account password-backed task logon, exact Boot/Time trigger and five-minute indefinite recovery pattern. Confirm initial disabled state and retained fallback logon tasks. Signer PIN and paths remain local.
2. Independently enable only both approved tasks with the guarded existing -Enable command. First run a supervised one-time scheduled recovery via Task Scheduler and compare task history and actual API/PWA/Ollama/HA/MQTT/Caddy/camera health. No duplicate VM or process; no automatic DB migration or network change.
3. Before any reboot, arrange an OWNER-SUPERVISED Windows restart with verified off-machine Hub backup and separate HA/VirtualBox backup. From an already trusted OTHER LAN/Tailscale device, witness Hub HTTPS and HA while the Windows console remains on its login screen. Record an independent time-bound witness outside this local reporting script. No test may claim completion if Windows sign-in was required.
4. After login, use inspect-original-host-acceptance357.ps1 -Phase AfterReboot and Task Scheduler history to independently corroborate task run times occurred AFTER the real OS boot. Verify full authenticated device/camera continuity, no duplicate services, peer status and safe rollback.
5. If the new schedule fails, DISABLE only verified known new task identities with the existing -Disable command; preserve original VM, running services and original fallback tasks. A mismatched/unknown task identity must be reviewed individually by the owner rather than force-removed.
6. Final physical-host status remains HOLD until real independent reboot/witness, recovered local app health, and separately signed Master peer health.

## Independently authorized Master worker enrollment — not auto-activated

- **AI Data Platform:** Original source issues require actual installed Windows worker identity, independent owner/custodian authorization, pinned mTLS peer, durable events and independently signed ACK. A Vercel GREEN is not an installed original-PC worker.
- **Rosevear Comms Hub:** Confirm whether a separately installed NON-RECEIVER Windows worker is even required. Never auto-run the QL-340C private TEST receiver, enable a signing key, or treat an unverified read-only sink URL as implemented.
- **Hub:** Windows task registration does not establish the two peer worker installations, authenticated transport or cross-Master 24/7 acceptance. Local-only read-only evidence is not sufficient for external receipt.

Cross-Master source requests: https://github.com/RosevearCreations/ai-data-platform/issues/970 and https://github.com/RosevearCreations/rosevear-comms-hub/issues/947 . Independent worker enrollment remains HOLD / NOT VERIFIED until each product supplies its real installer contract and separately approved authority; avoid synchronized releases.

## Status

- Code / source promotion: pending protected GitHub release gates and independent main push.
- Physical Windows tasks: installed per owner output but readback identity mismatch is **unresolved until diagnostic output**.
- Host autostart / post-reboot acceptance: NOT VERIFIED; no reboot is initiated by this build.
- Master peer service enrollment and live signed ACK: NOT VERIFIED.
- No secret values exposed, no host task/VM/firewall/certificate/DB alterations remotely made.

## Next proposed: Build 358 / QL-467

Owner-witnessed task identity remediation, independent pre-login reboot proof, dry-run recovery comparison and separately approved independent AI Data/Comms worker enrollment after receipt contracts are verified.
