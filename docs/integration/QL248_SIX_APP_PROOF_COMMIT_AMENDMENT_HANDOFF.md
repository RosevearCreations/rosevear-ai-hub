# QL-248 — six-application source/proof commit distinction for independent operators

**Copy to six applications. This public technical request contains no secrets and grants no authorization to connect.** Comms Hub phone/SMS/dispatch stays disabled; all companies and Hub remain DISCONNECTED / HOLD.

The original QL-246 file cannot contain the Git SHA of the commit that contains itself. The correct safe transport clarification requires explicit agreement from AI Data Platform's consuming verifier:

- **`source_revision = S`**: earlier audited code commit, covered by the signed QL-246 payload, with exact GREEN source CI `ci_run_url`.
- **`proofCommitSha = P`**: later immutable Git commit publishing `docs/integration/ql246-source-proof.json`; this identifier stays in a separately trusted operator manifest, **not inside the signed JSON**.
- **`proofSha256`**: exact SHA-256 of raw public JSON bytes fetched at `P`, pinned in the separate manifest.
- **`publicKeySpkiSha256`**: actual Ed25519 *public* key's DER SPKI SHA-256, independently authenticated out of band and distinct for every app.
- Preserve the existing 24-field QL-246 signed schema, exact canonical signing bytes, one-hour challenge, seven genuinely witnessed negatives and nonproduction GET-only HOLD assertions unchanged.

| System | GitHub repository | Specific safety proof required |
| --- | --- | --- |
| AI Data Platform | `RosevearCreations/ai-data-platform` | **Explicitly accept two-SHA consumer verification**, exact source CI, no direct business database read |
| Devil n Dove | `RosevearCreations/devilndove-site` | Separate original source/test SHA and later proof SHA; listing, Etsy/Marketplace mutations off |
| Rosie Dazzlers | `RosevearCreations/rosiedazzlers` | No gift/booking/payment/SMS mutations or fabricated denial/audit IDs |
| Yard Workers | `RosevearCreations/yw` | Confirm isolated genuine company tenant; no job, payroll or dispatch actions |
| iCamp | `RosevearCreations/iCamp` | Confirm isolated campground tenant; no reservation/gate commands |
| Rosevear AI Hub | `RosevearCreations/rosevear-ai-hub` | Private household server only; separately authorized isolated runner required; no camera/device/Vault exposure |

## Phased return

1. **Public Phase A:** exact current source SHA and GREEN CI, tenant/business mapping, honest signer/pin readiness and missing receipt IDs. The final signed proof is **MISSING/BLOCKED** until genuine tests occur. Local fixture tests cannot substitute original external evidence.
2. **Approved Phase B only:** after separate owner test authorization, a private protected server-to-server runner makes only authenticated nonproduction GET `/api/integration/v1/health` and `/api/integration/v1/capabilities` with per-app secret-store HMAC, 12-line QL-243 canonical request, replay denial and independent reviewer. Preserve seven original rejection traces, durable audit after restart, scoped key revocation and rollback. No other endpoints, customer data or commands.
3. **Post-test QL-246 proof:** get a fresh one-hour challenge, sign the unmodified canonical payload for earlier `S`, publish the authentic nonsecret JSON at later `P`, independently retrieve raw bytes and separately pin `P`, digest, source CI and public Ed25519 SPKI fingerprint. Expired challenges require reissue, never backdating.
4. **Consumer contract and separate owner decision:** AI Data Platform must confirm two-SHA verifier acceptance. Comms Hub's offline six-source validator may report only signed-metadata HOLD, not connected. A later pilot requires new authenticated, time-bounded, reversible per-tenant owner approval; **NOT GIVEN** now.

Copyable truthful response:

```text
Repository / exact tested main SHA / same-SHA GREEN CI URL:
Source SHA S / distinct proof-bearing commit P / raw public proof SHA-256: VERIFIED / MISSING
Independently authenticated Ed25519 public SPKI pin: VERIFIED OUT OF BAND / NOT VERIFIED
Two-SHA QL-246 amendment accepted by source and AI Data Platform consumer: YES / NO / PENDING
Seven real witnessed nonproduction denials with original receipt IDs: VERIFIED / PENDING
Durable audit after restart, scoped revocation and rollback witness: VERIFIED / PENDING
Approved protected private runner and nonsecret HMAC key IDs: VERIFIED / NOT PROVISIONED
Owner pilot authorization: NOT GIVEN
Actual connection: DISCONNECTED / HOLD
Remaining blockers:
```

Never include signing private keys, HMAC/bearer credentials, owner identity documents, private-network topology, household device names, Vault material, customer data or personal health data in public source proof or GitHub issues. The Comms Hub QL-248 bundle verifier is offline-only; an offline PASS cannot certify external gateway access, observed denials, durable audit or owner approval.
