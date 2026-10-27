# Build 161 — Historical Watch Outcome Follow-Up & Independent Exception Aging Audit

Status: IMPLEMENTED; reviewed `dev` → `main` promotion and source CI verification pending.

## Scope

1. Link one exact Build 160 private watch to a **later** personally witnessed owner observation for the **same case**. Preserve the original watch index, original first recheck date, owner finding, and follow-up date. Show manual as-of age from both the watch and the first recheck, with under-three-days, three-to-seven-days, and over-seven-days bands. Never interpret a subsequent owner pass as independent approval or erase prior findings.
2. Compare source identity claims from before the historical watch against optional new pseudonymous source identity claims linked to the exact later owner trial. Flag changed alias/state/installed version/access, unknown or mismatched identities and missing fresh source evidence. Identical aliases are unverified, **not** proof of physical identity.
3. Require a new, non-imported owner trial, witnessed installed Windows version/private access, manual evidence comparison and separate HOLD acknowledgement before appending a bounded private audit. Exactly anchored watch/trial/source indices, computed ages and signals, and fixed HOLD-only category are immutable. Reject duplicate decisions, forged approval, tampered chronology and invalid source linkage.
4. Read-only comparison of two complete Build 160 JSON exports requires chronological export timestamps, exact append-only prefixes of owner observations, private source records, rechecks, watches and every prior review stream; earlier file is never imported or authenticated by this comparison. Build 161 nested JSON retains Builds 148–160 and at most 100 additional private audits (2.5 MB bound). Older imports remain historical-only and reset witnessed Windows context.

## Acceptance and restrictions

- Run full web tests, TypeScript and production web build. Feature PR, independent `dev` push, `dev` → `main` PR, and independent `main` push must each finish all five GitHub CI jobs successfully before calling source production GREEN.
- All operations remain browser-local until an explicitly clicked JSON export. No timer, dispatch, source mutation, automated reviewer assignment or closure. `FIELD_ACCEPTANCE_HOLD`, `INDEPENDENT_REVIEW_HOLD`, `NOT_AUTHORIZED` are immutable even after improvement.
- Source CI can verify code, not the actual household Windows Hub, Home Assistant, cameras, independent field reviewer or first-party password/document Vault (**0/6 verified · SECURITY HOLD**).

## Next expected

Build 162 — Independent Aging Audit Receipt Reconciliation & Owner Exception Reassignment Watch.
