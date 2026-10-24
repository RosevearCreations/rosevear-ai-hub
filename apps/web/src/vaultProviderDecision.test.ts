import { describe, expect, it } from "vitest";
import { assessVaultProviderDecision, vaultProviderCriteria, vaultProviderOptions } from "./vaultProviderDecision";

describe("Build 123 safe provider decision packet", () => {
  it("has no selected provider or deployment authority by default", () => {
    const state = assessVaultProviderDecision();
    expect(state.phase).toBe("OWNER_SELECTION_REQUIRED");
    expect(state.selected_provider).toBeNull();
    expect(state.provider_approved).toBe(false);
    expect(state.install_authorized).toBe(false);
    expect(state.private_origin_verified).toBe(false);
    expect(state.secret_storage_enabled).toBe(false);
    expect(state.mfa_enforced).toBe(false);
    expect(state.vault_access).toBe("DENY");
    expect(state.production_security_acceptance).toBe("HOLD");
  });

  it("does not transform forged review completion into automatic approval", () => {
    const fake = Object.fromEntries(vaultProviderCriteria.map(item => [item.id, "reviewed"])) as never;
    const state = assessVaultProviderDecision(fake);
    expect(state.review_progress.reviewed).toBe(state.review_progress.required);
    expect(state.selected_provider).toBeNull();
    expect(state.install_authorized).toBe(false);
    expect(state.secret_storage_enabled).toBe(false);
    expect(state.production_security_acceptance).toBe("HOLD");
  });

  it("keeps failed reviews visible but cannot allow a bypass", () => {
    const state = assessVaultProviderDecision({ mfa: "failed", license: "reviewed" });
    expect(state.review_progress.failed).toBe(1);
    expect(state.review_progress.reviewed).toBe(1);
    expect(state.vault_access).toBe("DENY");
  });

  it("covers all decision dimensions without auto-recommending a vendor", () => {
    expect(vaultProviderCriteria.map(x => x.id)).toEqual(["license", "maintenance", "crypto", "identity", "mfa", "network", "backup", "adoption"]);
    expect(new Set(vaultProviderCriteria.map(x => x.id)).size).toBe(vaultProviderCriteria.length);
    expect(vaultProviderOptions).toHaveLength(3);
  });
});
