# Rosevear AI Hub Build 326 — QL-435 Signed Isolated Pilot ON Evidence

## Pinned reference (2026-11-12)

- Build 325 verified production `main`: `453b00a404d2392dac22ded18ee3f9f77a2466c4`.
- Comms Hub QL-435 production: `c2ec4dba1f403b5d837d45f758cee6dba83f50fd`, `runtimes/master-telemetry/ql435-original-host-pilot-witness.mjs`.
- This release implements **signed evidence intake only**, not real receiver commands or live original-host enrollment.

## Protected original Windows-host sequence

1. On **DESKTOP-AE894KC**, re-read the accepted protected QL-430 pilot, terminal QL-431 RECONCILED incident, QL-432 recovery owner receipt, QL-433 next-ceremony precheck, QL-434 signed authority handoff and their private one-use ledgers. Match the exact original incident and 40-character source/controller revisions, original/new distinct ceremony and episode, signed witness and durable digests. Browser claims never substitute for protected evidence.
2. Generate a fresh unpredictable challenge ID and nonce. Propose a unique isolated pilot under a strictly supervised lease no longer than **15 seconds** from current observation. Original-host caller must independently attest to a **real hard fail-closed shutdown mechanism** already armed before requesting ON evidence.
3. Require a freshly signed DESKTOP-AE894KC **OFF** enrollment with new ceremony/episode, request digest, nonce, short lease and `failClosedShutdownArmed=true`. Require a separately pinned independent **OFF** observer after enrollment. Wrong machine, stale proof, missing arm or ON before the permit fails closed.
4. Obtain **two distinct owner/reviewer signatures** on `PERMIT_ONE_ISOLATED_ON_CHALLENGE_ONLY_NO_GENERAL_CONNECTED`, bound to the exact OFF enrollment, independent OFF digest, new ceremony/episode, fresh challenge and short lease.
5. Re-read all private QL-431 through QL-434 custody before requesting any ON evidence. Persist a one-use `PENDING` receipt in protected original-host SQLite, with `BEGIN IMMEDIATE`, `synchronous=FULL`, exact readback and unique ceremony key. This **consumes** that ceremony. Process interruption, invalid ON evidence or any subsequent failure **cannot** retry the same ceremony.
6. Only after PENDING may the protected host observer return freshly signed `ISOLATED_ONE_TEST_ON` evidence bound to the owner permit, nonce and lease, with shutdown armed. A separately pinned independent observer must return a fresh signed **ON** observation, bound to the exact host ON digest, before the lease expires. The library does **not** call an enable API or claim an ON state from its own tests.
7. All three Masters (**rosevear-ai-hub**, **rosevear-comms-hub**, **ai-data-platform**) must independently sign `SIGNED_ISOLATED_ON_EVIDENCE_REVIEW_ONLY_NO_GENERAL_CONNECTED` for the exact lease, witness, challenge and ceremony. Original owner and distinct reviewer sign `RECOGNIZE_SINGLE_PILOT_ON_EVIDENCE_ONLY_MANDATORY_OFF_RECHECK`.
8. Re-read the protected QL-431–QL-434 chain and PENDING receipt. A second one-use `ACCEPTED` receipt records exact signed observation and owner decision digests. A successful `DURABLE_QL435_ISOLATED_PILOT_ON_EVIDENCE_DECISION` is **evidence accepted for review only**, not an activation or CONNECTED promotion.
9. Regardless of acceptance, **manualReceiverIsolationRequired=true**; the next operation is supervised fail-closed **OFF** and independently signed post-pilot isolation/readback. Any failure after PENDING returns `UNKNOWN_OR_ON_SUPERVISED_FAIL_CLOSED_SHUTDOWN_REQUIRED`. No automatic/general six-app CONNECTED status is authorized.

## Source status, limitations and tests

Authenticated `GET /api/v1/system/master-shell-326-acceptance` and the read-only owner dashboard expose a **source-only HOLD projection**. No Windows receiver activation, private signing key enrollment, independent observer installation, real hard-lease timer, automatic OFF control or continuous uptime measurement is shipped.

Synthetic Ed25519 test keys and mock observation adapters verify correct signed pre-/post-permit evidence, the max-15-second lease, durable PENDING before ON observation, three-Master/dual-owner decisions and exact one-use replay. Negative tests reject forged/stale/wrong-host/ON enrollment, missing OFF witness, unauthorized permit, bad independent ON witness, failing host observation, corrupt custody and replay. These tests are **not** proof of actual original-host receiver ON/OFF or an independent hard shutdown.

The local SQLite ledger is not a substitute for independently anchored custody: privileged deletion of local data can defeat its retained-record protection. Real use requires an independently supervised original-host procedure and physically enforced fail-closed OFF.

`MASTER360-AIHUB-326-ACK | source=rosevear-ai-hub | source325=453b00a404d2392dac22ded18ee3f9f77a2466c4 | comms435=c2ec4dba1f403b5d837d45f758cee6dba83f50fd | ql431-to-434=HOLD | signed-host-off=HOLD | independent-pre-on-off=HOLD | hard-lease-15s=HOLD | owner-prepermit=HOLD | pending=HOLD | signed-host-on=HOLD | independent-on=HOLD | three-master=HOLD | dual-owner=HOLD | accepted=HOLD | post-pilot-off=HOLD | activationAuthorized=FALSE | connection=HOLD`

**Next proposed Build 327 — QL-436 Signed Isolated Pilot Shutdown Confirmation, Independent Receiver OFF Readback, Lease Expiry Reconciliation & Three-Master Incident Continuity.**
