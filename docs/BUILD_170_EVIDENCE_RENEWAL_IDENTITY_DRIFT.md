# Build 170 — Independent Aging Follow-Up Evidence Renewal & Source-Identity Drift Recheck

## Private owner-safe evidence workflow

1. Compare two chronological Build 169 follow-up notes referencing the same original held reassignment watch, without moving backward to an older Build 168 audit. Each note is recomputed against the complete prior source chain. A later receipt export alone never establishes newer owner/source evidence.
2. Recheck whether a later owner observation and pseudonymous source check were actually witnessed **after the first Build 169 follow-up**. Missing new evidence is an explicit unresolved exception and may still be recorded privately, not a pass.
3. Contrast claimed source alias and identity state separately from installed-version and access-category drift. Even a `confirmed_alias` is a private operator label, **never authenticated physical device identity**. Source renewal requires a distinct, later indexed check captured after the first follow-up and after any prior linked check.
4. Recalculate source ages and the earlier follow-up age **only on manual review**; 3+ days means aged, 8+ days overdue. Missing source evidence is overdue. Repeatedly overdue checks, unsupported claimed identity, owner-role/outcome drift and no newer owner trial remain visible in the same held case.
5. Fixed-category append-only `PRIVATE_EVIDENCE_RENEWAL_RECHECK_NOT_SENT` records require a **later non-imported Build 169 follow-up**, witnessed installed Windows Hub, personally compared evidence and **two separate independent-HOLD acknowledgments**. Accepting an exception is not source certification or case closure. Maximum 100 records; exact chronology, evidence, categories and HOLD flags are immutable.
6. Compare two complete Build 169 receipts **read-only** as strict append-only prefixes of every nested stream with compatible environment labels. Full Build 148–170 private nested export is capped at 5.85 MB. Imports reset Windows witness state and preserve historical counters.

## Integration Contract v1 boundary

AI Data Platform remains the sole planned cross-company gateway. No credentials, live connection, health handshake, events, messages, reminders or remote automation commands are enabled by Build 170. No cross-company database access is introduced.

## Verification and deployment

- `npm --workspace apps/web run test -- ownerEvidenceRenewalRecheck.test.ts EvidenceRenewalRecheckPanel.test.tsx`
- `npm run web:test`, `npm run web:build`, `git diff --check`.
- Feature PR → `dev` five CI checks GREEN → independent dev push five CI checks GREEN → promotion PR five checks GREEN → independent main push five CI checks GREEN at exact production SHA; identical dev/main trees.

## Unconditional HOLD

Source CI is not physical Windows field acceptance. `FIELD_ACCEPTANCE_HOLD`, `INDEPENDENT_REVIEW_HOLD`, `NOT_AUTHORIZED` and first-party password/document Vault **0/6 independently verified · SECURITY HOLD** remain in force. No real owner assignment, message, notification, API command, source certification, approval or closure.

**Next expected:** Build 171 — Independent Source Drift Follow-Up Outcome Aging & Owner Evidence Continuity.
