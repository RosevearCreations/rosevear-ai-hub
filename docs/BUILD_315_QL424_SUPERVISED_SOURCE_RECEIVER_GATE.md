# Rosevear AI Hub Build 315 — Original-host source/receiver witness authority and QL-424 supervised readiness

## Exact source baselines — 12 November 2026

- Rosevear AI Hub Build 314 production: \`124c78f0c15b054881c9b7f45c6d9b2f6d8eb88c\`
- Rosevear Comms Hub QL-424-compatible production: \`d40b3445c766ba9dab5d069fdfe51f20caadb28c\`
- AI Data Platform Build 380 source main: \`ccd291f22e15750392fa3995dc3d5811c506cd05\`

These are GitHub **source** revisions, not proof that original Windows signer enrollment, protected data-plane migrations, live receiver enablement or Master runtime synchronization succeeded. Reconcile and verify current revisions at actual operational use.

## Protected authority enrollment (Ree original DESKTOP-AE894KC only)

The private Build 315 verifier extends Build 314, never replacing it. It requires exact Build 314 original-host SQLite REVIEW journal readback plus the previous signed owner and QL-423 restoration states. Two different owner/reviewer Ed25519 signatures bind the exact episode/correlation, original source revision, Comms QL-424, AI Data Build 380, existing custody digests, enrollment ID, and independently held *distinct* source/receiver Ed25519 SPKI SHA-256 fingerprints.

External owner, receiver and original-host custody callbacks must be independently authorized. **No private keys are generated, imported, stored or exposed in production by this feature.** A generated test key is not host enrollment. The admitted state \`SOURCE_RECEIVER_PINS_WITNESSED_NOT_ACTIVATED\` is a *private validator result*, not a statement that live network enrollment occurred.

## Signed source and receiver OFF readiness

A fresh separately signed original-host telemetry preflight and independently pinned receiver **OFF** signed state witness must agree on the exact episode, enrollment, source revision, Comms revision, controller revision and hashed source payload. Independently verified host process identity, actual QL-424 preflight and receiver-disabled readback must be supplied outside CI. The private verifier stores a single-use SHA-256 witness receipt and returns \`SIGNED_SOURCE_RECEIVER_OFF_WITNESS_READY_ONLY\`.

**This is intentionally NOT QL-424 receiver activation.** QL-424's isolated \`ISOLATED_ONE_TEST_ON\` and \`VERIFIED_CONNECTED_PILOT\` states require a distinct owner-supervised protected backend ceremony with signed receiver readback, one-use commit, verified rollback and independent Master acceptance. Build 315 never calls the Comms receiver, opens a network endpoint or issues a Windows Scheduled Task.

## Three-Master operational owner gate

Independent source, Comms and AI Data Ed25519 readiness receipts all bind the same preflight witness and source/Comms/controller revisions. A distinct owner and independent reviewer separately sign \`AUTHORIZE_SUPERVISED_REVIEW_ONLY\`; the source must independently verify the Master registry, operator protected session and controller non-activation. The terminal one-time metadata journal result is \`THREE_MASTER_SUPERVISED_PILOT_READY_NOT_EXECUTED\` with connection \`HOLD\`, receiver \`OFF\`, master sync \`HOLD\`, and owner acceptance \`HOLD\`.

The original-host private SQLite journal stores only SHA-256 stage digests, linked sequentially as \`ENROLL\` → \`RECEIVER_WITNESS\` → \`OWNER_GATE\` and rejects replay, missing predecessors and duplicate identities. The source never stores original signed envelopes, private keys, passwords, customer details, or network addresses.

## Owner UI and Master360 handoff

Owner-only no-store GET \`/api/v1/system/master-shell-315-acceptance\` shows a **fail-closed static HOLD** readiness projection until actual protected runtime evidence is verified. The Integration Health status panel is read-only: no POST intake, secrets, receiver activation, owner decision buttons or Windows host recovery controls.

\`MASTER360-AIHUB-315-ACK | source=rosevear-ai-hub | source314=124c78f0c15b054881c9b7f45c6d9b2f6d8eb88c | comms424=d40b3445c766ba9dab5d069fdfe51f20caadb28c | controller380=ccd291f22e15750392fa3995dc3d5811c506cd05 | original-ree-host-signer-enrollment=HOLD | independent-receiver-public-pin=HOLD | ql424-ceremony-execution=NOT_EXECUTED | three-master-operational-acceptance=HOLD | owner-review=HOLD | receiver=OFF | connection=HOLD | masters-synced=HOLD | slave-gate=HOLD_NEXT_MASTER_INTEGRATION_STAGE\`

**Next proposed Build 316:** Original-Host Isolated Pilot Evidence Attestation, QL-425 Signed Health Continuity and Owner-Authorized Fail-Closed Recovery Decision.
