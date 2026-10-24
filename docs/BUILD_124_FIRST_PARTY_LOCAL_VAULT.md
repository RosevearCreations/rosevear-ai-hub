# Build 124 — First-Party Local Password & Document Vault Blueprint

**Source implementation:** read-only first-party vault blueprint. **Actual vault:** NOT BUILT OR INSTALLED. **Production security:** HOLD. **Owner direction:** We build and own the vault application, with encrypted data residing on the household Windows server, without subscribing to or exposing content to a third-party password-vault hosting provider.

## Owner decision recorded on October 24, 2026

The owner explicitly chose a self-developed, locally operated **password and private-document vault** rather than a third-party password manager. This supersedes the vendor comparison in Build 123, but **does not constitute permission to deploy an unreviewed cryptographic service or migrate any real passwords or documents**. Hosting locally removes an external vendor/operator dependency, but the Windows PC, browsers, router, backup media, software dependencies and our own implementation can still be attacked.

Use standard, maintained and independently reviewed cryptographic and authentication libraries, not homemade encryption algorithms. First-party application code and local data custody do not require us to invent cryptography. A professional security review remains a prerequisite for production use.

## Planned trust boundaries

| Component | Planned responsibility | Must never access |
| --- | --- | --- |
| Dedicated vault browser/desktop client | Separate login/unlock, cryptographic operations, individual item and file access, idle lock | Hub session-derived auto-unlock, AI prompts/Knowledge indexing |
| Isolated local vault service | Authenticate authorized requests, enforce account/sharing boundaries, persist only ciphertext and minimal sealed metadata | Master passphrase, derived data keys, decrypted passwords/documents |
| Dedicated encrypted volume on Windows | Ciphertext store, integrity-checked manifests and separately owned service ACLs | Hub DB/process identity and existing integration `SECRET_ENCRYPTION_KEY` |
| Private HTTPS origin (Caddy + LAN/restricted Tailscale) | Separate vault security origin with explicit device allowlist | Public router forwarding, shared Hub cookies, Hub proxy, untrusted iframe |
| Offline encrypted backup | Recover entries **and attachments** into isolated test environment with independent key custody | Plaintext export, unencrypted cloud sync, backup copy holding its own recovery key |

## Initial record types

1. **Personal and explicitly shared login entries:** account name/URL, usernames, passwords, optional secure notes, version/tombstone, per-item authorization. Private by default and never indexed by Hub search.
2. **Secure notes:** personal emergency instructions and private information, encrypted like login entries, distinct from ordinary Knowledge notes.
3. **Private documents:** passports/identity scans, PDFs, household records and other selected attachments. Encrypt file contents **and sensitive names/tags** before saving; authenticate every encrypted object/chunk and bind it to the right owner and manifest. Plan bounded size/quotas, quarantined uploads, safe previews, content-type validation, no filesystem execution and no metadata indexing into Hub.

Actual fields, item sharing design, cryptographic envelope/versioning, sizes and limits are **not approved** in this release. No database migration, vault endpoint, client encryption engine, WebAuthn enrollment, uploaded file, plaintext editor or Windows process was added.

## Future cryptographic/security design decisions (not yet code)

- Client-side authenticated encryption, e.g. reviewed AES-256-GCM library/platform primitive with a rigorously reviewed nonce/key protocol; never roll our own cipher, mode or key envelope.
- Cryptographically secure random per-vault data keys; a reviewed memory-hard passphrase KDF such as Argon2id with calibrated parameters and unique salts; authenticated wrapping/rotation. Avoid weakening unlock to the existing Hub session.
- Per-household-member vault identity, explicit sharing grant and revocation semantics; independently enforced WebAuthn/FIDO2 on a verified vault origin with a backup authenticator and emergency recovery.
- Separate encrypted file chunk authentication, bounded retries and locked-client behavior; no exposed plaintext on Hub backend, AI calls, audit logs, telemetry, crash dumps, thumbnail service or file preview cache.
- Offline encrypted backup of ciphertext **and documents**, restore with wrong-key rejection, version migration, tamper tests and unavailable-server drills. No silent sync to an external provider.
- Windows service isolation, patching, process ACL and malware protection, local reverse-proxy/firewall verification, leak/XSS/content injection tests, owner approval and on-device witnessed field acceptance.

## Fail-closed implementation included in Build 124

- `apps/web/src/localVaultBlueprint.ts` describes three proposed record classes, eight review gates, attack risks and `FIRST_PARTY_LOCAL` owner direction.
- `assessLocalVaultBlueprint` never activates vault storage, document upload, API, client unlock or real MFA. Even a forged complete checklist returns `DENY` and `HOLD`.
- The authenticated Vault page now prioritizes the first-party decision with circled-i help, records and risks. The former Build 123 provider candidates no longer appear as current choices.
- `localVaultBlueprint.test.ts` and the updated view tests prevent false activation and password/file-entry UI regressions.

## Next staged builds (proposed)

1. **Build 125 — Threat Model, Architecture Decision & Cryptography Library Review.** Obtain consent on private versus household sharing model, Windows resources, identity recovery, file categories and sizes, audited libraries, key envelope and independent review scope. No real data.
2. **Build 126 — Disposable-Data Encryption & Tamper Test Harness.** Isolated client-side reference prototype with synthetic secrets/files only, encrypted data fixtures, wrong-key/nonce/tamper tests, no actual vault route. Require external review before any persistence.
3. **Build 127 — Isolated Service, Roles & MFA Prototype.** Build dedicated network process and signed-in client within private test origin; disposable identities, WebAuthn negative tests, fail-closed authorization.
4. **Build 128 — Private Document Storage & Safe Previews.** Synthetic encrypted attachments, bounded chunk handling, safe downloads, content validation, quotas, and denial tests for AI/Knowledge integration.
5. **Build 129 — Client Lock, Recovery & Encrypted Offline Backup.** Offline restore including attachments, separate key custody, device loss and key rotation drills.
6. **Build 130 — Independent Security Review & Windows Owner Acceptance.** Address review findings, reproduce attacks, confirm LAN/Tailscale isolation, Windows reboot and backup restore. Only a later explicit owner approval can lift the live-data HOLD.

## Reference standards for security review

- [NIST SP 800-63B — Authentication and Authenticator Management](https://pages.nist.gov/800-63-4/sp800-63b.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)

**Evidence boundary:** GitHub `main` CI GREEN means the reviewed *source release checks* passed. It does not mean a live vault exists, hardware MFA is active, real content is encrypted, or Windows owner acceptance has occurred. Live data and field acceptance remain on HOLD.
