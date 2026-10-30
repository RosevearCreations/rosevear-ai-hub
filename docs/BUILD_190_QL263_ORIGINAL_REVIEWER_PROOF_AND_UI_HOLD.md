# Build 190 — QL-263 original independent reviewer receipt, fresh public proof B and safe connection decision (HELD)

30 October 2026 (America/Toronto) · **Source software Production GREEN is independent of integration DISCONNECTED / HOLD.**

## Implemented source changes

1. Added `scripts/ql263-hub-reviewer-proof-gate.mjs` for **offline public-only** intake of a hypothetical actual original QL-263 Ed25519 reviewer envelope. It rejects missing/extra fields, private key PEM, cross-repository identity, reused opaque role receipt IDs, coincident signer/witness/reviewer SPKI keys, altered signatures, an expired or oversized five-minute challenge, non-HOLD claims and self-declared owner TEST approval. It emits only nonsecret digests/statuses. Even valid public Ed25519 math remains a candidate, **not authenticated human custody**.
2. Added an opt-in strictly public GitHub-only source A → current proof B recheck. It requires distinct immutable 40-character SHAs, exact completed GREEN `main` source-push CI, a stable current `main` head, strict A→B ancestry, and the original proof path HTTP 404 or raw-byte 200 hash. A public 200 remains **UNTRUSTED** until actual independently authenticated source signer/custody and original proof-signature review. No home Windows, MQTT, Home Assistant, cameras, Vault, gateway or credentials are contacted.
3. Updated existing QL-265 `CommsHubConnectionPanel` to explicitly show `QL-263 independent decision: HOLD` alongside local readiness. The local synthetic test still has `localPass: true` for its fixed screen contract, but adds `activationEligible: false`, `originalReviewerReceipt: NOT_RECEIVED`, `connectionGateDecision: HELD_PENDING_ORIGINAL_REVIEWER_PROOF_B_AND_OWNER_TEST`, `remoteConnection: DISCONNECTED / HOLD`. No new connecting or installing button exists. Added React tests.
4. Added Node regression tests using temporary in-memory TEST keys and mock public GitHub responses. These synthetic signatures and mocked GETs are **not** genuine original evidence, private reviewer authentication, owner approval or real external gateway tests.

## Actual public facts checked before source edit

| Gate | Actual observed disposition |
|---|---|
| Immutable previous `main` source A candidate | `f20eda8e64e6785361e092636d9526194a2a855e` |
| Exact matching completed GREEN main-push CI | [Run 41001158352](https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41001158352) |
| Original `docs/integration/ql246-source-proof.json` at that SHA | **HTTP 404**, original signed proof B not published |
| Actual owner QL-258 original packet | **NOT_PROVIDED** |
| Actual original reviewer public envelope | **NOT_PROVIDED** |
| Human signer custodian, independent reviewer and separate nonce witness | **NOT_INDEPENDENTLY_AUTHENTICATED** |
| Public Ed25519 signing/witness SPKI out-of-band pin | **NOT_VERIFIED** |
| Actual authenticated nonproduction gateway GET + seven denials | **NOT_RUN / NOT_VERIFIED** |
| Owner TEST-only authorization | **NOT_GIVEN** |
| Home Windows mini-server relay | **NOT INSTALLED / OFF** for this integration |

After Build 190 `main` promotion, verify the new exact source SHA and CI separately from these historical values. The existence of a QL-265 local I.T. panel does not imply a real connection.

## Operator commands (offline default)

```bash
npm run integration:ql263:hub:check
npm run integration:ql263:hub:test

# Only after a real original PUBLIC reviewer envelope is supplied, through an approved process
npm run integration:ql263:hub:check -- --reviewer-envelope /path/to/original-public-reviewer.json --source-A <audited-40-sha> --reviewer-public-pin <separately-authenticated-public-sha256>

# Opt-in public GitHub source proof comparison, only when genuine separate proof B is known
npm run integration:ql263:hub:check -- --public-get --source-A <audited-source-A-sha> --proof-B <actual-proof-B-sha>
```

The reviewed original QL-246 proof B must be published by an authenticated authorized private source operator into a distinct descendant commit referencing the audited source A. A self-contained reviewer signature or arbitrary digest copied from a dashboard **cannot** independently certify the signer's identity, separate human witness or correct private custody. A real owner authorization, independent reviewer, original gateway receipts/seven denials and rollback plan are separate future gates. Do not enter names, family/home details, passwords, HMAC, signer private key, private host addresses or key-store paths into these public commands, repositories or browser views.

**Final result: source can be Production GREEN; gateway and Comms integration remain DISCONNECTED / HOLD.**

**Next proposed Build 191 — QL-264 Authentic Private Custody Decision Evidence Reconciliation, Original Signed Source-Proof Publication Audit & Reversible TEST-Only Gate Readiness (HELD).**
