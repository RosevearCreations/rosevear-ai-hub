# Build 172 — Independent Recheck Outcome Exception Recurrence & Owner Continuity Freshness

## Owner-safe private evidence review

1. Compare two *different chronological* Build 171 private source-drift outcome notes for the exact original held watch; later notes must reference the same or a later Build 170 recheck. No cross-case or backward chronology is accepted.
2. Inspect the latest Build 171 owner observation and source check against the **earlier outcome's recorded time**, not just its earlier Build 170 recheck. A newer export date cannot establish fresh evidence. A `confirmed_alias` remains a private unverified source label.
3. Distinguish repeated owner-witness gaps, repeated missing source renewal, persistent identity drift and version/access conflicts. Recompute old/latest source ages (missing means overdue), repeat 8+ day overdue, and earlier outcome aging at 3+ / 8+ days. Even fresh owner or source claims do not release independent HOLD.
4. A fixed-category private `PRIVATE_OUTCOME_EXCEPTION_RECURRENCE_NOT_SENT` record can be appended only with a later **non-imported** Build 171 outcome, witnessed installed Windows, personal evidence comparison and a *separate* immutable HOLD acknowledgment. Deny unsupported categories, duplicate pairs/categories, forged fields or backward dates. A maximum of 100 private notes is allowed.
5. Compare an earlier complete Build 171 receipt with a later complete Build 171 receipt as a strict historical prefix of **every nested stream**, with only later append-only evidence and regenerated monotonic export timestamps. Export full Build 148–172 nested JSON (6.7 MB cap); imports remain historical-only and reset Windows witness confirmation.

## Connection and security boundaries

AI Data Platform remains the sole intended gateway; QL-243 server-only HMAC nonproduction GET health/capabilities endpoints from Build 171 stay **disabled by default** and are *not* invoked by this panel. No events, commands, cameras, business data, automations or first-party password/document Vault secrets enter private receipt exports. Ed25519 gateway receipts, separately witnessed owner identity, datastore durability review and owner pilot authorization remain **NOT IMPLEMENTED / HOLD**.

## Verification gates

- Focused new model/UI tests, full `npm run web:test`, `npm run web:build`, `npm run web:typecheck` and `git diff --check`.
- Backend source remains unchanged; the existing QL-243 HMAC, atomic nonce-replay and negative tests must continue passing in independent GitHub CI.
- Feature PR → `dev` five independent checks GREEN, separate `dev` push five checks GREEN, promotion PR five checks GREEN, `main` push five checks GREEN, identical reviewed source trees.

**Unconditional holds:** `FIELD_ACCEPTANCE_HOLD`, `INDEPENDENT_REVIEW_HOLD`, `NOT_AUTHORIZED`, first-party Vault **0/6 SECURITY HOLD**. GitHub source CI never substitutes for owner-supervised Windows/household hardware acceptance.

**Next expected:** Build 173 — Independent Recurrence Disposition Follow-Up Aging & Verified Owner Source Recheck.
