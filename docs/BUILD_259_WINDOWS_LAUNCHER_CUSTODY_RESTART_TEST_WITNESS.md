# Build 259 — Windows launcher custody, supervised restart readiness & independent Comms TEST witness

## Field evidence and exact boundaries

Ree's Windows Hub Build 258 inspection from **2026-11-07T00:08:02Z** reported `checkout_sha_candidate = 799c189f9a33c5f644a95c3c9140d766f20e3f78` with:

| Target | Listener | Started UTC | Executable path | Source mention |
| --- | --- | --- | --- | --- |
| Node web, loopback 5173 | observed, stable | 2026-11-04T15:30:12Z | access restricted/unavailable | no checkout reference observed |
| Python backend, loopback 8765 | observed, stable | 2026-11-04T15:30:08Z | access restricted/unavailable | no checkout reference observed |

`Rosevear AI Hub Recovery` was enabled and referenced the expected script. `Rosevear AI Server Startup` was disabled. Both processes predate the updated Build 258 checkout and cannot be treated as proof of the new installed release. A readable checkout-file digest is **not** an attestation of running Node/Python source, and an ancestor's `hub-recovery.ps1` argument is only a lexical clue.

**Build 259 performs read-only local observation and offline signature verification only.** It does not restart Node, Python, scheduled tasks, Windows services or devices; enroll keys; open a Comms receiver; conduct a live challenge; contact customers; or grant owner consent.

## Ree's Windows server — exact steps

1. At `C:\Users\ree\rosevearaihub`, run `git status --short`. Preserve local edits; stop if it reports uncommitted changes.
2. If clean, update `main`: `git fetch origin main`, `git switch main`, `git pull --ff-only origin main`.
3. Run the new redacted, read-only launch inspector:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-launcher-259.ps1
   ```

4. Save only its JSON. It reports sanitized ancestor kinds (e.g. `node`, `python`, `powershell`), **not** process IDs, executable paths, arguments or keys. It checks whether each running process started before the current checkout commit. A missing ancestor or process path does not prove a service is stopped.
5. Leave both scheduled tasks as found. In particular, **do not enable the disabled `Rosevear AI Server Startup` task or stop the working recovery task** merely to improve an inspector score.

## Supervised restart readiness — plan, not execution

Before any restart of an installed Hub release, the original Windows owner must separately verify:

- Recovery/rollback and local backup are recoverable and the real launch command and account are identified by an authorized operator.
- The source revision, selected release artifact, process manager, working directory, ports, environment and service dependencies are pinned independently. A generic interpreter hash is insufficient.
- A maintenance window, owner observation, first-failure stop rule and rollback operator are present.
- The existing recovery task action and startup task state have been documented; no duplicate task is enabled and no process is killed just because its executable path is unavailable.
- After a supervised restart, capture fresh listener starts and an independently signed installed-release identity. **This Build 259 inspector does not perform that restart.**

The Build 259 decision remains `HOLD_PENDING_ORIGINAL_LAUNCHER_CUSTODY`, with `restart_authorized:false` and `installed_release_attested:false`.

## Original issuer receipt and Jack's separate offline TEST witness

The web admin panel accepts the following **external** signed JSON only after the original issuer and separate witness keys are authenticated out of band:

1. `rosevear-windows-original-launcher-receipt-259/v1`: `release_sha`, `observed_at`, `observation_sha256`, `issuer_public_key_raw_base64`, `signature_base64` (plus `schema`). The original key must match the **already trusted** original-issuer public key; a submitted self-declared key cannot enroll itself. Sign `canonicalIssuer259` using real Ed25519.
2. `rosevear-windows-independent-test-challenge-259/v1`: same release/observation digest and observation time; a 128-bit random `challenge_nonce` (32 lowercase hex characters); `witness_mode:"OFFLINE_PREFLIGHT_ONLY"`; `challenge_executed:false`; `receiver_port_listening:false`; `receiver_activated:false`; `owner_decision:"HOLD"`; `network_requests:0`; `independent_public_key_raw_base64` and `signature_base64`. Sign `canonicalChallenge259` using a separate, already authenticated key controlled by an independent custodian, such as Jack's separate laptop. Verify the public-key SHA-256 fingerprint out of band.

The observation digest is SHA-256 of UTF-8 `canonicalLauncher259` (newline-terminated fields, includes normalized Build 258 observation). The two receipts must match the exact release, digest and observation time and pass their Ed25519 checks in a 24-hour freshness window. No private signing material is uploaded, stored in the repo or displayed. Never fabricate an original-issuer receipt or independent witness to satisfy a test.

Even **two valid signatures mean only `SIGNED_OFFLINE_CHALLENGE_CANDIDATE_ONLY`**. An offline nonce and witness are **not** a genuine private network challenge, a live connection or an owner TEST authorization. They never change `test_authorized:false`, `challenge_executed:false`, `receiver_activated:false` or `comms_connected:false`.

## Before a genuine Comms TEST

Ree and Jack must first complete their separate original-owner and independent-receiver enrollment decisions under the relevant Comms Hub supervised workflow (QL-354/355 or later). The procedure must pin approved original issuer, device, peer, tenant/environment, bounded GET-only TEST action, exact expiry, network route, receiver-OFF rollback and an independent challenge witness. This repository's Build 259 never starts that procedure.

## Verification and sources

- `node scripts/build-259-contract.test.mjs`
- `npm --prefix apps/web run typecheck`
- `cd apps/web && npx vitest run src/launcherCustody259.test.ts src/LauncherCustody259Panel.test.tsx --maxWorkers=1`
- Windows GitHub Actions parses and smoke-tests `scripts/inspect-hub-launcher-259.ps1` with immutable HOLD flags and retains all existing protected checks.
- Microsoft [Win32_Process executable-path privilege notes](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-process).
