# Build 266 — Original private receiver audit readback, nonce replay closure, owner-governed connection candidate

## Release status is not connection status

Build 265 was promoted GREEN to `main` at `bb594ae84f12830f02bb3f61b59952eac9e819f8`; this verifies **source CI** only. No genuine original private-host GET, credential enrollment, durable nonce ledger, original receiver shutdown, or independent human signatures are available in this checkout. The Build 266 offline panel cannot supply missing authority. The connection remains **`DISCONNECTED / HOLD`** in every state, including a mathematically valid chain.

Build 266 never calls a private Comms service, attempts a replay, starts or stops a receiver, changes the existing Windows Recovery task, stores credentials, queries databases, or sends customer/device commands. Only externally authorized operators may inspect the *original* private service or database. Generated test keys and fixture files are strictly synthetic, never original authority.

## 1. Start with independently accepted Build 263–265 evidence

On the original Ree Windows device and the independent Jack laptop, identify the original owner/signers through separately trusted means. The owner and independent witness must each explicitly approve the scoped read-only audit. Read [Build 265](BUILD_265_PRIVATE_COMMS_GET_SHUTDOWN_OWNER_ACCEPTANCE.md) and the original [QL-339B private handoff](integration/QL339B_WINDOWS_DEVICE_SIGNER_FIELD_HANDSHAKE.md).

The Build 266 panel is in **System → Process Evidence → Build 264 → Build 265 → Build 266**. Supply the original five Build 263/264 evidence files and seven independent SHA-256 pins, then the original three Build 265 receipts. No proof is inherited merely from a prior green UI status: Build 266 rechecks every signature and timestamp at the *historical Build 266 decision time*. This never renews the original ten-minute GET grant or permits another GET.

If a real signed Build 265 GET/shutdown/owner chain does not exist, **STOP / HOLD**. Never paste signing private keys, exact private routes, live credentials, customer payloads or sensitive raw audit records into chat, GitHub, or the browser.

## 2. Original signed private receiver audit readback (first Build 266 JSON)

An original authorized Comms private receiver operator must make an independently witnessed, read-only inspection of its original source enrollment, immutable GET audit, nonce ledger/tombstone, credential revocation and receiver-OFF state. Record only pinned SHA-256 hashes and bounded counters, not private credentials or payloads. The original signer signs the UTF-8 result of `canonicalReceiverAudit266` (including its role marker). Accepted schema: `rosevear-comms-original-receiver-audit-readback-266/v1`.

The record anchors the exact Build 264 signed request and all three original Build 265 signed receipt hashes, the actual receiver's SHA-256 Ed25519 and TLS pins, exact audit and nonce-ledger hashes from Build 265, a separately observed source enrollment hash, original audit snapshot hash, revocation ledger hash and consumed-nonce tombstone hash. `accepted_get_count=1`, `accepted_nonce_count=1`, `receiver_state=OFF`, `credential_state=REVOKED`, `nonce_state=CONSUMED` are strict. The audit must follow the Build 265 owner review, within 30 minutes of the original shutdown. An operator-signed JSON file alone does not prove that the database was independently queried.

## 3. Independent Jack readback of nonce replay closure (second JSON)

On Jack's separate trusted device, independently review the genuine same host-side ledger snapshot, tombstone and revoked-credential state via an authorized read-only channel. Sign `canonicalNonceClosure266` with the *independently pinned Jack witness key*, distinct from the receiver operator. Schema: `rosevear-comms-independent-nonce-closure-266/v1`.

The witness packet binds the complete signed audit receipt hash, exact Build 264 nonce and request, source enrollment, audit snapshot, revocation and tombstone hashes. It must report `accepted_get_count=1`, `accepted_nonce_count=1`, `duplicate_get_count=0`, `replay_guard=CONSUMED_NONCE_DENY_REUSE`, `no_replay_get_sent=true`, `receiver_state=OFF`, and `credential_state=REVOKED`, within 10 minutes of the original audit readback. This is a **readback of the consumed-nonce guard**, not a second live GET or replay attack. Any contradictory count, conflicting tombstone, signer change or different source identity is **HOLD**.

## 4. Separate Ree/Jack owner-governed candidate decision (third JSON)

Only after both original-host audit and independent nonce closure are reviewed, Ree and Jack may separately sign a *review candidate*, never production activation. Schema: `rosevear-comms-owner-connection-candidate-266/v1`. `canonicalOwnerTransition266` is signed independently for `owner` and `independent_witness` with their already pinned keys.

It binds the exact signed original audit hash, independently signed nonce closure hash, original Build 265 acceptance hash, consumed nonce tombstone and source enrollment hash, and matching release SHA. The strict decision is `REVIEW_READ_ONLY_CONNECTION_CANDIDATE_ONLY`, with `connection_state=DISCONNECTED / HOLD`, signed within 30 minutes of Jack's ledger readback and within the prior Build 265 acceptance window. A maximum 24-hour expiry applies to this candidate review. An expired decision, wrong owner key, altered hash, or attempted `CONNECTED` field is refused.

## 5. What a successful signature review actually means

Upload the three genuine Build 266 records in the nested panel and click **Verify original Comms audit, nonce closure and owner decision offline**. On a mathematically sound **synthetic** test chain the verifier returns `SIGNED_AUDIT_NONCE_CLOSURE_AND_OWNER_CANDIDATE_EXTERNAL_HOLD`.

This status is **not** a live source-of-truth, connection grant or external acceptance. Independent original-host identity, actual database enrollment, exact nonce-lock durability and human owner/witness identities still require separately authenticated original channels and audit custody. The verifier deliberately returns `original_receiver_audit_independently_verified=false`, `source_enrollment_independently_verified=false`, `nonce_ledger_independently_verified=false`, `owner_external_authorization_verified=false`, `connection_candidate_authorized=false`, `receiver_activated=false`, `comms_connected=false`, and `remote_requests=0`. The UI always displays `DISCONNECTED / HOLD`.

No stale permission may be used to execute another TEST. No source/receiver activation, production connection change, customer communications, device control, or secret publishing is authorized by this build. A future independently governed external process must decide whether any connection-state transition is warranted.

## 6. Source verification and Windows handoff

Run `node scripts/build-266-contract.test.mjs` and `npm --workspace apps/web run test -- commsAudit266.test.ts CommsAudit266Panel.test.tsx commsReceipt265.test.ts CommsReceipt265Panel.test.tsx RuntimeAuthority264Panel.test.tsx --maxWorkers=1`; the synthetic fixtures prove success, forgery, mismatches, replay counters, owner expiration and permanent HOLD. The protected CI suite runs backend, web, Windows desktop, backup and docs-foundation gates, then independent `main` push verification.

On Ree's Windows mini-server, `git fetch origin main`, `git switch main`, `git pull --ff-only origin main` after preserving any local untracked `package-lock.json`. GitHub source promotion does not itself restart or replace running Node/Python processes, and this build does not request a Windows restart.
