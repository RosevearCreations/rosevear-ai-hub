import { describe, expect, it } from "vitest";
import { assessVaultSyntheticHarness, vaultSyntheticCases } from "./vaultSyntheticHarnessPolicy";

describe("Build 126 synthetic-only vault policy", () => {
  it("authorizes only the owner-selected Web Crypto test primitive", () => {
    const status = assessVaultSyntheticHarness();
    expect(status.phase).toBe("DISPOSABLE_TESTS_ONLY");
    expect(status.owner_approved_test_primitive).toBe("WEB_CRYPTO_AES_256_GCM");
    expect(status.third_party_crypto_dependency_added).toBe(false);
    expect(status.fixture_source).toBe("EPHEMERAL_SYNTHETIC");
    expect(status.test_harness_shipped_to_client).toBe(false);
  });

  it("never grants production access even with forged external evidence", () => {
    const status = assessVaultSyntheticHarness({ audit: true, userAccepted: true, mfa: true });
    expect(status.production_vault_crypto_approved).toBe(false);
    expect(status.independent_security_audit_passed).toBe(false);
    expect(status.service_installed).toBe(false);
    expect(status.credential_intake).toBe("DISABLED");
    expect(status.document_upload).toBe("DISABLED");
    expect(status.mfa_enforced).toBe(false);
    expect(status.vault_access).toBe("DENY");
    expect(status.production_security_acceptance).toBe("HOLD");
  });

  it("lists tamper, context, key and replay limitations", () => {
    expect(vaultSyntheticCases.map(x => x.id)).toEqual(["round_trip", "ciphertext", "binding", "key_nonce", "replay"]);
    expect(vaultSyntheticCases.at(-1)?.expected).toContain("still decrypts");
  });
});
