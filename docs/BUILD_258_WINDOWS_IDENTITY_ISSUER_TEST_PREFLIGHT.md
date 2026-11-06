# Build 258 — Windows installed-source identity, issuer receipt & Comms TEST preflight

## Outcome and boundary

This build records the real Windows field finding of **November 6, 2026**. Ree's server had two stable loopback listeners, Python on `127.0.0.1:8765` and Node on `127.0.0.1:5173`, running since November 4. Both `Get-Process.Path` and `Win32_Process.ExecutablePath` were blank. The source checkout was updated to Build 257 (`9924619604ce716400ee3b8479b834e018a45de9`), but the older processes had **not** been restarted. `Rosevear AI Hub Recovery` was `Ready`; `Rosevear AI Server Startup` was `Disabled`.

The missing executable paths are **not** evidence that listeners are stopped. Windows may withhold `Win32_Process.ExecutablePath`; Microsoft documents this property with `SeDebugPrivilege`. Neither the observer nor an in-checkout hash can prove which source a generic interpreter loaded. The new observer reports each limitation explicitly and keeps every attestation and connection flag false.

**Nothing in this build modifies a Windows task, starts/stops Node or Python, enrolls a key, listens on a private receiver port, sends network traffic, contacts customers or controls devices.** A GitHub production GREEN means code release checks passed, not that Ree's installed process or Comms connection is verified.

## Ree's Windows server — read-only retest

1. On `C:\Users\ree\rosevearaihub`, check `git status --short` to preserve local work before pulling updates.
2. If clean, use `git fetch origin main`, `git switch main`, and `git pull --ff-only origin main`. Do not force checkout or modify the running recovery task.
3. Run from that directory:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-identity-258.ps1
   ```

4. Save **only the redacted JSON** (no raw process command lines, absolute paths, PIDs, credentials or signing keys). The output distinguishes `observed`, `missing`, `ambiguous`, `process_unavailable`, `probe_failed`, and `changed_during_observation`. If a listener is observed with `access_restricted_or_unavailable`, leave it running and report the limitation.
5. Review `web` and `backend` start times. A process started before the updated checkout may still have loaded old application files. Reconcile launch custody and schedule a separate supervised restart before claiming the installed release is updated.
6. Inspect `recovery_task_state` and `startup_task_state` **without** enabling, repairing or running either task. A `Ready` recovery task and a `Disabled` startup task can coexist.

## Original issuer — signed receipt acceptance, not self-authorization

The web admin's Build 258 panel accepts the on-device observation JSON plus a **separately signed** original-issuer receipt of schema `rosevear-windows-original-issuer-receipt-258/v1`. It must be signed using the **previously enrolled** issuer key whose public bytes match the trusted original-signer key already supplied to the client. No trust is inferred from a public key embedded in an uploaded receipt.

Fields: `schema`, `release_sha`, `observed_at`, `observation_sha256`, `issuer_public_key_raw_base64`, `signature_base64`. `observation_sha256` is SHA-256 of the canonical newline-terminated UTF-8 Build 258 observation defined by `canonicalIdentity258`. Sign the canonical newline-terminated receipt fields defined by `canonicalIssuer258` using Ed25519. Never share the issuer's private key, generate a replacement signer merely to pass a test, or invent a signature. Unknown, stale, mismatched, tampered or unsigned evidence remains **HOLD**.

## Jack's separate laptop — receiver-OFF witness

An independently authenticated receiver-OFF signer on Jack's laptop, separate from Ree's original-issuer key, may produce the `rosevear-windows-independent-receiver-off-258/v1` statement only after actually observing the receiver OFF condition. Fields: `schema`, `release_sha`, `observed_at`, `observation_sha256`, `receiver_port_listening:false`, `receiver_activated:false`, `owner_decision:"HOLD"`, `network_requests:0`, `independent_public_key_raw_base64`, `signature_base64`. Its canonical newline-terminated signing content is defined by `canonicalReceiverOff258`. Enter the receiver public key's SHA-256 fingerprint in the UI **only after verifying it out of band**. Do not treat an uploaded fingerprint as independently verified identity.

The UI verifies real Ed25519 signatures, exact release and observation digest, independent signer identities, and a 24-hour freshness window. Success means **signed observation receipts accepted for owner review only**. It explicitly **does not** attest loaded application code, authorize a TEST, enroll a private peer, change a task, or activate any receiver.

## Separate decisions before any first genuine Comms TEST

1. Reconcile the Windows process chain with an independently witnessed installed-release identity, including executable-path access limitations and older running process start times.
2. Authenticate original issuer custody and the independent receiver-OFF witness out of band.
3. Record **separate owner decisions** for exact peer/environment/tenant, purpose, expiry, rollback and permitted TEST action. Self-signed candidates and database placeholders are insufficient.
4. Receive independently approved enrollment and a bounded private challenge plan from the Comms Hub operator workflow. Only its separately authorized runbook may activate a receiver; this build never does.

Until then, `installed_release_attested:false`, `process_attested:false`, `receiver_activated:false`, `comms_connected:false`, `can_request_test:false` and `remote_requests:0` remain hard gates.

## Verification

- `node scripts/build-258-contract.test.mjs`
- `npm --prefix apps/web run typecheck`
- `npm --prefix apps/web run test -- apps/web/src/processIdentity258.test.ts apps/web/src/ProcessIdentity258Panel.test.tsx` (or run Vitest from the web workspace)
- Existing `docs-foundation`, `web`, `desktop-windows`, Windows backup, backend and production push checks remain mandatory.

Reference: Microsoft [`Win32_Process.ExecutablePath`](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-process), official process access documentation.
