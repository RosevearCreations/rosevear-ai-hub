# Rosevear AI Hub Build 329 — QL-438 Corrective Evidence and Exception Closure

## Scope and predecessor

Build 329 follows the QL-437 Build 328 production commit `e3448cb70527c4cff76183a468036c2901200aa4`. Source authority is Comms Hub QL-438 `docs/handoffs/QL438_MASTER360_CORRECTIVE_WITNESS_EXCEPTION_CLOSURE.md`. This design is an **implementation gate**, not an assertion that an original-host corrective ceremony has occurred.

Only QL-437 **OPEN expired-lease exceptions** are eligible; a within-lease closed incident must be rejected. The exact protected QL-431 through QL-437 chain and QL-437 PENDING/FINAL must be reread from DESKTOP-AE894KC and bound to the same original incident, source/controller revisions, next ceremony, episode, lease and signed external anchor/readback.

## Required fail-closed state machine

1. Validate original-host authority and one of exactly two prior OPEN classifications: `LATE_HOST_SHUTDOWN_ESCALATION` (root cause `ORIGINAL_HOST_PILOT_SHUTDOWN_OVERRAN_LEASE`, remedy `ORIGINAL_HOST_FAIL_CLOSED_SHUTDOWN_WATCHDOG_REMEDIATED`), or `LATE_INDEPENDENT_OFF_READBACK_ESCALATION` (root cause `INDEPENDENT_RECEIVER_OFF_RECEIPT_LATE`, remedy `INDEPENDENT_OFF_WITNESS_DELIVERY_REMEDIATED`).
2. Create a unique remediation ID and nonce bound to the exact QL-437 OPEN exception and prior signed anchor/readback. An unsigned export is a proposal, never runtime evidence.
3. Durably commit exclusive one-use `PENDING` on the original protected Windows host using SQLite `BEGIN IMMEDIATE`, `synchronous=FULL` and exact readback **before any external read**. Replay/interruption retains HOLD.
4. Require fresh Ed25519-signed **original-host corrective evidence**, from DESKTOP-AE894KC, with root cause/action, digest, receiver OFF, `failClosedShutdownArmed=true` and positive repair sequence.
5. Independently require a distinct pinned signed **receiver OFF** witness bound to the original-host remedial digest, same remediation nonce, prior QL-437 reader and non-decreasing OFF sequence.
6. Require a **third independently pinned remediation reviewer** signing exact remedy, host evidence and receiver OFF, freshly later than OFF.
7. Collect exactly three distinct signed master reviews, rosevear-ai-hub / rosevear-comms-hub / ai-data-platform, all `SIGNED_CORRECTIVE_REVIEW_NO_RUNTIME_REENTRY`.
8. Require a **new immutable off-host signed corrective evidence anchor**, chained to the QL-437 anchor and three-master digest, followed by a **different pinned signed independent anchor reader** attesting exact nonce and evidence.
9. Require two distinct independently signed owner/reviewer decisions `CLOSE_EXPIRED_LEASE_EXCEPTION_CORRECTIVE_EVIDENCE_ONLY_KEEP_HOLD`; the owner decision cannot be substituted by the remediation reviewer.
10. Reread protected QL-431–437 custody and PENDING, atomically persist `CLOSED`, and independently reread it. This closes **only the exception evidence case**: `leaseExceptionOpen=false`, `incidentClosed=true` are event-scoped, never physical runtime assertions.

## Runtime restrictions

On **every** response, including success: `connection=HOLD`, `activationAuthorized=false`, `slaveGate=HOLD_NEXT_MASTER_INTEGRATION_STAGE`, `runtimeUptime=UNKNOWN`. Missing or invalid independent fresh OFF yields `receiver=UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION`. Neither the CLI/API nor the owner UI may toggle, start, stop, restart or reconnect the receiver. An on-disk `CLOSED` receipt is not live OFF proof. No general six-app CONNECTED or pilot reentry is permitted.

Protected local SQLite is not off-host immutable and privileged deletion remains outside its guarantee. CI uses synthetic Ed25519 signers and mocked adapters; physical remediation, protected signer enrollment and external anchor operation require separately supervised Windows original-host evidence.

## Required acceptance before dev/main promotion

- Positive synthetic cases for both late-host and late-independent-off exceptions, each with the full original-host/corrective OFF/third reviewer/three master/anchor/independent reader/dual owner/PENDING to CLOSED chain.
- Negative cases for within-lease, QL-437 closed, wrong incident, wrong source revisions/host/TEMPLAR, stale or forged signatures, ON or unarmed host, misclassified remedy, replayed remediation nonce, stale/ON/sequence-reversed receiver OFF, missing third independent reviewer, duplicate master, changed anchor or reader, mismatched dual owner, failed PENDING and tampered prior receipts.
- Source-only authenticated, no-store owner display; no status inference from private receipt alone.
- Six CI jobs GREEN on feature PR and on dev; a separate scope-controlled main candidate must also pass six PR checks and exact main push must independently finish six jobs GREEN.
- Do not merge this design-only candidate as Build 329 until the code, API/owner UI and negative tests are implemented and pass.

**Next proposed Build 330 — QL-439 Independent Corrective Closure Anchor Renewal, Post-Remediation Receiver OFF Continuity & Owner-Gated New-Ceremony Re-entry Readiness.**
