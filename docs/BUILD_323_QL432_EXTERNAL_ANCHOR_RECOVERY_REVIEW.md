# Rosevear AI Hub Build 323 — QL-432 Externally Anchored Incident Review

## Immutable release sources (2026-11-12)

- AI Hub Build 322 Production main: \`b5a7ced1751d99c3a3e4d23e416bb0700588da02\`
- Comms Hub QL-432 native contract: \`f28f14f67d3ecd5fad9972d6f0500c14de0f89b7\`, \`runtimes/master-telemetry/ql432-external-incident-recovery.mjs\`.
- AI Data Platform controller Build 380 reference: \`ccd291f22e15750392fa3995dc3d5811c506cd05\`. Build 381 may require a separate fresh controller correlation before runtime use.

## Protected original-host process

1. On **DESKTOP-AE894KC only**, independently authenticate the prior *accepted* QL-430 pilot and reopen the complete original-host QL-431 chain. Require terminal \`RECONCILED\`, with durable signed OFF, three-Master custody and distinct owner/reviewer consent. PENDING, OFF-only or compromised local custody means HOLD.
2. Issue a new high-entropy, **one-use** nonce from a separately attested protected private operator, not a browser or automated task. An anchor export **proposal** contains exact scope, incident, QL-430 accepted digest, QL-431 checkpoint index/digest, independent receiver-OFF digest, anchor identity, nonce and timestamp. Proposal alone proves nothing.
3. The caller must provide a real, independently controlled **external anchor adapter** that actually pins the immutable checkpoint. Its pinned Ed25519 signer signs the exact export digest and fields. A **different** independently pinned reader signs a fresh readback of that exact off-host anchor and nonce. It must not be a replica of the original-host mutable SQLite chain.
4. A separately pinned **original Windows-host signer** signs OFF for DESKTOP-AE894KC, incident and reader digest. A separately pinned **independent receiver signer** signs OFF, strictly after the host evidence, bound to the host and external readback digests. All signatures are verified on the private backend with externally enrolled *public* pins; no private keys enter the app or repository.
5. Each of the three Masters independently signs fresh recovery disposition \`RECONCILED_OFF_NEW_CEREMONY_REQUIRED\`, covering the exact checkpoint, external readback and independent receiver-OFF digest. Owner and distinct reviewer sign the ordered Master digest and \`ACKNOWLEDGE_RECOVERY_ONLY_NEW_ISOLATED_CEREMONY_REQUIRED_KEEP_OFF\`.
6. Reopen the original-host QL-431 chain **again** after external I/O and compare the complete terminal checkpoint. Any drift fails closed. The original-host \`ProtectedRecoveryReviewJournal323\` then atomically commits a one-use metadata receipt under \`BEGIN IMMEDIATE\`, SQLite FULL synchronization and verified readback. Replay, corruption and mismatched signer pins remain HOLD.
7. Success is a **review for a future, new owner-supervised QL-429/430 ceremony only**. It cannot resume the old QL-431 episode, enable the receiver, mark a general CONNECTED application, change the slave gate or establish measured uptime. Only separate live operator authorization and fresh proofs in the new ceremony may permit an isolated pilot.

## Boundary and release evidence

\`review_ql432_recovery323\` is a protected injectable Python library, **not a REST mutating endpoint**. It exposes no browser signature submission, external service credentials or receiver lifecycle calls. The authenticated read-only \`GET /api/v1/system/master-shell-323-acceptance\` publishes source-only HOLD flags with \`private, no-store\`, never synthetic runtime acceptance.

Synthetic CI tests exercise generated Ed25519 signers, mock adapters, forged and missing anchor/reader/host/receiver, replayed review, invalid Master or owner, and local journal tampering. Passing CI **does not verify** real external immutable custody, external signer enrollment, original-host operator physical presence, independent receiver OFF, or physical deployment. The protected local SQLite one-use receipt can be deleted by a privileged local actor; the external immutable anchor is an operational prerequisite. Do not import sample key material into live systems.

\`MASTER360-AIHUB-323-ACK | source=rosevear-ai-hub | source322=b5a7ced1751d99c3a3e4d23e416bb0700588da02 | comms432=f28f14f67d3ecd5fad9972d6f0500c14de0f89b7 | original-host=HOLD | reconciled-ql431=HOLD | external-anchor=HOLD | independent-reader=HOLD | original-host-off=HOLD | independent-receiver-off=HOLD | three-master-recovery=HOLD | dual-owner-new-ceremony-review=HOLD | one-use-durable-review=HOLD | receiver=OFF | connection=HOLD | slaveGate=HOLD_NEXT_MASTER_INTEGRATION_STAGE\`

**Next proposed Build 324 — QL-433 Independently Anchored Recovery Decision Export, New-Ceremony Authorization Boundary & Original-Host Pilot Re-entry Evidence Continuity.**
