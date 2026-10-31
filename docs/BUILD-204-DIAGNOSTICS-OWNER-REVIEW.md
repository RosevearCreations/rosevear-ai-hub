# Build 204 — Diagnostic source comparison and Windows owner review

- System diagnostics now compares the **last two on-demand samples** of five allowlisted service classifications. Comparison is memory-only; it resets on reload and never stores endpoint response bodies or secrets.
- Each comparison row links to the relevant service card, resetting the status filter so the target is visible. A changed reading is not physical Windows or device acceptance.
- The Standard Theme owner review explains that recovering a saved fixed-choice checkpoint replaces current selections, while clearing the checkpoint preserves on-screen findings.
- The owner can jump to the first incomplete Windows worksheet step, unchecked device observation, or unclassified failure.

## Safety boundary

QL-275 remains **Under Review / owner-deferred**. Integration is **DISCONNECTED / HOLD**; private relay **OFF**, authenticated gateway GETs **0**. No signed Proof-B original, independent witness, physical Windows acceptance, or owner TEST authorization is inferred. This build performs no repairs, outbound messages or device controls.

## Verification

Run `npm run build:204:hub:test`, `npm run web:build`, and `npm run web:test`. GitHub feature, dev and exact main push checks must also pass before reporting production GREEN.

## Next planned

Build 205 — Diagnostics Comparison Follow-Up Routing, Owner Checkpoint Change Awareness & Standard Theme Accessibility Verification (QL-275 Deferred).
