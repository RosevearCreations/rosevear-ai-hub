# Build 188 — QL-261 original owner receipt and independent proof lineage readiness (HELD)

29 October 2026 (America/Toronto) · **Source CI promotion can be GREEN while cross-application integration is DISCONNECTED / HOLD.**

## Concrete Build 188 deliverable

1. `scripts/ql261-hub-build188-reconcile.mjs` records a **SHA-256 of actual supplied original QL-258 owner JSON bytes** after passing Build 187's exact strict schema/identity/enum gate. It counts the explicitly labelled unverified owner progress reports without attributing them to authenticated humans or genuine private signer evidence. If no packet is supplied, it records `NOT_PROVIDED`; no receipt is synthesized.
2. The optional `--public-get` path checks GitHub's exact public immutable A→B comparison and then the exact raw original proof bytes at commit B. A must be a strict ancestor; both must be different 40-character SHAs. A 404 is recorded as a genuine missing public file. A 200 produces only a raw byte digest and **UNVERIFIED** disposition; it does not certify signature, pin, actual reviewer, private custody or consent.
3. Strict offline tests reject injected credentials, extra fields, false approvals, cross-app source data, wrong ancestry, wrong HOLD claims and public HTTP failures. Test fixtures are not publicly published signed proofs.
4. No key-store, Windows task, Tailscale route, DNS, service, Home Assistant, cameras, MQTT, Vault, customer data, or authenticated gateway health/capabilities request is touched. Existing nonproduction server-only GETs remain disabled by default.

## Actual available evidence

| Gate | Disposition |
|---|---|
| QL-258 owner packet | **NOT_PROVIDED** in this build conversation; receipt utility can reconcile a future actual sanitized packet only |
| Original signer existence and approved persistent host | **UNKNOWN / NOT_VERIFIED**; cannot infer from public GitHub |
| Real distinct custodian, nonce witness, reviewer | **NOT_INDEPENDENTLY_AUTHENTICATED**; manual trusted process required |
| Independently authenticated Ed25519 public SPKI | **NOT_VERIFIED_OUT_OF_BAND** |
| Prior immutable `main` source A candidate | `398e99bdd757b1829e3693e1584d927741d4fcf8` |
| Matching original source CI | [run 40983924749](https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40983924749), exact `main` push and success |
| Original `docs/integration/ql246-source-proof.json` at source A | **HTTP 404** on fresh GitHub check; no real B supplied |
| Actual original A→B proof relationship | **NOT_RUN / NOT_AVAILABLE**, because no genuine proof B commit was supplied |
| Original nonproduction gateway GETs / seven denials | **NOT_RUN / NOT_VERIFIED** |
| Owner TEST authorization | **NOT_GIVEN** |
| Windows relay | **NOT_INSTALLED / OFF** |

## Commands

```bash
# Offline default; neither key store nor public network consulted
npm run integration:ql261:hub:188:check
npm run integration:ql261:hub:188:test

# Only after obtaining the ORIGINAL sanitized Comms Hub owner JSON
npm run integration:ql261:hub:188:check -- --owner-packet /path/to/sanitized-ql258-hub.json

# Optional independent PUBLIC GitHub-only comparison AFTER genuine source A and proof B are known
npm run integration:ql261:hub:188:check -- --public-get --source-A <40-sha-A> --proof-B <40-sha-B>
```

Do not insert real names, actual home addresses, key-store paths, credentials, tokens, HMAC values, public fixture signatures as authentic evidence, or private reviewer channels in public GitHub or these inputs.

## Real path to proof B — still blocked

The owner must separately approve a restricted persistent signer store and independently authenticate three accountable roles: source key custodian, **different** nonce witness, **separate** reviewer. An authorized custodian must determine whether a real source Ed25519 private signer exists; obtain fresh owner authority before provisioning if missing. The reviewer independently checks public SPKI pin over a trusted separate channel. Only then can the authorized operator sign genuine QL-246 canonical proof of source A and publish it in a **distinct later B**; independent verification checks actual signature, pin, source A CI, A→B ancestry, original seven denial receipts and original GET receipts. Public file presence by itself never lifts HOLD.

A later reversible ≤30-minute private GET-only test still requires its own independently authenticated owner **nonproduction TEST-only** authorization, allowed source credentials, kill switch and rollback review. The mini-server installation requires another express decision. Neither follows from a GREEN code build.

**Next proposed Build 189 — QL-262 Original Evidence Packet Freshness, Independent Signer-Witness Decision Reconciliation & Public Proof-B Acceptance Guard (HELD).**
