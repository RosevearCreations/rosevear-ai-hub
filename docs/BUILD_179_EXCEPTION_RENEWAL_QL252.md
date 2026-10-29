# Build 179 — Independent Exception Aging Renewal Watch & QL-248/QL-252 Operator Provenance Follow-Up

**Scope:** private browser-only manual records and explicit public GitHub source/proof preflight. **Not** a gateway connection, public home-server deployment, signed acceptance proof, or owner TEST authorization.

## Private renewal watch

- Compare two chronological, same-original-watch Build 178 exception notes citing progressively later Build 177 continuity indexes; detect repeated owner/source evidence gaps, unresolved identity drift, stale/missing pseudonymous source check and manual 3+ / 8+ day exception age.
- A subsequent private claim is always labelled **UNVERIFIED**. No Build 178 timestamp is assumed to be a new independent owner witness, genuine gateway denial, deployed desktop acceptance or authenticated Ed25519 pin.
- Append a bounded, fixed-category `PRIVATE_EXCEPTION_RENEWAL_WATCH_NOT_SENT` only after a non-imported later exception, personally witnessed installed Windows, and separate private evidence / independent HOLD confirmations. No timer, notification, owner test approval, device activation or background request.
- Full Build 148–179 nested private receipt, strict immutable Build 178 append-only historical comparison; older Build 148–178 imports accepted only as historical. Imported Windows witness and public-audit details are cleared. Exports preserve `DISCONNECTED`, `NOT_AUTHORIZED`, `INDEPENDENT_REVIEW_HOLD`, `FIELD_ACCEPTANCE_HOLD` and Vault `0/6 SECURITY HOLD`.

## QL-252 public source-proof publication blocker

Comms Hub QL-252 observed the exact Hub source `main` SHA `4faac87c3ae2e4857066d9b819663d49f133b939` returning **HTTP 404** for `docs/integration/ql246-source-proof.json` (28 October 2026 Eastern). This is the observed historical snapshot, not a reason to expose home endpoints. A green source release does not publish an authentic proof automatically.

Implemented a safe, **explicit-opt-in** Node public GitHub metadata preflight:

```sh
npm run integration:ql252:hub:check
npm run integration:ql252:hub:check -- --public-get --main <actual-40-hex-main-sha>
# Only when original separately approved proof A/B actually exists:
npm run integration:ql252:hub:check -- --public-get --source <original-source-sha-A> --proof <descendant-proof-sha-B>
```

Default command does **not connect anywhere** and returns HOLD. An opt-in `--public-get` makes **public GitHub API/raw only** GETs, never private LAN, cloud gateway, Home Assistant, Vault, MQTT, cameras, devices or business services. It refuses mutable branch names, missing bytes, non-descendant A/B, non-green exact SHA-A CI, self-signed metadata at B, malformed canonical 24-field Ed25519 signatures, non-GET scope or expired one-hour challenges. A genuine public 404 is reported as `HTTP_404_NO_PUBLIC_SIGNED_PROOF` with `owner_test_decision=NOT_GIVEN`, `actual_gateway_test=NOT_RUN`, `connection_state=DISCONNECTED`. A local public crypto match is explicitly **untrusted HOLD** without independent signer pin and actual original witnessed denials. Offline tests use disposable synthetic signers and receipts **only in test process memory**.

### Why no `ql246-source-proof.json` was committed

The authentic QL-246 envelope requires a trusted private Ed25519 signer, fresh operator challenge, original **seven independently observed** nonproduction gateway denial tests, separately approved and protected private runner, real authenticated GET/durable audit receipt identifiers, independent out-of-band fingerprint custody, consumer acceptance and owner test scope. **None is presently evidenced or authorized**. Publishing synthetic `negative_tests:true` just to remove a 404 would be misleading. Build 179 must return **PENDING / BLOCKED**, not invent an acceptance proof, rotate secrets, use a household network URL or grant owner consent. Production source CI GREEN never means the six apps are connected.

The correct future sequence is independently tested source commit **A** with matching CI, genuine witnessed nonproduction testing and signer key under separate approval, one-hour private challenge and signed QL-246 metadata over **A**, later descendant proof commit **B** containing exact signed bytes, independent raw HTTPS and ancestor/CI inspection, separate trusted pin/witness, authenticated owner TEST-only approval (30 minutes or shorter, GET only health and capabilities), and **much later** separate owner pilot approval. No approval is inferred from this document.

Verification: `npm run integration:ql252:hub:test`, `npm run integration:ql246:contract:test`, focused and full web Vitest, TypeScript, web production bundle, backend pytest and all five GitHub CI lanes on feature, dev and main. Only declare Build 179 source production GREEN after the exact latest `main` SHA's workflow succeeds.
