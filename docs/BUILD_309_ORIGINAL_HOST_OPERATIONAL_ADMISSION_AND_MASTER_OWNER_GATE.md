# Rosevear AI Hub 309 — Original-host operational one-TEST and AI Data owner gate

**Code promotion is separate from live Master acceptance.** Nothing in this build installs or runs code on Ree's PC, signs a production receipt, activates a receiver, adds a scheduled task, or changes any connection to CONNECTED.

## Reconciled production contracts (November 11, 2026)

| Role | Independently checked source baseline | Purpose |
| --- | --- | --- |
| AI Hub Build 308 | `cefc2b8859e51ca29f0255f69f8361161f8a117d` | Required **installed** revision of the original protected source |
| Comms QL-414 | `182fe951379605cbb909e7072009b59c9e498126` | Actual signed `rosevear.master360.ql414.receiver-ack.v1` contract |
| Comms QL-416 | `95d5780f377c7e2fd3c357789cbc2566fcf03b6c` | Protected ledger witness and sampled-uptime/incident review |
| AI Data Build 369 | `206aaf4f5007da10607efe692776256b90a9a28b` | Controller-held source health/master sync decision and owner gate |
| Master360 activation contract | `4b45b435fa7b6fc83b94e31556648fe4190a9f53` | Original agreed trust boundaries |

## Protected operational adapters

`server/src/rosevear_ai_hub/master_shell_acceptance309.py` contains four callable functions requiring separately authenticated original-host runtime callbacks. They are **not** exposed as public or write HTTP endpoints:

1. `review_installed_308_on_ree309` requires original Windows `DESKTOP-AE894KC`, existing persistent monitoring, a signed independent `TEMPLAR` field review, exact installed Build 308 launcher/process SHA, and Ree's explicit release consent. A repository SHA alone is not an installed release.
2. `prepare_ql414_one_test309` requires the already-admitted Build 306 original-host signed source episode, source Ed25519 SPKI pin from independent custody, Ree's separate approval, and independent reviewer approval. It produces the exact `{operation,correlationId,envelope}` QL-414 request, but **never transmits** it. Source revision is Build 308, not the Build 307 baseline accepted by the historical Build 308 helper.
3. `admit_ql416_one_test309` first matches the QL-416 protected read model to the exact source episode, Comms correlation, AI Data controller revision and source-derived sampled uptime, including `UNKNOWN` for sparse sample sets and signed-sample reachability-gap incidents. The QL-416 projection is not trust authority; an **independently authenticated protected Comms durable-ledger witness** must separately attest the exact source/receiver/QL-416 hashes. Only then does the revised backward-compatible Build 308 verifier check the two distinct Ed25519 signatures, fresh five-minute windows, exact ACK digest/episode/key/correlation, source import, authorized protected transport and owner/reviewer decisions, and atomically claim the existing original-host Build 307 chain anti-replay ledger. Replaying the same episode is rejected.
4. `prepare_ai_data_owner_handoff309` separately checks the original Windows host and independent durable chain witness before preparing an **opaque, metadata-only** controller request: source and Comms production baselines, source/receiver/QL-416 digests, episode and correlation. It does **not send** the request or impersonate the AI Data owner decision. AI Data must independently verify and record any real owner decision in its own authoritative protected ledger.

**Important:** Passing a callback `True` in a synthetic unit test is not proof of a real Windows host, signer custody, Comms receiver, durable ledger or controller acceptance. The protected host must supply true independently managed implementations; the app does not generate credentials or discover private keys. The protected receiver may only run after a distinct supervised owner decision.

## Original host and private run sequence

1. On Ree's real `DESKTOP-AE894KC`, use the existing approved launcher/recovery authority. Independently witness that the installed **Build 308** release pointer and running process correspond to `cefc2b8859e51ca29f0255f69f8361161f8a117d`. Inspect persistent monitor history. **Do not** create, enable or duplicate Windows tasks.
2. Authenticate Ree and the independent `TEMPLAR` reviewer through an approved private channel. Independently confirm source and receiver Ed25519 public pins. Do not copy private keys, user/device media, LAN endpoints or raw signed telemetry into GitHub.
3. With explicit one-TEST scope and approval, admit one fresh metadata-only source QL-411 receipt in the existing protected Build 306 ledger. Prepare the QL-414 request. A separately approved private transport may perform **one** owner-supervised TEST; this repository does not implement an HTTP receiver or auto-send.
4. Read the **actual** receiver-signed QL-414 ACK and independently confirmed protected QL-416 replay-commit record from Comms. Reject different episode/digest/correlation, unsigned receiver ACK, stale revision/pin, missing durable record or a second replay. Compute only sampled uptime; a signed reachability gap is an incident candidate, **not** confirmed continuous downtime.
5. Supply the metadata-only correlated source/receiver/QL-416 digest packet to AI Data Platform Build 369 through an approved protected route. **Only AI Data Platform** independently decides whether owner review evidence is sufficient. Until its own current production master-gate and explicit owner acceptance are confirmed, status is HOLD.

The owner-only GET `/api/v1/system/master-shell-309-acceptance` and I.T. health panel report current fail-closed expectations. They do not ingest, sign, transport or activate anything. The no-store response never invents operational uptime evidence.

## Direct AI Data instructions

`MASTER360-AIHUB-309-COORDINATE | controller=ai-data-platform | source=rosevear-ai-hub | installed-baseline=cefc2b8859e51ca29f0255f69f8361161f8a117d | comms-ql416=95d5780f377c7e2fd3c357789cbc2566fcf03b6c | ai-data-369=206aaf4f5007da10607efe692776256b90a9a28b | require original Ree DESKTOP-AE894KC installed-process proof, TEMPLAR witnessed source/receiver Ed25519 pins, fresh signed metadata-only QL-411 one-TEST, separately authenticated transport, genuine signed QL-414 ACK bound to exact episode/digest/correlation, independent QL-416 protected replay ledger, read-only sampled uptime incidents, and protected Build 307 source+Comms chain claim | independently validate the metadata handoff and owner decision in the controller's own audit ledger | no private-key export, no new Windows tasks, no CONNECTED or MASTERS_SYNCED without independent evidence; report HOLD until proven.`

## Current source ACK before original-host adoption

`MASTER360-AIHUB-309-ACK | code=VERIFY_POST_MERGE | installed-build308=HOLD | source-one-test=HOLD | comms-ql416=CODE_MATCHED_RUNTIME_HOLD | signed-receiver-ack=HOLD | sampled-uptime=UNKNOWN | ai-data-owner-decision=HOLD | automation-host=DESKTOP-AE894KC_ONLY | receiver=OFF | connection=HOLD | masters-synced=HOLD | slave-gate=HOLD_NEXT_MASTER_INTEGRATION_STAGE`

## Source references

- [QL-414 actual source-bound receiver contract](https://github.com/RosevearCreations/rosevear-comms-hub/blob/182fe951379605cbb909e7072009b59c9e498126/docs/handoffs/QL414_MASTER360_ONE_TEST_ACK_HANDOFF.md)
- [QL-416 operational evidence and incident reconciliation](https://github.com/RosevearCreations/rosevear-comms-hub/blob/95d5780f377c7e2fd3c357789cbc2566fcf03b6c/docs/handoffs/QL416_MASTER360_OPERATIONAL_IMPORT.md)
- [AI Data Build 369 source/master gate decision](https://github.com/RosevearCreations/ai-data-platform/blob/206aaf4f5007da10607efe692776256b90a9a28b/docs/BUILD_369_SOURCE_REFRESH_EVIDENCE_THREE_MASTER_RECHECK.md)
- [Original Master360 activation contract](https://github.com/RosevearCreations/ai-data-platform/blob/4b45b435fa7b6fc83b94e31556648fe4190a9f53/docs/master-shell/MASTER_360_ACTIVATION_CONTRACT.json)

**Next proposed AI Hub 310 — Supervised Original-Host Field Adoption, Authenticated One-TEST Export Audit & Controller Owner-Decision Reconciliation.**
