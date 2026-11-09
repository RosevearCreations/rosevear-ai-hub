# Rosevear AI Hub 290 — Original Windows Field Adoption, Signed Receipt Prerequisites & Release/Version Convergence

## Delivered application workflow

Under **System → Build 113 — Installed Windows Hub version & field adoption**, the new **Build 290** walkthrough joins existing owner-entered production reference data with the Windows evidence already provided by Builds 285/286. It does not create another source or release authority.

1. The owner checks the exact protected `main` SHA and successful GitHub Actions `main` push run from GitHub and enters them in Build 113. The browser validates their syntax only; it does not contact GitHub or certify the run.
2. The owner explicitly selects **Check installed Hub evidence**. Build 113 reads `/version` and the local release observability record, now retaining a session-scoped read time.
3. The owner explicitly selects **Cross-check Windows release candidates (read-only)**. Build 290 uses existing owner-gated APIs to read the Build 285 runtime snapshot and `/version` + `/health`, and the Build 286 launcher sample. No background polling occurs.
4. A five-row comparison displays only validated SHA-40 candidates: compiled browser stamp, updater active-release record, runtime recorded-release pointer, launcher recorded-release pointer, and inspected checkout. A separately sanitized backend package version is compared between the two local readbacks; a package version is never a Git SHA.
5. All observations expire after five minutes for current comparison. Source changes, owner switches, new Build 113 evidence and failed/private reads clear the Build 290 result rather than retaining a previous apparent match.

The screen distinguishes missing/stale evidence, reported drift, incomplete launcher ancestry and matching **unverified** candidates. Even five matches and backend package-version agreement remain `REPORTED_CANDIDATES_CONVERGE_UNVERIFIED`. Live executable identity, physical host identity and owner field acceptance are never asserted from browser self-reports.

## Signed-receipt prerequisites remain HOLD

Seven explicitly visible prerequisites remain unverified: original Windows host/executable identity, enrolled approved issuer key, signed owner consent, independent witness, canonical signed-receipt verification, replay/expiry/source-sequence protection, and authorized signed-webhook + AI Data Platform ingestion.

A Build 288 signing request and Build 289 matching SHA-256 prove at most local content consistency. No original-host signature, signer registry, trust anchor, independent witness or Master Shell publisher is implemented or inferred here. The UI never sends evidence or changes Windows tasks, services, provider/device state or firewall settings.

## Owner runbook

1. Open the installed client on Ree's original Windows mini-server. In **System**, find **Build 113** and enter the exact GitHub `main` SHA and corresponding successful production push run URL. Verify both in GitHub separately.
2. Run the existing Build 113 local read, then Build 290 cross-check. If any candidate differs, inspect the original updater journal and launcher mapping; do not assume an automatic or safe update.
3. Under **I.T. → Integration Health**, review Builds 285/286, perform the Build 287 original-host self-review, and if appropriate prepare an **unsigned** Build 288 request for the local Build 289 digest checker.
4. If startup after reboot, local Tailscale, service health or device/camera operation is in doubt, use the previously documented supervised Windows acceptance and recovery procedures. Do not authorize Master Shell ingestion from unverified browser data.

## Verification / rollback

- Pure tests: five candidate axes, source-reference syntax, stale/future readbacks, missing process chains, differing updater/checkout SHA, package version drift, local updater failures, secret sanitization, and never-trusted states.
- UI tests: explicit-only local reads, clear-on-source-change, fail-closed API errors, seven visible HOLD gates and no implicit network or device action.
- Full web TypeScript/test/build plus six protected backend, web, Windows desktop, backup, documentation and CI-budget checks are required on development and production candidates; the independent `main` push must also pass all six.

Rollback: reviewed revert of the Build 290 model, UI, tests, Build 113 wiring and this runbook. No database migration, device action or Windows installation change is involved. GitHub GREEN means source CI passed; the original installed Windows client remains independently unverified until tested in the field.

**Next proposed Build 291 — Guided Windows Installed-Client Recovery Decision, Version Drift Follow-Up & Original Host Acceptance History.** Require explicit owner decisions, no automatic restart or trust escalation.
