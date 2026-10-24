/** Build 126 is a synthetic, test-only use of the browser's standard Web Crypto API. */
export const VAULT_SYNTHETIC_HARNESS_SCHEMA = "rosevear-vault-synthetic-crypto/v1" as const;

export const vaultSyntheticCases = [
  { id: "round_trip", title: "Disposable round-trip", expected: "A fresh non-exportable AES-256-GCM key decrypts only its synthetic fixture." },
  { id: "ciphertext", title: "Tampered ciphertext or authentication tag", expected: "Modified ciphertext, shortened tag or truncated envelope cannot decrypt." },
  { id: "binding", title: "Wrong identity, record or version", expected: "Changing authenticated owner, item or version context is rejected." },
  { id: "key_nonce", title: "Wrong key and fresh nonces", expected: "A different ephemeral key fails; separate encryptions generate fresh random 96-bit IVs." },
  { id: "replay", title: "Exact replay is NOT prevented by AES-GCM", expected: "Identical ciphertext with the same key, IV and associated data still decrypts; future service must enforce anti-rollback state." },
] as const;

/** No API, persistent key, user-controlled data field or installed service is authorized. */
export function assessVaultSyntheticHarness(_untrustedEvidence?: Record<string, boolean>) {
  return {
    schema: VAULT_SYNTHETIC_HARNESS_SCHEMA,
    phase: "DISPOSABLE_TESTS_ONLY" as const,
    owner_approved_test_primitive: "WEB_CRYPTO_AES_256_GCM" as const,
    third_party_crypto_dependency_added: false as const,
    fixture_source: "EPHEMERAL_SYNTHETIC" as const,
    test_harness_shipped_to_client: false as const,
    production_vault_crypto_approved: false as const,
    independent_security_audit_passed: false as const,
    service_installed: false as const,
    credential_intake: "DISABLED" as const,
    document_upload: "DISABLED" as const,
    mfa_enforced: false as const,
    vault_access: "DENY" as const,
    production_security_acceptance: "HOLD" as const,
  };
}
