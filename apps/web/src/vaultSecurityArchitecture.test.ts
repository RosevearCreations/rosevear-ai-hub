import { describe, expect, it } from "vitest";
import { assessVaultSecurityArchitecture, vaultControls, vaultThreats } from "./vaultSecurityArchitecture";

describe("Build 119 fail-closed vault architecture", () => {
  it("never accepts actual credentials or asserts two-factor protection", () => {
    const gate = assessVaultSecurityArchitecture();
    expect(gate.schema).toBe("rosevear-vault-security-architecture/v1");
    expect(gate.credential_intake).toBe("DISABLED");
    expect(gate.vault_endpoint_available).toBe(false);
    expect(gate.hub_decrypts_vault_data).toBe(false);
    expect(gate.hub_password_autofill).toBe(false);
    expect(gate.mfa_enforced).toBe(false);
    expect(gate.production_security_acceptance).toBe("HOLD");
    expect(gate.review_progress.reviewed).toBe(0);
  });

  it("refuses to convert even fully spoofed gate evidence into an active keeper", () => {
    const spoofed = Object.fromEntries(vaultControls.map(control => [control.id, "reviewed"])) as never;
    const gate = assessVaultSecurityArchitecture(spoofed);
    expect(gate.review_progress.reviewed).toBe(vaultControls.length);
    expect(gate.credential_intake).toBe("DISABLED");
    expect(gate.production_security_acceptance).toBe("HOLD");
    expect(gate.mfa_enforced).toBe(false);
  });

  it("covers distinct accounts, private hosting, encryption, MFA, recovery and leakage", () => {
    expect(vaultControls.map(control => control.id)).toEqual(expect.arrayContaining([
      "individual_identity", "isolation", "client_side_crypto", "private_https", "mfa", "backup_restore", "leakage_tests", "windows_acceptance",
    ]));
    expect(new Set(vaultControls.map(control => control.id)).size).toBe(vaultControls.length);
    expect(vaultThreats.length).toBeGreaterThanOrEqual(5);
  });
});
