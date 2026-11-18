# Rosevear AI Hub Build 365 — Seven-App Sysop Aggregate Statistics Source Intake

## Release scope and privacy boundary

Owner requested three Masters and four application sources (YW/iCamp Slave Shells, Rosie Dazzlers/Devil n Dove direct business apps) to begin reporting aggregate usage and Sysop events. AI Data Platform is the top Server Shell and the source of truth for the additive common protocol. Canonical schema lives at:

- https://github.com/RosevearCreations/ai-data-platform/blob/main/docs/contracts/rosevear-sysop-telemetry-v1.schema.json
- https://github.com/RosevearCreations/ai-data-platform/blob/main/docs/SEVEN_APP_SYSOP_TELEMETRY_HANDOFF.md

**This Hub build is a source-level verified offline/local signed snapshot reader, not a running seven-peer collector.** It adds a signed Ed25519 verifier with a hard-coded seven-app allow list, privacy-safe aggregate contract, owner-only GET endpoint and single integrated System dashboard. It does not invent counts, create signer keys, configure mTLS, open firewall ports, register Windows services, install a watcher, reboot a machine or turn on the private QL-340C Comms receiver.

## Exactly seven application IDs

1. ai-data-platform — Master/top Server Shell
2. rosevear-ai-hub — Master/original Windows automation and HA VM
3. rosevear-comms-hub — Master/communications
4. yw — Yard Workers governed Slave Shell
5. icamp — iCamp governed Slave Shell
6. rosiedazzlers — internal business application
7. devilndove — internal business application

No shared tenant database, customer records, payment info, messaging bodies, guest/camp-site IDs, photos, device/camera imagery, IP lists or personal usage telemetry crosses this contract.

## Enrollment requirements (no secrets in GitHub)

Only on Windows original host DESKTOP-AE894KC, the **server operator**, not browser, may configure per-app variables. Replace {TAG} with one of AIDP, HUB, COMMS, YW, ICAMP, ROSIE, DEVIL:

- ROSEVEAR_SYSOP365_{TAG}_SIGNED_JSON_PATH — absolute protected owner-supplied signed JSON file
- ROSEVEAR_SYSOP365_{TAG}_PUBLIC_KEY_PATH — independently approved source Ed25519 **public** PEM (no private keys)
- ROSEVEAR_SYSOP365_{TAG}_PUBLIC_KEY_PIN — independently pinned SHA-256 of raw Ed25519 public key, lowercase 64 hex
- ROSEVEAR_SYSOP365_{TAG}_SOURCE_COMMIT — exact installed source SHA, lowercase 40 hex

The Hub uses fixed server-side paths and refuses off-host, missing, expired, forged, wrong-source, tenant-bearing or elevated-action inputs. Only exactly schema v1 metrics (requests, serverErrors, jobsCompleted, jobsFailed, queueDepth, latencyP95Ms, activeSessions) are accepted with numeric values or null. Null means **NOT INSTRUMENTED**, not zero. The source field may include HOST_BOOT_OBSERVED only for rosevear-ai-hub and its timestamp is still a **claim**, not a witnessed physical reboot.

A signed source file must have 90-second maximum expiry and be updated by its legitimate actual producer. This source build does not yet install or invoke that producer/supervisor, or authenticate a live remote mTLS channel. A signature proves only that the independently pinned key signed that content; it does not prove actual measurement or physical source provenance. This build does not have a durable nonce-intake ledger for the new seven-app format; repeated current files are possible within TTL. Existing QL-459 YW/iCamp live health uses a separate older signed mTLS + durable journal and must not be weakened or silently treated as the new seven-app format.

## Operator API and real live readiness

Owner-only `GET /api/v1/system/sysop-statistics-365` is no-store/no-cache and GET-only. UI is embedded below QL-473 Master acceptance inside System. Every app gets a status card; missing evidence is HOLD, not healthy. Even cryptographically accepted private-file samples are `SIGNED_AGGREGATE_SOURCE_ONLY`, not `CONNECTED`, because no real network transport receipt is obtained by this endpoint.

A future next-source iteration must add: real deployed producer read-only endpoint per app, independent key/CA/leaf enrollment and private transport, nonce replay-resistant journaling, bounded retention/usage time series, and documented owner-assured observed reboots. Never mark a missing source live.

## Direct GitHub peer handoffs

- Hub producer + Windows boot: https://github.com/RosevearCreations/rosevear-ai-hub/issues/825
- Comms statistics: https://github.com/RosevearCreations/rosevear-comms-hub/issues/967
- YW tenant-safe aggregates: https://github.com/RosevearCreations/yw/issues/846
- iCamp tenant-safe aggregates: https://github.com/RosevearCreations/iCamp/issues/645
- Rosie booking/quote workflow: https://github.com/RosevearCreations/rosiedazzlers/issues/1136
- Devil store/content workflow: https://github.com/RosevearCreations/devilndove-site/issues/970

## Independent scorecard re-baseline

Previous Build 364 73% was a source feature planning estimate with a different denominator, not measured runtime. The owner's requested independent re-audit produces **61% weighted operating completeness** across 20 Hub-specific in-scope categories, and **18% physical field acceptance** as expert estimates pending host evidence. The 26 example original business categories receive explicit 0–100 Hub-native scores in the separate owner Word report; payroll/tax/storefront/advertising are delegated to other apps and excluded from Hub weighted denominator. Source CI success neither increases field acceptance nor authorizes automatic services. Future 5–10-point growth is an earned source-feature target, never a forced display increase.

## Strict future acceptance

1. Actual Windows reboot and pre-login HTTPS + HA/MQTT/camera recovered while locked, independently signed witness, protected backup and rollback.
2. Each Master installed by approved owner and corroborated exact named service plus mTLS signed ACK, 24h+ continuity and independent off-host durable readback.
3. Seven genuine live signer-enrolled stats sources accepted at the top AI Data Platform, non-sensitive aggregates, no tenant leakage, replay protection and auditable time-series accuracy.
4. Comms QL-340C incident remains OPEN and receiver activation UNAUTHORIZED until a distinct physical OFF attestation and owner authority procedure.
5. Tablet/mobile/contrast/keyboard/theme review and cross-app per-role authorization.

**Next proposed Build 366:** durable seven-app statistic receipt journal, real peer transport adapters and original-host Sysop event timeline, with independently reviewed activation gates. All actual live actions remain owner supervised.
