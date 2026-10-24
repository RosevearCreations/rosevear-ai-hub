# Build 128 — Disposable Document Pipeline & Integrity Preparation

**Source release only; real vault and document intake remain on SECURITY HOLD.** We selected the browser's built-in W3C Web Crypto AES-256-GCM strictly for disposable test fixtures in Build 126. Build 128 applies that same limited approval to **invented in-memory bytes**, not real PDFs, images, certificates, passwords or household files. No new cryptographic package is authorized.

## Implemented boundary

- `apps/web/src/vaultSyntheticDocumentPipeline.test.ts` contains the *entire* test-only encryption/decryption helper. It uses Node's W3C-compatible `crypto.subtle`, only in Vitest. **No test helper is imported into shipped client code.**
- Generated AES-256-GCM keys are non-exportable, never derived from a password or saved. Synthetic buffers have a **4096-byte test ceiling**, are split into 64-byte test chunks, and are encrypted independently with randomly generated 96-bit IVs and 128-bit tags. These are harness limits, **not recommendations for production document sizes or stream design**.
- Each chunk's authenticated associated data binds an invented owner ID, document ID, revision, random 128-bit envelope identifier, declared total length, declared chunk count and the chunk's ordered index. Checks require every declared part, reject extra or missing parts, and validate the length after authentication.
- The test-only `SyntheticSource` selector rejects `EXTERNAL_DOCUMENT`. **This is only a test guard, not a live security boundary**: no real file input path is implemented at all.
- `apps/web/src/vaultDocumentPreparation.ts` is static read-only policy; `VaultArchitectureView.tsx` displays six isolated handling boundaries and five failure scenarios, with circled-i explanations and an unconditional HOLD state.

## Synthetic negative-evidence matrix

| Synthetic mutation | Expected source-test result |
| --- | --- |
| Correct ephemeral key and invented multi-chunk byte array | Round-trip succeeds in test runner only |
| Altered ciphertext, tag or IV | Authenticated decryption fails |
| Wrong dummy owner, document, revision or ephemeral key | Authenticated decryption fails |
| Other envelope identifier or one chunk spliced from another envelope | Authenticated decryption fails |
| Dropped, extra, duplicated, reordered or truncated chunk | Completeness/order/authentication fails |
| Changed declared total length or chunk count | Header/associated-data check fails |
| Real-document source flag, zero or oversized invented buffer | Test-only admission fails |
| Reuse intact earlier encrypted envelope and original metadata | **Still decrypts:** AEAD is not a version ledger or anti-rollback protocol |

## What remains unapproved

1. **File admission:** decide allowlisted formats and limits; evaluate extension, declared MIME and file signature together. They do not establish safety. Design scanning, content disarm/reconstruction for applicable formats, decompression and denial-of-service limits, and malware reporting. No antivirus or parser runs in this build.
2. **No active preview:** avoid inline rendering untrusted HTML/SVG/PDF within the Hub origin; separately review sandboxed, verified rendering and forced safe download before use.
3. **Identity/cryptography:** choose reviewed production key derivation, per-person authority, protected encrypted metadata, key envelopes, fresh IV lifecycle, streamed/large-file handling and authentic manifest/commit protocol. Test success does not approve production key management.
4. **Rollback and concurrency:** separate trusted monotonic version evidence must reject a complete, older but valid envelope; authenticated encryption by itself cannot do this. Review atomic publish, concurrent writers, crash consistency and recovery.
5. **Storage and backups:** design vault-only Windows service account and ACL, encrypted offline backups, independent restoration, quotas, safe deletion/revocation and no plaintext spill to logs, AI, Knowledge, browser storage, temp directories, thumbnails, previews or telemetry.
6. **Acceptance:** independent cryptography, malicious-document and application security review; owner-approved disposable-account pilot on the actual Windows server; verified private HTTPS/Tailscale boundaries, restart/restore and clear owner acceptance. Until then all real document upload, preview, download, API and storage remain disabled.

## References (primary guidance)

- [W3C Web Cryptography Level 2](https://www.w3.org/TR/webcrypto/) — AES-GCM tag, IV and authenticated additional data handling.
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) — file-type checks, size limits, safe storage and content treatment.
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) — bounded allowlist validation.
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html) — reviewed authenticated encryption and key management.
- [Build 127 isolated service and identity boundary](BUILD_127_VAULT_SERVICE_IDENTITY_BOUNDARY.md), [Build 126 encryption harness](BUILD_126_SYNTHETIC_CRYPTO_TAMPER.md), [Build 125 threat and crypto review](BUILD_125_VAULT_THREAT_CRYPTO_REVIEW.md).
