# Rosevear AI Hub Build 324 — QL-433 Independently Anchored Recovery Decision and New-Ceremony Boundary

## Verified release baselines — November 12, 2026

- AI Hub Build 323 production main: `99a6eba7d60373328d5e29f869082172c895e93a`.
- Comms Hub QL-433 production contract: `6926d83b8984ee5b46e568f39cb41ac8db7274bc`, `runtimes/master-telemetry/ql433-recovery-decision-handoff.mjs`.
- AI Data Platform pinned controller Build 380 reference: `ccd291f22e15750392fa3995dc3d5811c506cd05`. Later controller revisions require fresh independent correlation.

## Protected original-host workflow

1. On **DESKTOP-AE894KC**, independently reopen the original private QL-430 accepted pilot, full hash-linked QL-431 terminal RECONCILED incident, and exact QL-432 one-use signed recovery-review receipt. The private operator must independently attest to the real QL-432 signed decision, not a dashboard flag. All mismatches remain HOLD.
2. Issue a high-entropy **one-use** challenge nonce and export ID. Choose a next ceremony and episode that differ from both previous IDs. Prepare a sanitized decision-export proposal referencing the terminal index/digest, QL-432 owner receipt digest, independently anchored QL-432 digests, original and next source/controller revisions, proposed new IDs, original machine and the explicit action `PRECHECK_NEW_OWNER_SUPERVISED_QL429_QL430_ONLY_KEEP_RECEIVER_OFF`. Preparation alone proves no off-host custody.
3. Only a real independently protected **immutable off-host anchor** may pin the QL-433 decision export and sign its exact digest. A distinct independent reader with separately enrolled public key must sign a fresh readback bound to the anchor digest, export ID, next ceremony/episode and nonce. Mock adapters and local databases do not count as operational external evidence.
4. The separately signed original-host OFF receipt must be from DESKTOP-AE894KC, bound to the prior incident, new IDs, signed anchor and independent reader. A second independently pinned receiver signer must return **fresh OFF** proof, no earlier than the host evidence, with matching exact scope. ON, stale, forged and TEMPLAR-host reports fail closed.
5. Each of AI Hub, Comms Hub and AI Data Platform must sign `NEW_CEREMONY_PRECHECK_ONLY_RECEIVER_OFF` against the same next IDs, QL-432 receipt and signed independent OFF/reader digests. Distinct owner/reviewer independently sign the ordered Master digest and `AUTHORIZE_NEW_CEREMONY_PRECHECK_ONLY_RECEIVER_OFF_NO_ACTIVATION`.
6. Reopen QL-431 and QL-432 private records after all external I/O. Any drift fails. The original-host `ProtectedNewCeremonyJournal324` then stores one-use incident authorization metadata under exclusive SQLite `BEGIN IMMEDIATE`, `synchronous=FULL` and verified readback. Repeated incident and tampering fail close.
7. Only terminal result `DURABLE_QL433_NEW_CEREMONY_PRECHECK_ONLY` permits a **separate new** QL-429/430 owner-supervised ceremony. Original receiver stays OFF, connection remains HOLD and slave gate remains HOLD. The Build 324 library never starts, stops or restarts any receiver or claims general CONNECTED.

## Source-only UI and operational limitations

Authenticated `GET /api/v1/system/master-shell-324-acceptance` serves a private, no-store, read-only **HOLD source projection**. No signer enrollment, owner decision submission, keys, private receiver control, scheduler, live external anchor service or Windows process is implemented in the web layer.

CI generates independent Ed25519 signers and uses mock I/O for positive and negative signed consent, independent reader, machine identity, OFF-state, three-Master identity, one-use replay and local tampering cases. Passing GitHub CI is **not** proof of a real original-host operator session, independent immutable external anchor, receiver state or measured uptime. Privileged deletion of local SQLite state can defeat local-only custody and requires real independently anchored supervision.

`MASTER360-AIHUB-324-ACK | source=rosevear-ai-hub | source323=99a6eba7d60373328d5e29f869082172c895e93a | comms433=6926d83b8984ee5b46e568f39cb41ac8db7274bc | ql431-terminal=HOLD | ql432-reviewed=HOLD | independent-anchor=HOLD | independent-reader=HOLD | original-host-off=HOLD | independent-receiver-off=HOLD | three-master=HOLD | dual-owner=HOLD | new-ceremony-precheck=HOLD | receiver=OFF | connection=HOLD | slaveGate=HOLD_NEXT_MASTER_INTEGRATION_STAGE`

**Next proposed Build 325 — QL-434 Protected New-Ceremony Evidence Consumption, Independently Signed Authority Handoff & Original-Host Supervised Re-entry Readiness.**
