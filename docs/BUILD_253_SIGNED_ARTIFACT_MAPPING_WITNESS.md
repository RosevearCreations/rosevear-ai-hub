# Build 253 — Signed Artifact-Kind Manifest, Independent Windows Mapping Witness & Supervised Process-Attestation Review

## Purpose and exact boundaries

The Build 250 signed release receipt binds a release commit and one SHA-256, but not its artifact *kind*. Build 251 supplies only an untrusted, read-only digest of `apps/web/dist/index.html`. Build 253 introduces two separately verified, externally issued Ed25519 signatures:

1. **Artifact-kind manifest**: signed by the *same* previously authenticated Build 250 receipt key. It binds the exact release SHA, `web_index_html` artifact kind, fixed relative path `apps/web/dist/index.html`, SHA-256 and observation time. The browser also requires the Build 250 signature candidate to have passed independently pinned key verification; a signature from a different key cannot silently replace it.
2. **Independent mapping witness**: a separately authenticated person/key custodian signs an exact, classified on-host observation with a *different* Ed25519 key. The witness key SHA-256 fingerprint must come from an out-of-band verified channel, never from the signed file itself. The app verifies both signatures locally and requires exact agreement with the Windows observation.

Both proofs remain **candidates only**, never automatic signer enrollment, binary/process attestation, installed production authorization, recovery permission or owner closure.

## Owner-supervised procedure

1. Open the Hub System workspace, Build 249 → 250 → 251 → 253. Verify the Build 250 signed receipt with its separately authenticated signer-key SHA-256 fingerprint.
2. Import a signed Build 253 artifact-kind manifest (maximum 8 KB). Verify its detached signature in the browser. The manifest's public key, release SHA, artifact SHA-256 and age must exactly match the verified source receipt and expected main. The manifest is issued by a real external custodian; this app does not generate signatures or keys.
3. On the actual Windows Hub, in the installed checkout, run:

   ```powershell
   powershell.exe -NoProfile -File .\scripts\inspect-hub-mapping-253.ps1
   ```

   Save the one-line JSON as a **local** file. The inspector only invokes the existing read-only Build 251 hash and Build 249 process/task classifiers. It strips raw paths, command lines and PIDs and hard-codes `witness_verified=false`, `process_attested=false`, `changes_made=false`.
4. Have a **different independently authenticated witness** personally check the actual Windows computer and issue an Ed25519 signed witness receipt with the exact fields below. Authenticate their 32-byte raw public key SHA-256 fingerprint separately. Import the signed receipt and enter that fingerprint in Build 253; verify locally.
5. Compare the on-device artifact hash, listener ownership classification, checkout-path relationship, post-boot status and recovery task action with the witness receipt. Keep **SUPERVISED_PROCESS_ATTESTATION_HOLD** even if all candidate checks pass. Real process binary identity, task custody, owner/device retest and recovery authorization still require independent field evidence and supervised approval.

## Signed JSON schemas and canonical UTF-8 messages

All three files are bounded to 8 KB, carry UTC timestamps, reject alternate artifact kinds/paths and discard extra fields. The two signatures use raw Ed25519 public keys (base64, 32 bytes) and detached 64-byte Ed25519 signatures (base64). **Each canonical message ends with a newline.** No JSON serialization or field sorting is signed.

Artifact manifest schema `rosevear-windows-artifact-kind-manifest-253/v1` fields:

- `schema`, `release_sha`, `artifact_kind` (`web_index_html`), `relative_path` (`apps/web/dist/index.html`), `artifact_sha256`, `observed_at`, `signer_public_key_raw_base64`, `signature_base64`.
- Canonical lines, in order: `schema`, `release_sha`, `artifact_kind`, `relative_path`, `artifact_sha256`, `observed_at`, terminal empty line.

Windows observation schema `rosevear-windows-mapping-observation-253/v1` fields:

- `schema`, `source=on_device_read_only`, `observed_at`, fixed artifact kind/path, `exists`, `sha256`, `web` and `backend` (each has `listener`, `source_path`, `post_boot`), `recovery_action`, and the three mandatory false flags above.
- This file is **unsigned** local inspection data; it makes no attestation or identity claim.

Independent witness schema `rosevear-windows-mapping-witness-253/v1` fields:

- `schema`, `release_sha`, fixed `artifact_kind`/`relative_path`, `artifact_sha256`, `observed_at`, `web_listener`, `backend_listener`, `web_source_path`, `backend_source_path`, `web_post_boot`, `backend_post_boot`, `recovery_action`, `witness_public_key_raw_base64`, `signature_base64`.
- Canonical lines, in order: `schema`, `release_sha`, `artifact_kind`, `relative_path`, `artifact_sha256`, `observed_at`, `web_listener`, `backend_listener`, `web_source_path`, `backend_source_path`, `web_post_boot`, `backend_post_boot`, `recovery_action`, terminal empty line.

No signer, public key or fingerprint is automatically trusted or permanently stored. No Windows process, scheduled task, database, VPN, relay, cloud provider or device is changed by this build. Repository GitHub CI GREEN is **source verification only**, not proof of installed Windows source or post-reboot device acceptance.

## Next build

**Build 254 — CI Consolidation Phase II: Promotion Event Deduplication, Required-Check Equivalence & Queue-Time Budgeting.** First inventory which protected PR/push events can be replaced with equivalent immutable-commit evidence; do not drop security, Windows, migration or production checks without verified gate equivalence.
