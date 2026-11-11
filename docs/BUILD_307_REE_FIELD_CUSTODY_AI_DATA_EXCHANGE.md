# Rosevear AI Hub 307 — Original Ree host, one receipt and three masters

**Code release stage:** Source ready; original Windows runtime acceptance **HOLD** until independently demonstrated.

## Immutable reconciliation (2026-11-11)

- AI Hub Build 306 production `main`: `2780e94077fcee154a22e0e61ace72c36410cb90`.
- Comms Hub QL-413 production `main`: `c670c2523001294e8ac2e4f283a1f8e5edda3ddb`.
- AI Data Platform controller at preparation: `a5ba69a3e09fb4dd41f2b7586db027ba3e819301` (Build 366).
- Original Master360 activation authority remains controller commit `4b45b435fa7b6fc83b94e31556648fe4190a9f53`.
- Host **Ree** `DESKTOP-AE894KC` is the sole automation/uptime source. **Jack** `TEMPLAR` is an independent reviewer; never install an automation collector on his laptop.

## Build 307 contract and code behavior

1. The original-host field reviewer now requires signed TEMPLAR evidence of the **installed Build 306** SHA, matching safe active release pointer, launcher/process evidence digest, owner consent reference, two existing persistent monitor observations and independently pinned reviewer public key. It does not certify an installed binary from a GitHub commit alone.
2. A source-signed QL-411 metadata envelope is admitted by Build 306's protected, durable original-host source-import ledger. Build 307 can read back the *exact* prior episode/digest without creating a new ledger. A separately signed proposed QL-414 Comms receiver acknowledgement must refer to the same episode, source digest, host and installed revision; independent source/Comms signer pins, a separate Ree owner decision and independent reviewer decision are mandatory before one atomic SQLite chain claim. A later replay is rejected across restarts.
3. Comms QL-413 currently provides a **read-only protected three-master receipt review library**, not an operating receiver nor a signed receiver ACK endpoint. Build 307's `rosevear.comms.ql414.source-one-test-ack.v1` is **a proposed future schema for QL-414**, not a claim of deployed Comms interoperability. Until Comms confirms a receiver contract and live authority, no one-TEST transport or signed ACK occurs.
4. After separately approved original-host process evidence and existing local durable observations, a protected original-host signing callback may prepare a **QL-413-compatible** AI Hub source receipt (exact fields `schema,sourceId,hostId,revision,issuedAt,receiptId,evidence`) for independent AI Data / Comms review. The actual QL-413 verifier expects **all three distinct master receipts**. This source-only candidate has `signedTelemetry`, `replayProtection`, and `incidentAcceptance` **HOLD** even if local installed-release/history reviews pass. The trend is represented only by a SHA-256 digest outside the QL-413 envelope, never as invented remote uptime.
5. The I.T. Integration Health screen and the protected read-only `/api/v1/system/master-shell-307-acceptance` GET display current **HOLD** states and require a manual refresh. They never accept public receipt uploads or activate a receiver.

## One supervised field operation (not automatically executed)

1. On the real **DESKTOP-AE894KC** server, with Ree's authority, check the installed release pointer and running launcher/process at Build 306's SHA. Independent reviewer TEMPLAR signs the factual review using an independently provisioned public key pin. Confirm the existing monitor has recent persistent samples. No new Windows scheduled task or recovery launcher is created.
2. Have Ree independently authorize **one** source-signed, metadata-only QL-411 TEST envelope. Use the existing protected Build 306 durable import path. The exact episode and payload digest must be readable from the original host's protected ledger.
3. Only after Comms publishes an interoperable authenticated receiver and independently enrolled signing pin, obtain a **real** receiver-signed ACK bound to that exact source episode. Verify its revision and freshness, and have independent owner and reviewer approve before claiming the paired-chain ledger. A source signature alone is never a Comms ACK.
4. Prepare the QL-413-compatible source receipt through a protected original-host signing callback, verify with the independently pinned source key, and offer it only through a separately owner-authorized protected transport. Independently verify AI Data Platform intake and all three master receipts at exact deployed revisions. No private keys, customer/device data or LAN addresses leave the protected authority boundary.
5. Do not mark `CONNECTED`, `MASTERS_SYNCED`, or onboard Yard Workers/iCamp merely because GitHub CI passed or an envelope claims `VERIFIED`. Actual runtime acceptance and a separate hardened owner-gated connection decision remain required.

**Not executed by this code release:** Windows install, remote launch, signer enrollment, original test, network transport, Comms receiver activation, owner acceptance or AI Data master sync. Existing Startup/Recovery tasks and ports are unchanged.

**Source:** `server/src/rosevear_ai_hub/master_shell_acceptance307.py`, `server/src/rosevear_ai_hub/master_shell_acceptance306.py` and `server/tests/test_master_shell_acceptance307.py`. Counterpart reference: Comms [QL-413 receipt intake](https://github.com/RosevearCreations/rosevear-comms-hub/blob/c670c2523001294e8ac2e4f283a1f8e5edda3ddb/docs/handoffs/QL413_MASTER360_PROTECTED_RECEIPT_INTAKE.md); controller [Master360 activation contract](https://github.com/RosevearCreations/ai-data-platform/blob/4b45b435fa7b6fc83b94e31556648fe4190a9f53/docs/master-shell/MASTER_360_ACTIVATION_CONTRACT.json).

## Next proposed build

**Build 308 — Ree Original-Host Supervised Release Handoff, QL-414 Receiver Contract Compatibility & Authenticated Three-Master Evidence Confirmation.**
