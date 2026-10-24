# Build 126 — Disposable-Data Encryption & Tamper Test Harness

**Scope:** The owner approved the browser's standard Web Crypto AES-256-GCM for **test-only, invented, ephemeral fixtures**. This does **not** approve the vault's production key derivation, password/document storage, per-person authorization, recovery, MFA or installation. Live-vault security remains **HOLD**.

## What was implemented

- `apps/web/src/vaultSyntheticCryptoHarness.test.ts`: Node's W3C-compatible Web Crypto test runner uses only invented text and context, in volatile memory. Nothing is loaded from disks, server APIs or household accounts. Non-exportable keys are generated fresh within tests and never persisted, exported, logged or shipped as production code.
- AES-GCM has a unique randomly generated 96-bit IV for each encrypt operation, explicit 128-bit tags, and test-only authenticated metadata representing owner/item/version.
- `vaultSyntheticHarnessPolicy.ts`: pure, read-only client display model. A forged checklist cannot turn on live encryption, credentials, documents or MFA.
- Vault page displays five test expectations with circled-i help. It **does not execute cryptography** or show any fields that accept real data.

## Negative test matrix

| Test | Expected result |
| --- | --- |
| Fresh key + synthetic plaintext + correct AAD | Decrypts, only in the test runner |
| Bit-flipped ciphertext or authentication tag | Rejects |
| Truncated encrypted message | Rejects |
| Wrong IV or unrelated ephemeral key | Rejects |
| Changed synthetic owner/item/version AAD | Rejects |
| 32 independent encryptions | Random IVs are 12 bytes and pairwise distinct in this sample; not a formal uniqueness proof |
| Identical ciphertext and unchanged AAD replayed | **Decrypts again**: authenticated encryption alone cannot prevent replay/rollback |

## Not yet proven or implemented

- This Vitest run uses the standards-compatible Node Web Crypto API, **not a security certification of a particular Windows browser**. The owner must later test actual browser and Windows host behavior.
- No master-passphrase KDF or Argon2id dependency selected; no real key hierarchy, multi-tenant account rights, version ledger, vault origin or backup.
- Neither authenticated-encryption success nor green GitHub CI proves Windows security or privacy. An external audit, real browser tests, install/reboot acceptance, owner sign-off and encrypted restore verification remain prerequisite to any real password/document use.
- Do not adapt these disposable fixtures into production vault code without re-review. The test harness has no service endpoints, file operations, session integration, or storage.

## References

- [W3C Web Cryptography API](https://www.w3.org/TR/webcrypto-1/) — AES-GCM authenticated encryption and associated-data parameters.
- [W3C Web Cryptography Level 2](https://www.w3.org/TR/webcrypto/) — API specification and key-generation behavior.
- [NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38/d/final) — GCM/GMAC mode and nonce requirements.
- [Build 125 threat and library review](BUILD_125_VAULT_THREAT_CRYPTO_REVIEW.md) — unresolved production security decisions.
