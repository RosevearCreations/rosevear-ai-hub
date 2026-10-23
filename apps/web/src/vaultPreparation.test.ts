import { describe, expect, it } from "vitest";
import { assessVaultPreparation, vaultPreparationStages } from "./vaultPreparation";

describe("Build 120 fail-closed vault preparation", () => {
  it("keeps all secret and service capabilities disabled", () => {
    const status = assessVaultPreparation();
    expect(status.phase).toBe("PREPARATION_ONLY");
    expect(status.approved_provider).toBeNull();
    expect(status.service_installed).toBe(false);
    expect(status.vault_url).toBeNull();
    expect(status.credential_intake).toBe("DISABLED");
    expect(status.client_unlock).toBe("DISABLED");
    expect(status.server_secret_access).toBe(false);
    expect(status.secrets_persisted_by_hub).toBe(false);
    expect(status.mfa_enforced).toBe(false);
    expect(status.production_security_acceptance).toBe("HOLD");
  });

  it("does not activate when every review flag is forged", () => {
    const flags = Object.fromEntries(vaultPreparationStages.map(stage => [stage.id, true]));
    const status = assessVaultPreparation(flags);
    expect(status.reviewed).toBe(status.required);
    expect(status.credential_intake).toBe("DISABLED");
    expect(status.client_unlock).toBe("DISABLED");
    expect(status.production_security_acceptance).toBe("HOLD");
  });

  it("requires distinct provider, isolation, origin, lock, leakage and recovery reviews", () => {
    expect(vaultPreparationStages.map(stage => stage.id)).toEqual(["provider", "storage", "origin", "lock", "leak", "recovery"]);
  });
});
