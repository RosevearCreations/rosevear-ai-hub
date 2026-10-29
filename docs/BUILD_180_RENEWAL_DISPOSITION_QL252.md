# Build 180 — Independent Renewal Watch Exception Disposition & QL-252 Original Source Proof Blocker Reassessment

## Implemented scope

- Strict same-original-watch chronological Build 179 renewal dispositions with progressively later Build 178 private exception references, repeated owner/source gaps, source identity drift and manual 3+ / 8+ day aging. All later data are labelled **private, unverified claims**, not independent source observation.
- Fixed-category local `PRIVATE_RENEWAL_DISPOSITION_NOT_SENT` entries require a non-imported later Build 179 renewal, installed Windows witness and two separate explicit HOLD acknowledgements. No event, notification, automated assignment, gateway request, device action, reviewer approval or owner TEST authorization is created.
- Full nested private Build 148–180 export/import with immutable Build 179 historical prefix comparison; imported Windows witness is cleared and every imported outcome stays historical. Receipt cannot claim `CONNECTED`, owner approval or field/independent review acceptance.
- New `.github/workflows/foundation.yml` `docs-foundation` CI step enforces `node scripts/ql252-hub-publication-guard.mjs`: absent signed proof is honestly `MISSING_OR_NOT_PUBLISHED / HOLD`; unexpected `docs/integration/ql246-source-proof.json` presence fails CI. Releasing authentic proof later requires **a separate authorized review and explicit policy change**; this build itself cannot verify original private witnesses and must not let a local test fixture bypass that gate.
- Synthetic offline publication guard tests plus existing QL-252 GitHub-only provenance tests; no network in default guard. Optional previous public-only source/proof checker remains opt-in and never touches the household LAN or private runner.

## QL-252 truthful blocker reassessment

Previous Build 179 public `main` commit was `031a0f0cbc834f002664e08d8c331711f2ad3337`; its immutable genuine QL-246 signed-proof path was independently confirmed **404**. Build 180 does not fabricate an Ed25519 signer, one-hour challenge, seven genuinely witnessed negative-denial results, gateway receipts, private HMAC, pin custody or owner TEST approval. Source CI may be GREEN while `docs/integration/ql246-source-proof.json` remains **404 / NOT AVAILABLE** and every cross-application connection stays `DISCONNECTED / HOLD`.

Future genuine publication requires separately authorized private-runner nonproduction GET/denial observations, independent custody/witness originals, secure app-specific signer and fresh private challenge, source commit **A** matching GREEN CI, descendant proof commit **B** with actual signed bytes referencing **A**, independently pinned raw SHA-256 and SPKI, owner-scoped TEST-only decision, and later separate owner pilot approval. No source-build CI fixture substitutes for these originals.

## Release checks

Run full web Vitest/TypeScript/production build, backend pytest, QL-246 offline contract, QL-252 public checker + new publication-guard tests; require all five GitHub checks on feature PR, `dev` push, `main` promotion PR and final `main` SHA. Source GREEN is separate from installed Windows field and Vault `0/6 SECURITY HOLD`.

Operator handoff: `docs/integration/QL252_HUB_ORIGINAL_PROOF_BLOCKER_REASSESSMENT.md`.
