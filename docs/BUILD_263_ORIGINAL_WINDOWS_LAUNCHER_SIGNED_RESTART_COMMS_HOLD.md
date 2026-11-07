# Build 263 — original Windows launcher, signed post-restart acceptance, Comms TEST readiness

## What the current evidence means

The original Ree Windows machine had healthy local Vite (`127.0.0.1:5173`) and Python (`127.0.0.1:8765`) listeners. Their November 4 process start times predated the newer GitHub checkout. Build 261 reported process executable/command-line fields **access-restricted or unavailable**. Build 262 classified the scheduled recovery task as existing; successful five-minute recovery checks only show the services remain healthy. None of these facts authenticate the loaded release, the original operator, or a signed restart. The Comms receiver remains OFF and disconnected.

**This build does not force a restart, disable/rewrite the scheduled task, enroll an issuer, create signatures, start a private receiver, or run a Comms challenge.** Green GitHub CI proves these safety contracts only.

## Ree's original Windows server: capture a baseline

First obtain the newly promoted repository files. From `C:\Users\ree\rosevearaihub` in PowerShell:

```powershell
git status --short
git fetch origin main
git switch main
git pull --ff-only origin main
Test-Path .\scripts\inspect-hub-launcher-263.ps1
```

`Test-Path` must return `True`. If Git refuses to switch or pull because files are modified, **stop and review those files**. Preserve any untracked `package-lock.json`; do not delete or overwrite it blindly. A GitHub `main` deployment does not automatically update a Windows checkout or the already-running local processes.

Then capture **before** while the working Hub stays online:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\inspect-hub-launcher-263.ps1 -Stage before
```

The JSON reports only listener status, readable-command flags, template match, whether the command references the checkout, process-start time and a one-way SHA-256 command/executable/start binding. It does **not print raw executable paths, commands, process IDs, private keys, passwords or environment variables**. If Windows limits access, `template_match=false` and `launch_binding_sha256=null` are expected. Run PowerShell with whatever ordinary permissions are already granted; this build does not request elevation or bypass the access limit.

Keep a separate private copy of that JSON for the optional evidence-review interface. Do not commit it, or any signer material, to Git.

## Supervised restart: separate original-owner decision

Only after an actual original-operator review and an explicit, scoped owner decision:

1. Independently identify which Windows scheduled task or original launch command owns the live client and backend. Verify the enabled **Rosevear AI Hub Recovery** action still runs `scripts\hub-recovery.ps1`; keep its working every-five-minute recovery behaviour intact.
2. Review the exact installed release hash and checkout-source candidate against the intended build. Never infer an installed release from `0.0.57`, a healthy endpoint, a successful recovery exit code, or a Vite module check.
3. Arrange a genuinely witnessed and authorized **local-only** restart using an original, verified launch procedure, preserving existing logs and rollback. **Do not kill processes, reconfigure the recovery task, or restart the machine from the inspector or browser.** This build deliberately provides no automatic restart action.
4. Only if such a supervised restart actually took place, run the same inspector with `-Stage after` and retain the real output. It must show new process-start times after the baseline and readable, matching, stable checkout-bound launch commands.

With no such restart, do **not** invent an after-stage record or sign a completion receipt.

## Signed post-restart receipt: mathematical acceptance candidate

The Process Evidence screen includes **Build 263 — Original launch commands and signed post-restart receipt**. The offline browser verifier accepts:

- Before and after JSON from `inspect-hub-launcher-263.ps1`, each with its actual stage.
- A genuine `rosevear-windows-signed-post-restart-263/v1` receipt signed separately by original issuer, owner and independent witness (Jack, on his separate device).
- Three **independently authenticated**, distinct SHA-256 public-key fingerprints. The original issuer key must also match the independently supplied original issuer public key for the Hub.

Receipt payload fields: `schema`, `release_sha`, `before_sha256`, `after_sha256`, `after_web_binding_sha256`, `after_backend_binding_sha256`, `signed_at`, `expires_at`, `scope=LOCAL_SUPERVISED_RESTART_REVIEW_ONLY`, `receiver_state=OFF`, plus `issuer`, `owner`, and `independent_witness` objects each containing a raw Ed25519 public key and detached signature in base64. Each role signs the UTF-8 newline-joined canonical fields from `canonicalSignedRuntime263(receipt, role)`, including its role name and terminal newline. The observation digests use `canonicalLauncher263`. Exact release, live post-baseline start times, bound-after digests, one-hour maximum validity, receipt freshness, unique keys and signature mathematics all must agree.

The browser does not generate an issuer/witness signature or claim to independently authenticate a human. **Even when all mathematics passes, its state is `SIGNED_POST_RESTART_RECEIPT_CANDIDATE_TEST_HOLD`.** Original custody and witnessed restart must be independently accepted outside the browser before an installed-runtime attestation can be made. An operator-entered pin alone is not external trust.

## Independent Comms TEST authorization

This signed receipt covers **local supervised restart review only**, not Comms. A separate, fresh, exact-scoped owner decision, original issuer confirmation, authenticated private receiver readiness and Jack's independently verified witness receipt must come from the Comms Hub's trusted enrollment ceremony. Never infer these from GitHub CI or a local signature match. Until complete: `test_authorized=false`, `challenge_executed=false`, `receiver_activated=false`, `comms_connected=false`.

Only a future, separately authorized nonproduction GET challenge may be considered; no customer communications or device actions belong in this build.

## CI acceptance

`node scripts/build-263-contract.test.mjs` checks the read-only Windows observer, signature-binding model, owner panel, no TEST activation and this runbook. The protected Windows CI lane also PowerShell-parses and smoke-tests the inspector on an ordinary GitHub runner. The web lane runs the actual Ed25519 positive/negative tests and UI safeguards. CI does not fabricate an original issuer, owner consent or a signed field observation.
