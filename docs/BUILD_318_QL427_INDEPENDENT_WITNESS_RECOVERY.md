# Rosevear AI Hub Build 318 — Independent Original-Host QL-427 Witness, Isolation & Recovery Closure

## Verified immutable code baselines (12 November 2026)

| Dependency | Exact verified GitHub production commit |
| --- | --- |
| AI Hub Build 317 (original host source contract) | `20f1ac3ab519872b786c5d09fed57168353a213c` |
| Comms QL-427 (native witness/isolation/closure contract) | `94bd91afafa19ae54e701b48cb52df608ac326a5` |
| Comms QL-428 (newer main at authoring) | `71c81f7dd7ffd858b1195d5c2cca0f6f4c29059c` |
| AI Data Platform Build 380 (controller source) | `ccd291f22e15750392fa3995dc3d5811c506cd05` |

These **GitHub** commits are not proof of the installed original Windows binaries, Comms Node receiver, signer enrollment, independent remote witness, synchronized live Master telemetry or uptime. Only separately authenticated protected operational evidence may authorize such claims.

## 1. QL-427 witness proposal and external signing

Protected operator code on the original Ree host `DESKTOP-AE894KC` requires a previously authenticated Build 317 `OWNER_AUDIT` SQLite stage and an accepted `DURABLE_INDEPENDENT_OWNER_INCIDENT_AUDIT_CLOSED_RECOVERY_HOLD` receipt. It then validates the *native Comms QL-427* exact-scoped `checkpoint-witness-export` format, original Build 315 source revision, controller revision, incident, recent timestamp and latest authenticated QL-426 OWNER_ACK checkpoint hash.

The independently pinned Ed25519 external witness must sign the **exact JSON.stringify-order export digest**, checkpoint index, ceremony/episode and incident. The signer must be independent of the Comms Hub trust domain. Both independently reopened QL-426 custody and external witness custody must be affirmed by protected integrations, not self-declared in the browser. Only the opaque signed witness digest enters a **one-use SQLite journal**. A prepared export alone is **NOT** witnessed, sent or accepted.

## 2. Fresh QL-427 receiver OFF revalidation

A fresh separate Ed25519 receiver signature using the native `rosevear.ql427.post-rollback-isolation.v1` envelope must bind original QL-427 source/controller scope, incident, external witness, checkpoint digest and unique isolation check ID. Evidence must be no older than **120 seconds** and postdate the external witness. Independently reopened QL-427 OFF readback and a genuinely disabled receiver must be verified outside this source module. A prior QL-426 rollback acknowledgement **does not** prove post-rollback isolation.

For stale, wrong signer, wrong check ID, ON, mismatched, missing evidence or unavailable receiver: `receiver=UNKNOWN_MANUAL_RECOVERY_REQUIRED`, `connection=HOLD`. No source code here executes a receiver disable or restart.

## 3. Three independent Masters and distinct owner/reviewer closure

Three **different independently pinned Ed25519** report signers (Rosevear AI Hub, Comms Hub, AI Data Platform) must attest the exact verified witness and OFF digest, incident, ceremony, source/controller revisions, `CONFIRMED_ISOLATED_RECOVERY_CLOSED` and fresh monotonic event time. A distinct owner and independent reviewer must both sign one native ordered reports digest and action `ACCEPT_RECOVERY_CLOSURE_KEEP_RECEIVER_OFF`.

Independent protected callbacks verify the actual QL-427 persisted closure readback and **external durable closure anchor**. A three-stage source journal `WITNESS → ISOLATION → RECOVERY_CLOSURE` rejects missing predecessors, one-use replay and stage swapping. It stores only scope tokens, SHA-256 digests and their link; no keys, secrets or raw signed payloads. Privileged truncation of a local SQLite journal is not defeated by hash chaining; the external append-only anchor is a **required separate deployment dependency**.

Even a completed `QL427_THREE_MASTER_RECOVERY_INCIDENT_CLOSED_HOLD` means *administrative incident closure only*: receiver OFF, connection HOLD, master sync HOLD, operational owner acceptance HOLD. Any new pilot requires a fresh original-host signed QL-424 supervised ceremony and independently accepted three-Master operational decision. No automatic reconnection, server Scheduled Task, local agent, transport, unprotected POST endpoint or private-key persistence is included.

## 4. Owner-facing status and verification

Authenticated owner/administrator endpoint `GET /api/v1/system/master-shell-318-acceptance` is no-store and source-only; it never accepts raw protected proof from web clients. Integration Health includes a manual-refresh read-only panel with strict source commit checks. Synthetic regressions cover forged witness, tampered export, missing independent custody, stale/ON/mis-scoped OFF receipts, wrong Master signer, missing anchor, one-use journal replay and preservation of HOLD. The repository CI is **code-only**, not a live original-host proof.

`MASTER360-AIHUB-318-ACK | source=rosevear-ai-hub | source317=20f1ac3ab519872b786c5d09fed57168353a213c | comms427=94bd91afafa19ae54e701b48cb52df608ac326a5 | controller380=ccd291f22e15750392fa3995dc3d5811c506cd05 | ql427-export=HOLD | external-witness=HOLD | fresh-signed-OFF=HOLD | three-master-closure=HOLD | independent-owner-closure=HOLD | remote-closure-anchor=HOLD | receiver=OFF_UNTIL_LIVE_PROOF | connection=HOLD | uptime=UNKNOWN | slave-gate=HOLD_NEXT_MASTER_INTEGRATION_STAGE`

**Next proposed Build 319 — QL-428 External Closure Anchor Reconciliation, Independent Custody Drift Recheck & Owner-Supervised Pilot Re-entry Gate.**
