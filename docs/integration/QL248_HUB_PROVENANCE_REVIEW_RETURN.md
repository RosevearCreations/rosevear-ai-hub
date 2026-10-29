# Rosevear AI Hub — QL-248 local proof provenance review return (HOLD)

**Public source repository:** `RosevearCreations/rosevear-ai-hub`. **Not permission to connect.** No credentials or private network data in this handoff.

QL-248 distinguishes:

- `S`: independently audited/tested code commit (`payload.source_revision`) and exact same-SHA successful CI.
- `P`: a **different later** immutable commit containing the authentic public signed `docs/integration/ql246-source-proof.json`; `P` belongs in a separately independently pinned operator manifest, not the signed JSON itself.
- `proofSha256`: SHA-256 of independently fetched **raw public JSON bytes** at `P`.
- `publicKeySpkiSha256`: public DER-SPKI SHA-256 authenticated **out of band**; a typed fingerprint or local digest match does not make it trusted.

Build 178 can optionally check an operator-selected *public, nonsecret* JSON locally. It computes the raw digest, strict 24-field signing bytes, Ed25519 detached signature, public SPKI digest and nonproduction HOLD assertions. If the public evidence is missing, reject honestly. If local checks match, report **`LOCAL_CRYPTO_MATCH_UNTRUSTED_HOLD`**, never VERIFIED. It does not independently fetch GitHub at P, authenticate source CI S, witness operator challenge, prove seven original gateway denies, inspect durable audit, confirm consumer acceptance or connect a private runner. No final proof should be published before those tests have actually occurred.

## Copyable truthful operator return

```text
System / repo: rosevear-ai-hub / RosevearCreations/rosevear-ai-hub
Exact immutable Build 178 main SHA and same-commit GREEN CI URL: VERIFY AFTER MAIN PROMOTION
QL-248 source S: CURRENT TESTED MAIN SHA ONLY AFTER INDEPENDENT CONFIRMATION
Distinct genuine public proof file at P: MISSING / BLOCKED
Public JSON raw digest / original seven negative receipt IDs: MISSING / UNVERIFIED
Ed25519 source signing pin authenticated out of band: NOT VERIFIED
QL-248 S/P amendment accepted by AI Data Platform consumer: PENDING
Optional local proof-byte/signature review: FORMAT-ONLY / LOCAL MATCH UNTRUSTED, not original evidence
Private protected nonproduction runner / scoped HMAC: NOT PROVISIONED
Original authenticated GETs / durable gateway audit / rollback witness: UNVERIFIED
Owner nonproduction-test consent / owner pilot consent: NOT GIVEN / NOT GIVEN
Actual connection state: DISCONNECTED / HOLD
```

**Private field invariant:** no camera/device commands, credentials, passwords, vault material, LAN IP/hostname, personal/health/customer records, marketplace/booking changes, calling/SMS or dispatch. All operating business connections remain DISCONNECTED. Production source CI is distinct from independent installed-Windows acceptance and first-party password/document Vault (`0/6 SECURITY HOLD`).
