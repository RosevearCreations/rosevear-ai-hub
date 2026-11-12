# Rosevear AI Hub Build 319 — QL-428 External Closure Anchor, Independent Drift & Supervised Re-entry

## Source baselines verified 12 November 2026

| Dependency | Exact production commit |
| --- | --- |
| AI Hub Build 318 | `821ba9094248be724e435bbe36c3065da604fd8e` |
| Comms Hub QL-428 protected anchor contract | `71c81f7dd7ffd858b1195d5c2cca0f6f4c29059c` |
| Comms Hub later main QL-429 at authoring | `245cdc6f5dc21d9897ca454b2e16fdb51c33ae62` |
| AI Data Platform controller 380 | `ccd291f22e15750392fa3995dc3d5811c506cd05` |

These refer to GitHub repository code. Neither successful CI nor a source revision proves what is actually installed on original Windows host `DESKTOP-AE894KC`, the QL-426/427 protected Comms stores, external anchor system or any real receiver state.

## 1. Sanitized proposal to off-host anchor

An authenticated protected original-host caller must first verify Build 318's durable source `RECOVERY_CLOSURE` journal and the independently signed QL-427 `QL427_THREE_MASTER_RECOVERY_INCIDENT_CLOSED_HOLD` record. The protected original-host read-only local-store adapter must reopen the actual QL-426 OWNER_ACK and QL-427 closure stores and return their exact scope, incident, checkpoint index/digest and closure payload/receipt digests. An independent QL-427 owner closure verifier must confirm custody.

`prepare_ql428_external_anchor319` then emits *only* a sanitized native `rosevear.ql428.external-closure-anchor-export.v1` proposal and SHA-256 digest. This does **not** upload an anchor, claim remote durability or run a browser transport.

## 2. Independent off-host signed anchor and fresh readback

The protected original-host operator supplies an actual external read-only adapter. The Build 319 verifier invokes it for a unique unpredictable request ID, validating exact native QL-428 anchor and reader Ed25519 signatures from **separately independently pinned** public keys. The anchor is scope/incident/revision-bound, includes exact QL-426 checkpoint index and QL-427 closure digests and a monotonic external sequence. A *different* readback signer must return a signed fresh (at most **60 seconds old**) readback with exact request nonce, anchor digest, known external store ID, `remoteDurable=true` and sequence at least the anchor sequence.

An independently authorized remote-store custodian must separately attest actual off-host store custody. After protected remote I/O, the verifier **reopens both local QL-426/427 stores** and compares complete metadata to detect changes during the call. Any absent, mismatched, forged, stale, wrong signer, wrong remote store, nonce reuse or rollback => HOLD. Source SQLite persists one-use hashed ANCHOR and RECHECK stages, uniquely reserved request nonces and per-anchor external sequence watermark. This is *not a substitute* for genuine off-host append-only custody: remote storage and trustworthy key enrollment are deployment dependencies.

## 3. New re-entry custody challenge and precheck only

Re-entry requires a **second independently signed and freshly challenged** external anchor readback of the same original incident and closure. The source one-use journal records an exact `ANCHOR → RECHECK → PRECHECK` chain. No earlier remote readback can be reused as fresh authority.

Then a **new** real receiver-signed `rosevear.ql428.pre-reentry-receiver-isolation.v1` attestation must prove OFF and follow the remote recheck. Three different independently pinned Master Ed25519 signers must attest the same new re-entry ID, off digest, anchor, incident, original source/controller scope and `REENTRY_PRECHECK_ONLY_NEW_QL424_CEREMONY_REQUIRED` status. Distinct owner and independent reviewer must sign the exact ordered Master report digest and the action `PREPARE_NEW_SUPERVISED_CEREMONY_KEEP_RECEIVER_OFF`. Protected callbacks must independently verify real receiver isolation, owner authority and reopened Comms precheck custody. The original local closure is read again before the one-use source precheck record.

Even a passing `QL428_SUPERVISED_REENTRY_PRECHECK_ONLY` remains **receiver OFF, connection HOLD, Master sync HOLD and operational owner acceptance HOLD**. It cannot authorize a new isolated pilot. That requires a *separate future original-host signed QL-424 supervised one-TEST ceremony* with new independent three-Master operational acceptance. No Comms restart, receiver switch, external store provisioning, Windows Scheduled Task, private-key ingestion, or privileged UI write is shipped in this Build 319 code.

## 4. Owner status and acceptance limit

Protected owner/administrator `GET /api/v1/system/master-shell-319-acceptance` is read-only and no-store, with an Integration Health manual refresh panel. It reports **source evidence gaps**, not private evidence imported through the browser. Synthetic regression tests generate temporary Ed25519 keys and verify forged signatures, stale or wrong external challenges, local drift during readback, duplicated nonce, ON receiver, missing Master and owner signatures, and one-use re-entry replay. Green GitHub CI demonstrates code coverage only; **remote custody, actual Windows process, true receiver OFF, live telemetry and external signer enrollment still require protected physical verification**.

`MASTER360-AIHUB-319-ACK | source=rosevear-ai-hub | source318=821ba9094248be724e435bbe36c3065da604fd8e | comms428=71c81f7dd7ffd858b1195d5c2cca0f6f4c29059c | controller380=ccd291f22e15750392fa3995dc3d5811c506cd05 | off-host-anchor=HOLD | independent-readback=HOLD | custody-drift=HOLD | new-receiver-OFF=HOLD | three-master-precheck=HOLD | owner-precheck=HOLD | receiver=OFF_UNTIL_REAL_EVIDENCE | connection=HOLD | uptime=UNKNOWN | slave-gate=HOLD_NEXT_MASTER_INTEGRATION_STAGE`

**Next proposed Build 320 — QL-429 Protected External Anchor Enrollment, Original-Host Fresh Challenge Orchestration & Independent Three-Master Pilot Re-entry Witness.**
