import { describe, expect, it } from "vitest";
import { assessVaultReadinessDashboard, findVaultReviewSections, vaultReadinessMilestones, vaultReviewNavigation, vaultReviewRoutes } from "./vaultReadinessDashboard";

describe("Build 134 accessible vault security readiness and navigation boundaries", () => {
  it("reports all six milestones unverified; forged owner or auditor flags confer no authority", () => {
    for (const claims of [undefined, {}, { role: "owner", auditorSigned: true, pilotApproved: true, allPassed: true }]) {
      const x = assessVaultReadinessDashboard(claims);
      expect(x.required_milestones).toBe(6);
      expect(x.independently_verified_milestones).toBe(0);
      expect(x.phase).toBe("UNVERIFIED_SECURITY_MILESTONES");
      expect(x.independent_security_review).toBe("NOT PERFORMED");
      expect(x.windows_owner_acceptance).toBe("HOLD");
      expect(x.windows_vault_installed).toBe(false);
      expect(x.credential_intake).toBe("DISABLED");
      expect(x.document_intake).toBe("DISABLED");
      expect(x.mfa_enforced).toBe(false);
      expect(x.backup_restore_enabled).toBe(false);
      expect(x.vault_operation).toBe("DENY");
      expect(x.production_security_acceptance).toBe("HOLD");
    }
  });

  it("defines non-duplicated milestone IDs and meaningful explicit blocker descriptions", () => {
    expect(vaultReadinessMilestones.map(x => x.id)).toEqual([
      "implementation", "isolation", "cryptography", "assessment", "remediation", "field_acceptance",
    ]);
    expect(new Set(vaultReadinessMilestones.map(x => x.target)).size).toBe(6);
    expect(vaultReadinessMilestones.every(x => x.state.startsWith("NOT") && x.detail.length > 90)).toBe(true);
  });

  it("limits navigation to static, unique in-page security review sections", () => {
    expect(vaultReviewNavigation.length).toBe(11);
    expect(new Set(vaultReviewNavigation.map(x => x.id)).size).toBe(vaultReviewNavigation.length);
    expect(vaultReviewNavigation.every(x => /^vault-[a-z-]+$/.test(x.id) && x.label.length > 6)).toBe(true);
    expect([...new Set(vaultReviewNavigation.map(x => x.group))]).toEqual(["Independent review", "Data protection", "Architecture"]);
    for (const item of vaultReadinessMilestones) {
      expect(vaultReviewNavigation.some(link => link.id === item.target)).toBe(true);
    }
  });
});

describe("Build 135 read-only vault review finder", () => {
  it("searches fixed headings and descriptions without accepting any external navigation targets", () => {
    expect(findVaultReviewSections("  hardware factors ").map(x => x.id)).toEqual(["vault-mfa"]);
    expect(findVaultReviewSections("Windows").map(x => x.id)).toEqual(["vault-windows", "vault-service"]);
    expect(findVaultReviewSections("javascript:alert(1)")).toEqual([]);
    expect(findVaultReviewSections("" )).toEqual(vaultReviewNavigation);
  });

  it("filters by known category and retains the canonical fixed order", () => {
    expect(findVaultReviewSections("", "Data protection").map(x => x.id)).toEqual(["vault-recovery", "vault-documents"]);
    expect(findVaultReviewSections("recovery", "Architecture").map(x => x.id)).toEqual(["vault-mfa"]);
    expect(findVaultReviewSections("recovery", "Independent review")).toEqual([]);
    expect(findVaultReviewSections("A".repeat(10_000))).toEqual([]);
  });
});

describe("Build 136 guided routes and temporary section pins", () => {
  it("covers every fixed review section exactly once across three ordered, internal-only paths", () => {
    expect(vaultReviewRoutes.map(route => route.id)).toEqual(["all", "design", "audit", "field"]);
    const ids = vaultReviewRoutes.slice(1).flatMap(route => [...route.sections]);
    expect(ids).toHaveLength(11);
    expect(new Set(ids)).toEqual(new Set(vaultReviewNavigation.map(item => item.id)));
    expect(ids.every(id => /^vault-[a-z-]+$/.test(id))).toBe(true);
  });

  it("applies each advisory reading route in its defined order, without changing security readiness", () => {
    expect(findVaultReviewSections("", "All sections", "design").map(item => item.id)).toEqual(vaultReviewRoutes[1].sections);
    expect(findVaultReviewSections("", "All sections", "audit").map(item => item.id)).toEqual(vaultReviewRoutes[2].sections);
    expect(findVaultReviewSections("", "All sections", "field").map(item => item.id)).toEqual(vaultReviewRoutes[3].sections);
    expect(assessVaultReadinessDashboard({ routeCompleted: true, allPinned: true }).production_security_acceptance).toBe("HOLD");
  });

  it("filters using transient fixed section IDs and does not create review-completion authority", () => {
    expect(findVaultReviewSections("", "All sections", "all", true, [])).toEqual([]);
    expect(findVaultReviewSections("", "All sections", "all", true, ["vault-mfa", "https://evil.test", "vault-windows"]).map(x => x.id)).toEqual(["vault-windows", "vault-mfa"]);
    expect(findVaultReviewSections("", "All sections", "audit", true, ["vault-mfa"])).toEqual([]);
    expect(findVaultReviewSections("", "Architecture", "design", true, ["vault-mfa"]).map(x => x.id)).toEqual(["vault-mfa"]);
  });
});
