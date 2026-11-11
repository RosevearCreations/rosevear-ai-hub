# Rosevear AI Hub 308 — Ree installed release, QL-414 interop and three-master proof

**Deployment:** code may be production GREEN independently of local host runtime acceptance. **Runtime, protected receiver and Master sync remain HOLD** until original-host owner evidence exists.

## Sources reconciled on November 11, 2026

| Authority | Observed `main` | Role |
| --- | --- | --- |
| Rosevear AI Hub Build 307 | `34e017dcf0586a7281d8726d5e8fb4a4a7054526` | Installed-source baseline requiring separate field acceptance |
| Rosevear Comms Hub QL-414 | `182fe951379605cbb909e7072009b59c9e498126` | Actual protected one-TEST contract, *not* an HTTP listener |
| Rosevear Comms Hub QL-415 | `8c2d488582801e8abc5ca718b4719c615863274c` | Protected read-only runtime receipt review; no live receiver |
| AI Data Platform Build 367 | `ff7ac9aea87e6d2e1d9ebc8d29b2fd784f901f01` | Trusted-source registry and explicit owner review gate |
| AI Data Platform Master360 original contract | `4b45b435fa7b6fc83b94e31556648fe4190a9f53` | Immutable activation contract |

The only automation/uptime source is Ree's original Windows `DESKTOP-AE894KC`. Jack's `TEMPLAR` remains independent reviewer. We do **not** create, enable, disable, duplicate or modify a Windows task, launcher, recovery process, receiver or key. Nothing here remotely installs a Build 307/308 release.

## Corrected interoperable QL-414 contract

Build 307's `rosevear.comms.ql414.source-one-test-ack.v1` was explicitly a proposed format. The production QL-414 code publishes the **different actual** schema `rosevear.master360.ql414.receiver-ack.v1`. Build 308 checks the real counterpart implementation from `runtimes/master-telemetry/ql414-one-test-transport.mjs`:

- Protected request: `{operation: 'MASTER360_ONE_TEST_READ_ONLY', correlationId, envelope}`. The signed QL-411 envelope has the exact original-host source revision and a fresh five-minute metadata-only observation with two or more valid samples.
- Signed Comms ACK fields: `schema, operation, sourceId, hostId, sourceRevision, sourceEpisodeId, correlationId, receivedAt, receiverKeyId, sourcePayloadSha256, decision, connection` with schema above, `decision='METADATA_VERIFIED_FOR_OWNER_REVIEW'` and `connection='HOLD'`.
- Both source and Comms signatures are verified against **separately independently pinned Ed25519 SPKI SHA-256** digests. The ACK must bind exact source episode, source payload digest, correlation ID, installed source revision and independently expected receiver key ID.
- The original source envelope must already be admitted in Build 306's durable protected original-host ledger. An independently authenticated private transport attestation, explicit Ree owner decision and independent reviewer decision precede the Build 307 protected atomic source+receiver chain claim; a repeated claim fails.
- `review_three_master_receipts308` independently verifies **three distinct** QL-413 signed master receipts and current revision pins, using a protected atomic batch replay claim. Even three `VERIFIED` claims are only **signed claims for review**, not independent runtime attestation or connection authorization.

`prepare_ql414_one_test_request308`, `verify_ql414_receiver_ack308` and `review_three_master_receipts308` are **protected Python adapters invoked only by a separately authenticated local authority**. They do not publish network endpoints, search for private keys or auto-create a transport. Test signing keys are disposable and never enrolled.

## Owner-supervised original Windows acceptance (HOLD until independently witnessed)

1. On the actual `DESKTOP-AE894KC` server, owner Ree verifies that the existing approved launcher/process and active local installed-release pointer correspond to Build 307 revision `34e017dcf0586a7281d8726d5e8fb4a4a7054526`; independent `TEMPLAR` reviewer signs the existing process/launcher field-review format. This code revision is not proof of a local install. Verify the existing Recovery task and persistent history without altering them.
2. In a separately authenticated protected owner session, confirm the original source signer pin and Comms receiver signer pin through *independent* custody. Confirm Comms has a functioning **protected** QL-414 handler with durable replay storage and independently managed receiver signing authority; the published code alone is insufficient.
3. With explicit Ree consent and independent review, admit **one** fresh source-signed metadata-only QL-411 envelope tied to the **actually installed** revision, and prepare the QL-414 request. Transport the request only through a previously approved authenticated private channel; do not expose a public endpoint, key, personal/customer/device data or LAN address.
4. Obtain the actual receiver-signed QL-414 ACK. Check exact contract, independent receiver signature, source digest, episode, correlation, key ID, freshness, source import and protected durable replay claim. A source signature is not a Comms signature. ACK means *received for review*, never CONNECTED.
5. Obtain all three **current** distinct signed QL-413 master receipts (AI Data, Comms, AI Hub), independent pins and protected replay evidence, then require explicit owner/reviewer review plus independent QL-415 runtime uptime review. Deliver only the approved metadata receipt/digests to AI Data Platform Build 367 for its own verified source admission and owner decision. Its accepted state cannot be inferred from an AI Hub-side boolean.

Until the original release/process proof, signer custody, one-TEST receiver ACK, three fresh signed receipts, replay ledger and independent AI Data acceptance are genuinely verified, report:

`installed-release=HOLD | durable-monitoring=CODE_READY_RUNTIME_HOLD | ql414-compatibility=CODE_MATCHED_RUNTIME_HOLD | receiver-ack=HOLD | ai-data-master-receipts=HOLD | receiver=OFF | connection=HOLD | masters-sync=HOLD | slave-gate=HOLD_NEXT_MASTER_INTEGRATION_STAGE`

Owner-only GET `/api/v1/system/master-shell-308-acceptance` and I.T. Integration Health panel display the current fail-closed status, not an owner-upload form. No public API changes trust state.

## Direct instruction to AI Data Platform Build 367

`MASTER360-AIHUB-308-COORDINATE | AI Data controller latest main=ff7ac9aea87e6d2e1d9ebc8d29b2fd784f901f01 | source=rosevear-ai-hub | source installed-release baseline=34e017dcf0586a7281d8726d5e8fb4a4a7054526 | Comms QL-414 exact ACK schema=rosevear.master360.ql414.receiver-ack.v1 | Comms QL-415 main=8c2d488582801e8abc5ca718b4719c615863274c | coordinate separately authenticated original Ree host installation evidence, independently witnessed Ed25519 source/receiver public-pin custody, one source-bound protected signed telemetry TEST, real receiver-signed digest/episode/correlation ACK with durable replay, distinct current signed three-Master QL-413 receipts and QL-415 read-only uptime acceptance | do not infer any of these from code GREEN; do not request private keys or create Windows tasks; record owner decision and report HOLD until genuinely verified.`

## References

- [Comms QL-414 published contract](https://github.com/RosevearCreations/rosevear-comms-hub/blob/182fe951379605cbb909e7072009b59c9e498126/docs/handoffs/QL414_MASTER360_ONE_TEST_ACK_HANDOFF.md)
- [Comms QL-415 runtime acceptance](https://github.com/RosevearCreations/rosevear-comms-hub/blob/8c2d488582801e8abc5ca718b4719c615863274c/docs/handoffs/QL415_MASTER360_RUNTIME_ACCEPTANCE.md)
- [AI Data Build 367 owner review](https://github.com/RosevearCreations/ai-data-platform/blob/ff7ac9aea87e6d2e1d9ebc8d29b2fd784f901f01/docs/BUILD_367_SOURCE_OWNER_REVIEW_ACCEPTANCE.md)
- [Original Master360 contract](https://github.com/RosevearCreations/ai-data-platform/blob/4b45b435fa7b6fc83b94e31556648fe4190a9f53/docs/master-shell/MASTER_360_ACTIVATION_CONTRACT.json)

## Next proposed build

**AI Hub 309 — Protected Original-Host One-TEST Operational Receipt Admission, Independent Comms Receiver ACK Proof & AI Data Owner-Gated Master Sync Decision.** No speculative CONNECTED flag or duplicate Windows automation.
