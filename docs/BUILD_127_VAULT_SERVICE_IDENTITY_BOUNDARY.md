# Build 127 — Isolated Vault Service & Identity Boundary Preview

**Source release only:** The Hub now displays the proposed boundaries for an independent household password/document vault. This is **not** an installed vault service, login system or WebAuthn implementation. The five service boundaries, actors, operations and denial cases are policy evidence, not authorization to store secrets. Installed Windows security is **HOLD**.

## Why this remains separate from Rosevear AI Hub

1. **HTTPS origin:** choose, independently verify and pin a vault-only private HTTPS hostname with its own WebAuthn RP ID. Do not reuse the Hub origin, its session cookie, Caddy wildcard or public port forwards.
2. **Family identities:** the future vault authenticates each member independently; Hub owner/admin/household status grants no vault rights. MFA, locked sessions, backup device and recovery must have separate review.
3. **Windows isolation:** separate process identity, restricted ACL, own resource budget, and test that HA, MQTT, cameras, Ollama, Hub API, logs and backups cannot read vault decryption keys or plaintext.
4. **Encrypted store:** future service handles owner-scoped ciphertext and authorization only; master keys and decrypted records do not enter the Hub or server logs. Sharing must be cryptographically reviewed and revocation must address old decryption keys.
5. **Recovery and audits:** no administrator backdoor. Require independently held encrypted backups, witnessable restore checks and an audit ledger that excludes private titles and plaintext.

## Fail-closed simulation implemented now

- `apps/web/src/vaultServiceBoundary.ts` is a pure data/policy model; it **never calls** a network endpoint, filesystem, browser storage, cryptography, cookie, or authentication provider.
- All actions (`READ`, `WRITE`, `SHARE`, `EXPORT`, `UNLOCK`, `ENROLL_MFA`, `RECOVER`) are **DENY** for every hypothetical actor, even if forged inputs claim a trusted origin, separate login, valid MFA and owner consent.
- `vaultServiceBoundary.test.ts` checks 35 denial combinations and the six negative acceptance scenarios; passing tests do not certify a future service because no service exists.
- `VaultArchitectureView.tsx` presents static requirements and circled-i help. No login, document input, encryption key, operation button, shortcut or API route is exposed.

## Stop conditions before any real implementation

- Explicitly review and choose the private HTTPS origin/RP ID, source of identity and WebAuthn verifier/library versions, role/sharing rules, encrypted storage layout, service access account/ACL and Windows crash/reboot behavior.
- Complete P0 threat review, independent cryptographic and application security audit, negative auth/CSRF/cross-owner testing, privacy/backup review, and owner-observed Windows field acceptance with disposable accounts.
- Hold the real password/document vault until a separate, written owner approval based on successful evidence. GitHub CI GREEN is only source assurance.

## Sources

- [W3C WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/) — relying-party/origin-bound authentication.
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) — independent identity and login controls.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — deny-by-default permission model.
- [Build 125 threat review](BUILD_125_VAULT_THREAT_CRYPTO_REVIEW.md) and [Build 126 disposable encryption tests](BUILD_126_SYNTHETIC_CRYPTO_TAMPER.md).
