# Build 387 — End-to-End Household & Three-Master Acceptance Campaign

**Source scope:** Rosevear AI Hub owner console and private no-store on-demand readback. Fourteen explicit acceptance gates cover all 24 Hub-native source categories. **No physical field device, original Windows post-update install, remote signed ACK, or restore is certified by this source change.**

## Implemented source

- Owner-only `GET /api/v1/system/household-master-campaign-387` returns an exact 14-gate, 24-module acceptance plan, live *locally sampled* process/OS boot/LAN interface context where the API is actually running on the pinned original Windows computer, and permanently fail-closed independent evidence flags. No network scans, runtime restarts, external calls or writes.
- `System → Household & Three-Master acceptance campaign` provides direct navigation from each gate to the real Hub feature, an explicit per-step owner report (`not checked`, `observed personally`, `issue`, `unavailable`), and a 14-step summary. These self-reports exist **only in the current browser session** and are not signed evidence. Even 14 owner-reported passes never change the independent field verdict from HOLD.
- Fixed workflow: confirm original Windows launcher and source; authorized bounded household discovery; pinned HA VM and MQTT; real Printer-PC monitored job; moving camera stream; durable grocery transaction; explicitly safe automation; real separate-master signed ACK; seven app source receipts; encrypted off-machine restore; trusted pre-login phone/tablet; role/secret/privacy denial; 16-theme physical review; incident/rollback ticket history.
- Source tests cover full manifest identity, protected owner API, no active control, dishonest field claims/replay and browser denial when a source response asserts fake certification. Automated build tests are not a household demonstration.

## Correct original Windows folder and local file

Earlier read-only finder output establishes a **primary source checkout**:

`C:\Users\Ree\rosevearaihub` — correct `RosevearCreations/rosevear-ai-hub.git` remote; `main` currently `486c72a` on the original owner machine. Both unattended Boot and Recovery tasks referenced this root. Other reported folders live under its `logs` and are historical rollback, release or failed-deployment artifacts. `C:\rc470` is the *different* Comms Hub and must never be treated as this repo.

Local status reported `?? package-lock.json`: **untracked, not a Git modification to tracked source**. The protected upstream `main` repository has no root `package-lock.json` at the time of this authoring. Nonetheless, preserve it and independently check the current remote tree before any pull.

### Exact safe PowerShell commands (run only after protected main GitHub push GREEN)

**A. Back up the untracked root lockfile, without deleting or replacing it.** On `DESKTOP-AE894KC`, sign in as Ree, open Windows PowerShell in any directory and paste:

```powershell
$hub = 'C:\Users\Ree\rosevearaihub'
$lock = Join-Path $hub 'package-lock.json'
$backupFolder = Join-Path $env:USERPROFILE 'Downloads\RosevearHub-LocalFile-Backup'
if (-not (Test-Path -LiteralPath $lock -PathType Leaf)) { throw 'STOP: unexpected missing lockfile; inspect status.' }
New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
$backupLock = Join-Path $backupFolder 'package-lock.json'
if (Test-Path -LiteralPath $backupLock) { throw 'STOP: backup exists; do not overwrite it.' }
Copy-Item -LiteralPath $lock -Destination $backupLock -ErrorAction Stop
$originalHash = (Get-FileHash -LiteralPath $lock -Algorithm SHA256).Hash
$copyHash = (Get-FileHash -LiteralPath $backupLock -Algorithm SHA256).Hash
if ($originalHash -ne $copyHash) { throw 'STOP: backup did not match.' }
Write-Host 'Backup hash matched. Original remains untouched.'
```

**B. Verify root, changes, upstream ancestry and whether the target will overwrite our lockfile.** Only after A passes:

```powershell
$hub = 'C:\Users\Ree\rosevearaihub'
if (-not (Test-Path -LiteralPath (Join-Path $hub 'server\src\rosevear_ai_hub\main.py'))) {
  throw 'STOP: this is not the AI Hub.'
}
git -C $hub remote -v
git -C $hub status --short
git -C $hub branch --show-current
git -C $hub fetch origin main
$upstreamLock = @(git -C $hub ls-tree -r --name-only origin/main -- package-lock.json)
if ($upstreamLock.Count -gt 0) { throw 'STOP: upstream now tracks root lockfile; resolve safely before pull.' }
git -C $hub merge-base --is-ancestor HEAD origin/main
if ($LASTEXITCODE -ne 0) { throw 'STOP: local main is not an ancestor; do NOT reset/merge/force.' }
```

Confirm `remote -v` is exactly the Rosevear AI Hub repo and `status --short` shows only the **expected** untracked `?? package-lock.json`. If any other changed file appears, **STOP** and inspect it, do not pull. If any Git command fails, STOP. `fetch` changes only remote refs and local Git objects, not the running application.

**C. Fast-forward the verified existing checkout only.** After B passes and `main` is the current local branch:

```powershell
git -C $hub pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw 'STOP: fast-forward failed. Do not reset or clean.' }
git -C $hub log -1 --format='%H %s'
git -C $hub status --short
```

Retain the untracked `package-lock.json`; no `git clean`, `reset --hard`, deletion, additional clone or other repository mutation. **Git source update is not proof that the installed running Hub has deployed** the new backend or web frontend.

**D. Verify real running service and approved installation path.** From Windows, open **Task Scheduler → Task Scheduler Library**. Inspect the current **Rosevear AI Hub Unattended Boot** and **Unattended Recovery** task Actions, Arguments and Start-in (do not change anything); check that their actual scripts reference `C:\Users\Ree\rosevearaihub`, not a historical `logs\...\releases` folder. Review `Rosevear AI Hub Startup`, `Recovery`, and `LAN Gateway` similarly; some paths may be embedded in PowerShell arguments and need inspecting. Do not assume a task with State `Ready` is actively running. If a service is the launcher, check its read-only service executable path. Confirm which Python/node processes actually serve the private Hub before changing them. Use the existing approved **Update Hub** application procedure with backup/release-lock/rollback checks, if installed; no commands here blindly reboot, start a second listener, alter VM/broker/Caddy/Tailscale or enable QL-340C.

**E. Original device acceptance and sign-off.** After installed source/version and its recovery backups are genuinely verified, sign into the Hub as `owner`, open **System → Household & Three-Master acceptance campaign**. Press **Refresh original-host context**. Complete each of the fourteen authorized live exercises on its actual feature or physical device, explicitly requiring a separate trusted witness where specified. Mark a local observation only if actually performed. Mark an unavailable device as unavailable. Confirm genuine cryptographic peer receipts with each independent Master; **do not activate the private Comms receiver** or claim a signed ACK from a browser selection. Keep original printer, camera and home automation safety controls supervised. Backup verification must use isolated scratch, never the live database. Actual role denial, phone/tablet, TLS, pre-login boot and off-machine restore require independent real-device verification. Only externally audited source-specific evidence can close a field HOLD; this UI cannot self-certify.

### Owners' field acceptance matrix

| Step | Evidence required | Result before live check |
| --- | --- | --- |
| 1 Original source and launcher | Task/service/process and protected commit independently correlated | HOLD |
| 2 Bounded device discovery | Real consented Home Assistant device identity and room state | HOLD |
| 3 VM and MQTT | Genuine pinned VM plus authenticated broker device sample | HOLD |
| 4 Printer-PC job | Original approved printer device and live signed job status | HOLD |
| 5 Camera | Moving real stream on trusted client | HOLD |
| 6 Grocery | Authorized persistent create/update/readback on original running app | HOLD |
| 7 Safe automation | Low-risk owner consent, independent actuation and safe-stop | HOLD |
| 8 Three-Master signed ACK | Independent verified real signer and return ACK | HOLD |
| 9 Seven-app intake | Seven real source receipts and receiver correlation | HOLD |
| 10 Backup/restore | Encrypted off-device backup and isolated restore witness | HOLD |
| 11 Phone/tablet/pre-login | Real TLS client and supervised unattended Windows pre-login sample | HOLD |
| 12 Roles/privacy | Original protected credentials, separate denied role and no secret leakage | HOLD |
| 13 16-theme field | Original desktop/tablet/phone physical accessibility and zoom checks | HOLD |
| 14 Support/rollback | Genuine private incident source and approved rollback ledger | HOLD |

**Scope limitations:** This build cannot produce actual whole-house discovery, start or supervise a real printer, stream original hardware cameras, generate other Masters' signatures, independently verify a restore or accept legal/security sign-off from a GitHub CI runner. These steps are HOLD until real original-host proof. **Do not move field percentage** based on this source-only release.

## Progress and next build

Build387 source planning raises targeted **IT operations/support 72→77** and **network sequencing/recovery 52→57** for the new fail-closed cross-workflow runbook and source/readback reconciliation, conditional on passed CI; all 24 modules remain visible and unverified physically. Cross-device original-host acceptance and real external ACK cannot be inferred from estimated source percentage.

**Next proposed: Build 388 — Original-Host Field Evidence Intake, Signed Witness Reconciliation & Independent Recovery Closure.**
