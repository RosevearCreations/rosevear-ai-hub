# Rosevear AI Hub 289 — Offline Windows Handoff Integrity Review & Owner Custody Guidance

## Delivered

In **I.T. → Integration Health → Build 287 → Build 288**, the new Build 289 panel lets the owner choose a downloaded Build 288 JSON signing request. The check happens entirely in the browser, on an explicit file selection. Nothing is uploaded, published, saved to application storage, signed, transmitted or sent to a receiver.

- Rejects files above 16 KB, invalid JSON, unknown fields, altered security flags, inconsistent source/shell/audience mapping, false signer or publication claims and unsupported contract layouts.
- Recalculates SHA-256 over the imported `JSON.stringify(content)` and compares it with `contentSha256`. Rejects mismatches and missing secure Web Crypto, rather than passing a candidate.
- Shows sanitized source candidate SHAs, owner-reported outcome, inspector timestamp and drift-note state. Observations older than five minutes are visibly marked historical and cannot be reused as fresh Windows process proof.
- Keeps Master Shell and original-Windows-host trust on **HOLD** even for a matching digest. SHA-256 integrity proves neither original-host origin nor signer authenticity.
- Offers an explicit clear action and ignores out-of-order file reads. Changing the signed-in owner remounts the review and discards its state.
- Repairs the GitHub Linux web runner's Rollup optional-native-module fallback (Build 288 main push failure), by extracting the matching version into that ephemeral CI checkout and rechecking `require('rollup')`. No runtime, production server or dependency manifest is changed.

## Owner procedure

1. On Ree's actual Windows machine, use the Build 287 manual inspector and Build 288 owner review to download the **unsigned** signing request. Do not paste this JSON into a public issue or use it as a signed receipt.
2. In Build 289, select the saved file and check whether its digest matches. If rejected, return to Build 287 and prepare a new request; **do not repair the checksum manually**.
3. If the sample is old, re-run the local read-only inspector and owner observations on the actual original computer. A matching historical digest can be retained as a historical local document only.
4. Independently identify and enroll the authorized original-host issuer key, acquire owner consent and an independent witness, verify the complete signed receipt and approved replay-protected webhook contract before requesting AI Data Platform V1 ingestion. These **remain separate, unimplemented/HELD requirements** in this build.

## Acceptance / rollback

Frontend unit and component tests validate the original Build 288 request, tampering, invalid JSON/size, signer/publication escalation, audience and exact-field rejection, stale/future timestamps and absent SHA-256. The full web suite plus backend, documentation, Windows desktop/backup and CI-budget protected jobs are release gates.

Rollback: revert the Build 289 reviewer model, UI, tests, integration and this runbook in a reviewed PR. No database or Windows state rollback is needed. A GREEN GitHub release validates **source CI only**, never Ree's installed Windows client or a trusted Master Shell connection.

**Next proposed Build 290:** Original Windows field adoption walkthrough, signed-receipt verifier prerequisites & owner-visible release/version convergence. Keep issuer, witness and cross-application publication HELD until original authority is verifiably established.
