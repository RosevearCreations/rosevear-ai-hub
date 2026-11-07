# Build 264 — original Windows runtime authority field, witnessed restart review and separate Comms TEST

## Truthful release and field boundary

GitHub source/production green proves only that our code and security regressions passed. It does **not** authenticate Ree's original Windows machine, identify the issuer, sign a witnessed local restart, activate a Comms receiver, or prove any remote TEST GET. Previous Build 261/263 reports showed Windows access restrictions around live executable paths and command lines, and processes starting before the current checkout. Build 264 never changes the working five-minute `Rosevear AI Hub Recovery` scheduled task, whose successful run does not prove installed-source identity.

No legitimate issuer/witness/receiver-operator signatures or independently enrolled receiver are provided by this code. Every reported field trust and Comms activation flag stays **false**. The web review does not call any endpoint.

## 1. Ree — update the original Windows checkout safely

From PowerShell in `C:\Users\ree\rosevearaihub`:

```powershell
git status --short
git fetch origin main
git switch main
git pull --ff-only origin main
Test-Path .\scripts\inspect-hub-authority-264.ps1
```

Expect `True` for `Test-Path`. If Git reports local modifications or an untracked file collision, **stop** and preserve those files; in particular do not delete an untracked root `package-lock.json`. GitHub `main` does not automatically replace an already running Windows process. Do not try an elevated PowerShell or change the machine's script policy simply to force an inspection past an access restriction.

Before any restart, while local web `127.0.0.1:5173` and API `127.0.0.1:8765` are healthy:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-launcher-263.ps1 -Stage before
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-authority-264.ps1 -Stage before
```

Capture each JSON response privately. Do **not** commit either file or raw signer material. The Build 264 observer wraps the real Build 263 local launcher check and separately reads the protected recovery task action and last result using `Get-ScheduledTask` / `Get-ScheduledTaskInfo`. It outputs a SHA-256 *candidate* for host and task action, action match flag and categorized last result; it does not expose host name, raw action/arguments, process IDs, executable paths or keys. A digest is not independent source custody. `unavailable` or false matches mean **HOLD**.

## 2. Actual supervised restart (optional, never inferred)

Only the original authorized operator can decide whether to restart the working Hub. First independently verify task custody, actual launch command, intended checkout SHA, rollback plan and owner decision. Do not stop healthy Node/Python listeners or modify recovery tasks to make an inspection pass. The existing recovery task must continue its normal operation. There is no browser or script restart button in this build.

If, and only if, a real separate owner-approved and independently witnessed restart occurred, capture:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-authority-264.ps1 -Stage after
```

The `after` label is **not** proof of a restart. The nested Build 263 report must separately show stable loopback listeners, readable checkout-bound launch commands, changed launch bindings, and process starts after the genuine `before` observation. If Windows denies command access, stop with HOLD rather than claiming a new installed runtime.

## 3. Original Windows signed field-decision evidence

The client Process Evidence screen now includes **Build 264 — Witnessed restart decisions and separate private TEST request**. The offline reviewer requires the genuine Build 263 before JSON, Build 264 after JSON, the independently signed Build 263 runtime receipt, and two separate signed Build 264 decisions. All three original issuer/owner/Jack public-key SHA-256 fingerprints require an **independent, out-of-band** confirmation outside the browser.

The first receipt schema `rosevear-windows-restart-field-decision-264/v1` contains:

- `release_sha`, `runtime_receipt_sha256`, `after_observation_sha256`, `host_binding_sha256`, `recovery_action_sha256` (all lowercase SHA-256 hex except the 40-hex release SHA).
- `signed_at`, `expires_at` in whole-second UTC; expiry no more than 30 minutes after signing and within the live Build 263 receipt validity.
- `decision=ACCEPT_RESTART_EVIDENCE_FOR_LOCAL_REVIEW_ONLY`, `receiver_state=OFF`.
- Independent Ed25519 `issuer`, `owner`, `independent_witness` objects, each with `public_key_raw_base64` and `signature_base64`.

Use `canonicalField264(receipt, role)` for the exact UTF-8 newline-separated payload each role signs, including its role name and trailing newline. `runtime_receipt_sha256` hashes `canonicalRuntimeReceipt264(Build263Receipt)`; `after_observation_sha256` hashes `canonicalFieldObservation264(Build264After, digestLauncher263(nestedLauncher))`. `canonicalFieldReceipt264` includes the three signatures and is hashed to bind the next separately signed TEST request. These are portable validation formats, **not** an automatic issuer-signing service. Synthetic test fixtures are not genuine field evidence. A successful local review says only `WINDOWS_SIGNED_FIELD_DECISION_CANDIDATE_COMMS_HOLD`.

## 4. Independent Comms TEST request ceremony — separate authorization

Ree and Jack must independently authenticate the actual Comms private operator and the original signer pins through a trusted channel. The original server field receipt cannot authorize Comms. The private operator must independently demonstrate a live nonproduction receiver with verified private TLS identity, source enrollment in the restricted Comms database, a strictly scoped nonproduction runner, a single-use nonce ledger, and a tested stop/revocation plan. Public GitHub CI, a static Comms web page, `Test-NetConnection`, or a synthetically signed JSON do not satisfy these requirements.

The **separate** `rosevear-comms-separate-private-get-request-264/v1` contains:

- `release_sha`, `field_decision_sha256`, 32-lowercase-hex `challenge_nonce` (single use), `receiver_signer_pin_sha256`, `receiver_tls_pin_sha256`, `stop_plan_sha256`.
- Whole-second UTC `signed_at`, `expires_at`, with at most 10 minutes of signed validity, nested within the preceding field decision.
- Exactly `method=GET`, `path=/api/integration/v1/health` **or** `/api/integration/v1/capabilities`, `target=rosevear-comms-hub`, `scope=PRIVATE_NONPRODUCTION_SINGLE_GET_ONLY`, `max_requests=1`, `receiver_state=OFF`, `decision=REQUEST_SEPARATE_SUPERVISED_TEST`.
- Role-bound Ed25519 `issuer`, `owner`, `independent_witness` and distinct `receiver_operator` signatures over `canonicalTest264(request, role)`. Four independently authenticated public-key pins must match. The private receiver TLS pin and owner-approved stop-plan digest are also supplied from separate trusted channels; never paste private credentials into the page.

The code verifies signature mathematics, exact release, nested receipt digests, all distinct roles, time order, host/task hashes, consent scope, and private TEST request constraints. **It does not execute the request.** Even with all signatures valid, the result is `SEPARATE_SINGLE_GET_SIGNED_REQUEST_CANDIDATE_HOLD`. Browser-supplied fingerprints do not independently establish the people, host or private receiver. `test_authorized=false`, `challenge_executed=false`, `receiver_activated=false`, `comms_connected=false` remain unchanged.

### First genuine GET — independent human-controlled private operator only

1. Authenticate the original issuer, both owner decisions, Jack's witness, private receiver operator, TLS identity and database enrollment outside this app; independently confirm the original Windows runtime is actually the intended release.
2. Explicitly authorize **one** specific nonproduction GET path, exact source/tenant, 10-minute maximum window and unique nonce; independently approve the immediate stop/revocation procedure.
3. With the original owner present, the authenticated Comms private operator activates the dedicated private receiver only for that interval, executes the single approved GET through its approved private runner, and records the **actual** signed server-side response, audit identity and nonce consumption. Deny any unapproved requests; no customer communications or device control.
4. Independently re-check receiver shutdown/revocation, audit durability and actual response signatures. Only genuine returned evidence may justify changing a later connection status; do not mark this build connected merely because a signed request candidate exists.

If any prerequisite is missing, the procedure **stops at HOLD**. No automation in Build 264 will silently create authority, activate a receiver, run a GET, change tasks or bypass protected enrollment.

## 5. Verification

- `node scripts/build-264-contract.test.mjs` protects the Windows observer, exact private GET scope, disabled activation and documented handoff.
- The Windows CI lane PowerShell-parses and smoke-tests the read-only inspector without requiring a genuine task or human signature.
- Web Vitest generates *synthetic test-only keys* to exercise signature success, tampering, expiration, host/task mismatch, role cloning, wrong pins, expanded scope and HOLD-only UI. Synthetic fixtures must never be entered into a real original-owner trust registry.
