# Build 125 — First-Party Vault Threat Model & Cryptographic Library Review

**Status:** REVIEW-ONLY, NO LIVE VAULT. **Owner's chosen product:** our own application hosted locally on the household Windows computer. **External password-vault hosting:** none. **Cryptographic library selection:** not yet approved. **Independent security audit:** not performed. **Production credential/document security:** HOLD.

This follows Build 124's explicit first-party direction. It is an **architecture threat model and evidence matrix**, not a claim that our Windows host, browser or homemade application is secure. Nothing here installs a keeper, introduces a vault API or database, creates encryption keys, requests real passwords, uploads private documents, registers passkeys or opens router ports. Never paste keys, passwords, recovery codes, authentication seeds or private files in GitHub or AI chat.

## Protected assets and trust boundaries

1. **Vault client:** the only future process permitted to temporarily decrypt household passwords and private files after independent vault login and unlock. Treat an unlocked client as a privileged surface: browser extensions, clipboard managers, screen capture, malware and memory compromise can defeat encryption while content is open.
2. **Local vault service:** isolated Windows process/account and restricted storage, responsible for authenticated ciphertext transport, authorization, quota and audit metadata. It must not hold the master passphrase, unwrap data keys, preview documents or trust Hub admin cookies.
3. **Encrypted local store:** per-owner records, file parts and metadata, authenticated with owner/record/version binding and explicit sharing permissions. Server-visible IDs, file sizes, timestamps and access patterns can still reveal metadata; decide what may be visible before implementation.
4. **Private HTTPS origin:** separately verified name, certificate and WebAuthn RP ID, Caddy route and narrow LAN/Tailscale firewall. No public forwarding, cross-app session reuse, Hub iframe, decrypted proxy or cloud synchronization.
5. **Offline recovery:** encrypted backup with integrity-tested manifest for every document and entry, separately held recovery key and restore to an isolated location. A lost master key must not silently turn a Hub administrator into a decryption authority.
6. **Untrusted neighboring systems:** Hub Knowledge/AI/Ollama, Home Assistant, MQTT, cameras, logs, diagnostics, integration Secrets, search, telemetry, GitHub Actions and ordinary device backups have **no access** to plaintext or key material.

## Threat model: STRIDE + operational attacks

| Threat | Plausible attack | Mandatory mitigation / review evidence | Negative acceptance test |
| --- | --- | --- | --- |
| Spoofing | Stolen Hub owner session or phishing site impersonates a vault user | Separate vault identity/unlock, strict HTTPS origin and WebAuthn RP ID, backup factor | Reject wrong origin, absent factor and stolen Hub cookie |
| Tampering | Attacker swaps, replays, truncates or rearranges ciphertext/file chunks and labels | Versioned authenticated encryption, owner/item/version/chunk bound AAD, authenticated manifest and rollback policy | Reject modified item, wrong AAD, truncated stream, reordered chunk, malicious rollback |
| Repudiation | Unwanted share or export leaves no accountable trace | Redacted event ledger of actor, action, outcome/time; no filenames, secrets or vault tokens | Denied share/export traceable but cannot leak its content |
| Information disclosure | Lost Windows PC, stolen backup, browser malware, logs or AI search reveals credentials | Client-side decrypt only, no AI/export/preview proxy, short lock, restricted sessions, encrypted offline backups | Server theft cannot directly decrypt; locked client and Hub logs contain no secrets |
| Denial of service | Giant file, corrupt encrypted payload, ZIP/PDF bombs or login guessing exhausts home PC | Quota and file-size policy, bounded streaming, safe preview, rate limits and resource isolation | Inputs exceeding caps rejected safely; no Hub/HA/camera outage |
| Elevation of privilege | Viewer, family member or Hub admin escalates into another person's vault | Independent account authorization, client-held keys, explicit sharing and revocation | Unauthorized grant, removed share, revoked session and Hub role promotion fail |
| Recovery failure | Lost key, ransomware, disk corruption or tampered offline backup | Two factors, separately held recovery, encrypted immutable copies, tested complete file manifest | Wrong key and corrupt restore fail; no magic admin backdoor |
| Supply-chain/first-party defects | Our custom UI, dependency or update leaks an unlocked key | Version pinning and provenance, dependency review, CSP/XSS testing, external security assessment, staged rollout | Malicious/unsigned dependency blocks rollout; CI cannot attest external audit |

Attack priorities: **P0** = master-key/plaintext compromise, cross-member disclosure, MFA/recovery bypass or unauthenticated server access; **P1** = document parser abuse, denial of service, missing rollback detection or unverified backup restore. Any P0 or unresolved P1 fails production acceptance.

## Cryptographic library and standards shortlist — no selection yet

| Candidate | Why it is under consideration | Critical limitations and evidence required | Current decision |
| --- | --- | --- | --- |
| Browser `SubtleCrypto` AES-256-GCM | W3C-specified authenticated encryption, available in modern secure-context browsers without our own cipher code | Design and independently review fresh IV/nonce uniqueness per key, versioned key envelopes, non-exportable key limits, AAD context binding, replay and rotation. Not a streaming file API. | Candidate only |
| Argon2id using a maintained, independently reviewed implementation | RFC 9106 memory-hard passphrase KDF for deriving a vault-unlock key; stronger offline-guessing resistance than fast hashes | Browser Web Crypto does not supply Argon2id. Inspect audited library source, license, WASM/native provenance, Windows/mobile availability, parameter bounds, timing/memory and update security. RFC 9106 notes 64 MiB/3 passes as an option for memory-constrained environments; **calibrate on real devices**, don't hard-code blindly. | Candidate only |
| libsodium `crypto_secretstream_xchacha20poly1305_*` | Documented authenticated streaming primitive with end-of-stream semantics suitable for file encryption | Inspect browser/Windows wrappers and maintenance, header/chunk/tag handling, authenticated manifest, final tag, limits, atomic writes, streaming memory and file-version migration. Do not assemble homemade block-encryption chunks. | Candidate only |
| W3C WebAuthn/FIDO2 with reviewed server verifier | Origin-bound phishing-resistant authentication for the dedicated local HTTPS vault client | We must select an independently maintained verifier and test challenge freshness, origin/RP ID/user verification, replay, revocation, backup factors and safe recovery. A valid Hub login is not a vault MFA assertion. | Candidate only |

These are **library/standard candidates, not dependencies installed by Build 125**. Choosing our own application does not require trusting a cloud vault provider, but it does require reviewing our cryptographic dependencies. We still need an explicit library/version/license/security-history decision, a threat-model sign-off and an independent implementation assessment.

## Seven unresolved design decisions

1. **Client security:** Windows desktop, browser and phone requirements, extension policy, lock/clipboard behavior and secure local file previews.
2. **Passphrase KDF:** reviewed Argon2id binding, signed/provenance-verifiable binaries, parameter calibration under actual device resource budget, migration and versioning.
3. **Key/record envelope:** distinct randomly generated per-member data keys, wrapping/unwrapping model, AAD, nonce discipline, authenticated owner/version/record binding and explicit share/revoke rekeying. Detail how rollback attacks are detected beyond AEAD integrity.
4. **Document pipeline:** encrypted bytes and sensitive metadata, safe preview renderer, extension/MIME policy, bounded size, chunk integrity and authenticated backup manifest, including wrong-key and truncated-file cases.
5. **MFA and recovery:** independent hardware key/passkey per person, backup factor, rate limiting, deliberate incident recovery and separate offline key custody, without a universal administrator bypass.
6. **Windows and network isolation:** vault-only process identity and ACL, firewall scope, Caddy HTTPS origin, LAN and Tailscale acceptance, patch strategy, reboot order and non-interference with Home Assistant/Hub.
7. **Independent review:** security reviewer, scope, negative/fuzz/abuse tests, dependency audit, remediation evidence, disposable-data rollout and signed owner acceptance before live storage.

## Build 125 implementation and tests

- `apps/web/src/vaultThreatCryptoReview.ts` is a read-only model of four trust boundaries, eight threats/mandatory denial tests, four shortlisted primitives and seven still-unapproved decisions.
- `assessVaultThreatCryptoReview()` reports `FIRST_PARTY_LOCAL`, `HOLD`, `DENY`, disabled credential intake, disabled uploads, no chosen library, no audit, no installation and no actual MFA **regardless of forged completed reviews**.
- The signed-in Vault UI presents threat and crypto candidates, denial tests, circled-i security help and the security hold. It introduces no fields, upload controls, storage, network calls or activity in the Windows services.
- `vaultThreatCryptoReview.test.ts` and the UI tests verify coverage and fail-closed behavior. Passing test/CI results cannot certify a secure encryption implementation which does not yet exist.

## Forward release gates

- **Build 126:** Disposable-data encryption/tamper harness **only after** selecting reviewed library versions and preserving isolated test boundaries. No actual passwords/files.
- **Builds 127–129:** Private service, identity and MFA, document handling, lock/backup/restore — independently reviewed and tested under negative scenarios, not automatically active.
- **Build 130:** External security review findings closed; owner-supervised Windows reboot, private network, backup restore and abuse acceptance. Production security HOLD can be considered for release only through a separate explicit approval, never just a source-CI GREEN result.

## Primary review references

- [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html) (STRIDE prompts and process)
- [W3C Web Cryptography API](https://www.w3.org/TR/webcrypto-1/) (AES-GCM and key API)
- [RFC 9106](https://www.rfc-editor.org/rfc/rfc9106) (Argon2id design and parameter trade-offs)
- [libsodium `secretstream`](https://doc.libsodium.org/secret-key_cryptography/secretstream) (authenticated file streaming)
- [W3C WebAuthn](https://www.w3.org/TR/webauthn-3/) (origin-scoped authenticators)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) (untrusted file processing)
- [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html) (authenticator management)

**Never interpret `main` Production GREEN as installed Windows vault security GREEN.** No real vault data is permitted until an independent review and witnessed acceptance explicitly close the hold.
