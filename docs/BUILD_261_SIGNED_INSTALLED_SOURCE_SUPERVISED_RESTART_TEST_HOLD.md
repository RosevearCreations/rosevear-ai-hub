# Build 261 — Signed Windows installed-artifact candidate map, supervised restart receipt and private Comms TEST HOLD

## Current original Windows evidence (not runtime attestation)

Ree's last original read-only `inspect-hub-runtime-260.ps1 -Stage before` output at `2026-11-07T01:45:09Z` reported release checkout candidate `7155d7260a945cf040d35f730a112ff508f2fa4c`. Node on loopback `127.0.0.1:5173` started `2026-11-04T15:30:12Z`; Python on `127.0.0.1:8765` started `2026-11-04T15:30:08Z`. Both are **older than the checkout commit**. Process executable paths were access-restricted/unavailable; source hints and process ancestors did not prove the checkout. `Rosevear AI Hub Recovery` was **enabled** with expected action, and `Rosevear AI Server Startup` was **disabled**. The Comms receiver was not enabled, and the original issuer and independent owner/witness signatures were not verified. No update to GitHub `main` changes this Windows process state.

**Keep both scheduled tasks exactly as observed, preserve the working recovery task and running services, and do not kill a process to make a field green.** No Build 261 script restarts, connects, installs, signs, migrates, or modifies anything.

## What the original Windows launch procedures actually are

The repository `scripts/hub-recovery.ps1` contains the existing guarded startup methods. They are **declared launch commands**, not evidence of what the November 4 processes actually executed:

| Service | Defined Windows launch procedure | Verification limitation |
| --- | --- | --- |
| Web client | From checkout root, `cmd.exe /d /c npm.cmd --workspace apps/web run dev -- --host 127.0.0.1 --strictPort` | Vite/Node template alone cannot identify the loaded UI source. |
| Backend | Via `scripts/restart-hub-backend.ps1 -Action Start`, Python `.venv\Scripts\python.exe -m uvicorn rosevear_ai_hub.main:app` on loopback port `8765` | `python.exe` identity alone cannot bind the imported application module. Health/version checks and installed source are separately required. |
| Scheduled recovery | `scripts/hub-recovery.ps1` with its existing maintenance lock, schema guard, duplicate-process refusal and recovery journal | Task presence or an expected action is not proof of a specific installed application release. |

The new `scripts/inspect-hub-installed-261.ps1` reads loopback listener owners and uses `Win32_Process` to **test an allow-listed command template in memory**, without exporting full process command lines, executable paths, PIDs or signing material. It hashes two known **checkout files** (`apps/web/vite.config.ts`, `server/src/rosevear_ai_hub/main.py`) and confirms their match to the Build 258 nested snapshot. These hashes are **not running-memory, executable-module or deployed-bundle hashes**. When Windows refuses a process path or command line, the answer stays `unavailable`; the operator must not elevate permissions or weaken security merely to force a pass.

## Ree's server — read-only identification and safe supervised restart preparation

1. Open PowerShell in `C:\Users\ree\rosevearaihub`. Run `git status --short` first and preserve all uncommitted work. If clean and under a reviewed release window, `git fetch origin main`, `git switch main`, `git pull --ff-only origin main`. This updates checkout files, **not already running processes**.
2. Capture a baseline without changing services or tasks:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-installed-261.ps1 -Stage before
   ```

3. Check the task actions and dates independently (these are **read-only**):

   ```powershell
   Get-ScheduledTask -TaskName 'Rosevear AI Hub Recovery','Rosevear AI Server Startup' | Select-Object TaskName,State
   Get-ScheduledTask -TaskName 'Rosevear AI Hub Recovery' | Select-Object -ExpandProperty Actions
   Get-NetTCPConnection -State Listen -LocalPort 5173,8765 | Select-Object LocalAddress,LocalPort,State,OwningProcess
   ```

4. Match the actual listener owner, existing **working directory**, command-line launch template, installed release bundle and imported module/build identity to an **original trusted release manifest**. The Build 261 observer only exposes `readable`, `matched_unattested` or `unavailable` verdicts; if command/path access is restricted or the running source cannot be bound to signed installed artifacts, **remain on HOLD**. Do not confuse the current checkout SHA with an installed running SHA.
5. Identify the active managed recovery mode and rollback path from `scripts/hub-recovery-mode.ps1`, `scripts/hub_release_manager.py`, `docs/WINDOWS_SUPERVISED_RESTART_2026.md` and `docs/DESKTOP_RUNTIME.md`. Verify preserved live database backup, schema match, camera/remote access, maintenance lock availability, and original owner authorization. A review of the *actual current launch command* and an independently authenticated signed owner decision are required before any restart.
6. **Stop if any ownership, live process, backup, release, task action or launcher identity is unknown.** The existing recovery task already handles guarded startup. Do not directly kill listener PIDs, toggle tasks, run a blind `npm` restart, or invoke the release manager's modifying `apply`/`rollback` actions while conditions are unverified.

### Supervised restart ceremony — procedure, not an automatic action

- **Before:** Original owner and operator verify original launcher custody, exact signed installed artifact manifest, independent Windows listener/process mapping, tested backup and rollback, emergency remote console, and the original owner's signed **time-limited local-restart-only** decision. A separate witness observes the planned maintenance window. The stable baseline JSON and the task actions are retained without secrets.
- **During:** An authorized operator uses the **existing, previously reviewed guarded managed-release procedure**, only after its actual mode, preconditions and rollback mechanism have been verified. The operator supervises console output, listener availability, startup task preservation and local health. Halt and use the reviewed rollback plan on first failure. This build **does not provide a restart button or issue a restart command**.
- **After:** Only after a real approved restart, capture the separate follow-up inspection:

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-installed-261.ps1 -Stage after
  ```

- Compare before and after **actual process start times**, pinned release, launcher template verdicts, loopback listener stability, expected task actions/states, signed installed artifact mapping and live application source provenance. Confirm the separate original-owner decision predates the two new start times; the independently witnessed receipt follows the observation. An operator's `-Stage after` flag by itself is **not proof** anything restarted.

## Original issuer, owner and Jack's independent receiver-OFF handoff

Build 261's client verifies **existing Build 260** original-owner and independent witness receipts plus a new **original-issuer source-map candidate** receipt. Each signature must use a separately authenticated Ed25519 key, with its SHA-256 public-key fingerprint verified out of band; do not enroll arbitrary keys supplied inside an uploaded JSON file. Do not upload private keys.

1. Owner decision `rosevear-windows-supervised-owner-decision-260/v1`: exact release, canonical Build 260 **before** digest, explicit `SUPERVISED_LOCAL_RELEASE_RESTART_ONLY`, `rollback_ready:true`, `APPROVED_FOR_SUPERVISED_WINDOW`, a 60-minute maximum validity and an Ed25519 signature from the authenticated original owner. Not an issuer signature and **not permission to run a Comms TEST**.
2. Independent witness `rosevear-windows-independent-runtime-test-handoff-260/v1`: exact release and both canonical Build 260 digests, independent signer, fresh timestamp/unique nonce, `NONPRODUCTION_GET_ONLY`, `receiver_state:"OFF"`, `owner_test_decision:"HOLD"`, `challenge_executed:false`, `network_requests:0`. Jack must review independently on his own laptop; evidence is not a live signed receiver handshake.
3. Original issuer `rosevear-windows-original-issuer-artifact-map-261/v1`: sign the UTF-8 `canonicalOriginalIssuer261` payload with authenticated original issuer key. Fields: `schema`, `release_sha`, `before_sha256`, `after_sha256` (**SHA-256 of UTF-8 `canonicalInstalledSource261` for each observation**), `web_checkout_sha256`, `backend_checkout_sha256`, `mapped_at`, `expires_at` (within 60 minutes), `artifact_scope:"CHECKOUT_ARTIFACTS_AND_LAUNCH_TEMPLATE_CANDIDATE_ONLY"`, `receiver_state:"OFF"`, `installed_source_attested:false`, `original_issuer_public_key_raw_base64`, `signature_base64`. The issuer does not claim to have verified the loaded runtime merely by signing checkout file hashes.

The application enforces matching release, file hashes, before/after snapshots, listener template matches, stable post-restart listeners, changed and recent process start times, intact recovery task states, separately pinned signatures and timing. It does **not** alter or generate receipts. Its strongest possible state is `SIGNED_INSTALLED_RUNTIME_CANDIDATE_TEST_HOLD`; `installed_release_attested`, `process_attested`, `test_authorized`, `challenge_executed`, `receiver_activated`, `comms_connected` stay **false**.

## Comms private TEST gate — still separate

Before any private TEST activation, Ree and Jack must independently authenticate the original Comms issuer/device and owner approval, verify the separate receiver's enrolled public keys, authorize a bounded nonproduction GET route/nonce/expiry and independently verify a **real** signed receiver challenge and receipt under the Comms Hub QL-356/357 procedures. No client upload here performs enrollment or activation. **Receiver remains OFF, Comms remains DISCONNECTED/HOLD, and no customer messages or device actions are authorized.**

## Verification

- `node scripts/build-261-contract.test.mjs`
- `npm --prefix apps/web run typecheck`
- `cd apps/web && npx vitest run src/installedSource261.test.ts src/InstalledSource261Panel.test.tsx --maxWorkers=1`
- Windows CI PowerShell parser/smoke test, immutable receiver-OFF and zero-change fields; all protected source/production/main-push gates retained.
- Official documentation: [Windows `Win32_Process`](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-process), [PowerShell execution policies](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies).
