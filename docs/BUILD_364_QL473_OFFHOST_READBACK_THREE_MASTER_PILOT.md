# Rosevear AI Hub — Build 364 / QL-473

## Independently witnessed off-host readback, three-Master pilot evidence and cross-module acceptance

**Pre-release baseline.** Build 363 / QL-472 code was green on protected `main` `1868df2e2c1b440f950f69bed20275588f7a905e`, successful independent push Actions run `44348916839`. None of this proves that the unattended Hub task, Home Assistant VirtualBox guest or three individual Windows workers actually recovered at the original host `DESKTOP-AE894KC`.

**This build is a source capability, not a remotely executed field drill.** It adds a read-only verifier for a ledger copy and a distinct custodian readback signature, three separate independently pinned master-worker signatures over one short-lived challenge, and an owner-only cross-module acceptance dashboard. All claims remain historical. There is **no live mTLS dial**, no installation/enable/rollback mutation, no remote worker authorization, no reboot, and no private QL-340C Comms receiver activation.

### 1. Independent copied-ledger readback

Original host must have a previously accepted Build 362 ledger and Build 363 signed anchor. Retrieve a **separately retained full ledger copy** using a verified independent off-host custody process; do not satisfy that test by copying the original file into a second local path. The verifier compares the canonical QL-471 ledger JSON byte-equivalent representation, validates its event chain, and binds the source ledger digest, last event hash, anchor payload hash, event count, original host and exact installed 40-character source commit.

Create a signed readback envelope JSON with exactly `payload` and `signature` keys. `payload` must have exactly: `schema` = `rosevear.hub.ql473.independent-readback364.v1`, `originalHost`, `sourceCommit`, `ledgerSha256`, `anchorPayloadSha256`, `ledgerHeadSha256`, `ledgerCount`, `readbackId`, `readbackAt` (UTC Z), `independentKeyFingerprint`, `offHostStorageReadbackClaimed` (true), `workerPilotAuthorized` (false), `receiverActivationAuthorized` (false). The Ed25519 detached signature must be base64 over sorted compact ASCII JSON of this payload. The signer key must be **different from the anchor custodian and every QL-471 claim signer**, with a fingerprint independently verified by our owner.

Valid signatures authenticate claims; they do **not** prove the copied bytes ever resided off the Windows PC, that storage is durable, or that any retrieval was actually independent. Preserve an independent audited copy location and separately observe the readback.

### 2. Three-Master signed pilot claims (read-only)

An independently supervised field operator may generate a one-use 32-character lowercase hex `challenge`, collect actual original-host process/mTLS/peer ACK/rollback observations and obtain separately enrolled Ed25519 signatures from the Hub, AI Data Platform and Comms Hub. The Hub itself generates **no private signer keys or synthetic field receipts**. Peer keys must be different from each other, from the readback signer, from the anchor signer and from the original QL-471 claim signers. All trusted pins come from a separate owner-approved channel, never blindly from the envelope.

The pilot envelope contains exactly `payload` and `signatures`. Its payload fields are `schema` = `rosevear.hub.ql473.three-master-pilot364.v1`, `originalHost`, `sourceCommit`, `challenge`, `drillId`, `observedAt`, `issuedAt`, `peerVersions`, `claimedBoundedMtls`, `claimedSignedPeerAcks`, `claimedRollbackReady`, `performedOnOriginalHostClaimed`, `automaticStartupAuthorized` = false, `ql340cReceiverAuthorized` = false. The four affirmative claim flags must be true and may be signed only on genuine field observation. The three peer version keys and three signature keys must match exactly `Rosevear-AIHub`, `Rosevear-AIDataPlatform`, `Rosevear-CommsHub`. Each independent key signs the **exact same canonical payload**, and the signed observation must be no older than 15 minutes at verification.

A verified envelope proves only that **three enrolled signers signed the same claims**. It does not independently prove there was a real live mTLS handshake, live remote ACK or successful rollback. No service is automatically started. Actual operator-controlled worker installation and rollback requires explicit separate owner/custodian approval.

### 3. Private original-PC configuration

The read-only owner GET `/api/v1/system/server-shell-364` reads configured local files only on Windows host `DESKTOP-AE894KC`. It will fail closed for missing, malformed, untrusted, stale and off-host evidence.

Required/reused server-only environment variables:

- `ROSEVEAR_QL473_EXPECTED_COMMIT`: exact installed source SHA (not blindly the GitHub SHA)
- `ROSEVEAR_QL471_LEDGER_PATH`: original private QL-471 ledger (existing)
- `ROSEVEAR_QL473_COPIED_LEDGER_PATH`: independently read back separate ledger file
- `ROSEVEAR_QL472_ANCHOR_PACKAGE_PATH`, `ROSEVEAR_QL472_CUSTODIAN_PUBLIC_KEY_PATH`, `ROSEVEAR_QL472_CUSTODIAN_PUBLIC_PIN`: existing independently trusted anchor
- `ROSEVEAR_QL473_READBACK_RECEIPT_PATH`, `ROSEVEAR_QL473_READBACK_PUBLIC_KEY_PATH`, `ROSEVEAR_QL473_READBACK_PUBLIC_PIN`: separately enrolled off-host readback witness
- `ROSEVEAR_QL473_PILOT_ENVELOPE_PATH`: private three-party receipt package
- `ROSEVEAR_QL473_PEER_HUB_PUBLIC_KEY_PATH`, `ROSEVEAR_QL473_PEER_HUB_PUBLIC_PIN`
- `ROSEVEAR_QL473_PEER_AIDP_PUBLIC_KEY_PATH`, `ROSEVEAR_QL473_PEER_AIDP_PUBLIC_PIN`
- `ROSEVEAR_QL473_PEER_COMMS_PUBLIC_KEY_PATH`, `ROSEVEAR_QL473_PEER_COMMS_PUBLIC_PIN`

Private keys, tokens, Windows credentials, device imagery, customer records and video footage must **not** go into the repo, environment dump or dashboard. The browser cannot choose paths or upload evidence. Signed receipts alone cannot change production authority. Readback from the same PC can validate bytes, but cannot establish the provenance of an off-host copy.

### 4. Feature completion: specific 5-point target, never invented

The last source-of-truth estimates were **68% feature coverage**, **25% verified field acceptance** and **53% weighted overall readiness**. See `docs/contracts/hub-feature-progress364.json`.

After complete dev, isolated main and merged protected main green CI, five additional **distinct source-level** milestones count for one indicative point each: copied-ledger chain/digest verification, independent readback custodian signature, three distinct signed peer claims, protected read-only original-host API, and cross-module UI with negative tests. Estimated source feature coverage becomes **73%** (+5 percentage points). This remains a planning score, **not a measured count of all application features**. Using the previously modeled 65% feature / 35% field weighting, 73% × 0.65 + 25% × 0.35 ≈ **56% overall** (+3 points); field acceptance remains 25% until independently witnessed.

**Ongoing target: +5 to +10 feature-coverage points per build**, only when separately implemented, tested, nonduplicative features justify it. Never automatically add points by build number; a build delivering fewer real capabilities must be reported at the correct lower number. Field and total readiness may increase more slowly.

### 5. Source vs physical acceptance

CI tests generate synthetic Ed25519 keys for verification only. Required gates are backend, web, docs foundation, Windows desktop, encrypted backup and CI budget, run on dev and isolated-main PRs and verified again on protected-main push. Actual original host still requires witnessed boot before login, authenticated Home Assistant/MQTT/camera recovery, separately verified backup/restoration, per-worker independently pinned live mTLS plus signed durable ACK and rollback, and a separately read original QL-340C receiver OFF signal.

**Next proposed Build 365 / QL-474:** Owner-witnessed readback/physical peer pilot field acceptance, independent rollback drills and real readiness metric reconciliation. No unapproved auto-activation.
