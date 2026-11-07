# Build 260 — Windows supervised release activation, independent runtime proof and Comms TEST handoff

## Release baseline and scope

Build 259 was merged to protected `main` at `9953e308a1901c22220faf17490043a3cf5c48c5` and independently passed six GitHub CI checks. This is **repository promotion**, not proof that Ree's Windows host was restarted or now runs that release. The last original Windows evidence showed Node on loopback `5173` and Python on `8765` launched **2026-11-04** before the later checkout, with executable paths unavailable. Recovery task `Rosevear AI Hub Recovery` was enabled; `Rosevear AI Server Startup` was disabled. **Keep the working recovery task and disabled startup task unchanged.**

Build 260 adds a **read-only** pre/post Windows observation, a supervised owner-decision verifier, an independent signed runtime timeline witness verifier and a bounded receiver-**OFF** Comms TEST handoff. It does **not** activate a release, execute restarts, change processes or tasks, or make network requests. A command's `-Stage after` label and later process start times are **not installed-source attestation**. There is no user-initiated or autonomous restart action inside this build; actual activation requires a separate supervised operator procedure and authorization.

## Ree's Windows host — before any approved restart

1. In `C:\Users\ree\rosevearaihub`, run `git status --short`. Preserve unrelated edits; do not pull over a dirty checkout. On a clean checkout, run `git fetch origin main`, `git switch main`, `git pull --ff-only origin main`.
2. Capture the **read-only** baseline, saving stdout to an appropriately protected JSON file using the operator's normal workflow. The script itself writes nothing:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-runtime-260.ps1 -Stage before
   ```

3. Inventory and independently verify the installed release manifest, exact launcher working directory and application-source artifacts, signed original issuer provenance, process-manager owner, rollback/backup readiness, dependencies and maintenance window. The interpreter executable's SHA-256 and an ancestor command-line mention alone are insufficient.
4. Ask the **original authorized Windows owner** for a separate time-bounded signed decision matching the baseline SHA-256 and intended revision. A qualifying decision includes exact release SHA, baseline digest, issue/expiry times (up to one hour), `SUPERVISED_LOCAL_RELEASE_RESTART_ONLY`, `rollback_ready:true`, `APPROVED_FOR_SUPERVISED_WINDOW`, and signature from the already authenticated original owner key. The app never generates or enrolls an owner's signing key.
5. If original launcher custody, signed owner authorization, rollback plan or the safe process-control method cannot be independently established, **stop here**. Do not kill the existing listeners, enable the other task, or replace a working recovery task to make a checker green.

## After separately authorized supervised activation

Only an original authorized operator, watching the Windows machine with a tested rollback plan, may perform the actual installed-release activation. No Build 260 script runs that operation. Stop on the first unexpected service or listener failure and follow the approved recovery procedure.

After a genuine operator-supervised restart, take a second read-only observation:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-runtime-260.ps1 -Stage after
```

The owner-facing panel compares the baseline and subsequent observation for exact checkout SHA; stable Node/Python listeners; changed process start times after the baseline and release commit; unchanged recovery/startup task states and recovery action; and fresh evidence. A candidate means only that the timeline is **consistent** with a supervised restart. It does not prove running Node/Python loaded the expected source bytes. An independently signed installed-artifact/runtime mapping is still required before an installed-release claim.

## Original-owner and independent signed receipts

The two JSON receipts must come from **separate, previously authenticated authorities**. Never fabricate them, share private signing keys, or accept a self-declared new key as trust enrollment.

1. `rosevear-windows-supervised-owner-decision-260/v1`: `release_sha`, `before_sha256`, `decided_at`, `expires_at`, `action:"SUPERVISED_LOCAL_RELEASE_RESTART_ONLY"`, `rollback_ready:true`, `owner_decision:"APPROVED_FOR_SUPERVISED_WINDOW"`, `original_owner_public_key_raw_base64`, `signature_base64`. Sign UTF-8 `canonicalOwner260` using Ed25519; verify the original owner's public key and **separately authenticated SHA-256 fingerprint** against actual owner custody. The pre-existing original-*issuer* key is not automatically an authorized *owner* key. Decision time must be after baseline but **before both new listener start times**; expiry must follow the observation and review, and be no more than 60 minutes after decision.
2. `rosevear-windows-independent-runtime-test-handoff-260/v1`: `release_sha`, `before_sha256`, `after_sha256`, `witnessed_at`, a unique 128-bit random `challenge_nonce` (32 lowercase hexadecimal), `test_scope:"NONPRODUCTION_GET_ONLY"`, `receiver_state:"OFF"`, `owner_test_decision:"HOLD"`, `challenge_executed:false`, `network_requests:0`, `independent_public_key_raw_base64`, `signature_base64`. Sign UTF-8 `canonicalWitness260` with an independently held Ed25519 key (for example, Jack's separately supervised laptop), and verify the public-key SHA-256 pin out of band. The independent receipt is valid for observation only, not a live challenge.

Digest each read-only snapshot as SHA-256 of the UTF-8 `canonicalRuntime260` string. Both signed receipts must match the same pinned release and exact respective observation digests. Jack's witness time must be no more than 15 minutes after the follow-up observation; the inspection result itself is considered fresh for no more than 24 hours. A valid signature is not independent if issued by the same original owner key.

The panel can display `SIGNED_POST_RESTART_RUNTIME_CANDIDATE_TEST_HOLD`, **never** an installed-release or live Comms attestation. `installed_release_attested:false`, `process_attested:false`, `test_authorized:false`, `challenge_executed:false`, `receiver_activated:false`, `comms_connected:false` and `network_requests:0` remain immutable. Even signed owner restart approval does not authorize or execute a Comms TEST.

## Controlled Comms TEST handoff — separate authorization

After genuine installed-source verification, Ree and Jack must separately authenticate/enroll the original Comms issuer, original device, independent receiver/witness, allowed tenant and environment, bounded GET-only TEST route and nonce, expiry, receiver-OFF rollback and owner decisions under the Comms Hub QL-354/355/356+ workflow. **Do not turn on a receiver, send a TEST request, or contact devices/customers from this Hub evidence checker.** Only a genuine private challenge and signed receipt under that separately approved workflow can change connection status.

## Test and source references

- `node scripts/build-260-contract.test.mjs`
- `npm --prefix apps/web run typecheck`
- `cd apps/web && npx vitest run src/supervisedRuntime260.test.ts src/SupervisedRuntime260Panel.test.tsx --maxWorkers=1`
- Windows CI: parse and run default Build 260 observer, verify immutable no-change flags; preserve all prior protected CI lanes.
- Microsoft [Win32_Process executable path privilege notes](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-process), [PowerShell execution policy](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies).
