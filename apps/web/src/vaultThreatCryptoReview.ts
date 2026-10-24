/** Build 125: security-review evidence, never a cryptographic implementation. */
export const VAULT_THREAT_CRYPTO_REVIEW_SCHEMA = "rosevear-vault-threat-crypto-review/v1" as const;

export const vaultTrustBoundaries = [
  { id: "client", title: "Dedicated trusted vault client", detail: "Only the separately unlocked vault client may temporarily decrypt records and files. Compromised browser extensions or malware can still read unlocked content." },
  { id: "service", title: "Isolated Windows vault service", detail: "Authenticate requests, limit rates and store ciphertext. Never receive an unlocking passphrase, unwrapped data key, decrypted document or reusable Hub session." },
  { id: "storage", title: "Private encrypted data and metadata", detail: "Bind each record, document part, owner, version and manifest with authenticated data. File names and sensitive labels must not leak into server indexes." },
  { id: "recovery", title: "Offline recovery boundary", detail: "Encrypt exported archives, protect recovery keys separately and test restoration without overwriting live data or leaking into AI and logs." },
] as const;

export const vaultThreatScenarios = [
  { id: "spoofing", category: "Spoofing", attack: "Phished or stolen Hub session impersonates a household member.", protection: "Dedicated vault identity, origin-checked WebAuthn and separate vault unlock; Hub admin rights do not grant access.", negativeTest: "Wrong origin, stolen Hub cookie and missing factor cannot access ciphertext or plaintext." },
  { id: "tampering", category: "Tampering", attack: "Ciphertext, document chunk, metadata or backup manifest is substituted or reordered.", protection: "Reviewed authenticated-encryption format with associated data binding owner/item/version/chunk; manifest integrity and rollback policy.", negativeTest: "Modified, duplicated or reordered records/chunks and wrong authenticated metadata must fail verification." },
  { id: "repudiation", category: "Repudiation", attack: "A shared record is changed or downloaded without accountable operator evidence.", protection: "Minimal redacted access/change ledger with identity, action and timestamp but never item titles, URLs, plaintext or keys.", negativeTest: "Logs cannot disclose secrets; unauthorized change is denied and sanitized failure remains traceable." },
  { id: "disclosure", category: "Information disclosure", attack: "Server theft, unlocked browser, memory dump, preview cache, URL/log or AI indexing reveals confidential content.", protection: "Client-only decryption, isolated runtime, short lock, restricted clipboard, no previews/indexing in Hub, no secret-bearing logs.", negativeTest: "Stolen server/backup yields ciphertext; locked session, AI, Knowledge and diagnostic output contain no secret values." },
  { id: "denial", category: "Denial of service", attack: "Large encrypted files, decompression bombs, corrupt uploads or online guessing exhaust the Windows host.", protection: "Bounded encrypted attachment size, quotas, streaming constraints, request limits and independent service resource budgets.", negativeTest: "Oversized/corrupt inputs and repeated failed auth do not exhaust host services or unlock data." },
  { id: "privilege", category: "Elevation of privilege", attack: "Household viewer, shared collection user or Hub administrator escapes authorization to another personal vault.", protection: "Server-enforced per-member authorization plus client-held keys and explicit sharing grants; revoke sessions and cryptographic access separately.", negativeTest: "Role escalation, removed share and revoked device cannot read an ungranted record or document." },
  { id: "recovery_loss", category: "Recovery and ransomware", attack: "Lost hardware key, master key, disk failure, hostile restore or encrypted-backup theft causes disclosure or loss.", protection: "Two independent authenticators, separately held offline recovery, encrypted immutable backups and isolated integrity-checked restore drills.", negativeTest: "Wrong recovery key denies restore; absent key cannot trigger an admin bypass; complete file manifest must be restored." },
  { id: "supply_chain", category: "First-party/supply-chain defects", attack: "Our new code, imported dependency, malicious update or compromised workstation steals the vault unlock key.", protection: "Version-pinned maintained libraries, provenance and vulnerability review, signed builds, external assessment and staged rollout.", negativeTest: "Dependency/asset integrity failures block release; no source-CI check can claim an actual independent security audit." },
] as const;

export const vaultCryptoCandidates = [
  { id: "aead", title: "Browser Web Crypto AES-GCM", source: "W3C Web Cryptography API", role: "Potential client-side authenticated record encryption and key wrapping", decision: "CANDIDATE_ONLY" as const, risk: "Requires externally reviewed nonce uniqueness, additional-data, key rotation, serialization and rollback design. Non-exportable keys do not protect an already compromised client." },
  { id: "kdf", title: "Argon2id via independently reviewed library", source: "RFC 9106", role: "Potential memory-hard derivation for a local unlock key", decision: "CANDIDATE_ONLY" as const, risk: "Web Crypto alone does not provide Argon2id; select a maintained Windows/browser-compatible implementation, validate build integrity and calibrate cost on our actual devices." },
  { id: "files", title: "libsodium secretstream XChaCha20-Poly1305", source: "Official libsodium secretstream documentation", role: "Potential authenticated streaming encryption for private documents", decision: "CANDIDATE_ONLY" as const, risk: "Review audited bindings, client memory budget, chunk ordering, header authentication, file manifest and final-chunk verification. Do not compose our own streaming cipher." },
  { id: "mfa", title: "Standards-compliant WebAuthn/FIDO2", source: "W3C WebAuthn and NIST SP 800-63B", role: "Potential phishing-resistant authentication on a dedicated HTTPS vault origin", decision: "CANDIDATE_ONLY" as const, risk: "Review a maintained server verifier, strict RP ID/origin/challenge/user-verification rules and independent lost-factor recovery; Hub login cannot substitute." },
] as const;

export const vaultDesignDecisions = [
  { id: "client", question: "Which isolated, supported client will securely unlock records and preview private files?", evidence: "Windows and mobile devices, browser-extension policy, idle lock, clipboard, private origin and accessibility acceptance" },
  { id: "kdf", question: "Which reviewed Argon2id implementation and device-calibrated parameters will we adopt?", evidence: "Library maintenance/audits, executable provenance, disposable-device benchmark, memory budget and migration version" },
  { id: "envelope", question: "What reviewed versioned key and authenticated-record format protects every user and change?", evidence: "Random key hierarchy, salts/nonces, AAD, corruption/rollback tests, per-member share/revoke and version migration" },
  { id: "files", question: "How will encrypted documents be limited, previewed, chunk-authenticated and recovered?", evidence: "Safe client preview, quota, MIME policy, malware risk, per-chunk integrity and complete manifest restore" },
  { id: "recovery", question: "How can our two household owners recover without a hidden administrator bypass?", evidence: "Primary/backup key custody, failure/recovery diagrams, independent offline encrypted backup and witnessed restore" },
  { id: "deployment", question: "What Windows runtime identity and dedicated LAN/Tailscale HTTPS origin are safe?", evidence: "Dedicated process ACL, separate storage, firewall proof, patching, Caddy/cert ownership and reboot test" },
  { id: "review", question: "Who independently examines the cryptography and authorizes a disposable-data test?", evidence: "Security review scope, reproducible negative tests, issue remediation, owner sign-off and staged rollback" },
] as const;

export type VaultDesignDecisionId = (typeof vaultDesignDecisions)[number]["id"];
export type VaultDesignReview = Readonly<Partial<Record<VaultDesignDecisionId, "reviewed" | "pending" | "failed">>>;

/** Review counts are untrusted, and NEVER grant a crypto library, deployment or live secret access. */
export function assessVaultThreatCryptoReview(review: VaultDesignReview = {}) {
  return {
    schema: VAULT_THREAT_CRYPTO_REVIEW_SCHEMA,
    phase: "THREAT_AND_LIBRARY_REVIEW_ONLY" as const,
    implementation_strategy: "FIRST_PARTY_LOCAL" as const,
    selected_crypto_implementation: null,
    dependency_approved: false as const,
    independent_security_audit_passed: false as const,
    install_authorized: false as const,
    encryption_runtime_active: false as const,
    credential_intake: "DISABLED" as const,
    document_upload: "DISABLED" as const,
    mfa_enforced: false as const,
    vault_access: "DENY" as const,
    production_security_acceptance: "HOLD" as const,
    review_progress: {
      reviewed: vaultDesignDecisions.filter(item => review[item.id] === "reviewed").length,
      failed: vaultDesignDecisions.filter(item => review[item.id] === "failed").length,
      required: vaultDesignDecisions.length,
    },
  };
}
