# Rosevear AI Hub Build 294 — Owner-Supervised Original-Windows Acceptance Review, Independent Signer/Witness Evidence Mapping & Receipt Replay-Safety Test Harness

## Scope
Build 294 extends the existing **System → original Windows adoption → Build 293** browser-only review with supervised follow-up decisions and a synthetic replay-safety demonstration. It is not a trusted acceptance service.

- Owner records a *local* non-executing decision only after an existing Build 293 unsigned intake review and an explicit HOLD acknowledgement. Matching GitHub source, digest, reported drift or alleged host identity cannot create a real acceptance.
- Seven independent authority requirements are mapped explicitly: physical Windows host, binary/launcher ancestry, approved signer issuer, independent witness, signed owner consent, cryptographic receipt verifier with replay control, and registered Master Shell publisher/receiver. All remain **INDEPENDENT_REVIEW_REQUIRED** and the verified count is zero.
- The replay harness uses only synthetic, fixed-format test envelopes. It models exact duplicate, event-ID payload collision, nonce reuse, expiration, future-dated request, wrong audience, wrong source and unseen synthetic request. **SIMULATED_FRESH_UNVERIFIED is not acceptance.** No real signature keys, events, issue/consent authority, network calls, persistent replay database, or transport exist here.
- Up to ten supervised decisions stay in browser memory and are cleared with the Build 293 panel. Explicitly downloaded metadata remains unverified owner notes, never a signed receipt.

## Owner walkthrough
1. Use the original Ree Windows PC to manually review installed launcher, listening process, updater/task and package version with the earlier supervised runbook.
2. In the app, select and review a locally held unsigned Build 288 request under Build 293, then explicitly record a Build 293 intake review.
3. Under Build 294, choose the appropriate *review plan*, acknowledge all authority/HOLD limitations, and record the supervised *note* locally.
4. Select **Run synthetic replay test harness** to see which negative scenarios a proposed future verifier would reject. Do not submit any real receipt or credential.
5. Original machine acceptance requires independent observation, issuer enrollment and revocation validation, witness separation, signed consent and an authorized cryptographic receiver in a separately approved process. This build performs none of them.

## Verification and rollback
- Unit tests cover acknowledgement, missing/mismatched intake, invalid source/clock, seven fixed HOLD authorities, duplicate/collision/nonce/time/audience/source replay scenarios.
- UI tests cover zero network on mount, no action until acknowledgement + valid intake, and all gates HOLD.
- All six protected jobs (backend, web full regression/build, desktop Windows, backup Windows, docs, CI-budget) must be GREEN on source and production PRs, then a fresh independent **main push** workflow must pass on actual production SHA.
- No Windows task or service action, key management, device mutation, database migration, external dispatch or Master Shell publish. Roll back via reviewed revert of Build 294 model, panel/test integration and this document.
- All physical-device, signature, witness, consent, original host and Master Shell evidence remains HOLD regardless of GitHub CI results.

**Next proposed Build 295 — Original-Windows Field Review Chain-of-Custody, Independently Verified Evidence Registry Interface & Operator-Gated Handoff Dry Run.**
