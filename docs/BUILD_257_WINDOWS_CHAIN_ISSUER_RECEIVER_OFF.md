# Build 257 — Authenticated Windows process-chain evidence and receiver-OFF handoff

State: **READ-ONLY CANDIDATE / ORIGINAL-ISSUER AUTHENTICATION PENDING / RECEIVER OFF / COMMS TEST HOLD**.

## Why this build exists

Ree's November 6 field readback observed Build 256 checkout `87ec9e4082fc65684c746c6f28b0b0ac55a61052`, stable loopback Node and Python listeners, and both processes started after boot. Build 249 wrongly labeled their source `outside_checkout` by checking **interpreter executable paths** rather than loaded app source. The Windows recovery task had exactly one `powershell.exe` action pointing to `hub-recovery.ps1`; the path differed only in capitalization, resulting in `drift_or_unknown`. Build 257 fixes that case-sensitive comparison. **It does not edit the working scheduled task.**

## Step 1 — Ree's Windows server (read-only)

1. Update the local repository to the reviewed `main` revision, preserving any uncommitted work.
2. In a PowerShell session whose script policy already permits reviewed local scripts, run `.\scripts\inspect-hub-chain-257.ps1` from the repository root.
3. Keep the one-line JSON on Ree's computer. It includes only SHA-256 values and predefined classifications. It does **not** export process IDs, physical paths, command lines, names, credentials or task arguments.
4. Inspect `recovery_action`, `web` and `backend`. `expected_script_reported` means the existing task path matched case-insensitively; `source_hint=checkout_path_in_...` means only that a checked command/ancestor *mentions* the checkout path. `no_checkout_reference_observed` or `unverified` means do not infer a source identity.

Even when both source hashes and a checkout path are present, Python/Node are generic interpreters. The process could be running different code. A lexical command-line hint is **not a process attestation**.

## Step 2 — Exact original-issuer signed receipt

The authentic original issuer must verify the actual installed-release custody **outside this browser**, compare the expected release SHA to the local checkout, and sign the canonical Build 257 receipt with the original release signer. The browser uses the same trusted public key already independently established by the Build 250/253 receipt chain. It does not generate original-issuer signatures.

The source inspector's JSON is parsed, reduced to its defined fields, and encoded using `canonicalChain257` (newline-terminated UTF-8). Its SHA-256 is `canonical_observation_sha256` in the issuer receipt. The issuer signs `canonicalIssuer257`: schema, release SHA, observed UTC time, observation SHA-256, and final newline. See `apps/web/src/processChain257.ts` for exact order. A signature is a **candidate**, not original-human approval or process identity proof.

## Step 3 — Jack's independent receiver-OFF witness

On Jack's separately controlled laptop, the original receiver must remain **OFF**. Have an independently authenticated receiver custodian check the original receiver host and issue a separate signed `rosevear-windows-receiver-off-257/v1` statement tying the same release and observation digest to an explicit OFF state and `owner_decision=HOLD`. The witness must use a **different Ed25519 key** than the original issuer. Authenticate its raw public key's SHA-256 fingerprint out of band before entering it in the client; never trust a fingerprint solely because the JSON provides it.

The receiver statement's canonical message (`canonicalReceiverOff257`) includes its schema, release, observed time, observation digest, `false`, `false`, `HOLD`, `0`, and the final newline. The client verifies each detached Ed25519 signature and the exact release/observation binding, separate signer identities, and maximum 24-hour freshness. Files are imported locally; **no network calls or device actions** occur.

The browser never creates the external custodian statements, impersonates an issuer, enables the private receiver, enrolls an identity, grants consent, rotates keys, or sends a TEST challenge. A valid dual-signature match displays only `DUAL_SIGNED_WINDOWS_CHAIN_CANDIDATE_ONLY` and `INDEPENDENT_RECEIVER_OFF_OWNER_HOLD`. A controlled future TEST requires distinct original-issuer and owner consent, source/receiver verification, pinned transport identity, scoped database enrollment, and an explicitly authorized bounded TEST plan.

## CI preservation and release gate

The existing `docs-foundation` job runs the offline Build 257 contract test. The existing Windows desktop job parses the new PowerShell inspector and verifies its read-only surface. The `web` job runs all Build 257 anti-tamper and real Ed25519 signing tests in its existing Vitest suite. No new CI event, workflow or production bypass is added. A green GitHub `main` push verifies only the source revision, not physical Windows installation or a genuine Comms connection.

References: [PowerShell ScheduledTasks](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/get-scheduledtask), [Get-CimInstance](https://learn.microsoft.com/en-us/powershell/module/cimcmdlets/get-ciminstance), [Get-FileHash](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-filehash).
