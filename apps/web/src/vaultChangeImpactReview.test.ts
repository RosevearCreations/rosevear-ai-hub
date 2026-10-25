import { describe, expect, it } from "vitest";
import { assessVaultChangeImpactReview, mapSyntheticVaultChangeImpact, SYNTHETIC_CHANGE_IMPACT_SCHEMA,
  vaultChangeImpactDenials, vaultChangeImpactKinds, type SyntheticVaultChangePacket } from "./vaultChangeImpactReview";

const fixture = (): SyntheticVaultChangePacket => ({
  schema: SYNTHETIC_CHANGE_IMPACT_SCHEMA,
  environment: "IN_MEMORY_SIMULATION",
  base_artifact: "DEMO_BEFORE",
  candidate_artifact: "DEMO_AFTER",
  changes: [{ id: "crypto_library", provenance: "SYNTHETIC" }],
});

describe("Build 133 independent reassessment impact routing and security holds", () => {
  it("never accepts claimed reviewer re-clearance or Windows owner pilot approval", () => {
    for (const claims of [undefined, {}, { independentRetestPassed: true, ownerApproved: true, windowsInstalled: true, mfaEnabled: true }]) {
      const s = assessVaultChangeImpactReview(claims);
      expect(s.actual_change_assessed).toBe(false);
      expect(s.independent_reviewer_engaged).toBe(false);
      expect(s.real_retests_completed).toBe(false);
      expect(s.reviewed_windows_artifact_verified).toBe(false);
      expect(s.owner_disposable_pilot_approved).toBe(false);
      expect(s.windows_vault_installed).toBe(false);
      expect(s.credential_intake).toBe("DISABLED");
      expect(s.document_intake).toBe("DISABLED");
      expect(s.mfa_enforced).toBe(false);
      expect(s.backup_restore_enabled).toBe(false);
      expect(s.vault_operation).toBe("DENY");
      expect(s.windows_owner_acceptance).toBe("HOLD");
      expect(s.production_security_acceptance).toBe("HOLD");
    }
  });

  it("maps a synthetic crypto change to exact assessor scopes without authorizing retest", () => {
    expect(mapSyntheticVaultChangeImpact(fixture())).toEqual({
      classification: "SYNTHETIC_REASSESSMENT_REQUIRED_NOT_A_REVIEW",
      impacted_scope_ids: ["source_artifact", "dependencies", "key_identity", "negative_tests"],
      change_count: 1, independent_retest: "REQUIRED", production_security_acceptance: "HOLD",
    });
  });

  it("unions overlapping changes in canonical handoff order and retains mandatory review", () => {
    const x = fixture();
    x.changes = [{ id: "document_recovery", provenance: "SYNTHETIC" }, { id: "private_access", provenance: "SYNTHETIC" }, { id: "crypto_library", provenance: "SYNTHETIC" }];
    const mapped = mapSyntheticVaultChangeImpact(x);
    expect(mapped.change_count).toBe(3);
    expect(mapped.impacted_scope_ids).toEqual(["source_artifact", "dependencies", "key_identity", "windows_network", "document_recovery", "negative_tests", "owner_boundary"]);
    expect(mapped.independent_retest).toBe("REQUIRED");
    expect(mapped.production_security_acceptance).toBe("HOLD");
  });

  it("rejects empty, duplicate, unknown or unbounded change lists", () => {
    const good = fixture();
    for (const bad of [
      { ...good, changes: [] },
      { ...good, changes: [...good.changes, good.changes[0]] },
      { ...good, changes: [{ id: "approve", provenance: "SYNTHETIC" }] },
      { ...good, changes: [...vaultChangeImpactKinds.map(({ id }) => ({ id, provenance: "SYNTHETIC" })), good.changes[0]] },
    ]) expect(mapSyntheticVaultChangeImpact(bad).classification).toBe("INVALID_SYNTHETIC_CHANGE_PACKET");
  });

  it("rejects real artifact hashes, claims, sensitive evidence, waivers and forged provenance", () => {
    const good = fixture();
    for (const bad of [
      { ...good, ownerApproval: true },
      { ...good, base_artifact: "real-source-sha" },
      { ...good, candidate_artifact: "real-executable" },
      { ...good, environment: "WINDOWS_PRODUCTION" },
      { ...good, changes: [{ ...good.changes[0], signedReview: true }] },
      { ...good, changes: [{ ...good.changes[0], password: "not-a-password" }] },
      { ...good, changes: [{ ...good.changes[0], filePath: "private" }] },
      { ...good, changes: [{ ...good.changes[0], provenance: "INDEPENDENT_REVIEW" }] },
      { ...good, changes: [{ ...good.changes[0], waived: true }] },
      null,
    ]) expect(mapSyntheticVaultChangeImpact(bad).classification).toBe("INVALID_SYNTHETIC_CHANGE_PACKET");
  });

  it("names the six affected change classes and six mandatory denial cases", () => {
    expect(vaultChangeImpactKinds.map(x => x.id)).toEqual(["source_rebuild", "crypto_library", "household_identity", "windows_service", "private_access", "document_recovery"]);
    expect(vaultChangeImpactDenials.map(x => x.id)).toEqual(["no_delta", "stale_review", "scope_waiver", "secret_details", "co_rollback", "fake_retest"]);
    expect(vaultChangeImpactKinds.every(x => x.consequence.length > 95 && x.scopes.length > 1)).toBe(true);
  });
});
