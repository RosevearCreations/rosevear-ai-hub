# Rosevear AI Hub Build 325 — QL-434 Protected New-Ceremony Evidence and Signed Original-Host Readiness

## Pinned release contract (2026-11-12)

- AI Hub Build 324 production main: `1fd1f527f8c181f4077b353e34b0bcdf9c801e31`.
- Comms Hub QL-434 source contract: `f87dd73c608bb9615d1928c1070a3dd1d777ffaf`; `runtimes/master-telemetry/ql434-protected-ceremony-readiness.mjs`.
- The full original Windows host pilot re-entry is **not** included in this source release. CI uses synthetic Ed25519 keys and mock callbacks only.

## Protected original-host acceptance procedure

1. On original Windows host **DESKTOP-AE894KC**, independently reopen the accepted QL-430 pilot, hash-linked terminal QL-431 RECONCILED OFF incident, QL-432 signed owner review, and Build 324's private one-use QL-433 precheck receipt. Require exact incident, previous scope, signed custody digests, previous versus new distinct ceremony and episode IDs, and controller/source revisions. A real original-host protected operator must independently validate the actual signed QL-433 consent; a web-generated status has no authority.
2. Generate unpredictable, one-use **authorityId** and **challengeNonce** for the **new** supervised QL-429/430 enrollment. Prepare a sanitized QL-434 authority export binding prior QL-431 checkpoint index/digest, QL-432 signed owner receipt digest, QL-433 precheck receipt and independent anchor/readback, original source/controller revisions, Build 324 main SHA, original host and exact next IDs. Its only action is `PREPARE_NEW_SUPERVISED_QL429_QL430_CEREMONY_NO_RECEIVER_ACTIVATION`. Export preparation does **not** authorize activation.
3. A newly pinned **independent authority issuer** must sign export digest, nonce, incident and QL-433 receipt. A separately pinned, different independent **witness** must sign an exact readback of the issuer digest and export. Both must remain fresh and have the statuses `NEW_CEREMONY_READINESS_HANDOFF_NOT_ACTIVATION` and `INDEPENDENT_HANDOFF_READBACK_NO_ACTIVATION`.
4. Require a fresh signed **DESKTOP-AE894KC** readiness statement proving receiver **OFF**, exact next ceremony/episode, signed issuer-witness digest, source/controller revisions, and `HOST_READY_FOR_SEPARATE_NEW_SUPERVISED_CEREMONY_ONLY`.
5. A separately pinned independent receiver must sign fresh **OFF** after the host statement, bound to its exact digest and authority witness. The host's own OFF proof alone is insufficient.
6. Three distinct Master signers (**rosevear-ai-hub**, **rosevear-comms-hub**, **ai-data-platform**) each sign `NEW_CEREMONY_PREPARATION_ONLY_NOT_ACTIVATED` for the same incident, QL-433 receipt, issuer-witness digest, receiver proof and new IDs. A distinct owner and reviewer sign the ordered Master digest under action `AUTHORIZE_NEW_CEREMONY_READINESS_ONLY_RECEIVER_OFF_NO_ACTIVATION`.
7. After every external readback, re-open QL-431, QL-432 and QL-433 private custody. Changed/forged/stale evidence fails closed. The protected one-use Build 325 original-host SQLite FULL-sync receipt records the exact export and signed-evidence digest exclusively and reopens it. Duplicate incident or local tamper fails closed.
8. **Only** an independently verified `DURABLE_QL434_SIGNED_NEW_CEREMONY_READINESS_HANDOFF` permits the *preparation* for another owner-supervised QL-429/430 ceremony. The routine never starts, resumes or enables a receiver and explicitly returns `activationAuthorized=false`, `connection=HOLD`, `receiver=OFF_VERIFIED_SIGNED_READBACK` and `slaveGate=HOLD_NEXT_MASTER_INTEGRATION_STAGE`.

## Operations, security and verification

The authenticated no-store endpoint `GET /api/v1/system/master-shell-325-acceptance` and owner dashboard are strictly **source-only HOLD**, with no private key or signed-approval collection, live signer enrollment, Windows process activation, continuous uptime verification or CONNECTED transition. No background monitoring or scheduler is installed. The local one-use SQLite journal detects retained-record tampering but cannot protect against privileged deletion; real independent off-host immutability requires a supervised deployment.

Tests use synthetic signer pairs and mocked signed handoffs to validate success, absent/forged issuer or witness, TEMPLAR-host evidence, receiver ON, missing/duplicate Master signer, wrong QL-433 digest, owner activation attempt, tampered original incident, corrupt one-use receipt and replay. Passing CI does not attest to the real Windows host or enrolled independent authority.

`MASTER360-AIHUB-325-ACK | source=rosevear-ai-hub | source324=1fd1f527f8c181f4077b353e34b0bcdf9c801e31 | comms434=f87dd73c608bb9615d1928c1070a3dd1d777ffaf | ql431-432-433-chain=HOLD | independent-issuer=HOLD | independent-witness=HOLD | original-host-off=HOLD | independent-receiver-off=HOLD | three-master=HOLD | dual-owner=HOLD | one-use-readiness=HOLD | activationAuthorized=FALSE | connection=HOLD | receiver=OFF`

**Next proposed Build 326 — QL-435 Fresh Original-Host Ceremony Enrollment, Independent Receiver ON Challenge Witness & Three-Master Pilot Activation Decision Boundary.**
