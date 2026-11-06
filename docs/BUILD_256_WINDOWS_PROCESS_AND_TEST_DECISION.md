# Build 256 — Windows installed-source owner retest and signed process evidence

Status: **source review only; Comms TEST receiver DISCONNECTED / HOLD**.

## On the actual Windows Rosevear AI Hub

1. Open a **normal, not elevated** PowerShell console in `C:\Users\ree\rosevearaihub`.
2. If Windows reports that the script execution policy prevents the inspector, review the file first, then optionally run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned`. Confirm with `Y`. This change is **only for that PowerShell session** and does not sign or trust the source. Do not set unrestricted or change LocalMachine policy.
3. Run `Get-AuthenticodeSignature .\scripts\inspect-hub-process-256.ps1 | Select-Object Status,StatusMessage`. **NotSigned** means the script has no Authenticode publisher signature; Git source review and an independent release signature are separate evidence.
4. In the same session, run `.\scripts\inspect-hub-process-256.ps1`. Save its JSON output locally. It calls the Build 253 read-only mapping inspector and observes loopback listener executable SHA-256 values without exposing paths, PIDs or command-line arguments.
5. Confirm the actual checked-out release and the installed web/backend listener processes in Windows. The checkout SHA is a **candidate**, not proof that the running process loaded that release. Do not restart tasks, register signers, upload secrets or activate the relay for this test.

This inspector needs `Get-NetTCPConnection`, `Get-CimInstance`, `Get-FileHash`, and the existing `inspect-hub-mapping-253.ps1`. Missing permissions, process identity or listeners become `unverified` and remain HOLD. On a Windows server using a nonstandard process/port arrangement, the reported results may remain incomplete; do not infer the identity from an HTTP 200 alone.

## Independent process evidence

The client UI under **Build 253 signed mapping witness → Build 256 Windows process review** accepts:

- Current `rosevear-windows-process-observation-256/v1` JSON from the Windows computer, with all trust flags **false**.
- Separately authenticated `rosevear-windows-process-witness-256/v1` signed by an independent Ed25519 witness custodian whose public key differs from the release-receipt signer. A SHA-256 fingerprint of the witness raw 32-byte public key must be authenticated **out of band** and entered in the form; do not trust a fingerprint merely because the same JSON supplies it.
- The witnessed `release_sha` must equal the expected release, the observed checkout candidate, and the exact recorded executable digests/classifications/listener statuses, including the UTC timestamp. The signed canonical UTF-8 message is the newline-terminated ordered list of the witness's schema, release SHA, observation time, both executable hashes, both executable kinds, listener classes, source-path classes, post-boot classes, and recovery action. See `canonicalProcessWitness256` for exact order.

Independent signatures are **not minted automatically**. The UI verifies an externally produced Ed25519 signature locally; it does not enroll a signer or contact a server. Invalid, stale (older than 24 hours), future-dated, self-signed, mismatched or unpinned evidence remains HOLD. Synthetic tests are not original-owner testimony.

Even after a valid match the state is `SIGNED_PROCESS_EXECUTABLE_CANDIDATE_ONLY`: Node and Python hashes identify generic interpreter binaries, not the specific loaded project source, installed bundle, runtime arguments, parent process or trusted Windows launch provenance.

## Comms TEST receiver decision (separate approval)

`COMMS_TEST_RECEIVER_HOLD` applies regardless of whether Windows is healthy or the code is production-green. To conduct a bounded TEST handshake, obtain separately authenticated original issuer and independent receiver-OFF evidence, both owner decisions, the original peer's stop/safe-state proof, pinned transport identity, scoped database enrollment, expiry/replay protections, and an explicitly approved witnessed TEST plan. No production or device actions are authorized by Build 256.

## CI and source handoff

The new offline signature/anti-tamper tests run in the existing `web` job, and the PowerShell syntax/host-mutation guard runs in the existing `desktop-windows` job. No new GitHub workflow event or job is added. A green `main` push proves this source revision passed GitHub checks; it **does not** prove Windows installation, device connection or owner consent.

References: [PowerShell execution policies](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies/), [Get-AuthenticodeSignature](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/get-authenticodesignature), [GitHub required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
