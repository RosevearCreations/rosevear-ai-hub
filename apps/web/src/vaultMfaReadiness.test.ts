import { describe, expect, it } from "vitest";
import { assessVaultMfaReadiness, vaultMfaDenialCases, vaultMfaReviewGates } from "./vaultMfaReadiness";

describe("Build 121 provider-gated MFA and emergency recovery policy", () => {
  it("does not enroll, authenticate, recover or accept secrets before provider approval", () => {
    const result = assessVaultMfaReadiness();
    expect(result.phase).toBe("POLICY_REVIEW_ONLY");
    expect(result.provider_approved).toBe(false);
    expect(result.authenticator_enrollment).toBe("DISABLED");
    expect(result.mfa_enforced).toBe(false);
    expect(result.step_up_available).toBe(false);
    expect(result.recovery_codes_issued).toBe(false);
    expect(result.emergency_recovery_available).toBe(false);
    expect(result.credential_intake).toBe("DISABLED");
    expect(result.private_origin_verified).toBe(false);
    expect(result.vault_access).toBe("DENY");
    expect(result.production_security_acceptance).toBe("HOLD");
  });

  it("rejects promotion even if every self-reported readiness item is forged", () => {
    const untrusted = Object.fromEntries(vaultMfaReviewGates.map(gate => [gate.id, "reviewed"])) as never;
    const result = assessVaultMfaReadiness(untrusted);
    expect(result.progress.reviewed).toBe(result.progress.required);
    expect(result.authenticator_enrollment).toBe("DISABLED");
    expect(result.vault_access).toBe("DENY");
    expect(result.mfa_enforced).toBe(false);
    expect(result.production_security_acceptance).toBe("HOLD");
  });

  it("covers distinct identities, backup factors, origin pinning, step-up, recovery and denial cases", () => {
    expect(vaultMfaReviewGates.map(gate => gate.id)).toEqual(["provider", "origin", "individual", "primary", "backup", "step_up", "recovery", "negative"]);
    expect(new Set(vaultMfaReviewGates.map(gate => gate.id)).size).toBe(vaultMfaReviewGates.length);
    expect(vaultMfaDenialCases).toHaveLength(4);
  });
});
