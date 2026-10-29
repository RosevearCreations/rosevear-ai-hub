# Build 178 — Independent Triage Exception Follow-Up Aging & QL-248 Proof Provenance Review

## Implemented (browser-local source only)

- Compare two chronological same-original-watch Build 177 private continuity notes referencing **progressively later Build 176 triage notes**. Recompute whether the newer claimed owner observation and distinct pseudonymous source check occurred after the earlier continuity, with no alias or timestamp treated as authenticated physical evidence.
- Reclassify repeated owner/source evidence gaps, identity/version/access drift, source evidence >7 days old, earlier continuity 3+ days aged and 8+ days overdue. These are manual calculations on inspection, never automatic reminders or independent dispositions.
- Append fixed-category `PRIVATE_TRIAGE_EXCEPTION_FOLLOWUP_NOT_SENT` only for a **non-imported** later continuity note following a witnessed Windows version/access recheck and two separate operator/HOLD acknowledgments. No source/tenant contact, reassignment, owner-role change, network request or review approval.
- Export full nested **Build 148–178** private JSON evidence; validate all fixed HOLD labels, chronology and immutable source lineage. Historical Build 148–177 imports remain historical only and reset installed Windows witness and typed public provenance fields. Compare two complete Build 177 receipts only with exact append-only historical prefixes.
- Support **optional local public QL-246 signed JSON** review against the typed QL-248 source/proof form. The browser computes SHA-256 of exact raw UTF-8 bytes, confirms the strict 24-key payload order, nonproduction GET-only/owner-NOT-GIVEN/DISCONNECTED fields, claimed seven negatives, challenge time window, public Ed25519 SPKI digest and detached signature over canonical bytes. It performs **no external GET** and never receives private keys, HMAC credentials, customer data or household network information.
- Even if all local cryptographic operations succeed, return only `LOCAL_CRYPTO_MATCH_UNTRUSTED_HOLD`: the typed SPKI fingerprint is not independently authenticated, source `S` CI and proof commit `P` were not fetched independently, challenge and original seven denials were not witnessed, durable gateway audit and consumer amendment agreement were not established, and owner test/pilot authorization remains NOT GIVEN.

## QL-248 truthful source handoff

`RosevearCreations/rosevear-ai-hub` is a private household application and keeps its gateway default-disabled. Determine the latest exact Build 178 `main` commit SHA and matching **GREEN** GitHub Actions run only **after** production promotion; historical Build 177 SHA/CI cannot substitute.

**Missing actual evidence:** no authenticated private test runner/transport, scoped server-side HMAC or original gateway GETs, no source-specific nonproduction seven denial receipts or restarted durable audit, no independently authenticated Ed25519 public pin, no trusted one-time signing challenge or genuine public `docs/integration/ql246-source-proof.json` at a later distinct `P`, and no independently verified AI Data Platform consumer acceptance. Do not create a fabricated signed public proof or run a live pilot.

See `docs/integration/QL248_HUB_PROVENANCE_REVIEW_RETURN.md` for the operator-safe response. All field/reviewer and first-party Vault verification remain separate from source CI.

**Unconditional safety status:** `DISCONNECTED / HOLD`, `FIELD_ACCEPTANCE_HOLD`, `INDEPENDENT_REVIEW_HOLD`, `NOT_AUTHORIZED`, first-party Vault `0/6 SECURITY HOLD`. A passing build or even a locally valid detached signature never turns any of these GREEN.
