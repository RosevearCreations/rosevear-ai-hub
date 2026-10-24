import { describe, expect, it } from "vitest";
import { assessLocalVaultBlueprint, localVaultRecordKinds, localVaultSecurityGates, localVaultThreats } from "./localVaultBlueprint";

describe("Build 124 first-party local password/document vault blueprint", () => {
  it("records the owner's no-vendor direction without enabling an untested implementation", () => {
    const state = assessLocalVaultBlueprint();
    expect(state.implementation_strategy).toBe("FIRST_PARTY_LOCAL");
    expect(state.vendor_hosting_required).toBe(false);
    expect(state.owner_direction_selected).toBe(true);
    expect(state.security_design_approved).toBe(false);
    expect(state.independent_review_passed).toBe(false);
    expect(state.vault_service_installed).toBe(false);
    expect(state.credential_intake).toBe("DISABLED");
    expect(state.document_upload).toBe("DISABLED");
    expect(state.encrypted_data_store_available).toBe(false);
    expect(state.vault_api_available).toBe(false);
    expect(state.key_material_accessible_to_hub).toBe(false);
    expect(state.mfa_enforced).toBe(false);
    expect(state.vault_access).toBe("DENY");
    expect(state.production_security_acceptance).toBe("HOLD");
  });

  it("never treats forged review completion as authority for live secrets or uploads", () => {
    const forged = Object.fromEntries(localVaultSecurityGates.map(g => [g.id, "reviewed"])) as never;
    const state = assessLocalVaultBlueprint(forged);
    expect(state.review_progress.reviewed).toBe(state.review_progress.required);
    expect(state.security_design_approved).toBe(false);
    expect(state.credential_intake).toBe("DISABLED");
    expect(state.document_upload).toBe("DISABLED");
    expect(state.vault_api_available).toBe(false);
    expect(state.production_security_acceptance).toBe("HOLD");
  });

  it("reports failed gates without bypassing isolation", () => {
    const state = assessLocalVaultBlueprint({ review: "failed", cryptography: "reviewed" });
    expect(state.review_progress.failed).toBe(1);
    expect(state.review_progress.reviewed).toBe(1);
    expect(state.key_material_accessible_to_hub).toBe(false);
    expect(state.vault_access).toBe("DENY");
  });

  it("models passwords, secure notes and encrypted documents with distinct review gates", () => {
    expect(localVaultRecordKinds.map(kind => kind.id)).toEqual(["password", "secure_note", "document"]);
    expect(localVaultSecurityGates.map(g => g.id)).toEqual(["review", "cryptography", "identity", "documents", "isolation", "network", "recovery", "windows"]);
    expect(new Set(localVaultSecurityGates.map(g => g.id)).size).toBe(localVaultSecurityGates.length);
    expect(localVaultThreats.length).toBeGreaterThanOrEqual(4);
  });
});
