# Rosevear AI Hub — Build 385
## IT Service Desk, Performance & Process Monitoring

**Production source:** governed GitHub PRs only. **Field readiness:** original Windows Hub must deploy current source and complete the exact checks below. GitHub GREEN never means physical Windows, home LAN, seven-app live peer, independent recovery or service SLA certified.

### Delivered

1. Owner-only `GET /api/v1/system/it-ops-385/diagnostics` samples **only when opened or explicitly refreshed** on original Windows `DESKTOP-AE894KC`. Reports actual OS boot timestamp (not independent boot proof), this API process's real start/uptime, bounded observed-name counts and maximum observed uptime for known Caddy/Ollama/go2rtc/Node/Tailscale process names (not independently verified service identities or restart histories), local network interface up/total counters, aggregate byte counters and existing host memory/disk resource guidelines. No process command lines, PIDs, raw IPs, MACs, passwords, paths or arbitrary network scans. Host not original or sampler unavailable = HOLD.
2. Owner-only structured ticket ledger, optional privately configured `ROSEVEAR_IT385_PRIVATE_DB`. Only seven allowlisted application scopes, fixed incident/complaint/support/maintenance categories, fixed issue codes, four explicit owner planning targets (4, 24, 72, 168 hours). Each create or transition appends an immutable row to a private SQLite journal, captures the authenticated owner's numeric ID internally, enforces revision match and explicit valid state changes; owner-defined overdue indicator, never a certified provider SLA or independently verified fix.
3. Owner-only `GET /api/v1/system/it-ops-385/tickets`, `POST /tickets`, `POST /tickets/{id}/transition`, all under `/api/v1/system/it-ops-385`. API rejects unauthenticated owners, wrong host, unknown app/tenant, arbitrary free-text credentials, stale revisions, and over-limit evidence. Web UI appears at **System → IT service desk & performance** for the owner.
4. No automatic process restart, worker install, reboot, ticket email delivery, external support filing, user/tenant record ingestion, QL-340C Comms receiver activation, network traffic interception or provider credential capture. Network up-link indicators and OS counters are NOT independently verified LAN-to-peer reachability.

### Step-by-step original Windows owner setup (only after GitHub main is GREEN)

**Where:** At the original Hub computer `DESKTOP-AE894KC`, sign in as the Windows account that operates the Hub. Open **Windows PowerShell**. None of these commands reboot, kill, or restart services.

**Step 1 — Locate the existing Rosevear AI Hub source folder.**
In File Explorer find the existing folder named `rosevear-ai-hub`, containing `server`, `apps`, `scripts`, and `.git`. Do **not** use `C:\rc470`; that is the separate Comms Hub repository. Copy the **full existing Hub folder path** from File Explorer's address bar.

**Step 2 — Identify the exact repository and check for local changes.** Paste these commands into PowerShell, one block at a time:

```powershell
$repo = Read-Host "Paste FULL PATH to the existing rosevear-ai-hub repository"
if (-not (Test-Path (Join-Path $repo "server\src\rosevear_ai_hub\main.py"))) {
    throw "STOP: This is not the Rosevear AI Hub source folder."
}
git -C $repo remote -v
git -C $repo status -sb
```

Confirm the remote is `https://github.com/RosevearCreations/rosevear-ai-hub.git`, and check `git status -sb` for uncommitted files. **STOP rather than discard or overwrite any local edits.** This is a read-only check.

**Step 3 — Update the existing GitHub source safely.** Only if the previous step matches the exact repo and there are no local edits, run:

```powershell
git -C $repo fetch origin main
git -C $repo switch main
git -C $repo pull --ff-only origin main
git -C $repo log -1 --oneline
```

Use the protected GitHub `main` commit reported in the release. `--ff-only` prevents an accidental merge. If a command fails or says the history diverges, **STOP**; do not force-push, delete local branches or reset the repo.

**Step 4 — Create the private ticket database directory.** Execute:

```powershell
$privateDir = Join-Path $env:LOCALAPPDATA "RosevearAIHub\private"
New-Item -ItemType Directory -Path $privateDir -Force | Out-Null
$db = Join-Path $privateDir "it-service-desk385.sqlite"
[Environment]::SetEnvironmentVariable("ROSEVEAR_IT385_PRIVATE_DB", $db, "User")
$env:ROSEVEAR_IT385_PRIVATE_DB = $db
Write-Host "Private IT385 DB path configured: $db"
```

This sets a **path only**, not a password. It does not create the DB until the first authorized owner ticket is recorded. Do not save the DB in the Git checkout, OneDrive, Google Drive, or any web root. The Windows identity running the API must have read/write permission to this path; a service running under a different account will **not** automatically receive your User environment variable or profile access. Do not grant `Everyone` filesystem permissions.

**Step 5 — Check the installed Hub, without a blind restart.** Log in to the existing Hub web interface as **Owner**, open **System → IT service desk & performance**. Click **Refresh local evidence**. If a `HOLD` appears, note its exact status. The code running on the local API may still be an older version even after git pull; normal Git source updates alone do not redeploy or restart the running API. Use the Hub's **existing approved Update Hub / recovery procedure** only after reviewing its backup and startup-task status. Do not start duplicate Python/Node listeners or manually restart Tailscale, Caddy, Home Assistant VM, Mosquitto or the Comms receiver. If a controlled Hub API restart is necessary, use the previously verified launch/task identity and procedure; do not improvise an unsupported Windows task name.

**Step 6 — Verify the evidence before creating a real ticket.** At **System**:
- Original-host API uptime must be a measured number; OS boot timestamp is *locally reported* and not independently witnessed.
- Network interface counters must be measured or clearly `HOLD`; do not assume they prove Internet or private LAN access.
- Resource warning signals are local thresholds, not guarantees.
- Ticket section reads `PRIVATE_IT385_EMPTY_CREATE_ALLOWED` on a properly configured, valid empty private directory, or `PRIVATE_OWNER_TICKETS_NOT_PROVIDER_SLA` after the first ticket. If it still reads HOLD, check that the exact environment variable and filesystem permissions are present **in the running API process**, without pasting keys or credentials anywhere.

**Step 7 — Run a supervised owner-only service desk acceptance.** In the UI, select app `rosevear-ai-hub`, category `support`, code `SUPPORT_REQUEST`, planning target `24 hours`. Click **Record owner ticket**. Confirm one new ticket with status `open` and revision `1`. Select `investigating` then **Record follow-up**; verify revision `2` and an append-only event. **Do not mark `resolved` unless we genuinely completed the investigation**. No process restart will occur.

**Step 8 — Confirm original-host and master field acceptance separately.** Check Hub service identity and private network reachability on an independent trusted device. Check source-specific signed receipts in the existing Sysop panels and any genuinely completed external ACKs. All seven connected, reboot certified, provider SLA met, and private Comms receiver authorized must remain **HOLD** without independent evidence. A signed ticket is not a cryptographic peer ACK.

### Quick local checks (read-only; original Windows PowerShell)

```powershell
hostname
Get-NetTCPConnection -State Listen -LocalPort 8765 -ErrorAction SilentlyContinue |
    Select-Object LocalAddress,LocalPort,OwningProcess
Get-ScheduledTask |
    Where-Object { $_.TaskName -like "*Rosevear*" } |
    Select-Object TaskName,State
[Environment]::GetEnvironmentVariable("ROSEVEAR_IT385_PRIVATE_DB", "User")
```

**When to do this:** after the source PRs and protected `main` push report GREEN, before assigning any meaning to on-device measurements. **Who must do it:** an operator who has physical/logged-in access to the original Windows computer. These are the only required manual steps for the current field test. Nothing needs to be entered into chat. The source-only GitHub promotion requires no manual user action.

### Rollback and privacy

Roll back code via reviewed GitHub PR if needed. Keep the local SQLite ticket ledger safely backed up outside the source checkout; never delete genuine historical tickets as part of a source rollback. No schema migration is applied to customer/business databases. Never enter sensitive personal, customer, station or secret values into the selected issue classification fields. The private log is an owner observation history; provider-side certification is independent.

**Next proposed: Build 386 — Unified Sixteen-Theme Cosmetic and Accessibility Acceptance.**
