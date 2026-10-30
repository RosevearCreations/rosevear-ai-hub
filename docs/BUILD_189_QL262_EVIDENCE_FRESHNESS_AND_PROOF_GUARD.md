# Rosevear AI Hub Build 189 — QL-262 original evidence freshness and public proof-B guard (HELD)

29 October 2026 (America/Toronto) · **Production source CI GREEN is distinct from six-app connectivity: DISCONNECTED / HOLD.**

## Implemented

1. Added offline-only `scripts/ql262-hub-evidence-freshness.mjs` to reconcile **actual original** sanitized QL-258 owner packet bytes against an independently supplied SHA-256 digest. Every owner progress label remains a self-report; its fixed historical GitHub snapshot is **never** treated as a current identity or authorization receipt. With no packet, the result is `NOT_PROVIDED` — no synthetic owner evidence.
2. Reused the QL-256 canonical Ed25519 public witness-envelope verifier. The optional genuine public envelope must be valid, current (maximum five-minute signed window), tied to an independently specified immutable source A, and optionally match a separately provided **public** witness SPKI digest. A mathematical signature match still has **no** authenticated custodian, nonce witness, real-world reviewer, private registry, or owner permission.
3. Added a source-proof B guard that rejects HTTP 404/bytes contradictions, wrong or unpinned raw byte digests, forged source A/B relationships, non-HOLD proof data, bad Ed25519 signatures and mismatched public SPKI pins. Even a complete synthetic signed QL-246 envelope matching operator-supplied metadata yields **OFFLINE_SIGNATURE_MATH_MATCH_METADATA_ONLY**, never acceptance or connection.
4. Added five offline CI regression scenarios including temporary test-only keys, never published as genuine original proof. The existing `QL-265` Comms Hub I.T. connection panel was independently added in a concurrent source change and is **preserved**; this Build 189 QL-262 source-evidence work does not replace or activate it.

## Source baseline independently checked before Build 189 QL-262

| Item | Status |
|---|---|
| Immutable `main` source SHA before this change | `a2e8e1839cd54b7941121143b97b4d148a15c243` |
| Matching completed GREEN main push CI | [40996280401](https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40996280401) |
| Original `docs/integration/ql246-source-proof.json` at that exact SHA | **HTTP 404** (fresh GitHub check) |
| Original actual QL-258 sanitized owner packet | **NOT_PROVIDED** in this build conversation |
| Original public independently witnessed signed nonce envelope | **NOT_PROVIDED** |
| Actual human custodian, separate nonce witness, separate reviewer and persistent key store | **NOT_INDEPENDENTLY_VERIFIED** |
| Independently pinned public source signer SPKI / genuine B | **NOT_AVAILABLE** |
| Actual gateway GETs / seven witnessed denials | **NOT_RUN / NOT_VERIFIED** |
| Owner authenticated nonproduction TEST-only decision | **NOT_GIVEN** |
| Windows mini-server relay | **NOT_INSTALLED / OFF** |

This is a historical candidate **source A**, not proof B. After Build 189 promotion, independently check the new `main` SHA, exact successful source CI and original immutable proof path again. Do not assume successful CI or a local UI PASS upgrades custody.

## Commands (no credentials or network by default)

```bash
npm run integration:ql262:hub:check
npm run integration:ql262:hub:test

# Only when actual, safe owner originals are privately obtained
npm run integration:ql262:hub:check -- --owner-packet /path/to/original-sanitized-ql258.json --owner-sha256 <separately-provided-sha256>

# Optional original PUBLIC witness metadata. No private signer key, no home server.
npm run integration:ql262:hub:check -- --witness-envelope /path/to/original-public-witness.json --audited-source-A <audited-40-sha> --witness-public-pin <separately-provided-public-spki-sha256>
```

Never submit personal identities, home IPs, private signature keys, HMAC credentials, home device or Vault details, customer records, secret-manager paths or personal authentication channels to public CI, chat, GitHub or a frontend. The public signature verifier does **not** create a key, approve a trial or independently confirm real humans.

## Exact next real operator dependency

Before original proof B can be accepted, an authenticated owner privately assigns and approves a restricted persistent source signer host, real custodian, **distinct** nonce witness and **independent** reviewer. They determine real signer existence; obtain **separate owner authority** if provisioning is necessary. The reviewer authenticates original public signer/witness SPKI pins through independent trusted channels, validates A→B ancestry and original raw signed proof bytes, then assesses original GET/negative receipts and rollback. A future bounded GET-only pilot requires its own TEST-only authorization. None was supplied here.

**Integration: DISCONNECTED / HOLD. Production software may be GREEN.**

**Next proposed Build 190 — QL-263 Original Independent Reviewer Receipt Intake, Fresh Signed-Proof B Recheck & Safe Connection-Panel Decision Alignment (HELD).**
