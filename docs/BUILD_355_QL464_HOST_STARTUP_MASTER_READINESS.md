# Rosevear AI Hub Build 355 / QL-464 — original-host continuous recovery and Master startup preflight

## Release boundary

**Source CODE GREEN is NOT autonomous Windows HOST GREEN.** This change is Hub-only; other Master code and remote apps remain independently deployed. This release adds a fail-closed readiness API and PowerShell preflight; **no Windows task, service, VM, local port, Tailscale, certificate, receiver or PowerShell session is modified by a GitHub release**. The Comms private receiver remains supervised TEST only, not a background autostart service. Read-only protocol 1.1 remains backward compatible with 1.0.

## What the code measures

- Original-host signed Module SCM observations are considered recent for 120 seconds, but they do not prove the services started autonomously following a reboot.
- Separate historical QL-463 **peer-signed sink receipts** are shown as history, not an online heartbeat. AI Data Platform and Comms each need their own deployed receiver, enrolled keys, actual mTLS transport and a fresh signed ACK.
- A certificate-rotation PLAN is not completion. Actual new leaf activation, new owner manifest/registry, fresh peer ACK and old-key retirement must be independently evidenced. No automatic certificate rotation or service restart.
- The QL-460 monitor is the existing continuous one-minute Windows SCM observer **only if independently installed, configured, and enabled locally**; QL-464 neither enables it nor invents a watcher heartbeat.
- The owner-only no-cache GET /api/v1/system/server-shell-355 adds a shared readiness screen and the source-gap inventory. No POST or remote execution.
- Optional PowerShell evidence can be placed in a private file and pointed to by `ROSEVEAR_QL464_STARTUP_INVENTORY_PATH` on the original host. It is UNSIGNED and only accepted as recent (<=120s) *inventory*. It never promotes unattended boot, receiver OFF or live Master health to verified.

## Critical observed gaps from source review

1. `scripts/install-hub-startup-task.ps1` creates **AtLogOn** for the current user, not at boot.
2. `scripts/install-hub-recovery-task.ps1` creates a five-minute recurring recovery task. Its actual PC state has not been independently observed. `hub-recovery.ps1` can recover the Hub API on 8765, web dev UI on 5173, and go2rtc when source and schema custody permit; it does **not** install or start the two independent Master workers.
3. `scripts/install-three-master-observer351.ps1` deliberately creates a **disabled** at-boot task for the **read-only monitor**. It does not bring up the three services.
4. `Rosevear-AIDataPlatform`, `Rosevear-AIHub` and `Rosevear-CommsHub` are logical intended Windows SCM service names. Installed/autostart status, account ownership, credentials, release install path and recovery policy still require an original-host local readback.
5. AI Data Platform's Build 411/414 code specifies three custody workers and separate authority for activation. The Comms Hub QL-340C private receiver is explicitly foreground TEST-only, never auto-enroll, and requires private owner/custodian authorization. Do not confuse public web app deployments with Windows-owned workers or start the private receiver as a shortcut.

## Owner PC: review BEFORE performing a real reboot

On `DESKTOP-AE894KC`, in the **current verified repository checkout**, run this read-only command in local PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-master-startup355.ps1
```

The JSON contains ONLY fixed service and task names, their states/trigger types, booleans for whether machine settings are present, fixed local listening ports and a bounded Home Assistant VM autostart classification. It does not print usernames, task action commands, paths, values of secrets, key material or environment values. A healthy-looking port listener is not application proof. Share only the sanitized JSON. Do NOT paste credentials or sign private keys into a chat.

Read-only follow-ups:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\inspect-hub-startup-readiness.ps1
# Once QL460's original-host owner-pinned Python path is known:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-three-master-observer351.ps1 -Inspect -PythonExecutable 'C:\Path\To\Existing\python.exe'
# Hub's guarded local runtime check (does not start anything):
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\hub-recovery.ps1 -CheckOnly -SkipCamera
```

Verify Windows service startup **Automatic** and recovery policies individually for the three genuine installed worker services if they have been independently authorized and configured. Do not run automatic service installation or flip a module enabled without the separate QL-459 signed action grant and AI Data Platform independent custodian requirements. Verify the Hyper-V Home Assistant VM's *Automatic Start Action*, Mosquitto, Ollama, Caddy HTTPS 8443 and Tailscale, but keep physical automation and Comms private receiver controls outside this preflight. `Rosevear AI Server Startup` is a documented obsolete task with a missing script path; do not re-enable it.

**Proposed boot dependency order for the owner to confirm:** Windows + Hyper-V Home Assistant VM; trusted OS network/Tailscale + broker/Caddy; installed Hub backend/API and local UI; optional Ollama/camera services; independently authorized AI Data and Comms *workers*; owner-signed and live-ACK peer transports. Remote Vercel/Cloudflare application deployments do not start as Windows processes.

## Safe PowerShell-assisted checkout refresh (owner-controlled)

After the **main** release passes all code checks, use a planned maintenance window and first inspect each existing local checkout. Updating a Git checkout is NOT the same as updating installed Windows services, schema migrations, environment variables, or the running process.

```powershell
# Run in each VERIFIED clean checkout separately, never against an unknown path.
git status --short --branch
git remote -v
git rev-parse HEAD
# Only if the working tree is clean, correct origin verified, and main is checked out:
git pull --ff-only origin main
```

Do not force reset, stash unreviewed changes, run unattended package installers, or pull a running host checkout during the startup test. Refresh installed Hub packages, service executable paths, Node dependencies, databases and the separately authorized AI Data/Comms workers only through their supervised release procedures. Record before/after source commits, installed runtime identity and rollback path. On a dirty checkout, STOP and preserve local changes.

## Remaining gates before we approve a startup test

- Inspect the real host task actions/triggers and service identities. Resolve any service MISSING/Manual/Disabled or absent recovery policy individually.
- Verify original-host owner-signed QL458 manifest and machine-scoped paths under protected ACLs, not copies in Git or chat.
- Obtain independently deployed **read-only** event-sink support and current pinned mTLS certificates from BOTH other Masters. Historical signed QL463 samples do not prove online connectivity.
- Complete a supervised planned maintenance window and record genuine preboot/postboot task history, SCM start mode/status, fresh health on ports, signed witness/reviewer receipts, independent peer ACK, backup/rollback and 24-hour continuity. No simulated acceptance.
- Keep receiver UNKNOWN, incident OPEN, activation DENIED until source-specific signed evidence authorizes any change.

## Next proposed Build 356 / QL-465

Original-host supervised installation and rollback ceremony with explicit owner-signed auto-start policy and separately verified Windows service/worker acceptance. Do not begin this rollout from GitHub CI or without actual original-host evidence.
