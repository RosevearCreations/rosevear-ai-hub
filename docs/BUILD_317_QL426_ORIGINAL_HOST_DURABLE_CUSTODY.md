# Rosevear AI Hub Build 317 — Durable Original-Host QL-426 Checkpoint & Incident Audit

## Source revisions verified at authoring (12 November 2026)

- AI Hub Build 316 production: \`4804a7a200ac7c63f8e08b08e1f37c6085960054\`
- Comms QL-426 protected custody contract production: \`fb9ef12aebd5594bd56af5e800011b82812f7ffa\`
- Latest observed Comms \`main\` (includes subsequent QL-427): \`94bd91afafa19ae54e701b48cb52df608ac326a5\`
- AI Data Platform Build 380 production source: \`ccd291f22e15750392fa3995dc3d5811c506cd05\`

GitHub CI verifies code and tests, **not** an installed original Windows signer, receiver activation, actual Comms Node-ledger custody, signed receiver OFF readback, measured pilot uptime or accepted operational closure. Recheck exact live revisions before any protected acceptance.

### 1. Original-host and QL-426 checkpoint continuity

The private Build 317 original-host verifier requires the Build 316 exact durable signed-health snapshot in SQLite. A fresh independently pinned original Ree-host Ed25519 receipt binds original \`DESKTOP-AE894KC\`, Build 316 production code, QL-426 production contract, AI Data controller, QL-426 immutable checkpoint index/digest/evidence hash and the previous signed health digest.

Acceptance additionally depends on **independent protected** callbacks for actual original host process identity, reopened QL-426 immutable checkpoint/readback and an externally witnessed durable HEAD digest. Hash-chaining alone cannot prevent privileged truncation of all local evidence. Only a metadata SHA-256 checkpoint claim is persisted in the new original-host SQLite stage journal; it stores no raw signatures, private keys or bearer credentials.

### 2. QL-426 signed OFF rollback continuity

The Node Comms QL-426 rollback must already have admitted \`DURABLE_VERIFIED_ROLLBACK_INCIDENT\` on the exact protected ceremony. Build 317 separately verifies the authentic QL-426 native \`rosevear.ql426.receiver-rollback-readback.v1\` Ed25519 envelope (60-second freshness, exact incident/ceremony/episode/source/controller), and requires independent actual receiver-disabled readback and reopened durable Comms ROLLBACK custody. Unsigned, stale, ON, mismatched or absent receiver readback remains **UNKNOWN_MANUAL_RECOVERY_REQUIRED**. No disable command or receiver control is executed by Build 317.

### 3. Three independent Master recovery attestations and owner incident closure audit

Three independent, fresh Ed25519 signatures (source, Comms, AI Data) must each bind exact incident, QL-426 source, controller, source rollback and durable owner ACK digests and explicitly keep operational recovery on HOLD. The same QL-426 \`rosevear.ql426.owner-incident-ack.v1\` envelope must be signed by a distinct owner and independent reviewer, both pinned separately, and the acknowledged rollback digest must exactly match reopened QL-426 custody. Independent protected callbacks must verify the actual persisted Comms owner ACK and the three-Master registry before a **single-use OWNER_AUDIT** metadata claim is accepted.

Private sequential SQLite stage chain \`CHECKPOINT → ROLLBACK → OWNER_AUDIT\` rejects replay and missing predecessors. An audit result \`DURABLE_INDEPENDENT_OWNER_INCIDENT_AUDIT_CLOSED_RECOVERY_HOLD\` means only administrative incident evidence review closure: receiver remains OFF, connection HOLD, owner operational acceptance HOLD, and any new isolated pilot requires **a new, supervised QL-424 ceremony**. No Windows Scheduled Tasks, listener, browser proof intake, or automatic restart are added.

### Owner source status and handoff

Authenticated owner-only \`GET /api/v1/system/master-shell-317-acceptance\` is read-only and no-store. The I.T. panel has one manual refresh and strictly rejects forged browser CONNECTED claims. The default remains fail-closed without genuine protected evidence.

\`MASTER360-AIHUB-317-ACK | source=rosevear-ai-hub | source316=4804a7a200ac7c63f8e08b08e1f37c6085960054 | comms426=fb9ef12aebd5594bd56af5e800011b82812f7ffa | comms-current=94bd91afafa19ae54e701b48cb52df608ac326a5 | controller380=ccd291f22e15750392fa3995dc3d5811c506cd05 | original-host-durable-checkpoint=HOLD | remote-custody-witness=HOLD | ql426-signed-receiver-off=HOLD | durable-rollback=HOLD | three-master-owner-audit=HOLD | receiver=OFF_UNTIL_LIVE_PROOF | connection=HOLD | uptime=UNKNOWN | slave-gate=HOLD_NEXT_MASTER_INTEGRATION_STAGE\`

**Next proposed Build 318 — Independent Original-Host QL-427 Checkpoint Witness Export, Receiver Isolation Revalidation & Three-Master Recovery Closure Evidence.**
