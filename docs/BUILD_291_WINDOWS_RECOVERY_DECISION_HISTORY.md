# Rosevear AI Hub 291 — Guided Windows Recovery Decisions, Version Drift Follow-Up & Original Host Acceptance History

## Scope

Build 291 extends **System → Build 113 → Build 290 Windows field adoption** with an explicitly owner-guided, read-only follow-up panel. The Windows original-host identity, installed executable provenance, approved issuer, signed consent, independent witness, valid signed receipt and Master Shell publisher remain **HOLD**.

- Uses the existing Build 290 five-candidate comparison and two backend version readbacks. No new Windows or GitHub API calls are made by Build 291.
- Separates four operator dispositions: missing/stale evidence, reported drift, incomplete launcher evidence, or unverified reported alignment.
- Gives specific version drift guidance when package versions disagree or cannot be compared.
- Requires an explicit owner acknowledgment before recording any follow-up note. Reviewing supervised recovery procedures is offered only when the current read-only comparison reports drift and its reference is valid; the assessment is recomputed at the moment of recording to prevent a sleeping tab from recording stale drift as current.
- Records up to 20 browser-session notes, each with observation disposition, version comparison, five-candidate match count and an owner-supplied source SHA only when valid. Every note preserves originalHostAccepted=false, signedReceiptVerified=false, masterShellAuthorized=false.
- Offers an explicit local download of a metadata-only JSON history marked BROWSER_SESSION_OWNER_NOTES_ONLY. No raw machine identifier, file content, credential, private hostname, witness or signature is recorded; no upload is performed.
- Clears the current browser history if the expected release reference, GitHub run URL or Build 113 observation changes, and on owner/session panel remount. The download is not an attestation, retained server record, acceptance certificate or source-of-truth event.

## Owner walkthrough

1. On Ree's original Windows Hub PC, manually check the installed local UI and current source reference under Build 113. Confirm the SHA and successful protected main run directly in GitHub.
2. Select **Check installed Hub evidence** (Build 113), then **Cross-check Windows release candidates (read-only)** (Build 290). Do not infer machine identity from a browser SHA.
3. Read the new Build 291 priority, version follow-up and proposed inspection steps. If drift is reported, inspect the original updater journal, startup task and responding process; keep the known-good rollback reference available.
4. Choose a non-executing follow-up decision, review the acknowledgment and select **Record owner follow-up decision locally**. This is an owner note, not authorization to run the recovery.
5. Optionally download the private history JSON before leaving the page. Browser refreshes, sign-out and source changes can clear the in-memory notes. Store the JSON using the owner's normal private custody procedure.
6. Any actual restart, service repair, rollback, signer enrollment, device operation or release adoption must be performed separately with the existing supervised Windows runbook and its own authorization and verification.

## Verification and safety

- Model tests: all four guidance branches, version disagreement, missing SHA, explicit acknowledgment, time validation, bounded sanitized export and immutable trust HOLD flags.
- UI tests: no source calls on mount, disabled recording until acknowledgment, explicit-only note creation, reset of acknowledgement, and stale-at-click rejection.
- Promotion requires full web typecheck, tests, production build and all six protected backend/web/desktop/backup/docs/CI-budget lanes on source and production PRs, followed by a fresh independent successful main push workflow.
- GitHub Actions CI proves **source build health only**. It does not confirm the installed Ree Windows machine, signed issuer, witnessed original-host acceptance or AI Data Platform intake. Those conditions remain HOLD.

Rollback: revert the Build 291 model, UI panel/tests, import/wiring and this document in a reviewed Git commit. No database migration, background service, Windows task, network recipient or device configuration is changed.

**Next proposed Build 292 — Original-Host Decision History Comparison, Drift Episode Continuity & Separately Verified Signed-Receipt Intake Prerequisites.** This proposal does not grant signer, witness or Master Shell permissions.
