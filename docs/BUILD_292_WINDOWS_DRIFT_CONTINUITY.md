# Rosevear AI Hub Build 292 — Original-Host Decision History Comparison, Drift Episode Continuity & Signed-Receipt Intake Prerequisites

Build 292 extends the Build 291 owner-only Windows recovery history. It groups **consecutive** reported dispositions for the same owner-supplied source SHA into observation episodes, shows reported transitions, and distinguishes repeated drift from a later reported alignment. This is deliberately not a verified recovery or resolution state.

## Owner instructions
1. Use System → Windows field adoption → Build 291 to explicitly check the latest read-only evidence, acknowledge HOLD and record at least one browser-session owner decision.
2. Review the Build 292 episode comparison. A transition from reported drift to reported alignment remains **unverified** until the original Windows machine, process ancestry and independent field evidence are inspected.
3. Review all seven independent signed-receipt prerequisites. They are a checklist **only**; this build does not ingest, cryptographically validate, issue, sign or transmit any receipt.
4. If necessary, download the existing private Build 291 history. Do not mistake its source SHA or unsupervised browser note for Windows device identity.

## Safety and validation
- No network calls, local storage, service restart, Windows task, installer, device action, schema migration, external publisher, signer or witness enrollment.
- Comparison excludes invalid-timestamp or trust-positive records, sorts observations, caps the input at 20 and never counts a verified receipt.
- Source CI must pass all protected lanes on both PRs and independent main push. Live Windows original-host and Master Shell acceptance remain separately **HOLD**.
- Roll back by reverting the Build 292 model, tests, panel integration and document via reviewed PR.

**Next proposed Build 293 — Independent Original-Windows Evidence Intake Review, Episode Cross-Reference & Operator-Gated Receipt Verification Design.** No signer, witness or production publish authority is conferred.
