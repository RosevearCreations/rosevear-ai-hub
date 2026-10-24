import { describe, expect, it } from "vitest";
import { assessVaultSecurityVerification, vaultVerificationChecks } from "./vaultSecurityVerification";

describe("Build 122 fail-closed vault field acceptance", () => {
  it("does not confuse reviewed architecture with installed security acceptance", () => {
    const status = assessVaultSecurityVerification();
    expect(status.phase).toBe("UNINSTALLED_REVIEW_ONLY");
    expect(status.provider_approved).toBe(false);
    expect(status.live_vault_available).toBe(false);
    expect(status.independent_windows_verified).toBe(false);
    expect(status.field_evidence_available).toBe(false);
    expect(status.credential_intake).toBe("DISABLED");
    expect(status.mfa_enforced).toBe(false);
    expect(status.vault_access).toBe("DENY");
    expect(status.production_security_acceptance).toBe("HOLD");
    expect(status.review_progress.reviewed).toBe(0);
  });

  it("resists false green claims, even when all untrusted marks claim success", () => {
    const forged = Object.fromEntries(vaultVerificationChecks.map(check => [check.id, "reviewed"])) as never;
    const status = assessVaultSecurityVerification(forged);
    expect(status.review_progress.reviewed).toBe(status.review_progress.required);
    expect(status.independent_windows_verified).toBe(false);
    expect(status.vault_access).toBe("DENY");
    expect(status.production_security_acceptance).toBe("HOLD");
  });

  it("records failures without granting a bypass", () => {
    const status = assessVaultSecurityVerification({ mfa: "failed", leak: "failed", windows: "reviewed" });
    expect(status.review_progress.failed).toBe(2);
    expect(status.review_progress.reviewed).toBe(1);
    expect(status.production_security_acceptance).toBe("HOLD");
  });

  it("includes independent storage, MFA, backup, leak and Windows checks", () => {
    expect(vaultVerificationChecks.map(check => check.id)).toEqual(["provider", "crypto", "https", "mfa", "lock", "backup", "leak", "windows"]);
    expect(new Set(vaultVerificationChecks.map(check => check.id)).size).toBe(vaultVerificationChecks.length);
  });
});
