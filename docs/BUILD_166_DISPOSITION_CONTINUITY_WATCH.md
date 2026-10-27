# Build 166 — Independent Disposition Evidence Recheck Continuity & Overdue Source Renewal Watch

## Scope and manual owner-safe procedure

1. Keep the exact original Build 162 reassignment watch, chronological Build 163 owner reviews, Build 164 recurrence audits and Build 165 disposition follow-ups. Nothing replaces earlier private observations.
2. Compare two **distinct chronological Build 165 dispositions** tied to that same held watch. The newer disposition must refer to a strictly newer Build 164 recurrence, not a replay of the earlier review. Recompute immutable comparison fields, claims and times against underlying private records.
3. Recheck whether the newest source check is distinct, captured after the earlier disposition and later than the prior source check. A changed alias or a `confirmed_alias` label is never independently authenticated device evidence; missing or unverified sources remain explicit warning signals.
4. Calculate elapsed first-disposition age on manual inspection (3+ days aged; 8+ days overdue). An overdue source recheck is raised only when renewal remains stalled or the newest pseudonymous identity claim is unverified. No timer, outside notification, automatic reminder or assignment is created.
5. With fresh non-imported disposition evidence, owner-witnessed installed Windows context and two separate HOLD attestations, append a fixed-category **PRIVATE_DISPOSITION_CONTINUITY_NOT_SENT** note. Export the complete nested 148–166 JSON receipt, up to 4.3 MB. Earlier receipts import strictly as historical unverified claims, with Windows witness reset.
6. Compare two successive complete Build 165 receipts read-only. Every prior stream from 148 through 165 must remain an exact append-only prefix; the check tests structural continuity, not cryptographic authenticity or physical acceptance.

## Release verification

- Focused checks: `npm --workspace apps/web run test -- ownerDispositionContinuity.test.ts DispositionContinuityWatchPanel.test.tsx ownerHandoffReconciliation.test.ts`.
- Full tests: `npm run web:test`.
- TypeScript and production bundle: `npm run web:build`.
- Promotion: Build 166 feature PR into `dev`; independent `dev` push CI GREEN; `dev → main` PR checks GREEN; independent `main` push CI GREEN on exact production SHA.

## Safety limits

`FIELD_ACCEPTANCE_HOLD`, `INDEPENDENT_REVIEW_HOLD`, and `NOT_AUTHORIZED` are immutable. No real request, message, timer, staff assignment, remote integration command, field certification, automatic closure or first-party password/document Vault clearance. Source CI is separate from installed Windows/device acceptance. Vault stays **0/6 verified · SECURITY HOLD**.

## Next expected

Build 167 — Independent Continuity Watch Outcome Reconciliation & Source Renewal Evidence Freshness.
