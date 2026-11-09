# Rosevear AI Hub 293 — Independent Original-Windows Evidence Intake Review, Episode Cross-Reference & Operator-Gated Receipt Verification Design

## Delivered

Build 293 extends **System → Build 113 → Build 290 → Build 291/292 Windows recovery** with an opt-in **local** review of an existing **unsigned** Build 288 original-Windows request.

- Explicit file selection invokes the existing strict Build 289 schema, SHA-256, and unsigned HOLD-contract checks; files over 16 KiB are rejected before reading. The imported file is **not uploaded or persisted**.
- Operator must acknowledge independently that a digest match, owner-supplied source SHA, Windows candidate match, or Build 292 episode match is **not** evidence of device origin, valid signature, signer authority or Master Shell authorization.
- At the moment of recording a review, Build 293 checks the expected source SHA, clock, future sample, unsigned review state and explicit acknowledgement. It distinguishes missing candidates, conflicting release/checkout candidates, source mismatch and **reported alignment only**.
- The source-pointer cross-reference lists how many existing, browser-session Build 292 drift episodes claim the same source reference. This is **not** independently verified recurrence closure, host attestation or cryptographic receipt acceptance.
- Up to ten metadata-only local intake notes can be downloaded explicitly as an unverified JSON report. The clear control discards browser-session notes and selected-file state. Changing the Build 113 snapshot or source reference remounts the parent review panel and discards notes.
- Seven design-stage verification authorities remain **HOLD**: original Windows host, installed binary/process, approved issuer, independent witness, signed owner consent, canonical cryptographic/replay verification, and approved Master Shell publisher/receiver.
- No signer keys, credentials, host commands, private identifiers, database records, signed receipts or issuer enrolments are accepted by this UI. No device action, Windows task, updater, service restart, webhook delivery or live AI Data Platform intake occurs.

## Operator walkthrough

1. On the original Windows PC, separately inspect the installed Hub, startup task, launcher and current protected production SHA using the earlier Builds 287/290 runbooks. Do **not** treat a browser report as independent proof of the machine.
2. If available, choose the previously downloaded **unsigned** Build 288 request under **Build 293 → Select previously downloaded unsigned Windows request**. The existing Build 289 integrity reviewer must accept the exact request envelope.
3. Review the candidate release and checkout pointers, note any mismatch with the source SHA and compare with available Build 292 browser-session drift episodes.
4. Explicitly check the HOLD acknowledgement and select **Record local intake review (HOLD)**. The recording is a non-executing owner note, not verification or permission.
5. Optionally download the metadata-only review JSON for private custody, or select **Clear Build 293 local review**.
6. To move beyond HOLD in a future independently authorized workflow, secure separate original-host evidence, approved issuer key and independent witness, exact signed owner consent, a cryptographically valid receipt with replay protection and authorized publisher/receiver acceptance. **Build 293 does not implement or satisfy these gates.**

## Verification and rollback

- Unit regression: acknowledgement fail-closed, rejected/unsigned request rejection, malformed source/clock/future evidence denial, old sample flag, candidate divergence, source mismatch, episode matching, bounded metadata and fixed trust flags.
- UI regression: default no fetch, no recorded review, disabled recording and download, all seven receipt-verification HOLD rows.
- Run full protected backend, web, desktop-Windows, backup-Windows, docs and CI-budget lanes for source and production PRs. After merging to `main`, separately verify the successful independent `main` push run on the **actual production commit**.
- Rollback: reviewed revert of Build 293 model, panel, regression tests, existing panel integration and this runbook. No schema migration or Windows host rollback is needed.
- GitHub code CI GREEN establishes **source-build health only**. The original Windows machine, receipt signing, approved witness, signed consent and Master Shell publication remain **unverified HOLD**.

**Next proposed Build 294 — Owner-Supervised Original-Windows Evidence Acceptance Review, Independent Signer/Witness Evidence Mapping & Receipt Replay-Safety Test Harness.** Future promotion must not imply accepted trust without independent corroboration.
