# Rosevear AI Hub Build 316 — Original-host isolated pilot attestation, signed QL-425 health & owner-held recovery

## Immutable source baselines — 12 November 2026

| Source | Verified GitHub code revision |
| --- | --- |
| AI Hub Build 315 production | \`0ae23d6ce3b09cc14da9187635cb2875269f3739\` |
| Comms QL-425 production (contract) | \`d40b3445c766ba9dab5d069fdfe51f20caadb28c\` |
| Comms latest main at reconciliation | \`fb9ef12aebd5594bd56af5e800011b82812f7ffa\` |
| AI Data Platform Build 380 main | \`ccd291f22e15750392fa3995dc3d5811c506cd05\` |

These are repository source revisions, **not** actual installed Windows or Comms receiver attestations. Reconcile live code, keys, authenticated signed receipts and protected database migrations independently before any operational decision.

### 1. Independently authenticated original-host isolated pilot

Build 316 privately validates original \`DESKTOP-AE894KC\` Build 315 protected \`OWNER_GATE\` journal, source Ed25519-signed pilot metadata (five-minute maximum age), a genuine protected QL-424 fully dual-signed \`VERIFIED_THREE_MASTER_ISOLATED_PILOT_ACCEPTANCE\` record and separately witnessed original installed process and isolated receiver state. It does **not** trust a caller's \`accepted=true\` flag without three independent external protected verification callbacks. The original signed envelope binds exact source/Comms/controller revisions, episode/correlation, ceremony, previous owner review digest and accepted protected QL-424 custody digest.

### 2. QL-425 Ed25519 three-Master heartbeat and durable anti-replay

For a single QL-425 health snapshot, verify three unique pinned Ed25519 signatures using the native QL-425 heartbeat payload structure (JSON.stringify order), exactly matching original source revision, controller revision, ceremony and episode. Every receipt must be at most **60 seconds** old, status \`ISOLATED_PILOT_HEALTHY\`, and have an increasing safe integer sequence. Independent Comms QL-425 protected readback and receiver-state attestation are required.

An original-host SQLite journal atomically persists **only ceremony/episode opaque identifiers, hashes and per-Master integer sequence high-water marks**, rejects replay or regressed sequences across restarts and rejects a ceremony reused for another episode. A valid result is \`THREE_MASTER_SIGNED_QL425_HEALTH_SNAPSHOT_NOT_UPTIME\` — **not** continuous uptime, unrestricted \`CONNECTED\`, all-six-app synchronization or automatic owner acceptance.

### 3. Signed OFF rollback and distinct owner-reviewed manual recovery

When protected QL-425 monitoring detects stale, missing, replayed or mismatched health, **Comms** is responsible for invoking its protected \`disableOneTest\` adapter. Build 316 does not disable a real device by itself, and unverified disable must be reported as \`UNKNOWN_MANUAL_RECOVERY_REQUIRED\`, never a fabricated OFF confirmation.

For an independently completed shutdown, the original host's private verifier requires an authentic Ed25519 receiver OFF readback bound to the exact last accepted health snapshot. An owner and different reviewer must independently sign the same \`MAINTAIN_HOLD_MANUAL_RECOVERY\` audit record, and protected Comms disable, signed receiver OFF readback, owner incident authorization must all be independently verified. A one-use metadata-only recovery entry records the decision. The terminal result is **receiver OFF / connection HOLD / owner acceptance HOLD / manual supervised new ceremony required**. No automatic re-enable, new Scheduled Tasks, web proof intake, signing keys, external communications or Windows recovery commands are added.

### Operator and Master360 handoff

Owner-only \`GET /api/v1/system/master-shell-316-acceptance\` returns a private no-store, fail-closed *source readiness* snapshot. The Integration Health page has a read-only status panel; there is no actual protected evidence import through this endpoint.

\`MASTER360-AIHUB-316-ACK | source=rosevear-ai-hub | source315=0ae23d6ce3b09cc14da9187635cb2875269f3739 | comms425=d40b3445c766ba9dab5d069fdfe51f20caadb28c | comms-current=fb9ef12aebd5594bd56af5e800011b82812f7ffa | controller380=ccd291f22e15750392fa3995dc3d5811c506cd05 | original-ree-host-ql424=HOLD | signed-ql425-three-master-health=HOLD | per-master-durable-replay=HOLD | verified-receiver-off-rollback=HOLD | owner-review=HOLD | receiver=OFF_UNTIL_LIVE_PROOF | connection=HOLD | runtime-uptime=UNKNOWN | master-sync=HOLD | slave-gate=HOLD_NEXT_MASTER_INTEGRATION_STAGE\`

**Next proposed Build 317 — Durable Original-Host Pilot Checkpoint Custody, QL-426 Signed Rollback Readback Reconciliation & Independent Owner Incident Closure Audit.**
