import { describe, expect, it } from "vitest";
import { assessVaultServiceBoundary, vaultServiceBoundaries, vaultServiceDenialCases, type VaultPreviewAction, type VaultPreviewActor } from "./vaultServiceBoundary";

describe("Build 127 isolated vault service and identity contract", () => {
  it("does not register a private origin, identity or any service endpoints", () => {
    const status = assessVaultServiceBoundary();
    expect(status.phase).toBe("ISOLATION_POLICY_PREVIEW_ONLY");
    expect(status.separate_vault_origin_configured).toBe(false);
    expect(status.independent_vault_identity_installed).toBe(false);
    expect(status.windows_vault_process_installed).toBe(false);
    expect(status.hub_session_accepted).toBe(false);
    expect(status.vault_endpoints_mounted).toBe(false);
    expect(status.credential_intake).toBe("DISABLED");
    expect(status.document_upload).toBe("DISABLED");
    expect(status.mfa_enforced).toBe(false);
    expect(status.vault_operation).toBe("DENY");
    expect(status.denial_reason).toBe("SERVICE_NOT_INSTALLED");
    expect(status.production_security_acceptance).toBe("HOLD");
  });

  it("rejects every actor and operation, even forged approval and MFA evidence", () => {
    const actors: VaultPreviewActor[] = ["ANONYMOUS", "HUB_OWNER", "HUB_ADMIN", "HOUSEHOLD", "SUPPOSED_VAULT_MEMBER"];
    const actions: VaultPreviewAction[] = ["READ", "WRITE", "SHARE", "EXPORT", "UNLOCK", "ENROLL_MFA", "RECOVER"];
    for (const actor of actors) for (const action of actions) {
      const result = assessVaultServiceBoundary({ actor, action, independentVaultSession: true, trustedOrigin: true, validVaultMfa: true, ownerApproved: true, reviewCompleted: true });
      expect(result.vault_operation).toBe("DENY");
      expect(result.vault_endpoints_mounted).toBe(false);
      expect(result.production_security_acceptance).toBe("HOLD");
    }
  });

  it("describes separate service boundaries and explicit negative acceptance cases", () => {
    expect(vaultServiceBoundaries.map(x => x.id)).toEqual(["origin", "identity", "process", "ciphertext", "recovery"]);
    expect(vaultServiceDenialCases.map(x => x.id)).toEqual(["hub_cookie", "wrong_origin", "other_owner", "replayed_session", "mfa_bypass", "service_off"]);
    expect(vaultServiceDenialCases.every(x => x.expected.length > 50)).toBe(true);
  });
});
