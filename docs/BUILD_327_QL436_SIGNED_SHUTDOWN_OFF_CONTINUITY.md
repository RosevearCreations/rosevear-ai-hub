# Rosevear AI Hub Build 327 — QL-436 Signed Isolated Pilot Shutdown & Independent OFF

**Source contract:** Rosevear Comms Hub QL-436 production `7bf522660f6f10a1cd1b039aacf9b93af165304f`, `runtimes/master-telemetry/ql436-signed-pilot-shutdown.mjs`. Verified AI Hub Build 326 production `cd5d1d46196d2cbf9bbd4d6165861356f447dc16`.

## Protected owner-supervised original-host procedure

1. On **DESKTOP-AE894KC**, independently verify original signed QL-430 scope, terminal QL-431 reconciled incident, protected QL-432 owner recovery, QL-433 precheck, QL-434 distinct authority readiness, and QL-435 signed isolated pilot ON decision. Reopen both QL-435 PENDING and ACCEPTED one-use receipts. Check the same original incident, next ceremony/episode, original challenge ID/nonce, source/controller SHA, final receipt digests and lease expiry. Browser text does not confer authority.
2. Generate a fresh shutdown nonce and review ID, distinct from the QL-435 challenge and ceremony. Prepare an exact-digest QL-436 request for **reading signed original-host shutdown and independent OFF only**, never activation or receiver restart.
3. Before calling any external host evidence adapter, commit an exclusive original-host one-use **PENDING** shutdown review record with `BEGIN IMMEDIATE`, `synchronous=FULL`, unique ceremony ID, digest and exact readback. A crash, forged evidence or missing observer leaves PENDING and blocks replay.
4. Require a freshly Ed25519-signed original host `DESKTOP-AE894KC` shutdown statement proving `ORIGINAL_HOST_FAIL_CLOSED_PILOT_DISABLE`, `OFF`, actual shutdown timestamp, later signed observation timestamp and a positive shutdown sequence, bound to QL-435 ACCEPTED digest, original challenge and lease.
5. **Independently pinned receiver observer** must separately sign `OFF`, bind to host shutdown digest, same original incident, review ID, nonce, ceremony, lease and monotonically valid OFF sequence. The observer may not predate the host shutdown observation. Invalid signatures, TEMPLAR, ON, stale, missing or replayed proof must leave **UNKNOWN_UNTIL_INDEPENDENT_SIGNED_OFF**, not OFF.
6. Derive exact lease disposition from signed shutdown time and independent OFF observation:
   - `WITHIN_LEASE_INDEPENDENT_OFF_CONFIRMED` when both meet the original QL-435 lease expiry.
   - `LATE_HOST_SHUTDOWN_ESCALATION` when host shutdown occurred after expiry (takes precedence).
   - `LATE_INDEPENDENT_OFF_READBACK_ESCALATION` when host shutdown was on time but independent OFF arrived after expiry.
7. All three independently pinned Master signers (**rosevear-ai-hub**, **rosevear-comms-hub**, **ai-data-platform**) must sign the same incident/review, OFF digest, original lease and calculated disposition, with `ACK_SIGNED_OFF_NO_REACTIVATION`. Original owner and distinct reviewer sign `ACK_SIGNED_OFF_WITHIN_LEASE_RETAIN_HOLD` when timely or `ACK_SIGNED_OFF_AND_ESCALATE_LEASE_EXCEPTION_RETAIN_HOLD` when late; any generic CONNECTED or late-as-timely approval fails closed.
8. Re-read original QL-431 through QL-435 custody and PENDING. Write a single-use **RECONCILED** record only if the complete signed chain is consistent and independently read back.
9. Successful `DURABLE_QL436_POST_PILOT_SIGNED_OFF_RECONCILED` is an evidence review result, **not an instruction to restart**. It retains `connection=HOLD`, `activationAuthorized=false`, `manualReceiverIsolationRequired=true` and the integration gate HOLD. No automatic reentry or generally CONNECTED promotion is authorized.

## Verification and limitations

The authenticated, no-store `GET /api/v1/system/master-shell-327-acceptance` and owner panel expose **source-only HOLD**. CI uses synthetic Ed25519 signers, temporary protected SQLite and mocked OFF observers. No physical original-host shutdown, actual receiver state, private signer enrollment, externally immutable anchor, independent off-host continuity, or production runtime uptime is established by this code delivery.

Negative tests must cover signed late host and late independent OFF, mismatched owner escalation, wrong host/receiver ON, missing signer, stale receipts, tampered private receipt, interrupted PENDING and replay. A local journal detects retained-record tampering but cannot prevent privileged deletion; real operations require independently retained custody and a hard host-side fail-closed shutdown.

`MASTER360-AIHUB-327-ACK | source=rosevear-ai-hub | source326=cd5d1d46196d2cbf9bbd4d6165861356f447dc16 | comms436=7bf522660f6f10a1cd1b039aacf9b93af165304f | original-host-custody=HOLD | signed-host-shutdown=HOLD | separate-independent-off=HOLD | signed-lease-disposition=HOLD | three-master-continuity=HOLD | dual-owner-review=HOLD | one-use-reconciled=HOLD | receiver=UNKNOWN_UNTIL_INDEPENDENT_SIGNED_OFF | connection=HOLD | activationAuthorized=FALSE | CI=SYNTHETIC_NOT_LIVE`

**Next proposed Build 328 — QL-437 Independently Anchored Post-Shutdown OFF Evidence Export, Expired-Lease Exception Custody & Owner-Supervised Incident Closure Readback.**
