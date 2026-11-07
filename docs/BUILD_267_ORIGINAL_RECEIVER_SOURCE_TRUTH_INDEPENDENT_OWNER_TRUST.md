# Build 267 — Original Private Receiver Source-of-Truth and Independent Owner Trust

## What this build does

The AI Hub client now offers a read-only, local-memory intake for three more records attached
to the original signed Build 263–266 receipt chain. It independently recomputes each signed
receipt hash, validates the pinned Ed25519 signers and original Windows/receiver/TLS identities,
compares the claimed original source enrollment, registry row, audit, revocation and consumed
nonce ledger across two separately signed observations, and checks separate Ree/Jack planning
acceptance. All three records are strictly parsed and bounded in size.

This is **offline verification of supplied signatures and consistency**, not an authenticated
database query. A signed JSON claim alone cannot prove that a private receiver, database,
network endpoint, signer or owner has been independently authenticated.

## Original Windows operator sequence

1. Update the original Windows machine to the published release through the existing safe
   client Update Hub workflow. Confirm `main` and the installed process identity match using
   the established supervised Windows launch checks. Do not disable the recovery service or
   restart arbitrary processes to force a match.
2. Obtain genuine signed 263–266 receipts from the **original host** and Jack's genuinely
   separate machine. Import them into the Build 263–266 controls in order. Generated fixtures,
   screenshots and copied filenames do not count as original evidence.
3. From an **authenticated, read-only** channel into the original private Comms receiver,
   a permitted operator records the actual source registry row, enrolled source, immutable
   audit, revocation and consumed-nonce ledger SHA-256 digests, original host binding and
   receiver/TLS key pins. The resulting original-source document uses schema
   `rosevear-comms-original-source-of-truth-267/v1`, is signed with the genuine pinned
   receiver-operator Ed25519 key and confirms OFF/REVOKED/CONSUMED and exactly one prior GET.
   Do not export credentials, tokens, private keys, database secrets or customer records.
4. On Jack's independent device and authenticated read-only channel, read back the **same**
   immutable source/nonce/revocation rows. Produce separately signed schema
   `rosevear-comms-independent-trust-readback-267/v1` with the independent observation receipt
   hash, identical source enrollment, registry row, audit, revocation and tombstone digests.
   **Do not resend the consumed nonce or make another live GET.**
5. Ree and Jack separately inspect both records, their signing fingerprints and timestamps.
   Sign the bounded owner planning receipt
   `rosevear-comms-owner-readonly-trial-candidate-267/v1`. Scope is restricted to one future
   nonproduction `GET /api/integration/v1/health`, with `test_authorized:false`, receiver
   `OFF`, connection `DISCONNECTED / HOLD`, and expiry no more than 30 minutes after signing.
6. Import all three Build 267 JSON documents and select **Verify private source, independent
   trust and owner trial scope offline**. Review any mismatch as STOP / HOLD. A mathematically
   accepted candidate can still only authorize **further planning**, never the trial itself.

## Fields and cryptographic evidence

All hashes are lowercase 64-character SHA-256 hex; release SHA is 40 lowercase hex; timestamps
are UTC whole-second `YYYY-MM-DDTHH:mm:ssZ`. Input rejects unknown fields. The canonical
signature message is each ordered field joined by newlines with a role label and trailing
newline. `canonicalSignedOwnerTransition266` binds the complete dual-signature Build 266
owner receipt so the Build 267 source record cannot silently substitute another owner verdict.

### Required safety boundary

- Original database/receiver identity externally verified: **NO — requires actual private-host readback**.
- Separate owner trust externally verified: **NO — requires independent authenticated validation**.
- New TEST independently authorized: **NO — explicit separate authorization still required**.
- Receiver activated: **NO**. Remote requests: **0**. Source writes: **0**.
- Connection: **DISCONNECTED / HOLD**, irrespective of signed candidate result.
- No customer communications, device actions, nonce replay, automatic REST calls or credentials
  accepted in upload files.

## STOP / HOLD and release acceptance

Retain HOLD if signer, source, nonce, registry row, hostname binding, TLS pin, immutable audit,
clock order, expiry or decision scope is missing or mismatched. Never convert a mathematical
offline candidate into actual source-of-truth attestation or `CONNECTED` without independent
external readback and separate live TEST authority. Run `node scripts/build-267-contract.test.mjs`,
`npm run web:typecheck`, selected signed evidence and panel tests, then the complete protected
source and production GitHub workflows. GREEN means release checks passed, **not** a live Comms
connection was established.
