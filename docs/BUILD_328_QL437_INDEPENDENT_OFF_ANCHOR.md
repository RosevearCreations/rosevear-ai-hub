# Rosevear AI Hub Build 328 — QL-437 Protected External OFF Anchor & Incident Closure

## Contract / baseline

- Verified Build 327 production `main`: `8227b392b403b714d492a1f82e85c080e41a1f5a`.
- Upstream Comms Hub QL-437: `runtimes/master-telemetry/ql437-anchored-off-closure.mjs` and `docs/handoffs/QL437_MASTER360_INDEPENDENT_ANCHOR_OFF_INCIDENT_CLOSURE.md`.
- This release is **evidence export, independent signed readback and disposition intake only**. It does not run a receiver shutdown/enable command, operate an external immutable store, or establish live external signer enrollment.

## Mandatory supervised original-host sequence

1. On original protected Windows host **DESKTOP-AE894KC**, independently verify prior protected QL-431 RECONCILED incident and QL-432 owner, QL-433 precheck, QL-434 readiness, QL-435 PENDING + ACCEPTED and QL-436 PENDING + RECONCILED custody. Match the original incident, source/controller revisions, next ceremony, lease/disposition, and each exact private receipt digest. An owner UI snapshot cannot replace original-host private verification.
2. Prepare a new unique `exportId` and `anchorChallengeNonce`, bound to the exact QL-431–436 custody and original QL-436 signed lease classification. This is an **unanchored export proposal**, not physical receiver OFF proof.
3. **Before any external readback**, durably commit a one-use original-incident `PENDING` receipt with protected SQLite `BEGIN IMMEDIATE` and `synchronous=FULL` and readback. Interruption permanently consumes this incident's attempt until independently supervised corrective handling.
4. Read the immutable external evidence service's **Ed25519 signed anchor**, binding the export digest, nonce, original incident, QL-436 reconciled receipt and lease classification. A **separately pinned independent reader** must sign fresh exact readback of the same anchor and nonce. No private anchor service or immutable data store is created by this GitHub release.
5. Independently read a fresh original-host **signed OFF** on DESKTOP-AE894KC, bound to that external anchor/reader and monotonically increasing shutdown sequence. Then read a **distinct signed receiver OFF**, bound to the exact host OFF digest and anchor reader, with an OFF continuity sequence at least the host sequence. Reject ON, wrong machine (including TEMPLAR), stale, forged, sequence reversal and mismatched evidence.
6. Require distinct signed reports from **rosevear-ai-hub**, **rosevear-comms-hub** and **ai-data-platform** with the same anchored readback, independent OFF receipt, incident and `SIGNED_POST_SHUTDOWN_OFF_HOLD_NO_REENTRY` status.
7. If QL-436 lease disposition is `WITHIN_LEASE_INDEPENDENT_OFF_CONFIRMED`, distinct owner and reviewer sign `ACK_ON_TIME_POST_SHUTDOWN_INCIDENT_CLOSURE_NO_REENTRY_KEEP_HOLD`. This yields a **signed owner incident closure readback for this event only**, not a statement of persistent physical OFF.
8. If QL-436 is `LATE_HOST_SHUTDOWN_ESCALATION` or `LATE_INDEPENDENT_OFF_READBACK_ESCALATION`, a **separate, independently pinned signed exception custodian** must sign `LEASE_EXCEPTION_INDEPENDENT_CUSTODY_OPEN_NOT_CLOSED`. Owner and reviewer must sign `ACK_LEASE_EXCEPTION_OPEN_NO_INCIDENT_CLOSURE_KEEP_HOLD`. **The incident cannot close in QL-437** and awaits corrective-action evidence (QL-438).
9. Reopen and recheck the exact protected QL-431–436 chain and the fresh PENDING. Commit one-use `FINAL` custody with readback. A local FINAL restore must show `QL437_PRIVATE_FINAL_RECORD_PRESENT_NOT_LIVE_OFF_PROOF`, never a live OFF assertion.

## Guardrails

Every path retains `connection=HOLD`, `activationAuthorized=false`, `slaveGate=HOLD_NEXT_MASTER_INTEGRATION_STAGE` and no automatic receiver activation, restart or six-app CONNECTED. On missing or invalid independent evidence, receiver status must be `UNKNOWN_PENDING_INDEPENDENT_OFF_REVALIDATION`. A signed event-specific OFF result does not prove continuous receiver OFF.

The protected SQLite record is not externally immutable and may be deleted by a privileged actor. GitHub CI uses temporary synthetic Ed25519 keys and mocked adapters only. It cannot verify a real external anchor, actual Windows receiver shutdown, off-host custody, original-host physical signing, or incident closure outside the supervised original host.

## Release audit

Automated tests must cover on-time signed anchored closure, both late-disposition exception-OPEN outcomes, replay and tampered PENDING/FINAL, forged/missing anchor reader, wrong-host/ON/stale independent OFF, missing signer/owner review and protected authenticated source-only status. Merge only when exact development and production PRs are green and exact `main` push workflow is green.

`MASTER360-AIHUB-328-ACK | source=rosevear-ai-hub | source327=8227b392b403b714d492a1f82e85c080e41a1f5a | upstream=QL437 | chain=HOLD | external-signed-anchor=HOLD | independent-reader=HOLD | host-off=HOLD | receiver-off=HOLD | masters=HOLD | expired-lease-exception=OPEN_UNVERIFIED | owner-closure-review=HOLD | final=HOLD | receiver=UNKNOWN_PENDING_INDEPENDENT_OFF_REVALIDATION | connection=HOLD | activationAuthorized=FALSE | CI=SYNTHETIC_NOT_LIVE`

**Next proposed Build 329 — QL-438 Expired-Lease Corrective Action Evidence Intake, Independent Remediation Witness & Owner-Gated Incident Exception Closure Continuity.**
