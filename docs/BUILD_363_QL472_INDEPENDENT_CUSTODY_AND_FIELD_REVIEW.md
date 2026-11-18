# Rosevear AI Hub Build 363 / QL-472 — Independent Anchor, Original-Host Drill Correlation and Master Pilot Review

## Safety and source-of-truth baseline

Build 362 / QL-471 is verified source GREEN at protected main commit 0540fbed756067b06180832ed203e7353cfdf098; its main-push workflow 44310526631 completed successfully. Source GREEN does **not** prove original Windows host DESKTOP-AE894KC uninterrupted service or actual pre-login recovery. Home Assistant remains a VirtualBox guest on the original host; the last independently shared host evidence has both unattended Hub tasks installed but DISABLED. The QL-340C private Comms TEST receiver is not authorized for activation, and its real-time OFF state still needs separate independent original-host readback.

## What Build 363 adds

1. A read-only independent custodian Ed25519 package verifier that binds a QL-471 ledger's full canonical SHA-256, last chain hash, event count, exact source commit and original host. It requires a trusted Ed25519 public-key fingerprint obtained independently, a key different from all event scope signers, and a recently signed detached signature. An independently signed custodian *statement* is verified, but off-host storage remains UNVERIFIED unless separately audited. The Hub will not create a custodian signature or secret key.
2. An original-host corroboration function requiring a fresh, strictly checked unsigned QL-470 Windows telemetry sample and prior QL-471 independently signed BEFORE and AFTER claims that straddle its Windows boot timestamp. This is **chronological correlation only**, not proof of real pre-login operation, HA/mTLS device authentication, or 24/7 continuity.
3. Explicit independent AI Data Platform and Comms Hub worker-review escalations; both remain NOT AUTHORIZED for installation or automatic startup. Missing signed worker claims and missing independent anchors produce separate HOLD reasons. Signed statements do not substitute for live peer ACK, operator installation authority or a rollback exercise.
4. Original-host owner-only GET endpoint /api/v1/system/server-shell-363 reading only server-configured protected local files; no browser upload or worker/service mutations. Integrated evidence cards inside the existing System → QL-471/QL-472 acceptance dashboard.
5. Negative tests for forged/tampered/stale anchors, source mismatch, wrong trust pins, off-host calls, boot chronology and fake worker approvals.

## Required privately held documents (not added to GitHub)

- Existing QL-471 ledger summary JSON from Build 362.
- A separate custodian public Ed25519 key in PEM format. Keep its SHA-256(raw Ed25519 public key) fingerprint in the server environment **only after independently checking it with that custodian**. This key must NOT be any previously used QL-471 scope signer.
- A signed anchor package JSON, maximum 8 KiB, containing *exactly* payload and signature (base64). The payload contains exactly:
  - schema: rosevear.hub.ql472.independent-anchor363.v1
  - originalHost: DESKTOP-AE894KC
  - sourceCommit: installed original-PC 40-digit lowercase hex commit
  - ledgerSha256: SHA-256 of canonical sorted compact ASCII JSON of the **complete existing ledger**
  - ledgerHeadSha256: last QL-471 event sha256
  - ledgerCount: number of QL-471 events (nonzero)
  - custodianRole: independent-evidence-custodian
  - custodianPin: externally established 64-digit lowercase hex key fingerprint
  - nonce: unique 32-digit lowercase hex
  - issuedAt: UTC ISO-8601 Z, within seven days and after all ledger events
  - offHostCopyClaimed: true (claim only)
  - workerPilotAuthorized: false
  - receiverActivationAuthorized: false
  - physicalRuntimeIndependentlyVerified: false
- Detached signature is Ed25519 over canonical sorted compact ASCII JSON of payload, then base64 encoded.

This authenticates the **custodian's statement**. It cannot independently prove a copy is durable at another site, that the signing computer was off host, that an actual reboot happened, or that a peer is connected. For durable independent custody, retain the full ledger in a real independent off-host vault and obtain a separate audited readback of the exact digest. This build does not fetch network storage or blindly trust a URL.

## Original-host server configuration

Set original-PC private environment variables (not in GitHub or browser):

- ROSEVEAR_QL472_EXPECTED_COMMIT: exact locally installed 40-digit source commit, independently checked after adoption
- ROSEVEAR_QL471_LEDGER_PATH: absolute protected QL-471 signed-at-intake local ledger path
- ROSEVEAR_QL472_ANCHOR_PACKAGE_PATH: protected signed anchor envelope JSON path
- ROSEVEAR_QL472_CUSTODIAN_PUBLIC_KEY_PATH: protected custodian public PEM file path
- ROSEVEAR_QL472_CUSTODIAN_PUBLIC_PIN: independently trusted SHA-256 fingerprint
- ROSEVEAR_QL470_TELEMETRY_PATH: optional fresh (under 120 seconds) local unsigned Windows recovery inventory

The endpoint is original-host-only and owner-only, GET-only and no-store. It outputs explicit HOLDs for missing private data, stale evidence, wrong host/pin, invalid history and uncorroborated boot. There is no automatic file reader/poller, installer, Windows task creation, restart, service enable, key rotation, receiver enable or physical-device operation.

## Real deployment acceptance still outstanding

- Independently confirm original-PC backup and a restorable Home Assistant VirtualBox VM.
- Independently inspect the two existing Windows tasks and decide separately whether to enable and run a supervised test; this build does not do so.
- Independently witness a real reboot and recover HTTPS before a user signs in, with trusted timed evidence.
- Authenticated Home Assistant, MQTT ACK and camera playback, plus actual off-machine backup readback.
- Peer-by-peer independent service signer, exact installer/identity/version, owner approval, pinned mTLS, signed durable ACK and rollback.
- Receiver QL-340C remains unauthorized. Signed source data never activates it.

**Future candidate:** Build 364 / QL-473 — Independently Witnessed Off-Host Anchor Readback, Live Three-Master Pilot Validation and Cross-Module Acceptance Evidence. This proposal is subject to review; actual activation remains gated.
