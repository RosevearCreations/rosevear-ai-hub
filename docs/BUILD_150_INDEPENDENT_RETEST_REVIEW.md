# Build 150 — Independent Retest Review, Evidence Gap Register & Conditional Closure Readiness

## Delivered source

The owner/admin **System → Home operations field trial & follow-ups** now has an **Independent retest review & evidence gaps** card. It is enabled only for prepared Build 149 private manual handoffs and is an evidence-preparation surface, not an independent sign-off service.

The review addresses seven fixed, individually recorded criteria:

1. Exact original witnessed finding and timestamp.
2. Prepared manual repair handoff and its staged review.
3. Actual installed Windows version and approved private access.
4. Later owner-observed retest of the exact original case.
5. Source/device/camera identity continuity.
6. Safety holds, authorizations and unsupported-operation exclusions.
7. Separate independent reviewer attestation.

Each reviewer manually classifies a criterion as **gap**, **contradiction** or **personally observed (claim only)**. The local, append-only register retains the original case/issue index, exact latest source-observation index, review timestamp and criterion. A new trial observation makes prior reviewer findings **stale**; imported records are **historical**, never fresh. The reviewer cannot claim a current retest pass without a later owner-observed pass and an explicitly witnessed installed-Windows context. A claimed independent witness requires a separate-person checkbox but the application does **not** verify identity.

## Conditional closure boundary

Seven current, manually claimed criteria can yield `REVIEW_PACKET_PREPARED_ONLY` for later outside review. They can **never** yield case closure. The invariant `conditional_closure: NOT_AUTHORIZED`, `field_acceptance: FIELD_ACCEPTANCE_HOLD` applies to exports, imports and all UI states. No device controls, MQTT publish, Home Assistant scene, Windows service actions, camera playback probes, credential collection, automatic repair dispatch or Vault activation were added.

This boundary matters because no CI runner or authenticated browser can independently witness our physical Windows system, prove identity of a second person or certify workshop and camera operation. A private JSON is operator-authored and not cryptographically signed. The first-party Vault stays **0/6 verified · SECURITY HOLD**.

## Receipt compatibility and privacy

The **Build 150 private independent review receipt** wraps a validated Build 149 receipt, which itself wraps the Build 148 field-trial ledger. It accepts previous Build 148 and 149 receipts with an empty reviewer register. The new receipt has a bounded 280-event reviewer log and strict allowlisted keys, timestamps, source indices, handoff stages, reviewer fields and unconditional HOLD labels. Unknown secret-bearing fields and invented closures are rejected.

Import resets installed-Windows witness, makes every imported reviewer event historical, and records the imported trial-event boundary. An imported owner pass cannot be counted as a current retest until a new, personally witnessed field observation is recorded after import. Explicit private export/import is the only persistence; no server writes, localStorage, telemetry, background network calls, or scheduled tasks are introduced.

## Tests and field handoff

```sh
npm run web:typecheck
npm --workspace apps/web exec vitest run src/ownerIndependentReview.test.ts src/IndependentRetestReviewPanel.test.tsx src/OwnerFieldTrialWorkbench.test.tsx
npm run web:test
npm run web:build
```

Tests cover missing and contradictory evidence, exact handoff context, separate-reviewer attestations, later retest prerequisites, stale and imported history, conditional packet-readiness without closure, previous receipt compatibility, malformed fields and forged acceptance attempts.

Source promotion requires verified feature→`dev` PR, independent `dev` push, `dev`→`main` PR and independent `main` push. Human owner observations and independent physical Windows acceptance remain **HOLD** until separately performed and recorded outside source CI.
