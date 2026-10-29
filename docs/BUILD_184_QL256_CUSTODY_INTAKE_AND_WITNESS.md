# Build 184 — QL-256 private signer custody candidate intake and independent witness preparation

## What was actually implemented

- Added `Ql256CustodyIntakePanel` to the existing owner workbench. This local-only browser form records an operator's claimed signer decision, optional candidate public SPKI/registry hashes and distinct opaque receipt references. Two explicit acknowledgements are needed. All exported packets remain `PRIVATE_OPERATOR_METADATA_CANDIDATE_ONLY`, `NOT_VERIFIED`, `DISCONNECTED`, and `NOT_GIVEN`. There is no server call or persistent database write. Do not enter private material, people/contact details or network paths.
- Added `scripts/ql256-hub-witness-envelope.mjs` to verify the **mathematics** of a genuinely supplied public-only Ed25519 witness signature offline. It binds repository, claimed source A, claimed source CI URL, optional proof B, business, tenant, claimed signer/registry SPKI digests, distinct custody/witness receipt IDs and a <=5-minute challenge. Wrong schema, altered data, expired challenge, non-Ed25519 key and signature mismatch fail closed.
- A valid witness signature by a supplied public key is only `LOCAL_ED25519_MATCH_ONLY`: the program cannot establish that key belongs to a real independent person or that it was independently pinned. A trusted registry, separate human custody authentication, actual source CI check, and real gateway/owner evidence are separate later gates.
- Added synthetic offline verifier and React receipt/panel regression tests to CI. Synthetic test keys stay in memory; **no synthetic proof is published as original evidence**.

## Genuine source facts, not private proof

- Previous tested source commit A candidate: `b992fdf6a30c62ad627f561c3808f39d4bf6f816`.
- Its completed GREEN main push GitHub Actions run: `https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40914482643`, recorded with `head_sha=A`.
- No original independently witnessed QL-246 signed proof B has been supplied. The historical immutable `main` proof check was HTTP 404; recheck at each newer actual main SHA before claiming its HTTP status.
- Signer decision: `SIGNER_STATUS_UNKNOWN`. Independent custodian, witness and reviewer: `NOT_VERIFIED`; owner TEST-only approval: `NOT_GIVEN`; original gateway GET and seven denials: `NOT_RUN` / `NOT_VERIFIED`; relay installed or started: `NO`; integration: `DISCONNECTED / HOLD`.

## Offline verifier (public metadata only)

```sh
npm run integration:ql256:witness:check
npm run integration:ql256:witness:test
npm run integration:ql256:witness:check -- --envelope /path/to/public-witness-envelope.json --pin <independently-received-public-witness-SPKI-sha256>
```

Use only an authentic *public* signed envelope from the independent witness. The verifier demands a canonical UTF-8 JSON payload with schema `rosevear.ql256.witness.v1`; it never asks for a private key or contacts private infrastructure. Run the third form privately only after the genuine witness supplies it; the CLI's `--pin` compares bytes but cannot prove the pin's human origin. No witness envelope was provided for Build 184; do not create one merely to pass tests. Do not print private challenge contents or key material into logs.

See [operator-safe evidence return](integration/QL256_HUB_CUSTODY_WITNESS_EVIDENCE_RETURN.md) for next real actions and the safe return packet. The Windows AI Hub startup tasks, MQTT, Home Assistant, cameras and vault were untouched.

Next expected **Build 185 — QL-256 Private Custody Receipt Witness Review & Source-Proof Challenge Renewal (HELD)**.
