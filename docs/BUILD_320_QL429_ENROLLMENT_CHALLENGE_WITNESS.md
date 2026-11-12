# Rosevear AI Hub Build 320 — QL-429 Original-Host Enrollment, Challenge & Pilot Witness

## Exact verified source contracts (12 November 2026)

| Source | Immutable GitHub production revision |
| --- | --- |
| AI Hub Build 319 | `0693d70965a5ada3320b8fcb261f554e0dbff88f` |
| Comms Hub QL-429 native contract | `245cdc6f5dc21d9897ca454b2e16fdb51c33ae62` |
| AI Data Platform controller Build 380 | `ccd291f22e15750392fa3995dc3d5811c506cd05` |

Comms Hub may move to newer commits; changes to QL-429 message schemas require a separate reviewed reconciliation. Code releases cannot certify independently owned devices or backend connections.

## Protected operator workflow

1. Independently verify the original Ree Windows host `DESKTOP-AE894KC`, external append-only archive identity, its separately administered Ed25519 anchor signer and readback signer, and public keys of all three independent Masters. Private keys MUST remain on independent devices. The protected operator supplies externally approved, six-distinct public SPKI DER keys (base64 encoded), off-host store/anchor identifiers, owner/reviewer identities and creation timestamp. No generic web client or CI can claim remote storage or independent public-key custody.

2. `enroll_ql429_external_pins320` checks **two distinct independent owner/reviewer signatures** on the native public enrollment digest plus **three separate proof-of-possession signatures** from original Windows host, external anchor and external reader. Four independent protected custody callbacks must attest real owner, reviewer, remote-store and host identity. A private original-host SQLite ledger saves only public enrollment material and SHA-256 digests, with one-use identity. It does NOT provision a remote store, enroll a real hardware key or save private material.

3. Reopen the protected QL-426/427 evidence, the Build 319 original-host durable QL-428 PRECHECK journal and the independently stored native Comms QL-428 signed owner-precheck receipt. `issue_ql429_original_challenge320` checks the source PRECHECK exactly and uses *separately enrolled* off-host anchor and reader public keys to recheck a **new, independently signed remote readback** tied to a unique operator request nonce. The readback must be 60 seconds or newer, remote durable, sequence-monotonic, match original scope and closure digests, and pass a second original-host local custody reopen after remote I/O. An independently supervised callback checks the native durable Comms owner-precheck digest. The protected backend creates `secrets.token_hex(24)`, a cryptographically unpredictable **192-bit one-use challenge** bound to the exact source/controller scope, original incident, external anchor digest, QL-428 precheck digest, old closure, and re-entry ID. The expiry is exactly 60 seconds. A local SQLite ledger stores the challenge in one-use custody. The UI never issues it.

4. The real original Ree host (not Jack's TEMPLAR laptop) signs the native QL-429 challenge response using the **separately enrolled original-host key**, proving exact challenge digest, challenge ID, incident, re-entry, original machine ID, new distinct ceremony ID, a fresh 60-second original response and receiver state OFF. The protected operator MUST independently verify the real receiver process is OFF. A signed OFF statement without verified original-host machine custody or real receiver observation is insufficient.

5. Three distinct independently pinned Master signers (AI Hub, Comms Hub, AI Data Platform) each sign the same challenge digest, exact original-host OFF response digest, original incident and intended new ceremony, with explicit `WITNESSED_NEW_SUPERVISED_PILOT_PRECHECK_ONLY`. A separate owner and reviewer both sign the exact ordered report digest and action `ACCEPT_SIGNED_PRECHECK_ONLY_REQUIRE_NEW_QL424_CEREMONY_KEEP_OFF`. All signatures must be valid/fresh, all independent custody callbacks must pass, and the source journal must accept the one-use immutable hashed witness record. Duplicate or forged witness, changed action, missing signature, expired challenge, receiver ON or a wrong machine returns HOLD.

6. Export **independently witnessed external copies of enrollment/challenge/witness record digests**, since privileged deletion of a local journal can otherwise defeat local hash checks. This protected library does not implement a new off-host store, a Windows transport, real signer enrollment, a scheduler, a receiver start/restart, automatic ceremony execution or independent live process monitoring.

## Operational truth

Even a successful `QL429_DURABLE_THREE_MASTER_PILOT_REENTRY_WITNESS_ONLY` is a **signed precheck only**. It returns receiver OFF, connection HOLD, operational owner acceptance HOLD and Master sync HOLD. A **fresh, separate, original-host supervised QL-424 one-TEST ceremony** and genuine independent runtime evidence are mandatory for any activation. Do not infer CONNECTED or physical host installation from GitHub code or CI.

Authenticated owner/administrator read-only endpoint `GET /api/v1/system/master-shell-320-acceptance` is `Cache-Control: private, no-store` and always projects source evidence gaps, not browser proof intake. The Integration Health panel requires manual refresh and refuses incompatible schemas or connected-state declarations. Synthetic tests cover forged key proofs, missing external custody, stale or replayed challenges, wrong device, ON receiver, missing three-Master reports and forbidden owner activation action.

`MASTER360-AIHUB-320-ACK | source=rosevear-ai-hub | source319=0693d70965a5ada3320b8fcb261f554e0dbff88f | comms429=245cdc6f5dc21d9897ca454b2e16fdb51c33ae62 | controller380=ccd291f22e15750392fa3995dc3d5811c506cd05 | independent-enrollment=HOLD | external-readback=HOLD | fresh-host-192-bit-challenge=HOLD | signed-original-OFF=HOLD | three-master-witness=HOLD | dual-owner=HOLD | protected-witness=HOLD | receiver=OFF_UNTIL_REAL_EVIDENCE | connection=HOLD | uptime=UNKNOWN | slave-gate=HOLD_NEXT_MASTER_INTEGRATION_STAGE`

**Next proposed Build 321 — QL-430 Original-Host Supervised Pilot Re-entry Ceremony, Independent Receiver State Attestation & Three-Master Runtime Acceptance.**
