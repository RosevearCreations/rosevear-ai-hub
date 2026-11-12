# Rosevear AI Hub Build 314 — Protected Original-Host Field Receipts, QL-423 Replay & Independent Owner Recheck

## Scoped source baselines, 12 November 2026

- AI Hub Build 313 production main: \`b790adf2e19343d1132fad0eef8107c21e3e560d\`
- Comms Hub QL-423 production main: \`2adc527a88adb790f0edc5192df62f03be8c397c\`
- AI Data Platform Build 379 main: \`ce4216c667b514f40e2fb6e506e5b62c222b1736\`

These are **GitHub code revisions, not field admission**. AI Data Platform Build 379 has had production migration repairs; independently confirm applied migrations, runtime role/policy and healthy signed deployment before trusting its protected owner-review records.

### Field reconciliation and custody

Build 314's protected Python verifier is local/private and bound to **Ree's original Windows host DESKTOP-AE894KC**, not TEMPLAR or CI. It requires an original-host Ed25519 signed source receipt (five-minute freshness; externally pinned public key), exact Build 313 protected \`CONTROLLER\` journal readback, matching source/pilot/controller/Comms revisions and episode/correlation, plus independently verified original installed-process identity, true reopened source custody and QL-423 separately verified QL-414 receiver ACK custody. Signatures, key pins and signed QL-411 envelopes are never fabricated by this build.

### QL-423 durable restoration

QL-423's native protected Node store must already have independently admitted signed original-host QL-411 telemetry and a separately signed QL-414 receiver ACK; Build 314 does **not** claim to operate or alter that store. It requires three separately signed Ed25519 Master restoration checkpoints (AI Hub, Comms Hub and AI Data Platform), exact QL-422 terminal ledger SHA, QL-423 custody/receiver digests, unique checkpoint IDs, source/Comms/controller revisions, and independently witnessed post-restart durable reader readback. Missing, stale, forged or divergent receipts fail closed.

Build 314's private SQLite journal stores only ordered, unique SHA-256 episode/correlation and stage digests, with atomic one-time claims in the order \`FIELD\`, \`RESTORE\`, \`REVIEW\`. It never stores private keys, original envelopes, customer content, device tokens, IP addresses or passwords. It cannot itself restart any machine or provision a live QL-423 custody directory.

### Separate independent owner decision recheck

Independent owner and different reviewer each sign the same protected decision metadata, with separately enrolled Ed25519 public keys. \`REQUEST_ACTIVATION_REVIEW\`, \`REOPEN\`, and \`MAINTAIN_HOLD\` are *review-only*. An authentic request yields at most \`READY_FOR_SEPARATE_SUPERVISED_ACTIVATION_NOT_EXECUTED\`. Never set receiver ON, mark masters synchronized, mark CONNECTED or accept the incident owner decision based on a code merge, a browser flag, or a test fixture.

An owner-only no-store \`GET /api/v1/system/master-shell-314-acceptance\` route and the System → Integration Health panel show **HOLD** until independently verified protected original-host runtime records exist. No new browser intake, sender, scheduled Windows task, system activation or external operational claim is added.

### Direct Master360 coordinated handoff

\`MASTER360-AIHUB-314-ACK | source=rosevear-ai-hub | source313=b790adf2e19343d1132fad0eef8107c21e3e560d | comms423=2adc527a88adb790f0edc5192df62f03be8c397c | controller379=ce4216c667b514f40e2fb6e506e5b62c222b1736 | signed-ree-original-field=HOLD | ql423-protected-custody=HOLD | ql422-ledger-restoration=HOLD | three-master-signatures=HOLD | owner-review=HOLD | receiver=OFF | connection=HOLD | masters-synced=HOLD | slave-gate=HOLD_NEXT_MASTER_INTEGRATION_STAGE\`

Next proposed Build 315 — Original-Host Protected Source/Receiver Witness Enrollment, QL-424 Supervised Activation Ceremony Readiness & Three-Master Operational Owner Gate.
