# Build 174 — Held Disposition Source Recheck Exception Continuity & Independent Reviewer Evidence Reassessment

## What changed

- Manual browser-local comparison of two chronological private Build 173 disposition follow-ups for the **same original held watch**, with no recurrence regression.
- Distinguishes genuinely newer **claimed** witnessed owner evidence and distinct pseudonymous source checks after the earlier follow-up. Repeated owner/source gaps, changed alias/version/access, unverified fresh claims, source overdue (>7 days) and manual 3+/8+ day follow-up aging remain visible.
- Fixed-category private `PRIVATE_HELD_DISPOSITION_REASSESSMENT_NOT_SENT` notes; a non-imported later follow-up, personally witnessed installed Windows evidence, manual recheck and a separate HOLD acknowledgment are mandatory.
- Full Build 148–174 nested private export/import. Imported records are historical unauthenticated claims; no imported Windows witness or new reviewer permission. Immutable reassessments are recomputed on parse; an exact nested Build 173 historical-prefix comparison detects edits/rewrites.
- Help and integration handoff flag QL-246 **PENDING**; neither local CI nor seven synthetic QL-245 negative fixture tests can satisfy seven independently witnessed QL-246 negatives.

## Unconditional safety invariants

`FIELD_ACCEPTANCE_HOLD`, `INDEPENDENT_REVIEW_HOLD`, `NOT_AUTHORIZED` closure, `DISCONNECTED` integration, Vault `0/6 verified · SECURITY HOLD`. No new live API calls, background timers, push notifications, SMS, outbound gateway probes, owner approvals, camera/device/automation actions or secret exposure. CI GREEN is **source test status only**, not physical Windows acceptance.

## QL-246 operator handoff

See [`docs/integration/QL246_HUB_PENDING.md`](integration/QL246_HUB_PENDING.md). The Hub cannot yet sign a real `docs/integration/ql246-source-proof.json`: no entrusted challenge, isolated private signing key, independent public pin, seven witnessed external denials or genuine gateway receipts. The current handoff's demand for `source_revision` to equal the containing proof-file commit is self-referential; the independent operator must amend it to separate the audited source commit from the later proof publication commit before any proof can be issued. This does not stop source-code CI promotion of Build 174.
