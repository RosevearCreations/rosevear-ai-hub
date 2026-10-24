import { describe, expect, it } from "vitest";
import { assessVaultThreatCryptoReview, vaultCryptoCandidates, vaultDesignDecisions, vaultThreatScenarios, vaultTrustBoundaries } from "./vaultThreatCryptoReview";

describe("Build 125 first-party vault threat and crypto review", () => {
  it("cannot pick a crypto dependency or permit live vault usage by default", () => {
    const state = assessVaultThreatCryptoReview();
    expect(state.phase).toBe("THREAT_AND_LIBRARY_REVIEW_ONLY");
    expect(state.implementation_strategy).toBe("FIRST_PARTY_LOCAL");
    expect(state.selected_crypto_implementation).toBeNull();
    expect(state.dependency_approved).toBe(false);
    expect(state.independent_security_audit_passed).toBe(false);
    expect(state.install_authorized).toBe(false);
    expect(state.encryption_runtime_active).toBe(false);
    expect(state.credential_intake).toBe("DISABLED");
    expect(state.document_upload).toBe("DISABLED");
    expect(state.mfa_enforced).toBe(false);
    expect(state.vault_access).toBe("DENY");
    expect(state.production_security_acceptance).toBe("HOLD");
  });

  it("forged completed design reviews can never activate encryption or document uploads", () => {
    const fake = Object.fromEntries(vaultDesignDecisions.map(x => [x.id, "reviewed"])) as never;
    const state = assessVaultThreatCryptoReview(fake);
    expect(state.review_progress.reviewed).toBe(state.review_progress.required);
    expect(state.selected_crypto_implementation).toBeNull();
    expect(state.dependency_approved).toBe(false);
    expect(state.encryption_runtime_active).toBe(false);
    expect(state.credential_intake).toBe("DISABLED");
    expect(state.document_upload).toBe("DISABLED");
    expect(state.production_security_acceptance).toBe("HOLD");
  });

  it("records failed review areas without bypass", () => {
    const state = assessVaultThreatCryptoReview({ kdf: "failed", files: "failed", review: "reviewed" });
    expect(state.review_progress.failed).toBe(2);
    expect(state.review_progress.reviewed).toBe(1);
    expect(state.independent_security_audit_passed).toBe(false);
    expect(state.vault_access).toBe("DENY");
  });

  it("covers STRIDE, disaster and supply-chain threats and the four trust boundaries", () => {
    expect(vaultThreatScenarios.map(x => x.id)).toEqual(["spoofing", "tampering", "repudiation", "disclosure", "denial", "privilege", "recovery_loss", "supply_chain"]);
    expect(vaultTrustBoundaries.map(x => x.id)).toEqual(["client", "service", "storage", "recovery"]);
    expect(new Set(vaultThreatScenarios.map(x => x.id)).size).toBe(vaultThreatScenarios.length);
    for (const threat of vaultThreatScenarios) expect(threat.negativeTest.length).toBeGreaterThan(30);
  });

  it("describes crypto candidates but explicitly approves none", () => {
    expect(vaultCryptoCandidates.map(x => x.id)).toEqual(["aead", "kdf", "files", "mfa"]);
    expect(vaultCryptoCandidates.every(x => x.decision === "CANDIDATE_ONLY")).toBe(true);
    expect(new Set(vaultDesignDecisions.map(x => x.id)).size).toBe(vaultDesignDecisions.length);
    expect(vaultDesignDecisions).toHaveLength(7);
  });
});
