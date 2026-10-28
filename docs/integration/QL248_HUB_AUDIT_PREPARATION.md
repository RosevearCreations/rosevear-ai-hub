# Rosevear AI Hub — QL-248 public source/proof audit preparation (NOT AN AUTHORIZATION)

**Repository:** `RosevearCreations/rosevear-ai-hub`.

The Build 177 workbench may inspect *format only* of public audit identifiers. It does not perform an authenticated gateway request or verify the external source. The original QL-246 requirement to sign `source_revision` as the SHA of the commit containing its own public JSON is impossible; QL-248 proposes separate immutable identifiers **S** and **P**, subject to separate consumer/operator acceptance.

| Public identifier | Evidence role | Required verification outside the Hub |
| --- | --- | --- |
| `sourceRevision` (`S`) | Earlier audited code commit, 40 lowercase hex | Immutable GitHub retrieval, exact CI GREEN for **S**, source-code and tenant review |
| `sourceCiRunUrl` | GitHub Actions run in this repository | Independently verify run SHA equals **S** and all expected checks GREEN |
| `proofCommitSha` (`P`) | Later immutable commit containing genuine `docs/integration/ql246-source-proof.json` | **P must differ from S**; source proof must be independently fetched at **P**; this is NOT currently present |
| `proofSha256` | Raw bytes digest of the genuine public JSON fetched at **P** | Independently hash fetched raw bytes, separately pin digest in operator manifest |
| `publicKeySpkiSha256` | Source's actual public Ed25519 DER-SPKI SHA-256 | Obtain fingerprint via separate authenticated channel; never treat a typed hex string as authenticated |

Only `GET /api/integration/v1/health` and `GET /api/integration/v1/capabilities` may be separately approved in a future nonproduction private server-to-server test. This Build does **not** provision a runner, HMAC secret, signing private key, external GET, signed QL-246 proof, source pin, audit receipt or owner approval.

## Honest handoff text

```text
Application: rosevear-ai-hub
Repository: RosevearCreations/rosevear-ai-hub
Current exact main SHA and GREEN CI: VERIFY AFTER BUILD 177 PROMOTION
QL-248 source S, distinct proof P and raw proof-byte digest: S REQUIRED; P AND DIGEST MISSING
QL-248 consumer two-SHA contract agreement: PENDING / UNVERIFIED
Public Ed25519 SPKI pin independently authenticated: NOT VERIFIED
Real independently witnessed seven denials and gateway receipts: UNVERIFIED
Private source-only runner and scoped nonproduction HMAC key: NOT PROVISIONED
Independent durable audit, revocation and rollback: UNVERIFIED
Owner permission for nonproduction test / pilot: NOT GIVEN / NOT GIVEN
Connection state: DISCONNECTED / HOLD
```

No household IP address, hostname, topology, camera/device inventory, Vault content, customer/personal information, HMAC key, private signer, bearer token or challenge nonce should appear in a public GitHub issue, signed source metadata or handoff. Do not claim a source CI pass authenticates a real Windows field test.
