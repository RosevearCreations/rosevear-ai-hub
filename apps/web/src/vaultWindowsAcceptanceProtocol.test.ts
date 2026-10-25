import { describe, expect, it } from "vitest";
import {
  assessVaultWindowsAcceptance, inspectSyntheticWindowsEvidence, SYNTHETIC_WINDOWS_EVIDENCE_SCHEMA,
  vaultWindowsAcceptanceDenials, vaultWindowsAcceptanceGates, type SyntheticWindowsEvidence,
} from "./vaultWindowsAcceptanceProtocol";

function inventedFixture(): SyntheticWindowsEvidence {
  return {
    schema: SYNTHETIC_WINDOWS_EVIDENCE_SCHEMA,
    environment: "DISPOSABLE_SIMULATION",
    source_revision: "SYNTHETIC_BUILD",
    controls: vaultWindowsAcceptanceGates.map(({ id }) => ({ id, outcome: "PASS", origin: "SIMULATED" })),
  };
}

describe("Build 130 independent Windows and owner acceptance boundary", () => {
  it("always denies all real operations, even fabricated independent reviewer and owner approvals", () => {
    for (const claims of [undefined, {}, { reviewerPassed: true, signedByOwner: true, windowsInstalled: true, allTestsPassed: true }]) {
      const result = assessVaultWindowsAcceptance(claims);
      expect(result.phase).toBe("PROTOCOL_REVIEW_ONLY");
      expect(result.independent_reviewer_accepted).toBe(false);
      expect(result.pinned_windows_installation_verified).toBe(false);
      expect(result.owner_windows_field_witnessed).toBe(false);
      expect(result.production_vault_installed).toBe(false);
      expect(result.credential_intake).toBe("DISABLED");
      expect(result.document_intake).toBe("DISABLED");
      expect(result.mfa_enforced).toBe(false);
      expect(result.backup_restore_enabled).toBe(false);
      expect(result.vault_operation).toBe("DENY");
      expect(result.windows_owner_acceptance).toBe("HOLD");
      expect(result.production_security_acceptance).toBe("HOLD");
    }
  });

  it("recognizes only a complete, explicitly invented checklist—not an owner signoff", () => {
    expect(inspectSyntheticWindowsEvidence(inventedFixture())).toEqual({ classification: "COMPLETE_SYNTHETIC_CHECKLIST_ONLY", production_security_acceptance: "HOLD" });
    for (const outcome of ["FAIL", "NOT_OBSERVED"] as const) {
      const fixture = inventedFixture();
      fixture.controls[0].outcome = outcome;
      expect(inspectSyntheticWindowsEvidence(fixture).classification).toBe("INCOMPLETE_SYNTHETIC_CHECKLIST");
      expect(inspectSyntheticWindowsEvidence(fixture).production_security_acceptance).toBe("HOLD");
    }
  });

  it("rejects duplicate, missing, unknown and reordered-identity evidence without promotion", () => {
    const duplicates = inventedFixture(); duplicates.controls[1].id = duplicates.controls[0].id;
    const missing = inventedFixture(); missing.controls.pop();
    const unknown = inventedFixture(); (unknown.controls[0] as { id: string }).id = "admin_override";
    for (const invalid of [duplicates, missing, unknown]) expect(inspectSyntheticWindowsEvidence(invalid).classification).toBe("INVALID_SYNTHETIC_FIXTURE");
    const reordered = inventedFixture(); reordered.controls.reverse();
    expect(inspectSyntheticWindowsEvidence(reordered).classification).toBe("COMPLETE_SYNTHETIC_CHECKLIST_ONLY");
  });

  it("rejects forged reviewer fields, live environment, wrong provenance and sensitive additions", () => {
    const good = inventedFixture();
    for (const invalid of [
      { ...good, ownerSigned: true },
      { ...good, environment: "PRODUCTION_WINDOWS" },
      { ...good, source_revision: "real-commit" },
      { ...good, controls: good.controls.map((x, i) => i === 0 ? { ...x, reviewerSigned: true } : x) },
      { ...good, controls: good.controls.map((x, i) => i === 0 ? { ...x, origin: "OWNER_WITNESSED" } : x) },
      { ...good, controls: good.controls.map((x, i) => i === 0 ? { ...x, plaintextPassword: "test-secret" } : x) },
      { ...good, controls: good.controls.map((x, i) => i === 0 ? { ...x, outcome: "WAIVED" } : x) },
      { ...good, schema: "future-unreviewed-schema" },
      null,
    ]) expect(inspectSyntheticWindowsEvidence(invalid).classification).toBe("INVALID_SYNTHETIC_FIXTURE");
  });

  it("documents all independent reviewer, Windows, document recovery and owner gates", () => {
    expect(vaultWindowsAcceptanceGates.map(x => x.id)).toEqual([
      "independent_review", "release_provenance", "windows_isolation", "network_origin", "identity_mfa", "client_leaks", "documents_recovery", "owner_field",
    ]);
    expect(vaultWindowsAcceptanceDenials.map(x => x.id)).toEqual(["source_only", "fake_signoff", "drift", "revoked", "co_rollback", "unobserved"]);
    expect(vaultWindowsAcceptanceGates.every(x => x.requirement.length > 100)).toBe(true);
  });
});
