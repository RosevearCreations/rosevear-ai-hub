# Rosevear AI Hub — QL-248 two-commit source proof clarification (PENDING)

**Application:** `rosevear-ai-hub` / `RosevearCreations/rosevear-ai-hub`

**Scope:** public nonsecret source verification only. This response grants **no credentials, private runner, authenticated GET, physical device access or pilot authorization**. After Build 176 is promoted, report the exact current immutable `main` source SHA and matching GREEN CI URL from GitHub; earlier Build 175 SHA/CI cannot stand in for the newer source.

## QL-248 amended proof provenance — explicit agreement requested

The source-side QL-246 verifier already distinguishes the two independent Git identities:

| Identity | Hub's intended meaning | Status |
| --- | --- | --- |
| Signed QL-246 `payload.source_revision` | An earlier reviewed and tested code commit `S`, with its own exact GREEN `ci_run_url` | Supported in offline contract; no live acceptance evidence |
| Operator `proofCommitSha` | A **later** immutable Git commit `P` containing the public signed proof JSON | MISSING: no genuine public signed JSON |
| `proofSha256` | SHA-256 of exact raw JSON bytes fetched at `P`, independently recorded in public-metadata-only operator manifest | NOT AVAILABLE |
| `publicKeySpkiSha256` | SHA-256 of actual Ed25519 public key DER SPKI, obtained through a separate authenticated pin channel | NOT PROVISIONED / UNVERIFIED |
| `ciRunUrl` | Exact successful CI for `S`, not `P` or another repository | Required by offline checker; operator must confirm |

**Proposed amendment requires affirmative agreement by the AI Data Platform QL-246 consumer and six source operators.** Comparing `S == P` is a self-referential SHA requirement and cannot be completed honestly. Do not invent matching SHAs or backdate a signature. The existing QL-246 24-field signed schema, canonical UTF-8 signing bytes, one-hour challenge, seven genuine independently witnessed denied requests, read-only paths and permanent HOLD assertions do **not** change. The extra proof-publication SHA and raw digest live **outside** the signed envelope in an independently verified operator manifest.

The Hub provides an offline-only source envelope validator in `scripts/ql246-source-proof-contract.mjs`, with disposable synthetic-key tests. It requires separate source SHA, proof-publication SHA, raw digest, CI, out-of-band public SPKI pin, trusted challenge and all seven independently witnessed rejection names. Such a local test is **not** an authenticated gateway test. It performs no GitHub/Gateway fetch, key provisioning or owner approval. The QL-248 Comms Hub six-app bundle command remains the receiving operator's responsibility.

## Hub's truthful public return

```text
Repository: RosevearCreations/rosevear-ai-hub
Exact current tested main SHA / same-SHA source CI: RETURN AFTER BUILD 176 MAIN GREEN
Separate proof-bearing commit SHA / raw proof SHA-256: MISSING / NOT AVAILABLE
Independently authenticated app-owned Ed25519 public SPKI pin: NOT VERIFIED
QL-248 two-SHA amendment adopted in source checker: IMPLEMENTED AS OFFLINE CONTRACT
QL-248 two-SHA amendment accepted by AI Data Platform consumer: UNVERIFIED / PENDING
Seven genuinely witnessed nonproduction denials and original receipts: PENDING
Durable audit after restart, revocation and rollback: PENDING
Approved isolated private runner and server-only HMAC key ID: NOT PROVISIONED
Owner test approval / owner read-only pilot approval: NOT GIVEN / NOT GIVEN
Actual connection state: DISCONNECTED / HOLD
```

## Exact missing human-operated steps

1. Independent operator confirms source and proof-publication SHA verification contract with AI Data Platform and six repositories, along with exact source CI and tenant mappings.
2. Separately approved nonproduction private runner, scoped GET-only target/source/tenant, expiry, independent reviewer and rollback; this handoff itself authorizes none of them. No private LAN hostname, IP address or device/Vault information is returned publicly.
3. Server-side separate random HMAC secrets, independently authenticated distinct Ed25519 SPKI pins, real GET health/capabilities receipts, seven witnessed target-side denials, original audit durability and revocation/rollback, **only after separate nonproduction-test owner consent**.
4. Fresh one-hour challenge after witnessed evidence; produce genuine QL-246 nonsecret signed envelope, commit at later `P`, independently hash its fetched raw bytes, pin SHA/pin/CI separately, verify both source and publication revisions. If expiry passes, retry a new challenge; never fabricate or backdate.
5. Even verified signed public metadata is **not** authorization for a read-only pilot. Obtain separate, specific, reversible owner approval later.

**Permanent invariants:** `DISCONNECTED / HOLD`, `FIELD_ACCEPTANCE_HOLD`, `INDEPENDENT_REVIEW_HOLD`, `NOT_AUTHORIZED`, password/document Vault `0/6 SECURITY HOLD`. No household network disclosure, customer data, real device/camera actions, Comms Hub calls/SMS or dispatch.
