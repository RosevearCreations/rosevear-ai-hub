# Build 173 — Independent Recurrence Disposition Follow-Up Aging & Verified Owner Source Recheck

## Manual private evidence only

1. Compare two distinct chronological Build 172 `PRIVATE_OUTCOME_EXCEPTION_RECURRENCE_NOT_SENT` notes from the **same original held watch**. The later note cannot regress to an earlier Build 171 outcome or Build 170 recheck.
2. Reinspect the later Build 172 note's linked Build 171 outcome, Build 170 recheck, Build 169 follow-up and exact witnessed owner observation. An owner observation must be after the **earlier recurrence** and no later than the later recurrence to count as a structurally fresh claim. A source check must have a distinct index, same case and captured timestamp in that interval. No export timestamp is independent source evidence.
3. Recompute repeated owner/source gaps, pseudonymous alias/identity/version/access conflicts, claimed disposition category changes, and source age at manual review. Missing/older than 7 days is overdue; an earlier recurrence at least 3 days old is aged and older than 7 is overdue. The result is always `independently_verified: false`, `unresolved: true`, and an independent HOLD.
4. Only after personally witnessed installed Windows, a non-imported later recurrence and two separate HOLD confirmations may a fixed-category private `PRIVATE_RECURRENCE_DISPOSITION_FOLLOWUP_NOT_SENT` note be appended. Duplicate/reordered/tampered notes and unsupported categories are rejected. No timer, message, real owner change or approval occurs.
5. Strictly compare complete chronological Build 172 JSON receipts as an **exact historical prefix of every nested evidence stream**, not just the latest notes. Export full nested Build 148–173 private JSON (7 MB cap); imports are historical unverified claims and clear installed-Windows witness confirmation.

## QL-245 revised six-app handoff reviewed

The attached **QL-245 six-app evidence return** supersedes the first-phase `read_service_health` advertisement. The staged **default-disabled** nonproduction source remains limited to authenticated HMAC-signed `GET /api/integration/v1/health` and `GET /api/integration/v1/capabilities`, with the exact ordered advertised scopes `read_health`, `read_capabilities`. Key IDs must have the `np-...` prefix, tenant is null (canonical HMAC `-`), `business=destination=rosevear-ai-hub`, and the sole permitted source is `ai-data-platform`. The API response says `DISCONNECTED`; it does not imply a connected gateway, service verification or a pilot.

Local synthetic tests now explicitly exercise all seven QL-245 denial categories: nonce replay, stale timestamp, wrong business, wrong tenant, revoked key, prohibited write, prohibited dispatch. These tests are useful source regressions **but NOT** actual nonproduction external denials, original gateway audit traces, or independent reviewer evidence. No keys or secrets have been provisioned and no remote HMAC exchange has been performed.

**QL-245 still requires separately authorized work:** six independently registered scoped credentials and original health/capability receipts; independently retrieved signed gateway audit receipts and durable read-after-restart proof; original seven denial audit IDs; distinct out-of-band verified Ed25519 SPKI source and assessor pins; exact signed 22-field public metadata per `QL245_SOURCE_KEYS` and separate assessor envelope; nonproduction deployed revision verification; independently observed rotation/revoke and rollback; and explicit separately authenticated owner approval. None may be marked successful from source CI or generated fixtures. The Hub cannot truthfully produce a signed QL-245 source packet yet.

**Permanent holds:** `DISCONNECTED`, `FIELD_ACCEPTANCE_HOLD`, `INDEPENDENT_REVIEW_HOLD`, `NOT_AUTHORIZED`, first-party Vault **0/6 SECURITY HOLD**. No external events, commands, dispatch, cross-company data, cameras, household network topology, secrets or live Vault activity.

## Verification and promotion

- New model/UI tests, full web tests/build/typecheck and backend tests (especially QL-245 denial fixtures).
- Feature PR five lanes GREEN → `dev` independent push five lanes GREEN → promotion PR five lanes GREEN → `main` push five lanes GREEN with identical reviewed trees.
- Physical installed-Windows acceptance, credential issuance, live nonproduction connection and owner authorization remain independently unverified even after source CI GREEN.

**Next expected:** Build 174 — Held Disposition Source Recheck Exception Continuity & Independent Reviewer Evidence Reassessment.
