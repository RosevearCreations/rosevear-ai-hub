# Rosevear AI Hub Build 321 — QL-430 Original-Host Supervised Pilot Re-entry, Independent Receiver Runtime & Three-Master Acceptance

## Pinned reviewed source contract (November 12, 2026)

| Dependency | Verified production commit |
| --- | --- |
| Rosevear AI Hub Build 320 | `146f8c4c22a7155c9c7e08b0f7697dffc25754a9` |
| Comms Hub QL-430 reference contract | `a7625fed29e0b4dd6b41b8454e576828b19d6d6e` |
| AI Data Platform controller Build 380 | `ccd291f22e15750392fa3995dc3d5811c506cd05` |

**Important**: A passing GitHub production workflow is not proof of live pilot activation, real external signer enrollment, original-host process state or uptime. These are separately authenticated operational events.

## What this build implements

1. Original-host-only protected backend `master_shell_acceptance321.py`, with no public endpoint to initiate an activation. Enrolled QL-429 original-host signature, signed 60-second challenge, and the immutable earlier three-Master pilot witness must pass from the private original-host Build 320 journal. A protected operator must independently attest the real original Windows host (`DESKTOP-AE894KC`), original-host receiver OFF, QL-429 owner/three-Master witness custody, new QL-423 signed replay, new QL-424 enrolled public signer and supervised authority. No browser or GitHub code run supplies these claims.

2. A *different* original-host episode and ceremony, equal to QL-429's proposed `nextCeremonyId`, must have a new exact native dual-Ed25519-signed QL-424 `ISOLATED_ONE_TEST` activation linked to the freshly restored QL-423 replay record. Separately, owner and reviewer must both sign the native QL-430 `EXECUTE_NEW_SUPERVISED_QL424_ISOLATED_ONE_TEST` authorization binding the previous QL-429 witness digest, the original-host challenge, and activation digest. Missing or substituted witnesses, wrong episode, changed revision, stale signer proof or unauthorized action => HOLD *before* receiver execution.

3. A protected original-host SQLite `ProtectedPilotJournal321` writes a FULL-sync, one-use `ATTEMPT` digest **before** calling an injected real QL-424 protected runner. An interrupted or failed attempt may not replay the same ceremony. Only an independently authorized private backend can supply an actual QL-424 runner, keys and receiver adapter; none is auto-installed or enabled in this code release. The QL-424 runner must return a second independently pinned and valid original-host receiver `ISOLATED_ONE_TEST_ON` signature bound to the new ceremony, episode, source/controller revision and restored QL-423 receipt.

4. The QL-430 verifier reads a **separate** independently signed receiver-runtime attestation using a different enrolled public Ed25519 key and read-only adapter. The fresh attestation must be no earlier than QL-424's signed state and must match the original QL-429 witness receipt and challenge ID. Any failed, forged, stale, wrong-scope, wrong-state or missing proof fails closed.

5. Three separately pinned Master Ed25519 signatures (AI Hub, Comms Hub, AI Data Platform) plus a dual-signed owner/reviewer acceptance are mandatory for the *new* QL-424 runtime proof. Then **another** separate three-Master QL-430 batch must bind the QL-424 acceptance digest, independently signed receiver digest and QL-429 witness, followed by another dual-signed owner/reviewer runtime decision `ACCEPT_FRESH_ISOLATED_PILOT_ONLY_KEEP_SLAVE_GATE_HOLD`. The independent real Master signer custody, real owner runtime decision and independent external receipt custodian are protected original-host callbacks. Only after all checks and durable `ACCEPTED` receipt readback does the private routine return `VERIFIED_CONNECTED_PILOT` for **this one isolated test**.

6. Any post-reservation failure requests protected `disable_one_test`. A confirmed disable is not treated as independently proven OFF unless a **new, separately signed** QL-430 shutdown receiver-state readback also proves OFF. An uncertain disable or failed rollback yields `UNKNOWN_MANUAL_OPERATOR_RECOVERY_REQUIRED`. The one-use `ATTEMPT` remains durable, disallowing silent replay. This is not a replacement for an operator's out-of-band shutoff or independent QL-425/426 continuity monitoring.

7. Even a successful pilot retains `HOLD_NEXT_MASTER_INTEGRATION_STAGE` for the other applications and provides only a **single signed runtime snapshot**, never an uptime SLA or universal production CONNECTED. The unprovisioned owner status route always reports `receiver=OFF; connection=HOLD; ownerAcceptance=HOLD; masterSync=HOLD`. Authenticated, no-store `GET /api/v1/system/master-shell-321-acceptance` plus Integration Health manual-refresh panel surface only code evidence gaps. They accept no evidence, private keys, receiver controls or automation requests.

## CI regression and custody limits

The new positive integration test uses **synthetic Ed25519 keys and mock original-host receiver only**, proving accepted isolated one-TEST is bound to both fresh receiver signatures, QL-423 replay, QL-429 witness, two sets of three Master signatures and two dual-signed owner decisions. Negative tests reject missing physical authority and modified activation; forged independent receiver proof must fail close, verify OFF and consume the attempt. Missing Master attestation disables the mock receiver, and failed shutdown returns UNKNOWN. Replay of a completed or interrupted ceremony is blocked. Local SQLite hashes do not protect against privileged deletion; a real protected off-host immutable ledger remains an operational prerequisite.

Neither this build nor the GitHub CI makes an actual Windows process, Comms receiver, external signer, or application-master connection live. The source-only HOLD state is intentional until the owner-supervised external procedure is performed on the original host.

`MASTER360-AIHUB-321-ACK | source=rosevear-ai-hub | source320=146f8c4c22a7155c9c7e08b0f7697dffc25754a9 | comms430=a7625fed29e0b4dd6b41b8454e576828b19d6d6e | controller380=ccd291f22e15750392fa3995dc3d5811c506cd05 | original-host-session=HOLD | ql429-witness=HOLD | ql423-replay=HOLD | ql424-new-one-test=HOLD | original-receiver=OFF | independent-receiver=HOLD | ql424-3master=HOLD | ql430-3master=HOLD | dual-owner-runtime=HOLD | durable-acceptance=HOLD | connection=HOLD | uptime=UNKNOWN | slaveGate=HOLD_NEXT_MASTER_INTEGRATION_STAGE`

**Next proposed Build 322 — QL-431 Independent Post-Re-entry Pilot Health Continuity, Signed Fail-Closed Receiver Shutdown & Three-Master Incident Custody Reconciliation.**
